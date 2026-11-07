import React, { useState } from 'react';
import { RESEARCH_DATA } from '../../data/research/index.ts';
import { EvidenceInspectorModal } from './EvidenceInspectorModal.tsx';

export const P5DecisionObservatory: React.FC = () => {
  const [showInspector, setShowInspector] = useState(false);
  const p5 = RESEARCH_DATA.p5;

  return (
    <div className="observatory-stage" id="panel-p5" role="tabpanel" aria-labelledby="tab-p5">
      <div className="observatory-layout">
        {/* Main Stage (65-75% width) */}
        <section className="observatory-main-canvas" aria-label="P5 Decision Intelligence Visualizations">
          <div className="canvas-header-bar">
            <div>
              <span className="eyebrow">Phase 5 · SystemOne Decision Intelligence</span>
              <h2 className="canvas-title">Routing Accuracy, Calibration &amp; High-Confidence Errors</h2>
            </div>
            <div className="canvas-controls-group">
              <span className="dataset-badge">d1-2B GGUF Q4_K_M · CPU Local</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInspector(true)}
              >
                Inspect Data ↗
              </button>
            </div>
          </div>

          {/* Prominent Cautionary Spotlight: Case X03 High-Confidence Failure */}
          <div className="failure-spotlight-box is-critical" style={{ marginTop: 0 }}>
            <div className="spotlight-icon">🚨</div>
            <div className="spotlight-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 15, color: '#fca5a5' }}>
                  CRITICAL CAUTIONARY CASE · X03 High-Confidence False Positive
                </strong>
                <span className="case-cat-pill text-rose">Confidence: 91.99% · Incorrect</span>
              </div>
              <p style={{ marginTop: 6 }}>
                In <code>{p5.prominentFailureX03.caseId}</code>, the prompt was an explicit <strong>technical</strong> support request.
                The model misclassified it as <strong>billing</strong> with a staggering <strong>0.920 (91.99%)</strong> reported softmax probability, automatically bypassing the post-hoc 0.90 threshold for autonomous action.
              </p>
              <div className="probabilities-mini-strip">
                <span className="prob-item is-wrong">billing: <strong>91.99%</strong> (Predicted)</span>
                <span className="prob-item is-correct">technical: <strong>2.15%</strong> (Expected)</span>
                <span className="prob-item">other: 5.50%</span>
                <span className="prob-item">shipping: 0.36%</span>
              </div>
              <small className="implication-note">
                <strong>Empirical takeaway:</strong> Raw decision model confidence is NOT production-calibrated. High confidence does not guarantee real-world truth.
              </small>
            </div>
          </div>

          {/* Visualization A: Routing Accuracy Comparison (Pilot vs Stress) */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization A · Pilot vs. Adversarial Stress Routing Accuracy</h3>
                <p className="subpanel-desc">
                  Performance degrades by 12.5% under semantic ambiguity and adversarial domain shifts. Brier score increases nearly 4x.
                </p>
              </div>
              <span className="source-tag">p5_evidence_summary.json</span>
            </div>

            <div className="paired-comparison-display">
              {/* P5.2 Routing Pilot */}
              <div className="paired-method-card">
                <div className="method-header">
                  <span className="method-tag tag-direct">CONTROLLED BENCHMARK</span>
                  <h4>P5.2 Routing Pilot</h4>
                  <p>24 standard ticket intent queries</p>
                </div>
                <div className="method-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Accuracy</span>
                    <strong className="stat-val text-mint">23 / 24</strong>
                    <span className="stat-sub">95.8% success rate</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Brier Score</span>
                    <strong className="stat-val text-pearl">0.0665</strong>
                    <span className="stat-sub">Lower is better</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">p50 Latency</span>
                    <strong className="stat-val">0.413 s</strong>
                    <span className="stat-sub">p95: 0.503s</span>
                  </div>
                </div>
                <div className="bar-visual">
                  <div className="bar-track">
                    <div className="bar-fill fill-mint" style={{ width: `${(23 / 24) * 100}%` }}>
                      <span>95.8%</span>
                    </div>
                  </div>
                </div>
                <div className="failures-strip">
                  <small>Failed ID: <code>T06</code></small>
                </div>
              </div>

              {/* P5.3 Routing Stress */}
              <div className="paired-method-card">
                <div className="method-header">
                  <span className="method-tag tag-modular">ADVERSARIAL STRESS</span>
                  <h4>P5.3 Stress Routing</h4>
                  <p>24 ambiguous and multi-intent queries</p>
                </div>
                <div className="method-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Accuracy</span>
                    <strong className="stat-val text-gold">20 / 24</strong>
                    <span className="stat-sub">83.3% success rate (-12.5%)</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Brier Score</span>
                    <strong className="stat-val text-rose">0.2445</strong>
                    <span className="stat-sub">Substantial miscalibration</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">p50 Latency</span>
                    <strong className="stat-val">0.411 s</strong>
                    <span className="stat-sub">p95: 0.474s</span>
                  </div>
                </div>
                <div className="bar-visual">
                  <div className="bar-track">
                    <div className="bar-fill fill-lavender" style={{ width: `${(20 / 24) * 100}%` }}>
                      <span>83.3%</span>
                    </div>
                  </div>
                </div>
                <div className="failures-strip">
                  <small>Failed IDs: <code>T07, T08, O10, O12</code> (conf: 0.71–0.83)</small>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization C: Selective Accuracy & Gated Integration */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization B · Gated Selective Coverage (P5.7)</h3>
                <p className="subpanel-desc">
                  Under an exploratory post-hoc threshold (τ = 0.90), low-confidence inputs are routed to human review, while high-confidence inputs are auto-recommended.
                </p>
              </div>
              <span className="source-tag">p5_7_integration (τ = 0.90 post-hoc)</span>
            </div>

            <div className="gated-coverage-breakdown">
              <div className="coverage-flow-row">
                <div className="flow-step">
                  <span className="step-num">9</span>
                  <span className="step-label">Total Inbound Queries</span>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-step">
                  <span className="step-num">3</span>
                  <span className="step-label">Halted by Evidence Gate</span>
                  <small>No model call required</small>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-step">
                  <span className="step-num">6</span>
                  <span className="step-label">Evaluated by d1-2B</span>
                  <small>Decision SlotReader</small>
                </div>
              </div>

              <div className="threshold-outcomes-grid">
                <div className="outcome-box is-auto">
                  <div className="box-head">
                    <span className="box-title">Auto-Recommended (τ ≥ 0.90)</span>
                    <strong className="text-mint">5 cases</strong>
                  </div>
                  <p>Queries where top probability exceeded the threshold.</p>
                  <div className="accuracy-pill">
                    4 correct · 1 incorrect (X03) · <strong>80.0% precision</strong>
                  </div>
                </div>

                <div className="outcome-box is-review">
                  <div className="box-head">
                    <span className="box-title">Sent to Human Review</span>
                    <strong className="text-gold">4 cases</strong>
                  </div>
                  <p>3 blocked pre-inference + 1 below threshold.</p>
                  <div className="accuracy-pill">
                    Safely intercepted ambiguous payloads
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization D: Audio vs Transcript Oracle (P5.6b) */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization C · Speech Decision vs. Text Oracle (P5.6b)</h3>
                <p className="subpanel-desc">
                  Paired evaluation comparing decision accuracy when reading audio waveforms directly versus reading clean ground-truth text transcripts.
                </p>
              </div>
              <span className="source-tag">12 Fully Paired Cases</span>
            </div>

            <div className="oracle-stats-grid">
              <div className="oracle-stat-card">
                <span className="stat-label">Speech Input (d1-Omni-2B)</span>
                <strong className="stat-val text-mint">12 / 12 (100%)</strong>
                <span className="stat-sub">Median Latency: 0.374 s · p95: 0.407 s</span>
              </div>
              <div className="oracle-stat-card">
                <span className="stat-label">Text Oracle (d1-2B)</span>
                <strong className="stat-val text-mint">12 / 12 (100%)</strong>
                <span className="stat-sub">Median Latency: 0.329 s · p95: 0.592 s</span>
              </div>
            </div>
            <p className="oracle-footnote">
              * Note: Synthetic audio queries were acoustically clean. A text oracle does not independently establish robustness against background noise or strong regional accents.
            </p>
          </div>
        </section>

        {/* Side Analytical Context Column */}
        <aside className="observatory-side-column" aria-label="Scientific Context">
          <div className="side-card">
            <span className="eyebrow">Scientific Question</span>
            <p className="side-question">
              When can a decision model's predictions be trusted, and how does confidence relate to correctness and abstention?
            </p>
          </div>

          <div className="side-card">
            <span className="eyebrow">Key Discoveries</span>
            <ul className="side-facts-list">
              <li>
                <strong>Post-Hoc Thresholds:</strong> The τ = 0.90 threshold was selected post-hoc on the pilot data and must not be treated as a universally calibrated boundary.
              </li>
              <li>
                <strong>High Brier Score Under Stress:</strong> Brier score deteriorated from 0.067 to 0.244 under domain stress, reflecting increased overconfidence on wrong classes.
              </li>
              <li>
                <strong>Evidence Gates:</strong> Pre-model validation gates blocked 3/9 malformed requests, saving CPU inference cycles before model dispatch.
              </li>
            </ul>
          </div>

          <div className="side-card caveat-card">
            <span className="eyebrow">Scientific Caveat</span>
            <p className="caveat-text">
              {p5.caveat} Under no circumstances should decision model scores be permitted to trigger external irreversible transactions without human confirmation.
            </p>
            <a
              href="https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/docs/p5/README.md"
              target="_blank"
              rel="noreferrer"
              className="source-report-link"
            >
              Read full P5 report ↗
            </a>
          </div>
        </aside>
      </div>

      <EvidenceInspectorModal
        isOpen={showInspector}
        onClose={() => setShowInspector(false)}
        title="P5 Decision Intelligence Evidence Summary"
        sourcePath="results/p7/final/p5_evidence_summary.json"
        data={RESEARCH_DATA.p5}
      />
    </div>
  );
};
