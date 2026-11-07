import React, { useState } from 'react';
import { RESEARCH_DATA } from '../../data/research/index.ts';
import { EvidenceInspectorModal } from './EvidenceInspectorModal.tsx';

export const P7ArchitectureObservatory: React.FC = () => {
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);
  const [selectedModelKey, setSelectedModelKey] = useState<string>('omni');
  const [showInspector, setShowInspector] = useState(false);
  const p7 = RESEARCH_DATA.p7;

  const currentLayerInfo = hoveredLayer !== null
    ? p7.textBackboneSchedule.layerTypes[hoveredLayer]
    : null;

  return (
    <div className="observatory-stage" id="panel-p7" role="tabpanel" aria-labelledby="tab-p7">
      <div className="observatory-layout">
        {/* Main Stage (65-75% width) */}
        <section className="observatory-main-canvas" aria-label="P7 Architecture and Synthesis Visualizations">
          <div className="canvas-header-bar">
            <div>
              <span className="eyebrow">Phase 7 · Architecture Audit &amp; Synthesis</span>
              <h2 className="canvas-title">Six-Model Topology &amp; 24-Layer Operator Matrix</h2>
            </div>
            <div className="canvas-controls-group">
              <span className="dataset-badge">Verified Configuration Audit</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInspector(true)}
              >
                Inspect Data ↗
              </button>
            </div>
          </div>

          {/* Visualization A: Six-Model Component Matrix */}
          <div className="viz-subpanel">
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization A · Six-Model Component Architecture Matrix</h3>
                <p className="subpanel-desc">
                  Derived from canonical GGUF/HF configuration JSON files. Shows configured layer counts per sub-component.
                </p>
              </div>
              <span className="source-tag">results/p7/architecture/component_maps.json</span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <a
                href="/assets/research/PrismLabs_Architecture_Extended_P7_NAV_v2.html"
                target="_blank"
                rel="noreferrer"
                className="research-nav-btn"
                style={{ color: '#ffd766', borderColor: 'rgba(255, 215, 102, 0.4)' }}
              >
                Master Architecture Explorer ↗
              </a>
              <a href="/research/p7/models/text_v2.html" target="_blank" rel="noreferrer" className="research-nav-btn">Text ↗</a>
              <a href="/research/p7/models/vision_v2.html" target="_blank" rel="noreferrer" className="research-nav-btn">Vision ↗</a>
              <a href="/research/p7/models/audio_v2.html" target="_blank" rel="noreferrer" className="research-nav-btn">Audio ↗</a>
              <a href="/research/p7/models/omni_v2.html" target="_blank" rel="noreferrer" className="research-nav-btn">Omni ↗</a>
              <a href="/research/p7/models/d1_v2.html" target="_blank" rel="noreferrer" className="research-nav-btn">d1 ↗</a>
              <a href="/research/p7/models/d1_omni_v2.html" target="_blank" rel="noreferrer" className="research-nav-btn">d1-Omni ↗</a>
            </div>

            <div className="component-matrix-table-wrapper">
              <table className="component-matrix-table" role="table">
                <thead>
                  <tr>
                    <th>Model Family</th>
                    <th>Text Backbone</th>
                    <th>Vision Encoder</th>
                    <th>Audio Encoder</th>
                    <th>Depthformer</th>
                    <th>Decision Head</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(p7.componentMaps).map(([key, model]: [string, any]) => {
                    const isSelected = key === selectedModelKey;
                    const parts = model.parts || [];
                    const textPart = parts.find((p: any) => p.title.toLowerCase().includes('text'));
                    const visionPart = parts.find((p: any) => p.title.toLowerCase().includes('vision'));
                    const audioPart = parts.find((p: any) => p.title.toLowerCase().includes('audio'));
                    const depthPart = parts.find((p: any) => p.title.toLowerCase().includes('depth'));
                    const hasDecision = (model.decision_fields || []).length > 0;

                    return (
                      <tr
                        key={key}
                        className={`comp-row ${isSelected ? 'is-selected-model' : ''}`}
                        onClick={() => setSelectedModelKey(key)}
                      >
                        <td className="model-name-cell">
                          <strong>{model.name}</strong>
                          <small>key: <code>{key}</code> · {model.architecture}</small>
                        </td>
                        <td className="comp-cell">
                          <span className="comp-badge text-mint">
                            {textPart ? `${textPart.layers} layers` : '—'}
                          </span>
                          {textPart && <small>13 conv · 6 full · 5 slide</small>}
                        </td>
                        <td className="comp-cell">
                          {visionPart ? (
                            <>
                              <span className="comp-badge text-pearl">{visionPart.layers} layers</span>
                              <small>8 conv · 6 full</small>
                            </>
                          ) : <span className="comp-empty">—</span>}
                        </td>
                        <td className="comp-cell">
                          {audioPart ? (
                            <>
                              <span className="comp-badge text-lavender">{audioPart.layers} layers</span>
                              <small>10 conv · 7 full</small>
                            </>
                          ) : <span className="comp-empty">—</span>}
                        </td>
                        <td className="comp-cell">
                          {depthPart ? (
                            <>
                              <span className="comp-badge text-gold">{depthPart.layers} layers</span>
                              <small>3 full attention</small>
                            </>
                          ) : <span className="comp-empty">—</span>}
                        </td>
                        <td className="comp-cell">
                          {hasDecision ? (
                            <span className="comp-badge text-mint">SlotReader (5 fields)</span>
                          ) : <span className="comp-empty">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visualization B: Horizontal 24-Layer Operator Schedule Strip */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization B · 24-Layer Text Backbone Operator Schedule</h3>
                <p className="subpanel-desc">
                  Strict layer sequence from <code>text_config.json</code>: 13 GatedDeltaNet convolutions, 6 full causal attention, and 5 sliding window attention layers.
                </p>
              </div>
              <div className="schedule-legend">
                <span className="legend-chip"><span className="swatch conv" /> Conv ({p7.textBackboneSchedule.counts.conv})</span>
                <span className="legend-chip"><span className="swatch full" /> Full Attn ({p7.textBackboneSchedule.counts.fullAttention})</span>
                <span className="legend-chip"><span className="swatch sliding" /> Sliding Attn ({p7.textBackboneSchedule.counts.slidingAttention})</span>
              </div>
            </div>

            {/* Interactive 24-layer horizontal strip */}
            <div className="operator-strip-wrapper" role="list" aria-label="24-Layer Operator Sequence">
              {p7.textBackboneSchedule.layerTypes.map((layer) => {
                const isHovered = hoveredLayer === layer.layerIndex;
                const typeClass = layer.type === 'conv' ? 'is-conv' : layer.type === 'full_attention' ? 'is-full' : 'is-sliding';

                return (
                  <div
                    key={layer.layerIndex}
                    role="listitem"
                    className={`operator-block ${typeClass} ${isHovered ? 'is-hovered' : ''}`}
                    onMouseEnter={() => setHoveredLayer(layer.layerIndex)}
                    onMouseLeave={() => setHoveredLayer(null)}
                    title={`Layer ${layer.layerIndex}: ${layer.label}`}
                  >
                    <span className="layer-idx">{layer.layerIndex}</span>
                    <span className="layer-symbol">
                      {layer.type === 'conv' ? '⚡' : layer.type === 'full_attention' ? '◈' : '≋'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Hovered Layer Inspection Bar */}
            <div className="layer-inspector-bar">
              {currentLayerInfo ? (
                <div className="inspector-active">
                  <span className="active-idx">Layer #{currentLayerInfo.layerIndex}</span>
                  <strong className="active-title">{currentLayerInfo.label}</strong>
                  <span className="active-desc">
                    {currentLayerInfo.type === 'conv'
                      ? 'Gated recurrent convolution state with O(1) memory update S_t'
                      : currentLayerInfo.type === 'full_attention'
                      ? 'Global causal self-attention across the full context window'
                      : 'Local sliding window causal attention with bounded receptive field'}
                  </span>
                </div>
              ) : (
                <span className="inspector-placeholder">
                  Hover over any of the 24 layer blocks above to inspect its operator mechanics and attention configuration.
                </span>
              )}
            </div>
          </div>

          {/* Visualization C: Cross-Phase Synthesis (P2, P3, P4) */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization C · Cross-Phase Synthesis (P2, P3, P4)</h3>
                <p className="subpanel-desc">
                  Retaining phase-local benchmark integrity. Unrelated tasks are not collapsed into a single leaderboard percentage.
                </p>
              </div>
            </div>

            <div className="cross-synthesis-grid">
              {p7.crossPhaseSynthesis.map(phase => (
                <div key={phase.phase} className="synthesis-phase-card">
                  <div className="phase-card-head">
                    <span className="phase-tag">{phase.phase} BENCHMARK</span>
                    <h4>{phase.name}</h4>
                    <span className="sample-size">n = {phase.sampleSize}</span>
                  </div>

                  <div className="phase-methods-list">
                    {phase.methods.map(m => (
                      <div key={m.label} className="phase-method-row">
                        <span className="method-label">{m.label}</span>
                        <div className="method-perf">
                          <strong className="perf-rate">{m.strictSuccess}</strong>
                          <small className="perf-lat">{m.medianLatency}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="phase-observation">
                    <strong>Key finding:</strong> {phase.keyObservation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Visualization D: Core Scientific Conclusions */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <h3>Visualization D · Empirical Conclusions &amp; Discoveries</h3>
              <span className="metric-indicator">Derived from verified test artifacts</span>
            </div>

            <div className="conclusions-cards-grid">
              {p7.coreConclusions.map((c, i) => (
                <div key={i} className="conclusion-card">
                  <div className="card-number">0{i + 1}</div>
                  <h4>{c.title}</h4>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Side Analytical Context Column */}
        <aside className="observatory-side-column" aria-label="Scientific Context">
          <div className="side-card">
            <span className="eyebrow">Scientific Question</span>
            <p className="side-question">
              What architectural components distinguish the six LFM3/d1 models, and what do the recorded experiments collectively demonstrate?
            </p>
          </div>

          <div className="side-card">
            <span className="eyebrow">Architecture Synthesis</span>
            <ul className="side-facts-list">
              <li>
                <strong>Hybrid Schedule:</strong> The 24-layer backbone blends 13 recurrent convolutions with 6 full and 5 sliding attention layers.
              </li>
              <li>
                <strong>Direct vs Modular:</strong> Direct models bypass serialization overhead, whereas modular cascades expose intermediate guardrail gates.
              </li>
              <li>
                <strong>Failure Accountability:</strong> Documented failures (P2 Case 04, P3 G02, P4 unanswerable queries, P5 X03) reveal genuine engineering trade-offs.
              </li>
            </ul>
          </div>

          <div className="side-card caveat-card">
            <span className="eyebrow">Scientific Caveat</span>
            <p className="caveat-text">
              Architecture configurations specify tensor topology and layer types. They do not represent proprietary internal training hyperparameters.
            </p>
            <a
              href="https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/docs/p7/P7_FINAL_REPORT.md"
              target="_blank"
              rel="noreferrer"
              className="source-report-link"
            >
              Read full P7 report ↗
            </a>
          </div>
        </aside>
      </div>

      <EvidenceInspectorModal
        isOpen={showInspector}
        onClose={() => setShowInspector(false)}
        title="P7 Architecture Source Audit"
        sourcePath="results/p7/architecture/component_maps.json"
        data={RESEARCH_DATA.p7}
      />
    </div>
  );
};
