import type { z } from 'zod';
import { getDataSource } from '@/lib/dataSource';
import { getCredentials, type CredentialInput } from './credentials';
import { env } from './env';
import type { ApiError, ApiResult } from './errors';
import { whenApiReady } from './ready';

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_REPORTED_ISSUES = 5;

interface GetOptions<T> {
  /** Path below the base URL. Build it with `apiPaths` so it is encoded once. */
  path: string;
  /** Runtime validator for the response body. Nothing is cast. */
  schema: z.ZodType<T>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Overrides the stored credentials. Used by the sign-in dialog to test a pair before saving it. */
  credentials?: CredentialInput;
}

/** Sent in mock mode when nobody is signed in; the mock layer does not check them. */
const MOCK_CREDENTIALS: CredentialInput = { customAuth: 'mock', basicAuth: 'bW9jazptb2Nr' };

function authHeaders(credentials: CredentialInput): HeadersInit {
  return {
    'Content-Type': 'application/json',
    MyAuthorizationx: credentials.customAuth,
    Authorization: `Basic ${credentials.basicAuth}`,
  };
}

function failure(error: ApiError): ApiResult<never> {
  return { ok: false, error };
}

/**
 * The single entry point to the Readie API. Sends all three required headers
 * on every call, enforces a timeout, and validates the body before returning.
 * Credentials come from the sign-in dialog or, in local development, from env.
 *
 * A caller-initiated abort is re-thrown so TanStack Query can treat it as a
 * cancellation; every other failure comes back as a typed `ApiError`.
 */
export async function apiGet<T>({
  path,
  schema,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  credentials: override,
}: GetOptions<T>): Promise<ApiResult<T>> {
  const endpoint = `${env.VITE_API_BASE_URL}${path}`;

  // Live requests are never sent without credentials: the API would answer 401
  // and nothing is gained. The UI offers the sign-in dialog instead.
  const credentials =
    override ?? getCredentials() ?? (getDataSource() === 'mock' ? MOCK_CREDENTIALS : null);
  if (credentials === null) return failure({ kind: 'unauthorized', endpoint, status: null });

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
      await whenApiReady();
      response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders(credentials),
        // The app sends its own Authorization header. Omitting browser
        // credentials also stops the browser showing its built-in password
        // prompt when the API answers 401 with `WWW-Authenticate: Basic`.
        credentials: 'omit',
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
