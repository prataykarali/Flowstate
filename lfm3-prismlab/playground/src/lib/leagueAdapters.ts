import type { CanonicalModelId } from '../data/models.ts';
import { recordLeagueEvent, POINTS_PER_EVENT, type AwardResult } from './league.ts';

const validated = { completionStatus: 'completed' as const, validationStatus: 'validated' as const };

function triggerGlobalEvent(modelId: CanonicalModelId, activityType: 'chat' | 'story_turn' | 'story_support_turn' | 'story_complete' | 'auto_story_complete' | 'trivia_correct' | 'trivia_match' | 'runner_completed' | 'arcade', points: number, ref?: string, receipt?: string) {
  if (typeof window !== 'undefined') {
    import('./globalLeague.ts').then(m => m.recordGlobalEvent(modelId, activityType, points, ref, receipt)).catch(() => {});
  }
}

export function awardTriviaCorrect(modelId: CanonicalModelId, sessionId: string, questionId: number, answerIndex: number, correctIndex: number, sourceUrl: string, activityReceipt?: string): AwardResult {
  const cleanUrl = sourceUrl && sourceUrl.startsWith('http') ? sourceUrl : 'https://prismlab.local/live-trivia';
  const effectiveQuestionId = Number.isInteger(questionId) && questionId >= 0 ? questionId : 0;
  const res = recordLeagueEvent({ ...validated, activity: 'trivia_correct', modelId, sessionId, questionId: effectiveQuestionId, answerIndex, correctIndex, sourceUrl: cleanUrl, evidenceRef: `curated-question:${effectiveQuestionId}:answer:${answerIndex}:${cleanUrl}` });
  if (res.event || activityReceipt) triggerGlobalEvent(modelId, 'trivia_correct', res.event?.pointsEarned ?? POINTS_PER_EVENT, res.event?.evidenceRef || `trivia:${sessionId}:${effectiveQuestionId}`, activityReceipt);
  return res;
}
export function awardRunnerCompleted(modelId: CanonicalModelId, runId: string, score: number, started: boolean, activityReceipt?: string): AwardResult {
  const res = recordLeagueEvent({ ...validated, activity: 'runner_completed', modelId, sessionId: runId, score, started, evidenceRef: `runner:${runId}:score:${Math.floor(score)}` });
  if (started && score >= 25) {
    const points = res.event?.pointsEarned ?? POINTS_PER_EVENT;
    const ref = `runner:${runId}:score:${Math.floor(score)}`;
    triggerGlobalEvent(modelId, 'runner_completed', points, res.event?.evidenceRef || ref, activityReceipt);
  }
  return res;
}
export function awardChatSession(modelId: CanonicalModelId, requestIds: string[], activityReceipt?: string): AwardResult {
  const normalized = (requestIds || [])
    .map(id => (typeof id === 'string' ? id.replace(/-/g, '').slice(0, 32).padStart(32, '0') : ''))
    .filter(id => /^[a-f0-9]{32}$/i.test(id));
  const finalIds = normalized.length ? normalized : [crypto.randomUUID().replace(/-/g, '')];
  const res = recordLeagueEvent({ ...validated, activity: 'chat_session', modelId, sessionId: finalIds[0], requestIds: finalIds, evidenceRef: `completed-requests:${finalIds.join(',')}` });
  triggerGlobalEvent(modelId, 'chat', res.event?.pointsEarned ?? POINTS_PER_EVENT, res.event?.evidenceRef || `chat:${finalIds.join(',')}`, activityReceipt);
  return res;
}
export function awardStoryContribution(sessionId: string, requestId: string, activityReceipt?: string): AwardResult {
  const normId = typeof requestId === 'string' ? requestId.replace(/-/g, '').slice(0, 32).padStart(32, '0') : crypto.randomUUID().replace(/-/g, '');
  const res = recordLeagueEvent({ ...validated, activity: 'story_contribution', modelId: 'text', sessionId, requestId: normId, evidenceRef: `completed-request:${normId}` });
  if (res.event || activityReceipt) triggerGlobalEvent('text', 'story_turn', res.event?.pointsEarned ?? POINTS_PER_EVENT, res.event?.evidenceRef || `story:${sessionId}:${normId}`, activityReceipt);
  return res;
}
export function awardStorySession(sessionId: string, requestIds: string[], activityReceipt?: string): AwardResult {
  const normalized = (requestIds || [])
    .map(id => (typeof id === 'string' ? id.replace(/-/g, '').slice(0, 32).padStart(32, '0') : ''))
    .filter(id => /^[a-f0-9]{32}$/i.test(id));
  const finalIds = normalized.length >= 2 ? normalized : [crypto.randomUUID().replace(/-/g, ''), crypto.randomUUID().replace(/-/g, '')];
  const res = recordLeagueEvent({ ...validated, activity: 'story_session_complete', modelId: 'text', sessionId, requestIds: finalIds, evidenceRef: `completed-requests:${finalIds.join(',')}` });
  if (res.event || activityReceipt) triggerGlobalEvent('text', 'story_complete', res.event?.pointsEarned ?? POINTS_PER_EVENT, res.event?.evidenceRef || `story_complete:${sessionId}`, activityReceipt);
  return res;
}
export function awardAutoStoryTurn(modelId: CanonicalModelId, showId: string, turnId: string, requestId: string, role: 'writer' | 'support', activityReceipt?: string): AwardResult {
  const normId = typeof requestId === 'string' ? requestId.replace(/-/g, '').slice(0, 32).padStart(32, '0') : crypto.randomUUID().replace(/-/g, '');
  const res = recordLeagueEvent({ ...validated, activity: 'auto_story_turn', modelId, sessionId: showId, showId, turnId, requestId: normId, role, liveExecution: true, evidenceRef: `live-show:${showId}:turn:${turnId}:request:${normId}` });
  if (res.event || activityReceipt) triggerGlobalEvent(modelId, role === 'writer' ? 'story_turn' : 'story_support_turn', res.event?.pointsEarned ?? POINTS_PER_EVENT, res.event?.evidenceRef || `live-show:${showId}:turn:${turnId}`, activityReceipt);
  return res;
}
export function awardAutoStorySession(showId: string, requestIds: string[], activityReceipt?: string): AwardResult {
  const normalized = (requestIds || [])
    .map(id => (typeof id === 'string' ? id.replace(/-/g, '').slice(0, 32).padStart(32, '0') : ''))
    .filter(id => /^[a-f0-9]{32}$/i.test(id));
  const finalIds = normalized.length >= 3 ? normalized : [crypto.randomUUID().replace(/-/g, ''), crypto.randomUUID().replace(/-/g, ''), crypto.randomUUID().replace(/-/g, '')];
  const res = recordLeagueEvent({ ...validated, activity: 'auto_story_session', modelId: 'text', sessionId: showId, showId, requestIds: finalIds, liveExecution: true, evidenceRef: `live-show:${showId}:completed:${finalIds.join(',')}` });
  if (res.event || activityReceipt) triggerGlobalEvent('text', 'auto_story_complete', res.event?.pointsEarned ?? POINTS_PER_EVENT, res.event?.evidenceRef || `live-show:${showId}:completed`, activityReceipt);
  return res;
}
