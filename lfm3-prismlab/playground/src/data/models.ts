export type CanonicalModelId = 'text' | 'vision' | 'audio' | 'omni' | 'd1' | 'd1_omni';

export type Modality = 'text' | 'image' | 'video' | 'audio' | 'decision' | 'speech';

export type AccessoryType = 'glasses' | 'headphones' | 'hat' | 'magnifier' | 'monocle' | 'prism';

export interface ModelMeta {
  id: CanonicalModelId;
  name: string;
  characterSlug: string;
  characterName: string;
  repo: string;
  inputModalities: Modality[];
  outputModalities: Modality[];
  specialty: string;
  architectureSummary: string;
  themeColor: string;
  badgeClass: string;
  accessories: AccessoryType[];
  benchmarkHighlight: string;
  pipelineFlow: 'doc' | 'voice' | 'decision';
  validationStatus: 'verified_local' | 'reference_only';
  dialogueLines: string[];
}

export const MODELS: Record<CanonicalModelId, ModelMeta> = {
  text: {
    id: 'text',
    name: 'LFM3-1.7B',
    characterSlug: 'lfm3-17b',
    characterName: 'Prism Pure',
    repo: 'LiquidAI/LFM3-1.7B',
    inputModalities: ['text'],
    outputModalities: ['text'],
    specialty: 'Autoregressive language generation, reasoning, and tool calling with hybrid attention schedules.',
    architectureSummary: '24 layers (13 Gated Conv, 5 Sliding-Window Attention, 6 Full Global Attention), 2048 hidden dim, 16 heads.',
    themeColor: '#52efd0',
    badgeClass: 'badge-mint',
    accessories: [],
    benchmarkHighlight: 'P1: Validated smooth causal cross-entropy loss convergence across 16k tokens.',
    pipelineFlow: 'doc',
    validationStatus: 'verified_local',
    dialogueLines: [
      'Curious about language?',
      'Explore text generation with me.',
      'My research story starts with tokens.',
      'Let’s look at the text benchmark.'
    ]
  },

  vision: {
    id: 'vision',
    name: 'LFM3-VL-2B',
    characterSlug: 'lfm3-vl-2b',
    characterName: 'Spectra',
    repo: 'LiquidAI/LFM3-VL-2B',
    inputModalities: ['text', 'image', 'video'],
    outputModalities: ['text'],
    specialty: 'High-resolution document OCR, diagram extraction, and temporal visual comprehension.',
    architectureSummary: '14-layer Vision Encoder (patch 16) + 2-layer MLP projector (4096 dim) + 24-layer LFM3 backbone.',
    themeColor: '#67baff',
    badgeClass: 'badge-azure',
    accessories: ['glasses'],
    benchmarkHighlight: 'P2: 10/10 OCR exact match; 0.5x resolution scaling reduced TTFT by 45.3%.',
    pipelineFlow: 'doc',
    validationStatus: 'verified_local',
    dialogueLines: [
      'See the document OCR results.',
      'I work with images and video.',
      'Explore the vision encoder.',
      'Details make the difference.'
    ]
  },

  audio: {
    id: 'audio',
    name: 'LFM3-Audio-2B',
    characterSlug: 'lfm3-audio-2b',
    characterName: 'Echo',
    repo: 'LiquidAI/LFM3-Audio-2B',
    inputModalities: ['text', 'audio'],
    outputModalities: ['text', 'speech'],
    specialty: 'Native Speech-to-Speech (S2S) dialogue, continuous streaming ASR, and acoustic tone reasoning.',
    architectureSummary: '17-layer Audio Encoder + 12-code RVQ Depthformer (3 layers, 1024 dim) + 24-layer LFM3 backbone.',
    themeColor: '#38bdf8',
    badgeClass: 'badge-azure',
    accessories: ['headphones'],
    benchmarkHighlight: 'P3: 13.95s median S2S latency (30-50% faster than cascades), 96% strict success.',
    pipelineFlow: 'voice',
    validationStatus: 'verified_local',
    dialogueLines: [
      'La la la~',
      'Explore speech-to-speech research.',
      'Hear the recorded demo.',
      'Speech has its own rhythm.'
    ]
  },

  omni: {
    id: 'omni',
    name: 'LFM3-Omni-2B',
    characterSlug: 'lfm3-omni-2b',
    characterName: 'Omni Pup',
    repo: 'LiquidAI/LFM3-Omni-2B',
    inputModalities: ['text', 'image', 'video', 'audio'],
    outputModalities: ['text', 'speech'],
    specialty: 'Unified cross-modal intelligence connecting simultaneous video frames, speech audio, and textual queries.',
    architectureSummary: 'Dual encoders (14-layer vision + 17-layer audio) with shared depthformer projection into 24-layer backbone.',
    themeColor: '#c084fc',
    badgeClass: 'badge-violet',
    accessories: ['glasses', 'headphones'],
    benchmarkHighlight: 'P6: End-to-end multi-modal routing with unified acoustic-visual token fusion.',
    pipelineFlow: 'voice',
    validationStatus: 'verified_local',
    dialogueLines: [
      'Explore audio and vision together.',
      'Look! There’s more than one modality.',
      'See the multimodal pipeline.',
      'Discover the recorded demo.'
    ]
  },

  d1: {
    id: 'd1',
    name: 'd1-2B',
    characterSlug: 'd1-2b',
    characterName: 'Prism Thinker',
    repo: 'LiquidAI/d1-2B',
    inputModalities: ['text', 'image', 'video'],
    outputModalities: ['decision'],
    specialty: 'SystemOne categorical decision scoring with confidence estimates that require human review for consequential choices.',
    architectureSummary: '14-layer Vision Encoder + SystemOne SlotReader replacing LM head for single-pass classification.',
    themeColor: '#f472b6',
    badgeClass: 'badge-pink',
    accessories: ['monocle', 'prism'],
    benchmarkHighlight: 'P5.2 pilot: 23/24 labeled routing cases; confidence was not production-calibrated.',
    pipelineFlow: 'decision',
    validationStatus: 'verified_local',
    dialogueLines: [
      'Hmm... explore the routing study.',
      'See the measured accuracy.',
      'Follow the decision pathway.',
      'Confidence needs calibration.'
    ]
  },

  d1_omni: {
    id: 'd1_omni',
    name: 'd1-Omni-2B',
    characterSlug: 'd1-omni-2b',
    characterName: 'Sherlock Omni',
    repo: 'LiquidAI/d1-Omni-2B',
    inputModalities: ['text', 'image', 'video', 'audio'],
    outputModalities: ['decision'],
    specialty: 'Audio-visual decision classification from spoken acoustic cues and image context, with human review requirements.',
    architectureSummary: 'Vision + Audio Encoders + SystemOne multimodal slot scoring architecture with fast batch evaluation.',
    themeColor: '#fb7185',
    badgeClass: 'badge-rose',
    accessories: ['hat', 'magnifier'],
    benchmarkHighlight: 'P5: Multi-modal intent classification under noisy microphone environments.',
    pipelineFlow: 'decision',
    validationStatus: 'verified_local',
    dialogueLines: [
      'Let’s inspect the evidence.',
      'Explore audio-visual routing.',
      'The case is in the research notes.',
      'Elementary, my friend!'
    ]
  }
};

export const MODEL_LIST = Object.values(MODELS);
