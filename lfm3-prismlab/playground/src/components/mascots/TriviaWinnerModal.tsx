import React, { useEffect } from 'react';
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

export const TriviaWinnerModal: React.FC<TriviaWinnerModalProps> = ({
  isOpen,
  onClose,
  onPlayAgain,
  results,
  modeTitle = 'Live Match'
}) => {
  // Keyboard ESC listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      >
        {/* Modal Header */}
        <div className="s4-winner-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p className="eyebrow" style={{ margin: 0 }}>{modeTitle} · Match Scoreboard</p>
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
