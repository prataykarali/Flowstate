import React, { useState } from 'react';
import { RESEARCH_DATA } from '../../data/research/index.ts';
import { EvidenceInspectorModal } from './EvidenceInspectorModal.tsx';

export const P2VisionObservatory: React.FC = () => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('04');
  const [showInspector, setShowInspector] = useState(false);
  const p2 = RESEARCH_DATA.p2;
  const selectedCase = p2.cases.find(c => c.id === selectedCaseId) || p2.cases[0];

  return (
    <div className="observatory-stage" id="panel-p2" role="tabpanel" aria-labelledby="tab-p2">
      <div className="observatory-layout">
        {/* Main Stage (65-75% width) */}
        <section className="observatory-main-canvas" aria-label="P2 Vision and OCR Visualizations">
          <div className="canvas-header-bar">
            <div>
              <span className="eyebrow">Phase 2 · Empirical Comparison</span>
              <h2 className="canvas-title">Direct Vision-Language vs. Modular Cascade</h2>
            </div>
            <div className="canvas-controls-group">
              <span className="dataset-badge">n=10 Synthetic Pilot</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInspector(true)}
              >
                Inspect Data ↗
              </button>
            </div>
          </div>

          {/* Visualization A: Direct vs Modular Paired Latency & Accuracy Plot */}
          <div className="viz-subpanel">
            <div className="subpanel-title-row">
              <h3>Visualization A · End-to-End Latency &amp; Accuracy Comparison</h3>
              <span className="metric-indicator">Lower latency is better · Higher accuracy is better</span>
            </div>

            <div className="paired-comparison-display">
              {/* Direct VL Model */}
              <div className="paired-method-card is-winner">
                <div className="method-header">
                  <span className="method-tag tag-direct">DIRECT ARCHITECTURE</span>
                  <h4>LFM3-VL-2B (Direct)</h4>
                  <p>Single-stage image-to-answer inference</p>
                </div>
                <div className="method-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Exact Match</span>
                    <strong className="stat-val text-mint">10 / 10</strong>
                    <span className="stat-sub">100% on synthetic set</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Median Latency</span>
                    <strong className="stat-val text-pearl">38.53 s</strong>
                    <span className="stat-sub">Range: 35.31s – 51.85s</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Median TTFT</span>
                    <strong className="stat-val">37.32 s</strong>
                    <span className="stat-sub">Single model execution</span>
                  </div>
                </div>
                {/* SVG Latency Bar */}
                <div className="bar-visual">
                  <div className="bar-track">
                    <div className="bar-fill fill-mint" style={{ width: `${(38.53 / 70) * 100}%` }}>
                      <span>38.53s</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modular Cascade Model */}
              <div className="paired-method-card">
                <div className="method-header">
                  <span className="method-tag tag-modular">MODULAR CASCADE</span>
                  <h4>LFM3-VL OCR → LFM3-1.7B Text</h4>
                  <p>Two-stage transcript extraction + QA</p>
                </div>
                <div className="method-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Exact Match</span>
                    <strong className="stat-val text-gold">9 / 10</strong>
                    <span className="stat-sub">1 token budget failure</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Median Latency</span>
                    <strong className="stat-val text-pearl">65.72 s</strong>
                    <span className="stat-sub">+70.6% slower cascade</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Inter-stage Switch</span>
                    <strong className="stat-val">~14.5 s</strong>
                    <span className="stat-sub">Downstream generation</span>
                  </div>
                </div>
                {/* SVG Latency Bar */}
                <div className="bar-visual">
                  <div className="bar-track">
                    <div className="bar-fill fill-lavender" style={{ width: `${(65.72 / 70) * 100}%` }}>
                      <span>65.72s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization B: Resolution Ablation (TTFT vs Total Latency) */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization B · Resolution Scaling Ablation</h3>
                <p className="subpanel-desc">
                  Resolution scaling directly reduces Time to First Token (TTFT) and total processing time while preserving text legibility.
                </p>
              </div>
              <span className="source-tag">p2_n2_resolution_ablation.csv</span>
            </div>

            <div className="resolution-chart-container">
              <svg viewBox="0 0 680 180" className="resolution-svg" role="img" aria-label="Resolution scaling vs TTFT and total latency">
                {/* Axis lines */}
                <line x1="80" y1="20" x2="80" y2="140" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <line x1="80" y1="140" x2="650" y2="140" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <text x="35" y="80" fill="rgba(255,255,255,0.5)" fontSize="10" transform="rotate(-90 35,80)">Latency (s)</text>

                {/* Grid ticks */}
                {[0, 10, 20, 30].map(val => {
                  const y = 140 - (val / 30) * 115;
                  return (
                    <g key={val}>
                      <line x1="75" y1={y} x2="650" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <text x="70" y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="10">{val}s</text>
                    </g>
                  );
                })}

                {/* Plot points & bars for each resolution */}
                {p2.resolutionAblation.map((item, idx) => {
                  const x = 160 + idx * 190;
                  const totalH = (item.totalS / 30) * 115;
                  const ttftH = (item.ttftS / 30) * 115;
                  return (
                    <g key={item.resolution} className="ablation-group">
                      {/* Total Latency Bar */}
                      <rect
                        x={x - 28}
                        y={140 - totalH}
                        width="24"
                        height={totalH}
                        rx="4"
                        fill="rgba(192, 132, 252, 0.45)"
                        stroke="#c084fc"
                        strokeWidth="1"
                      />
                      <text x={x - 16} y={135 - totalH} textAnchor="middle" fill="#f5e8ff" fontSize="10" fontWeight="700">
                        {item.totalS}s
                      </text>

                      {/* TTFT Bar */}
                      <rect
                        x={x + 2}
                        y={140 - ttftH}
                        width="24"
                        height={ttftH}
                        rx="4"
                        fill="rgba(117, 239, 220, 0.55)"
                        stroke="#75efdc"
                        strokeWidth="1"
                      />
                      <text x={x + 14} y={135 - ttftH} textAnchor="middle" fill="#e0fff9" fontSize="10" fontWeight="700">
                        {item.ttftS}s
                      </text>

                      {/* X label */}
                      <text x={x} y="156" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">
                        {item.resolution}
                      </text>
                      <text x={x} y="170" textAnchor="middle" fill="#ffe182" fontSize="9.5">
                        scale: {item.scale}x · Pass
                      </text>
                    </g>
                  );
                })}

                {/* Legend */}
                <g transform="translate(480, 25)">
                  <rect x="0" y="0" width="12" height="12" rx="3" fill="#c084fc" />
                  <text x="18" y="10" fill="#f5e8ff" fontSize="10">Total Latency</text>
                  <rect x="90" y="0" width="12" height="12" rx="3" fill="#75efdc" />
                  <text x="108" y="10" fill="#e0fff9" fontSize="10">TTFT</text>
                </g>
              </svg>
            </div>
          </div>

          {/* Visualization C: Case Explorer & Critical Failure Showcase */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization C · 10-Case Document Explorer</h3>
                <p className="subpanel-desc">
                  Select any test document to inspect ground truth, direct OCR recall, downstream pipeline output, and execution logs.
                </p>
              </div>
              <span className="source-tag">p2_n3_full_results.csv</span>
            </div>

            {/* Case selector strip */}
            <div className="case-selector-strip" role="tablist" aria-label="Select P2 Test Case">
              {p2.cases.map(c => {
                const isSelected = c.id === selectedCaseId;
                const isFailed = !c.pipelineExact;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`case-select-btn ${isSelected ? 'is-selected' : ''} ${isFailed ? 'has-failure' : ''}`}
                    onClick={() => setSelectedCaseId(c.id)}
                  >
                    <span className="case-num">#{c.id}</span>
                    <span className="case-name">{c.filename.replace('.png', '')}</span>
                    {isFailed && <span className="failure-dot" title="Pipeline Exact Match Failed" />}
                  </button>
                );
              })}
            </div>

            {/* Selected Case Inspection Card */}
            <div className="case-detail-card">
              <div className="case-detail-head">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span className="case-badge">CASE #{selectedCase.id}</span>
                  <h4>{selectedCase.filename}</h4>
                  <span className="case-cat-pill">{selectedCase.category} · {selectedCase.difficulty}</span>
                </div>
                <div className="case-outcomes-pill">
                  <span className={selectedCase.directExact ? 'outcome-pass' : 'outcome-fail'}>
                    Direct: {selectedCase.directExact ? 'PASS' : 'FAIL'}
                  </span>
                  <span className={selectedCase.pipelineExact ? 'outcome-pass' : 'outcome-fail'}>
                    Modular: {selectedCase.pipelineExact ? 'PASS' : 'FAIL (length)'}
                  </span>
                </div>
              </div>

              {/* Case 04 Prominent Caution Callout */}
              {selectedCase.id === '04' && (
                <div className="failure-spotlight-box">
                  <div className="spotlight-icon">⚠️</div>
                  <div className="spotlight-body">
                    <strong>CRITICAL DISCOVERY · Downstream Cascade Token Exhaustion</strong>
                    <p>
                      In <code>04_lab_schedule.png</code>, the vision OCR stage achieved perfect 4/4 phrase recall (1.0), successfully extracting the schedule text:
                      <br />
                      <em>"WEEKLY LAB SCHEDULE | Robotics Lab | 14:00 - 15:30 | D-412"</em>.
                      <br />
                      However, when piped to the downstream LFM3-1.7B language model, text generation reached the token length limit (<code>text_finish_reason: length</code>) after 85.95 seconds and produced an empty string.
                      Direct VL answered <strong>14:00 - 15:30</strong> correctly in 48.26s without serialization overhead.
                    </p>
                  </div>
                </div>
              )}

              <div className="case-comparison-grid">
                <div className="case-data-column">
                  <span className="col-label">Question &amp; Expected Answer</span>
                  <p className="case-question">"{selectedCase.question}"</p>
                  <div className="expected-pill">
                    Expected: <strong>{selectedCase.expectedAnswer}</strong>
                  </div>

                  <div className="ocr-transcript-box">
                    <span className="sub-label">OCR Stage Transcript (Recall: {selectedCase.ocrPhraseRecall * 100}%)</span>
                    <pre><code>{selectedCase.ocrText}</code></pre>
                  </div>
                </div>

                <div className="case-data-column">
                  <div className="output-row">
                    <span className="col-label">Direct VL Output:</span>
                    <strong className={selectedCase.directExact ? 'text-mint' : 'text-rose'}>
                      {selectedCase.directAnswer || '(none)'}
                    </strong>
                    <span className="latency-annotation">
                      Latency: {selectedCase.directLatencyS}s · TTFT: {selectedCase.directTtftS}s
                    </span>
                  </div>

                  <div className="output-row" style={{ marginTop: 12 }}>
                    <span className="col-label">Modular Pipeline Output:</span>
                    <strong className={selectedCase.pipelineExact ? 'text-mint' : 'text-rose'}>
                      {selectedCase.pipelineAnswer || '(empty / token exhausted)'}
                    </strong>
                    <span className="latency-annotation">
                      Total: {selectedCase.pipelineLatencyS}s (OCR: {selectedCase.ocrLatencyS}s + Text: {selectedCase.textLatencyS}s)
                    </span>
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
              Is direct image-to-answer generation better than a two-stage OCR-to-text pipeline under the tested conditions?
            </p>
          </div>

          <div className="side-card">
            <span className="eyebrow">Key Observations</span>
            <ul className="side-facts-list">
              <li>
                <strong>Downstream Cascades:</strong> Modular pipelines fail when downstream generation encounters context exhaustion, even with perfect OCR extraction.
              </li>
              <li>
                <strong>Latency Edge:</strong> Direct LFM3-VL-2B was 1.7x faster than the modular cascade (38.53s vs 65.72s median).
              </li>
              <li>
                <strong>Resolution Scaling:</strong> Halving image resolution reduced TTFT by 45.3% (28.01s → 15.33s) without degrading extraction accuracy on synthetic posters.
              </li>
            </ul>
          </div>

          <div className="side-card caveat-card">
            <span className="eyebrow">Scientific Caveat</span>
            <p className="caveat-text">
              {p2.caveat} Synthetic document evaluations cannot establish commercial OCR accuracy under real-world distortions, handwritten text, or uneven document lighting.
            </p>
            <a
              href="https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/docs/p2/README.md"
              target="_blank"
              rel="noreferrer"
              className="source-report-link"
            >
              Read full P2 report ↗
            </a>
          </div>
        </aside>
      </div>

      <EvidenceInspectorModal
        isOpen={showInspector}
        onClose={() => setShowInspector(false)}
        title="P2 Vision and OCR Benchmark Results"
        sourcePath="results/p2_n3_ocr_benchmark/p2_n3_full_results.csv"
        data={RESEARCH_DATA.p2}
      />
    </div>
  );
};
