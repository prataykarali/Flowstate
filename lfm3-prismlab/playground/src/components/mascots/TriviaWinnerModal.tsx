import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MODELS, type CanonicalModelId } from '../../data/models.ts';
import { MascotAvatar } from './MascotAvatar.tsx';

export interface ContestantMatchStats {
  id: CanonicalModelId;
  points: number;
  correct: number;
  attempts: number;
  accuracy: number;
}

interface TriviaWinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain?: () => void;
  results: ContestantMatchStats[];
  modeTitle?: string;
}

const AUTO_DISMISS_MS = 5000;

export const TriviaWinnerModal: React.FC<TriviaWinnerModalProps> = ({
  isOpen,
  onClose,
  onPlayAgain,
  results,
  modeTitle = 'Live Match'
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [remainingMs, setRemainingMs] = useState(AUTO_DISMISS_MS);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  // Reset timer when opened
  useEffect(() => {
    if (!isOpen) {
      setRemainingMs(AUTO_DISMISS_MS);
      setIsPaused(false);
      return;
    }

    // Keyboard ESC listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    // If reduced motion is requested, do not force auto-dismiss
    if (reducedMotion) {
      return () => window.removeEventListener('keydown', handleKeyDown);
    }

    const stepMs = 100;
    const interval = window.setInterval(() => {
      if (isPausedRef.current) return;
      setRemainingMs(prev => {
        if (prev <= stepMs) {
          window.clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - stepMs;
      });
    }, stepMs);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearInterval(interval);
    };
  }, [isOpen, onClose, reducedMotion]);

  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);
  const handleFocus = useCallback(() => setIsPaused(true), []);
  const handleBlur = useCallback(() => setIsPaused(false), []);

  if (!isOpen || results.length === 0) return null;

  const sorted = [...results].sort((a, b) => b.points - a.points || b.accuracy - a.accuracy);
  const maxScore = sorted[0].points;
  const isZeroScore = maxScore === 0;
  const winners = isZeroScore ? [] : sorted.filter(r => r.points === maxScore);
  const isTie = winners.length > 1;
  const winnerTitle = isZeroScore ? 'Exhibition Complete' : isTie ? 'Joint Champions' : 'Trivia Champion';
  const winnerNames = isZeroScore
    ? 'No Winner This Match'
    : winners.map(w => MODELS[w.id].characterName).join(' & ');
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div
      className="s4-winner-overlay"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="s4-winner-dialog s4-winner-dialog--compact"
        role="dialog"
        aria-modal="true"
        aria-label="Trivia match results and scoreboard"
        onClick={e => e.stopPropagation()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {/* Dismiss countdown progress bar */}
        {!reducedMotion && (
          <div className="s4-winner-timer-bar" aria-hidden="true">
            <div
              className={`s4-winner-timer-fill ${isPaused ? 'is-paused' : ''}`}
              style={{ width: `${(remainingMs / AUTO_DISMISS_MS) * 100}%` }}
            />
          </div>
        )}

        {/* Modal Header */}
        <div className="s4-winner-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p className="eyebrow" style={{ margin: 0 }}>{modeTitle} · Match Scoreboard</p>
              {!reducedMotion && (
                <span className="s4-winner-timer-tag">
                  {isPaused ? 'Timer Paused' : `Auto-closing in ${secondsLeft}s`}
                </span>
              )}
            </div>
            <h2>{winnerTitle}</h2>
          </div>
          <button
            type="button"
            className="s4-winner-close-btn"
            onClick={onClose}
            aria-label="Close match results"
          >
            ×
          </button>
        </div>

        {/* Champion summary strip */}
        <div className="s4-winner-summary-strip">
          <div className="s4-winner-avatars-row">
            {winners.map(w => (
              <div key={w.id} className="s4-winner-avatar-badge" title={MODELS[w.id].characterName}>
                <MascotAvatar model={MODELS[w.id]} />
              </div>
            ))}
          </div>
          <div className="s4-winner-summary-meta">
            <span className="s4-winner-badge-pill">{isTie ? 'Shared Victory' : isZeroScore ? 'Review' : '1st Place'}</span>
            <strong className="s4-winner-hero-name">{winnerNames}</strong>
            <span className="s4-winner-hero-score">{maxScore} points</span>
          </div>
        </div>

        {/* Single unified scoreboard table */}
        <div className="s4-winner-standings-section">
          <div className="s4-winner-standings-list" role="table" aria-label="Contestant standings">
            {sorted.map((item, index) => {
              const m = MODELS[item.id];
              const isWin = !isZeroScore && item.points === maxScore;
              return (
                <div
                  key={item.id}
                  className={`s4-winner-row ${isWin ? 'is-winner-row' : ''}`}
                  role="row"
                >
                  <span className="s4-winner-row-rank" role="cell">#{index + 1}</span>
                  <div className="s4-winner-row-avatar" role="cell">
                    <MascotAvatar model={m} />
                  </div>
                  <div className="s4-winner-row-details" role="cell">
                    <span className="s4-row-nickname">{m.characterName}</span>
                    <span className="s4-row-techid">{m.name}</span>
                  </div>
                  <div className="s4-winner-row-perf" role="cell">
                    <span>{item.correct}/{item.attempts} correct</span>
                    <small>{item.accuracy}% key agree</small>
                  </div>
                  <span className="s4-winner-row-pts" role="cell">{item.points} pts</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="s4-winner-actions">
          {onPlayAgain && (
            <button
              type="button"
              className="btn btn-primary s4-winner-action-btn"
              onClick={() => {
                onClose();
                onPlayAgain();
              }}
            >
              Play Again
            </button>
          )}
          <a
            href="#championship"
            className="btn btn-secondary s4-winner-action-btn"
            onClick={onClose}
          >
            View Championship
          </a>
          <button
            type="button"
            className="btn btn-secondary s4-winner-action-btn"
            onClick={onClose}
          >
            Return to Arena
          </button>
        </div>
      </section>
    </div>
  );
};
