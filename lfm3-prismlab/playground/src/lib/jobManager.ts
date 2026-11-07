import { useSyncExternalStore } from 'react';
import type { CanonicalModelId } from '../data/models.ts';
import type { LiveResult } from './api.ts';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PersistentJob {
  jobId: string;
  task: 'chat' | 'story' | 'trivia' | string;
  modelId: CanonicalModelId;
  prompt: string;
  status: JobStatus;
  position?: number;
  tokens: string[];
  result?: LiveResult | null;
  error?: string | null;
  createdAt: number;
  completedAt?: number | null;
}

const JOBS_STORAGE_KEY = 'prismlab_persistent_jobs_v1';

function loadStoredJobs(): Map<string, PersistentJob> {
  const map = new Map<string, PersistentJob>();
  if (typeof window === 'undefined') return map;
  try {
    const raw = sessionStorage.getItem(JOBS_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw) as PersistentJob[];
      const now = Date.now();
      for (const j of list) {
        if (now - j.createdAt < 15 * 60 * 1000) {
          map.set(j.jobId, j);
        }
      }
    }
  } catch {}
  return map;
}

function saveStoredJobs(jobs: Map<string, PersistentJob>) {
  if (typeof window === 'undefined') return;
  try {
    const list = Array.from(jobs.values());
    sessionStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

const activeJobs = loadStoredJobs();
const listeners = new Set<() => void>();

function notify() {
  saveStoredJobs(activeJobs);
  for (const l of listeners) l();
}

export function registerJob(job: PersistentJob) {
  activeJobs.set(job.jobId, job);
  notify();
}

export function updateJobTokens(jobId: string, token: string) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.tokens.push(token);
    job.status = 'running';
    notify();
  }
}

export function updateJobStatus(jobId: string, status: JobStatus, position?: number) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.status = status;
    if (position !== undefined) job.position = position;
    notify();
  }
}

export function completeJob(jobId: string, result: LiveResult) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.status = 'completed';
    job.completedAt = Date.now();
    job.result = result;
    notify();
  }
}

export function failJob(jobId: string, error: string) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.status = 'failed';
    job.completedAt = Date.now();
    job.error = error;
    notify();
  }
}

export function getJob(jobId: string): PersistentJob | undefined {
  return activeJobs.get(jobId);
}

export function getLatestJobForTask(task: string): PersistentJob | undefined {
  let latest: PersistentJob | undefined;
  for (const j of activeJobs.values()) {
    if (j.task === task && (!latest || j.createdAt > latest.createdAt)) {
      latest = j;
    }
  }
  return latest;
}

export function cancelPersistentJob(jobId: string) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.status = 'cancelled';
    notify();
  }
}

export function useActiveJob(jobId?: string | null): PersistentJob | null {
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  const getSnapshot = () => (jobId ? activeJobs.get(jobId) || null : null);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useLatestJob(task: string): PersistentJob | null {
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  const getSnapshot = () => getLatestJobForTask(task) || null;
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
