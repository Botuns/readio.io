import { ArrowDown, ArrowUp } from 'lucide-react';
import { Link } from 'react-router';
import { CopyButton } from '@/components/ui/CopyButton';
import { Highlight } from '@/components/ui/Highlight';
import { Hint } from '@/components/ui/Hint';
import { VerificationPill } from '@/components/ui/Pill';
import type { JobSort } from '@/domain/jobs';
import type { CampaignJob } from '@/domain/types';
import { formatProgress, middleTruncate } from '@/lib/format';
import { roomPath } from '@/lib/routes';
import { SubmittedTime } from './SubmittedTime';
import { usePrefetchRoom } from './usePrefetchRoom';

const COLUMNS =
  'grid grid-cols-[minmax(9rem,1.1fr)_minmax(12rem,1.5fr)_minmax(13rem,1.5fr)_8.5rem_10.5rem] items-center gap-4 px-4';

interface JobsTableProps {
  jobs: CampaignJob[];
  query: string;
  sort: JobSort;
  onToggleSort: () => void;
}

/**
 * The desktop table. It is built from ARIA table roles on a grid so that each
 * row can hold one real link stretched across it (Cmd/Ctrl-click and
 * middle-click open a new tab) while copy buttons stay separately clickable.
 */
export function JobsTable({ jobs, query, sort, onToggleSort }: JobsTableProps) {
  const prefetch = usePrefetchRoom();
  const ascending = sort === 'submitted_asc';
  const SortIcon = ascending ? ArrowUp : ArrowDown;

  return (
    <div
      role="table"
      aria-label="Candidates"
      aria-rowcount={jobs.length + 1}
      className="rounded-card border border-line bg-surface"
    >
      <div
        role="rowgroup"
        className="sticky top-0 z-10 rounded-t-card border-b border-line bg-sunken"
      >
        <div role="row" className={`${COLUMNS} h-10 text-xs font-medium text-muted`}>
          <span role="columnheader">Candidate name</span>
          <span role="columnheader">Email</span>
          <span role="columnheader">Room identifier</span>
          <span role="columnheader" aria-sort={ascending ? 'ascending' : 'descending'}>
            <button
              type="button"
              onClick={onToggleSort}
              className="-mx-1.5 inline-flex h-7 items-center gap-1 rounded-chip px-1.5 font-medium text-ink hover:bg-line"
            >
              Submitted
              <SortIcon aria-hidden="true" className="size-3.5" />
              <span className="sr-only">
                , sorted {ascending ? 'oldest' : 'newest'} first. Activate to reverse.
              </span>
            </button>
          </span>
          <span role="columnheader">Verification status</span>
        </div>
      </div>

      <div role="rowgroup">
        {jobs.map((job) => (
          <div
            key={job.roomName}
            role="row"
            className={`${COLUMNS} group relative min-h-13 border-b border-line py-1.5 transition-colors duration-150 last:rounded-b-card last:border-b-0 focus-within:bg-sunken hover:bg-sunken`}
          >
            <span role="cell" className="min-w-0">
              <Link
                to={roomPath(job.roomName)}
                data-job-row
                onMouseEnter={() => prefetch(job.roomName)}
                onFocus={() => prefetch(job.roomName)}
                onTouchStart={() => prefetch(job.roomName)}
                className="block truncate font-medium text-ink outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
              >
                {job.candidateName ?? (
                  <span className="font-normal text-muted">Unnamed candidate</span>
                )}
              </Link>
            </span>

            <span role="cell" className="flex min-w-0 items-center gap-1">
              <span className="truncate text-ink">
                <Highlight text={job.candidateEmail} query={query} />
              </span>
              <CopyButton
                value={job.candidateEmail}
                label="Copy email"
                confirmation="Email copied"
                className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
              />
            </span>

            <span role="cell" className="flex min-w-0 items-center gap-1">
              <Hint label={job.roomName}>
                <span className="relative z-10 truncate font-mono text-xs text-muted">
                  {middleTruncate(job.roomName)}
                </span>
              </Hint>
              <CopyButton
                value={job.roomName}
                label="Copy room identifier"
                confirmation="Room identifier copied"
                className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
              />
            </span>

            <span role="cell" className="text-13 text-muted">
              <SubmittedTime timestamp={job.submittedAt} />
            </span>

            <span role="cell" className="flex items-center gap-2">
              <VerificationPill value={job.verificationStatus} />
              {job.verificationStatus === 'IN_PROGRESS' && (
                <span className="tabular text-xs text-muted">
                  {formatProgress(job.analysisProgress)}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
