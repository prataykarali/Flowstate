import React, { useState } from 'react';
import { RESEARCH_DATA } from '../../data/research/index.ts';
import { EvidenceInspectorModal } from './EvidenceInspectorModal.tsx';

type CategoryFilter = 'all' | 'Grounding' | 'Spatial' | 'Knowledge' | 'Instruction' | 'Linguistic';

export const P3AudioObservatory: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('G02');
  const [showInspector, setShowInspector] = useState(false);
  const p3 = RESEARCH_DATA.p3;

  const selectedEvaluations = p3.evaluations.filter(e => e.id === selectedCaseId);

  return (
    <div className="observatory-stage" id="panel-p3" role="tabpanel" aria-labelledby="tab-p3">
      <div className="observatory-layout">
        {/* Main Stage (65-75% width) */}
        <section className="observatory-main-canvas" aria-label="P3 Audio Intelligence Visualizations">
          <div className="canvas-header-bar">
            <div>
              <span className="eyebrow">Phase 3 · Speech-to-Speech Streaming</span>
              <h2 className="canvas-title">Native S2S vs. Modular Pipeline Reliability</h2>
            </div>
            <div className="canvas-controls-group">
              <span className="dataset-badge">25 Cases · 75 Evaluations</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInspector(true)}
              >
                Inspect Data ↗
              </button>
            </div>
          </div>

          {/* Three-Method Comparative Stat Ribbon */}
          <div className="audio-stat-trio">
            {/* Native S2S */}
            <div className="audio-trio-card is-leading">
              <div className="trio-head">
                <span className="method-pill native-pill">NATIVE S2S</span>
                <h4>LFM3-Audio-2B</h4>
              </div>
              <div className="trio-metrics">
                <div>
                  <span className="metric-num text-mint">24 / 25</span>
                  <span className="metric-lbl">Strict Success (96%)</span>
                </div>
                <div>
                  <span className="metric-num text-pearl">13.95 s</span>
                  <span className="metric-lbl">Median Latency (n=23 timed)</span>
                </div>
              </div>
              <p className="trio-note">Direct speech representation without intermediate phoneme serialization.</p>
            </div>

            {/* Modular V2.1 */}
            <div className="audio-trio-card">
              <div className="trio-head">
                <span className="method-pill v21-pill">MODULAR V2.1</span>
                <h4>ASR → Text → TTS</h4>
              </div>
              <div className="trio-metrics">
                <div>
                  <span className="metric-num text-mint">22 / 25</span>
                  <span className="metric-lbl">Strict Success (88%)</span>
                </div>
                <div>
                  <span className="metric-num text-pearl">20.18 s</span>
                  <span className="metric-lbl">Median Latency (n=24 timed)</span>
                </div>
              </div>
              <p className="trio-note">Refined prompt grounding &amp; 25-word guardrail; +44.6% slower than native.</p>
            </div>

            {/* Modular V1 */}
            <div className="audio-trio-card">
              <div className="trio-head">
                <span className="method-pill v1-pill">MODULAR V1</span>
                <h4>Baseline Cascade</h4>
              </div>
              <div className="trio-metrics">
                <div>
                  <span className="metric-num text-gold">19 / 25</span>
                  <span className="metric-lbl">Strict Success (76%)</span>
                </div>
                <div>
                  <span className="metric-num text-pearl">27.70 s</span>
                  <span className="metric-lbl">Median Latency (n=23 timed)</span>
                </div>
              </div>
              <p className="trio-note">Vulnerable to XML tag leakage and verbosity runaways; 2x slower than native.</p>
            </div>
          </div>

          {/* Visualization A: Latency Distribution Plot with Individual Timed Samples */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization A · Latency Distribution by Architecture</h3>
                <p className="subpanel-desc">
                  Individual timed sample points plotted along the continuous latency axis. Solid vertical diamonds mark recorded medians.
                </p>
              </div>
              <span className="source-tag">p36_reconciled_graded.csv (n=70 timed)</span>
            </div>

            <div className="latency-dotplot-container">
              <svg viewBox="0 0 700 200" className="latency-dotplot-svg" role="img" aria-label="Audio latency distribution dot plot">
                {/* Horizontal scale */}
                <line x1="120" y1="160" x2="660" y2="160" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                {[0, 20, 40, 60, 80, 100].map(val => {
                  const x = 120 + (val / 100) * 540;
                  return (
                    <g key={val}>
                      <line x1={x} y1="156" x2={x} y2="164" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                      <line x1={x} y1="20" x2={x} y2="156" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      <text x={x} y="180" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">{val}s</text>
                    </g>
                  );
                })}
                <text x="390" y="196" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9.5">End-to-End Latency (seconds)</text>

                {/* Rows for Native, Modular V2.1, Modular V1 */}
                {[
                  { key: 'native', label: 'Native S2S', y: 48, color: '#75efdc', median: 13.95, timed: 23, total: 25 },
                  { key: 'modular_v21', label: 'Modular V2.1', y: 92, color: '#c084fc', median: 20.18, timed: 24, total: 25 },
                  { key: 'modular', label: 'Modular V1', y: 136, color: '#f472b6', median: 27.70, timed: 23, total: 25 }
                ].map(row => {
                  const archEvals = p3.evaluations.filter(e => e.architecture === row.key && e.totalS !== null);
                  const medianX = 120 + (row.median / 100) * 540;

                  return (
                    <g key={row.key} className="dotplot-row">
                      {/* Row Label */}
                      <text x="110" y={row.y + 4} textAnchor="end" fill="#ffffff" fontSize="11" fontWeight="700">
                        {row.label}
                      </text>
                      <text x="110" y={row.y + 16} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="9">
                        n={row.timed} timed
                      </text>

                      {/* Row centerline */}
                      <line x1="120" y1={row.y} x2="660" y2={row.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />

                      {/* Individual plotted points */}
                      {archEvals.map((e, idx) => {
                        const px = 120 + (Math.min(e.totalS || 0, 100) / 100) * 540;
                        // Jitter slightly based on index
                        const py = row.y + ((idx % 3) - 1) * 6;
                        return (
                          <circle
                            key={`${e.id}-${idx}`}
                            cx={px}
                            cy={py}
                            r="4"
                            fill={row.color}
                            fillOpacity="0.65"
                            stroke="#ffffff"
                            strokeWidth="0.8"
                          >
                            <title>{`${e.id} (${e.category}): ${e.totalS}s`}</title>
                          </circle>
                        );
                      })}

                      {/* Median Diamond Marker */}
                      <polygon
                        points={`${medianX},${row.y - 12} ${medianX + 6},${row.y} ${medianX},${row.y + 12} ${medianX - 6},${row.y}`}
                        fill="#ffe182"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text x={medianX} y={row.y - 15} textAnchor="middle" fill="#ffe182" fontSize="10" fontWeight="800">
                        p50: {row.median}s
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Visualization B: 25-Case Reliability Matrix */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization B · 25-Case Reliability &amp; Category Matrix</h3>
                <p className="subpanel-desc">
                  Select a category or click a case code to inspect semantic correctness, strict formatting, and execution status.
                </p>
              </div>
              {/* Category Filter Chips */}
              <div className="toggle-chip-group">
                {(['all', 'Grounding', 'Spatial', 'Knowledge', 'Instruction', 'Linguistic'] as CategoryFilter[]).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`toggle-chip ${categoryFilter === cat ? 'is-active' : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="audio-matrix-scroll-wrapper">
              <table className="audio-reliability-table" role="table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Category</th>
                    <th>Native S2S</th>
                    <th>Modular V2.1</th>
                    <th>Modular V1</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {['G01', 'G02', 'G03', 'G04', 'G05', 'S01', 'S02', 'S03', 'S04', 'S05', 'F01', 'F02', 'F03', 'F04', 'F05', 'I01', 'I02', 'I03', 'I04', 'I05', 'L01', 'L02', 'L03', 'L04', 'L05'].filter(id => {
                    if (categoryFilter === 'all') return true;
                    const sample = p3.evaluations.find(e => e.id === id);
                    return sample?.category === categoryFilter;
                  }).map(id => {
                    const nat = p3.evaluations.find(e => e.id === id && e.architecture === 'native');
                    const v21 = p3.evaluations.find(e => e.id === id && e.architecture === 'modular_v21');
                    const v1 = p3.evaluations.find(e => e.id === id && e.architecture === 'modular');
                    const isSelected = id === selectedCaseId;

                    return (
                      <tr
                        key={id}
                        className={`matrix-row ${isSelected ? 'is-selected-row' : ''}`}
                        onClick={() => setSelectedCaseId(id)}
                      >
                        <td className="case-id-cell">
                          <strong>{id}</strong>
                        </td>
                        <td className="cat-cell">{nat?.category}</td>
                        <td className="status-cell">
                          <span className={`status-tag ${nat?.strictTaskSuccess ? 'pass' : 'fail'}`}>
                            {nat?.strictTaskSuccess ? 'PASS' : 'FAIL'}
                          </span>
                          <small>{nat?.totalS ? `${nat.totalS.toFixed(1)}s` : 'recovered'}</small>
                        </td>
                        <td className="status-cell">
                          <span className={`status-tag ${v21?.strictTaskSuccess ? 'pass' : 'fail'}`}>
                            {v21?.strictTaskSuccess ? 'PASS' : 'FAIL'}
                          </span>
                          <small>{v21?.totalS ? `${v21.totalS.toFixed(1)}s` : 'recovered'}</small>
                        </td>
                        <td className="status-cell">
                          <span className={`status-tag ${v1?.strictTaskSuccess ? 'pass' : 'fail'}`}>
                            {v1?.strictTaskSuccess ? 'PASS' : 'FAIL'}
                          </span>
                          <small>{v1?.totalS ? `${v1.totalS.toFixed(1)}s` : 'recovered'}</small>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="inspect-btn"
                            onClick={(e) => { e.stopPropagation(); setSelectedCaseId(id); }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected Case Deep Dive Panel */}
            {selectedEvaluations.length > 0 && (
              <div className="audio-case-inspector-panel">
                <div className="panel-head">
                  <span className="case-tag">CASE INSPECTOR #{selectedCaseId}</span>
                  <h4>Question: "{selectedEvaluations[0].question}"</h4>
                  <span className="expected-badge">Expected: {selectedEvaluations[0].expected}</span>
                </div>

                <div className="case-evals-grid">
                  {selectedEvaluations.map(e => (
                    <div key={e.architecture} className={`arch-eval-card arch-${e.architecture}`}>
                      <div className="eval-card-header">
                        <span className="arch-name">
                          {e.architecture === 'native' ? 'Native S2S' : e.architecture === 'modular_v21' ? 'Modular V2.1' : 'Modular V1'}
                        </span>
                        <span className={`outcome-pill ${e.strictTaskSuccess ? 'is-pass' : 'is-fail'}`}>
                          {e.strictTaskSuccess ? 'Strict Pass' : 'Strict Fail'}
                        </span>
                      </div>
                      <p className="eval-answer">
                        "{e.answer || '(no answer generated / halted)'}"
                      </p>
                      <div className="eval-meta-row">
                        <span>Latency: <strong>{e.totalS ? `${e.totalS.toFixed(2)}s` : 'un-timed / recovered'}</strong></span>
                        <span>Semantic: <strong>{e.semanticCorrectness ? 'Correct' : 'Incorrect'}</strong></span>
                        <span>Format: <strong>{e.cleanSpeechText ? 'Clean' : 'Violated'}</strong></span>
                      </div>
                      {e.asrTranscript && (
                        <div className="eval-asr">
                          <small>ASR Transcript: {e.asrTranscript}</small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Side Analytical Context Column */}
        <aside className="observatory-side-column" aria-label="Scientific Context">
          <div className="side-card">
            <span className="eyebrow">Scientific Question</span>
            <p className="side-question">
              What are the latency, reliability, and interpretability trade-offs between native speech-to-speech and modular ASR → text → TTS?
            </p>
          </div>

          <div className="side-card">
            <span className="eyebrow">Key Findings</span>
            <ul className="side-facts-list">
              <li>
                <strong>Streaming Speed:</strong> Native S2S achieved a 13.95s median latency, 30.9% faster than Modular V2.1 (20.18s) and 49.6% faster than Modular V1 (27.70s).
              </li>
              <li>
                <strong>Guardrail Halts:</strong> Modular V2.1 case <code>G02</code> was intentionally aborted under a word-count safeguard to prevent runaway hallucinations.
              </li>
              <li>
                <strong>Format Strictness:</strong> In <code>I04</code>, Native answered <em>"No, 4 is not greater than 9."</em> Semantically 100% correct, but failed the strict solitary-token instruction.
              </li>
            </ul>
          </div>

          <div className="side-card caveat-card">
            <span className="eyebrow">Methodology &amp; Limits</span>
            <p className="caveat-text">
              {p3.caveat} Recovered cases without recorded timestamps are strictly excluded from latency statistics to prevent skewing medians.
            </p>
            <a
              href="https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/docs/p3/README.md"
              target="_blank"
              rel="noreferrer"
              className="source-report-link"
            >
              Read full P3 report ↗
            </a>
          </div>
        </aside>
      </div>

      <EvidenceInspectorModal
        isOpen={showInspector}
        onClose={() => setShowInspector(false)}
        title="P3 Speech-to-Speech Reliability Records"
        sourcePath="results/p3/reliability/p36_reconciled_graded.csv"
        data={RESEARCH_DATA.p3}
      />
    </div>
  );
};
