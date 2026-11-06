import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiRequestError, type ApiError } from '@/api/errors';

interface ErrorRenderArgs {
  error: ApiError;
  retry: () => void;
  isRetrying: boolean;
}

interface SuccessMeta {
  /** True while older data is shown and a newer request is in flight. */
  isRefreshing: boolean;
}

interface QueryStateProps<T> {
  query: UseQueryResult<T>;
  /** Names what is loading for screen readers, for example "campaign 119 candidates". */
  label: string;
  loading: ReactNode;
  error: (args: ErrorRenderArgs) => ReactNode;
  isEmpty: (data: T) => boolean;
  empty: (data: T) => ReactNode;
  children: (data: T, meta: SuccessMeta) => ReactNode;
}

/** Errors thrown by anything other than the API client are reported as parse errors. */
function toApiError(error: Error): ApiError {
  if (error instanceof ApiRequestError) return error.detail;
  return { kind: 'parse', endpoint: 'client', issues: [error.message] };
}

/**
 * Renders exactly one of the four async states. Every prop is required, so a
 * screen cannot be written without deciding what loading, error and empty look
 * like. State changes are announced through a polite live region.
 */
export function QueryState<T>({
  query,
  label,
  loading,
  error,
  isEmpty,
  empty,
  children,
}: QueryStateProps<T>) {
  let announcement: string;
  let content: ReactNode;

  if (query.data !== undefined) {
    const isRefreshing = query.isPlaceholderData || (query.isFetching && query.isError);
    announcement = isRefreshing ? `Loading ${label}` : `Loaded ${label}`;
    content = isEmpty(query.data) ? empty(query.data) : children(query.data, { isRefreshing });
  } else if (query.isError) {
    announcement = `Could not load ${label}`;
    content = error({
      error: toApiError(query.error),
      retry: () => void query.refetch(),
      isRetrying: query.isFetching,
    });
  } else {
    announcement = `Loading ${label}`;
    content = loading;
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {content}
    </>
  );
}
