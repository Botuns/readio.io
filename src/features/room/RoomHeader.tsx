import type { UseQueryResult } from '@tanstack/react-query';
import { ChevronRight, CircleDashed, Share2 } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { Pill, VerdictTag, VerificationPill } from '@/components/ui/Pill';
import { QueryState } from '@/components/ui/QueryState';
import { Skeleton } from '@/components/ui/Skeleton';
import { summariseVerdict } from '@/domain/room';
import type { CampaignJob, RoomEvaluation } from '@/domain/types';
import { copyText } from '@/lib/clipboard';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { campaignPath } from '@/lib/routes';
import { useNow } from '@/lib/useNow';

interface CandidateTitleProps {
  title: string;
  email: string | null;
  /** A short line under the title explaining a fallback, with an optional action. */
  note?: React.ReactNode;
}

function CandidateTitle({ title, email, note }: CandidateTitleProps) {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-ink md:text-[28px] md:leading-[34px]">
        {title}
      </h1>
      {email !== null && email !== title && (
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <span className="truncate">{email}</span>
          <CopyButton value={email} label="Copy email" confirmation="Email copied" />
        </p>
      )}
      {note !== undefined && <p className="mt-1 text-13 text-muted">{note}</p>}
    </>
  );
}

interface RoomHeaderProps {
  roomName: string;
  campaignId: string | null;
  /** Email parsed from the room name, used when the campaign lookup has no answer. */
  fallbackEmail: string | null;
  candidate: UseQueryResult<CampaignJob | null>;
  room: UseQueryResult<RoomEvaluation>;
}

/**
 * The room response carries no candidate name or email, so the header looks
 * the candidate up in the campaign list and falls back to the email parsed
 * from the room name when that lookup is loading, empty or failed.
 */
export function RoomHeader({
  roomName,
  campaignId,
  fallbackEmail,
  candidate,
  room,
}: RoomHeaderProps) {
  const now = useNow();
  const job = candidate.data ?? null;
  const fallbackTitle = fallbackEmail ?? 'Unknown candidate';
  const submittedAt = job?.submittedAt ?? room.data?.segments[0]?.startedAt ?? null;
  const verdict = room.data === undefined ? null : summariseVerdict(room.data.segments);
  // Only a lookup that is actually running reserves space for its result.
  const candidatePending = campaignId !== null && candidate.isPending;

  return (
    <header>
      <nav aria-label="Breadcrumb" className="flex min-h-6 items-center gap-1 text-13 text-muted">
        {campaignId === null ? (
          <span>Campaign unknown</span>
        ) : (
          <Link
            to={campaignPath(campaignId)}
            className="tabular -mx-1 inline-flex items-center rounded px-1 py-1 font-medium hover:text-ink pointer-coarse:min-h-11"
          >
            Campaign {campaignId}
          </Link>
        )}
        <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
        <span aria-current="page" className="text-ink">
          Room evaluation
        </span>
      </nav>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {campaignId === null ? (
            <CandidateTitle title={fallbackTitle} email={fallbackEmail} />
          ) : (
            <QueryState
              query={candidate}
              label="candidate details"
              loading={
                <div aria-busy="true">
                  <Skeleton className="h-7 w-56 md:h-8.5" />
                  <div className="mt-1 flex h-7 items-center pointer-coarse:h-11">
                    <Skeleton className="h-4 w-44" />
                  </div>
                </div>
              }
              error={({ retry, isRetrying }) => (
                <CandidateTitle
                  title={fallbackTitle}
                  email={fallbackEmail}
                  note={
                    <>
                      Candidate name could not be loaded from campaign {campaignId}.{' '}
                      <button
                        type="button"
                        onClick={retry}
                        disabled={isRetrying}
                        className="font-medium text-accent underline-offset-2 hover:underline"
                      >
                        {isRetrying ? 'Retrying' : 'Try again'}
                      </button>
                    </>
                  }
                />
              )}
              isEmpty={(found) => found === null}
              empty={() => (
                <CandidateTitle
                  title={fallbackTitle}
                  email={fallbackEmail}
                  note={`This room is not listed in campaign ${campaignId}, so the candidate name is unknown.`}
                />
              )}
            >
              {(found) => (
                <CandidateTitle
                  title={found?.candidateName ?? found?.candidateEmail ?? fallbackTitle}
                  email={found?.candidateEmail ?? fallbackEmail}
                />
              )}
            </QueryState>
          )}
        </div>
        <Button
          onClick={() => void copyText(window.location.href, 'Link copied')}
          aria-label="Share: copy a link to this view"
        >
          <Share2 aria-hidden="true" className="size-4 text-muted" />
          Share
        </Button>
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-13 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto_auto]">
        <div className="col-span-2 min-w-0 md:col-span-1">
          <dt className="eyebrow">Room identifier</dt>
          <dd className="mt-0.5 flex items-center gap-1">
            <span className="min-w-0 font-mono text-xs break-all text-ink">{roomName}</span>
            <CopyButton
              value={roomName}
              label="Copy room identifier"
              confirmation="Room identifier copied"
            />
          </dd>
        </div>
        <div className="col-span-2 md:col-span-1">
          <dt className="eyebrow">{job === null ? 'Recording started' : 'Submitted'}</dt>
          <dd className="tabular mt-1.5 min-h-4.5 text-ink">
            {submittedAt === null ? (
              room.isPending || candidatePending ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                'No timestamp'
              )
            ) : (
              <>
                {formatDateTime(submittedAt)}{' '}
                <span className="text-muted">({formatRelativeTime(submittedAt, now)})</span>
              </>
            )}
          </dd>
        </div>
        {(job !== null || candidatePending) && (
          <div>
            <dt className="eyebrow">Verification</dt>
            <dd className="mt-1">
              {job === null ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <VerificationPill value={job.verificationStatus} size="md" />
              )}
            </dd>
          </div>
        )}
        <div>
          <dt className="eyebrow">Integrity</dt>
          <dd className="mt-1">
            {room.isPending ? (
              <Skeleton className="h-7 w-24" />
            ) : verdict === null ? (
              <span className="inline-flex h-7 items-center text-muted">Unavailable</span>
            ) : verdict.verdict === null ? (
              <Pill tone="neutral" Icon={CircleDashed} size="md">
                Not yet analysed
              </Pill>
            ) : (
              <VerdictTag value={verdict.verdict} size="md" />
            )}
          </dd>
        </div>
      </dl>
    </header>
  );
}
