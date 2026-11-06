import type { ApiError } from '@/api/errors';
import { assertNever } from '@/domain/assertNever';

export interface ErrorCopy {
  title: string;
  description: string;
  /** Whether trying the same request again can reasonably succeed. */
  canRetry: boolean;
}

/** Plain-language copy for each error kind. `subject` is e.g. "campaign 119". */
export function describeError(error: ApiError, subject: string): ErrorCopy {
  switch (error.kind) {
    case 'network':
      return error.offline
        ? {
            title: 'You are offline',
            description: `Reconnect to the internet, then try loading ${subject} again.`,
            canRetry: true,
          }
        : {
            title: 'Could not reach the Readie API',
            description: `The request for ${subject} got no response. This is usually a connection problem or a blocked request.`,
            canRetry: true,
          };
    case 'timeout':
      return {
        title: 'The request timed out',
        description: `The API took longer than ${Math.round(error.timeoutMs / 1000)} seconds to answer for ${subject}. It may be starting up, so try again.`,
        canRetry: true,
      };
    case 'http':
      return {
        title: 'The Readie API reported a problem',
        description: `The server answered with an error (${error.status}) while loading ${subject}. Try again in a moment.`,
        canRetry: true,
      };
    case 'unauthorized':
      return error.status === null
        ? {
            title: 'Sign in to load live data',
            description: `Live mode needs your username and password. Sign in to load ${subject}, or switch to mock data.`,
            canRetry: false,
          }
        : {
            title: 'The API rejected these credentials',
            description: `The request for ${subject} was refused (${error.status}). Sign in again with your username and password.`,
            canRetry: true,
          };
    case 'not_found':
      return {
        title: 'Not found',
        description: `The API has no record of ${subject}. Check the link and try again.`,
        canRetry: false,
      };
    case 'parse':
      return {
        title: 'Unexpected response',
        description: `The API answered for ${subject}, but in a shape this portal does not recognise. The technical detail lists what did not match.`,
        canRetry: true,
      };
    default:
      return assertNever(error);
  }
}

/** Key/value lines for the collapsible technical detail. */
export function technicalDetail(error: ApiError): [string, string][] {
  const lines: [string, string][] = [
    ['Kind', error.kind],
    ['Endpoint', error.endpoint],
  ];
  switch (error.kind) {
    case 'network':
      lines.push(['Message', error.message], ['Browser online', String(!error.offline)]);
      return lines;
    case 'timeout':
      lines.push(['Timeout', `${error.timeoutMs} ms`]);
      return lines;
    case 'http':
      lines.push(['Status', `${error.status} ${error.statusText}`.trim()]);
      return lines;
    case 'unauthorized':
      lines.push([
        'Status',
        error.status === null ? 'Not sent: nobody is signed in' : String(error.status),
      ]);
      return lines;
    case 'not_found':
      lines.push([
        'Status',
        error.status === null ? '200 with an empty list' : String(error.status),
      ]);
      return lines;
    case 'parse':
      lines.push(
        ...error.issues.map((issue, index): [string, string] => [`Issue ${index + 1}`, issue]),
      );
      return lines;
    default:
      return assertNever(error);
  }
}
