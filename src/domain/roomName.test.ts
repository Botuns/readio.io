import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { apiPaths, roomPath, routePatterns } from '@/lib/routes';
import { encodeRoomName, parseRoomName } from './roomName';

const SAMPLE = 'campaign_119interview~~stephtester1@readie.io~~a3953942a9f2';

/** Every awkward character the brief lists, plus real names seen in the API. */
const ROOM_NAMES: [label: string, roomName: string][] = [
  ['the sample from the spec', SAMPLE],
  ['a real name with a space and no token', 'campaign_119interview~~fpqwz0gqfv 12@lnovic.com'],
  ['a dot-heavy email', 'campaign_123interview~~mr.nekan123@gmail.com~~cdedb0303611'],
  ['a plus sign', 'campaign_1interview~~first+tag@example.com~~abc'],
  ['a percent sign', 'campaign_1interview~~100%real@example.com~~abc'],
  ['a literal %40', 'campaign_1interview~~already%40encoded.com~~abc'],
  ['a hash', 'campaign_1interview~~a#b@example.com~~abc'],
  ['a question mark', 'campaign_1interview~~a?b=c@example.com~~abc'],
  ['an ampersand', 'campaign_1interview~~a&b@example.com~~abc'],
  ['a slash', 'campaign_1interview~~a/b@example.com~~abc'],
  ['extra delimiters', 'campaign_1interview~~a~~b@example.com~~abc'],
  ['non-ASCII characters', 'campaign_1interview~~zoë.müller@exämple.com~~日本語'],
  ['an emoji', 'campaign_1interview~~party🎉@example.com~~abc'],
];

/** Runs a path through the real router matcher and returns the decoded param. */
function routerParam(path: string): string | undefined {
  const pathname = path.split('?')[0] ?? path;
  const matches = matchRoutes([{ path: routePatterns.room }], pathname);
  return matches?.[0]?.params.roomName;
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('room name encoding', () => {
  it.each(ROOM_NAMES)('round-trips %s through the router', (_label, roomName) => {
    expect(routerParam(roomPath(roomName))).toBe(roomName);
  });

  it.each(ROOM_NAMES)('round-trips %s through the API path', (_label, roomName) => {
    const segment = apiPaths.room(roomName).replace('/roomsHACKATHON/', '');
    expect(decodeURIComponent(segment)).toBe(roomName);
  });

  it.each(ROOM_NAMES)('never double-encodes %s', (_label, roomName) => {
    // `%25` may only appear where the name itself contains a percent sign.
    const literalPercents = count(roomName, '%');
    expect(count(roomPath(roomName), '%25')).toBe(literalPercents);
    expect(count(apiPaths.room(roomName), '%25')).toBe(literalPercents);
  });

  it.each(ROOM_NAMES)('keeps %s inside a single path segment', (_label, roomName) => {
    expect(roomPath(roomName).split('/')).toHaveLength(4);
    expect(apiPaths.room(roomName).split('/')).toHaveLength(3);
    expect(roomPath(roomName)).not.toMatch(/[#?& ]/);
  });

  it('uses the same encoding for the router and the API', () => {
    for (const [, roomName] of ROOM_NAMES) {
      expect(roomPath(roomName)).toBe(`/jobs/room/${encodeRoomName(roomName)}`);
      expect(apiPaths.room(roomName)).toBe(`/roomsHACKATHON/${encodeRoomName(roomName)}`);
    }
  });

  it('produces the documented canonical form for the sample', () => {
    expect(roomPath(SAMPLE)).toBe(
      '/jobs/room/campaign_119interview~~stephtester1%40readie.io~~a3953942a9f2',
    );
  });

  it('loads the same room from a raw @ and from %40', () => {
    const raw = '/jobs/room/campaign_119interview~~stephtester1@readie.io~~a3953942a9f2';
    const encoded = '/jobs/room/campaign_119interview~~stephtester1%40readie.io~~a3953942a9f2';
    const escaped =
      '/jobs/room/campaign_119interview%7E%7Estephtester1%40readie.io%7E%7Ea3953942a9f2';
    expect(routerParam(raw)).toBe(SAMPLE);
    expect(routerParam(encoded)).toBe(SAMPLE);
    expect(routerParam(escaped)).toBe(SAMPLE);
  });

  it('carries a slash as %2F rather than as a path separator', () => {
    const roomName = 'campaign_1interview~~a/b@example.com~~abc';
    expect(roomPath(roomName)).toContain('a%2Fb');
    expect(routerParam(roomPath(roomName))).toBe(roomName);
    // An unencoded slash is a different, longer path and does not match the room route.
    expect(routerParam(`/jobs/room/${roomName}`)).toBeUndefined();
  });

  it('adds the tab only when it is not the default', () => {
    expect(roomPath(SAMPLE, 'transcript')).not.toContain('?');
    expect(roomPath(SAMPLE, 'integrity')).toMatch(/\?tab=integrity$/);
  });
});

describe('parseRoomName', () => {
  it('parses the sample', () => {
    expect(parseRoomName(SAMPLE)).toEqual({
      campaignId: '119',
      email: 'stephtester1@readie.io',
      token: 'a3953942a9f2',
    });
  });

  it('accepts a name with no token and a space in the email', () => {
    expect(parseRoomName('campaign_119interview~~fpqwz0gqfv 12@lnovic.com')).toEqual({
      campaignId: '119',
      email: 'fpqwz0gqfv 12@lnovic.com',
      token: null,
    });
  });

  it('keeps delimiters that appear inside the email part', () => {
    expect(parseRoomName('campaign_7interview~~a~~b@example.com~~tok')).toEqual({
      campaignId: '7',
      email: 'a~~b@example.com',
      token: 'tok',
    });
  });

  it.each([
    ['', { campaignId: null, email: null, token: null }],
    ['not-a-room', { campaignId: null, email: null, token: null }],
    ['campaign_xinterview~~a@b.co~~t', { campaignId: null, email: 'a@b.co', token: 't' }],
    ['campaign_5interview', { campaignId: '5', email: null, token: null }],
    ['campaign_5interview~~no-email~~tok', { campaignId: '5', email: null, token: 'tok' }],
  ])('is defensive about %j', (roomName, expected) => {
    expect(parseRoomName(roomName)).toEqual(expected);
  });
});
