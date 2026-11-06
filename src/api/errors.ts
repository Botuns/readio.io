import { assertNever } from '@/domain/assertNever';

/** Every way a request can fail. The UI picks copy and actions from `kind`. */
export type ApiError =
  | { kind: 'network'; endpoint: string; offline: boolean; message: string }
  | { kind: 'timeout'; endpoint: string; timeoutMs: number }
  | { kind: 'http'; endpoint: string; status: number; statusText: string }
  | { kind: 'not_found'; endpoint: string; status: number | null }
  /** `status` is null when the request was not sent because nobody is signed in. */
  | { kind: 'unauthorized'; endpoint: string; status: number | null }
  | { kind: 'parse'; endpoint: string; issues: string[] };

export type ApiErrorKind = ApiError['kind'];

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** Thrown inside query functions so TanStack Query carries the typed error. */
export class ApiRequestError extends Error {
  readonly detail: ApiError;

  constructor(detail: ApiError) {
    super(`${detail.kind} error for ${detail.endpoint}`);
    this.name = 'ApiRequestError';
    this.detail = detail;
  }
}

/** Only transient failures are worth retrying automatically. */
export function isRetryable(error: ApiError): boolean {
  switch (error.kind) {
    case 'network':
      return !error.offline;
    case 'timeout':
      return true;
    case 'http':
      return error.status >= 500;
    case 'not_found':
    case 'unauthorized':
    case 'parse':
      return false;
    default:
      return assertNever(error);
  }
}
