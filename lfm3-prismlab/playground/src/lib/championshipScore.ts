import type { CanonicalModelId } from '../data/models.ts';
import { LEAGUE_MODEL_IDS, type LeagueEvent } from './league.ts';
import { triviaStandings, type LiveMatch } from './triviaLive.ts';

export const RATING_STORAGE_KEY = 'prismlab_model_ratings_v1';
export const RATING_CHANGE_EVENT = 'prismlab:rating-change';
export type Ratings = Partial<Record<CanonicalModelId, { stars: number; updatedAt: string }>>;

export function readRatings(storage: Pick<Storage, 'getItem'> = localStorage): Ratings {
  try {
    const raw = JSON.parse(storage.getItem(RATING_STORAGE_KEY) || '{}') as Record<string, unknown>;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const result: Ratings = {};
    for (const id of LEAGUE_MODEL_IDS) {
      const item = raw[id] as { stars?: unknown; updatedAt?: unknown } | undefined;
      if (item && Number.isInteger(item.stars) && Number(item.stars) >= 1 && Number(item.stars) <= 5 && typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt))) result[id] = { stars: Number(item.stars), updatedAt: item.updatedAt };
    }
    return result;
  } catch { return {}; }
}

export function saveRating(modelId: CanonicalModelId, stars: number, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): Ratings {
  if (!LEAGUE_MODEL_IDS.includes(modelId) || !Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error('Choose a rating from 1 to 5 stars.');
  const ratings = { ...readRatings(storage), [modelId]: { stars, updatedAt: new Date().toISOString() } };
  storage.setItem(RATING_STORAGE_KEY, JSON.stringify(ratings));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(RATING_CHANGE_EVENT));
    import('./globalLeague.ts').then(m => m.submitGlobalRating(modelId, stars)).catch(() => {});
  }
  return ratings;
}

export interface ChampionshipStanding {
  modelId: CanonicalModelId; rank: number | null; points: number;
  triviaPoints: number; chatPoints: number; storyPoints: number; ratingPoints: number;
  stars: number | null; matches: number; correct: number; attempts: number; incorrect: number; errors: number;
  lastResultAt: string | null;
}

export function championshipStandings(events: LeagueEvent[], matches: LiveMatch[], ratings: Ratings): ChampionshipStanding[] {
  const trivia = triviaStandings(matches);
  const ids = [...LEAGUE_MODEL_IDS];
  const rows = ids.map(modelId => {
    const own = events.filter(event => event.modelId === modelId && event.validationStatus === 'validated' && event.completionStatus === 'completed');
    const live = trivia.find(row => row.modelId === modelId)!;
    const leagueTrivia = own.filter(event => event.activity === 'trivia_correct').reduce((sum, event) => sum + event.pointsEarned, 0);
    const chatPoints = own.filter(event => event.activity === 'chat_session').reduce((sum, event) => sum + event.pointsEarned, 0);
    const storyPoints = own.filter(event => event.activity.startsWith('story_') || event.activity.startsWith('auto_story_')).reduce((sum, event) => sum + event.pointsEarned, 0);
    const triviaPoints = live.points + leagueTrivia;
    const stars = ratings[modelId]?.stars || null;
    const ratingPoints = stars ? stars * 2 : 0;
    const lastResultAt = [live.lastResultAt, ratings[modelId]?.updatedAt, ...own.map(event => event.timestamp)].filter((value): value is string => !!value).sort().at(-1) || null;
    return { modelId, rank: null as number | null, points: triviaPoints + chatPoints + storyPoints + ratingPoints, triviaPoints, chatPoints, storyPoints, ratingPoints, stars, matches: live.matches, correct: live.correct, attempts: live.attempts, incorrect: live.incorrect, errors: live.errors, lastResultAt };
  });
  rows.sort((a, b) => b.points - a.points || b.triviaPoints - a.triviaPoints || ids.indexOf(a.modelId) - ids.indexOf(b.modelId));
  return rows.map(row => ({ ...row, rank: row.points ? 1 + rows.filter(other => other.points > row.points).length : null }));
}
