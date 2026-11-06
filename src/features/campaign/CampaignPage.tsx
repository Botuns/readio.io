import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Inbox, SearchX } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { campaignJobsQuery } from '@/api/endpoints';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorPanel } from '@/components/ui/ErrorPanel';
import { QueryState } from '@/components/ui/QueryState';
import { countByStatus, selectJobs, type JobSort } from '@/domain/jobs';
import type { CampaignJob, VerificationStatus } from '@/domain/types';
import { cn } from '@/lib/cn';
import { pluralise } from '@/lib/format';
import { CAMPAIGN_IDS, campaignPath } from '@/lib/routes';
import { verificationMeta } from '@/lib/statusMeta';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useHotkeys } from '@/lib/useHotkeys';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/useMediaQuery';
import { useTypedSearchParams } from '@/lib/useTypedSearchParams';
import { CampaignSkeleton } from './CampaignSkeleton';
import { CampaignSwitcher } from './CampaignSwitcher';
import { campaignSearchParams } from './campaignSearchParams';
import { JobCardList } from './JobCardList';
import { JobsTable } from './JobsTable';
import { JobsToolbar } from './JobsToolbar';
import { SummaryStrip } from './SummaryStrip';

/** The bottom sheet (and its drawer library) is only downloaded when Filters is first opened. */
const FiltersSheet = lazy(async () => {
  const module = await import('./FiltersSheet');
  return { default: module.FiltersSheet };
});

const SEARCH_DEBOUNCE_MS = 250;
const CAMPAIGN_ID_PATTERN = /^\d+$/;

/** Moves keyboard focus to the next or previous candidate link (`j` / `k`). */
function focusAdjacentRow(step: 1 | -1): void {
  const rows = [...document.querySelectorAll<HTMLElement>('[data-job-row]')];
  if (rows.length === 0) return;
  const current = rows.findIndex((row) => row === document.activeElement);
  const fallback = step === 1 ? 0 : rows.length - 1;
  const target = current === -1 ? fallback : Math.min(rows.length - 1, Math.max(0, current + step));
  rows[target]?.focus();
}

export function CampaignPage() {
  const { campaignId = '' } = useParams();
  useDocumentTitle(`Campaign ${campaignId}`);

  return (
    <div className="mx-auto w-full max-w-6xl safe-x py-5 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow">Campaign jobs</p>
          <h1 className="tabular mt-1 text-xl font-semibold tracking-tight text-ink md:text-[28px] md:leading-[34px]">
            Campaign {campaignId}
          </h1>
        </div>
        <CampaignSwitcher campaignId={campaignId} />
      </div>

      <div className="mt-5 md:mt-6">
        {CAMPAIGN_ID_PATTERN.test(campaignId) ? (
          <CampaignJobs campaignId={campaignId} />
        ) : (
          <div className="rounded-card border border-line bg-surface">
            <EmptyState
              Icon={SearchX}
              title="That is not a campaign id"
              description={`Campaign ids are numbers, and “${campaignId}” is not one. Pick a campaign to continue.`}
              action={<OtherCampaignLinks current={campaignId} />}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function OtherCampaignLinks({ current }: { current: string }) {
  return CAMPAIGN_IDS.filter((id) => id !== current).map((id) => (
    <ButtonLink key={id} to={campaignPath(id)}>
      Campaign {id}
    </ButtonLink>
  ));
}

function CampaignJobs({ campaignId }: { campaignId: string }) {
  // Rows from the previous campaign stay visible (dimmed) while the next one loads.
  const query = useQuery({ ...campaignJobsQuery(campaignId), placeholderData: keepPreviousData });

  return (
    <QueryState
      query={query}
      label={`campaign ${campaignId} candidates`}
      loading={<CampaignSkeleton />}
      error={({ error, retry, isRetrying }) => (
        <ErrorPanel
          error={error}
          subject={`campaign ${campaignId}`}
          onRetry={retry}
          isRetrying={isRetrying}
        />
      )}
      isEmpty={(jobs) => jobs.length === 0}
      empty={() => (
        <div
          className={cn(
            'rounded-card border border-line bg-surface',
            query.isPlaceholderData && 'opacity-60',
          )}
        >
          <EmptyState
            Icon={Inbox}
            title={`No candidates in campaign ${campaignId}`}
            description="The API returned an empty list for this campaign. Nobody has submitted a session yet, or the campaign does not exist."
            action={<OtherCampaignLinks current={campaignId} />}
          />
        </div>
      )}
    >
      {(jobs, { isRefreshing }) => <JobsView jobs={jobs} isRefreshing={isRefreshing} />}
    </QueryState>
  );
}

interface JobsViewProps {
  jobs: CampaignJob[];
  isRefreshing: boolean;
}

function JobsView({ jobs, isRefreshing }: JobsViewProps) {
  const [filters, updateFilters] = useTypedSearchParams(campaignSearchParams);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const searchRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Stays true after the first open so the sheet can animate closed.
  const [sheetWanted, setSheetWanted] = useState(false);

  // The input keeps its own draft so typing stays instant; the URL follows after a pause.
  const [draft, setDraft] = useState(filters.q);
  const [syncedQuery, setSyncedQuery] = useState(filters.q);
  if (filters.q !== syncedQuery) {
    // The URL changed underneath us (Back, Forward, a pasted link): adopt it.
    setSyncedQuery(filters.q);
    setDraft(filters.q);
  }

  useEffect(() => {
    if (draft === syncedQuery) return;
    const timer = setTimeout(() => {
      setSyncedQuery(draft);
      updateFilters({ q: draft }, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft, syncedQuery, updateFilters]);

  useHotkeys({
    '/': (event) => {
      event.preventDefault();
      searchRef.current?.focus();
    },
    j: () => focusAdjacentRow(1),
    k: () => focusAdjacentRow(-1),
  });

  const counts = countByStatus(jobs);
  const visible = selectJobs(jobs, { status: filters.status, query: draft, sort: filters.sort });
  const jobTitle = jobs.find((job) => job.jobTitle !== null)?.jobTitle ?? null;
  const hasFilters = filters.status !== undefined || draft.trim() !== '';

  const setStatus = (status: VerificationStatus | undefined) => {
    updateFilters({ status }, { replace: true });
  };
  const setSort = (sort: JobSort) => {
    updateFilters({ sort }, { replace: true });
  };
  const toggleSort = () => {
    setSort(filters.sort === 'submitted_desc' ? 'submitted_asc' : 'submitted_desc');
  };
  const clearFilters = () => {
    setDraft('');
    setSyncedQuery('');
    updateFilters({ status: undefined, q: '' }, { replace: true });
  };

  return (
    <div
      aria-busy={isRefreshing}
      className={cn(
        'transition-opacity duration-200',
        isRefreshing && 'pointer-events-none opacity-50',
      )}
    >
      {jobTitle !== null && (
        <p className="-mt-3 mb-5 text-sm text-muted md:-mt-4 md:mb-6">
          {jobTitle} · <span className="tabular">{pluralise(jobs.length, 'candidate')}</span>
        </p>
      )}

      <SummaryStrip counts={counts} active={filters.status} onChange={setStatus} />

      <div className="mt-4">
        <JobsToolbar
          searchRef={searchRef}
          query={draft}
          onQueryChange={setDraft}
          sort={filters.sort}
          onToggleSort={toggleSort}
          activeFilterCount={
            (filters.status === undefined ? 0 : 1) + (filters.sort === 'submitted_desc' ? 0 : 1)
          }
          onOpenFilters={() => {
            setSheetWanted(true);
            setSheetOpen(true);
          }}
        />
      </div>

      <p aria-live="polite" className="tabular mt-3 mb-2 text-13 text-muted">
        {hasFilters
          ? `Showing ${visible.length} of ${pluralise(jobs.length, 'candidate')}`
          : pluralise(jobs.length, 'candidate')}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            Icon={SearchX}
            title="No candidates match"
            description={describeNoMatches(draft, filters.status)}
            action={
              <Button variant="primary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </div>
      ) : isDesktop ? (
        <JobsTable jobs={visible} query={draft} sort={filters.sort} onToggleSort={toggleSort} />
      ) : (
        <JobCardList jobs={visible} query={draft} />
      )}

      {sheetWanted && (
        <Suspense fallback={null}>
          <FiltersSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            counts={counts}
            total={jobs.length}
            resultCount={visible.length}
            status={filters.status}
            onStatusChange={setStatus}
            sort={filters.sort}
            onSortChange={setSort}
            onClear={clearFilters}
          />
        </Suspense>
      )}
    </div>
  );
}

function describeNoMatches(query: string, status: VerificationStatus | undefined): string {
  const trimmed = query.trim();
  const statusLabel = status === undefined ? null : verificationMeta(status).label;
  if (trimmed !== '' && statusLabel !== null) {
    return `No candidate email contains “${trimmed}” with status ${statusLabel}.`;
  }
  if (trimmed !== '') return `No candidate email contains “${trimmed}”.`;
  if (statusLabel !== null) return `No candidate in this campaign has status ${statusLabel}.`;
  return 'No candidates match the current filters.';
}
