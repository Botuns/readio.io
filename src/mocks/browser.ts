import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Starts the service worker that answers API calls from fixtures. */
export async function startMockWorker(): Promise<void> {
  const worker = setupWorker(...handlers);
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}
