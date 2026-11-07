import { executeLocal, type LiveResult, type ExecuteRequest } from './api.ts';
import type { CanonicalModelId } from '../data/models.ts';

export type Letter = 'A' | 'B' | 'C' | 'D';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Topic =
  | 'Computer Science'
  | 'Artificial Intelligence'
  | 'Machine Learning'
  | 'Mathematics'
  | 'Logical Reasoning'
  | 'General Science'
  | 'History and Geography'
  | 'General Knowledge';

export const TOPICS: Topic[] = [
  'Computer Science',
  'Artificial Intelligence',
  'Machine Learning',
  'Mathematics',
  'Logical Reasoning',
  'General Science',
  'History and Geography',
  'General Knowledge',
];
export const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];
export const LIVE_MODELS: CanonicalModelId[] = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];
export const BACKEND_IDS: Record<CanonicalModelId, string> = {
  text: 'lfm3-1.7b',
  vision: 'lfm3-vision',
  audio: 'lfm3-audio',
  omni: 'lfm3-omni',
  d1: 'd1',
  d1_omni: 'd1-omni',
};
export const MATCH_STORAGE_KEY = 'prismlab_s4_live_matches_v1';
export const MATCH_CHANGE_EVENT = 'prismlab:s4-match-change';

export interface LiveQuestion {
  id: string;
  topic: Topic;
  difficulty: Difficulty;
  question: string;
  options: Record<Letter, string>;
  correct_option: Letter;
  explanation: string;
  hostId: CanonicalModelId;
  requestId: string;
  backendModelId: string;
  latencyS: number | null;
}

export interface LiveAttempt {
  modelId: CanonicalModelId;
  backendModelId: string;
  answer: Letter | null;
  status: 'correct' | 'incorrect' | 'invalid' | 'error';
  points: number;
  requestId: string | null;
  latencyS: number | null;
  timestamp: string;
  error?: string;
  activityReceipt?: string;
}

export interface LiveRound {
  index: number;
  question: LiveQuestion;
  attempts: LiveAttempt[];
}

export interface LiveMatch {
  id: string;
  mode: 'live';
  status: 'running' | 'completed' | 'cancelled' | 'failed';
  length: number;
  startedAt: string;
  finishedAt?: string;
  rounds: LiveRound[];
}

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const similarity = (a: string, b: string) => {
  const left = new Set(normalize(a).split(' '));
  const right = new Set(normalize(b).split(' '));
  return [...left].filter(word => right.has(word)).length / Math.max(1, new Set([...left, ...right]).size);
};

export function validateQuestion(raw: unknown, previous: LiveQuestion[], hostId: CanonicalModelId, result: LiveResult): LiveQuestion {
  let text = typeof raw === 'string' ? raw.trim() : '';
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const data = typeof raw === 'string' ? (JSON.parse(text) as Record<string, unknown>) : (raw as Record<string, unknown>);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Question is not a JSON object.');
  const allowed = ['topic', 'difficulty', 'question', 'options', 'correct_option', 'explanation'];
  if (Object.keys(data).sort().join(',') !== allowed.sort().join(',')) throw new Error('Question fields do not match the schema.');
  const options = data.options as Record<string, unknown>;
  if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).sort().join(',') !== 'A,B,C,D') {
    throw new Error('Four labeled options are required.');
  }
  if (typeof data.topic !== 'string' || data.topic.trim().length < 3 || data.topic.length > 80 || typeof data.difficulty !== 'string' || !['easy', 'medium', 'hard'].includes(data.difficulty.toLowerCase())) {
    throw new Error('Invalid topic or difficulty.');
  }
  if (typeof data.question !== 'string' || data.question.trim().length < 18 || data.question.length > 240 || !data.question.trim().endsWith('?')) {
    throw new Error('Invalid question text.');
  }
  if (typeof data.explanation !== 'string' || data.explanation.trim().length < 6 || data.explanation.length > 300) {
    throw new Error('Invalid explanation.');
  }
  if (!LETTERS.includes(data.correct_option as Letter)) throw new Error('Invalid answer key.');
  const values = LETTERS.map(letter => options[letter]);
  if (values.some(value => typeof value !== 'string' || value.trim().length < 1 || value.length > 120) || new Set(values.map(value => normalize(String(value)))).size !== 4) {
    throw new Error('Options must be distinct, nonempty text.');
  }
  if (previous.some(item => normalize(item.question) === normalize(data.question as string) || similarity(item.question, data.question as string) >= 0.78)) {
    throw new Error('Repeated or near-duplicate question.');
  }
  return {
    id: crypto.randomUUID(),
    topic: data.topic.trim() as Topic,
    difficulty: data.difficulty.toLowerCase() as Difficulty,
    question: data.question.trim(),
    options: Object.fromEntries(LETTERS.map(letter => [letter, String(options[letter]).trim()])) as Record<Letter, string>,
    correct_option: data.correct_option as Letter,
    explanation: data.explanation.trim(),
    hostId,
    requestId: result.request_id,
    backendModelId: result.backend_model_id || BACKEND_IDS[hostId],
    latencyS: result.metrics.total_latency_s,
  };
}

export function validateAnswer(output: LiveResult['output'], modelId: CanonicalModelId): Letter | null {
  if (modelId === 'd1' || modelId === 'd1_omni') {
    if (
      output &&
      typeof output === 'object' &&
      !Array.isArray(output) &&
      LETTERS.includes(String(output.predicted_route || '').toUpperCase() as Letter)
    ) {
      return String(output.predicted_route).toUpperCase() as Letter;
    }
    // Strict requirement: ticket-triage classification ('billing', etc.) is NOT a valid quiz answer
    return null;
  }

  if (typeof output !== 'string') return null;
  const trimmed = output.trim();
  if (!trimmed) return null;

  // Single-field structured JSON answers
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed) as Record<string, unknown>;
      if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 1 && typeof data.answer === 'string') {
        const jsonLetter = data.answer.trim().toUpperCase();
        if (LETTERS.includes(jsonLetter as Letter)) return jsonLetter as Letter;
      }
    } catch {
      /* proceed to text normalization */
    }
  }

  // Exact single letter check (case-insensitive)
  const upper = trimmed.toUpperCase();
  if (LETTERS.includes(upper as Letter)) return upper as Letter;

  // Anchored wrapper normalization
  const stripped = trimmed
    .replace(/^[*"'`(\[]+/, '')
    .replace(/[*"'`)\]`.]+$/, '')
    .trim()
    .toUpperCase();

  if (LETTERS.includes(stripped as Letter)) return stripped as Letter;

  return null;
}

export function assertIdentity(result: LiveResult, expected: CanonicalModelId): void {
  if (result.status !== 'completed' || result.route?.length !== 1 || result.route[0] !== expected) {
    throw new Error('Model route or status mismatch.');
  }
  if (result.requested_model && result.requested_model !== expected) throw new Error('Requested model mismatch.');
  if (result.backend_model_id && result.backend_model_id !== BACKEND_IDS[expected]) {
    throw new Error('Backend model identity mismatch.');
  }
  if (!result.trace.some(step => step.stage === 'inference' && step.status === 'ok' && step.model === expected)) {
    throw new Error('Missing attributed inference trace.');
  }
}

export function hostPrompt(topic: Topic, difficulty: Difficulty, previous: LiveQuestion[], correction = ''): string {
  const avoid = previous.slice(-3).map(item => normalize(item.question).slice(0, 40)).join('; ');
  return `Write one ${difficulty} MCQ on ${topic}. Output compact JSON only: {"topic":"${topic}","difficulty":"${difficulty}","question":"...?","options":{"A":"...","B":"...","C":"...","D":"..."},"correct_option":"A","explanation":"one short factual sentence"}. Use four distinct short choices. The question ends with ?. Pick the true answer key. Avoid: ${avoid || 'none'}.${correction ? ` Fix: ${correction.slice(0, 80)}.` : ''}`.slice(0, 1000);
}

export function contestantRequest(modelId: CanonicalModelId, question: LiveQuestion): ExecuteRequest {
  if (modelId === 'd1' || modelId === 'd1_omni') {
    return {
      task: 'decision' as const,
      model: modelId,
      prompt: question.question,
      decision_question: {
        instructions: 'Choose the single best answer to the multiple-choice question.',
        criteria: question.options,
      },
      max_tokens: 48,
    };
  }
  const prompt = `Answer this multiple-choice question. Select the single best choice. Reply ONLY with a single capital letter: A, B, C, or D. No punctuation or markdown. Question: ${question.question} A: ${question.options.A} B: ${question.options.B} C: ${question.options.C} D: ${question.options.D}`;
  return { task: 'chat' as const, model: modelId, prompt: prompt.slice(0, 1000), max_tokens: 16 };
}

export async function generateQuestion(
  hostId: CanonicalModelId,
  topic: Topic,
  difficulty: Difficulty,
  previous: LiveQuestion[],
  afterCall?: () => Promise<void>,
  shouldContinue?: () => boolean,
  matchId?: string
): Promise<LiveQuestion> {
  let lastError = 'Question generation failed.';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (shouldContinue && !shouldContinue()) break;
    try {
      // max_tokens strictly budgeted at 128 (gateway contract 16-128)
      const result = await executeLocal({
        task: 'chat',
        model: hostId,
        prompt: hostPrompt(topic, difficulty, previous, attempt ? lastError : ''),
        max_tokens: 128,
        activity_session_id: matchId,
      });
      assertIdentity(result, hostId);
      return validateQuestion(result.output, previous, hostId, result);
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    } finally {
      await afterCall?.();
    }
  }
  throw new Error(`Host could not generate a valid question: ${lastError}`);
}

export async function answerQuestion(modelId: CanonicalModelId, question: LiveQuestion, matchId?: string): Promise<LiveAttempt> {
  const timestamp = new Date().toISOString();
  try {
    const req = contestantRequest(modelId, question);
    if (matchId) req.activity_session_id = matchId;
    const result = await executeLocal(req);
    assertIdentity(result, modelId);
    const answer = validateAnswer(result.output, modelId);
    return {
      modelId,
      backendModelId: result.backend_model_id || BACKEND_IDS[modelId],
      answer,
      status: !answer ? 'invalid' : answer === question.correct_option ? 'correct' : 'incorrect',
      points: answer === question.correct_option ? 100 : 0,
      requestId: result.request_id,
      latencyS: result.metrics.total_latency_s,
      timestamp,
      activityReceipt: result.activity_receipt,
    };
  } catch (error) {
    return {
      modelId,
      backendModelId: BACKEND_IDS[modelId],
      answer: null,
      status: 'error',
      points: 0,
      requestId: null,
      latencyS: null,
      timestamp,
      error: error instanceof Error ? error.message : 'Inference failed.',
    };
  }
}

export function upsertAttempt(round: LiveRound, attempt: LiveAttempt): LiveRound {
  if (round.attempts.some(item => item.modelId === attempt.modelId)) return round;
  return { ...round, attempts: [...round.attempts, attempt] };
}

export function readMatches(): LiveMatch[] {
  try {
    const raw = JSON.parse(localStorage.getItem(MATCH_STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(item => item?.mode === 'live' && typeof item.id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveMatch(match: LiveMatch): void {
  const matches = readMatches().filter(item => item.id !== match.id);
  matches.push(match);
  localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(matches.slice(-50)));
  window.dispatchEvent(new CustomEvent(MATCH_CHANGE_EVENT, { detail: match }));
}

export interface TriviaStanding {
  modelId: CanonicalModelId;
  rank: number | null;
  points: number;
  correct: number;
  attempts: number;
  incorrect: number;
  errors: number;
  matches: number;
  accuracy: number;
  recentDelta: number | null;
  lastResultAt: string | null;
}

export function triviaStandings(matches: LiveMatch[]): TriviaStanding[] {
  const completed = matches.filter(match => match.status === 'completed');
  const ids: CanonicalModelId[] = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];
  const rows = ids
    .map(modelId => {
      const participated = completed.filter(match =>
        match.rounds.some(round => round.attempts.some(item => item.modelId === modelId))
      );
      const attempts = participated.flatMap(match =>
        match.rounds.flatMap(round => round.attempts.filter(item => item.modelId === modelId))
      );
      const correct = attempts.filter(item => item.status === 'correct').length;
      const incorrect = attempts.filter(item => item.status === 'incorrect').length;
      const errors = attempts.filter(item => item.status === 'error' || item.status === 'invalid').length;
      return {
        modelId,
        rank: null as number | null,
        points: correct * 100,
        correct,
        attempts: attempts.length,
        incorrect,
        errors,
        matches: participated.length,
        accuracy: attempts.length ? correct / attempts.length : 0,
        recentDelta: participated.length
          ? participated[participated.length - 1].rounds
              .flatMap(round => round.attempts)
              .filter(item => item.modelId === modelId)
              .reduce((sum, item) => sum + item.points, 0)
          : null,
        lastResultAt: attempts.length ? attempts[attempts.length - 1].timestamp : null,
      };
    })
    .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy || ids.indexOf(a.modelId) - ids.indexOf(b.modelId));
  let previous: TriviaStanding | null = null;
  return rows.map((row, index) => {
    const rank = row.attempts
      ? previous && previous.points === row.points && previous.accuracy === row.accuracy
        ? previous.rank
        : index + 1
      : null;
    const result = { ...row, rank };
    previous = result;
    return result;
  });
}
