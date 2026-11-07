import rawResearchData from './researchData.json';

export interface BenchmarkRecord {
  phase: string;
  label: string;
  success: number;
  total: number;
  medianLatencyS: number | null;
  timedCount: number | null;
  source: string;
  task: string;
}

export interface FailureRecord {
  phase: string;
  category: string;
  example: string;
  source: string;
}

export interface P1Assertion {
  id: string;
  task: string;
  inputs: string[];
  expected: string;
  modelName: string;
  note: string;
}

export interface P1Data {
  phase: string;
  title: string;
  docPath: string;
  hardware: string;
  scope: string;
  rules: { priority: number; condition: string; rule: string; target: string }[];
  assertions: P1Assertion[];
  verifiedCount: number;
  totalAssertions: number;
  nature: string;
}

export interface P2Case {
  id: string;
  filename: string;
  category: string;
  difficulty: string;
  question: string;
  expectedAnswer: string;
  directAnswer: string;
  directExact: boolean;
  directLatencyS: number | null;
  directTtftS: number | null;
  directFinishReason: string;
  ocrText: string;
  ocrPhraseHits: number;
  ocrPhraseTotal: number;
  ocrPhraseRecall: number;
  ocrFoundPhrases: string;
  ocrLatencyS: number | null;
  pipelineAnswer: string;
  pipelineExact: boolean;
  pipelineLatencyS: number | null;
  textLatencyS: number | null;
  textFinishReason: string;
}

export interface P2ResolutionItem {
  scale: number;
  resolution: string;
  ttftS: number;
  firstEventS: number;
  totalS: number;
  answer: string;
  validOutput: boolean;
  correct: boolean;
  finishReason: string;
}

export interface P2Data {
  phase: string;
  title: string;
  docPath: string;
  hardware: string;
  sampleSize: number;
  datasetType: string;
  summary: {
    direct: { model: string; exactMatchCount: number; totalCount: number; medianLatencyS: number | null };
    modular: { model: string; exactMatchCount: number; totalCount: number; medianLatencyS: number | null };
  };
  resolutionAblation: P2ResolutionItem[];
  cases: P2Case[];
  highlightFailure: { caseId: string; filename: string; issue: string; explanation: string };
  caveat: string;
}

export interface P3Evaluation {
  id: string;
  category: string;
  architecture: 'native' | 'modular' | 'modular_v21';
  status: string;
  question: string;
  expected: string;
  asrTranscript: string | null;
  answer: string | null;
  asrS: number | null;
  reasoningS: number | null;
  ttsS: number | null;
  totalS: number | null;
  executionSuccess: boolean;
  semanticCorrectness: boolean;
  cleanSpeechText: boolean;
  strictTaskSuccess: boolean;
}

export interface P3ArchStat {
  label: string;
  totalCases: number;
  strictSuccessCount: number;
  semanticSuccessCount: number;
  executionSuccessCount: number;
  timedCount: number;
  medianLatencyS: number | null;
  latencies: number[];
}

export interface P3Data {
  phase: string;
  title: string;
  docPath: string;
  hardware: string;
  totalCases: number;
  totalEvaluations: number;
  architectures: {
    native: P3ArchStat;
    modular_v21: P3ArchStat;
    modular: P3ArchStat;
  };
  evaluations: P3Evaluation[];
  stageBreakdownV21: { id: string; category: string; asrS: number; reasoningS: number; ttsS: number; totalS: number }[];
  failures: { caseId: string; arch: string; category: string; reason: string }[];
  caveat: string;
}

export interface P4Case {
  caseId: string;
  condition: string;
  expected: string;
  taskType: string;
  omniOutput: string;
  modularOutput: string;
  omniPass: boolean;
  modularPass: boolean;
  omniLatencyS: number;
  modularLatencyS: number;
  classification: 'both_pass' | 'modular_only' | 'omni_only' | 'both_fail';
}

export interface P4Data {
  phase: string;
  title: string;
  docPath: string;
  hardware: string;
  sampleSize: number;
  datasetType: string;
  summary: {
    omni: { model: string; passCount: number; totalCount: number; medianLatencyS: number | null };
    modular: { model: string; passCount: number; totalCount: number; medianLatencyS: number | null };
  };
  contingency: {
    bothPass: number;
    modularOnly: number;
    omniOnly: number;
    bothFail: number;
  };
  statisticalTest: {
    testName: string;
    discordantPairs: { b: number; c: number };
    pValue: number;
    isSignificant: boolean;
    conclusion: string;
  };
  spatialSubsetFailure: {
    condition: string;
    total: number;
    bothFailedCount: number;
    explanation: string;
  };
  temporalPilot: {
    pilotCases: number;
    correctCount: number;
    finding: string;
  };
  cases: P4Case[];
  caveat: string;
}

export interface P5Data {
  phase: string;
  title: string;
  docPath: string;
  hardware: string;
  routingPilot: {
    name: string;
    cases: number;
    correct: number;
    accuracy: number;
    brier: number;
    medianLatencyS: number;
    p95LatencyS: number;
    failedIds: string[];
  };
  routingStress: {
    name: string;
    cases: number;
    correct: number;
    accuracy: number;
    brier: number;
    medianLatencyS: number;
    p95LatencyS: number;
    failures: { id: string; expected: string; predicted: string; confidence: number }[];
  };
  audioDecision: {
    name: string;
    fullyPairedCases: number;
    audioAccuracy: number;
    oracleAccuracy: number;
    audioMedianLatencyS: number;
    oracleMedianLatencyS: number;
    note: string;
  };
  gatedIntegration: {
    name: string;
    totalCases: number;
    blockedWithoutModel: number;
    modelRequests: number;
    autoRecommendations: number;
    reviewDecisions: number;
    labeledAccuracy: number;
    threshold: number;
    thresholdPostHoc: boolean;
  };
  prominentFailureX03: {
    caseId: string;
    modality: string;
    expected: string;
    predicted: string;
    confidence: number;
    probabilities: Record<string, number>;
    decision: string;
    reason: string;
    correct: boolean;
    source: string;
    implication: string;
  };
  caveat: string;
}

export interface P6Data {
  phase: string;
  title: string;
  docPath: string;
  hardware: string;
  architecture: { stage: string; desc: string }[];
  benchmarks: {
    directPassingModels: string;
    orchestratedPassingModels: string;
    sequentialPipeline: { route: string; expectedAnswer: string; totalLatencyS: number; ttftS: number };
    liveVisionApi: { status: number; totalLatencyS: number; ttftS: number };
    regressionSuite: string;
  };
  assertionClarification: string;
  caveat: string;
}

export interface P7Data {
  phase: string;
  title: string;
  docPath: string;
  componentMaps: Record<string, any>;
  textBackboneSchedule: {
    totalLayers: number;
    hiddenSize: number;
    numAttentionHeads: number;
    layerTypes: { layerIndex: number; type: string; label: string; color: string }[];
    counts: { conv: number; fullAttention: number; slidingAttention: number };
  };
  crossPhaseSynthesis: {
    phase: string;
    name: string;
    sampleSize: number;
    methods: { label: string; strictSuccess: string; rate: number; medianLatency: string }[];
    keyObservation: string;
  }[];
  coreConclusions: { title: string; body: string }[];
}

export interface MasterResearchDataset {
  metadata: {
    generatedAt: string;
    generator: string;
    project: string;
    phases: string[];
    totalSourceArtifactsVerified: number;
  };
  benchmarkSummary: BenchmarkRecord[];
  failureTaxonomy: FailureRecord[];
  p1: P1Data;
  p2: P2Data;
  p3: P3Data;
  p4: P4Data;
  p5: P5Data;
  p6: P6Data;
  p7: P7Data;
}

export const RESEARCH_DATA = rawResearchData as unknown as MasterResearchDataset;
