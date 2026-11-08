import React, { useEffect, useState } from 'react';
import { RouteId } from '../app/routes.ts';
import { getGatewayStatus, type GatewayStatus } from '../lib/api.ts';

interface OfflineGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: RouteId) => void;
  gatewayStatus?: GatewayStatus | null;
}

export const OfflineGatewayModal: React.FC<OfflineGatewayModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  gatewayStatus
}) => {
  const [checking, setChecking] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState<{ text: string; success: boolean } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCheckFeedback(null);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCheckConnection = async () => {
    setChecking(true);
    setCheckFeedback(null);
    try {
      const status = await getGatewayStatus(true);
      if (status.health_state === 'ONLINE' || status.health_state === 'BUSY' || (status.gateway_enabled && status.backend_live_enabled)) {
        setCheckFeedback({
          text: 'Host AI connected! Resuming live inference…',
          success: true
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setCheckFeedback({
          text: 'Host laptop is still offline. We will keep listening in the background.',
          success: false
        });
      }
    } catch {
      setCheckFeedback({
        text: 'Host machine is still unreachable. Make sure the laptop is powered on.',
        success: false
      });
    } finally {
      setChecking(false);
    }
  };

  const handleGoTo = (route: RouteId) => {
    onNavigate(route);
    onClose();
  };

  return (
    <div
      className="offline-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="offline-modal-card">
        {/* Header badge & close button */}
        <div className="offline-modal-header">
          <div className="offline-status-pill">
            <span className="offline-pulse-dot" />
            <span>Host Laptop Offline</span>
          </div>
          <button
            type="button"
            className="offline-close-btn"
            onClick={onClose}
            aria-label="Close offline modal"
          >
            ✕
          </button>
        </div>

        {/* Title & Description */}
        <div className="offline-modal-hero">
          <div className="offline-icon-glow">⚡</div>
          <h2 id="offline-modal-title" className="offline-modal-title">
            PrismLab Local AI is Offline
          </h2>
          <p className="offline-modal-desc">
            The local CPU inference server running on the host laptop is currently turned off or disconnected. Live generative features (Chat Conservatory, Live Trivia Host, Story Relay, and Multimodal Playground) are paused until the host machine is powered back on.
          </p>
          <div className="offline-reassurance-badge">
            ✦ All client-side games, research data, and model architecture explorers remain 100% active!
          </div>
        </div>

        {/* Host Info Box */}
        <div className="offline-host-card">
          <div className="offline-host-row">
            <span className="offline-host-label">Inference Host:</span>
            <span className="offline-host-value">PrismLab Local CPU Worker (Tailscale Mesh)</span>
          </div>
          <div className="offline-host-row">
            <span className="offline-host-label">Current State:</span>
            <span className="offline-host-value" style={{ color: '#fca5a5' }}>
              ● {gatewayStatus?.reason || 'Powered Down / Network Unreachable'}
            </span>
          </div>
          <div className="offline-host-row">
            <span className="offline-host-label">Auto-Reconnect:</span>
            <span className="offline-host-value" style={{ color: '#93c5fd' }}>
              Active · Auto-resumes as soon as laptop starts
            </span>
          </div>
        </div>

        {/* Available Offline Activities */}
        <div className="offline-features-section">
          <h3 className="offline-features-title">Explore Available Offline Features</h3>
          <div className="offline-features-grid">
            <button
              type="button"
              className="offline-feature-tile"
              onClick={() => handleGoTo('arcade')}
            >
              <div className="offline-feature-icon">🎮</div>
              <div className="offline-feature-text">
                <strong>Prism Runner Arcade</strong>
                <span>6-mascot infinite canvas runner playable in-browser</span>
              </div>
              <span className="offline-feature-arrow">→</span>
            </button>

            <button
              type="button"
              className="offline-feature-tile"
              onClick={() => handleGoTo('research')}
            >
              <div className="offline-feature-icon">🔬</div>
              <div className="offline-feature-text">
                <strong>Research Observatory</strong>
                <span>Empirical LFM3 speed, TTFT & parameter benchmarks</span>
              </div>
              <span className="offline-feature-arrow">→</span>
            </button>

            <button
              type="button"
              className="offline-feature-tile"
              onClick={() => handleGoTo('architecture')}
            >
              <div className="offline-feature-icon">🏛️</div>
              <div className="offline-feature-text">
                <strong>Architecture Explorer</strong>
                <span>Liquid Neural Networks & hybrid layer simulator</span>
              </div>
              <span className="offline-feature-arrow">→</span>
            </button>

            <button
              type="button"
              className="offline-feature-tile"
              onClick={() => handleGoTo('championship')}
            >
              <div className="offline-feature-icon">🏆</div>
              <div className="offline-feature-text">
                <strong>Arena Championship</strong>
                <span>Verified match replays, telemetry & leaderboard</span>
              </div>
              <span className="offline-feature-arrow">→</span>
            </button>
          </div>
        </div>

        {/* Check connection feedback */}
        {checkFeedback && (
          <div
            className={`offline-feedback-alert ${checkFeedback.success ? 'is-success' : 'is-error'}`}
            role="status"
          >
            {checkFeedback.text}
          </div>
        )}

        {/* Action Controls */}
        <div className="offline-modal-actions">
          <button
            type="button"
            className="btn-offline-check"
            disabled={checking}
            onClick={handleCheckConnection}
          >
            {checking ? (
              <>
                <span className="offline-spinner" /> Checking Connection…
              </>
            ) : (
              '↻ Check Connection'
            )}
          </button>
          <button
            type="button"
            className="btn-offline-dismiss"
            onClick={onClose}
          >
            Explore Offline Features
          </button>
        </div>
      </div>
    </div>
  );
};
