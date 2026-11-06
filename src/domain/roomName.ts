/**
 * The only module that knows how room names are encoded and parsed.
 *
 * Rule: a room name is encoded exactly once, with `encodeURIComponent`, at the
 * moment it is placed into a path (router or API). It is read from the router
 * exactly once (React Router has already decoded the param) and is never
 * decoded again. Probing the API showed it accepts the raw and the
 * once-encoded form, rejects double-encoding with 400, treats `+` as a literal
 * plus, and rejects `%2F`.
 */

const DELIMITER = '~~';
const PREFIX_PATTERN = /^campaign_(\d+)interview$/;

/** Encodes a room name for use as a single path segment. Call once per path. */
export function encodeRoomName(roomName: string): string {
  return encodeURIComponent(roomName);
}

export interface ParsedRoomName {
  campaignId: string | null;
  email: string | null;
  token: string | null;
}

/**
 * Best-effort parse of `campaign_<id>interview~~<email>~~<token>`, used only
 * for the breadcrumb and as a fallback label. Real names can lack the token
 * and can contain spaces, so every part may be null. The API response remains
 * the source of truth for everything else.
 */
export function parseRoomName(roomName: string): ParsedRoomName {
  const parts = roomName.split(DELIMITER);
  const campaignId = PREFIX_PATTERN.exec(parts[0] ?? '')?.[1] ?? null;
  const rest = parts.slice(1);
  const last = rest.at(-1);

  if (rest.length === 0 || last === undefined) {
    return { campaignId, email: null, token: null };
  }
  if (rest.length === 1 || last.includes('@')) {
    return { campaignId, email: emailOrNull(rest.join(DELIMITER)), token: null };
  }
  return {
    campaignId,
    email: emailOrNull(rest.slice(0, -1).join(DELIMITER)),
    token: last === '' ? null : last,
  };
}

function emailOrNull(value: string): string | null {
  return value.includes('@') ? value : null;
}
