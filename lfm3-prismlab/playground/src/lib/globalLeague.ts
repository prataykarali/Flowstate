import { useSyncExternalStore } from 'react';
import type { CanonicalModelId } from '../data/models.ts';

export interface ModelStanding {
  model_id: CanonicalModelId;
  display_name: string;
  model_family: string;
  total_points: number;
  chat_points: number;
  story_points: number;
  trivia_points: number;
  rating_points: number;
  other_eligible_points: number;
  last_activity_at: string | null;
  rank: number | null;
  unranked: boolean;
}

export interface GlobalStandingsState {
  standings: ModelStanding[];
  allUnranked: boolean;
  totalModels: number;
  dataSource: string;
  updatedAt: string | null;
  isLoading: boolean;
  error: string | null;
}

const VISITOR_ID_KEY = 'prismlab_visitor_id_v1';
const STANDINGS_CACHE_KEY = 'prismlab_global_standings_cache_v1';

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server_ssr';
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = `vis_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

function loadInitialCachedStandings(): GlobalStandingsState {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STANDINGS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GlobalStandingsState;
        if (parsed && Array.isArray(parsed.standings)) {
          return { ...parsed, isLoading: false };
        }
      }
    } catch {}
  }
  return {
    standings: [],
    allUnranked: true,
    totalModels: 6,
    dataSource: 'initializing',
    updatedAt: null,
    isLoading: true,
    error: null,
  };
}

let currentState: GlobalStandingsState = loadInitialCachedStandings();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

let fetchPromise: Promise<GlobalStandingsState> | null = null;

export async function fetchGlobalStandings(force = false): Promise<GlobalStandingsState> {
  if (fetchPromise && !force) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : (import.meta.env?.VITE_VERCEL_ORIGIN || '');
      const res = await fetch(`${origin}/api/league/standings?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to load global standings`);
      }

      const data = await res.json() as {
        standings: ModelStanding[];
        all_unranked: boolean;
        total_models: number;
        data_source: string;
        updated_at: string;
      };

      currentState = {
        standings: data.standings,
        allUnranked: data.all_unranked,
        totalModels: data.total_models,
        dataSource: data.data_source,
        updatedAt: data.updated_at,
        isLoading: false,
        error: null,
      };

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STANDINGS_CACHE_KEY, JSON.stringify(currentState));
        } catch {}
      }

      notify();
      return currentState;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch global standings';
      // Preserve existing standings rather than clearing to 0
      currentState = {
        ...currentState,
        isLoading: false,
        error: errorMsg,
      };
      notify();
      return currentState;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export async function recordGlobalEvent(
  modelId: CanonicalModelId,
  activityType: 'chat' | 'story_turn' | 'story_complete' | 'trivia_correct' | 'trivia_match',
  points: number,
  sourceReceiptId?: string,
  activityReceipt?: string
): Promise<{ status: string; points: number }> {
  let visitorId = getOrCreateVisitorId();
  if (activityReceipt) {
    try {
      const parts = activityReceipt.split('.');
      if (parts.length === 2) {
        const payload = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload && typeof payload.vis === 'string') {
          visitorId = payload.vis;
        }
      }
    } catch {}
  }
  const eventId = `ev_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  try {
    const res = await fetch(`${origin}/api/league/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        visitor_id: visitorId,
        model_id: modelId,
        activity_type: activityType,
        points,
        source_receipt_id: sourceReceiptId || null,
        activity_receipt: activityReceipt || null,
      }),
    });

    if (res.ok) {
      const data = await res.json() as { status: string; points: number };
      const awarded = data.points ?? points;
      // Optimistic update for immediate feedback
      if (awarded > 0 && Array.isArray(currentState.standings)) {
        const nextStandings = currentState.standings.map(row => {
          if (row.model_id !== modelId) return row;
          return {
            ...row,
            total_points: row.total_points + awarded,
            chat_points: activityType === 'chat' ? row.chat_points + awarded : row.chat_points,
            story_points: activityType.startsWith('story') ? row.story_points + awarded : row.story_points,
            trivia_points: activityType.startsWith('trivia') ? row.trivia_points + awarded : row.trivia_points,
            unranked: false,
          };
        }).sort((a, b) => b.total_points - a.total_points).map((row, idx) => ({ ...row, rank: idx + 1 }));

        currentState = {
          ...currentState,
          standings: nextStandings,
          allUnranked: false,
          updatedAt: new Date().toISOString(),
        };
        notify();
      }
      void fetchGlobalStandings(true);
      return data;
    }
  } catch {}

  return { status: 'recorded_locally', points };
}

export async function submitGlobalRating(
  modelId: CanonicalModelId,
  stars: number
): Promise<{ status: string; delta_points?: number }> {
  const visitorId = getOrCreateVisitorId();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  try {
    const res = await fetch(`${origin}/api/league/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_id: visitorId,
        model_id: modelId,
        stars,
      }),
    });

    if (res.ok) {
      const data = await res.json() as { status: string; delta_points?: number };
      void fetchGlobalStandings(true);
      return data;
    }
  } catch {}

  return { status: 'recorded_locally' };
}

// Background auto-refresh scheduling
if (typeof window !== 'undefined') {
  void fetchGlobalStandings(true);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      void fetchGlobalStandings(true);
    }
  });

  // Poll every 25 seconds
  window.setInterval(() => {
    if (!document.hidden) {
      void fetchGlobalStandings();
    }
  }, 25_000);
}

export function getGlobalStandingsSnapshot(): GlobalStandingsState {
  return currentState;
}

export function subscribeGlobalStandings(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useGlobalStandings(): GlobalStandingsState {
  return useSyncExternalStore(subscribeGlobalStandings, getGlobalStandingsSnapshot, getGlobalStandingsSnapshot);
}
