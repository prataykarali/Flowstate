import React from 'react';
import { type CanonicalArchitectureModelId, ARCHITECTURE_DATA } from '../../data/architecture/index.ts';

interface ArchitectureHeaderProps {
  view: 'architecture' | 'pipeline';
  onSelectView: (view: 'architecture' | 'pipeline') => void;
  isComparisonMode: boolean;
  onToggleComparison: () => void;
  activeModelId: CanonicalArchitectureModelId;
  activeModalityFilter: string;
  onSelectModalityFilter: (filter: string) => void;
  isPlayingTrace: boolean;
  onToggleTrace: () => void;
  onResetZoom: () => void;
  onFitZoom: () => void;
}

export const ArchitectureHeader: React.FC<ArchitectureHeaderProps> = ({
  view,
  onSelectView,
  isComparisonMode,
  onToggleComparison,
  activeModelId,
  activeModalityFilter,
  onSelectModalityFilter,
  isPlayingTrace,
  onToggleTrace,
  onResetZoom,
  onFitZoom
}) => {
  const model = ARCHITECTURE_DATA.models[activeModelId];
  const availableModalities = ['all', ...model.supportedModalities];
  if (model.id.startsWith('d1') && !availableModalities.includes('decision')) {
    availableModalities.push('decision');
  }

  return (
    <header className="arch-obs-header" aria-label="Architecture Observatory Header">
      <div className="arch-obs-header-row">
        {/* Title & Badge */}
        <div className="arch-obs-title-group">
          <div className="arch-obs-badge">
            <span className="arch-obs-dot" aria-hidden="true" />
            <span>NEURAL ARCHITECTURE STUDIO · P7 SOURCE-PINNED</span>
          </div>
          <h1 className="arch-obs-title">Six-Model Interactive Architecture Observatory</h1>
          <p className="arch-obs-subtitle">
            Source-grounded structural maps, verified component configurations, and operator schedules for Liquid Foundation Models.
          </p>
        </div>

        {/* View Switcher: Architecture vs Pipeline */}
        <div className="arch-view-switcher" role="tablist" aria-label="Observatory views">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'architecture'}
            className={`arch-switch-btn ${view === 'architecture' ? 'is-active' : ''}`}
            onClick={() => onSelectView('architecture')}
          >
            🏛️ Architecture View
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'pipeline'}
            className={`arch-switch-btn ${view === 'pipeline' ? 'is-active' : ''}`}
            onClick={() => onSelectView('pipeline')}
          >
            ⚡ Pipeline View (Orchestration)
          </button>
        </div>
      </div>

      {view === 'architecture' && (
        <div className="arch-obs-toolbar">
          {/* Modality Pathways Filter Chips */}
          <div className="arch-toolbar-group">
            <span className="toolbar-label">Pathway Filter:</span>
            <div className="toolbar-chips-row">
              {availableModalities.map(mod => (
                <button
                  key={mod}
                  type="button"
                  className={`toolbar-chip ${activeModalityFilter === mod ? 'is-active' : ''}`}
                  onClick={() => onSelectModalityFilter(mod)}
                >
                  {mod.charAt(0).toUpperCase() + mod.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons: Conceptual Animation, Zoom Controls, Comparison */}
          <div className="arch-toolbar-actions">
            <button
              type="button"
              className={`toolbar-action-btn ${isPlayingTrace ? 'is-playing' : ''}`}
              onClick={onToggleTrace}
              title="Toggle animated conceptual data flow along active pathways"
            >
              {isPlayingTrace ? '■ Pause Flow' : '▶ Animate Flow'}
            </button>

            <button
              type="button"
              className={`toolbar-action-btn ${isComparisonMode ? 'is-active' : ''}`}
              onClick={onToggleComparison}
              title="Compare two models side-by-side"
            >
              ⚖️ {isComparisonMode ? 'Exit Comparison' : 'Compare Models'}
            </button>

            <div className="zoom-controls-cluster">
              <button
                type="button"
                className="zoom-btn"
                onClick={onFitZoom}
                title="Fit diagram to viewport"
              >
                Fit
              </button>
              <button
                type="button"
                className="zoom-btn"
                onClick={onResetZoom}
                title="Reset zoom to 100%"
              >
                100%
              </button>
            </div>

            <a
              href="/assets/research/PrismLabs_Architecture_Extended_P7_NAV_v2.html"
              target="_blank"
              rel="noreferrer"
              className="toolbar-action-btn"
              style={{ color: '#ffd766', borderColor: 'rgba(255, 215, 102, 0.4)' }}
            >
              Full Explorer ↗
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
