import architectureJson from './architectureData.json';

export type CanonicalArchitectureModelId = 'text' | 'vision' | 'audio' | 'omni' | 'd1' | 'd1_omni';

export type ProvenanceTier =
  | 'CONFIRMED_CONFIG'
  | 'SOURCE_TRACED'
  | 'CONCEPTUAL_FLOW'
  | 'MEASURED_RUNTIME'
  | 'UNDER_AUDIT';

export interface ArchitectureLayerItem {
  index: number;
  type: string;
  name: string;
  kernelSize?: number | null;
  heads?: { q: number; kv: number; dim?: number } | null;
  window?: number | null;
  hiddenSize: number;
  intermediateSize?: number;
  color: string;
  source: string;
}

export interface ArchitectureComponentNode {
  id: string;
  title: string;
  role: 'vision' | 'audio' | 'text' | 'decision' | 'shared' | 'output';
  group: 'input' | 'vision_encoder' | 'audio_encoder' | 'text_backbone' | 'fusion' | 'speech_decoder' | 'decision_head' | 'output';
  provenance: ProvenanceTier;
  description: string;
  tensorShape?: string;
  configKey?: string;
  sourceFile: string;
  caveat?: string;
  isUncertain?: boolean;
  isExpandable?: boolean;
  layers?: ArchitectureLayerItem[];
  x: number;
  y: number;
}

export interface ArchitectureEdge {
  id: string;
  from: string;
  to: string;
  role: string;
  style: 'solid' | 'dashed';
  conceptual: boolean;
  note?: string;
}

export interface ArchitectureModelDefinition {
  id: CanonicalArchitectureModelId;
  name: string;
  characterName: string;
  repo: string;
  revision: string;
  architecture: string;
  primaryModality: string;
  supportedModalities: string[];
  themeColor: string;
  parameters: string;
  quantization: string;
  totalLayers: number;
  componentCounts: {
    conv: number;
    fullAttention: number;
    slidingAttention: number;
    visionLayers: number;
    audioLayers: number;
    depthformerLayers: number;
  };
  configFields: Record<string, any>;
  components: ArchitectureComponentNode[];
  edges: ArchitectureEdge[];
  schedule: ArchitectureLayerItem[];
}

export interface ArchitectureDataset {
  metadata: {
    generator: string;
    generatedAt: string;
    provenanceSource: string;
    models: CanonicalArchitectureModelId[];
  };
  provenanceLevels: Record<string, ProvenanceTier>;
  palette: Record<string, string>;
  sharedBackboneLayers: ArchitectureLayerItem[];
  models: Record<CanonicalArchitectureModelId, ArchitectureModelDefinition>;
}

export const ARCHITECTURE_DATA = architectureJson as unknown as ArchitectureDataset;
