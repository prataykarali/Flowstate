import React from 'react';
import {
  type ArchitectureComponentNode,
  type ArchitectureLayerItem,
  type ProvenanceTier
} from '../../data/architecture/index.ts';

interface ComponentInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: ArchitectureComponentNode | null;
  selectedLayer: ArchitectureLayerItem | null;
  onSelectSubLayer?: (layer: ArchitectureLayerItem) => void;
}

const PROVENANCE_LABELS: Record<ProvenanceTier, { label: string; tagClass: string; desc: string }> = {
  CONFIRMED_CONFIG: {
    label: 'Confirmed Architecture Configuration',
    tagClass: 'prov-confirmed',
    desc: 'Recorded directly in canonical GGUF / Hugging Face configuration JSON.'
  },
  SOURCE_TRACED: {
    label: 'Source-Traced Pathway',
    tagClass: 'prov-traced',
    desc: 'Audited in Liquid AI reference PyTorch modeling classes and forward signatures.'
  },
  CONCEPTUAL_FLOW: {
    label: 'Conceptual Visualization',
    tagClass: 'prov-conceptual',
    desc: 'High-level architectural routing diagram; not an instrumented tensor execution trace.'
  },
  MEASURED_RUNTIME: {
    label: 'Experimentally Measured Runtime',
    tagClass: 'prov-measured',
    desc: 'Observed and recorded during PrismLab P1–P6 empirical benchmark runs.'
  },
  UNDER_AUDIT: {
    label: 'Unresolved / Readout Under Audit',
    tagClass: 'prov-audit',
    desc: 'Proprietary or private decision interface; internal readout mechanisms are unverified and under academic audit.'
  }
};

export const ComponentInspectorDrawer: React.FC<ComponentInspectorDrawerProps> = ({
  isOpen,
  onClose,
  selectedNode,
  selectedLayer,
  onSelectSubLayer
}) => {
  if (!isOpen || (!selectedNode && !selectedLayer)) return null;

  // If a sublayer is selected, show layer inspector
  if (selectedLayer) {
    const isConv = selectedLayer.type === 'conv';
    const isFull = selectedLayer.type === 'full_attention';

    return (
      <aside className="arch-inspector-drawer" aria-label="Layer inspector">
        <div className="inspector-head">
          <div className="inspector-tag-row">
            <span className="inspector-group-pill">Backbone Layer</span>
            <span className="prov-pill prov-confirmed">Confirmed Configuration</span>
          </div>
          <button
            type="button"
            className="s4-winner-close-btn"
            onClick={onClose}
            aria-label="Close inspector"
          >
            ×
          </button>
        </div>

        <div className="inspector-body">
          <h2 className="inspector-title">{selectedLayer.name}</h2>
          <p className="inspector-desc">
            Layer index <strong>{selectedLayer.index} of 24</strong> in the hybrid recurrent text backbone.
            {isConv && ' Implements GatedDeltaNet-style causal convolution state updates with learned decay gating.'}
            {isFull && ' Implements causal multi-head self-attention with 16 query heads and 4 key/value heads.'}
            {!isConv && !isFull && ' Implements local sliding window self-attention bounded to a 256-token context window.'}
          </p>

          <div className="inspector-section">
            <span className="section-label">Verified Configuration Properties</span>
            <dl className="inspector-props-list">
              <div className="prop-row">
                <dt>Layer Type</dt>
                <dd><code>{selectedLayer.type}</code></dd>
              </div>
              <div className="prop-row">
                <dt>Hidden Dimension</dt>
                <dd><code>{selectedLayer.hiddenSize}</code></dd>
              </div>
              {selectedLayer.intermediateSize && (
                <div className="prop-row">
                  <dt>FFN Intermediate Size</dt>
                  <dd><code>{selectedLayer.intermediateSize}</code></dd>
                </div>
              )}
              {selectedLayer.kernelSize && (
                <div className="prop-row">
                  <dt>Convolution Cache Size (L)</dt>
                  <dd><code>{selectedLayer.kernelSize}</code></dd>
                </div>
              )}
              {selectedLayer.heads && (
                <>
                  <div className="prop-row">
                    <dt>Attention Heads</dt>
                    <dd><code>{selectedLayer.heads.q} Query / {selectedLayer.heads.kv} KV (GQA)</code></dd>
                  </div>
                  {selectedLayer.heads.dim && (
                    <div className="prop-row">
                      <dt>Head Dimension</dt>
                      <dd><code>{selectedLayer.heads.dim}</code></dd>
                    </div>
                  )}
                </>
              )}
              {selectedLayer.window && (
                <div className="prop-row">
                  <dt>Sliding Window Size</dt>
                  <dd><code>{selectedLayer.window} tokens</code></dd>
                </div>
              )}
            </dl>
          </div>

          <div className="inspector-section">
            <span className="section-label">Verified Source</span>
            <code className="source-path-code">{selectedLayer.source}</code>
          </div>
        </div>
      </aside>
    );
  }

  // Node inspector
  if (!selectedNode) return null;
  const prov = PROVENANCE_LABELS[selectedNode.provenance] || PROVENANCE_LABELS.CONFIRMED_CONFIG;

  return (
    <aside className="arch-inspector-drawer" aria-label="Component inspector">
      <div className="inspector-head">
        <div className="inspector-tag-row">
          <span className="inspector-group-pill">{selectedNode.group.replace('_', ' ').toUpperCase()}</span>
          <span className={`prov-pill ${prov.tagClass}`}>{prov.label}</span>
        </div>
        <button
          type="button"
          className="s4-winner-close-btn"
          onClick={onClose}
          aria-label="Close inspector"
        >
          ×
        </button>
      </div>

      <div className="inspector-body">
        <h2 className="inspector-title">{selectedNode.title}</h2>
        <p className="inspector-desc">{selectedNode.description}</p>

        {/* Provenance Explainer Callout */}
        <div className={`provenance-callout-box ${selectedNode.isUncertain ? 'is-warning' : ''}`}>
          <span className="callout-icon">{selectedNode.isUncertain ? '⚠️' : '🔬'}</span>
          <div>
            <strong>{prov.label}</strong>
            <p>{prov.desc}</p>
          </div>
        </div>

        {/* Caveat if present */}
        {selectedNode.caveat && (
          <div className="inspector-caveat-box">
            <span className="caveat-label">Architectural Caveat</span>
            <p>{selectedNode.caveat}</p>
          </div>
        )}

        {/* Verified Technical Properties */}
        <div className="inspector-section">
          <span className="section-label">Technical Properties</span>
          <dl className="inspector-props-list">
            {selectedNode.tensorShape && (
              <div className="prop-row">
                <dt>Tensor Shape / Signature</dt>
                <dd><code>{selectedNode.tensorShape}</code></dd>
              </div>
            )}
            {selectedNode.configKey && (
              <div className="prop-row">
                <dt>Configuration Parameters</dt>
                <dd><code>{selectedNode.configKey}</code></dd>
              </div>
            )}
            <div className="prop-row">
              <dt>Architectural Role</dt>
              <dd><code>{selectedNode.role}</code></dd>
            </div>
            <div className="prop-row">
              <dt>Audited Source</dt>
              <dd><code className="source-path-code">{selectedNode.sourceFile}</code></dd>
            </div>
          </dl>
        </div>

        {/* Expandable Sub-layers if present */}
        {selectedNode.layers && selectedNode.layers.length > 0 && (
          <div className="inspector-section">
            <div className="sublayer-header-row">
              <span className="section-label">Configured Sub-Layers ({selectedNode.layers.length})</span>
              <span className="sublayer-hint">Click layer for details</span>
            </div>
            <div className="sublayer-chips-grid">
              {selectedNode.layers.map(layer => (
                <button
                  key={layer.index}
                  type="button"
                  className="sublayer-chip"
                  style={{
                    '--sublayer-color': layer.color
                  } as React.CSSProperties}
                  onClick={() => onSelectSubLayer && onSelectSubLayer(layer)}
                >
                  <span className="sublayer-dot" style={{ background: layer.color }} />
                  <span>L{layer.index} ({layer.type === 'conv' ? 'Conv' : layer.type === 'full_attention' ? 'Attn' : 'Slide'})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
