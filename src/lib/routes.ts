import { encodeRoomName } from '@/domain/roomName';

/** The only place route paths are built. No other module concatenates URLs. */

export const CAMPAIGN_IDS = ['119', '120', '122', '123'] as const;
export const DEFAULT_CAMPAIGN_ID = CAMPAIGN_IDS[0];

export const ROOM_TABS = ['transcript', 'identity', 'integrity'] as const;
export type RoomTab = (typeof ROOM_TABS)[number];
export const DEFAULT_ROOM_TAB: RoomTab = 'transcript';

export const routePatterns = {
  root: '/',
  campaign: '/jobs/campaign/:campaignId',
  room: '/jobs/room/:roomName',
} as const;

type SearchInit = Record<string, string | undefined>;

function withSearch(path: string, search: SearchInit = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const query = params.toString();
  return query === '' ? path : `${path}?${query}`;
}

export function campaignPath(campaignId: string | number, search?: SearchInit): string {
  return withSearch(`/jobs/campaign/${encodeURIComponent(String(campaignId))}`, search);
}

/** A room name may contain `@ ~ + % # ? & /` and spaces; it is encoded once, here. */
export function roomPath(roomName: string, tab?: RoomTab): string {
  return withSearch(`/jobs/room/${encodeRoomName(roomName)}`, {
    tab: tab === DEFAULT_ROOM_TAB ? undefined : tab,
  });
}

export const apiPaths = {
  campaignJobs: (campaignId: string | number) =>
    `/campaignHACKATHON/${encodeURIComponent(String(campaignId))}`,
  room: (roomName: string) => `/roomsHACKATHON/${encodeRoomName(roomName)}`,
} as const;
