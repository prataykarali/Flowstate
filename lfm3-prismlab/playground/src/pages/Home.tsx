import React from 'react';
import { MascotStage } from '../components/mascots/MascotStage.tsx';
import { WorldTelemetrySection } from '../components/world/WorldTelemetrySection.tsx';

interface HomeProps {
  onNavigateToPlayground: (modelId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigateToPlayground }) => (
  <div className="page-home">
    <div className="world-intro">
      <div>
        <p className="eyebrow">Public Research Beta · Six Specialized Model Pathways</p>
        <h1 className="page-title">Meet the Minds of <span>PrismLab</span></h1>
        <p className="page-description">
          An open experimental playground for genuine Liquid AI models, hosted entirely on CPU hardware. Select a companion to explore its capabilities, architecture, and live multimodal inference.
        </p>
      </div>
      <div className="world-intro-note">
        Choose a character below to explore its live playground and documented capabilities.
      </div>
    </div>
    <MascotStage onNavigateToPlayground={onNavigateToPlayground} />
    <WorldTelemetrySection onNavigateToPlayground={onNavigateToPlayground} />
  </div>
);
