import type { ShowRole } from './storyShow.ts';
import { readMedia, type MediaPayload } from './api.ts';

export interface StoryEvidencePack {
  packId: string;
  theme: string;
  setting: string;
  sceneDescription: string;
  imageAsset: string;
  audioAsset: string;
  imageDescription: string;
  audioScriptOrGroundTruth: string;
  mediaProvenance: string;
  intendedClue: string;
  opening: string;
  incidentReport: string;
  supportedRoles: ShowRole[];
  limitations: string;
}

export const EVIDENCE_PACKS: Record<string, StoryEvidencePack> = {
  'Detective investigation': {
    packId: 'detective_manor_locked_study',
    theme: 'Detective investigation',
    setting: 'A locked manor study with a fresh muddy footprint',
    sceneDescription: 'A dim mahogany-paneled manor study with heavy curtains, a locked oak door, and a fresh damp footprint on the floorboards leading toward the desk.',
    imageAsset: '/samples/evidence/detective_study.png',
    audioAsset: '/samples/evidence/detective_witness.wav',
    imageDescription: 'Illustrated wooden study with floorboards, an oak door on the right, a desk on the left, and a muddy boot print near the center.',
    audioScriptOrGroundTruth: 'Synthetic witness voice says: I heard a click from the study door at eleven. The muddy footprint was already inside when I arrived.',
    mediaProvenance: 'Locally illustrated scene and espeak-ng synthetic voice, created for this fictional Detective Investigation case.',
    intendedClue: 'The footprint predates the audible door click; the sequence is a question for the investigation, not proof of entry method.',
    opening: 'A detective discovers a fresh footprint inside a locked study.',
    incidentReport: 'The manor security system recorded a door alert at eleven, but its event log and sensor status disagree. Please inspect the access sensor and repair any fault.',
    supportedRoles: ['visual_interpreter', 'audio_interpreter', 'multimodal_interpreter', 'decision_assistant'],
    limitations: 'Fictional investigation evidence only; Illustration is schematic; synthetic voice is not a real witness; the stated sequence is a fictional claim, not verified fact.'
  }
};

export function getEvidencePackForTheme(theme: string): StoryEvidencePack | null {
  return EVIDENCE_PACKS[theme] || null;
}

export async function loadPackMedia(pack: StoryEvidencePack, kind: 'image' | 'audio'): Promise<MediaPayload> {
  const url = kind === 'image' ? pack.imageAsset : pack.audioAsset;
  const mime = kind === 'image' ? 'image/png' : 'audio/wav';
  const filename = url.split('/').pop() || (kind === 'image' ? 'evidence.png' : 'evidence.wav');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Evidence pack asset (${kind}) not found at ${url}.`);
  const blob = await res.blob();
  const file = new File([blob], filename, { type: mime });
  return readMedia(file, kind);
}
