import { VERIFICATION_STATUSES, type CampaignJob, type VerificationStatus } from './types';

export const JOB_SORTS = ['submitted_desc', 'submitted_asc'] as const;
export type JobSort = (typeof JOB_SORTS)[number];
export const DEFAULT_JOB_SORT: JobSort = 'submitted_desc';

export interface JobFilters {
  status?: VerificationStatus | undefined;
  /** Matched against the candidate email, case-insensitively. */
  query: string;
  sort: JobSort;
}

export type StatusCounts = Record<VerificationStatus, number>;

export function normaliseQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function countByStatus(jobs: readonly CampaignJob[]): StatusCounts {
  const counts: StatusCounts = { COMPLETED: 0, IN_PROGRESS: 0, FAILED: 0 };
  for (const job of jobs) counts[job.verificationStatus] += 1;
  return counts;
}

export function matchesEmail(job: CampaignJob, query: string): boolean {
  const needle = normaliseQuery(query);
  return needle === '' || job.candidateEmail.toLowerCase().includes(needle);
}

/** Sorts by submission time. Jobs without a timestamp always come last. */
export function compareBySubmission(sort: JobSort) {
  const direction = sort === 'submitted_asc' ? 1 : -1;
  return (a: CampaignJob, b: CampaignJob): number => {
    if (a.submittedAt === b.submittedAt) return a.roomName.localeCompare(b.roomName);
    if (a.submittedAt === null) return 1;
    if (b.submittedAt === null) return -1;
    return (a.submittedAt - b.submittedAt) * direction;
  };
}

export function selectJobs(jobs: readonly CampaignJob[], filters: JobFilters): CampaignJob[] {
  return jobs
    .filter((job) => filters.status === undefined || job.verificationStatus === filters.status)
    .filter((job) => matchesEmail(job, filters.query))
    .sort(compareBySubmission(filters.sort));
}

export function isVerificationStatus(value: string): value is VerificationStatus {
  return VERIFICATION_STATUSES.some((status) => status === value);
}
