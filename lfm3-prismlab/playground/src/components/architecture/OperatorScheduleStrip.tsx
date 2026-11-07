import React from 'react';
import { type ArchitectureLayerItem } from '../../data/architecture/index.ts';

interface OperatorScheduleStripProps {
  schedule: ArchitectureLayerItem[];
  selectedLayerIndex: number | null;
  onSelectLayer: (layer: ArchitectureLayerItem) => void;
}

export const OperatorScheduleStrip: React.FC<OperatorScheduleStripProps> = ({
  schedule,
  selectedLayerIndex,
  onSelectLayer
}) => {
  const convCount = schedule.filter(l => l.type === 'conv').length;
  const fullAttnCount = schedule.filter(l => l.type === 'full_attention').length;
  const slidingAttnCount = schedule.filter(l => l.type === 'sliding_attention').length;

  return (
    <div className="operator-schedule-strip" aria-label="Text backbone 24-layer operator schedule">
      <div className="schedule-header">
        <div className="schedule-title-group">
          <span className="schedule-tag">Backbone Schedule</span>
          <h4>Recorded 24-Layer Operator Sequence</h4>
          <span className="schedule-counts-badge">
            {convCount} Conv (GatedDeltaNet) · {fullAttnCount} Full Attention · {slidingAttnCount} Sliding Window
          </span>
        </div>
        <span className="schedule-hint">Click any layer to inspect verified configuration</span>
      </div>

      <div className="schedule-track-scroll">
        <div className="schedule-track" role="list">
          {schedule.map(layer => {
            const isSelected = selectedLayerIndex === layer.index;
            const typeLabel =
              layer.type === 'conv' ? 'Conv' : layer.type === 'full_attention' ? 'Full Attn' : 'Sliding';

            return (
              <button
                key={layer.index}
                type="button"
                className={`schedule-layer-block ${isSelected ? 'is-selected' : ''}`}
                style={{
                  '--layer-color': layer.color
                } as React.CSSProperties}
                onClick={() => onSelectLayer(layer)}
                role="listitem"
                aria-pressed={isSelected}
                aria-label={`Layer ${layer.index}: ${layer.name}`}
              >
                <span className="layer-num">L{layer.index}</span>
                <span className="layer-type">{typeLabel}</span>
                <div className="layer-pip" style={{ background: layer.color }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
