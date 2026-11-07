import React, { useState } from 'react';
import { RESEARCH_DATA } from '../../data/research/index.ts';
import { type PhaseTab, PHASES_LIST } from './PhaseNavRibbon.tsx';

interface ResearchOverviewProps {
  onSelectPhase: (phase: PhaseTab) => void;
}

export const SIX_MODELS_REGISTRY = [
  {
    key: 'text',
    targetModel: 'LiquidAI/LFM3-1.7B',
    hfUrl: 'https://huggingface.co/LiquidAI/LFM3-1.7B',
    inputs: '{text}',
    outputs: '{text}',
    phaseStatus: 'P1 / P6 Complete',
    deployment: 'Validated locally on demand',
    archDoc: '/research/p7/models/text_v2.html'
  },
  {
    key: 'vision',
    targetModel: 'LiquidAI/LFM3-VL-2B',
    hfUrl: 'https://huggingface.co/LiquidAI/LFM3-VL-2B',
    inputs: '{text, image, video}',
    outputs: '{text}',
    phaseStatus: 'P2 / P6 Complete',
    deployment: 'Validated locally on demand',
    archDoc: '/research/p7/models/vision_v2.html'
  },
  {
    key: 'audio',
    targetModel: 'LiquidAI/LFM3-Audio-2B',
    hfUrl: 'https://huggingface.co/LiquidAI/LFM3-Audio-2B',
    inputs: '{text, audio}',
    outputs: '{text, speech}',
    phaseStatus: 'P3 / P6 Complete',
    deployment: 'Validated locally on demand',
    archDoc: '/research/p7/models/audio_v2.html'
  },
  {
    key: 'omni',
    targetModel: 'LiquidAI/LFM3-Omni-2B',
    hfUrl: 'https://huggingface.co/LiquidAI/LFM3-Omni-2B',
    inputs: '{text, image, video, audio}',
    outputs: '{text, speech}',
    phaseStatus: 'P4 / P6 Complete',
    deployment: 'Validated locally on demand',
    archDoc: '/research/p7/models/omni_v2.html'
  },
  {
    key: 'd1',
    targetModel: 'LiquidAI/d1-2B',
    hfUrl: 'https://huggingface.co/LiquidAI/d1-2B',
    inputs: '{text, image, video}',
    outputs: '{decision}',
    phaseStatus: 'P5 / P6 Complete',
    deployment: 'Validated locally on demand',
    archDoc: '/research/p7/models/d1_v2.html'
  },
  {
    key: 'd1_omni',
    targetModel: 'LiquidAI/d1-Omni-2B',
    hfUrl: 'https://huggingface.co/LiquidAI/d1-Omni-2B',
    inputs: '{text, image, video, audio}',
    outputs: '{decision}',
    phaseStatus: 'P5 / P6 Complete',
    deployment: 'Validated locally on demand',
    archDoc: '/research/p7/models/d1_omni_v2.html'
  }
];

export const NOTEBOOK_FIGURES = [
  {
    id: 'p7_03',
    title: 'Figure 1: Phase-Local Strict Task Success',
    src: '/assets/research/figures/p7_03_phase_local_strict_success.png',
    caption: 'Strict evaluation task pass rates across Direct VL (100%), Native S2S (96.0%), Modular V2.1 (88.0%), and Paired Holdout (70.0%).',
    sourceTag: 'docs/p7/figures/p7_03_phase_local_strict_success.png'
  },
  {
    id: 'p7_04',
    title: 'Figure 2: Multimodal Latency Distributions',
    src: '/assets/research/figures/p7_04_phase_local_latency.png',
    caption: 'Empirical execution latency across single-engine CPU hosts. Highlights Native S2S latency advantage (13.95s) vs Modular (20.18s–27.70s).',
    sourceTag: 'docs/p7/figures/p7_04_phase_local_latency.png'
  },
  {
    id: 'p7_05',
    title: 'Figure 3: Decision Intelligence & Routing Evidence',
    src: '/assets/research/figures/p7_05_p5_decision_evidence.png',
    caption: 'P5 routing accuracy curves (Pilot 95.8% vs Stress 83.3%), confidence distributions, and selective prediction coverage (post-hoc τ=0.90).',
    sourceTag: 'docs/p7/figures/p7_05_p5_decision_evidence.png'
  },
  {
    id: 'p7_02',
    title: 'Figure 4: 24-Layer Text Backbone Operator Schedule',
    src: '/assets/research/figures/p7_02_text_operator_schedule.png',
    caption: 'Official LFM3 text operator schedule: 13 Conv (GatedDeltaNet), 6 Full Attention, and 5 Sliding Window Attention blocks.',
    sourceTag: 'docs/p7/figures/p7_02_text_operator_schedule.png'
  },
  {
    id: 'p3_contact',
    title: 'Figure 5: Phase 3 Speech-to-Speech Experimental Suite',
    src: '/assets/research/figures/p3/figures_contact_sheet.png',
    caption: 'Contact sheet of P3 reliability comparisons, category breakdowns, stage-wise latency decompositions, and V1 → V2.1 improvements.',
    sourceTag: 'docs/p3/figures/figures_contact_sheet.png'
  },
  {
    id: 'p2_res',
    title: 'Figure 6: Phase 2 Resolution Ablation & TTFT Scaling',
    src: '/assets/research/figures/p2/resolution_latency.png',
    caption: 'Time-to-first-token (TTFT) scaling under resolution ablation. Halving resolution (0.50x) reduces TTFT by 45.3% (28.01s → 15.33s).',
    sourceTag: 'docs/p2/figures/resolution_latency.png'
  }
];

export const ResearchOverview: React.FC<ResearchOverviewProps> = ({ onSelectPhase }) => {
  const summary = RESEARCH_DATA.benchmarkSummary;
  const [selectedFigure, setSelectedFigure] = useState<typeof NOTEBOOK_FIGURES[0] | null>(null);
  const [showArchModal, setShowArchModal] = useState(false);

  return (
    <div className="observatory-stage" id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">
      <div className="observatory-layout">
        {/* Main Stage */}
        <section className="observatory-main-canvas" aria-label="Research Observatory Executive Overview">
          {/* Executive Header */}
          <div className="canvas-header-bar">
            <div>
              <span className="eyebrow">Executive Research Synthesis · Phases 1–7</span>
              <h2 className="canvas-title">What Did PrismLab Discover?</h2>
            </div>
            <div className="canvas-controls-group">
              <span className="dataset-badge">Canonical Synthesis</span>
            </div>
          </div>

          <p className="overview-hero-text">
            PrismLab is an independent, air-gapped experimental workbench designed to evaluate, benchmark, and route Liquid AI's <strong>Liquid Foundation Model (LFM3)</strong> family under quantized, local CPU execution using <code>llama.cpp</code>. Across seven research phases, we deployed and tested specialized neural models on consumer hardware, systematically measuring where direct architectures succeed, where modular cascades fail, and how deterministic capability routing coordinates multimodal edge AI with <strong>zero cloud dependencies and zero inference costs</strong>.
          </p>

          {/* 1. Grand System Architecture Diagram & Interactive Visualizer */}
          <div className="viz-subpanel architecture-banner-subpanel" style={{ marginTop: 20 }}>
            <div className="subpanel-title-row">
              <div>
                <span className="eyebrow" style={{ color: '#75efdc' }}>System Architecture</span>
                <h3>Figure 1: Extended Multi-Model Routing & Processing Flow</h3>
                <p className="subpanel-desc">
                  Deterministic capability router, 6 specialized Liquid Foundation Model pathways, local dispatcher, and verification logging.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="research-nav-btn"
                  onClick={() => setShowArchModal(true)}
                  title="Expand architecture diagram full size"
                >
                  🔍 View Full Diagram
                </button>
                <a
                  href="/assets/research/PrismLabs_Architecture_Extended_P7_NAV_v2.html"
                  target="_blank"
                  rel="noreferrer"
                  className="research-nav-btn"
                  style={{ color: '#ffd766', borderColor: 'rgba(255, 215, 102, 0.4)' }}
                  title="Open interactive HTML architecture explorer"
                >
                  Interactive Architecture Explorer ↗
                </a>
              </div>
            </div>

            <div
              className="arch-diagram-preview-card"
              onClick={() => setShowArchModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setShowArchModal(true)}
              title="Click to view full architecture diagram"
            >
              <img
                src="/assets/research/figures/PrismLabs_Architecture_Extended.png"
                alt="PrismLab Extended Multi-Model Routing Architecture Diagram"
                className="arch-diagram-img"
                loading="lazy"
              />
              <div className="arch-diagram-overlay-hint">
                <span>Click to Expand Architecture Diagram (High Resolution) 🔍</span>
              </div>
            </div>
          </div>

          {/* 2. Six-Model Registry & Deployment Status Table (from README Section 2) */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <span className="eyebrow" style={{ color: '#c084fc' }}>Model Family</span>
                <h3>Six-Model Registry &amp; Deployment Status</h3>
                <p className="subpanel-desc">
                  Canonical registry mapping target models, input/output tensors, verified phase status, and architecture documentation.
                </p>
              </div>
              <a
                href="https://huggingface.co/LiquidAI"
                target="_blank"
                rel="noreferrer"
                className="source-tag"
                title="Liquid AI Organization on Hugging Face"
              >
                LiquidAI on Hugging Face ↗
              </a>
            </div>

            <div className="canonical-summary-table-wrapper">
              <table className="canonical-summary-table" role="table">
                <thead>
                  <tr>
                    <th>Model Key</th>
                    <th>Target Model</th>
                    <th>Input Modalities</th>
                    <th>Output Modalities</th>
                    <th>Phase Status</th>
                    <th>Local Deployment</th>
                    <th>Architecture</th>
                  </tr>
                </thead>
                <tbody>
                  {SIX_MODELS_REGISTRY.map(m => (
                    <tr key={m.key}>
                      <td className="phase-cell">
                        <span className="phase-indicator" style={{ fontFamily: 'monospace' }}>
                          {m.key}
                        </span>
                      </td>
                      <td className="label-cell">
                        <a
                          href={m.hfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="model-table-link"
                          title={`Open ${m.targetModel} on Hugging Face`}
                        >
                          <strong>{m.targetModel}</strong> ↗
                        </a>
                      </td>
                      <td className="task-cell"><code>{m.inputs}</code></td>
                      <td className="task-cell"><code>{m.outputs}</code></td>
                      <td className="success-cell">
                        <span className="phase-status-badge">{m.phaseStatus}</span>
                      </td>
                      <td className="latency-cell">
                        <span className="deploy-status-badge">
                          <span className="deploy-dot" />
                          {m.deployment}
                        </span>
                      </td>
                      <td>
                        <a
                          href={m.archDoc}
                          target="_blank"
                          rel="noreferrer"
                          className="source-report-link"
                          style={{ fontSize: 11 }}
                        >
                          Audit Explorer ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Canonical Empirical Benchmark Summary Table */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <span className="eyebrow" style={{ color: '#ffd766' }}>Recorded Experiments</span>
                <h3>Canonical Empirical Benchmark Summary</h3>
                <p className="subpanel-desc">
                  Empirical evaluations across synthetic OCR vision, speech-to-speech audio, and paired multimodal holdouts.
                </p>
              </div>
              <span className="source-tag">results/p7/final/benchmark_summary.csv</span>
            </div>

            <div className="canonical-summary-table-wrapper">
              <table className="canonical-summary-table" role="table">
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th>Evaluated Architecture</th>
                    <th>Strict Success</th>
                    <th>Pass Rate</th>
                    <th>Median Latency</th>
                    <th>Task Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map(row => {
                    const passRate = ((row.success / row.total) * 100).toFixed(1);
                    return (
                      <tr key={`${row.phase}-${row.label}`}>
                        <td className="phase-cell">
                          <span className="phase-indicator">{row.phase}</span>
                        </td>
                        <td className="label-cell">
                          <strong>{row.label}</strong>
                        </td>
                        <td className="success-cell">
                          <strong className="text-mint">{row.success} / {row.total}</strong>
                        </td>
                        <td className="rate-cell">
                          <div className="table-bar-container">
                            <div className="table-bar-fill" style={{ width: `${passRate}%` }} />
                            <span>{passRate}%</span>
                          </div>
                        </td>
                        <td className="latency-cell">
                          <strong>{row.medianLatencyS !== null ? `${row.medianLatencyS.toFixed(2)} s` : '—'}</strong>
                          {row.timedCount && <small>n={row.timedCount} timed</small>}
                        </td>
                        <td className="task-cell">{row.task}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Research Graphs & Notebook Figures Gallery */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <span className="eyebrow" style={{ color: '#75efdc' }}>Visual Evidence</span>
                <h3>Scientific Figures &amp; Research Notebook Graphs</h3>
                <p className="subpanel-desc">
                  Empirical plots generated directly from benchmark artifacts and reproducible research notebooks. Click any figure to inspect in full resolution.
                </p>
              </div>
              <span className="metric-indicator">6 Published Figures</span>
            </div>

            <div className="figures-gallery-grid">
              {NOTEBOOK_FIGURES.map(fig => (
                <div
                  key={fig.id}
                  className="figure-card"
                  onClick={() => setSelectedFigure(fig)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelectedFigure(fig)}
                  title={`Click to enlarge ${fig.title}`}
                >
                  <div className="figure-card-img-wrap">
                    <img src={fig.src} alt={fig.title} loading="lazy" />
                    <span className="figure-zoom-icon">🔍</span>
                  </div>
                  <div className="figure-card-info">
                    <h4>{fig.title}</h4>
                    <p>{fig.caption}</p>
                    <code className="figure-source-code">{fig.sourceTag}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Phase Quick-Navigator Grid */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <span className="eyebrow" style={{ color: '#ffd766' }}>Interactive Observatories</span>
                <h3>Explore Individual Phase Laboratories</h3>
              </div>
              <span className="metric-indicator">Direct access to instruments &amp; simulations</span>
            </div>

            <div className="phase-cards-navigator">
              {PHASES_LIST.filter(p => p.id !== 'overview').map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="phase-jump-card"
                  onClick={() => onSelectPhase(p.id)}
                >
                  <div className="jump-card-top">
                    <span className="jump-badge">{p.badge}</span>
                    <span className="jump-arrow">Explore →</span>
                  </div>
                  <h4>{p.label}</h4>
                  <p>{p.summary}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Side Analytical Context Column */}
        <aside className="observatory-side-column" aria-label="Scientific Context">
          <div className="side-card">
            <span className="eyebrow">Project Links</span>
            <div className="side-links-stack" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href="https://github.com/prataykarali/Flowstate/tree/main/lfm3-prismlab"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ textAlign: 'center', justifyContent: 'center' }}
              >
                GitHub Repository ↗
              </a>
              <a
                href="https://liquid.ai"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ textAlign: 'center', justifyContent: 'center' }}
              >
                Liquid AI Official Site ↗
              </a>
              <a
                href="https://huggingface.co/LiquidAI"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ textAlign: 'center', justifyContent: 'center' }}
              >
                Hugging Face Organization ↗
              </a>
            </div>
          </div>

          <div className="side-card">
            <span className="eyebrow">Research Mandate</span>
            <p className="side-question">
              Independent evaluation of local quantized inference without external API dependencies.
            </p>
          </div>

          <div className="side-card">
            <span className="eyebrow">Methodological Pillars</span>
            <ul className="side-facts-list">
              <li>
                <strong>No Fabricated Data:</strong> Every plotted figure corresponds to an archived CSV, JSON, or configuration artifact.
              </li>
              <li>
                <strong>Negative Results Included:</strong> Token budget crashes, unanswerable hallucinations, and miscalibrations are cataloged in Failure Lab.
              </li>
              <li>
                <strong>Reproducibility:</strong> All experiments can be reproduced on consumer hardware using <code>llama-server</code> with CPU threading.
              </li>
            </ul>
          </div>

          <div className="side-card caveat-card">
            <span className="eyebrow">Public Research Notice</span>
            <p className="caveat-text">
              PrismLab is an independent academic research prototype. Not affiliated with or endorsed by Liquid AI. Results describe prototype CPU behaviors.
            </p>
            <a
              href="https://github.com/prataykarali/Flowstate/tree/main/lfm3-prismlab"
              target="_blank"
              rel="noreferrer"
              className="source-report-link"
            >
              Open repository root ↗
            </a>
          </div>
        </aside>
      </div>

      {/* Lightbox Modal for Full-Resolution Notebook Figures */}
      {selectedFigure && (
        <div
          className="research-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={selectedFigure.title}
          onClick={() => setSelectedFigure(null)}
        >
          <div className="research-lightbox-dialog" onClick={e => e.stopPropagation()}>
            <div className="lightbox-head">
              <div>
                <span className="eyebrow" style={{ color: '#75efdc' }}>Scientific Figure</span>
                <h3>{selectedFigure.title}</h3>
              </div>
              <button
                type="button"
                className="s4-winner-close-btn"
                onClick={() => setSelectedFigure(null)}
                aria-label="Close image preview"
              >
                ×
              </button>
            </div>
            <div className="lightbox-img-wrapper">
              <img src={selectedFigure.src} alt={selectedFigure.title} />
            </div>
            <div className="lightbox-footer">
              <p>{selectedFigure.caption}</p>
              <code>{selectedFigure.sourceTag}</code>
            </div>
          </div>
        </div>
      )}

      {/* Full Architecture Diagram Modal */}
      {showArchModal && (
        <div
          className="research-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="PrismLab Extended Architecture Flow Diagram"
          onClick={() => setShowArchModal(false)}
        >
          <div className="research-lightbox-dialog arch-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="lightbox-head">
              <div>
                <span className="eyebrow" style={{ color: '#75efdc' }}>System Flowchart</span>
                <h3>Figure 1: Extended Multi-Model Routing &amp; Processing Architecture</h3>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <a
                  href="/assets/research/PrismLabs_Architecture_Extended_P7_NAV_v2.html"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  Open Interactive HTML ↗
                </a>
                <button
                  type="button"
                  className="s4-winner-close-btn"
                  onClick={() => setShowArchModal(false)}
                  aria-label="Close architecture modal"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="lightbox-img-wrapper arch-img-wrapper">
              <img
                src="/assets/research/figures/PrismLabs_Architecture_Extended.png"
                alt="PrismLab Extended Architecture Full Diagram"
              />
            </div>
            <div className="lightbox-footer">
              <p>
                Visual flowchart of request ingestion, deterministic capability matching (<code>prismlab/core/router.py</code>), six LFM model dispatch pathways, output unifying, and benchmark recording.
              </p>
              <code>visuals/PrismLabs_Architecture_Extended.png</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
