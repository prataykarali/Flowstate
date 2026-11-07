import React, { useState } from 'react';
import { RESEARCH_DATA } from '../../data/research/index.ts';
import { EvidenceInspectorModal } from './EvidenceInspectorModal.tsx';

interface FailureDetail {
  id: string;
  phase: string;
  title: string;
  category: string;
  observedFact: string;
  hypothesisMechanism: string;
  evidenceSource: string;
  implication: string;
}

const FAILURE_DETAILS: FailureDetail[] = [
  {
    id: 'F-P2-04',
    phase: 'P2',
    title: 'Downstream Token Budget Exhaustion in OCR Pipeline',
    category: 'Pipeline Cascading',
    observedFact: 'In 04_lab_schedule.png, the vision OCR stage achieved 4/4 phrase recall (1.0). However, the downstream language model reached text_finish_reason: "length" after 85.95 seconds and produced an empty string.',
    hypothesisMechanism: 'Intermediate OCR transcription produced dense table markup that overwhelmed the downstream context window and max generation tokens, creating a silent pipeline stall.',
    evidenceSource: 'results/p2_n3_ocr_benchmark/p2_n3_full_results.csv (Case 04)',
    implication: 'Direct end-to-end vision-language models avoid multi-stage serialization bottlenecks and downstream token budget crashes.'
  },
  {
    id: 'F-P3-I04',
    phase: 'P3',
    title: 'Strict Solitary-Token Format Instruction Violation',
    category: 'Instruction Formatting',
    observedFact: 'When instructed to answer "yes or no only", Native S2S responded "No, 4 is not greater than 9." Correct semantically, but marked as failure under exact solitary-token benchmark criteria.',
    hypothesisMechanism: 'Conversational RLHF alignment biases speech models toward polite conversational complete sentences even when provided strict single-token formatting constraints.',
    evidenceSource: 'results/p3/reliability/p36_reconciled_graded.csv (Case I04)',
    implication: 'Exact string formatting compliance should be decoupled from semantic factual correctness in speech benchmark evaluations.'
  },
  {
    id: 'F-P3-G02',
    phase: 'P3',
    title: 'Word-Length Safeguard Intentional Execution Halt',
    category: 'Guarded Aborts',
    observedFact: 'Modular V2.1 case G02 was terminated abruptly with 0 output tokens and execution_success = 0.',
    hypothesisMechanism: 'The safety pipeline detected potential runaway generation exceeding the 25-word bound and triggered an explicit hard stop to protect downstream TTS buffers.',
    evidenceSource: 'results/p3/reliability/p36_reconciled_graded.csv (Case G02)',
    implication: 'Modular architectures offer superior inspectability and safety choke points to prevent runaway infinite generation loops.'
  },
  {
    id: 'F-P4-SPATIAL',
    phase: 'P4',
    title: 'Hallucination on Absent Spatial Relationships',
    category: 'Unsupported Spatial Relations',
    observedFact: 'On 16 unanswerable queries where an object was absent (e.g. top_right_absent), both Native Omni and Modular correctly answered "unknown" in only 4 cases (75% failure rate, 12/16 hallucinated).',
    hypothesisMechanism: 'Both vision encoders attend to present objects and struggle to reason over negative space or counterfactual assertions without explicit visual absence tokens.',
    evidenceSource: 'results/p4/stat_validation/p4d2_40case_comparison.csv (H01, H02, H09, etc.)',
    implication: 'Unanswerable queries expose critical model overconfidence; presence bias remains a persistent limitation in small multimodal models.'
  },
  {
    id: 'F-P4-TEMPORAL',
    phase: 'P4',
    title: 'Video Temporal Ordering Synchronization Drift',
    category: 'Temporal Alignment',
    observedFact: 'In a 4-case exploratory video temporal pilot, the models scored only 2/4 correct on chronological sequence ordering.',
    hypothesisMechanism: 'Sub-sampling video frames at 1 fps discards micro-temporal cues, preventing accurate cross-modal timestamp alignment with speech audio tracks.',
    evidenceSource: 'docs/p4/P4_FINAL_REPORT.md (Temporal Extension Pilot)',
    implication: 'Local quantized multimodal inference cannot yet claim reliable sub-second audiovisual temporal reasoning.'
  },
  {
    id: 'F-P5-X03',
    phase: 'P5',
    title: 'High-Confidence Categorical Misclassification',
    category: 'Confidence Calibration',
    observedFact: 'In case X03, an explicit technical support query was classified as "billing" with 91.99% reported softmax confidence, auto-triggering the post-hoc 0.90 acceptance gate.',
    hypothesisMechanism: 'Softmax probabilities from quantized decision heads are poorly calibrated under out-of-distribution wording, yielding sharp peaked distributions on erroneous classes.',
    evidenceSource: 'experiments/p5/results/p5_7_integration_20261101T045955Z.jsonl (Case X03)',
    implication: 'Confidence scores must NEVER be used to authorize autonomous real-world actions without human-in-the-loop verification.'
  },
  {
    id: 'F-P6-GATE',
    phase: 'P6',
    title: 'Upstream ASR Error Propagation Through Evidence Gates',
    category: 'Evidence Uncertainty',
    observedFact: 'A downstream evidence gate cannot catch semantic ASR transcription substitutions if the transcribed text matches grammatical type contracts.',
    hypothesisMechanism: 'Evidence gates operate on schema syntax and bounding box invariants, not acoustic ground truth. Corrupted upstream phonemes pass cleanly into vision prompts.',
    evidenceSource: 'docs/p6/README.md (Limitations Section)',
    implication: 'Sequential pipelines require acoustic confidence scores passed alongside text transcripts to detect early upstream transcription failure.'
  }
];

export const FailureLabObservatory: React.FC = () => {
  const [selectedFailureId, setSelectedFailureId] = useState<string>(FAILURE_DETAILS[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showInspector, setShowInspector] = useState(false);

  const categories = ['All', ...new Set(FAILURE_DETAILS.map(f => f.category))];
  const filteredFailures = FAILURE_DETAILS.filter(f => {
    if (selectedCategory !== 'All' && f.category !== selectedCategory) return false;
    return true;
  });

  const selected = FAILURE_DETAILS.find(f => f.id === selectedFailureId) || FAILURE_DETAILS[0];

  return (
    <div className="observatory-stage" id="panel-failures" role="tabpanel" aria-labelledby="tab-failures">
      <div className="observatory-layout">
        {/* Main Stage (65-75% width) */}
        <section className="observatory-main-canvas" aria-label="Failure Lab Taxonomy & Investigation">
          <div className="canvas-header-bar">
            <div>
              <span className="eyebrow">Scientific Rigor · Negative Results</span>
              <h2 className="canvas-title">Failure Lab: Documented Failure Taxonomy</h2>
            </div>
            <div className="canvas-controls-group">
              <span className="dataset-badge">Canonical Taxonomy · 7 Key Modes</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInspector(true)}
              >
                Inspect Data ↗
              </button>
            </div>
          </div>

          <p className="failure-lab-intro">
            Negative results and edge case breakdowns are fundamental to empirical science. Rather than sweeping failures under favorable aggregate averages, this laboratory catalogs exactly where, why, and how our local LFM3/d1 models broke under stress.
          </p>

          {/* Category Filter Chips */}
          <div className="toggle-chip-group" style={{ marginBottom: 18 }}>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`toggle-chip ${selectedCategory === cat ? 'is-active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Interactive Failure Cards Grid */}
          <div className="failure-cards-grid" role="listbox" aria-label="Cataloged Failure Cases">
            {filteredFailures.map(f => {
              const isSelected = f.id === selected.id;
              return (
                <div
                  key={f.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`failure-catalog-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedFailureId(f.id)}
                >
                  <div className="card-top-row">
                    <span className="failure-phase-tag">{f.phase} · {f.category}</span>
                    <span className="failure-id-code">{f.id}</span>
                  </div>
                  <h4 className="failure-card-title">{f.title}</h4>
                  <p className="failure-card-snippet">{f.observedFact.slice(0, 110)}…</p>
                  <div className="card-click-prompt">
                    {isSelected ? '● Currently Inspecting' : 'Click to inspect breakdown →'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Failure Investigation Panel */}
          <div className="failure-investigation-panel">
            <div className="investigation-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className="investigation-badge">{selected.id}</span>
                <span className="investigation-cat">{selected.phase} · {selected.category}</span>
              </div>
              <h3 className="investigation-title">{selected.title}</h3>
              <p className="investigation-source">Source: <code>{selected.evidenceSource}</code></p>
            </div>

            <div className="investigation-sections-grid">
              {/* Observed Empirical Fact */}
              <div className="investigation-box fact-box">
                <span className="box-badge fact-badge">1. OBSERVED EMPIRICAL FACT</span>
                <p>{selected.observedFact}</p>
                <small>Directly recorded in benchmark artifact; verifiable with zero speculation.</small>
              </div>

              {/* Hypothesized Failure Mechanism */}
              <div className="investigation-box mechanism-box">
                <span className="box-badge mechanism-badge">2. HYPOTHESIZED MECHANISM</span>
                <p>{selected.hypothesisMechanism}</p>
                <small>Plausible architectural root cause; subject to future ablation verification.</small>
              </div>

              {/* Research & Architectural Implication */}
              <div className="investigation-box implication-box">
                <span className="box-badge implication-badge">3. ENGINEERING IMPLICATION</span>
                <p>{selected.implication}</p>
                <small>Actionable design rule for local multimodal model deployment.</small>
              </div>
            </div>
          </div>
        </section>

        {/* Side Analytical Context Column */}
        <aside className="observatory-side-column" aria-label="Scientific Context">
          <div className="side-card">
            <span className="eyebrow">Scientific Question</span>
            <p className="side-question">
              Where did the local multimodal systems break, and what engineering lessons prevent catastrophic deployment failures?
            </p>
          </div>

          <div className="side-card">
            <span className="eyebrow">Epistemic Standard</span>
            <ul className="side-facts-list">
              <li>
                <strong>Facts vs Hypotheses:</strong> Observed benchmark outcomes are strictly separated from hypotheses about internal neural tensor dynamics.
              </li>
              <li>
                <strong>Overconfidence Hazard:</strong> High reported probability (~92%) in Case X03 demonstrates that softmax is not calibrated certainty.
              </li>
              <li>
                <strong>No Cherry-Picking:</strong> Negative results across spatial queries, video timing, and token length are fully exposed.
              </li>
            </ul>
          </div>

          <div className="side-card caveat-card">
            <span className="eyebrow">Scientific Caveat</span>
            <p className="caveat-text">
              Documented failure mechanisms represent our best technical post-mortems based on intermediate traces. They have not all been isolated with exhaustive intervention ablations.
            </p>
            <a
              href="https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/results/p7/final/failure_taxonomy.csv"
              target="_blank"
              rel="noreferrer"
              className="source-report-link"
            >
              View failure taxonomy CSV ↗
            </a>
          </div>
        </aside>
      </div>

      <EvidenceInspectorModal
        isOpen={showInspector}
        onClose={() => setShowInspector(false)}
        title="Failure Taxonomy & Error Records"
        sourcePath="results/p7/final/failure_taxonomy.csv"
        data={RESEARCH_DATA.failureTaxonomy}
      />
    </div>
  );
};
