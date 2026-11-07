import { useSyncExternalStore } from 'react';
import type { CanonicalModelId } from '../data/models.ts';
import { getGatewayStatus, invalidateGatewayCache, type GatewayStatus } from './api.ts';

export type BackendReadiness =
  | 'BACKEND_OFFLINE'
  | 'CONNECTING'
  | 'BACKEND_ONLINE'
  | 'MODEL_AVAILABLE_ON_DEMAND'
  | 'MODEL_LOADING'
  | 'MODEL_READY'
  | 'GENERATING'
  | 'REQUEST_QUEUED'
  | 'QUEUE_FULL'
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMITED'
  | 'INFERENCE_FAILED';

export interface ModelAvailabilityState {
  readiness: BackendReadiness;
  status: GatewayStatus | null;
  isOnline: boolean;
  lastChecked: number;
  error: string | null;
}

let currentState: ModelAvailabilityState = {
  readiness: 'CONNECTING',
  status: null,
  isOnline: false,
  lastChecked: 0,
  error: null,
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function computeReadiness(status: GatewayStatus | null): BackendReadiness {
  if (!status) return 'CONNECTING';
  if (!status.gateway_enabled || !status.backend_available) return 'BACKEND_OFFLINE';
  if (status.reason?.includes('Session authentication renewing')) return 'AUTHENTICATION_ERROR';
  if (status.inference_busy) {
    if (status.queue && status.queue.waiting >= (status.queue.waiting_limit || 3)) {
      return 'QUEUE_FULL';
    }
    return 'REQUEST_QUEUED';
  }
  if (status.backend_live_enabled) {
    if (status.on_demand_routes && status.on_demand_routes.length > 0) {
      return 'MODEL_AVAILABLE_ON_DEMAND';
    }
    return 'BACKEND_ONLINE';
  }
  if (status.auto_start_available) return 'MODEL_AVAILABLE_ON_DEMAND';
  return 'BACKEND_OFFLINE';
}

let probePromise: Promise<GatewayStatus> | null = null;

export async function refreshAvailability(force = false): Promise<GatewayStatus> {
  if (probePromise && !force) return probePromise;
  probePromise = (async () => {
    try {
      const s = await getGatewayStatus(force);
      const isOnline = !!s.gateway_enabled && (!!s.backend_live_enabled || !!s.auto_start_available);
      currentState = {
        readiness: computeReadiness(s),
        status: s,
        isOnline,
        lastChecked: Date.now(),
        error: null,
      };
      notify();
      return s;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Gateway unreachable';
      currentState = {
        readiness: 'BACKEND_OFFLINE',
        status: currentState.status,
        isOnline: false,
        lastChecked: Date.now(),
        error: errorMsg,
      };
      notify();
      throw err;
    } finally {
      probePromise = null;
    }
  })();
  return probePromise;
}

// Background auto-refresh scheduling
if (typeof window !== 'undefined') {
  void refreshAvailability(true);

  // Immediate probe on visibility restore
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      invalidateGatewayCache();
      void refreshAvailability(true);
    }
  });

  // Background interval: 30s
  window.setInterval(() => {
    if (!document.hidden) void refreshAvailability(false);
  }, 30_000);
}

export function getAvailabilitySnapshot(): ModelAvailabilityState {
  return currentState;
}

export function subscribeAvailability(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useModelAvailability(): ModelAvailabilityState {
  return useSyncExternalStore(subscribeAvailability, getAvailabilitySnapshot, getAvailabilitySnapshot);
}

export function isModelAvailableOnDemand(modelId: CanonicalModelId, status: GatewayStatus | null): {
  available: boolean;
  label: string;
  dotClass: string;
} {
  if (!status || !status.gateway_enabled) {
    return { available: false, label: 'Local model offline', dotClass: 'is-offline' };
  }
  if (status.inference_busy) {
    return { available: true, label: '◐ AI busy (in queue)', dotClass: 'is-busy' };
  }
  if (status.auto_start_available && !status.backend_live_enabled) {
    return { available: true, label: '● Starts when you send', dotClass: 'is-ready' };
  }
  if (status.on_demand_routes?.includes(modelId)) {
    return { available: true, label: '● Ready on request', dotClass: 'is-ready' };
  }
  if (modelId === 'text' && status.text_model_available) {
    return { available: true, label: '● Local model ready', dotClass: 'is-ready' };
  }
  if (status.backend_live_enabled) {
    return { available: true, label: '● Ready on request', dotClass: 'is-ready' };
  }
  return { available: false, label: '○ Local model offline', dotClass: 'is-offline' };
}
