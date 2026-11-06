const LOCALE = 'en-GB';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/** "5 minutes ago", "yesterday", "3 weeks ago". */
export function formatRelativeTime(timestamp: number, now: number): string {
  const delta = timestamp - now;
  const magnitude = Math.abs(delta);
  if (magnitude < MINUTE) return 'just now';
  if (magnitude < HOUR) return relativeFormat.format(Math.round(delta / MINUTE), 'minute');
  if (magnitude < DAY) return relativeFormat.format(Math.round(delta / HOUR), 'hour');
  if (magnitude < 7 * DAY) return relativeFormat.format(Math.round(delta / DAY), 'day');
  if (magnitude < 30 * DAY) return relativeFormat.format(Math.round(delta / (7 * DAY)), 'week');
  if (magnitude < 365 * DAY) return relativeFormat.format(Math.round(delta / (30 * DAY)), 'month');
  return relativeFormat.format(Math.round(delta / (365 * DAY)), 'year');
}

/** "27 Oct 2026, 09:17 UTC", in the viewer's time zone unless one is given. */
export function formatDateTime(timestamp: number, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone,
  }).format(timestamp);
}

/** "27 Oct, 09:17" */
export function formatShortDateTime(timestamp: number, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(timestamp);
}

/** 0.82 becomes "82%". */
export function formatFraction(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** 18.18182 becomes "18%". */
export function formatProgress(percent: number): string {
  return `${Math.round(percent)}%`;
}

/** Keeps the start and end of a long identifier: `campaign_119int…a3953942a9f2`. */
export function middleTruncate(value: string, head = 16, tail = 12): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** `PASS_WITH_LOW_RISK` becomes "Pass with low risk". */
export function humanise(value: string): string {
  const words = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
