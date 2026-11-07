import React, { useState } from 'react';
import { RESEARCH_DATA } from '../../data/research/index.ts';
import { EvidenceInspectorModal } from './EvidenceInspectorModal.tsx';

type ClassificationFilter = 'all' | 'both_pass' | 'modular_only' | 'both_fail';

export const P4FusionObservatory: React.FC = () => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('H13');
  const [filter, setFilter] = useState<ClassificationFilter>('all');
  const [showInspector, setShowInspector] = useState(false);
  const p4 = RESEARCH_DATA.p4;

  const selectedCase = p4.cases.find(c => c.caseId === selectedCaseId) || p4.cases[0];

  return (
    <div className="observatory-stage" id="panel-p4" role="tabpanel" aria-labelledby="tab-p4">
      <div className="observatory-layout">
        {/* Main Stage (65-75% width) */}
        <section className="observatory-main-canvas" aria-label="P4 Audiovisual Fusion Visualizations">
          <div className="canvas-header-bar">
            <div>
              <span className="eyebrow">Phase 4 · Paired Audiovisual Holdout</span>
              <h2 className="canvas-title">Native Omni vs. Modular Cascade Benchmark</h2>
            </div>
            <div className="canvas-controls-group">
              <span className="dataset-badge">40 Paired Cases · Exact McNemar p=0.25</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInspector(true)}
              >
                Inspect Data ↗
              </button>
            </div>
          </div>

          {/* Statistical Rigor Banner (Exact McNemar p = 0.25) */}
          <div className="statistical-alert-banner">
            <div className="alert-badge">STATISTICAL RIGOR NOTICE</div>
            <div className="alert-content">
              <strong>Observed Advantage is NOT Statistically Significant</strong>
              <p>
                While Modular ASR → VL passed 28/40 cases compared to Native Omni's 25/40 (discordant pairs: b=0, c=3), an exact two-tailed McNemar test yields <strong>p = 0.25</strong>.
                Because p &gt; 0.05, the hypothesis that Modular is systematically superior cannot be accepted.
              </p>
            </div>
            <div className="alert-pvalue">
              <span>Two-tailed McNemar</span>
              <strong>p = 0.25</strong>
            </div>
          </div>

          {/* Primary Visualization: 40-Case Paired Matrix Heatmap */}
          <div className="viz-subpanel" style={{ marginTop: 20 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization A · 40-Case Paired Outcome Matrix</h3>
                <p className="subpanel-desc">
                  Each tile represents one test case. Colors denote paired outcome agreement. Click any tile to inspect the full transcript and latency comparison.
                </p>
              </div>

              {/* Classification filter */}
              <div className="toggle-chip-group">
                <button
                  type="button"
                  className={`toggle-chip ${filter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All (40)
                </button>
                <button
                  type="button"
                  className={`toggle-chip ${filter === 'both_pass' ? 'is-active' : ''}`}
                  onClick={() => setFilter('both_pass')}
                >
                  Both Pass (25)
                </button>
                <button
                  type="button"
                  className={`toggle-chip ${filter === 'modular_only' ? 'is-active' : ''}`}
                  onClick={() => setFilter('modular_only')}
                >
                  Modular Only (3)
                </button>
                <button
                  type="button"
                  className={`toggle-chip ${filter === 'both_fail' ? 'is-active' : ''}`}
                  onClick={() => setFilter('both_fail')}
                >
                  Both Fail (12)
                </button>
              </div>
            </div>

            {/* Matrix Legend */}
            <div className="matrix-legend-row">
              <span className="legend-item"><span className="legend-swatch swatch-both-pass" /> Both Correct (25)</span>
              <span className="legend-item"><span className="legend-swatch swatch-modular-only" /> Modular Only (3)</span>
              <span className="legend-item"><span className="legend-swatch swatch-omni-only" /> Omni Only (0)</span>
              <span className="legend-item"><span className="legend-swatch swatch-both-fail" /> Both Failed (12)</span>
            </div>

            {/* 40-Case Interactive Tiles Grid */}
            <div className="paired-case-grid" role="listbox" aria-label="40 Paired Test Cases">
              {p4.cases.map(c => {
                const isSelected = c.caseId === selectedCaseId;
                const isHidden = filter !== 'all' && c.classification !== filter;

                return (
                  <button
                    key={c.caseId}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`case-tile ${c.classification} ${isSelected ? 'is-selected' : ''} ${isHidden ? 'is-filtered-out' : ''}`}
                    onClick={() => setSelectedCaseId(c.caseId)}
                    title={`Case ${c.caseId} (${c.taskType}): Omni=${c.omniPass ? 'PASS' : 'FAIL'}, Modular=${c.modularPass ? 'PASS' : 'FAIL'}`}
                  >
                    <span className="tile-id">{c.caseId}</span>
                    <span className="tile-status">
                      {c.classification === 'both_pass' ? '✓✓' : c.classification === 'modular_only' ? 'Mod' : '✗✗'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Paired Case Inspector */}
            <div className="case-detail-card" style={{ marginTop: 18 }}>
              <div className="case-detail-head">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span className="case-badge">CASE #{selectedCase.caseId}</span>
                  <h4>Condition: {selectedCase.condition}</h4>
                  <span className="case-cat-pill">{selectedCase.taskType}</span>
                </div>
                <div className="case-outcomes-pill">
                  <span className={selectedCase.omniPass ? 'outcome-pass' : 'outcome-fail'}>
                    Native Omni: {selectedCase.omniPass ? 'PASS' : 'FAIL'}
                  </span>
                  <span className={selectedCase.modularPass ? 'outcome-pass' : 'outcome-fail'}>
                    Modular: {selectedCase.modularPass ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              </div>

              {/* Case H13, H18, H20 Callouts (Discordant Pairs) */}
              {selectedCase.classification === 'modular_only' && (
                <div className="failure-spotlight-box">
                  <div className="spotlight-icon">💡</div>
                  <div className="spotlight-body">
                    <strong>DISCORDANT CASE · Modular Passed, Native Omni Failed</strong>
                    <p>
                      In <code>{selectedCase.caseId}</code> ({selectedCase.condition}), Modular ASR → VL correctly identified the spatial relation (<em>"{selectedCase.modularOutput}"</em>), whereas Native Omni guessed (<em>"{selectedCase.omniOutput}"</em>).
                      This is one of 3 total cases where modular outperformed native out of 40 trials.
                    </p>
                  </div>
                </div>
              )}

              {/* Unanswerable Hallucination Callouts */}
              {selectedCase.taskType === 'Unanswerable' && selectedCase.classification === 'both_fail' && (
                <div className="failure-spotlight-box is-warning">
                  <div className="spotlight-icon">⚠️</div>
                  <div className="spotlight-body">
                    <strong>UNANSWERABLE QUERY FAILURE · Spatial Hallucination</strong>
                    <p>
                      The prompt asked about an absent relationship (expected: <em>"unknown"</em>). Both models hallucinated a plausible object shape/color rather than stating the target was absent.
                      (Omni: <em>"{selectedCase.omniOutput}"</em> vs Modular: <em>"{selectedCase.modularOutput}"</em>).
                    </p>
                  </div>
                </div>
              )}

              <div className="case-comparison-grid">
                <div className="case-data-column">
                  <span className="col-label">Ground Truth Condition</span>
                  <p className="case-question">Target query: <strong>{selectedCase.condition}</strong></p>
                  <div className="expected-pill">
                    Expected: <strong>{selectedCase.expected}</strong> ({selectedCase.taskType})
                  </div>
                </div>

                <div className="case-data-column">
                  <div className="output-row">
                    <span className="col-label">Native Omni-2B Output:</span>
                    <strong className={selectedCase.omniPass ? 'text-mint' : 'text-rose'}>
                      "{selectedCase.omniOutput}"
                    </strong>
                    <span className="latency-annotation">Latency: {selectedCase.omniLatencyS}s</span>
                  </div>

                  <div className="output-row" style={{ marginTop: 12 }}>
                    <span className="col-label">Modular ASR → VL Output:</span>
                    <strong className={selectedCase.modularPass ? 'text-mint' : 'text-rose'}>
                      "{selectedCase.modularOutput}"
                    </strong>
                    <span className="latency-annotation">Latency: {selectedCase.modularLatencyS}s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization B: Accuracy & Latency Summary Comparison */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <h3>Visualization B · Paired Accuracy &amp; Latency Distribution</h3>
              <span className="metric-indicator">Near-identical latency profiles</span>
            </div>

            <div className="paired-comparison-display">
              <div className="paired-method-card">
                <div className="method-header">
                  <span className="method-tag tag-direct">NATIVE OMNI</span>
                  <h4>LFM3-Omni-2B</h4>
                  <p>Unified audiovisual transformer backbone</p>
                </div>
                <div className="method-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Accuracy</span>
                    <strong className="stat-val text-mint">25 / 40</strong>
                    <span className="stat-sub">62.5% pass rate</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Median Latency</span>
                    <strong className="stat-val text-pearl">20.919 s</strong>
                    <span className="stat-sub">p50 of 40 paired runs</span>
                  </div>
                </div>
                <div className="bar-visual">
                  <div className="bar-track">
                    <div className="bar-fill fill-mint" style={{ width: `${(25 / 40) * 100}%` }}>
                      <span>62.5%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="paired-method-card">
                <div className="method-header">
                  <span className="method-tag tag-modular">MODULAR PIPELINE</span>
                  <h4>Modular ASR → VL</h4>
                  <p>LFM3-Audio transcription + LFM3-VL reasoning</p>
                </div>
                <div className="method-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Accuracy</span>
                    <strong className="stat-val text-mint">28 / 40</strong>
                    <span className="stat-sub">70.0% pass rate (+3 cases)</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Median Latency</span>
                    <strong className="stat-val text-pearl">21.288 s</strong>
                    <span className="stat-sub">p50 of 40 paired runs</span>
                  </div>
                </div>
                <div className="bar-visual">
                  <div className="bar-track">
                    <div className="bar-fill fill-lavender" style={{ width: `${(28 / 40) * 100}%` }}>
                      <span>70.0%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Side Analytical Context Column */}
        <aside className="observatory-side-column" aria-label="Scientific Context">
          <div className="side-card">
            <span className="eyebrow">Scientific Question</span>
            <p className="side-question">
              Does decomposed multimodal processing outperform native Omni inference on the recorded paired audiovisual benchmark?
            </p>
          </div>

          <div className="side-card">
            <span className="eyebrow">Key Discoveries</span>
            <ul className="side-facts-list">
              <li>
                <strong>Spatial Hallucinations:</strong> On unanswerable queries (where the spatial relation did not exist), both models scored only 4/16 (75% failure rate), guessing arbitrary attributes.
              </li>
              <li>
                <strong>Temporal Ordering:</strong> The 4-case video temporal pilot achieved only 2/4 correct answers. Accurate audiovisual synchronization remained unproven.
              </li>
              <li>
                <strong>Latency Parity:</strong> Modular pipeline latency (21.29s) was virtually indistinguishable from Native Omni (20.92s).
              </li>
            </ul>
          </div>

          <div className="side-card caveat-card">
            <span className="eyebrow">Scientific Caveat</span>
            <p className="caveat-text">
              {p4.caveat} Exact McNemar p = 0.25 proves the +3 case difference is consistent with random variation on this 40-case sample size.
            </p>
            <a
              href="https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/docs/p4/P4_FINAL_REPORT.md"
              target="_blank"
              rel="noreferrer"
              className="source-report-link"
            >
              Read full P4 report ↗
            </a>
          </div>
        </aside>
      </div>

      <EvidenceInspectorModal
        isOpen={showInspector}
        onClose={() => setShowInspector(false)}
        title="P4 40-Case Paired Comparison"
        sourcePath="results/p4/stat_validation/p4d2_40case_comparison.csv"
        data={RESEARCH_DATA.p4}
      />
    </div>
  );
};
