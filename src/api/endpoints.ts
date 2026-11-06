import { queryOptions } from '@tanstack/react-query';
import type { CampaignJob, RoomEvaluation } from '@/domain/types';
import { apiPaths } from '@/lib/routes';
import { apiGet } from './client';
import { env } from './env';
import { ApiRequestError } from './errors';
import { toCampaignJob, toRoomEvaluation } from './mappers';
import { campaignJobsResponseSchema, roomResponseSchema } from './schemas';

const STALE_TIME_MS = 60_000;

async function fetchCampaignJobs(campaignId: string, signal: AbortSignal): Promise<CampaignJob[]> {
  const result = await apiGet({
    path: apiPaths.campaignJobs(campaignId),
    schema: campaignJobsResponseSchema,
    signal,
  });
  if (!result.ok) throw new ApiRequestError(result.error);
  return result.data.map(toCampaignJob);
}

async function fetchRoom(roomName: string, signal: AbortSignal): Promise<RoomEvaluation> {
  const path = apiPaths.room(roomName);
  const result = await apiGet({ path, schema: roomResponseSchema, signal });
  if (!result.ok) throw new ApiRequestError(result.error);
  // The API answers 200 with an empty list for a room it does not know.
  if (result.data.length === 0) {
    throw new ApiRequestError({
      kind: 'not_found',
      endpoint: `${env.VITE_API_BASE_URL}${path}`,
      status: null,
    });
  }
  return toRoomEvaluation(roomName, result.data);
}

export function campaignJobsQuery(campaignId: string) {
  return queryOptions({
    queryKey: ['campaign-jobs', campaignId] as const,
    queryFn: ({ signal }) => fetchCampaignJobs(campaignId, signal),
    staleTime: STALE_TIME_MS,
  });
}

export function roomQuery(roomName: string) {
  return queryOptions({
    queryKey: ['room', roomName] as const,
    queryFn: ({ signal }) => fetchRoom(roomName, signal),
    staleTime: STALE_TIME_MS,
  });
}
