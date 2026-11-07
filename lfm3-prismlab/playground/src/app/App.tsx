import React from 'react';
import { useHashRoute } from './routes.ts';
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

  const renderPage = () => {
    switch (currentRoute) {
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

  return (
    <AppShell currentRoute={currentRoute} onNavigate={navigate}>
      {renderPage()}
      {leagueAward && currentRoute !== 'championship' && <div className="league-global-toast" role="status">✨ +{leagueAward.pointsEarned} League points for {MODELS[leagueAward.modelId].characterName}</div>}
    </AppShell>
  );
};

export const App: React.FC = () => <ExperienceProvider><AppContent /></ExperienceProvider>;
