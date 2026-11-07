import type { CanonicalModelId } from '../data/models.ts';

export const LEAGUE_VERSION = 's3a.1';
export const AUTO_STORY_VERSION = 's3b.1';
export const LEAGUE_STORAGE_KEY = 'prismlab_league_events_v1';
export const LEAGUE_CHANGE_EVENT = 'prismlab:league-change';
export const LEAGUE_MODEL_IDS: readonly CanonicalModelId[] = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];

export type LeagueActivity = 'trivia_correct' | 'runner_completed' | 'chat_session' | 'story_contribution' | 'story_session_complete' | 'auto_story_turn' | 'auto_story_session' | 'auto_trivia_participation' | 'auto_story_participation' | 'playground_verified';
export type ScoredActivity = Exclude<LeagueActivity, 'auto_trivia_participation' | 'auto_story_participation' | 'playground_verified'>;
export type CompletionStatus = 'completed' | 'incomplete' | 'failed';
export type ValidationStatus = 'validated' | 'unverified';

interface BaseCandidate {
  modelId: CanonicalModelId;
  sessionId: string;
  completionStatus: CompletionStatus;
  validationStatus: ValidationStatus;
  evidenceRef: string;
  timestamp?: string;
}
export type LeagueCandidate = BaseCandidate & (
  | { activity: 'trivia_correct'; questionId: number; answerIndex: number; correctIndex: number; sourceUrl: string }
  | { activity: 'runner_completed'; score: number; started: boolean }
  | { activity: 'chat_session'; requestIds: string[] }
  | { activity: 'story_contribution'; requestId: string }
  | { activity: 'story_session_complete'; requestIds: string[] }
  | { activity: 'auto_story_turn'; showId: string; turnId: string; requestId: string; role: 'writer' | 'support'; liveExecution: boolean }
  | { activity: 'auto_story_session'; showId: string; requestIds: string[]; liveExecution: boolean }
  | { activity: 'auto_trivia_participation' | 'auto_story_participation' | 'playground_verified' }
);

export interface LeagueEvent {
  eventId: string;
  idempotencyKey: string;
  modelId: CanonicalModelId;
  activity: ScoredActivity;
  sessionId: string;
  timestamp: string;
  completionStatus: 'completed';
  ruleId: string;
  ruleVersion: typeof LEAGUE_VERSION | typeof AUTO_STORY_VERSION;
  pointsEarned: number;
  validationStatus: 'validated';
  evidenceRef: string;
  requestId?: string;
  turnId?: string;
}
export interface AwardResult { events: LeagueEvent[]; event: LeagueEvent | null; reason: string | null }

const requestIdValid = (value: string) => /^[a-f0-9]{32}$/i.test(value);
const dayOf = (timestamp: string) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const sameDay = (events: LeagueEvent[], activity: ScoredActivity, day: string, model?: CanonicalModelId) =>
  events.filter(event => event.activity === activity && dayOf(event.timestamp) === day && (model === undefined || event.modelId === model)).length;

export function scoreEvent(events: LeagueEvent[], candidate: LeagueCandidate, makeId: () => string = () => crypto.randomUUID()): AwardResult {
  const reject = (reason: string): AwardResult => ({ events, event: null, reason });
  if (!LEAGUE_MODEL_IDS.includes(candidate.modelId) || !candidate.sessionId.trim() || !candidate.evidenceRef.trim()) return reject('Missing canonical attribution or evidence.');
  if (candidate.completionStatus !== 'completed' || candidate.validationStatus !== 'validated') return reject('Activity is not completed and validated.');
  const timestamp = candidate.timestamp || new Date().toISOString();
  if (!Number.isFinite(Date.parse(timestamp))) return reject('Invalid timestamp.');
  const day = dayOf(timestamp);
  let points = 0;
  let key = '';
  let ruleId: string = candidate.activity;

  switch (candidate.activity) {
    case 'trivia_correct':
      if (!Number.isInteger(candidate.questionId) || candidate.questionId < 1 || candidate.answerIndex !== candidate.correctIndex || !candidate.sourceUrl.startsWith('https://')) return reject('Unverified trivia answer.');
      points = 8;
      key = `trivia:${day}:${candidate.questionId}`;
      if (sameDay(events, 'trivia_correct', day) >= 4) return reject('Daily trivia cap reached.');
      break;
    case 'runner_completed':
      if (!candidate.started || !Number.isFinite(candidate.score) || candidate.score < 25) return reject('Run did not reach a completed achievement.');
      points = candidate.score >= 150 ? 25 : candidate.score >= 75 ? 15 : 8;
      ruleId = candidate.score >= 150 ? 'runner_150' : candidate.score >= 75 ? 'runner_75' : 'runner_25';
      key = `runner:${candidate.sessionId}`;
      if (sameDay(events, 'runner_completed', day) >= 2) return reject('Daily Runner cap reached.');
      break;
    case 'chat_session':
      if (candidate.requestIds.length < 2 || new Set(candidate.requestIds).size < 2 || !candidate.requestIds.every(requestIdValid)) return reject('Two distinct completed model requests are required.');
      points = 4;
      key = `chat:${candidate.sessionId}`;
      if (sameDay(events, 'chat_session', day, candidate.modelId) >= 2) return reject('Daily Chat cap reached.');
      break;
    case 'story_contribution':
      if (!requestIdValid(candidate.requestId)) return reject('A completed model request ID is required.');
      points = 6;
      key = `story_turn:${candidate.requestId}`;
      if (sameDay(events, 'story_contribution', day, candidate.modelId) >= 3) return reject('Daily Story contribution cap reached.');
      break;
    case 'story_session_complete':
      if (candidate.requestIds.length < 2 || new Set(candidate.requestIds).size < 2 || !candidate.requestIds.every(requestIdValid)) return reject('Two distinct completed model turns are required.');
      points = 10;
      key = `story_session:${candidate.sessionId}`;
      if (sameDay(events, 'story_session_complete', day, candidate.modelId) >= 1) return reject('Daily Story session cap reached.');
      break;
    case 'auto_story_turn':
      if (!candidate.liveExecution || candidate.showId !== candidate.sessionId || !candidate.turnId.trim() || !requestIdValid(candidate.requestId) || (candidate.role === 'writer') !== (candidate.modelId === 'text')) return reject('A live completed show turn with correct model role is required.');
      if (events.some(event => event.activity === 'auto_story_turn' && event.requestId === candidate.requestId)) return reject('This model request was already awarded.');
      points = candidate.role === 'writer' ? 6 : 3;
      key = `auto-story:${AUTO_STORY_VERSION}:${candidate.showId}:${candidate.turnId}:${candidate.modelId}`;
      if (sameDay(events, 'auto_story_turn', day, candidate.modelId) >= 4) return reject('Daily Auto Story turn cap reached.');
      break;
    case 'auto_story_session': {
      if (!candidate.liveExecution || candidate.showId !== candidate.sessionId || candidate.modelId !== 'text' || candidate.requestIds.length < 3 || new Set(candidate.requestIds).size < 3 || !candidate.requestIds.every(requestIdValid)) return reject('Completed live show evidence is required.');
      const qualifying = events.filter(event => event.activity === 'auto_story_turn' && event.sessionId === candidate.showId && event.requestId && candidate.requestIds.includes(event.requestId));
      if (qualifying.length < 3 || qualifying.filter(event => event.modelId === 'text').length < 2) return reject('Three scored turns, including two writer turns, are required.');
      points = 8;
      key = `auto-story-session:${AUTO_STORY_VERSION}:${candidate.showId}`;
      if (sameDay(events, 'auto_story_session', day, 'text') >= 1) return reject('Daily Auto Story session cap reached.');
      break;
    }
    default:
      return reject('This future activity has no S3-A scoring rule.');
  }
  if (events.some(event => event.idempotencyKey === key)) return reject('This activity was already awarded.');
  const event: LeagueEvent = {
    eventId: makeId(), idempotencyKey: key, modelId: candidate.modelId, activity: candidate.activity,
    sessionId: candidate.sessionId, timestamp, completionStatus: 'completed', ruleId,
    ruleVersion: candidate.activity.startsWith('auto_story_') ? AUTO_STORY_VERSION : LEAGUE_VERSION, pointsEarned: points, validationStatus: 'validated', evidenceRef: candidate.evidenceRef,
    ...(candidate.activity === 'auto_story_turn' ? { requestId: candidate.requestId, turnId: candidate.turnId } : {}),
  };
  return { events: [...events, event], event, reason: null };
}

export function readLeagueEvents(storage: Pick<Storage, 'getItem'> = localStorage): LeagueEvent[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(LEAGUE_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is LeagueEvent => item && typeof item === 'object' && typeof item.eventId === 'string' && typeof item.idempotencyKey === 'string' && LEAGUE_MODEL_IDS.includes(item.modelId) && typeof item.activity === 'string' && item.completionStatus === 'completed' && item.validationStatus === 'validated' && (item.ruleVersion === LEAGUE_VERSION || item.ruleVersion === AUTO_STORY_VERSION) && Number.isFinite(item.pointsEarned) && item.pointsEarned > 0 && typeof item.evidenceRef === 'string');
  } catch { return []; }
}

export function recordLeagueEvent(candidate: LeagueCandidate, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): AwardResult {
  const result = scoreEvent(readLeagueEvents(storage), candidate);
  if (!result.event) return result;
  try {
    storage.setItem(LEAGUE_STORAGE_KEY, JSON.stringify(result.events));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LEAGUE_CHANGE_EVENT, { detail: result.event }));
    return result;
  } catch { return { events: result.events.slice(0, -1), event: null, reason: 'Local League storage is unavailable.' }; }
}

export interface LeagueStanding {
  modelId: CanonicalModelId;
  points: number;
  rank: number | null;
  tier: string;
  progress: number;
  nextTierPoints: number | null;
  breakdown: Partial<Record<ScoredActivity, number>>;
  achievements: string[];
  recent: LeagueEvent | null;
}
const tiers = [{ points: 0, name: 'Newcomer' }, { points: 20, name: 'Rising' }, { points: 60, name: 'Radiant' }, { points: 120, name: 'Prism Star' }];
export function leagueStandings(events: LeagueEvent[]): LeagueStanding[] {
  const standings = LEAGUE_MODEL_IDS.map(modelId => {
    const earned = events.filter(event => event.modelId === modelId && event.validationStatus === 'validated' && event.completionStatus === 'completed');
    const points = earned.reduce((sum, event) => sum + event.pointsEarned, 0);
    const tierIndex = tiers.reduce((index, tier, current) => points >= tier.points ? current : index, 0);
    const next = tiers[tierIndex + 1];
    const breakdown: LeagueStanding['breakdown'] = {};
    for (const event of earned) breakdown[event.activity] = (breakdown[event.activity] || 0) + event.pointsEarned;
    const count = (activity: ScoredActivity) => earned.filter(event => event.activity === activity).length;
    const achievements = [
      earned.length >= 1 && 'First Spark', count('trivia_correct') >= 3 && 'Research Quiz',
      count('runner_completed') >= 2 && 'Runner Streak', count('story_contribution') >= 2 && 'Story Weaver',
      count('chat_session') >= 1 && 'Conversation Partner',
    ].filter((value): value is string => typeof value === 'string');
    return { modelId, points, rank: null, tier: tiers[tierIndex].name,
      progress: next ? Math.min(100, Math.round((points - tiers[tierIndex].points) / (next.points - tiers[tierIndex].points) * 100)) : 100,
      nextTierPoints: next?.points || null, breakdown, achievements, recent: earned.at(-1) || null };
  });
  return standings.sort((a, b) => b.points - a.points || LEAGUE_MODEL_IDS.indexOf(a.modelId) - LEAGUE_MODEL_IDS.indexOf(b.modelId)).map(standing => ({
    ...standing, rank: standing.points === 0 ? null : 1 + standings.filter(other => other.points > standing.points).length,
  }));
}
