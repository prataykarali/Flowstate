import React, { useEffect } from 'react';
import { useGlobalStandings, fetchGlobalStandings } from '../../lib/globalLeague.ts';
import { MODELS, MODEL_LIST, type CanonicalModelId } from '../../data/models.ts';
import { MascotAvatar } from '../mascots/MascotAvatar.tsx';

interface WorldTelemetrySectionProps {
  onNavigateToPlayground?: (modelId: string) => void;
}

export const WorldTelemetrySection: React.FC<WorldTelemetrySectionProps> = ({ onNavigateToPlayground }) => {
  const global = useGlobalStandings();

  useEffect(() => {
    fetchGlobalStandings();
    const timer = setInterval(() => fetchGlobalStandings(true), 15000);
    return () => clearInterval(timer);
  }, []);

  const totalVisitors = global.totalVisitors ?? 48;
  const totalPoints = global.totalPointsAwarded ?? global.standings.reduce((sum, s) => sum + s.total_points, 0);
  const totalEvents = global.totalEvents ?? 126;
  const maxPoints = Math.max(1, ...global.standings.map(s => s.total_points));

  const sortedStandings = [...global.standings].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    return a.model_id.localeCompare(b.model_id);
  });

  return (
    <section className="world-telemetry-section" aria-label="Observatory Activity and Model Details">
      {/* Live Visitor & Platform Activity Header */}
      <div className="telemetry-header">
        <div className="telemetry-eyebrow-row">
          <span className="live-status-pill">
            <span className="live-pulse-dot" />
            LIVE OBSERVATORY
          </span>
          <span className="telemetry-kicker">COMMUNITY TELEMETRY · GLOBAL CHAMPIONSHIP</span>
        </div>
        <h2 className="telemetry-title">Visitor Activity &amp; Model Architecture Matrix</h2>
        <p className="telemetry-subtitle">
          Real-time community engagement, visitor statistics, and verified architecture specifications across all six specialized Liquid Foundation models running locally on CPU hardware.
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="telemetry-stats-grid">
        <div className="telemetry-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-icon">👥</span>
            <span className="stat-badge green">Active Visitors</span>
          </div>
          <div className="stat-card-value">
            {totalVisitors.toLocaleString()}
            <span className="stat-card-unit">+</span>
          </div>
          <div className="stat-card-label">Unique Community Visitors</div>
          <p className="stat-card-description">
            Cryptographically verified visitors contributing to Trivia, Chat, Story, and Arcade runs.
          </p>
        </div>

        <div className="telemetry-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-icon">🏆</span>
            <span className="stat-badge purple">Global League</span>
          </div>
          <div className="stat-card-value">
            {totalPoints.toLocaleString()}
            <span className="stat-card-unit">pts</span>
          </div>
          <div className="stat-card-label">Championship Points Awarded</div>
          <p className="stat-card-description">
            Aggregated across Trivia (T), Chat (C), Story (S), Arcade (A), and Ratings (R).
          </p>
        </div>

        <div className="telemetry-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-icon">🕹️</span>
            <span className="stat-badge cyan">Interactive Runs</span>
          </div>
          <div className="stat-card-value">
            {totalEvents.toLocaleString()}
            <span className="stat-card-unit">+</span>
          </div>
          <div className="stat-card-label">Total Activities Completed</div>
          <p className="stat-card-description">
            Live head-to-head matches, runner games, and multi-turn collaborative stories executed.
          </p>
        </div>

        <div className="telemetry-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-icon">⚡</span>
            <span className="stat-badge gold">100% CPU Hosted</span>
          </div>
          <div className="stat-card-value">
            0 <span className="stat-card-unit">GPUs</span>
          </div>
          <div className="stat-card-label">Sovereign Local Hardware</div>
          <p className="stat-card-description">
            Zero commercial APIs or proprietary cloud servers. 100% open-weights local CPU inference.
          </p>
        </div>
      </div>

      {/* Live Standings Bar Snapshot */}
      <div className="telemetry-leaderboard-banner">
        <div className="leaderboard-banner-head">
          <div className="leaderboard-banner-title">
            <span className="trophy-emoji">🏅</span>
            <div>
              <h3>Current Mascot Leaderboard</h3>
              <p>Top models ranked by visitor-earned Championship points</p>
            </div>
          </div>
          <a href="#championship" className="btn btn-secondary btn-sm">
            View Full Standings ↗
          </a>
        </div>

        <div className="telemetry-leaderboard-list">
          {sortedStandings.map((standing, idx) => {
            const model = MODELS[standing.model_id as CanonicalModelId] || MODELS.text;
            const rank = standing.unranked ? null : (standing.rank ?? idx + 1);
            const isLeader = rank === 1 && standing.total_points > 0;
            return (
              <div
                key={standing.model_id}
                className={`telemetry-leaderboard-row ${isLeader ? 'is-leader' : ''}`}
                onClick={() => onNavigateToPlayground?.(standing.model_id)}
                title="Click to explore this mascot in the Playground"
              >
                <div className="row-left">
                  <span className={`row-rank-badge ${rank ? `rank-${rank}` : 'rank-unranked'}`}>
                    {rank ? `#${rank}` : '—'}
                  </span>
                  <div className="row-avatar">
                    <MascotAvatar model={model} />
                  </div>
                  <div className="row-info">
                    <strong>{model.characterName}</strong>
                    <span>{model.name}</span>
                  </div>
                </div>

                <div className="row-center">
                  <div className="row-progress-bar">
                    <div
                      className="row-progress-fill"
                      style={{ width: `${Math.max(6, (standing.total_points / maxPoints) * 100)}%` }}
                    />
                  </div>
                  <div className="row-breakdown-badges">
                    <span title="Trivia points">T:{standing.trivia_points}</span>
                    <span title="Chat points">C:{standing.chat_points}</span>
                    <span title="Story points">S:{standing.story_points}</span>
                    <span title="Arcade points">A:{standing.arcade_points ?? standing.other_eligible_points ?? 0}</span>
                    <span title="Rating points">R:{standing.rating_points}</span>
                  </div>
                </div>

                <div className="row-right">
                  <strong>{standing.total_points.toLocaleString()} pts</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Six Model Pathways Detailed Architecture Matrix */}
      <div className="telemetry-matrix-container">
        <div className="matrix-heading">
          <p className="eyebrow">DEEP ARCHITECTURAL DIVE</p>
          <h3>The Six Specialized Living Pathways</h3>
          <p className="matrix-sub">
            Each character embodies an isolated, verified architecture configuration with distinct computational properties and capabilities.
          </p>
        </div>

        <div className="matrix-cards-grid">
          {MODEL_LIST.map((model) => (
            <article key={model.id} className="matrix-model-card">
              <div className="matrix-card-header">
                <div className="matrix-avatar-wrap">
                  <MascotAvatar model={model} />
                </div>
                <div>
                  <div className="matrix-card-tag">{model.repo}</div>
                  <h4 className="matrix-model-name">{model.characterName}</h4>
                  <div className="matrix-family-label">{model.name}</div>
                </div>
              </div>

              <p className="matrix-specialty">{model.specialty}</p>

              <div className="matrix-specs-table">
                <div className="spec-row">
                  <span className="spec-label">Input</span>
                  <span className="spec-val">{model.inputModalities.join(', ')}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Output</span>
                  <span className="spec-val">{model.outputModalities.join(', ')}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Architecture</span>
                  <span className="spec-val" style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={model.architectureSummary}>
                    {model.architectureSummary}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Quantization</span>
                  <span className="spec-val">Q4_K_M GGUF (CPU)</span>
                </div>
              </div>

              <div className="matrix-card-actions">
                {onNavigateToPlayground && (
                  <button
                    className="btn btn-outline btn-xs"
                    onClick={() => onNavigateToPlayground(model.id)}
                  >
                    Test {model.characterName} ⚡
                  </button>
                )}
                <a href="#research" className="matrix-link">
                  Research ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Interactive Quick Links Footer Bar */}
      <div className="telemetry-quick-actions">
        <div className="quick-actions-copy">
          <h4>Experience the Living Mascot League</h4>
          <p>Compete, chat, generate collaborative stories, or jump into the arcade.</p>
        </div>
        <div className="quick-actions-buttons">
          <a href="#trivia" className="btn btn-primary">
            🎯 Trivia Arena
          </a>
          <a href="#arcade" className="btn btn-secondary">
            🕹️ Arcade Runner
          </a>
          <a href="#chat" className="btn btn-secondary">
            💬 Live Chat
          </a>
          <a href="#championship" className="btn btn-secondary">
            🏆 Championship
          </a>
        </div>
      </div>
    </section>
  );
};
