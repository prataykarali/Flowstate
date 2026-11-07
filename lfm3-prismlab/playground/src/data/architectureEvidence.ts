import type { CanonicalModelId } from './models.ts';
export interface ArchitectureEvidence { summary: string; components: string[]; caveat?: string; }
// Condensed from results/p7/architecture/component_maps.json and docs/p7/P7_FINAL_REPORT.md.
export const ARCHITECTURE_EVIDENCE: Record<CanonicalModelId, ArchitectureEvidence> = {
  text: { summary: 'A 24-layer LFM3 text backbone with 13 gated convolutions, 5 sliding attention layers, and 6 global attention layers.', components: ['Text token embeddings', '24-layer LFM3 decoder', 'Causal language-model head'] },
  vision: { summary: 'A 14-layer vision encoder feeds a 24-layer LFM3 text backbone for visual-language output.', components: ['14-layer vision encoder', 'Visual projection into text backbone', '24-layer LFM3 decoder', 'Text output head'] },
  audio: { summary: 'A 17-layer audio encoder and 24-layer text backbone support speech tasks, with a 3-layer Depthformer in the configured speech pathway.', components: ['17-layer audio encoder', '24-layer LFM3 text backbone', '3-layer Depthformer'] },
  omni: { summary: 'Configured vision and audio encoders converge on a shared text backbone; the speech pathway includes a Depthformer.', components: ['14-layer vision encoder', '17-layer audio encoder', '24-layer text backbone', '3-layer Depthformer'] },
  d1: { summary: 'A D1Model with a 14-layer vision encoder and 24-layer text backbone feeds a SystemOne decision interface.', components: ['14-layer vision encoder', '24-layer text backbone', 'SystemOne SlotReader / decision interface'], caveat: 'Decision scores are not language-model token generation or calibrated authorization.' },
  d1_omni: { summary: 'The multimodal D1Model combines configured vision, audio, and text components with a SystemOne decision interface.', components: ['14-layer vision encoder', '17-layer audio encoder', '24-layer text backbone', '3-layer Depthformer', 'SystemOne decision interface'], caveat: 'Confidence is not production-calibrated; human review remains required for consequential decisions.' }
};
