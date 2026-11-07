import React from 'react';
import { MODEL_LIST, type CanonicalModelId, type ModelMeta } from '../../data/models.ts';
import { MascotAvatar } from '../mascots/MascotAvatar.tsx';
import {
  IconAuto,
  IconManual,
  IconReplay,
  IconLive,
  IconRefresh
} from './Icons.tsx';

interface MascotSelectorStripProps {
  selectedModelId: CanonicalModelId;
  predictedModelId: CanonicalModelId;
  routingMode: 'auto' | 'manual';
  executionMode: 'recorded' | 'live';
  gatewayReady: boolean;
  isRefreshingGateway?: boolean;
  disabled?: boolean;
  onSelectModel: (id: CanonicalModelId) => void;
  onToggleRoutingMode: (mode: 'auto' | 'manual') => void;
  onToggleExecutionMode: (mode: 'recorded' | 'live') => void;
  onRefreshGateway: () => void;
}

export const MascotSelectorStrip: React.FC<MascotSelectorStripProps> = ({
  selectedModelId,
  predictedModelId,
  routingMode,
  executionMode,
  gatewayReady,
  disabled = false,
  isRefreshingGateway = false,
  onSelectModel,
  onToggleRoutingMode,
  onToggleExecutionMode,
  onRefreshGateway
}) => {
  const activeTargetId = routingMode === 'auto' ? predictedModelId : selectedModelId;

  return (
    <header className="play-top-command-bar" aria-label="Playground command bar and companion strip">
      {/* Upper Control Bar */}
      <div className="play-command-row">
        {/* Title and Badge */}
        <div className="play-title-group">
          <div className="play-brand-badge">
            <span className="brand-dot" />
            <span className="brand-tag">PRISMLAB / AI PLAYGROUND</span>
          </div>
          <h1 className="play-heading">Explore the six specialists</h1>
        </div>

        {/* Global Controls: Routing Mode, Execution Mode, Tools */}
        <div className="play-controls-group">
          {/* Routing Mode Toggle: Auto Router vs Choose Model */}
          <div className="segmented-control" role="group" aria-label="Routing mode">
            <button
              type="button"
              className={`segmented-btn ${routingMode === 'auto' ? 'is-active' : ''}`}
              aria-pressed={routingMode === 'auto'}
              disabled={disabled} onClick={() => onToggleRoutingMode('auto')}
              title="Deterministic routing engine assigns model dynamically by task and attached media"
            >
              <IconAuto size={15} />
              <span>Smart Auto</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${routingMode === 'manual' ? 'is-active' : ''}`}
              aria-pressed={routingMode === 'manual'}
              disabled={disabled} onClick={() => onToggleRoutingMode('manual')}
              title="Lock interaction to a specific chosen companion mascot"
            >
              <IconManual size={15} />
              <span>Choose Model</span>
            </button>
          </div>

          {/* Execution Mode Toggle: Recorded Replay vs Local Live */}
          <div className="segmented-control" role="group" aria-label="Execution mode">
            <button
              type="button"
              className={`segmented-btn ${executionMode === 'recorded' ? 'is-active' : ''}`}
              aria-pressed={executionMode === 'recorded'}
              disabled={disabled} onClick={() => onToggleExecutionMode('recorded')}
              title="Inspect canonical benchmark trace replays"
            >
              <IconReplay size={15} />
              <span>Prerecorded Replay</span>
            </button>
            <button
              type="button"
              className={`segmented-btn ${executionMode === 'live' ? 'is-active' : ''}`}
              aria-pressed={executionMode === 'live'}
              disabled={disabled || (!gatewayReady && executionMode !== 'live')}
              onClick={() => onToggleExecutionMode('live')}
              title={gatewayReady ? 'Dispatch inference via local P6 FastAPI gateway' : 'Local Live requires the local inference gateway. Recorded Replay is available here.'}
            >
              <IconLive size={15} />
              <span>Local Live</span>
              <span className={`status-dot ${gatewayReady ? 'is-online' : 'is-standby'}`} />
            </button>
          </div>

          {/* Gateway Status Refresh (if live mode) */}
          {executionMode === 'live' && (
            <button
              type="button"
              className={`btn-icon-subtle ${isRefreshingGateway ? 'is-spinning' : ''}`}
              onClick={onRefreshGateway}
              title="Refresh local gateway runtime status"
              aria-label="Refresh gateway status"
            >
              <IconRefresh size={15} />
            </button>
          )}

        </div>
      </div>

      {/* Six Mascot Companion Strip */}
      <nav className="play-roster-strip" aria-label="Six companion mascots">
        <div className="play-roster-list" role="tablist">
          {MODEL_LIST.map((m: ModelMeta) => {
            const isSelected = m.id === selectedModelId;
            const isAutoTarget = m.id === predictedModelId && routingMode === 'auto';
            const isActive = m.id === activeTargetId;

            return (
              <button
                key={m.id}
                disabled={disabled}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`mascot-tile ${isActive ? 'is-active' : ''} ${isAutoTarget ? 'is-auto-target' : ''}`}
                style={{ '--model-color': m.themeColor } as React.CSSProperties}
                onClick={() => {
                  onSelectModel(m.id);
                  if (routingMode === 'auto') {
                    // Clicking a specific model in Auto switches to Manual to honor user intent
                    onToggleRoutingMode('manual');
                  }
                }}
              >
                <div className="mascot-tile-avatar">
                  <MascotAvatar model={m} />
                  {isActive && <span className="mascot-active-indicator" />}
                </div>

                <div className="mascot-tile-meta">
                  <div className="mascot-tile-name-row">
                    <strong className="mascot-name">{m.characterName}</strong>
                    {isAutoTarget && (
                      <span className="auto-pill">Auto</span>
                    )}
                    {isSelected && routingMode === 'manual' && (
                      <span className="locked-pill">Locked</span>
                    )}
                  </div>
                  <span className="mascot-model-badge">{m.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};