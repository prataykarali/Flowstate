import React, { useState } from 'react';
import { RESEARCH_DATA } from '../../data/research/index.ts';
import { EvidenceInspectorModal } from './EvidenceInspectorModal.tsx';

type TaskType = 'chat' | 'decision' | 'speech';
type Modality = 'text' | 'image' | 'video' | 'audio';

// Canonical routing function directly mirroring prismlab/core/router.py
function evaluateRoute(task: TaskType, inputs: Set<Modality>): { model: string; ruleName: string; ruleCode: string } {
  if (task === 'decision') {
    if (inputs.has('audio')) {
      return { model: 'd1_omni', ruleName: 'Decision with Audio', ruleCode: "task === 'decision' && 'audio' in inputs -> 'd1_omni'" };
    }
    return { model: 'd1', ruleName: 'Decision without Audio', ruleCode: "task === 'decision' -> 'd1'" };
  }

  if (task === 'speech') {
    if (inputs.has('image') || inputs.has('video')) {
      return { model: 'omni', ruleName: 'Speech with Visuals', ruleCode: "task === 'speech' && (image || video) -> 'omni'" };
    }
    return { model: 'audio', ruleName: 'Speech without Visuals', ruleCode: "task === 'speech' -> 'audio'" };
  }

  const hasAudio = inputs.has('audio');
  const hasVisual = inputs.has('image') || inputs.has('video');

  if (hasAudio && hasVisual) {
    return { model: 'omni', ruleName: 'Audio + Visual Multimodal', ruleCode: "'audio' in inputs && (image || video) in inputs -> 'omni'" };
  }

  if (hasAudio) {
    return { model: 'audio', ruleName: 'Audio Input Alone', ruleCode: "'audio' in inputs -> 'audio'" };
  }

  if (hasVisual) {
    return { model: 'vision', ruleName: 'Visual Input Alone', ruleCode: "(image || video) in inputs -> 'vision'" };
  }

  return { model: 'text', ruleName: 'Default Text Fallback', ruleCode: "default fallback -> 'text'" };
}

const MODEL_DETAILS: Record<string, { name: string; repo: string; color: string; desc: string }> = {
  text: { name: 'LFM3-1.7B', repo: 'LiquidAI/LFM3-1.7B', color: '#75efdc', desc: 'Text-only hybrid recurrent-transformer' },
  vision: { name: 'LFM3-VL-2B', repo: 'LiquidAI/LFM3-VL-2B', color: '#60a5fa', desc: '14-layer vision encoder + text backbone' },
  audio: { name: 'LFM3-Audio-2B', repo: 'LiquidAI/LFM3-Audio-2B', color: '#f472b6', desc: '17-layer audio encoder + speech dialogue' },
  omni: { name: 'LFM3-Omni-2B', repo: 'LiquidAI/LFM3-Omni-2B', color: '#c084fc', desc: 'End-to-end multimodal perception' },
  d1: { name: 'd1-2B', repo: 'LiquidAI/d1-2B', color: '#fbbf24', desc: 'SystemOne SlotReader decision head' },
  d1_omni: { name: 'd1-Omni-2B', repo: 'LiquidAI/d1-Omni-2B', color: '#34d399', desc: 'Omni decision model with audio perception' }
};

export const P1RoutingObservatory: React.FC = () => {
  const [task, setTask] = useState<TaskType>('chat');
  const [inputs, setInputs] = useState<Set<Modality>>(new Set(['text', 'image']));
  const [activeAssertion, setActiveAssertion] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  const toggleInput = (mod: Modality) => {
    setInputs(prev => {
      const next = new Set(prev);
      if (next.has(mod)) {
        if (next.size > 1) next.delete(mod); // keep at least 1
      } else {
        next.add(mod);
      }
      return next;
    });
  };

  const currentResult = evaluateRoute(task, inputs);
  const selectedModelInfo = MODEL_DETAILS[currentResult.model];

  const handleAssertionClick = (a: { task: string; inputs: string[]; id: string }) => {
    setTask(a.task as TaskType);
    setInputs(new Set(a.inputs as Modality[]));
    setActiveAssertion(a.id);
  };

  return (
    <div className="observatory-stage" id="panel-p1" role="tabpanel" aria-labelledby="tab-p1">
      {/* Editorial Overview Column & Stage */}
      <div className="observatory-layout">
        {/* Main Interactive Visualization Area (65-75% width) */}
        <section className="observatory-main-canvas" aria-label="Interactive Routing Topology">
          <div className="canvas-header-bar">
            <div>
              <span className="eyebrow">Topology Simulator · prismlab/core/router.py</span>
              <h2 className="canvas-title">Set-Theoretic Routing Topology</h2>
            </div>
            <div className="canvas-controls-group">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInspector(true)}
              >
                Inspect Data ↗
              </button>
            </div>
          </div>

          {/* Interactive Modality & Task Controls */}
          <div className="routing-controls-panel">
            <div className="routing-control-section">
              <span className="control-label">Task Condition:</span>
              <div className="toggle-chip-group">
                {(['chat', 'speech', 'decision'] as TaskType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`toggle-chip ${task === t ? 'is-active' : ''}`}
                    onClick={() => { setTask(t); setActiveAssertion(null); }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="routing-control-section">
              <span className="control-label">Input Modalities:</span>
              <div className="toggle-chip-group">
                {(['text', 'image', 'video', 'audio'] as Modality[]).map(mod => {
                  const isChecked = inputs.has(mod);
                  return (
                    <button
                      key={mod}
                      type="button"
                      className={`toggle-chip ${isChecked ? 'is-active' : ''}`}
                      onClick={() => { toggleInput(mod); setActiveAssertion(null); }}
                    >
                      {isChecked ? '✓ ' : '+ '}{mod}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SVG Topology Network */}
          <div className="topology-svg-container">
            <svg viewBox="0 0 760 340" className="topology-svg" role="img" aria-label="Six-model routing topology visualization">
              <defs>
                <linearGradient id="activeBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#75efdc" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#c084fc" stopOpacity="1" />
                  <stop offset="100%" stopColor="#ffd766" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background grid */}
              <g className="svg-grid-lines" stroke="rgba(255,255,255,0.06)" strokeWidth="1">
                {[50, 100, 150, 200, 250, 300].map(y => (
                  <line key={y} x1="30" y1={y} x2="730" y2={y} />
                ))}
                {[140, 290, 470, 620].map(x => (
                  <line key={x} x1={x} y1="20" x2={x} y2="320" />
                ))}
              </g>

              {/* Input Nodes (Left) */}
              <g className="topology-inputs">
                {['text', 'image', 'video', 'audio'].map((mod, i) => {
                  const isSelected = inputs.has(mod as Modality);
                  const y = 60 + i * 65;
                  return (
                    <g key={mod} className={`input-node ${isSelected ? 'is-selected' : 'is-dimmed'}`}>
                      <rect
                        x="30"
                        y={y - 18}
                        width="85"
                        height="36"
                        rx="8"
                        fill={isSelected ? 'rgba(117, 239, 220, 0.16)' : 'rgba(255,255,255,0.03)'}
                        stroke={isSelected ? '#75efdc' : 'rgba(255,255,255,0.15)'}
                        strokeWidth={isSelected ? '1.8' : '1'}
                      />
                      <text x="72" y={y + 5} textAnchor="middle" fill={isSelected ? '#ffffff' : 'rgba(255,255,255,0.45)'} fontSize="12" fontWeight="700">
                        {mod.toUpperCase()}
                      </text>
                      {/* Connection line from input to Router */}
                      <path
                        d={`M 115 ${y} C 180 ${y}, 210 160, 260 160`}
                        fill="none"
                        stroke={isSelected ? '#75efdc' : 'rgba(255,255,255,0.08)'}
                        strokeWidth={isSelected ? 2 : 1}
                        strokeDasharray={isSelected ? '4 3' : 'none'}
                        opacity={isSelected ? 0.9 : 0.3}
                      />
                    </g>
                  );
                })}
              </g>

              {/* Router Node (Center) */}
              <g className="topology-router" transform="translate(260, 120)">
                <rect
                  x="0"
                  y="0"
                  width="130"
                  height="80"
                  rx="14"
                  fill="rgba(30, 20, 55, 0.85)"
                  stroke="#c084fc"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
                <text x="65" y="28" textAnchor="middle" fill="#ffe182" fontSize="10" fontWeight="800" letterSpacing="0.08em">
                  ROUTER ENGINE
                </text>
                <text x="65" y="47" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="800">
                  {task.toUpperCase()}
                </text>
                <text x="65" y="65" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="9.5">
                  Set-Theoretic Logic
                </text>
              </g>

              {/* Six Model Pathways (Right) */}
              <g className="topology-targets">
                {Object.entries(MODEL_DETAILS).map(([key, details], i) => {
                  const y = 35 + i * 48;
                  const isTarget = currentResult.model === key;
                  return (
                    <g key={key} className={`model-target ${isTarget ? 'is-target' : 'is-idle'}`}>
                      {/* Connection path from Router to Model */}
                      <path
                        d={`M 390 160 C 440 160, 480 ${y + 16}, 530 ${y + 16}`}
                        fill="none"
                        stroke={isTarget ? details.color : 'rgba(255,255,255,0.1)'}
                        strokeWidth={isTarget ? 3 : 1}
                        opacity={isTarget ? 1 : 0.25}
                        filter={isTarget ? 'url(#glow)' : undefined}
                      />
                      <rect
                        x="530"
                        y={y}
                        width="190"
                        height="34"
                        rx="8"
                        fill={isTarget ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)'}
                        stroke={isTarget ? details.color : 'rgba(255,255,255,0.12)'}
                        strokeWidth={isTarget ? '2' : '1'}
                      />
                      <circle cx="546" cy={y + 17} r="5" fill={isTarget ? details.color : 'rgba(255,255,255,0.2)'} />
                      <text x="560" y={y + 16} fill={isTarget ? '#ffffff' : 'rgba(255,255,255,0.6)'} fontSize="12" fontWeight="700">
                        {details.name}
                      </text>
                      <text x="560" y={y + 28} fill={isTarget ? details.color : 'rgba(255,255,255,0.35)'} fontSize="9">
                        key: {key}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Active Rule Attribution */}
          <div className="active-rule-bar">
            <div className="rule-badge">Matched Rule</div>
            <div className="rule-details">
              <strong>{currentResult.ruleName}</strong>
              <code>{currentResult.ruleCode}</code>
            </div>
            <div className="rule-destination">
              <span>Resolved Model:</span>
              <strong style={{ color: selectedModelInfo.color }}>{selectedModelInfo.name}</strong>
            </div>
          </div>
        </section>

        {/* Side Analytical Context Column (25-35% width) */}
        <aside className="observatory-side-column" aria-label="Scientific Context and Verified Tests">
          <div className="side-card">
            <span className="eyebrow">Scientific Question</span>
            <p className="side-question">
              How does deterministic capability-based routing select one of six model pathways without non-deterministic agent dispatch?
            </p>
          </div>

          <div className="side-card">
            <span className="eyebrow">Router Contract</span>
            <ul className="side-facts-list">
              <li>
                <strong>Determinism:</strong> Zero LLM latency for model selection; relies on pure set inclusion ($I \subseteq \text{inputs}$).
              </li>
              <li>
                <strong>Model Isolation:</strong> Specialized models maintain strict interface boundaries rather than sharing a bloated monolith.
              </li>
              <li>
                <strong>Software Assertions:</strong> 7 test cases in <code>tests/test_router.py</code> verify all routing branches.
              </li>
            </ul>
          </div>

          <div className="side-card">
            <div className="side-card-head">
              <span className="eyebrow">7 Validated Assertions</span>
              <small className="nature-note">Software tests, not accuracy</small>
            </div>
            <p className="side-note-text">
              Click an assertion to simulate its inputs in the topology canvas:
            </p>
            <div className="assertion-pills-list">
              {RESEARCH_DATA.p1.assertions.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`assertion-pill ${activeAssertion === a.id ? 'is-active' : ''}`}
                  onClick={() => handleAssertionClick(a)}
                >
                  <span className="pill-id">{a.id}</span>
                  <span className="pill-route">{a.task} + [{a.inputs.join(', ')}] → {a.expected}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="side-card caveat-card">
            <span className="eyebrow">Caveat &amp; Limit</span>
            <p className="caveat-text">
              The 7/7 passed assertions test software control flow and routing contracts. They do not measure the semantic reasoning or response quality of the underlying neural models.
            </p>
            <a
              href="https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/docs/p1/README.md"
              target="_blank"
              rel="noreferrer"
              className="source-report-link"
            >
              Read full P1 report ↗
            </a>
          </div>
        </aside>
      </div>

      <EvidenceInspectorModal
        isOpen={showInspector}
        onClose={() => setShowInspector(false)}
        title="P1 Capability Routing Specifications"
        sourcePath="prismlab/core/router.py"
        data={RESEARCH_DATA.p1}
      />
    </div>
  );
};
