import React, { useEffect, useRef, useState } from 'react';
import { RouteId } from '../app/routes.ts';
import { Navigation } from './Navigation.tsx';
import { SceneBackground } from './environment/SceneBackground.tsx';
import { GlobalActivityBanner } from './GlobalActivityBanner.tsx';
import { OfflineGatewayModal } from './OfflineGatewayModal.tsx';
import { getGatewayStatus, subscribeGatewayStatus, registerOfflineModalTrigger, type GatewayStatus } from '../lib/api.ts';

interface AppShellProps {
  currentRoute: RouteId;
  onNavigate: (route: RouteId) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentRoute, onNavigate, children }) => {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const hasPromptedInitialOfflineRef = useRef(false);

  // Subscribe to gateway status updates across the application
  useEffect(() => {
    const unsubscribeStatus = subscribeGatewayStatus((status) => {
      setGatewayStatus(status);
      const isOffline = status.health_state === 'OFFLINE';
      if (isOffline && !hasPromptedInitialOfflineRef.current) {
        hasPromptedInitialOfflineRef.current = true;
        setIsOfflineModalOpen(true);
      }
    });

    const unsubscribeTrigger = registerOfflineModalTrigger(() => {
      setIsOfflineModalOpen(true);
    });

    // Initial status probe
    void getGatewayStatus(false).then((status) => {
      setGatewayStatus(status);
      const isOffline = status.health_state === 'OFFLINE';
      if (isOffline && !hasPromptedInitialOfflineRef.current) {
        hasPromptedInitialOfflineRef.current = true;
        setIsOfflineModalOpen(true);
      }
    });

    // Periodic check every 25 seconds
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void getGatewayStatus(false).then(setGatewayStatus);
      }
    }, 25_000);

    const onVisibility = () => {
      if (!document.hidden) {
        void getGatewayStatus(true).then(setGatewayStatus);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubscribeStatus();
      unsubscribeTrigger();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const isOffline = gatewayStatus?.health_state === 'OFFLINE';
  const isBusy = gatewayStatus?.health_state === 'BUSY' || !!gatewayStatus?.inference_busy || (gatewayStatus?.queue?.active ?? 0) > 0;

  return (
    <div className={`app-shell route-${currentRoute}`}>
      {/* Public Beta Notice Banner */}
      <div
        className="beta-notice-banner"
        role="region"
        aria-label="Beta Notice"
      >
        <span className="beta-notice-tag">✦ Public Research Beta:</span>
        <span className="beta-notice-text">
          PrismLab is an experimental AI research playground. Inference runs on limited CPU hardware, so responses may be queued and service may occasionally be unavailable.
        </span>
      </div>

      {/* Global Activity Status Banner for Paused/Parked sessions */}
      <GlobalActivityBanner onNavigate={onNavigate} />

      {/* Top Header */}
      <header className="header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href="#world"
            className="brand-group"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('world');
            }}
          >
            {/* PrismLab Geometric Triangle Logo */}
            <svg className="brand-icon" viewBox="0 0 40 40" aria-hidden="true">
              <polygon points="20,4 36,34 4,34" fill="url(#brandGrad)" />
              <polygon points="20,10 32,32 8,32" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
              <defs>
                <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="50%" stopColor="#52efd0" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
            <div>
              <span className="brand-title">PrismLab</span>
            </div>
          </a>
        </div>

        {/* Global Navigation */}
        <Navigation currentRoute={currentRoute} onNavigate={onNavigate} />

        {/* System Status Indicator Pill */}
        <button
          type="button"
          className={`header-status-badge ${isOffline ? 'is-offline' : isBusy ? 'is-busy' : 'is-online'}`}
          onClick={() => {
            if (isOffline) {
              setIsOfflineModalOpen(true);
            } else {
              void getGatewayStatus(true).then(setGatewayStatus);
            }
          }}
          title={isOffline ? 'Host laptop is offline. Click for details and offline activities.' : isBusy ? 'Inference queue is currently busy' : 'Local CPU Inference Gateway is online'}
          aria-label={isOffline ? 'Host laptop is offline. Click to open details.' : 'Inference gateway status'}
        >
          <span className="status-dot" />
          <span className="status-label status-label-full">
            {isOffline ? 'Host AI Offline · Info' : isBusy ? 'Inference Busy' : 'Live CPU Gateway'}
          </span>
          <span className="status-label status-label-short">
            {isOffline ? 'Offline' : isBusy ? 'Busy' : 'Online'}
          </span>
        </button>
      </header>

      {/* Main Page Content */}
      <main className={`app-main ${currentRoute === 'world' ? '' : 'scene-route'} ${currentRoute === 'chat' ? 'chat-main' : ''}`}>
        {currentRoute !== 'world' && currentRoute !== 'chat' && <SceneBackground route={currentRoute} />}
        {children}
      </main>

      {/* Offline Gateway Modal Dialog */}
      <OfflineGatewayModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        onNavigate={onNavigate}
        gatewayStatus={gatewayStatus}
      />

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--prismlab-panel-border)',
          padding: '24px 20px',
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--prismlab-panel-muted)',
          background: 'rgba(9, 9, 11, 0.95)'
        }}
      >
        <p>
          PrismLab · Independent LFM3 research playground · Not affiliated with Liquid AI
        </p>
        <p style={{ marginTop: 6, fontSize: 12 }}>
          <a href="#research">Research Desk</a>{' · '}
          <a href="https://github.com/prataykarali/Flowstate" target="_blank" rel="noreferrer">GitHub / Research ↗</a>
        </p>
      </footer>
    </div>
  );
};
