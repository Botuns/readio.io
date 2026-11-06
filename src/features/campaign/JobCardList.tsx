import { Link } from 'react-router';
import { Highlight } from '@/components/ui/Highlight';
import { VerificationPill } from '@/components/ui/Pill';
import type { CampaignJob } from '@/domain/types';
import { formatRelativeTime, middleTruncate } from '@/lib/format';
import { roomPath } from '@/lib/routes';
import { useNow } from '@/lib/useNow';
import { usePrefetchRoom } from './usePrefetchRoom';

interface JobCardListProps {
  jobs: CampaignJob[];
  query: string;
}

/** The mobile list: one full-width link per candidate, no hover-only controls. */
export function JobCardList({ jobs, query }: JobCardListProps) {
  const prefetch = usePrefetchRoom();
  const now = useNow();

  return (
    <ul
      aria-label="Candidates"
      className="overflow-hidden rounded-card border border-line bg-surface"
    >
      {jobs.map((job) => (
        <li key={job.roomName} className="border-b border-line last:border-b-0">
          <Link
            to={roomPath(job.roomName)}
            data-job-row
            onTouchStart={() => prefetch(job.roomName)}
            onFocus={() => prefetch(job.roomName)}
            className="pressable block px-4 py-3 -outline-offset-2"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="truncate text-base font-medium text-ink">
                {job.candidateName ?? (
                  <span className="font-normal text-muted">Unnamed candidate</span>
                )}
              </span>
              <VerificationPill value={job.verificationStatus} />
            </span>
            <span className="mt-1 flex items-baseline justify-between gap-3 text-13 text-muted">
              <span className="truncate text-ink">
                <Highlight text={job.candidateEmail} query={query} />
              </span>
              <span className="tabular shrink-0">
                {job.submittedAt === null
                  ? 'No timestamp'
                  : formatRelativeTime(job.submittedAt, now)}
              </span>
            </span>
            <span className="mt-1 block truncate font-mono text-xs text-muted">
              {middleTruncate(job.roomName, 22, 12)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
