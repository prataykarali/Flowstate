import React from 'react';
import { MODELS, MODEL_LIST } from '../../data/models.ts';
import { Mascot } from './Mascot.tsx';
import { ModelCard } from '../ModelCard.tsx';
import { useExperience } from '../../app/ExperienceContext.tsx';
import { SceneBackground } from '../environment/SceneBackground.tsx';

interface MascotStageProps {
  onNavigateToPlayground?: (modelId: string) => void;
}

export const MascotStage: React.FC<MascotStageProps> = ({ onNavigateToPlayground }) => {
  const { selectedModelId, setSelectedModelId } = useExperience();
  const selectedModel = MODELS[selectedModelId];

  return (
    <section className="mascot-stage" aria-label="Meet the six PrismLab models">
      <div className="world-scene">
        <SceneBackground route="world" variant="world" />
        <div className="world-scene-shade" aria-hidden="true" />
        <div className="mobile-terraces" aria-hidden="true"><span /><span /><span /></div>
        <div className="world-scene-kicker">THE OBSERVATORY <span>·</span> SIX MODEL COMPANIONS</div>
        <div className="mascot-grid">
          {MODEL_LIST.map((model) => (
            <Mascot key={model.id} model={model} isSelected={selectedModel.id === model.id} onSelect={(choice) => setSelectedModelId(choice.id)} />
          ))}
        </div>
        <div className="world-scene-caption">Tap a companion to discover its research story <span aria-hidden="true">✦</span></div>
      </div>
      <div className="world-spotlight" aria-live="polite">
        <div className="world-spotlight-copy">
          <p className="eyebrow">In the spotlight <span aria-hidden="true">✦</span> {selectedModel.characterName}</p>
          <h2>{selectedModel.name}</h2>
          <p>{selectedModel.specialty}</p>
          <div className="world-spotlight-tags">
            <span>In: {selectedModel.inputModalities.join(' · ')}</span>
            <span>Out: {selectedModel.outputModalities.join(' · ')}</span>
          </div>
          <div className="world-spotlight-actions">
            {onNavigateToPlayground && <button className="btn btn-primary" onClick={() => onNavigateToPlayground(selectedModel.id)}>Explore model <span aria-hidden="true">↗</span></button>}
            <a className="btn btn-secondary" href="#research">View research <span aria-hidden="true">↗</span></a>
          </div>
          <p className="world-spotlight-note">Playground examples use recorded research replays where live inference is unavailable.</p>
        </div>
        <details className="world-spotlight-details">
          <summary>Architecture &amp; benchmark details <span aria-hidden="true">⌄</span></summary>
          <ModelCard model={selectedModel} isSelected showDetails />
        </details>
      </div>
    </section>
  );
};
