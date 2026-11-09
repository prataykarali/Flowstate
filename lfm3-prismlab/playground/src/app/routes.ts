import { useState, useEffect } from 'react';

export type RouteId =
  | 'world'
  | 'playground'
  | 'chat'
  | 'trivia'
  | 'arcade'
  | 'research'
  | 'architecture'
  | 'championship'
  | 'settings';

export interface RouteMeta {
  id: RouteId;
  label: string;
  shortLabel?: string;
  icon: string;
  description: string;
}

export const ROUTES: RouteMeta[] = [
  { id: 'world', label: 'Model World', shortLabel: 'World', icon: '🌌', description: 'Interactive landing page featuring all six living mascots' },
  { id: 'playground', label: 'AI Playground', shortLabel: 'Playground', icon: '⚡', description: 'Draft requests, preview routes, and inspect recorded runs' },
  { id: 'chat', label: 'Chat', shortLabel: 'Chat', icon: '💬', description: 'Talk with a local model and inspect its actual route' },
  { id: 'trivia', label: 'Trivia Arena', shortLabel: 'Trivia', icon: '🎯', description: 'Architecture & evaluation quiz challenges' },
  { id: 'arcade', label: 'Arcade', shortLabel: 'Arcade', icon: '🕹️', description: 'Mini-games & experimental relay previews' },
  { id: 'research', label: 'Research Desk', shortLabel: 'Research', icon: '📊', description: 'Verified benchmarks and empirical experimental results' },
  { id: 'architecture', label: 'Architecture', shortLabel: 'Architecture', icon: '🏛️', description: 'Interactive orchestration graph and verified P7 model diagrams' },
  { id: 'championship', label: 'Championship', shortLabel: 'Championship', icon: '🏆', description: 'Live Trivia model standings and arena' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: '⚙️', description: 'Replay run logs, preferences and motion controls' }
];

export function useHashRoute(): [RouteId, (newRoute: RouteId) => void] {
  const getRouteFromHash = (): RouteId => {
    const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    const match = ROUTES.find((r) => r.id === raw);
    return match ? match.id : 'world';
  };

  const [currentRoute, setCurrentRoute] = useState<RouteId>(getRouteFromHash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(getRouteFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newRoute: RouteId) => {
    window.location.hash = `#${newRoute}`;
    setCurrentRoute(newRoute);
  };

  return [currentRoute, navigate];
}
