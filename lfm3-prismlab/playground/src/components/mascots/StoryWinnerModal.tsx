import React, { useEffect } from 'react';
import { MODELS, type CanonicalModelId } from '../../data/models.ts';
import { MascotAvatar } from './MascotAvatar.tsx';
import type { ShowRecord } from '../../lib/storyShow.ts';

export interface StoryContestantStats {
  id: CanonicalModelId;
  characterName: string;
  modelName: string;
  role: string;
  turnsCompleted: number;
  wordsAuthored: number;
  points: number;
}

interface StoryWinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain?: () => void;
  show: ShowRecord | null;
}

const ROLE_LABELS: Record<CanonicalModelId, string> = {
  text: 'Lead Storyteller',
  vision: 'Visual Grounding',
  audio: 'Audio & Atmosphere',
  omni: 'Multimodal Scene Weaver',
  d1: 'Decision & Plot Director',
  d1_omni: 'Sensory Plot Director',
};

export const StoryWinnerModal: React.FC<StoryWinnerModalProps> = ({
  isOpen,
  onClose,
  onPlayAgain,
  show,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !show) return null;

  const completedTurns = show.turns.filter(t => t.status === 'completed');
  const participatingModels = Array.from(new Set([
    ...show.config.modelIds,
    ...completedTurns.map(t => t.modelId),
  ]));

  const results: StoryContestantStats[] = participatingModels.map(id => {
    const modelTurns = completedTurns.filter(t => t.modelId === id);
    const turnsCompleted = modelTurns.length;
    const wordsAuthored = modelTurns.reduce((sum, t) => {
      const text = t.output || t.stageText || '';
      return sum + text.trim().split(/\s+/).filter(Boolean).length;
    }, 0);

    // Scoring: 15 pts per writer turn, 10 pts per specialist/support turn, 10 bonus if completed
    const writerTurns = modelTurns.filter(t => t.role === 'writer' || id === 'text').length;
    const supportTurns = turnsCompleted - writerTurns;
    const basePoints = writerTurns * 15 + supportTurns * 10;
    const sessionBonus = turnsCompleted > 0 && show.status === 'completed' ? 10 : 0;
    const points = basePoints + sessionBonus;

    return {
      id,
      characterName: MODELS[id]?.characterName || id,
      modelName: MODELS[id]?.name || id,
      role: ROLE_LABELS[id] || 'Cast Member',
      turnsCompleted,
      wordsAuthored,
      points,
    };
  });

  const sorted = [...results].sort((a, b) => b.points - a.points || b.turnsCompleted - a.turnsCompleted || b.wordsAuthored - a.wordsAuthored);
  const maxScore = sorted.length > 0 ? sorted[0].points : 0;
  const isZeroScore = maxScore === 0;
  const winners = isZeroScore ? [] : sorted.filter(r => r.points === maxScore);
  const isTie = winners.length > 1;
  const winnerTitle = isZeroScore ? 'Story Exhibition' : isTie ? 'Joint Story MVPs' : 'Story MVP';
  const winnerNames = isZeroScore
    ? 'No Points Awarded'
    : winners.map(w => w.characterName).join(' & ');

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
        aria-label="Story results and model scoreboard"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="s4-winner-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p className="eyebrow" style={{ margin: 0 }}>Auto Story · Final Standings</p>
            </div>
            <h2>{winnerTitle}</h2>
          </div>
          <button
            type="button"
            className="s4-winner-close-btn"
            onClick={onClose}
            aria-label="Close story results"
          >
            ×
          </button>
        </div>

        {/* Champion summary strip */}
        <div className="s4-winner-summary-strip">
          <div className="s4-winner-avatars-row">
            {winners.map(w => (
              <div key={w.id} className="s4-winner-avatar-badge" title={w.characterName}>
                <MascotAvatar model={MODELS[w.id]} />
              </div>
            ))}
          </div>
          <div className="s4-winner-summary-meta">
            <span className="s4-winner-badge-pill">{isTie ? 'Shared MVP' : isZeroScore ? 'Exhibition' : 'Top Contributor'}</span>
            <strong className="s4-winner-hero-name">{winnerNames}</strong>
            <span className="s4-winner-hero-score">{maxScore} points</span>
          </div>
        </div>

        {/* Standings table */}
        <div className="s4-winner-standings-section">
          <div className="s4-winner-standings-list" role="table" aria-label="Model story contributions">
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
                    <span className="s4-row-nickname">{item.characterName}</span>
                    <span className="s4-row-techid">{item.role}</span>
                  </div>
                  <div className="s4-winner-row-perf" role="cell">
                    <span>{item.turnsCompleted} turns completed</span>
                    <small>{item.wordsAuthored} words authored</small>
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
              Start Another Story
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
            Return to Story
          </button>
        </div>
      </section>
    </div>
  );
};
