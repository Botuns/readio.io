import { QueryClient } from '@tanstack/react-query';
import { ApiRequestError, isRetryable } from '@/api/errors';

const MAX_RETRIES = 2;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          failureCount < MAX_RETRIES &&
          error instanceof ApiRequestError &&
          isRetryable(error.detail),
        retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 2000),
        refetchOnWindowFocus: false,
        // Requests always run, even when the browser reports it is offline. Mock
        // mode is served by a service worker and needs no network; in live mode
        // the request fails fast and the "You are offline" state is shown,
        // instead of a skeleton that never resolves.
        networkMode: 'always',
      },
    },
  });
}
