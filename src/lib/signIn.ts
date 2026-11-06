import { useSyncExternalStore } from 'react';

/**
 * Open state of the sign-in dialog. It lives outside React so anything can ask
 * for the dialog: the data-source menu, an "unauthorised" error panel, or
 * start-up in live mode with no credentials.
 */
let open = false;
const listeners = new Set<() => void>();

function set(next: boolean): void {
  if (open === next) return;
  open = next;
  for (const listener of listeners) listener();
}

export function openSignIn(): void {
  set(true);
}

export function closeSignIn(): void {
  set(false);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSignInOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open);
}
