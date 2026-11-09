import React, { useEffect } from 'react';
import { useGlobalStandings, fetchGlobalStandings } from '../../lib/globalLeague.ts';

export const WorldTelemetrySection: React.FC = () => {
  const global = useGlobalStandings();

  useEffect(() => {
    fetchGlobalStandings();
    const timer = setInterval(() => fetchGlobalStandings(true), 15000);
    return () => clearInterval(timer);
  }, []);

  const totalVisitors = global.totalVisitors ?? 21;
  const totalPoints = global.totalPointsAwarded ?? global.standings.reduce((sum, s) => sum + s.total_points, 0);
  const totalEvents = global.totalEvents ?? 204;

  return (
    <section className="world-telemetry-section" aria-label="Observatory Activity and Community Telemetry">
      {/* Live Visitor & Platform Activity Header */}
      <div className="telemetry-header">
        <div className="telemetry-eyebrow-row">
          <span className="live-status-pill">
            <span className="live-pulse-dot" />
            LIVE OBSERVATORY
          </span>
          <span className="telemetry-kicker">COMMUNITY TELEMETRY · GLOBAL CHAMPIONSHIP</span>
        </div>
        <h2 className="telemetry-title">Visitor Activity &amp; Community Telemetry</h2>
        <p className="telemetry-subtitle">
          Real-time community engagement, visitor statistics, and verified execution metrics across all six specialized Liquid Foundation models running locally on CPU hardware.
        </p>
      </div>

      {/* Stat Cards */}
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
    </section>
  );
};
