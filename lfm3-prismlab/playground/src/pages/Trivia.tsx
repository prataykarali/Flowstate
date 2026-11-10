import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Mascot } from '../components/mascots/Mascot.tsx';
import { MascotAvatar } from '../components/mascots/MascotAvatar.tsx';
import { TriviaWinnerModal } from '../components/mascots/TriviaWinnerModal.tsx';
import { MODEL_LIST, MODELS, type CanonicalModelId } from '../data/models.ts';
import { isTriviaRunning, setTriviaRunning, subscribeTriviaRunning } from '../lib/triviaLock.ts';
import { LiveTrivia } from './LiveTrivia.tsx';
import { TRIVIA_POINTS_PER_CORRECT } from '../lib/triviaLive.ts';

type Phase = 'idle' | 'presenting' | 'answering' | 'revealing' | 'completed';
type Question = { topic: string; text: string; options: [string, string, string, string]; key: number; explanation: string; demoAnswers: [number, number, number] };
const QUESTIONS: Question[] = [
  { topic: 'Computer science', text: 'Which data structure follows the first in, first out principle?', options: ['Stack', 'Queue', 'Tree', 'Graph'], key: 1, explanation: 'A queue removes the earliest inserted item first.', demoAnswers: [1, 0, 1] },
  { topic: 'PrismLab research', text: 'How many gated convolution layers are in the LFM3-1.7B hybrid schedule?', options: ['6', '13', '18', '24'], key: 1, explanation: 'The 24-layer schedule includes 13 gated convolution layers.', demoAnswers: [0, 1, 1] },
  { topic: 'Model architecture', text: 'What is the principal memory advantage of fixed recurrent state?', options: ['It grows with every token', 'It stores unlimited text', 'Its size does not grow with sequence length', 'It needs no computation'], key: 2, explanation: 'A fixed recurrent state has a bounded memory footprint.', demoAnswers: [2, 2, 1] },
  { topic: 'PrismLab research', text: 'Which model has the SystemOne SlotReader decision head?', options: ['LFM3-1.7B', 'LFM3-Audio-2B', 'LFM3-VL-2B', 'd1-2B'], key: 3, explanation: 'The d1 family uses a categorical decision interface.', demoAnswers: [3, 0, 3] },
  { topic: 'Computer science', text: 'What does a compiler primarily translate?', options: ['Source code', 'Screen pixels', 'Network cables', 'Battery charge'], key: 0, explanation: 'A compiler translates source code into a target representation.', demoAnswers: [0, 1, 0] },
  { topic: 'Computer science', text: 'Which protocol is commonly used for secure web pages?', options: ['FTP', 'HTTP', 'HTTPS', 'SMTP'], key: 2, explanation: 'HTTPS carries HTTP over a secure transport.', demoAnswers: [2, 2, 0] },
  { topic: 'Machine learning', text: 'What does a validation set help measure?', options: ['Power usage only', 'Generalization during development', 'Disk speed', 'Screen resolution'], key: 1, explanation: 'Validation data helps assess behavior on examples outside training.', demoAnswers: [1, 3, 1] },
  { topic: 'Computer science', text: 'Which operation adds an item to the end of a queue?', options: ['Pop', 'Sort', 'Enqueue', 'Merge'], key: 2, explanation: 'Enqueue adds an item; dequeue removes the front item.', demoAnswers: [0, 2, 2] },
  { topic: 'PrismLab research', text: 'Which model in this project is associated with speech to speech work?', options: ['d1-2B', 'LFM3-Audio-2B', 'LFM3-VL-2B', 'LFM3-1.7B'], key: 1, explanation: 'LFM3-Audio-2B is the project’s speech model.', demoAnswers: [1, 1, 3] },
  { topic: 'Machine learning', text: 'What does inference mean for a trained model?', options: ['Replacing its weights', 'Collecting all training data', 'Producing an output from an input', 'Deleting the model'], key: 2, explanation: 'Inference applies a trained model to an input to produce an output.', demoAnswers: [2, 0, 2] },
];
const LETTERS = ['A', 'B', 'C', 'D'] as const;
const IDS = MODEL_LIST.map(model => model.id);
const delay = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
const zeroScores = (): Record<CanonicalModelId, number> => ({ text: 0, vision: 0, audio: 0, omni: 0, d1: 0, d1_omni: 0 });

export const selectRandomDemoLength = (randomFn: () => number = Math.random): number => {
  return Math.floor(randomFn() * 6) + 5;
};

const DemoTrivia: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [demoLength, setDemoLength] = useState(QUESTIONS.length);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [scores, setScores] = useState(zeroScores);
  const [demoAttempts, setDemoAttempts] = useState<Record<CanonicalModelId, number>>(() => ({
    text: 0, vision: 0, audio: 0, omni: 0, d1: 0, d1_omni: 0
  }));
  const [currentContestant, setCurrentContestant] = useState(-1);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const epoch = useRef(0);
  const active = phase === 'presenting' || phase === 'answering' || phase === 'revealing';
  const question = QUESTIONS[round];
  const host = IDS[round % IDS.length];
  const contestants = [1, 2, 3].map(offset => IDS[(round + offset) % IDS.length]);
  useEffect(() => () => { epoch.current += 1; setTriviaRunning(false); }, []);

  const start = async () => {
    if (active) return;
    const run = ++epoch.current;
    const matchCount = selectRandomDemoLength();
    setDemoLength(matchCount);
    setScores(zeroScores());
    setDemoAttempts({ text: 0, vision: 0, audio: 0, omni: 0, d1: 0, d1_omni: 0 });
    setTriviaRunning(true);
    setShowWinnerModal(false);
    for (let n = 0; n < matchCount; n += 1) {
      if (run !== epoch.current) return;
      setRound(n); setAnswers([null, null, null]); setCurrentContestant(-1); setPhase('presenting');
      await delay(900);
      if (run !== epoch.current) return;
      setPhase('answering');
      for (let i = 0; i < 3; i += 1) {
        const contestantId = contestants[i];
        setDemoAttempts(prev => ({ ...prev, [contestantId]: (prev[contestantId] || 0) + 1 }));
        setCurrentContestant(i);
        await delay(850);
        if (run !== epoch.current) return;
        setAnswers(previous => previous.map((value, slot) => slot === i ? QUESTIONS[n % QUESTIONS.length].demoAnswers[i] : value));
      }
      setCurrentContestant(-1); setPhase('revealing');
      setScores(previous => {
        const next = { ...previous };
        for (let i = 0; i < 3; i += 1) if (QUESTIONS[n % QUESTIONS.length].demoAnswers[i] === QUESTIONS[n % QUESTIONS.length].key) next[IDS[(n + i + 1) % IDS.length]] += TRIVIA_POINTS_PER_CORRECT;
        return next;
      });
      await delay(2300);
    }
    if (run === epoch.current) {
      setPhase('completed');
      setTriviaRunning(false);
      setShowWinnerModal(true);
    }
  };

  const contestantMatchStats = IDS.map(id => {
    const points = scores[id] || 0;
    const correct = points / TRIVIA_POINTS_PER_CORRECT;
    const attempts = demoAttempts[id] || correct;
    const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
    return { id, points, correct, attempts, accuracy };
  });
  const maxScore = Math.max(...contestantMatchStats.map(m => m.points), 0);
  const isZeroScore = maxScore === 0;
  const winners = isZeroScore ? [] : contestantMatchStats.filter(m => m.points === maxScore);
  const winnerSummary = isZeroScore ? 'No Winner' : winners.map(w => MODELS[w.id].characterName).join(' & ');
  const hostLine = phase === 'idle' ? 'The arena is ready.' : phase === 'presenting' ? 'Here is your next question.' : phase === 'answering' ? 'What will the contestants choose?' : phase === 'revealing' ? 'Let’s reveal the answer.' : 'The exhibition is complete.';

  return <div className="page-trivia s4-trivia">
    <header className="s4-trivia-header"><div><p className="eyebrow">PrismLab Playground</p><h1>Trivia Arena</h1><p>Autonomous spectator exhibition</p></div><div className="s4-trivia-status"><span>Round {Math.min(round + 1, demoLength)}/{demoLength}</span><span className="s4-demo-badge">DETERMINISTIC DEMO</span></div></header>
    <div className="s4-live-roster" aria-label="Six model match roster">
      {IDS.map(id => {
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
              <span className="s4-roster-points">{scores[id]} pts</span>
            </div>
          </div>
        );
      })}
    </div>
    <div className="s4-trivia-layout">
      <section className="s4-contestants" aria-label="Three contestants"><h2>Contestants</h2>{contestants.map((id, i) => {
        const answer = answers[i];
        const thinking = phase === 'answering' && currentContestant === i && answer === null;
        const reacted = phase === 'revealing' || phase === 'completed';
        return <article className={`s4-contestant ${thinking ? 'is-thinking' : ''}`} key={id}>
          <div className="s4-contestant-figure"><Mascot model={MODELS[id]} motion={reacted ? answer === question.key ? 'celebrating' : 'sad' : 'idle'} reactionState={reacted ? answer === question.key ? 'happy' : 'sad' : thinking ? 'thinking' : 'idle'} reactionSignal={reacted || thinking ? round + 1 : 0} showAuthoredLine={false} interactive={false} /></div>
          <div className="s4-contestant-copy"><strong>{MODELS[id].name}</strong><small>{scores[id]} demo points</small><div className="s4-answer-bubble" aria-live="polite">{answer === null ? thinking ? 'Thinking…' : phase === 'presenting' || phase === 'answering' ? 'Waiting' : 'Ready' : `Answer ${LETTERS[answer]}`}</div></div>
        </article>;
      })}</section>
      <section className="s4-question-board" aria-labelledby="s4-question-title"><div className="s4-question-top"><span>Question {round + 1}</span><span>{question.topic} · Easy</span></div><h2 id="s4-question-title">{question.text}</h2><div className="s4-answer-list" aria-label="Answer options">{question.options.map((option, i) => <div key={i} className={`s4-answer-row ${(phase === 'revealing' || phase === 'completed') && i === question.key ? 'is-key' : ''}`}><span>{LETTERS[i]}</span>{option}</div>)}</div><div className="s4-question-footer" role="status">{phase === 'idle' ? 'Press Start exhibition to watch.' : phase === 'presenting' ? 'Question on the board' : phase === 'answering' ? 'Contestants answer one at a time' : phase === 'completed' ? <div className="s4-completed-footer"><strong>{isZeroScore ? 'Exhibition Complete · No Winner' : `Champion: ${winnerSummary} (${maxScore} pts)`}</strong><span> · Exhibition complete.</span><button type="button" className="btn btn-secondary s4-winner-view-btn" onClick={() => setShowWinnerModal(true)}>View Results</button></div> : <><strong>Host key: {LETTERS[question.key]}</strong><p>{question.explanation}</p></>}</div></section>
      <aside className="s4-host" aria-label="Questioner"><h2>Questioner</h2><div className="s4-host-bubble">{hostLine}</div><div className="s4-host-figure"><Mascot model={MODELS[host]} motion={phase === 'completed' ? 'celebrating' : 'idle'} showAuthoredLine={false} interactive={false} /></div><strong>{MODELS[host].name}</strong><small>Host · no contestant points this round</small></aside>
    </div>
    <div className="s4-trivia-controls"><p><strong>Live arena unavailable:</strong> The installed adapters currently expose only one verified text-only MCQ model. Four distinct eligible models are required for a live match. Demo answers are scripted and never affect Championship records.</p>{!active && <button className="btn btn-primary" type="button" onClick={start}>{phase === 'completed' ? 'Watch again' : 'Start exhibition'}</button>}{active && <span role="status">Autonomous match running · Chat and Story unavailable</span>}</div>
    <TriviaWinnerModal
      isOpen={showWinnerModal}
      onClose={() => setShowWinnerModal(false)}
      onPlayAgain={start}
      results={contestantMatchStats}
      modeTitle="Deterministic Demo"
    />
  </div>;
};

export const Trivia: React.FC = () => {
  const [mode, setMode] = useState<'live' | 'demo'>('live');
  const running = useSyncExternalStore(subscribeTriviaRunning, isTriviaRunning);
  return <><div className="s4-mode-tabs" role="group" aria-label="Trivia mode"><button type="button" className={mode === 'live' ? 'is-active' : ''} disabled={running} onClick={() => setMode('live')}>Live Match</button><button type="button" className={mode === 'demo' ? 'is-active' : ''} disabled={running} onClick={() => setMode('demo')}>Deterministic Demo</button></div>{mode === 'live' ? <LiveTrivia /> : <DemoTrivia />}</>;
};
