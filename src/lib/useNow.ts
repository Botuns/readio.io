import { useSyncExternalStore } from 'react';

const TICK_MS = 30_000;
let current = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  timer ??= setInterval(() => {
    current = Date.now();
    for (const notify of listeners) notify();
  }, TICK_MS);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** The current time, shared by every subscriber and refreshed twice a minute. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => current);
}
