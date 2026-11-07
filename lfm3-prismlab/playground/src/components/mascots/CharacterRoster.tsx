import React from 'react';
import { MODEL_LIST, MODELS } from '../../data/models.ts';
import { useExperience } from '../../app/ExperienceContext.tsx';
import { Mascot } from './Mascot.tsx';

interface CharacterRosterProps { title: string; description: string; compact?: boolean; stage?: 'arcade' | 'architecture'; }

export const CharacterRoster: React.FC<CharacterRosterProps> = ({ title, description, compact = false, stage }) => {
  const { selectedModelId, setSelectedModelId } = useExperience();
  const selected = MODELS[selectedModelId];
  return <section className={`glass-panel character-roster ${compact ? 'character-roster--compact' : ''} ${stage ? `character-roster--${stage}` : ''}`} aria-label={title}>
    <div className="section-heading"><div><p className="eyebrow">Six model companions</p><h2>{title}</h2><p className="supporting-copy">{description}</p></div><span className="subtle-badge">Choose a character</span></div>
    <div className="character-roster-grid">{MODEL_LIST.map((model) => <Mascot key={model.id} model={model} isSelected={model.id === selectedModelId} onSelect={(choice) => setSelectedModelId(choice.id)} />)}</div>
    <div className="character-roster-spotlight" aria-live="polite"><span style={{ background: selected.themeColor }} /><div><strong>{selected.characterName} · {selected.name}</strong><p>{selected.specialty}</p></div></div>
  </section>;
};
