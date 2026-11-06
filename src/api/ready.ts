/**
 * A gate the API client waits on before its first request.
 *
 * In mock mode the service worker takes a moment to start. Rather than hold
 * back the whole app until then, the shell and skeletons render immediately
 * and only the requests wait, so they are never sent before the mock layer
 * can answer them. In live mode the gate is already open.
 */
let gate: Promise<void> = Promise.resolve();

export function gateApiOn(ready: Promise<void>): void {
  // A failed start-up is reported by the entry point, not by every request.
  gate = ready.catch(() => undefined);
}

export function whenApiReady(): Promise<void> {
  return gate;
}
