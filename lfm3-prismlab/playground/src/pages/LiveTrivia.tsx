import React, { useEffect, useRef, useState } from 'react';
import { Mascot } from '../components/mascots/Mascot.tsx';
import { MascotAvatar } from '../components/mascots/MascotAvatar.tsx';
import { TriviaWinnerModal } from '../components/mascots/TriviaWinnerModal.tsx';
import { MODELS, type CanonicalModelId } from '../data/models.ts';
import { getGatewayStatus, startActivity, stopActivity, parkActivity, resumeParkedActivity, ApiError, type GatewayStatus } from '../lib/api.ts';
import { answerQuestion, generateQuestion, LIVE_MODELS, LETTERS, saveMatch, TOPICS, TRIVIA_POINTS_PER_CORRECT, upsertAttempt, type LiveAttempt, type LiveMatch, type LiveQuestion } from '../lib/triviaLive.ts';
import { awardTriviaCorrect } from '../lib/leagueAdapters.ts';
import { setTriviaRunning } from '../lib/triviaLock.ts';
import { cancelActiveInference } from '../lib/inferenceLock.ts';

type Phase = 'idle' | 'generating' | 'answering' | 'revealing' | 'paused' | 'completed' | 'cancelled' | 'failed';
const HOSTS: CanonicalModelId[] = ['text', 'vision', 'omni'];

const ACTIVE_TRIVIA_STORAGE_KEY = 'prismlab_active_trivia_match_v1';

export const LiveTrivia: React.FC = () => {
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [match, setMatch] = useState<LiveMatch | null>(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_TRIVIA_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LiveMatch;
      if (parsed && (parsed.status === 'paused' || parsed.status === 'running') && parsed.rounds.length < parsed.length) {
        return parsed;
      }
    } catch {}
    return null;
  });
  const [length, setLength] = useState<number | null>(() => match?.length || null);
  const [phase, setPhase] = useState<Phase>(() => match ? 'paused' : 'idle');
  const [round, setRound] = useState(() => match ? match.rounds.length : 0);
  const [host, setHost] = useState<CanonicalModelId>(() => {
    const list: CanonicalModelId[] = ['text', 'vision', 'omni'];
    return list[Math.floor(Math.random() * list.length)];
  });
  const [contestants, setContestants] = useState<CanonicalModelId[]>(['vision', 'audio', 'omni']);
  const [question, setQuestion] = useState<LiveQuestion | null>(() => {
    if (!match || !match.rounds.length) return null;
    return match.rounds[match.rounds.length - 1]?.question || null;
  });
  const [attempts, setAttempts] = useState<LiveAttempt[]>(() => {
    if (!match || !match.rounds.length) return [];
    return match.rounds[match.rounds.length - 1]?.attempts || [];
  });
  const [currentContestant, setCurrentContestant] = useState(-1);
  const [error, setError] = useState('');
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const [stopping, setStopping] = useState(false);
  const [pausePending, setPausePending] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [triviaCooldownRemaining, setTriviaCooldownRemaining] = useState<number>(() => {
    try {
      const until = Number(localStorage.getItem('prismlab_trivia_cooldown_until') || '0');
      return Math.max(0, Math.ceil((until - Date.now()) / 1000));
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      try {
        const until = Number(localStorage.getItem('prismlab_trivia_cooldown_until') || '0');
        const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        setTriviaCooldownRemaining(remaining);
      } catch {}
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const runningRef = useRef(false);
  const cancelRef = useRef(false);
  const pauseRef = useRef(false);
  const rateLimitSkipRef = useRef(false);
  const resumeWaiterRef = useRef<(() => void) | null>(null);
  const epoch = useRef(0);
  const matchRef = useRef<LiveMatch | null>(match);
  const isUnmountingRef = useRef(false);
  const active = phase === 'generating' || phase === 'answering' || phase === 'revealing' || phase === 'paused';

  useEffect(() => {
    getGatewayStatus(true).then(setGateway);
    const handleGlobalResume = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || !detail.activity || detail.activity === 'TRIVIA') {
        if (runningRef.current) {
          pauseRef.current = false;
          setPausePending(false);
          rateLimitSkipRef.current = true;
          setRateLimitCountdown(null);
          setError('');
          resumeWaiterRef.current?.();
        } else if (matchRef.current) {
          void start(matchRef.current);
        }
      }
    };
    window.addEventListener('prismlab_resume_activity', handleGlobalResume);
    window.addEventListener('prismlab_resume_trivia', handleGlobalResume);
    return () => {
      window.removeEventListener('prismlab_resume_activity', handleGlobalResume);
      window.removeEventListener('prismlab_resume_trivia', handleGlobalResume);
      isUnmountingRef.current = true;
      epoch.current += 1;
      const current = matchRef.current;
      if (current && runningRef.current && current.rounds.length < current.length) {
        try {
          const pausedRecord: LiveMatch = { ...current, status: 'paused' };
          localStorage.setItem(ACTIVE_TRIVIA_STORAGE_KEY, JSON.stringify(pausedRecord));
          void parkActivity(current.id, {
            theme: 'Trivia Match',
            round: current.rounds.length,
            matchLength: current.length,
          });
          window.dispatchEvent(new CustomEvent('prismlab_activity_change'));
        } catch {}
      }
      cancelRef.current = true;
      resumeWaiterRef.current?.();
      resumeWaiterRef.current = null;
      setTriviaRunning(false);
    };
  }, []);

  const handleRateLimitPause = async (err: unknown, resumePhase: Phase) => {
    let retryAfter = 2;
    if (err instanceof ApiError && typeof err.retryAfter === 'number' && err.retryAfter > 0) {
      retryAfter = Math.min(4, Math.max(2, err.retryAfter));
    }
    setRateLimitCountdown(retryAfter);
    setError(`Models are currently busy with another visitor's turn; waiting in queue (${retryAfter}s)…`);
    rateLimitSkipRef.current = false;

    while (retryAfter > 0 && !cancelRef.current && !rateLimitSkipRef.current) {
      await new Promise(r => setTimeout(r, 1000));
      retryAfter -= 1;
      setRateLimitCountdown(retryAfter);
    }
    setRateLimitCountdown(null);
    setError('');
    rateLimitSkipRef.current = false;
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

  const start = async (existingMatch?: LiveMatch) => {
    if (triviaCooldownRemaining > 0 && !existingMatch) {
      setError(`Cooldown active: Please wait ${triviaCooldownRemaining}s before starting another match.`);
      return;
    }
    if (runningRef.current) return;
    runningRef.current = true; cancelRef.current = false; pauseRef.current = false; setPausePending(false); setStopping(false); setError(''); setShowWinnerModal(false);
    rateLimitSkipRef.current = false;
    const run = ++epoch.current;
    const matchLength = existingMatch ? existingMatch.length : Math.floor(Math.random() * 3) + 5;
    setLength(matchLength);
    let record: LiveMatch = existingMatch ? { ...existingMatch, status: 'running' } : { id: crypto.randomUUID(), mode: 'live', status: 'running', length: matchLength, startedAt: new Date().toISOString(), rounds: [] };
    matchRef.current = record;
    setMatch(record); setTriviaRunning(true);
    try { localStorage.setItem(ACTIVE_TRIVIA_STORAGE_KEY, JSON.stringify(record)); } catch {}
    try {
      await resumeParkedActivity(record.id);
    } catch {
      try {
        await startActivity('TRIVIA', record.id);
      } catch {}
    }
    try {
      const state = await getGatewayStatus(true);
      setGateway(state);
      if (!state.gateway_enabled || !(state.backend_live_enabled || state.auto_start_available)) throw new Error(state.reason || 'Local inference is unavailable.');
      const eligible = LIVE_MODELS.filter(id => !state.on_demand_routes || state.on_demand_routes.length === 0 || state.on_demand_routes.includes(id));
      const hosts = (HOSTS.filter(id => eligible.includes(id)).length > 0)
        ? HOSTS.filter(id => eligible.includes(id))
        : HOSTS;
      // Shuffle topics so every round in this match gets a completely unique, exciting domain!
      const shuffledTopics = [...TOPICS];
      for (let i = shuffledTopics.length - 1; i > 0; i -= 1) {
        const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
        [shuffledTopics[i], shuffledTopics[j]] = [shuffledTopics[j], shuffledTopics[i]];
      }
      // Randomize initial host so match doesn't always start with 'text'
      const startHostIndex = crypto.getRandomValues(new Uint32Array(1))[0] % Math.max(1, hosts.length);
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
      let startRound = record.rounds.length;
      if (record.rounds.length > 0) {
        const last = record.rounds[record.rounds.length - 1];
        if (!last.question || !last.attempts || last.attempts.length < 3) {
          record = { ...record, rounds: record.rounds.slice(0, -1) };
          startRound = record.rounds.length;
        }
      }
      for (let index = startRound; index < matchLength; index += 1) {
        await waitIfPaused('generating');
        // Properly cycle through the 3 hosts starting from the randomized initial host
        const preferredHost = hosts.length ? hosts[(startHostIndex + index) % hosts.length] : 'text';
        const hostOrder: CanonicalModelId[] = hosts.length
          ? [preferredHost, ...hosts.filter(h => h !== preferredHost)]
          : ['text'];
        let hostId: CanonicalModelId = hostOrder[0];
        setRound(index); setHost(hostId); setQuestion(null); setAttempts([]); setCurrentContestant(-1); setPhase('generating');
        const previous = record.rounds.map(item => item.question);
        const topic = shuffledTopics[index % shuffledTopics.length];
        const difficulty = (['easy', 'medium', 'hard'] as const)[index % 3];
        let nextQuestion: LiveQuestion | null = null;
        let cast: CanonicalModelId[] = [];
        let generationError = 'No host generated a valid question.';
        for (const candidate of hostOrder) {
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
        if (cancelRef.current && isUnmountingRef.current) {
          return;
        }
        record = { ...record, status: cancelRef.current ? 'cancelled' : 'completed', finishedAt: new Date().toISOString() };
        matchRef.current = record;
        if (!cancelRef.current) {
          try { localStorage.removeItem(ACTIVE_TRIVIA_STORAGE_KEY); } catch {}
          try {
            const cooldownUntil = Date.now() + 120 * 1000;
            localStorage.setItem('prismlab_trivia_cooldown_until', String(cooldownUntil));
            setTriviaCooldownRemaining(120);
          } catch {}
        }
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
        matchRef.current = null;
        try { localStorage.removeItem(ACTIVE_TRIVIA_STORAGE_KEY); } catch {}
        saveMatch(record); setMatch(record); setPhase('failed');
      }
    } finally {
      if (run === epoch.current) { runningRef.current = false; pauseRef.current = false; setPausePending(false); setStopping(false); setTriviaRunning(false); void stopActivity(record.id); getGatewayStatus().then(setGateway); }
    }
  };
  const pause = () => { pauseRef.current = true; setPausePending(true); };
  const resume = () => {
    pauseRef.current = false;
    setPausePending(false);
    rateLimitSkipRef.current = true;
    setRateLimitCountdown(null);
    setError('');
    if (resumeWaiterRef.current) {
      resumeWaiterRef.current();
    } else if (!runningRef.current && matchRef.current) {
      void start(matchRef.current);
    }
  };
  const stop = () => {
    try { localStorage.removeItem(ACTIVE_TRIVIA_STORAGE_KEY); } catch {}
    cancelRef.current = true;
    pauseRef.current = false;
    setStopping(true);
    resumeWaiterRef.current?.();
    cancelActiveInference();
  };
  const discardMatch = () => {
    try { localStorage.removeItem(ACTIVE_TRIVIA_STORAGE_KEY); } catch {}
    matchRef.current = null;
    cancelRef.current = true;
    pauseRef.current = false;
    resumeWaiterRef.current?.();
    cancelActiveInference();
    setMatch(null);
    setPhase('idle');
    setQuestion(null);
    setAttempts([]);
    setCurrentContestant(-1);
    setLength(null);
  };
  const matchRounds = match?.rounds || [];
  const allAttempts = matchRounds.flatMap(r => r.attempts);
  const contestantMatchStats = LIVE_MODELS.map(id => {
    const modelAttempts = allAttempts.filter(a => a.modelId === id);
    const correct = modelAttempts.filter(a => a.status === 'correct').length;
    const modelPoints = correct * TRIVIA_POINTS_PER_CORRECT;
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
  const isQueueWaiting = rateLimitCountdown !== null && rateLimitCountdown > 0;
  const hostLine = isQueueWaiting ? 'Inference queue busy. Waiting for turn…' : phase === 'generating' ? 'Preparing your next question…' : phase === 'answering' ? 'The contestants are thinking.' : phase === 'paused' ? 'Match paused.' : reveal ? 'Here is my locked answer key.' : phase === 'failed' ? 'The match could not continue.' : 'Ready for a new live match.';
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
      <section className="s4-question-board" aria-labelledby="s4-question-title"><div className="s4-question-top"><span>Question {round + 1}</span><span>{question ? `${question.topic} · ${question.difficulty}` : 'Generating'}</span></div><h2 id="s4-question-title">{question?.question || 'The questioner is preparing a fresh question…'}</h2><div className="s4-answer-list" aria-label="Answer options">{LETTERS.map(letter => <div key={letter} className={`s4-answer-row ${reveal && question?.correct_option === letter ? 'is-key' : ''}`}><span>{letter}</span>{question?.options[letter] || 'Awaiting generated option'}</div>)}</div><div className="s4-question-footer" role="status">{reveal && question ? <><strong>Host-key agreement: {question.correct_option}</strong><p>{question.explanation}</p></> : isQueueWaiting ? `⏳ Model inference is busy with another turn. You are in queue (retrying in ${rateLimitCountdown}s)…` : phase === 'paused' ? 'Paused. Resume to continue the autonomous match.' : phase === 'answering' ? 'Answers arrive sequentially. The host key is hidden until all three calls finish.' : phase === 'generating' ? 'Generating and validating a new MCQ.' : phase === 'completed' ? <div className="s4-completed-footer"><strong>{isZeroScore ? 'Match Complete · No Winner' : `Champion: ${winnerSummary} (${maxScore} pts)`}</strong><span> · Match complete. Championship standings updated.</span><button type="button" className="btn btn-secondary s4-winner-view-btn" onClick={() => setShowWinnerModal(true)}>View Results</button></div> : error || 'Start a live match. The arena chooses 5–7 questions automatically.'}</div></section>
      <aside className="s4-host" aria-label="Questioner"><h2>Questioner</h2><div className="s4-host-bubble">{hostLine}</div><div className="s4-host-figure"><Mascot model={MODELS[host]} motion={phase === 'completed' ? 'celebrating' : 'idle'} showAuthoredLine={false} interactive={false} /></div><strong>{MODELS[host].name}</strong><small>Host · {question?.backendModelId || 'local model'} · no points this round</small></aside>
    </div>
    <div className="s4-trivia-controls"><div><p>Scores measure agreement with the host model’s locked answer key. Questions are not independently fact-checked.</p>{error && <p role="alert">{error}</p>}{gateway && !gateway.gateway_enabled && <p>{gateway.reason}</p>}{match && <details><summary>Match trace</summary><small>Match {match.id} · {match.status} · {match.rounds.length} generated questions</small>{match.rounds.map(item => <p key={item.question.id}><small>Round {item.index + 1}: host {item.question.backendModelId} · request {item.question.requestId} · {item.attempts.map(a => `${a.backendModelId}: ${a.status} ${a.requestId || 'no request ID'}`).join(' · ')}</small></p>)}</details>}</div><div className="s4-live-actions">{!active ? <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>{triviaCooldownRemaining > 0 && <small style={{ color: 'var(--color-text-muted, #94a3b8)', fontSize: '0.8rem' }}>Match completed · Cooldown: {triviaCooldownRemaining}s remaining</small>}<button type="button" className="btn btn-primary" disabled={triviaCooldownRemaining > 0} onClick={() => void start()}>{triviaCooldownRemaining > 0 ? `Cooldown (${triviaCooldownRemaining}s)` : 'Start live match'}</button></div> : phase === 'paused' && !runningRef.current ? <><button type="button" className="btn btn-primary" onClick={() => void start(match || undefined)}>▶ Resume Match (Round {(match?.rounds.length || 0) + 1}/{match?.length || '?'})</button><button type="button" className="btn btn-secondary" onClick={discardMatch}>✕ New Match</button></> : <><button type="button" className="btn btn-secondary" disabled={stopping} onClick={phase === 'paused' || pausePending ? resume : pause}>{isQueueWaiting ? 'In queue…' : phase === 'paused' ? 'Resume' : pausePending ? 'Resume (Pausing…)' : 'Pause'}</button><button type="button" className="btn btn-secondary" disabled={stopping} onClick={stop}>{stopping ? 'Stopping after current call…' : phase === 'paused' ? 'Stop match' : 'Stop after current call'}</button></>}</div></div>
    <TriviaWinnerModal
      isOpen={showWinnerModal}
      onClose={() => setShowWinnerModal(false)}
      onPlayAgain={start}
      results={contestantMatchStats}
      modeTitle="Live Match"
    />
  </div>;
};
