let running = false;
const listeners = new Set<() => void>();

export function isTriviaRunning(): boolean { return running; }
export function setTriviaRunning(value: boolean): void {
  if (running === value) return;
  running = value;
  listeners.forEach(listener => listener());
}
export function subscribeTriviaRunning(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
