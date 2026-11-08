import React, { useEffect, useRef, useState } from 'react';
import { Mascot } from '../components/mascots/Mascot.tsx';
import { MascotAvatar } from '../components/mascots/MascotAvatar.tsx';
import { TriviaWinnerModal } from '../components/mascots/TriviaWinnerModal.tsx';
import { MODELS, type CanonicalModelId } from '../data/models.ts';
import { getGatewayStatus, startActivity, stopActivity, ApiError, type GatewayStatus } from '../lib/api.ts';
import { answerQuestion, generateQuestion, LIVE_MODELS, LETTERS, saveMatch, TOPICS, upsertAttempt, type LiveAttempt, type LiveMatch, type LiveQuestion } from '../lib/triviaLive.ts';
import { awardTriviaCorrect } from '../lib/leagueAdapters.ts';
import { setTriviaRunning } from '../lib/triviaLock.ts';
import { cancelActiveInference } from '../lib/inferenceLock.ts';

type Phase = 'idle' | 'generating' | 'answering' | 'revealing' | 'paused' | 'completed' | 'cancelled' | 'failed';
const HOSTS: CanonicalModelId[] = ['text', 'vision', 'omni'];

export const LiveTrivia: React.FC = () => {
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [length, setLength] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [host, setHost] = useState<CanonicalModelId>('text');
  const [contestants, setContestants] = useState<CanonicalModelId[]>(['vision', 'audio', 'omni']);
  const [question, setQuestion] = useState<LiveQuestion | null>(null);
  const [attempts, setAttempts] = useState<LiveAttempt[]>([]);
  const [currentContestant, setCurrentContestant] = useState(-1);
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [error, setError] = useState('');
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const [stopping, setStopping] = useState(false);
  const [pausePending, setPausePending] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const runningRef = useRef(false);
  const cancelRef = useRef(false);
  const pauseRef = useRef(false);
  const resumeWaiterRef = useRef<(() => void) | null>(null);
  const epoch = useRef(0);
  const active = phase === 'generating' || phase === 'answering' || phase === 'revealing' || phase === 'paused';
  useEffect(() => { getGatewayStatus(true).then(setGateway); return () => { epoch.current += 1; cancelRef.current = true; resumeWaiterRef.current?.(); resumeWaiterRef.current = null; setTriviaRunning(false); }; }, []);

  const handleRateLimitPause = async (err: unknown, resumePhase: Phase) => {
    let retryAfter = 30;
    if (err instanceof ApiError && typeof err.retryAfter === 'number' && err.retryAfter > 0) {
      retryAfter = Math.min(600, Math.max(2, err.retryAfter));
    } else if (err instanceof Error) {
      const match = err.message.match(/(\d+)\s*(?:s|sec|second)/i);
      if (match) retryAfter = Math.min(600, Math.max(2, parseInt(match[1], 10)));
    }
    setPhase('paused');
    setRateLimitCountdown(retryAfter);
    setError(`Compute allowance exhausted; pausing match for ${retryAfter}s until replenishment…`);

    while (retryAfter > 0 && !cancelRef.current) {
      await new Promise(r => setTimeout(r, 1000));
      retryAfter -= 1;
      setRateLimitCountdown(retryAfter);
      if (retryAfter > 0) {
        setError(`Compute allowance replenishing (${retryAfter}s remaining)…`);
      }
    }
    setRateLimitCountdown(null);
    setError('');
    if (!cancelRef.current) {
      setPhase(resumePhase);
    }
  };

  const waitIfPaused = async (resumePhase: Phase) => {
    if (!pauseRef.current || cancelRef.current) return;
    setPausePending(false); setPhase('paused');
    await new Promise<void>(resolve => { resumeWaiterRef.current = resolve; });
    resumeWaiterRef.current = null;
    if (!cancelRef.current) setPhase(resumePhase);
  };

  const start = async () => {
    if (runningRef.current) return;
    runningRef.current = true; cancelRef.current = false; pauseRef.current = false; setPausePending(false); setStopping(false); setError(''); setShowWinnerModal(false);
    const run = ++epoch.current;
    const matchLength = Math.floor(Math.random() * 6) + 5;
    setLength(matchLength);
    let record: LiveMatch = { id: crypto.randomUUID(), mode: 'live', status: 'running', length: matchLength, startedAt: new Date().toISOString(), rounds: [] };
    setMatch(record); setTriviaRunning(true);
    void startActivity('TRIVIA', record.id);
    try {
      const state = await getGatewayStatus(true);
      setGateway(state);
      if (!state.gateway_enabled || !(state.backend_live_enabled || state.auto_start_available)) throw new Error(state.reason || 'Local inference is unavailable.');
      if (state.inference_busy && state.queue && state.queue.waiting >= (state.queue.waiting_limit || 3)) throw new Error('Inference queue is currently full. Please try again shortly.');
      const eligible = LIVE_MODELS.filter(id => state.on_demand_routes?.includes(id));
      const hosts = HOSTS.filter(id => eligible.includes(id));
      if (!hosts.length || eligible.length < 4) throw new Error('Four distinct eligible local models are required.');
      const seed = crypto.getRandomValues(new Uint32Array(1))[0] % TOPICS.length;
      const pickContestants = (hostId: CanonicalModelId): CanonicalModelId[] => {
        const pool = eligible.filter(id => id !== hostId);
        // Give models without an answer this match the first available stage spots.
        // Ties remain random, so the three answerers still vary by round.
        for (let i = pool.length - 1; i > 0; i -= 1) {
          const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        pool.sort((a, b) => record.rounds.flatMap(r => r.attempts).filter(x => x.modelId === a).length - record.rounds.flatMap(r => r.attempts).filter(x => x.modelId === b).length);
        return pool.slice(0, 3);
      };
      for (let index = 0; index < matchLength; index += 1) {
        await waitIfPaused('generating');
        if (cancelRef.current || run !== epoch.current) break;
        let hostId = hosts[index % hosts.length];
        setRound(index); setHost(hostId); setQuestion(null); setAttempts([]); setCurrentContestant(-1); setPhase('generating');
        const previous = record.rounds.map(item => item.question);
        const topic = TOPICS[(seed + index * 3) % TOPICS.length];
        const difficulty = (['easy', 'medium', 'hard'] as const)[index % 3];
        let nextQuestion: LiveQuestion | null = null;
        let cast: CanonicalModelId[] = [];
        let generationError = 'No host generated a valid question.';
        for (const candidate of [hostId, ...hosts.filter(id => id !== hostId)]) {
          if (cancelRef.current || run !== epoch.current) break;
          setHost(candidate);
          const waitingCast = pickContestants(candidate);
          setContestants(waitingCast);
          while (true) {
            try {
              nextQuestion = await generateQuestion(candidate, topic, difficulty, previous, () => waitIfPaused('generating'), () => !cancelRef.current && run === epoch.current, record.id);
              hostId = candidate;
              cast = waitingCast;
              break;
            } catch (cause) {
              const is429 = (cause instanceof ApiError && cause.status === 429) || /rate limit|compute budget/i.test(String(cause));
              if (is429 && !cancelRef.current && run === epoch.current) {
                await handleRateLimitPause(cause, 'generating');
                continue;
              }
              generationError = cause instanceof Error ? cause.message : generationError;
              break;
            }
          }
          if (nextQuestion) break;
        }
        if (cancelRef.current || run !== epoch.current) break;
        if (!nextQuestion) throw new Error(generationError);
        if (new Set([hostId, ...cast]).size !== 4) throw new Error('The match needs four distinct model identities.');
        setContestants(cast);
        setQuestion(nextQuestion); setPhase('answering');
        record = { ...record, rounds: [...record.rounds, { index, question: nextQuestion, attempts: [] }] };
        saveMatch(record); setMatch(record);
        await waitIfPaused('answering');
        for (let slot = 0; slot < 3; slot += 1) {
          if (cancelRef.current || run !== epoch.current) break;
          setCurrentContestant(slot);
          let result: LiveAttempt;
          while (true) {
            try {
              result = await answerQuestion(cast[slot], nextQuestion, record.id);
              break;
            } catch (cause) {
              const is429 = (cause instanceof ApiError && cause.status === 429) || /rate limit|compute budget/i.test(String(cause));
              if (is429 && !cancelRef.current && run === epoch.current) {
                await handleRateLimitPause(cause, 'answering');
                continue;
              }
              result = {
                modelId: cast[slot],
                backendModelId: cast[slot],
                answer: null,
                status: 'error',
                points: 0,
                requestId: null,
                latencyS: null,
                timestamp: new Date().toISOString(),
                error: cause instanceof Error ? cause.message : 'Inference failed.',
              };
              break;
            }
          }
          if (run !== epoch.current) break;
          const rounds = [...record.rounds];
          rounds[rounds.length - 1] = upsertAttempt(rounds[rounds.length - 1], result);
          record = { ...record, rounds };
          setAttempts(rounds[rounds.length - 1].attempts); setMatch(record); saveMatch(record);
          if (result.status === 'correct' && result.requestId && result.answer) {
            const letterIdx = LETTERS.indexOf(result.answer);
            const correctIdx = LETTERS.indexOf(nextQuestion.correct_option);
            awardTriviaCorrect(cast[slot], record.id, index, letterIdx, correctIdx, 'live-trivia', result.activityReceipt);
          }
          await waitIfPaused('answering');
        }
        if (cancelRef.current || run !== epoch.current) break;
        setCurrentContestant(-1); setPhase('revealing');
        await new Promise<void>(resolve => window.setTimeout(resolve, 250));
        await waitIfPaused('revealing');
      }
      if (run === epoch.current) {
        record = { ...record, status: cancelRef.current ? 'cancelled' : 'completed', finishedAt: new Date().toISOString() };
        saveMatch(record); setMatch(record); setPhase(cancelRef.current ? 'cancelled' : 'completed');
        if (!cancelRef.current) setShowWinnerModal(true);
      }
    } catch (cause) {
      if (run === epoch.current) {
        const is429 = (cause instanceof ApiError && cause.status === 429) || /rate limit|compute budget/i.test(String(cause));
        if (is429 && !cancelRef.current) {
          await handleRateLimitPause(cause, 'generating');
          return;
        }
        const message = cause instanceof Error ? cause.message : 'Live match failed.';
        setError(message);
        record = { ...record, status: 'failed', finishedAt: new Date().toISOString() };
        saveMatch(record); setMatch(record); setPhase('failed');
      }
    } finally {
      if (run === epoch.current) { runningRef.current = false; pauseRef.current = false; setPausePending(false); setStopping(false); setTriviaRunning(false); void stopActivity(record.id); getGatewayStatus().then(setGateway); }
    }
  };
  const pause = () => { pauseRef.current = true; setPausePending(true); };
  const resume = () => { pauseRef.current = false; setPausePending(false); resumeWaiterRef.current?.(); };
  const stop = () => { cancelRef.current = true; pauseRef.current = false; setStopping(true); resumeWaiterRef.current?.(); cancelActiveInference(); };
  const matchRounds = match?.rounds || [];
  const allAttempts = matchRounds.flatMap(r => r.attempts);
  const contestantMatchStats = LIVE_MODELS.map(id => {
    const modelAttempts = allAttempts.filter(a => a.modelId === id);
    const correct = modelAttempts.filter(a => a.status === 'correct').length;
    const modelPoints = correct * 100;
    const attemptsCount = modelAttempts.length;
    const accuracy = attemptsCount > 0 ? Math.round((correct / attemptsCount) * 100) : 0;
    return { id, points: modelPoints, correct, attempts: attemptsCount, accuracy };
  });
  const points = (id: CanonicalModelId) => contestantMatchStats.find(item => item.id === id)?.points || 0;
  const maxScore = Math.max(...contestantMatchStats.map(m => m.points), 0);
  const isZeroScore = maxScore === 0;
  const winners = isZeroScore ? [] : contestantMatchStats.filter(m => m.points === maxScore);
  const winnerSummary = isZeroScore ? 'No Winner' : winners.map(w => MODELS[w.id].characterName).join(' & ');
  const reveal = phase === 'revealing' || phase === 'completed';
  const hostLine = phase === 'generating' ? 'Preparing your next question…' : phase === 'answering' ? 'The contestants are thinking.' : phase === 'paused' ? 'Match paused.' : reveal ? 'Here is my locked answer key.' : phase === 'failed' ? 'The match could not continue.' : 'Ready for a new live match.';
  return <div className="page-trivia s4-trivia s4-live">
    <header className="s4-trivia-header"><div><p className="eyebrow">PrismLab Playground</p><h1>Trivia Arena</h1><p>Local model competition · one inference at a time</p></div><div className="s4-trivia-status"><span>Round {length ? Math.min(round + 1, length) : '—'}/{length ?? '—'}</span><span className="s4-live-badge">LIVE MODEL CALLS</span></div></header>
    <div className="s4-live-roster" aria-label="Six model match roster">
      {LIVE_MODELS.map(id => {
        const model = MODELS[id];
        const isHost = id === host;
        const isContestant = contestants.includes(id);
        const statusText = isHost ? 'Questioner' : isContestant ? 'Contestant' : 'Waiting';
        const statusClass = isHost ? 'is-host' : isContestant ? 'is-answering' : 'is-waiting';
        return (
          <div key={id} className={`s4-roster-model ${statusClass}`}>
            <div className="s4-roster-avatar">
              <MascotAvatar model={model} />
            </div>
            <div className="s4-roster-details">
              <div className="s4-roster-row-head">
                <span className="s4-roster-nickname">{model.characterName}</span>
                <span className={`s4-roster-badge ${statusClass}`}>{statusText}</span>
              </div>
              <span className="s4-roster-id">{model.name}</span>
              <span className="s4-roster-points">{points(id)} pts</span>
            </div>
          </div>
        );
      })}
    </div>
    <div className="s4-trivia-layout">
      <section className="s4-contestants" aria-label="Three contestants"><h2>Contestants</h2>{contestants.map((id, slot) => {
        const attempt = attempts.find(item => item.modelId === id);
        const thinking = phase === 'answering' && currentContestant === slot && !attempt;
        const reaction = reveal && attempt ? attempt.status === 'correct' ? 'happy' : 'sad' : thinking ? 'thinking' : 'idle';
        return <article className={`s4-contestant ${thinking ? 'is-thinking' : ''}`} key={id}><div className="s4-contestant-figure"><Mascot model={MODELS[id]} motion={reveal && attempt ? attempt.status === 'correct' ? 'celebrating' : 'sad' : 'idle'} reactionState={reaction} reactionSignal={attempt || thinking ? round + 1 : 0} showAuthoredLine={false} interactive={false} /></div><div className="s4-contestant-copy"><strong>{MODELS[id].name}</strong><small>{points(id)} live points</small><div className="s4-answer-bubble" aria-live="polite">{!attempt ? thinking ? 'Thinking…' : 'Waiting…' : attempt.answer ? `Answer ${attempt.answer}` : attempt.status === 'invalid' ? 'Invalid answer' : 'Model error'}</div>{attempt?.latencyS != null && <small>{attempt.latencyS.toFixed(1)} s · {attempt.backendModelId}</small>}</div></article>;
      })}</section>
      <section className="s4-question-board" aria-labelledby="s4-question-title"><div className="s4-question-top"><span>Question {round + 1}</span><span>{question ? `${question.topic} · ${question.difficulty}` : 'Generating'}</span></div><h2 id="s4-question-title">{question?.question || 'The questioner is preparing a fresh question…'}</h2><div className="s4-answer-list" aria-label="Answer options">{LETTERS.map(letter => <div key={letter} className={`s4-answer-row ${reveal && question?.correct_option === letter ? 'is-key' : ''}`}><span>{letter}</span>{question?.options[letter] || 'Awaiting generated option'}</div>)}</div><div className="s4-question-footer" role="status">{reveal && question ? <><strong>Host-key agreement: {question.correct_option}</strong><p>{question.explanation}</p></> : phase === 'paused' ? (rateLimitCountdown !== null && rateLimitCountdown > 0 ? `Compute allowance replenishing (${rateLimitCountdown}s remaining)… Match will resume automatically.` : 'Paused. Resume to continue the autonomous match.') : phase === 'answering' ? 'Answers arrive sequentially. The host key is hidden until all three calls finish.' : phase === 'generating' ? 'Generating and validating a new MCQ.' : phase === 'completed' ? <div className="s4-completed-footer"><strong>{isZeroScore ? 'Match Complete · No Winner' : `Champion: ${winnerSummary} (${maxScore} pts)`}</strong><span> · Match complete. Championship standings updated.</span><button type="button" className="btn btn-secondary s4-winner-view-btn" onClick={() => setShowWinnerModal(true)}>View Results</button></div> : error || 'Start a live match. The arena chooses 5–10 questions automatically.'}</div></section>
      <aside className="s4-host" aria-label="Questioner"><h2>Questioner</h2><div className="s4-host-bubble">{hostLine}</div><div className="s4-host-figure"><Mascot model={MODELS[host]} motion={phase === 'completed' ? 'celebrating' : 'idle'} showAuthoredLine={false} interactive={false} /></div><strong>{MODELS[host].name}</strong><small>Host · {question?.backendModelId || 'local model'} · no points this round</small></aside>
    </div>
    <div className="s4-trivia-controls"><div><p>Scores measure agreement with the host model’s locked answer key. Questions are not independently fact-checked.</p>{error && <p role="alert">{error}</p>}{gateway && !gateway.gateway_enabled && <p>{gateway.reason}</p>}{match && <details><summary>Match trace</summary><small>Match {match.id} · {match.status} · {match.rounds.length} generated questions</small>{match.rounds.map(item => <p key={item.question.id}><small>Round {item.index + 1}: host {item.question.backendModelId} · request {item.question.requestId} · {item.attempts.map(a => `${a.backendModelId}: ${a.status} ${a.requestId || 'no request ID'}`).join(' · ')}</small></p>)}</details>}</div><div className="s4-live-actions">{!active ? <button type="button" className="btn btn-primary" onClick={start}>Start live match</button> : <><button type="button" className="btn btn-secondary" disabled={stopping || pausePending} onClick={phase === 'paused' ? () => { setRateLimitCountdown(0); resume(); } : pause}>{phase === 'paused' ? (rateLimitCountdown !== null && rateLimitCountdown > 0 ? `Resume (${rateLimitCountdown}s)` : 'Resume') : pausePending ? 'Pausing after current call…' : 'Pause'}</button><button type="button" className="btn btn-secondary" disabled={stopping} onClick={stop}>{stopping ? 'Stopping after current call…' : phase === 'paused' ? 'Stop match' : 'Stop after current call'}</button></>}</div></div>
    <TriviaWinnerModal
      isOpen={showWinnerModal}
      onClose={() => setShowWinnerModal(false)}
      onPlayAgain={start}
      results={contestantMatchStats}
      modeTitle="Live Match"
    />
  </div>;
};
