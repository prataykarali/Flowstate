import type { CanonicalModelId } from '../data/models.ts';
export interface RecordedStage { stage: string; status: string; model: CanonicalModelId | null; latency_s: number | null; ttft_s: number | null; }
export interface RecordedReplay {
  slug: CanonicalModelId; mode: 'recorded_replay'; title: string; source_request_id: string;
  route: CanonicalModelId[]; status: string; output: string;
  metrics: { total_latency_s: number; ttft_s: number | null; tokens_per_second: number | null };
  trace: RecordedStage[];
  evaluation: { expected: string; correct: boolean; scope: string } | null;
  limitations: string;
}
const ids: CanonicalModelId[] = ['text','vision','audio','omni','d1','d1_omni'];
export async function loadRecordedReplays(): Promise<RecordedReplay[]> {
  const responses = await Promise.all(ids.map(id => fetch(`/research/replays/${id}.json`)));
  if (responses.some(response => !response.ok)) throw new Error('Recorded replay assets are unavailable');
  const records = await Promise.all(responses.map(response => response.json() as Promise<RecordedReplay>));
  if (records.some((record, index) => record.slug !== ids[index] || record.mode !== 'recorded_replay' || !Array.isArray(record.trace))) throw new Error('Invalid replay record');
  return records;
}
