import React from 'react';
import { MascotStage } from '../components/mascots/MascotStage.tsx';

interface HomeProps {
  onNavigateToPlayground: (modelId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigateToPlayground }) => (
  <div className="page-home">
    <div className="world-intro">
      <div>
        <p className="eyebrow">The living model observatory</p>
        <h1 className="page-title">Meet the Minds of <span>PrismLab</span></h1>
        <p className="page-description">Meet six specialized model pathways. Select a companion to explore its capabilities, architecture, and preserved research evidence.</p>
      </div>
      <div className="world-intro-note">Choose a character to explore its documented capabilities.</div>
    </div>
    <MascotStage onNavigateToPlayground={onNavigateToPlayground} />
  </div>
);
