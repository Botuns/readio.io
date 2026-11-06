import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { campaignJobsQuery, roomQuery } from '@/api/endpoints';
import { NotFoundPage } from '@/app/NotFoundPage';
import { ButtonLink } from '@/components/ui/Button';
import { ErrorPanel } from '@/components/ui/ErrorPanel';
import { QueryState } from '@/components/ui/QueryState';
import { scopeSegments, summariseIntegrity } from '@/domain/room';
import { parseRoomName } from '@/domain/roomName';
import type { RoomEvaluation } from '@/domain/types';
import { campaignPath, DEFAULT_CAMPAIGN_ID, roomPath, type RoomTab } from '@/lib/routes';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useHotkeys } from '@/lib/useHotkeys';
import { useTypedSearchParams } from '@/lib/useTypedSearchParams';
import { IdentityTab } from './identity/IdentityTab';
import { IntegrityTab } from './integrity/IntegrityTab';
import { RoomHeader } from './RoomHeader';
import { roomSearchParams } from './roomSearchParams';
import { RoomSkeleton } from './RoomSkeleton';
import { RoomTabs } from './RoomTabs';
import { SegmentStrip } from './SegmentStrip';
import { TranscriptTab } from './transcript/TranscriptTab';

export function RoomPage() {
  // React Router has already decoded the param. It is never decoded again.
  const { roomName } = useParams();
  if (roomName === undefined || roomName === '') return <NotFoundPage />;
  return <RoomView key={roomName} roomName={roomName} />;
}

/**
 * A pasted link may spell the same room differently (`@` or `%40`, `%7E` or
 * `~`). Whatever arrives, the address bar is rewritten once to the canonical
 * form, without adding a history entry.
 */
function useCanonicalRoomUrl(roomName: string): void {
  const location = useLocation();
  const navigate = useNavigate();
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    const canonical = roomPath(roomName);
    if (location.pathname === canonical || attempted.current === canonical) return;
    attempted.current = canonical;
    void navigate(
      { pathname: canonical, search: location.search, hash: location.hash },
      { replace: true, preventScrollReset: true },
    );
  }, [location.hash, location.pathname, location.search, navigate, roomName]);
}

function RoomView({ roomName }: { roomName: string }) {
  useCanonicalRoomUrl(roomName);
  const parsed = useMemo(() => parseRoomName(roomName), [roomName]);

  const room = useQuery(roomQuery(roomName));
  const campaignId =
    room.data?.campaignId === null || room.data?.campaignId === undefined
      ? parsed.campaignId
      : String(room.data.campaignId);

  // Shares its cache with the campaign page, so arriving from the table costs no request.
  const candidate = useQuery({
    ...campaignJobsQuery(campaignId ?? ''),
    enabled: campaignId !== null,
    select: (jobs) => jobs.find((job) => job.roomName === roomName) ?? null,
  });

  useDocumentTitle(`Room · ${candidate.data?.candidateEmail ?? parsed.email ?? roomName}`);

  return (
    <div className="mx-auto w-full max-w-6xl safe-x py-5 md:py-8">
      <RoomHeader
        roomName={roomName}
        campaignId={campaignId}
        fallbackEmail={parsed.email}
        candidate={candidate}
        room={room}
      />

      <div className="mt-5 md:mt-6">
        <QueryState
          query={room}
          label="room evaluation"
          loading={<RoomSkeleton />}
          error={({ error, retry, isRetrying }) =>
            error.kind === 'not_found' ? (
              <ErrorPanel
                error={error}
                subject="this room"
                onRetry={retry}
                isRetrying={isRetrying}
                title="Room not found"
                description="The API has no room with this identifier. Check that the link is complete: room names contain characters such as ~~ and @ that are easy to cut off when copying."
                actions={
                  <ButtonLink
                    variant="primary"
                    to={campaignPath(campaignId ?? DEFAULT_CAMPAIGN_ID)}
                  >
                    Back to campaign {campaignId ?? DEFAULT_CAMPAIGN_ID}
                  </ButtonLink>
                }
              />
            ) : (
              <ErrorPanel
                error={error}
                subject="this room"
                onRetry={retry}
                isRetrying={isRetrying}
              />
            )
          }
          isEmpty={(evaluation) => evaluation.segments.length === 0}
          empty={() => null}
        >
          {(evaluation) => <RoomContent room={evaluation} />}
        </QueryState>
      </div>
    </div>
  );
}

function RoomContent({ room }: { room: RoomEvaluation }) {
  const [view, updateView] = useTypedSearchParams(roomSearchParams);
  const segments = scopeSegments(room, view.segment);
  const selectedId = segments.length === room.segments.length ? undefined : view.segment;
  const flaggedCount = summariseIntegrity(segments)?.flagged.length ?? 0;

  // A `segment` param that matches nothing is dropped from the URL.
  useEffect(() => {
    if (view.segment !== undefined && selectedId === undefined) {
      updateView({ segment: undefined }, { replace: true });
    }
  }, [selectedId, updateView, view.segment]);

  // Changing tab pushes a history entry, so Back returns to the previous tab.
  const setTab = (tab: RoomTab) => {
    if (tab !== view.tab) updateView({ tab }, { replace: false });
  };

  useHotkeys({
    '1': () => setTab('transcript'),
    '2': () => setTab('identity'),
    '3': () => setTab('integrity'),
  });

  return (
    <>
      <SegmentStrip
        segments={room.segments}
        selectedId={selectedId}
        onSelect={(segment) => updateView({ segment }, { replace: true })}
      />
      <div className="mt-4">
        <RoomTabs
          tab={view.tab}
          onTabChange={setTab}
          flaggedCount={flaggedCount}
          panels={{
            transcript: <TranscriptTab segments={segments} />,
            identity: <IdentityTab segments={segments} />,
            integrity: <IntegrityTab segments={segments} />,
          }}
        />
      </div>
    </>
  );
}
