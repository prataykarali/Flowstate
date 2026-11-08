import React from 'react';
import { useHashRoute, type RouteId, ROUTES } from './routes.ts';
import { AppShell } from '../components/AppShell.tsx';
import { CanonicalModelId, MODELS } from '../data/models.ts';
import { ExperienceProvider, useExperience } from './ExperienceContext.tsx';
import { LEAGUE_CHANGE_EVENT, type LeagueEvent } from '../lib/league.ts';

// Pages
import { Home } from '../pages/Home.tsx';
import { Playground } from '../pages/Playground.tsx';
import { Chat } from '../pages/Chat.tsx';
import { Trivia } from '../pages/Trivia.tsx';
import { Arcade } from '../pages/Arcade.tsx';
import { Research } from '../pages/Research.tsx';
import { Architecture } from '../pages/Architecture.tsx';
import { Championship } from '../pages/Championship.tsx';
import { Settings } from '../pages/Settings.tsx';

const AppContent: React.FC = () => {
  const [currentRoute, navigate] = useHashRoute();
  const { setSelectedModelId } = useExperience();
  const [leagueAward, setLeagueAward] = React.useState<LeagueEvent | null>(null);
  const [visitedRoutes, setVisitedRoutes] = React.useState<Set<RouteId>>(() => new Set([currentRoute]));

  React.useEffect(() => {
    setVisitedRoutes(prev => {
      if (prev.has(currentRoute)) return prev;
      const next = new Set(prev);
      next.add(currentRoute);
      return next;
    });
  }, [currentRoute]);

  React.useEffect(() => {
    const onAward = (event: Event) => setLeagueAward((event as CustomEvent<LeagueEvent>).detail);
    window.addEventListener(LEAGUE_CHANGE_EVENT, onAward);
    return () => window.removeEventListener(LEAGUE_CHANGE_EVENT, onAward);
  }, []);
  React.useEffect(() => {
    if (!leagueAward) return;
    const timer = window.setTimeout(() => setLeagueAward(null), 4200);
    return () => window.clearTimeout(timer);
  }, [leagueAward]);

  const handleNavigateToPlayground = (modelId: string) => {
    setSelectedModelId(modelId as CanonicalModelId);
    navigate('playground');
  };

  const renderPageRoute = (route: RouteId) => {
    switch (route) {
      case 'world':
        return <Home onNavigateToPlayground={handleNavigateToPlayground} />;
      case 'playground':
        return <Playground />;
      case 'chat':
        return <Chat />;
      case 'trivia':
        return <Trivia />;
      case 'arcade':
        return <Arcade />;
      case 'research':
        return <Research />;
      case 'architecture':
        return <Architecture />;
      case 'championship':
        return <Championship />;
      case 'settings':
        return <Settings />;
      default:
        return <Home onNavigateToPlayground={handleNavigateToPlayground} />;
    }
  };

  const KEEP_ALIVE_ROUTES = React.useMemo(() => new Set<RouteId>(['chat', 'trivia']), []);

  return (
    <AppShell currentRoute={currentRoute} onNavigate={navigate}>
      {ROUTES.map(routeMeta => {
        const route = routeMeta.id;
        const isCurrent = currentRoute === route;
        const shouldKeepAlive = KEEP_ALIVE_ROUTES.has(route) && visitedRoutes.has(route);
        if (!isCurrent && !shouldKeepAlive) return null;
        return (
          <div
            key={route}
            className={`prism-page-view prism-page-${route}`}
            style={{ display: isCurrent ? 'contents' : 'none' }}
            aria-hidden={!isCurrent}
          >
            {renderPageRoute(route)}
          </div>
        );
      })}
      {leagueAward && currentRoute !== 'championship' && <div className="league-global-toast" role="status">✨ +{leagueAward.pointsEarned} League points for {MODELS[leagueAward.modelId].characterName}</div>}
    </AppShell>
  );
};

export const App: React.FC = () => <ExperienceProvider><AppContent /></ExperienceProvider>;
