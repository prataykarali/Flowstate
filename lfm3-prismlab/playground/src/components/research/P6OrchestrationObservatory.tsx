import React, { useState } from 'react';
import { RESEARCH_DATA } from '../../data/research/index.ts';
import { EvidenceInspectorModal } from './EvidenceInspectorModal.tsx';

type PipelinePath = 'text' | 'vision' | 'audio' | 'omni' | 'decision' | 'sequential_av';

interface PathInfo {
  id: PipelinePath;
  name: string;
  models: string[];
  latency: string;
  ttft: string;
  routeRule: string;
  evidenceGate: string;
}

const PIPELINE_PATHS: PathInfo[] = [
  {
    id: 'sequential_av',
    name: 'Sequential Audio → Vision (P6 Benchmark)',
    models: ['LFM3-Audio-2B (ASR)', 'LFM3-VL-2B (VLM)'],
    latency: '24.984 s',
    ttft: '24.876 s',
    routeRule: 'Audio input triggers ASR -> downstream vision question answering',
    evidenceGate: 'Directional gate halts corrupted audio before vision invocation'
  },
  {
    id: 'vision',
    name: 'Live Vision API (LFM3-VL-2B)',
    models: ['LFM3-VL-2B'],
    latency: '18.537 s',
    ttft: '14.642 s',
    routeRule: 'Image input matches {text, image} -> routes to vision',
    evidenceGate: 'Bounding box boundary and pixel range validation'
  },
  {
    id: 'text',
    name: 'Direct Text Route (LFM3-1.7B)',
    models: ['LFM3-1.7B'],
    latency: '3.20 s',
    ttft: '1.45 s',
    routeRule: 'Single text modality -> default fallback route',
    evidenceGate: 'Token length and <think> tag normalization'
  },
  {
    id: 'audio',
    name: 'Direct Audio Route (LFM3-Audio-2B)',
    models: ['LFM3-Audio-2B'],
    latency: '13.95 s',
    ttft: '1.20 s',
    routeRule: "Audio input alone -> 'audio' speech pipeline",
    evidenceGate: 'Word-count safeguard & silence detection'
  },
  {
    id: 'omni',
    name: 'Direct Omni Route (LFM3-Omni-2B)',
    models: ['LFM3-Omni-2B'],
    latency: '20.92 s',
    ttft: '20.10 s',
    routeRule: "Audio + Visual simultaneously -> 'omni'",
    evidenceGate: 'Temporal sync and spatial consistency check'
  },
  {
    id: 'decision',
    name: 'SystemOne Decision Route (d1-2B)',
    models: ['LiquidAI/d1-2B'],
    latency: '0.413 s',
    ttft: '0.226 s',
    routeRule: "task === 'decision' -> d1 SlotReader head",
    evidenceGate: 'Softmax probability threshold τ >= 0.90 gate'
  }
];

export const P6OrchestrationObservatory: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<PipelinePath>('sequential_av');
  const [showInspector, setShowInspector] = useState(false);
  const p6 = RESEARCH_DATA.p6;

  const currentPath = PIPELINE_PATHS.find(p => p.id === selectedPath) || PIPELINE_PATHS[0];

  return (
    <div className="observatory-stage" id="panel-p6" role="tabpanel" aria-labelledby="tab-p6">
      <div className="observatory-layout">
        {/* Main Stage (65-75% width) */}
        <section className="observatory-main-canvas" aria-label="P6 Orchestration Visualizations">
          <div className="canvas-header-bar">
            <div>
              <span className="eyebrow">Phase 6 · Deterministic Orchestration Engine</span>
              <h2 className="canvas-title">Multi-Model Coordination &amp; Execution Lifecycle</h2>
            </div>
            <div className="canvas-controls-group">
              <span className="dataset-badge">90 / 90 Regression Tests Passing</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInspector(true)}
              >
                Inspect Data ↗
              </button>
            </div>
          </div>

          {/* Path Selector Tabs */}
          <div className="routing-controls-panel">
            <span className="control-label">Select Pipeline Execution Pathway:</span>
            <div className="toggle-chip-group">
              {PIPELINE_PATHS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`toggle-chip ${selectedPath === p.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedPath(p.id)}
                >
                  {p.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Visualization A: Animated Execution Pipeline Stages */}
          <div className="viz-subpanel" style={{ marginTop: 18 }}>
            <div className="subpanel-title-row">
              <h3>Visualization A · End-to-End Orchestration Flow</h3>
              <span className="metric-indicator">Deterministic IPC &amp; Local FastAPI Runtime</span>
            </div>

            <div className="pipeline-flow-diagram">
              {p6.architecture.map((st, idx) => {
                const isModelStage = st.stage === 'Inference';
                const isEvidenceStage = st.stage === 'Evidence Gate';

                return (
                  <React.Fragment key={st.stage}>
                    <div className={`pipeline-stage-node ${isModelStage ? 'is-highlight' : ''}`}>
                      <div className="node-step">0{idx + 1}</div>
                      <strong className="node-title">{st.stage}</strong>
                      <p className="node-desc">{st.desc}</p>
                      {isModelStage && (
                        <div className="model-chip-tag" title={currentPath.models.join(' → ')}>
                          {currentPath.models.join(' → ')}
                        </div>
                      )}
                      {isEvidenceStage && (
                        <div className="gate-chip-tag">
                          Guard Active
                        </div>
                      )}
                    </div>
                    {idx < p6.architecture.length - 1 && (
                      <div className="pipeline-connector" aria-hidden="true">
                        <div className="connector-line" />
                        <span className="connector-arrow">▶</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Visualization B: Trace & Timing Instrumentation */}
          <div className="viz-subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-title-row">
              <div>
                <h3>Visualization B · Recorded Latency Trace &amp; Timing Breakdown</h3>
                <p className="subpanel-desc">
                  Active pathway telemetry recorded on local CPU server (<code>127.0.0.1:8180</code>).
                </p>
              </div>
              <span className="source-tag">docs/p6/README.md</span>
            </div>

            <div className="trace-telemetry-card">
              <div className="trace-head">
                <div>
                  <span className="trace-label">ACTIVE PATHWAY</span>
                  <h4>{currentPath.name}</h4>
                  <small>Rule: {currentPath.routeRule}</small>
                </div>
                <div className="trace-stats-row">
                  <div className="trace-stat">
                    <span>TTFT</span>
                    <strong>{currentPath.ttft}</strong>
                  </div>
                  <div className="trace-stat">
                    <span>Total Latency</span>
                    <strong className="text-mint">{currentPath.latency}</strong>
                  </div>
                </div>
              </div>

              <div className="trace-stages-list">
                <div className="trace-row">
                  <span className="trace-row-name">Inbound Request &amp; Validation</span>
                  <span className="trace-row-status text-mint">HTTP 200 · Validated</span>
                  <span className="trace-row-time">~0.012 s</span>
                </div>
                <div className="trace-row">
                  <span className="trace-row-name">Deterministic Capability Router</span>
                  <span className="trace-row-status text-mint">Set Match Resolved</span>
                  <span className="trace-row-time">&lt;0.001 s (O(1))</span>
                </div>
                <div className="trace-row is-active-stage">
                  <span className="trace-row-name">Model Execution ({currentPath.models.join(', ')})</span>
                  <span className="trace-row-status text-lavender">CPU Inference Active</span>
                  <span className="trace-row-time">{currentPath.latency}</span>
                </div>
                <div className="trace-row">
                  <span className="trace-row-name">Evidence Verification Gate</span>
                  <span className="trace-row-status text-mint">{currentPath.evidenceGate}</span>
                  <span className="trace-row-time">~0.005 s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Software Regression Note */}
          <div className="clarification-banner">
            <span className="clarification-badge">AUDIT DISCLOSURE</span>
            <p>
              {p6.assertionClarification} The 90 passing test cases confirm determinism, HTTP socket behavior, error recovery, and payload schemas across the 6 models.
            </p>
          </div>
        </section>

        {/* Side Analytical Context Column */}
        <aside className="observatory-side-column" aria-label="Scientific Context">
          <div className="side-card">
            <span className="eyebrow">Scientific Question</span>
            <p className="side-question">
              How do six models coordinate through a deterministic multimodal router, and where does processing latency arise?
            </p>
          </div>

          <div className="side-card">
            <span className="eyebrow">Validation Metrics</span>
            <ul className="side-facts-list">
              <li>
                <strong>Direct Local Inference:</strong> 6 of 6 models verified on direct CPU inference.
              </li>
              <li>
                <strong>Orchestrated Inference:</strong> 6 of 6 models executed via the unified HTTP router.
              </li>
              <li>
                <strong>Sequential Pipeline:</strong> Audio → Vision correctly returned answer "Blue" in 24.984s (TTFT 24.876s).
              </li>
              <li>
                <strong>Live Vision API:</strong> HTTP 200 returned in 18.537s (TTFT 14.642s).
              </li>
            </ul>
          </div>

          <div className="side-card caveat-card">
            <span className="eyebrow">Scientific Caveat</span>
            <p className="caveat-text">
              {p6.caveat} Local CPU inference requires model swapping when running sequential pipelines. An evidence gate cannot independently verify that upstream ASR recognized speech accurately.
            </p>
            <a
              href="https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/docs/p6/README.md"
              target="_blank"
              rel="noreferrer"
              className="source-report-link"
            >
              Read full P6 report ↗
            </a>
          </div>
        </aside>
      </div>

      <EvidenceInspectorModal
        isOpen={showInspector}
        onClose={() => setShowInspector(false)}
        title="P6 Unified Orchestration Evidence"
        sourcePath="docs/p6/README.md"
        data={RESEARCH_DATA.p6}
      />
    </div>
  );
};
