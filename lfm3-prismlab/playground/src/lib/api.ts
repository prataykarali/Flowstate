import type { CanonicalModelId } from '../data/models.ts';
import type { LockHandle } from './inferenceLock.ts';

let lockAcquire: ((model: CanonicalModelId, task: string) => LockHandle) | null = null;
let lockIsBusy: (() => boolean) | null = null;

export function registerInferenceLock(
  acquire: (model: CanonicalModelId, task: string) => LockHandle,
  isBusy: () => boolean
): void {
  lockAcquire = acquire;
  lockIsBusy = isBusy;
}

export const API = (import.meta.env?.VITE_INFERENCE_API_ORIGIN || import.meta.env?.VITE_VPS_API_ORIGIN || '').replace(/\/$/, '') + '/local-api';
export type LiveTask = 'chat' | 'summarize' | 'ocr' | 'transcribe' | 'audio_qa' | 'video_qa' | 'decision';
export type MediaKind = 'image' | 'audio' | 'video';
export interface MediaPayload { mime: string; data_base64: string }
export interface ExecuteRequest {
  task: LiveTask;
  prompt: string;
  image?: MediaPayload;
  audio?: MediaPayload;
  video?: MediaPayload;
  required_media?: MediaKind[];
  model?: CanonicalModelId;
  decision_question?: { instructions: string; criteria: Record<string, string> };
  max_tokens?: number;
  response_format?: { type: string };
  job_id?: string;
  activity_session_id?: string;
  checkpoint?: { turn_index: number; activity_type?: string; state?: Record<string, unknown> };
}
export interface LiveTraceStep { stage: string; status: 'ok' | 'review' | 'error' | string; model?: string; latency_s?: number | null; ttft_s?: number | null; note?: string }
export interface LiveResult {
  mode?: string;
  request_id: string;
  requested_model?: CanonicalModelId;
  backend_model_id?: string;
  task?: LiveTask;
  model?: string;
  status: 'completed' | 'review' | 'failed';
  route: string[];
  output: string | { predicted_route: string; confidence: number; probabilities?: Record<string, number>; human_review_required?: boolean; exploratory_gate_passed?: boolean; external_action_executed?: boolean };
  finish_reason?: string;
  metrics: { total_latency_s: number | null; ttft_s: number | null; tokens_per_second: number | null };
  trace: LiveTraceStep[];
  warnings?: string[];
  error?: string;
  activity_receipt?: string;
}
export type HealthState = 'ONLINE' | 'BUSY' | 'UNKNOWN' | 'OFFLINE';

export interface GatewayStatus {
  gateway_enabled: boolean;
  backend_available: boolean;
  backend_live_enabled: boolean;
  auto_start_available?: boolean;
  inference_busy?: boolean;
  text_model_available: boolean;
  multimodal_model_available: boolean;
  on_demand_routes?: string[];
  backend_mode?: string;
  multimodal_model_alias?: string;
  queue?: { active: number; waiting: number; waiting_limit: number };
  reason: string;
  health_state?: HealthState;
}

export interface BackendJobRecord {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  model_id: string;
  activity_type: string;
  position: number;
  streamed_tokens?: string[];
  result?: LiveResult | null;
  error?: string | null;
  completed_at?: number | null;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
    public computeRemaining?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
async function jsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try { data = JSON.parse(text); } catch { /* text payload */ }
  if (!response.ok) {
    const detail = data && typeof data.detail === 'string' ? data.detail : text.slice(0, 200) || `Request failed with status ${response.status}`;
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
    const computeRemainingHeader = response.headers.get('x-compute-remaining');
    const computeRemaining = computeRemainingHeader ? parseFloat(computeRemainingHeader) : undefined;
    throw new ApiError(detail, response.status, retryAfter, computeRemaining);
  }
  return (data !== null ? data : text) as T;
}
let tokenPromise: Promise<string> | null = null;
let tokenExpiresAt = 0;

export async function fetchSessionToken(): Promise<string> {
  const vercelOrigin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : (import.meta.env?.VITE_VERCEL_ORIGIN || 'https://prismlab-playground-rho.vercel.app');
  const response = await fetch(`${vercelOrigin}/api/session`, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`Session token request failed: ${text.slice(0, 200)}`, response.status);
  }
  const data = await response.json() as { token: string; expires_at?: number; expires_in?: number };
  if (!data.token || typeof data.token !== 'string') throw new ApiError('Malformed session response', 502);
  const expiry = data.expires_at ? data.expires_at * 1000 : Date.now() + Math.max(30, (data.expires_in || 600) - 15) * 1000;
  tokenExpiresAt = expiry - 15000;
  return data.token;
}

export async function getSessionToken(): Promise<string> {
  if (tokenPromise && Date.now() < tokenExpiresAt) return tokenPromise;
  tokenPromise = fetchSessionToken().catch(error => { tokenPromise = null; tokenExpiresAt = 0; throw error; });
  return tokenPromise;
}

export async function authHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export type GatewayStatusListener = (status: GatewayStatus) => void;
const gatewayStatusListeners = new Set<GatewayStatusListener>();

export function subscribeGatewayStatus(listener: GatewayStatusListener): () => void {
  gatewayStatusListeners.add(listener);
  if (cachedOnline) listener(cachedOnline);
  else if (cachedOffline) listener(cachedOffline);
  return () => { gatewayStatusListeners.delete(listener); };
}

export function notifyGatewayStatus(status: GatewayStatus): void {
  gatewayStatusListeners.forEach((l) => {
    try { l(status); } catch (e) { console.error('Status listener error:', e); }
  });
}

export type OfflineModalTrigger = () => void;
const offlineModalTriggers = new Set<OfflineModalTrigger>();

export function registerOfflineModalTrigger(trigger: OfflineModalTrigger): () => void {
  offlineModalTriggers.add(trigger);
  return () => { offlineModalTriggers.delete(trigger); };
}

export function triggerOfflineModal(): void {
  offlineModalTriggers.forEach((t) => {
    try { t(); } catch (e) { console.error(e); }
  });
}

let nextStatusProbe = 0;
let statusFailures = 0;
let cachedOffline: GatewayStatus | null = null;
let cachedOnline: GatewayStatus | null = null;
let cachedOnlineExpires = 0;

export function invalidateGatewayCache(): void {
  statusFailures = 0;
  nextStatusProbe = 0;
  cachedOffline = null;
  cachedOnline = null;
  cachedOnlineExpires = 0;
}

export async function getGatewayStatus(force = false): Promise<GatewayStatus> {
  if (!force && Date.now() < cachedOnlineExpires && cachedOnline) return cachedOnline;
  if (!force && Date.now() < nextStatusProbe && cachedOffline) return cachedOffline;
  try {
    const headers = await authHeaders();
    const status = await jsonResponse<GatewayStatus>(await fetch(`${API}/status`, {
      cache: 'no-store',
      headers,
      signal: AbortSignal.timeout(20_000)
    }));
    statusFailures = 0;
    nextStatusProbe = 0;
    cachedOffline = null;
    const isBusy = !!status.inference_busy || (status.queue?.active ?? 0) > 0;
    status.health_state = (status.gateway_enabled && status.backend_live_enabled)
      ? (isBusy ? 'BUSY' : 'ONLINE')
      : 'OFFLINE';
    cachedOnline = status;
    cachedOnlineExpires = Date.now() + 10_000;
    notifyGatewayStatus(status);
    return status;
  } catch (err) {
    cachedOnline = null;
    cachedOnlineExpires = 0;
    if (err instanceof ApiError && err.status === 401) {
      // Session expired or invalid; trigger renewal on next call without long lockout
      tokenPromise = null;
      tokenExpiresAt = 0;
      nextStatusProbe = Date.now() + 2_000;
      cachedOffline = {
        gateway_enabled: false,
        backend_available: false,
        backend_live_enabled: false,
        text_model_available: false,
        multimodal_model_available: false,
        reason: 'Session authentication renewing…',
        health_state: 'UNKNOWN'
      };
      notifyGatewayStatus(cachedOffline);
      return cachedOffline;
    }
    if (lockIsBusy?.()) {
      return {
        gateway_enabled: true,
        backend_available: true,
        backend_live_enabled: true,
        inference_busy: true,
        text_model_available: true,
        multimodal_model_available: true,
        reason: 'Inference currently executing…',
        health_state: 'BUSY'
      };
    }
    statusFailures += 1;
    // Bounded backoff: max 10s (never 300s)
    nextStatusProbe = Date.now() + Math.min(10_000, 2_000 * (2 ** Math.min(statusFailures - 1, 2)));
    const isNetworkError = err instanceof TypeError || (err instanceof Error && /failed to fetch|network|refused|timeout|abort/i.test(err.message));
    const isOffline = isNetworkError || statusFailures >= 2;
    cachedOffline = {
      gateway_enabled: false,
      backend_available: false,
      backend_live_enabled: false,
      text_model_available: false,
      multimodal_model_available: false,
      reason: isOffline
        ? 'PrismLab host laptop is currently offline. Games, research desk, and replays remain available.'
        : 'Inference gateway busy; retrying status…',
      health_state: isOffline ? 'OFFLINE' : 'UNKNOWN'
    };
    notifyGatewayStatus(cachedOffline);
    return cachedOffline;
  }
}

export async function getJob(jobId: string): Promise<BackendJobRecord> {
  const headers = await authHeaders();
  const res = await fetch(`${API}/jobs/${encodeURIComponent(jobId)}`, {
    headers,
    cache: 'no-store'
  });
  return await jsonResponse<BackendJobRecord>(res);
}

export async function cancelJob(jobId: string): Promise<{ status: string; job_id: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${API}/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({}),
    cache: 'no-store'
  });
  return await jsonResponse<{ status: string; job_id: string }>(res);
}

export function validateRequest(request: ExecuteRequest): string | null {
  if (!['chat','summarize','ocr','transcribe','audio_qa','video_qa','decision'].includes(request.task)) return 'Unsupported task.';
  if (request.prompt.length > 1000) return 'Prompt must be at most 1,000 characters.';
  if (!request.prompt.trim() && !request.image && !request.audio && !request.video) return 'Enter text or attach supported media.';
  if (!request.model && request.task === 'decision' && request.image && !request.audio) return 'Image-only decision is not validated by the automatic router.';
  if ([request.image,request.audio,request.video].filter(Boolean).length > 1 && !request.required_media?.length) return 'Mixed media requires explicit selection.';
  if (request.max_tokens != null && (!Number.isInteger(request.max_tokens) || request.max_tokens < 4 || request.max_tokens > 256)) {
    return 'max_tokens must be 4–256.';
  }
  return null;
}
export async function readMedia(file: File, kind: MediaKind): Promise<MediaPayload> {
  const allowed = kind === 'image' ? ['image/png','image/jpeg'] : kind === 'audio' ? ['audio/wav','audio/x-wav'] : ['video/mp4'];
  if (!allowed.includes(file.type)) throw new Error(`${kind}: use ${allowed.join(' or ')}.`);
  const maxBytes = kind === 'video' ? 8_000_000 : 5_000_000;
  if (!file.size || file.size > maxBytes) throw new Error(`${kind}: file must be between 1 byte and ${maxBytes / 1_000_000} MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = kind === 'image' ? (file.type === 'image/png' ? [137,80,78,71,13,10,26,10] : [255,216,255]) : kind === 'audio' ? [82,73,70,70] : [0,0,0,0];
  const valid = kind === 'video' ? bytes.length >= 12 && String.fromCharCode(...bytes.slice(4,8)) === 'ftyp' : signature.every((value,index) => bytes[index] === value) && (kind !== 'audio' || String.fromCharCode(...bytes.slice(8,12)) === 'WAVE');
  if (!valid) throw new Error(`${kind}: file signature does not match its type.`);
  let binary = ''; for (let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return { mime:file.type, data_base64:btoa(binary) };
}

async function post<T>(path: string, body: unknown, jobId?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...await authHeaders()
  };
  if (jobId) headers['X-Job-Id'] = jobId;
  try {
    return await jsonResponse<T>(await fetch(`${API}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000)
    }));
  } catch (err) {
    if (err instanceof TypeError || (err instanceof Error && /failed to fetch|network|refused/i.test(err.message))) {
      triggerOfflineModal();
    }
    throw err;
  }
}

async function get<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    ...await authHeaders()
  };
  try {
    return await jsonResponse<T>(await fetch(`${API}${path}`, { method:'GET', headers, cache:'no-store' }));
  } catch (err) {
    if (err instanceof TypeError || (err instanceof Error && /failed to fetch|network|refused/i.test(err.message))) {
      triggerOfflineModal();
    }
    throw err;
  }
}

export async function executeLocal(request: ExecuteRequest): Promise<LiveResult> {
  const error = validateRequest(request); if (error) throw new ApiError(error, 422);
  const targetModel = request.model || 'text';
  const needLock = (!lockIsBusy || !lockIsBusy()) && !!lockAcquire;
  const lock = needLock ? lockAcquire!(targetModel, request.task) : null;
  try {
    const result = await post<LiveResult>('/execute', request, request.job_id);
    lock?.release('completed');
    return result;
  } catch (err) {
    lock?.release('failed');
    throw err;
  }
}

export async function executeLocalStream(request: ExecuteRequest, onUpdate: (update: TextStreamUpdate) => void, signal?: AbortSignal): Promise<LiveResult> {
  const error = validateRequest(request); if (error) throw new ApiError(error, 422);
  const targetModel = request.model || 'text';
  const needLock = (!lockIsBusy || !lockIsBusy()) && !!lockAcquire;
  const lock = needLock ? lockAcquire!(targetModel, request.task) : null;
  let fallback = false;

  const combinedSignal = signal;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...await authHeaders()
    };
    if (request.job_id) headers['X-Job-Id'] = request.job_id;
    const response = await fetch(`${API}/execute/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      cache: 'no-store',
      signal: combinedSignal || AbortSignal.timeout(150_000)
    });
    if (response.status === 404) {
      fallback = true;
    } else if (!response.ok) {
      await jsonResponse(response);
    } else {
      if (!response.body) throw new Error('The stream has no response body.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result: LiveResult | null = null;
      const parse = (frame: string) => {
        const lines = frame.split('\n');
        const kind = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
        const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
        if (!kind || !data) return;
        const payload = JSON.parse(data) as Record<string, unknown>;
        if (kind === 'token' && typeof payload.text === 'string') {
          lock?.updatePhase('generating');
          onUpdate({ kind: 'token', text: payload.text });
        }
        if (kind === 'status') {
          const stage = String(payload.stage || 'requesting');
          if (stage === 'queued') lock?.updatePhase('queued');
          else if (stage === 'loading_model') lock?.updatePhase('loading');
          onUpdate({ kind: 'status', stage, message: String(payload.message || '') });
        }
        if (kind === 'result') result = payload as unknown as LiveResult;
        if (kind === 'error') throw new Error(String(payload.message || 'Local inference failed.'));
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true }).replaceAll('\r\n', '\n');
        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          parse(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
          if (result) break;
        }
        if (result) {
          try { await reader.cancel(); } catch {}
          break;
        }
      }
      if (!result && buffer.trim()) {
        buffer += decoder.decode();
        parse(buffer);
      }
      if (!result) throw new Error('Local stream ended without a final result.');
      lock?.release('completed');
      return result;
    }
  } catch (err) {
    if (fallback) {
      if (signal?.aborted) {
        lock?.release('failed');
        throw new DOMException('Request cancelled', 'AbortError');
      }
      try {
        const res = await executeLocal(request);
        lock?.release('completed');
        return res;
      } catch (e) {
        lock?.release('failed');
        throw e;
      }
    }
    lock?.release('failed');
    throw err;
  }

  if (fallback) {
    if (signal?.aborted) {
      lock?.release('failed');
      throw new DOMException('Request cancelled', 'AbortError');
    }
    try {
      const res = await executeLocal(request);
      lock?.release('completed');
      return res;
    } catch (e) {
      lock?.release('failed');
      throw e;
    }
  }
  lock?.release('failed');
  throw new Error('Local stream unavailable.');
}

export async function generateText(prompt: string, jobId?: string, maxTokens = 128, activitySessionId?: string): Promise<LiveResult> {
  if (!prompt.trim() || prompt.length > 1000) throw new ApiError('Text prompt must be 1–1,000 characters.', 422);
  const cappedTokens = Math.max(16, Math.min(128, Number.isInteger(maxTokens) ? maxTokens : 128));
  const needLock = (!lockIsBusy || !lockIsBusy()) && !!lockAcquire;
  const lock = needLock ? lockAcquire!('text', 'chat') : null;
  try {
    const result = await post<LiveResult>('/text', { prompt, max_tokens: cappedTokens, job_id: jobId, activity_session_id: activitySessionId }, jobId);
    lock?.release('completed');
    return result;
  } catch (err) {
    lock?.release('failed');
    throw err;
  }
}

export type TextStreamUpdate = { kind: 'status'; stage: string; message: string } | { kind: 'token'; text: string };

export async function generateTextStream(
  prompt: string,
  onUpdate: (update: TextStreamUpdate) => void,
  maxTokens = 128,
  signal?: AbortSignal,
  jobId?: string,
  activitySessionId?: string,
  checkpoint?: { turn_index: number; activity_type?: string; state?: Record<string, unknown> }
): Promise<LiveResult> {
  if (!prompt.trim() || prompt.length > 1000) throw new ApiError('Text prompt must be 1–1,000 characters.', 422);
  const cappedTokens = Math.max(16, Math.min(128, Number.isInteger(maxTokens) ? maxTokens : 128));
  const needLock = (!lockIsBusy || !lockIsBusy()) && !!lockAcquire;
  const lock = needLock ? lockAcquire!('text', 'chat') : null;
  let fallback = false;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...await authHeaders()
    };
    if (jobId) headers['X-Job-Id'] = jobId;
    const response = await fetch(`${API}/text/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        max_tokens: cappedTokens,
        job_id: jobId,
        activity_session_id: activitySessionId,
        checkpoint
      }),
      cache: 'no-store',
      signal: signal || AbortSignal.timeout(150_000)
    });
    if (response.status === 404) {
      if (cappedTokens !== 128) throw new ApiError('Restart the local backend to use bounded streaming output.', 503);
      fallback = true;
    } else if (!response.ok) {
      await jsonResponse(response);
    } else {
      if (!response.body) throw new Error('The local stream has no response body.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result: LiveResult | null = null;
      const parse = (frame: string) => {
        const lines = frame.split('\n');
        const kind = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
        const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
        if (!kind || !data) return;
        const payload = JSON.parse(data) as Record<string, unknown>;
        if (kind === 'token' && typeof payload.text === 'string') {
          lock?.updatePhase('generating');
          onUpdate({ kind: 'token', text: payload.text });
        }
        if (kind === 'status') {
          const stage = String(payload.stage || 'requesting');
          if (stage === 'queued') lock?.updatePhase('queued');
          else if (stage === 'loading_model') lock?.updatePhase('loading');
          onUpdate({ kind: 'status', stage, message: String(payload.message || '') });
        }
        if (kind === 'result') result = payload as unknown as LiveResult;
        if (kind === 'error') throw new Error(String(payload.message || 'Local text inference failed.'));
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true }).replaceAll('\r\n', '\n');
        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          parse(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
          if (result) break;
        }
        if (result) {
          try { await reader.cancel(); } catch {}
          break;
        }
      }
      if (!result && buffer.trim()) {
        buffer += decoder.decode();
        parse(buffer);
      }
      if (!result) throw new Error('Local text stream ended without a final result.');
      lock?.release('completed');
      return result;
    }
  } catch (err) {
    if (fallback) {
      try {
        const res = await generateText(prompt);
        lock?.release('completed');
        return res;
      } catch (e) {
        lock?.release('failed');
        throw e;
      }
    }
    lock?.release('failed');
    throw err;
  }

  if (fallback) {
    try {
      const res = await generateText(prompt);
      lock?.release('completed');
      return res;
    } catch (e) {
      lock?.release('failed');
      throw e;
    }
  }
  lock?.release('failed');
  throw new Error('Local text stream unavailable.');
}

export function outputText(output: LiveResult['output']): string {
  return typeof output === 'string' ? output : output == null ? 'No output returned.' : JSON.stringify(output, null, 2);
}

export interface ActivitySessionInfo {
  visitor_id: string;
  activity_type: 'CHAT' | 'STORY' | 'TRIVIA';
  session_id: string;
  status: 'active' | 'completed' | 'terminated' | 'expired' | 'parked';
  created_at: number;
  updated_at: number;
  expires_at: number;
  ttl_remaining_s: number;
  idempotency_key?: string | null;
  metadata?: Record<string, unknown> | null;
  current_job_id?: string | null;
}

export interface ActivityCurrentResponse {
  active: boolean;
  activity: ActivitySessionInfo | null;
  parked?: ActivitySessionInfo | null;
}

export async function getCurrentActivity(): Promise<ActivityCurrentResponse> {
  try {
    return await get<ActivityCurrentResponse>('/activity/current');
  } catch {
    return { active: false, activity: null, parked: null };
  }
}

export async function startActivity(
  activityType: 'CHAT' | 'STORY' | 'TRIVIA',
  sessionId?: string,
  idempotencyKey?: string,
  metadata?: Record<string, unknown>
): Promise<{ status: string; session: ActivitySessionInfo }> {
  return await post<{ status: string; session: ActivitySessionInfo }>('/activity/start', {
    activity_type: activityType,
    session_id: sessionId,
    idempotency_key: idempotencyKey,
    metadata
  });
}

export async function stopActivity(
  sessionId: string,
  reason = 'user_stopped'
): Promise<{ status: string; session: ActivitySessionInfo | null }> {
  return await post<{ status: string; session: ActivitySessionInfo | null }>('/activity/stop', {
    session_id: sessionId,
    reason
  });
}

export async function parkActivity(
  sessionId: string,
  metadata?: Record<string, unknown>
): Promise<{ status: string; session: ActivitySessionInfo | null }> {
  return await post<{ status: string; session: ActivitySessionInfo | null }>('/activity/park', {
    session_id: sessionId,
    metadata
  });
}

export async function resumeParkedActivity(
  sessionId: string
): Promise<{ status: string; session: ActivitySessionInfo }> {
  return await post<{ status: string; session: ActivitySessionInfo }>('/activity/resume-parked', {
    session_id: sessionId
  });
}

export async function heartbeatActivity(
  sessionId: string,
  extensionS = 180
): Promise<{ active: boolean; session: ActivitySessionInfo | null }> {
  return await post<{ active: boolean; session: ActivitySessionInfo | null }>('/activity/heartbeat', {
    session_id: sessionId,
    extension_s: extensionS
  });
}

export async function getActivityCheckpoints(
  sessionId: string
): Promise<{ session_id: string; checkpoints: Array<{ turn_index: number; activity_type: string; prompt?: string; output?: string; state: Record<string, unknown>; timestamp: number }> }> {
  return await get(`/activity/checkpoints/${sessionId}`);
}

export interface ComputeStatus {
  visitor_id: string;
  compute_budget_s: number;
  compute_used_s: number;
  compute_remaining_s: number;
  rate_window_s: number;
  cooldown_s: number;
  is_rate_limited: boolean;
}

export async function getComputeStatus(): Promise<ComputeStatus | null> {
  try {
    return await get<ComputeStatus>('/compute/status');
  } catch {
    return null;
  }
}


