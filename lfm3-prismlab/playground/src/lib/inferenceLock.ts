/**
 * Reactive Global Inference Lock Store
 *
 * Coordinates inference activities across Chat, Story, Trivia, and Playground.
 * While any model is generating, competing model generation and model switching
 * are locked in the active browser, while allowing non-inference navigation.
 *
 * Uses useSyncExternalStore for tear-free React subscriptions.
 */
import { useSyncExternalStore } from 'react';
import type { CanonicalModelId } from '../data/models.ts';

export type InferencePhase =
  | 'idle'
  | 'queued'
  | 'loading'
  | 'generating'
  | 'cancelling'
  | 'completed'
  | 'failed';

export interface InferenceLockState {
  busy: boolean;
  activeRequestId: string | null;
  modelId: CanonicalModelId | null;
  task: string | null;
  phase: InferencePhase;
  abortController: AbortController | null;
  startedAt: number | null;
}

const INITIAL_STATE: InferenceLockState = {
  busy: false,
  activeRequestId: null,
  modelId: null,
  task: null,
  phase: 'idle',
  abortController: null,
  startedAt: null,
};

let currentState: InferenceLockState = { ...INITIAL_STATE };
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Ignore subscriber errors
    }
  }
}

export function getInferenceLockSnapshot(): InferenceLockState {
  return currentState;
}

export function subscribeInferenceLock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInferenceLock(): InferenceLockState {
  return useSyncExternalStore(subscribeInferenceLock, getInferenceLockSnapshot, getInferenceLockSnapshot);
}

export function isAnyInferenceBusy(): boolean {
  return currentState.busy;
}

export interface LockHandle {
  requestId: string;
  updatePhase: (phase: InferencePhase) => void;
  release: (finalPhase?: 'completed' | 'failed') => void;
  signal: AbortSignal;
}

/**
 * Acquire ownership for an inference operation.
 * Throws an error if another inference operation is already active.
 */
export function acquireInference(
  modelId: CanonicalModelId,
  task: string,
  existingController?: AbortController
): LockHandle {
  if (currentState.busy) {
    throw new Error(
      `${currentState.modelId || 'Another model'} is currently ${currentState.phase}. Please wait for it to complete.`
    );
  }

  const requestId = crypto.randomUUID();
  const controller = existingController || new AbortController();

  currentState = {
    busy: true,
    activeRequestId: requestId,
    modelId,
    task,
    phase: 'loading',
    abortController: controller,
    startedAt: Date.now(),
  };
  notify();

  return {
    requestId,
    signal: controller.signal,
    updatePhase(phase: InferencePhase) {
      if (currentState.activeRequestId === requestId) {
        currentState = { ...currentState, phase };
        notify();
      }
    },
    release(finalPhase: 'completed' | 'failed' = 'completed') {
      if (currentState.activeRequestId === requestId) {
        currentState = {
          ...INITIAL_STATE,
          phase: finalPhase,
        };
        // Reset to idle after microtask
        Promise.resolve().then(() => {
          if (currentState.activeRequestId === null && currentState.phase !== 'idle') {
            currentState = { ...INITIAL_STATE };
            notify();
          }
        });
        notify();
      }
    },
  };
}

/**
 * Abort and release the currently active inference operation.
 */
export function cancelActiveInference(): boolean {
  if (!currentState.busy || !currentState.abortController) {
    return false;
  }
  try {
    currentState.abortController.abort();
  } catch {
    // Ignore abort errors
  }
  currentState = {
    ...currentState,
    phase: 'cancelling',
  };
  notify();

  // Force clean release if not already released
  const activeId = currentState.activeRequestId;
  setTimeout(() => {
    if (currentState.activeRequestId === activeId) {
      currentState = { ...INITIAL_STATE, phase: 'failed' };
      notify();
    }
  }, 1000);

  return true;
}

import { registerInferenceLock } from './api.ts';
registerInferenceLock(acquireInference, isAnyInferenceBusy);
