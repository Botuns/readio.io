import { z } from 'zod';
import { DEFAULT_ROOM_TAB, ROOM_TABS, type RoomTab } from '@/lib/routes';
import type { SearchParamsDefinition } from '@/lib/useTypedSearchParams';

/** `/jobs/room/<name>?tab=integrity&segment=EG_FDFGBxexMUG6` */
export interface RoomSearchState extends Record<string, string | undefined> {
  tab: RoomTab;
  /** Id of the selected recording segment; absent means the whole session. */
  segment?: string | undefined;
}

export const roomSearchParams: SearchParamsDefinition<RoomSearchState> = {
  schema: z.object({
    tab: z.enum(ROOM_TABS).catch(DEFAULT_ROOM_TAB),
    segment: z
      .string()
      .regex(/^[\w-]{1,64}$/)
      .optional()
      .catch(undefined),
  }),
  keys: ['tab', 'segment'],
  defaults: { tab: DEFAULT_ROOM_TAB },
};

export function isRoomTab(value: string): value is RoomTab {
  return ROOM_TABS.some((tab) => tab === value);
}
