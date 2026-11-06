import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { roomQuery } from '@/api/endpoints';

/** Warms the room query on hover, focus or touch so the drill-down opens instantly. */
export function usePrefetchRoom(): (roomName: string) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (roomName: string) => {
      // A failed prefetch is not an error to show: the room page reports it when opened.
      queryClient.query(roomQuery(roomName)).catch(() => undefined);
    },
    [queryClient],
  );
}
