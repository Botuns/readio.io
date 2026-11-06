import type { z } from 'zod';
import { env } from './env';
import type { ApiError, ApiResult } from './errors';

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_REPORTED_ISSUES = 5;

interface GetOptions<T> {
  /** Path below the base URL. Build it with `apiPaths` so it is encoded once. */
  path: string;
  /** Runtime validator for the response body. Nothing is cast. */
  schema: z.ZodType<T>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    MyAuthorizationx: env.VITE_API_CUSTOM_AUTH,
    Authorization: `Basic ${env.VITE_API_BASIC_AUTH}`,
  };
}

function failure(error: ApiError): ApiResult<never> {
  return { ok: false, error };
}

/**
 * The single entry point to the Readie API. Sends all three required headers
 * on every call, enforces a timeout, and validates the body before returning.
 *
 * A caller-initiated abort is re-thrown so TanStack Query can treat it as a
 * cancellation; every other failure comes back as a typed `ApiError`.
 */
export async function apiGet<T>({
  path,
  schema,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: GetOptions<T>): Promise<ApiResult<T>> {
  const endpoint = `${env.VITE_API_BASE_URL}${path}`;
  const controller = new AbortController();
  // Held in an object so the compiler does not assume it is still false after an await.
  const state = { timedOut: false };
  const timer = setTimeout(() => {
    state.timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => {
    controller.abort();
  };
  signal?.addEventListener('abort', forwardAbort, { once: true });
  if (signal?.aborted === true) controller.abort();

  try {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders(),
        signal: controller.signal,
      });
    } catch (cause) {
      if (state.timedOut) return failure({ kind: 'timeout', endpoint, timeoutMs });
      if (signal?.aborted === true) throw cause;
      return failure({
        kind: 'network',
        endpoint,
        offline: !navigator.onLine,
        message: cause instanceof Error ? cause.message : 'The request could not be sent.',
      });
    }

    if (response.status === 401 || response.status === 403) {
      return failure({ kind: 'unauthorized', endpoint, status: response.status });
    }
    if (response.status === 404) {
      return failure({ kind: 'not_found', endpoint, status: 404 });
    }
    if (!response.ok) {
      return failure({
        kind: 'http',
        endpoint,
        status: response.status,
        statusText: response.statusText,
      });
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (state.timedOut) return failure({ kind: 'timeout', endpoint, timeoutMs });
      if (signal?.aborted === true) throw new DOMException('Aborted', 'AbortError');
      return failure({ kind: 'parse', endpoint, issues: ['The response was not valid JSON.'] });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, MAX_REPORTED_ISSUES)
        .map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`);
      return failure({ kind: 'parse', endpoint, issues });
    }
    return { ok: true, data: parsed.data };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}
