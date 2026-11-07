import React from 'react';
import {
  type CanonicalArchitectureModelId,
  ARCHITECTURE_DATA
} from '../../data/architecture/index.ts';
import { MODEL_LIST, MODELS } from '../../data/models.ts';
import { MascotAvatar } from '../mascots/MascotAvatar.tsx';

interface ArchitectureComparisonViewProps {
  modelAId: CanonicalArchitectureModelId;
  modelBId: CanonicalArchitectureModelId;
  onSelectModelA: (id: CanonicalArchitectureModelId) => void;
  onSelectModelB: (id: CanonicalArchitectureModelId) => void;
  onClose: () => void;
}

export const ArchitectureComparisonView: React.FC<ArchitectureComparisonViewProps> = ({
  modelAId,
  modelBId,
  onSelectModelA,
  onSelectModelB,
  onClose
}) => {
  const modelA = ARCHITECTURE_DATA.models[modelAId];
  const modelB = ARCHITECTURE_DATA.models[modelBId];

  // Identify shared vs unique components
  const groupsA = new Set(modelA.components.map(c => c.group));
  const groupsB = new Set(modelB.components.map(c => c.group));

  const allGroups = [
    { key: 'input', label: 'Input Modalities' },
    { key: 'vision_encoder', label: 'Vision Encoder' },
    { key: 'audio_encoder', label: 'Audio Encoder' },
    { key: 'fusion', label: 'Multimodal Fusion' },
    { key: 'text_backbone', label: 'Text Backbone (24 Layers)' },
    { key: 'speech_decoder', label: 'Depthformer & Speech Codec' },
    { key: 'decision_head', label: 'SystemOne Decision Interface' },
    { key: 'output', label: 'Output Generation' }
  ];

  return (
    <div className="arch-comparison-overlay" role="dialog" aria-modal="true" aria-label="Architecture Comparison">
      <div className="arch-comparison-dialog">
        {/* Header */}
        <div className="comparison-head">
          <div>
            <span className="eyebrow" style={{ color: '#75efdc' }}>Comparative Analysis</span>
            <h2>Six-Model Architectural Comparison</h2>
            <p className="comparison-subtitle">
              Comparing structural blueprints, configured layer topologies, and input/output contracts.
            </p>
          </div>
          <button
            type="button"
            className="s4-winner-close-btn"
            onClick={onClose}
            aria-label="Close comparison view"
          >
            ×
          </button>
        </div>

        {/* Model Selectors Duo */}
        <div className="comparison-selectors-row">
          <div className="model-selector-card" style={{ borderColor: modelA.themeColor }}>
            <span className="card-role-label">Model A (Reference)</span>
            <div className="selector-avatar-row">
              <div className="selector-avatar-box">
                <MascotAvatar model={MODELS[modelA.id]} />
              </div>
              <div className="selector-dropdown-wrapper">
                <select
                  value={modelAId}
                  onChange={e => onSelectModelA(e.target.value as CanonicalArchitectureModelId)}
                  className="model-pick-select"
                  aria-label="Select Model A"
                >
                  {MODEL_LIST.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.characterName})
                    </option>
                  ))}
                </select>
                <span className="model-total-layers">{modelA.totalLayers} Total Layers</span>
              </div>
            </div>
          </div>

          <div className="comparison-vs-badge">VS</div>

          <div className="model-selector-card" style={{ borderColor: modelB.themeColor }}>
            <span className="card-role-label">Model B (Candidate)</span>
            <div className="selector-avatar-row">
              <div className="selector-avatar-box">
                <MascotAvatar model={MODELS[modelB.id]} />
              </div>
              <div className="selector-dropdown-wrapper">
                <select
                  value={modelBId}
                  onChange={e => onSelectModelB(e.target.value as CanonicalArchitectureModelId)}
                  className="model-pick-select"
                  aria-label="Select Model B"
                >
                  {MODEL_LIST.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.characterName})
                    </option>
                  ))}
                </select>
                <span className="model-total-layers">{modelB.totalLayers} Total Layers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Structural Metrics Comparison Table */}
        <div className="comparison-table-wrapper">
          <table className="comparison-metrics-table" role="table">
            <thead>
              <tr>
                <th>Architectural Dimension</th>
                <th>{modelA.name}</th>
                <th>{modelB.name}</th>
                <th>Structural Delta</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Target Architecture</strong></td>
                <td><code>{modelA.architecture}</code></td>
                <td><code>{modelB.architecture}</code></td>
                <td>
                  {modelA.architecture === modelB.architecture ? (
                    <span className="badge-shared">Identical Type</span>
                  ) : (
                    <span className="badge-diff">Distinct Type</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Total Configured Layers</strong></td>
                <td><strong className="text-mint">{modelA.totalLayers}</strong></td>
                <td><strong className="text-mint">{modelB.totalLayers}</strong></td>
                <td>
                  {modelA.totalLayers === modelB.totalLayers ? (
                    <span className="badge-shared">Equal Layers</span>
                  ) : (
                    <span className="badge-diff">
                      {modelB.totalLayers > modelA.totalLayers ? `+${modelB.totalLayers - modelA.totalLayers}` : `${modelB.totalLayers - modelA.totalLayers}`} Layers
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Text Backbone (24L)</strong></td>
                <td>24 layers (13 conv, 6 full, 5 slide)</td>
                <td>24 layers (13 conv, 6 full, 5 slide)</td>
                <td><span className="badge-shared">Common Topology</span></td>
              </tr>
              <tr>
                <td><strong>Vision Encoder</strong></td>
                <td>{modelA.componentCounts.visionLayers > 0 ? `${modelA.componentCounts.visionLayers} Layers (8c/6f)` : 'None'}</td>
                <td>{modelB.componentCounts.visionLayers > 0 ? `${modelB.componentCounts.visionLayers} Layers (8c/6f)` : 'None'}</td>
                <td>
                  {modelA.componentCounts.visionLayers === modelB.componentCounts.visionLayers ? (
                    <span className="badge-shared">Equal</span>
                  ) : (
                    <span className="badge-diff">Encoder Disparity</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Audio Encoder</strong></td>
                <td>{modelA.componentCounts.audioLayers > 0 ? `${modelA.componentCounts.audioLayers} Layers (10c/7f)` : 'None'}</td>
                <td>{modelB.componentCounts.audioLayers > 0 ? `${modelB.componentCounts.audioLayers} Layers (10c/7f)` : 'None'}</td>
                <td>
                  {modelA.componentCounts.audioLayers === modelB.componentCounts.audioLayers ? (
                    <span className="badge-shared">Equal</span>
                  ) : (
                    <span className="badge-diff">Encoder Disparity</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Depthformer (Speech)</strong></td>
                <td>{modelA.componentCounts.depthformerLayers > 0 ? `${modelA.componentCounts.depthformerLayers} Layers` : 'None'}</td>
                <td>{modelB.componentCounts.depthformerLayers > 0 ? `${modelB.componentCounts.depthformerLayers} Layers` : 'None'}</td>
                <td>
                  {modelA.componentCounts.depthformerLayers === modelB.componentCounts.depthformerLayers ? (
                    <span className="badge-shared">Equal</span>
                  ) : (
                    <span className="badge-diff">Speech Depth Diff</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Decision Interface</strong></td>
                <td>{modelA.id.startsWith('d1') ? 'SystemOne SlotReader (5 fields)' : 'Standard LM Head'}</td>
                <td>{modelB.id.startsWith('d1') ? 'SystemOne SlotReader (5 fields)' : 'Standard LM Head'}</td>
                <td>
                  {modelA.id.startsWith('d1') === modelB.id.startsWith('d1') ? (
                    <span className="badge-shared">Same Interface</span>
                  ) : (
                    <span className="badge-diff">Decision vs Generative</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Supported Modalities</strong></td>
                <td><code>{modelA.supportedModalities.join(', ')}</code></td>
                <td><code>{modelB.supportedModalities.join(', ')}</code></td>
                <td>
                  <small style={{ color: '#d0c2e6' }}>
                    A: {modelA.supportedModalities.length} vs B: {modelB.supportedModalities.length}
                  </small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Component Group Presence Checklist */}
        <div className="component-presence-grid">
          {allGroups.map(group => {
            const hasA = groupsA.has(group.key as any);
            const hasB = groupsB.has(group.key as any);

            return (
              <div key={group.key} className="presence-card">
                <span className="presence-label">{group.label}</span>
                <div className="presence-status-row">
                  <span className={`presence-pill ${hasA ? 'is-present' : 'is-absent'}`}>
                    {modelA.name}: {hasA ? '✓ Included' : '— Omitted'}
                  </span>
                  <span className={`presence-pill ${hasB ? 'is-present' : 'is-absent'}`}>
                    {modelB.name}: {hasB ? '✓ Included' : '— Omitted'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scientific Footnote */}
        <div className="comparison-footer-notice">
          <span className="notice-icon">ℹ️</span>
          <p>
            <strong>Research Provenance Guardrail:</strong> Shared layer structures (such as the 24-layer hybrid text backbone) do not imply identical weight parameters or activation states between model checkpoints. Each model represents an independently trained and evaluated artifact.
          </p>
        </div>
      </div>
    </div>
  );
};
