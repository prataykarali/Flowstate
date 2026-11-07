import type { CanonicalModelId } from './models.ts';

// Mirrors prismlab/core/router.py. This is a route preview, never execution.
export type InputModality = 'text' | 'image' | 'video' | 'audio';
export type TaskCategory = 'chat' | 'speech' | 'decision';
export interface RouteExample { id: string; label: string; task: TaskCategory; inputs: InputModality[]; detail: string; }
export const ROUTE_EXAMPLES: RouteExample[] = [
  { id: 'text', label: 'Text question', task: 'chat', inputs: ['text'], detail: 'A text-only question routes to the language model.' },
  { id: 'document', label: 'Document image', task: 'chat', inputs: ['text', 'image'], detail: 'An image without audio routes to the vision model.' },
  { id: 'speech', label: 'Spoken question', task: 'speech', inputs: ['text', 'audio'], detail: 'A speech task with audio routes to the audio model.' },
  { id: 'av', label: 'Audio + video', task: 'chat', inputs: ['text', 'audio', 'video'], detail: 'Combined audio and visual input routes to the omni model.' },
  { id: 'decision', label: 'Text decision', task: 'decision', inputs: ['text'], detail: 'A decision task without audio routes to d1.' },
  { id: 'spoken-decision', label: 'Spoken decision', task: 'decision', inputs: ['text', 'audio'], detail: 'A decision task with audio routes to d1-Omni.' }
];
export function predictRoute(task: TaskCategory, inputs: readonly InputModality[]): CanonicalModelId {
  const has = (value: InputModality) => inputs.includes(value);
  if (task === 'decision') return has('audio') ? 'd1_omni' : 'd1';
  if (task === 'speech') return has('image') || has('video') ? 'omni' : 'audio';
  if (has('audio') && (has('image') || has('video'))) return 'omni';
  if (has('audio')) return 'audio';
  if (has('image') || has('video')) return 'vision';
  return 'text';
}
export const PIPELINE_CORE = ['request', 'engine', 'router', 'dispatcher', 'output', 'evaluation'] as const;
export const PIPELINE_EDGES = [
  ['request','engine'], ['engine','router'], ['registry','router'], ['router','dispatcher'],
  ...(['text','vision','audio','omni','d1','d1_omni'] as const).flatMap(id => [['dispatcher',id],[id,'output']]),
  ['output','evaluation']
] as const;
