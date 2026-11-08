import { executeLocal, ApiError, type LiveResult, type ExecuteRequest } from './api.ts';
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
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
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

export function validateQuestion(
  raw: unknown,
  previous: LiveQuestion[],
  hostId: CanonicalModelId,
  result: LiveResult,
  fallbackTopic?: Topic,
  fallbackDifficulty?: Difficulty
): LiveQuestion {
  let text = typeof raw === 'string' ? raw.trim() : '';
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  const data = typeof raw === 'string' ? (JSON.parse(text) as Record<string, unknown>) : (raw as Record<string, unknown>);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Question is not a JSON object.');

  const coreKeys = ['correct_option', 'options', 'question'];
  if (!coreKeys.every(k => k in data)) {
    throw new Error('Question fields do not match the schema.');
  }

  const rawOptions = (data.options || {}) as Record<string, unknown>;
  if (!rawOptions || typeof rawOptions !== 'object' || Array.isArray(rawOptions)) {
    throw new Error('Four labeled options are required.');
  }
  const normalizedOptions: Record<Letter, string> = {} as Record<Letter, string>;
  for (const [k, v] of Object.entries(rawOptions)) {
    const upperK = k.toUpperCase();
    if (LETTERS.includes(upperK as Letter)) {
      normalizedOptions[upperK as Letter] = String(v).trim();
    }
  }
  if (LETTERS.some(letter => !normalizedOptions[letter])) {
    throw new Error('Four labeled options are required.');
  }

  const topicStr = typeof data.topic === 'string' && data.topic.trim() ? data.topic.trim() : (fallbackTopic || 'General Knowledge');
  const diffStr = typeof data.difficulty === 'string' && ['easy', 'medium', 'hard'].includes(data.difficulty.toLowerCase())
    ? data.difficulty.toLowerCase()
    : (fallbackDifficulty || 'medium');

  if (typeof data.question !== 'string' || data.question.trim().length < 12 || data.question.length > 280 || !data.question.trim().endsWith('?')) {
    throw new Error('Invalid question text.');
  }

  const upperKey = typeof data.correct_option === 'string' ? data.correct_option.trim().toUpperCase() : '';
  if (!LETTERS.includes(upperKey as Letter)) throw new Error('Invalid answer key.');
  const correctLetter = upperKey as Letter;

  const values = LETTERS.map(letter => normalizedOptions[letter]);
  if (values.some(value => typeof value !== 'string' || value.trim().length < 1 || value.length > 120) || new Set(values.map(value => normalize(String(value)))).size !== 4) {
    throw new Error('Options must be distinct, nonempty text.');
  }

  const explanationStr = typeof data.explanation === 'string' && data.explanation.trim().length >= 6
    ? data.explanation.trim()
    : `The correct answer is (${correctLetter}) ${String(normalizedOptions[correctLetter]).trim()}.`;

  if (previous.some(item => normalize(item.question) === normalize(data.question as string) || similarity(item.question, data.question as string) >= 0.78)) {
    throw new Error('Repeated or near-duplicate question.');
  }

  return {
    id: crypto.randomUUID(),
    topic: topicStr as Topic,
    difficulty: diffStr as Difficulty,
    question: data.question.trim(),
    options: normalizedOptions,
    correct_option: correctLetter,
    explanation: explanationStr,
    hostId,
    requestId: result.request_id,
    backendModelId: result.backend_model_id || BACKEND_IDS[hostId],
    latencyS: result.metrics.total_latency_s,
  };
}

export function validateAnswer(output: LiveResult['output'], _modelId: CanonicalModelId, question?: LiveQuestion): Letter | null {
  if (_modelId === 'd1' || _modelId === 'd1_omni') {
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

  // Explicit option label prefixes like "Option B", "Option B.", "Choice C"
  const prefixMatch = trimmed.match(/^(?:option|choice)\s+([A-D])[.:]?$/i);
  if (prefixMatch) {
    const candidate = prefixMatch[1].toUpperCase() as Letter;
    if (LETTERS.includes(candidate)) return candidate;
  }

  // Leading letter followed by delimiter: e.g. "A) 997", "B. 991", "C: 977", "(D) 953", "**B** - 991"
  const leadMatch = trimmed.match(/^[*"'`(\[]*([A-D])[*"'`)\]`]*\s*[:.)\-\—]\s*(.*)$/i);
  if (leadMatch) {
    const cand = leadMatch[1].toUpperCase() as Letter;
    if (LETTERS.includes(cand)) {
      const rest = leadMatch[2].trim();
      // If question options are available, ensure rest is either empty or matches/contains option text
      if (!rest) return cand;
      if (question?.options) {
        const optText = normalize(question.options[cand]);
        const restNorm = normalize(rest);
        if (restNorm === optText || restNorm.includes(optText) || optText.includes(restNorm)) {
          return cand;
        }
      } else {
        // If no question options provided, accept leading letter with delimiter
        return cand;
      }
    }
  }

  // If question is passed and output is the literal option text (e.g. "two" when B is "two", or "Four" when D is "Four")
  if (question?.options) {
    const norm = normalize(trimmed);
    const matches: Letter[] = [];
    for (const letter of LETTERS) {
      if (normalize(question.options[letter]) === norm) {
        matches.push(letter);
      }
    }
    if (matches.length === 1) return matches[0];

    // Substring match if unambiguous
    const containsMatches: Letter[] = [];
    for (const letter of LETTERS) {
      const optNorm = normalize(question.options[letter]);
      if (optNorm.length >= 3 && (norm === optNorm || norm.includes(optNorm))) {
        containsMatches.push(letter);
      }
    }
    if (containsMatches.length === 1) return containsMatches[0];
  }

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
  const avoid = previous.slice(-3).map(item => normalize(item.question).slice(0, 30)).join('; ');
  return `Write one concise ${difficulty} MCQ on ${topic}. Output ONLY valid JSON: {"question":"...?","options":{"A":"...","B":"...","C":"...","D":"..."},"correct_option":"A"}. Options must be 1-2 words. The question must end with ?. No markdown, no explanation. Avoid: ${avoid || 'none'}.${correction ? ` Fix: ${correction.slice(0, 40)}.` : ''}`.slice(0, 700);
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
      max_tokens: 16,
    };
  }
  const prompt = `Choose the single best option (A, B, C, or D).\nQuestion: ${question.question}\nA: ${question.options.A}\nB: ${question.options.B}\nC: ${question.options.C}\nD: ${question.options.D}\nAnswer (single capital letter only):`;
  return { task: 'chat' as const, model: modelId, prompt: prompt.slice(0, 1000), max_tokens: 32 };
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
      // Budgeted for fast generation (30-45 tokens, 3-5s latency target)
      const result = await executeLocal({
        task: 'chat',
        model: hostId,
        prompt: hostPrompt(topic, difficulty, previous, attempt ? lastError : ''),
        max_tokens: 80,
        response_format: { type: 'json_object' },
        activity_session_id: matchId,
      });
      assertIdentity(result, hostId);
      return validateQuestion(result.output, previous, hostId, result, topic, difficulty);
    } catch (error) {
      const is429 = (error instanceof ApiError && error.status === 429) || /rate limit|compute budget/i.test(String(error));
      if (is429) throw error;
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
    const answer = validateAnswer(result.output, modelId, question);
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
    const is429 = (error instanceof ApiError && error.status === 429) || /rate limit|compute budget/i.test(String(error));
    if (is429) throw error;
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
