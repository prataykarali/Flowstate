import React, { useRef } from 'react';
import { RouteId, ROUTES, RouteMeta } from '../app/routes.ts';
import { useInferenceLock } from '../lib/inferenceLock.ts';

interface NavigationProps {
  currentRoute: RouteId;
  onNavigate: (route: RouteId) => void;
}

const iconPaths: Record<RouteId, React.ReactNode> = {
  world: <><circle cx="12" cy="12" r="7"/><path d="M2 12c3-4 17-4 20 0M5 18c4-2 10-2 14 0"/></>,
  playground: <><path d="M8 3v5l-4 8a3 3 0 0 0 3 4h10a3 3 0 0 0 3-4l-4-8V3M7 3h10M7 14h10"/></>,
  chat: <><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h6"/></>,
  trivia: <><path d="M9 9a3 3 0 1 1 5 2c-1.4 1-2 1.6-2 3M12 18h.01"/><circle cx="12" cy="12" r="9"/></>,
  arcade: <><rect x="3" y="7" width="18" height="12" rx="4"/><path d="M7 13h5M9.5 10.5v5M16 12h.01M18 15h.01"/></>,
  research: <><path d="M5 3h10l4 4v14H5zM15 3v5h4M8 12h8M8 16h6"/></>,
  architecture: <><path d="M12 2 3 7l9 5 9-5-9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/></>,
  championship: <><path d="M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H4v3a4 4 0 0 0 4 4M17 5h3v3a4 4 0 0 1-4 4M12 15v4M8 21h8"/></>,
  settings: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/></>
};

const RouteIcon: React.FC<{ id: RouteId }> = ({ id }) => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {iconPaths[id]}
  </svg>
);

export const Navigation: React.FC<NavigationProps> = ({ currentRoute, onNavigate }) => {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const lock = useInferenceLock();
  const primary = ROUTES.slice(0, 4);
  const secondary = ROUTES.slice(4);

  const link = (route: RouteMeta) => (
    <a
      key={route.id}
      href={`#${route.id}`}
      className={`nav-link ${currentRoute === route.id ? 'active' : ''}`}
      aria-current={currentRoute === route.id ? 'page' : undefined}
      title={lock.busy ? `View ${route.label} (AI generation active: ${lock.modelId || 'busy'})` : undefined}
      onClick={(event) => {
        event.preventDefault();
        menuRef.current?.removeAttribute('open');
        onNavigate(route.id);
      }}
    >
      <RouteIcon id={route.id} />
      <span className="nav-label-full">{route.label}</span>
      <span className="nav-label-short">{route.shortLabel || route.label}</span>
      {lock.busy && (route.id === 'chat' || route.id === 'trivia' || route.id === 'playground') && lock.task && (
        <span className="nav-busy-dot" title="Active AI task" aria-label="AI task in progress" />
      )}
    </a>
  );

  return (
    <nav className="nav-container" aria-label="Main navigation">
      {primary.map(link)}
      <details className="nav-more" ref={menuRef}>
        <summary className={`nav-link ${secondary.some((route) => route.id === currentRoute) ? 'active' : ''}`}>
          <span className="nav-label-full">Explore <span aria-hidden="true">⌄</span></span>
          <span className="nav-label-short">More <span aria-hidden="true">⌄</span></span>
        </summary>
        <div className="nav-more-menu">{secondary.map(link)}</div>
      </details>
    </nav>
  );
};
