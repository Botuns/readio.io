import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).catch('/api/jobs'),
  VITE_API_CUSTOM_AUTH: z.string().catch(''),
  VITE_API_BASIC_AUTH: z.string().catch(''),
  VITE_DATA_SOURCE: z.enum(['live', 'mock']).catch('live'),
});

/**
 * Validated build-time configuration. `VITE_` values are inlined into the
 * client bundle, so these credentials are visible to anyone who opens the
 * deployed app; see the README for what a production setup would do instead.
 */
export const env = envSchema.parse(import.meta.env);
