import type { CanonicalModelId } from '../data/models.ts';
import { recordLeagueEvent, type AwardResult } from './league.ts';

const validated = { completionStatus: 'completed' as const, validationStatus: 'validated' as const };

function triggerGlobalEvent(modelId: CanonicalModelId, activityType: 'chat' | 'story_turn' | 'story_complete' | 'trivia_correct' | 'trivia_match', points: number, ref?: string, receipt?: string) {
  if (typeof window !== 'undefined') {
    import('./globalLeague.ts').then(m => m.recordGlobalEvent(modelId, activityType, points, ref, receipt)).catch(() => {});
  }
}

export function awardTriviaCorrect(modelId: CanonicalModelId, sessionId: string, questionId: number, answerIndex: number, correctIndex: number, sourceUrl: string, activityReceipt?: string): AwardResult {
  const cleanUrl = sourceUrl && sourceUrl.startsWith('http') ? sourceUrl : 'https://prismlab.local/live-trivia';
  const res = recordLeagueEvent({ ...validated, activity: 'trivia_correct', modelId, sessionId, questionId: Math.max(0, questionId), answerIndex, correctIndex, sourceUrl: cleanUrl, evidenceRef: `curated-question:${questionId}:answer:${answerIndex}:${cleanUrl}` });
  if (res.event || activityReceipt) triggerGlobalEvent(modelId, 'trivia_correct', 100, res.event?.evidenceRef || `trivia:${sessionId}:${questionId}`, activityReceipt);
  return res;
}
export function awardRunnerCompleted(modelId: CanonicalModelId, runId: string, score: number, started: boolean): AwardResult {
  return recordLeagueEvent({ ...validated, activity: 'runner_completed', modelId, sessionId: runId, score, started, evidenceRef: `runner:${runId}:score:${Math.floor(score)}` });
}
export function awardChatSession(modelId: CanonicalModelId, requestIds: string[], activityReceipt?: string): AwardResult {
  const res = recordLeagueEvent({ ...validated, activity: 'chat_session', modelId, sessionId: requestIds[0] || crypto.randomUUID(), requestIds, evidenceRef: `completed-requests:${requestIds.join(',')}` });
  if (res.event || activityReceipt) triggerGlobalEvent(modelId, 'chat', 4, res.event?.evidenceRef || `chat:${requestIds.join(',')}`, activityReceipt);
  return res;
}
export function awardStoryContribution(sessionId: string, requestId: string, activityReceipt?: string): AwardResult {
  const res = recordLeagueEvent({ ...validated, activity: 'story_contribution', modelId: 'text', sessionId, requestId, evidenceRef: `completed-request:${requestId}` });
  if (res.event || activityReceipt) triggerGlobalEvent('text', 'story_turn', 1, res.event?.evidenceRef || `story:${sessionId}:${requestId}`, activityReceipt);
  return res;
}
export function awardStorySession(sessionId: string, requestIds: string[], activityReceipt?: string): AwardResult {
  const res = recordLeagueEvent({ ...validated, activity: 'story_session_complete', modelId: 'text', sessionId, requestIds, evidenceRef: `completed-requests:${requestIds.join(',')}` });
  if (res.event || activityReceipt) triggerGlobalEvent('text', 'story_complete', 10, res.event?.evidenceRef || `story_complete:${sessionId}`, activityReceipt);
  return res;
}
export function awardAutoStoryTurn(modelId: CanonicalModelId, showId: string, turnId: string, requestId: string, role: 'writer' | 'support', activityReceipt?: string): AwardResult {
  const res = recordLeagueEvent({ ...validated, activity: 'auto_story_turn', modelId, sessionId: showId, showId, turnId, requestId, role, liveExecution: true, evidenceRef: `live-show:${showId}:turn:${turnId}:request:${requestId}` });
  if (res.event || activityReceipt) triggerGlobalEvent(modelId, 'story_turn', 1, res.event?.evidenceRef || `live-show:${showId}:turn:${turnId}`, activityReceipt);
  return res;
}
export function awardAutoStorySession(showId: string, requestIds: string[], activityReceipt?: string): AwardResult {
  const res = recordLeagueEvent({ ...validated, activity: 'auto_story_session', modelId: 'text', sessionId: showId, showId, requestIds, liveExecution: true, evidenceRef: `live-show:${showId}:completed:${requestIds.join(',')}` });
  if (res.event || activityReceipt) triggerGlobalEvent('text', 'story_complete', 10, res.event?.evidenceRef || `live-show:${showId}:completed`, activityReceipt);
  return res;
}
