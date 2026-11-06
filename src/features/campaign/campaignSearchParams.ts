import { z } from 'zod';
import { DEFAULT_JOB_SORT, JOB_SORTS, type JobSort } from '@/domain/jobs';
import { VERIFICATION_STATUSES, type VerificationStatus } from '@/domain/types';
import type { SearchParamsDefinition } from '@/lib/useTypedSearchParams';

/** `/jobs/campaign/119?status=FAILED&q=steph&sort=submitted_asc` */
export interface CampaignSearchState extends Record<string, string | undefined> {
  status?: VerificationStatus | undefined;
  q: string;
  sort: JobSort;
}

const MAX_QUERY_LENGTH = 120;

export const campaignSearchParams: SearchParamsDefinition<CampaignSearchState> = {
  schema: z.object({
    status: z.enum(VERIFICATION_STATUSES).optional().catch(undefined),
    q: z.string().max(MAX_QUERY_LENGTH).catch(''),
    sort: z.enum(JOB_SORTS).catch(DEFAULT_JOB_SORT),
  }),
  keys: ['status', 'q', 'sort'],
  defaults: { q: '', sort: DEFAULT_JOB_SORT },
};
