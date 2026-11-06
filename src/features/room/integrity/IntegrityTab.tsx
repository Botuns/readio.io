import { ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Meter } from '@/components/ui/Meter';
import { RiskPill, VerdictTag } from '@/components/ui/Pill';
import {
  buildTimeline,
  summariseIntegrity,
  summariseVerdict,
  type CheckSummary,
  type FlaggedItem,
  type IntegritySummary,
  type VerdictSummary,
} from '@/domain/room';
import { assertNever } from '@/domain/assertNever';
import type { RecordingSegment, Verdict } from '@/domain/types';
import { humanise, pluralise } from '@/lib/format';
import { checkMeta, riskMeta } from '@/lib/statusMeta';
import { ObservationList } from '../ObservationList';
import { SessionTimeline } from './SessionTimeline';

function verdictSentence(verdict: Verdict): string {
  switch (verdict) {
    case 'PASSED':
      return 'The analysis raised no integrity concerns.';
    case 'WARNING':
      return 'The analysis asks for a human to review this session.';
    case 'FAILED':
      return 'The analysis found high-risk integrity problems.';
    default:
      return assertNever(verdict);
  }
}

interface VerdictBannerProps {
  verdict: Verdict;
  summary: VerdictSummary;
  integrity: IntegritySummary | null;
  segmentCount: number;
}

/** The overall status tag is the most prominent element on the tab. */
function VerdictBanner({ verdict, summary, integrity, segmentCount }: VerdictBannerProps) {
  return (
    <section
      aria-label="Overall integrity status"
      className="rounded-card border border-line bg-surface p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <VerdictTag value={verdict} size="lg" />
        <p className="text-base font-medium text-pretty text-ink">{verdictSentence(verdict)}</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-13 md:grid-cols-4">
        <div>
          <dt className="text-muted">API disposition</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {summary.dispositions.map(humanise).join(', ')}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Human review</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {summary.humanReviewRequired ? 'Required' : 'Not required'}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Overall risk</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {integrity === null ? 'Not reported' : riskMeta(integrity.overallRisk).label}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Based on</dt>
          <dd className="tabular mt-0.5 font-medium text-ink">
            {summary.analysedCount} of {pluralise(segmentCount, 'segment')}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function GazeCard({ check }: { check: CheckSummary }) {
  const meta = checkMeta(check.key);
  return (
    <Card title="Gaze tracking index" aside={<RiskPill value={check.risk} />}>
      <Meter
        label="Gaze tracking index, model confidence"
        value={check.lowestConfidence}
        tone={riskMeta(check.risk).tone}
      />
      <p className="mt-2 text-xs text-pretty text-muted">
        Model confidence in its off-screen activity rating (API field{' '}
        <code className="font-mono">{meta.apiField}</code>). The API sends no numeric gaze index.
      </p>
    </Card>
  );
}

function CountCard({
  title,
  count,
  caption,
  aside,
}: {
  title: string;
  count: number;
  caption: string;
  aside?: React.ReactNode;
}) {
  return (
    <Card title={title} aside={aside}>
      <p className="tabular text-[28px] leading-[34px] font-semibold text-ink">{count}</p>
      <p className="mt-1 text-xs text-pretty text-muted">{caption}</p>
    </Card>
  );
}

function flagLabel(item: FlaggedItem): string {
  return humanise(item.category);
}

function FlaggedFrames({ flagged, showSegment }: { flagged: FlaggedItem[]; showSegment: boolean }) {
  const categories = [...new Set(flagged.map((item) => item.category))];
  return (
    <Card
      title="Flagged frames"
      description="Moments the analysis rated above low risk, grouped by type."
    >
      {flagged.length === 0 ? (
        <EmptyState
          Icon={ShieldCheck}
          tone="success"
          size="compact"
          title="No integrity flags raised"
          description="Every check came back low risk and no suspicious time ranges were reported."
        />
      ) : (
        <div className="space-y-5">
          {categories.map((category) => {
            const items = flagged.filter((item) => item.category === category);
            return (
              <section key={category}>
                <h4 className="eyebrow mb-2">
                  {humanise(category)} <span className="tabular">({items.length})</span>
                </h4>
                <ObservationList
                  showSegment={showSegment}
                  items={items.map((item) => ({
                    id: item.id,
                    timestamp: item.timestamp,
                    text: item.text,
                    segmentIndex: item.segmentIndex,
                    ...(item.risk !== null && { badge: <RiskPill value={item.risk} /> }),
                  }))}
                />
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function CheckBreakdown({ checks, showSegment }: { checks: CheckSummary[]; showSegment: boolean }) {
  return (
    <Card
      title="Proctoring checks"
      description="Each check's risk rating, the model's confidence in it, and what it observed."
    >
      <ul className="divide-y divide-line">
        {checks.map((check) => {
          const meta = checkMeta(check.key);
          return (
            <li key={check.key} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <meta.Icon aria-hidden="true" className="size-4 shrink-0 text-muted" />
                  {meta.label}
                </p>
                <RiskPill value={check.risk} />
              </div>
              <p className="mt-1 text-13 text-muted">{meta.description}</p>
              <Meter
                label={`${meta.label} model confidence`}
                value={check.lowestConfidence}
                tone={riskMeta(check.risk).tone}
                className="mt-2.5 max-w-sm"
              />
              {check.observations.length > 0 && (
                <div className="mt-3 rounded-control bg-sunken px-3 py-2.5">
                  <ObservationList items={check.observations} showSegment={showSegment} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

interface IntegrityTabProps {
  segments: RecordingSegment[];
}

export function IntegrityTab({ segments }: IntegrityTabProps) {
  const summary = summariseVerdict(segments);
  const integrity = summariseIntegrity(segments);

  if (summary.verdict === null) {
    return (
      <div className="rounded-card border border-line bg-surface">
        <EmptyState
          Icon={ShieldQuestion}
          title="Not yet analysed"
          description={`${segments.length === 1 ? 'This segment has' : `None of the ${segments.length} segments have`} an integrity result, so there is no status to report. Results appear once analysis completes.`}
        />
      </div>
    );
  }

  const multiSegment = summary.analysedCount > 1;
  const gaze = integrity?.checks.find((check) => check.key === 'offScreenAssistance');
  const audio = integrity?.checks.find((check) => check.key === 'audioVideoConsistency');
  const timeline = buildTimeline(segments);

  return (
    <div className="space-y-4">
      <VerdictBanner
        verdict={summary.verdict}
        summary={summary}
        integrity={integrity}
        segmentCount={segments.length}
      />

      {integrity === null ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            Icon={ShieldQuestion}
            size="compact"
            title="No proctoring breakdown"
            description="The API returned a disposition without phase 2 results (deepfake_phase2 is empty)."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {gaze !== undefined && <GazeCard check={gaze} />}
            <CountCard
              title="Audio anomaly count"
              count={integrity.audioAnomalyCount}
              caption="Audio and video observations in segments where that check is rated above low risk."
              aside={audio === undefined ? undefined : <RiskPill value={audio.risk} />}
            />
            <CountCard
              title="Flagged frames"
              count={integrity.flagged.length}
              caption={
                integrity.flagged.length === 0
                  ? 'Nothing was rated above low risk.'
                  : [...new Set(integrity.flagged.map(flagLabel))].join(', ')
              }
            />
          </div>

          {timeline.length > 0 && <SessionTimeline tracks={timeline} />}
          <FlaggedFrames flagged={integrity.flagged} showSegment={multiSegment} />
          <CheckBreakdown checks={integrity.checks} showSegment={multiSegment} />

          {integrity.limitations.length > 0 && (
            <Card
              title="Limitations"
              description="Conditions that reduce how much weight these results can carry."
            >
              <ul className="space-y-2">
                {integrity.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-2 text-sm text-ink">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1 shrink-0 rounded-full bg-muted"
                    />
                    {limitation}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
