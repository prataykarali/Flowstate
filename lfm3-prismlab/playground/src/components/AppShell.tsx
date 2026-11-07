import React from 'react';
import { RouteId } from '../app/routes.ts';
import { Navigation } from './Navigation.tsx';
import { SceneBackground } from './environment/SceneBackground.tsx';

interface AppShellProps {
  currentRoute: RouteId;
  onNavigate: (route: RouteId) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentRoute, onNavigate, children }) => {
  return (
    <div className="app-shell">
      {/* Public Beta Notice Banner */}
      <div
        className="beta-notice-banner"
        role="region"
        aria-label="Beta Notice"
        style={{
          background: 'rgba(192, 132, 252, 0.12)',
          borderBottom: '1px solid rgba(192, 132, 252, 0.25)',
          padding: '6px 16px',
          fontSize: '12px',
          textAlign: 'center',
          color: 'var(--text-main)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span style={{ color: 'var(--accent-lilac)', fontWeight: 600 }}>✦ Public Research Beta:</span>
        <span style={{ color: 'var(--text-dim)' }}>
          PrismLab is an experimental AI research playground. Inference runs on limited CPU hardware, so responses may be queued and service may occasionally be unavailable.
        </span>
      </div>

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

        {/* System Status Indicator */}
        <div className="header-status">
          <span style={{ color: 'var(--accent-mint)' }}>●</span>
          <span style={{ color: 'var(--text-muted)' }}>6 models registered</span>
        </div>
      </header>

      {/* Main Page Content */}
      <main className={`app-main ${currentRoute === 'world' ? '' : 'scene-route'} ${currentRoute === 'chat' ? 'chat-main' : ''}`}>
        {currentRoute !== 'world' && currentRoute !== 'chat' && <SceneBackground route={currentRoute} />}
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '24px 20px',
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--text-dim)',
          background: 'rgba(8, 7, 17, 0.95)'
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
