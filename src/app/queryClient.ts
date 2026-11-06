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
      },
    },
  });
}
