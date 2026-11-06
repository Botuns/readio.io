import { z } from 'zod';
import { campaignJobsResponseSchema, roomResponseSchema } from '@/api/schemas';
import campaignsJson from './campaigns.json';
import roomsJson from './rooms.json';

/**
 * Fixtures are parsed with the same schemas as live responses, so the mock
 * layer cannot drift from the real response shape without failing loudly.
 * See scripts/build-fixtures.mjs for how they are derived.
 */
export const campaignFixtures = z
  .record(z.string(), campaignJobsResponseSchema)
  .parse(campaignsJson);

export const roomFixtures = z.record(z.string(), roomResponseSchema).parse(roomsJson);
