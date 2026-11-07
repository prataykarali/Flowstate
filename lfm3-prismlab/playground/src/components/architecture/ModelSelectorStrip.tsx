import React from 'react';
import { MODEL_LIST, MODELS } from '../../data/models.ts';
import { MascotAvatar } from '../mascots/MascotAvatar.tsx';
import { ARCHITECTURE_DATA, type CanonicalArchitectureModelId } from '../../data/architecture/index.ts';

interface ModelSelectorStripProps {
  selectedModelId: CanonicalArchitectureModelId;
  onSelectModel: (id: CanonicalArchitectureModelId) => void;
  isComparisonMode?: boolean;
  comparedModelId?: CanonicalArchitectureModelId;
  onSelectComparedModel?: (id: CanonicalArchitectureModelId) => void;
}

export const ModelSelectorStrip: React.FC<ModelSelectorStripProps> = ({
  selectedModelId,
  onSelectModel,
  isComparisonMode = false,
  comparedModelId,
  onSelectComparedModel
}) => {
  return (
    <nav className="arch-model-strip" aria-label="Select neural model architecture">
      <div className="arch-model-strip-inner">
        {MODEL_LIST.map(item => {
          const archModel = ARCHITECTURE_DATA.models[item.id as CanonicalArchitectureModelId];
          const isSelected = selectedModelId === item.id;
          const isCompared = isComparisonMode && comparedModelId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`arch-model-btn ${isSelected ? 'is-selected' : ''} ${isCompared ? 'is-compared' : ''}`}
              onClick={() => {
                if (isComparisonMode && onSelectComparedModel && isSelected) {
                  // If clicking the primary in compare mode, do nothing or cycle
                  return;
                }
                if (isComparisonMode && onSelectComparedModel && !isSelected) {
                  onSelectComparedModel(item.id as CanonicalArchitectureModelId);
                } else {
                  onSelectModel(item.id as CanonicalArchitectureModelId);
                }
              }}
              style={{
                '--model-accent': archModel.themeColor
              } as React.CSSProperties}
              aria-pressed={isSelected || isCompared}
              aria-label={`${item.name} (${item.characterName}), ${archModel.totalLayers} layers`}
            >
              <div className="arch-model-btn-avatar">
                <MascotAvatar model={MODELS[item.id]} />
                {isSelected && <span className="arch-select-dot" title="Primary model" />}
                {isCompared && <span className="arch-compare-dot" title="Comparison model" />}
              </div>

              <div className="arch-model-btn-meta">
                <div className="arch-model-btn-header">
                  <span className="arch-btn-name">{item.name}</span>
                  <span className="arch-btn-layers">{archModel.totalLayers}L</span>
                </div>
                <div className="arch-model-btn-sub">
                  <span className="arch-btn-slug">{item.characterName}</span>
                  <span className="arch-btn-role">{item.specialty}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
