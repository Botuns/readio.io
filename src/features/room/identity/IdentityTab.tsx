import { OctagonAlert, ScanFace, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator';
import { EmptyState } from '@/components/ui/EmptyState';
import { Meter } from '@/components/ui/Meter';
import { IdentityDecisionPill, Pill, RiskPill } from '@/components/ui/Pill';
import {
  collectIdentity,
  IDENTITY_REVIEW_THRESHOLD,
  identityAnomalies,
  summariseIntegrity,
  type AnomalySeverity,
  type CheckSummary,
  type IdentityEntry,
} from '@/domain/room';
import type { RecordingSegment } from '@/domain/types';
import { humanise } from '@/lib/format';
import { checkMeta, identityDecisionMeta, riskMeta, type Tone } from '@/lib/statusMeta';
import { ObservationList } from '../ObservationList';

const LIVENESS_CHECKS = ['syntheticVideo', 'personContinuity'] as const;

function SeverityPill({ severity }: { severity: AnomalySeverity }) {
  return severity === 'HIGH' ? (
    <Pill tone="danger" Icon={OctagonAlert}>
      High
    </Pill>
  ) : (
    <Pill tone="warning" Icon={TriangleAlert}>
      Medium
    </Pill>
  );
}

function confidenceTone(entry: IdentityEntry): Tone {
  const { confidence, decision } = entry.result;
  if (decision === 'INCONSISTENT') return 'danger';
  if (confidence !== null && confidence < IDENTITY_REVIEW_THRESHOLD) return 'warning';
  return identityDecisionMeta(decision).tone;
}

function BiometricCard({ entry, showSegment }: { entry: IdentityEntry; showSegment: boolean }) {
  const { result } = entry;
  return (
    <Card
      title="Biometric match"
      description={
        showSegment
          ? `Reference video compared with the interview recording, segment ${entry.segmentIndex}.`
          : 'Reference video compared with the interview recording.'
      }
      aside={<IdentityDecisionPill value={result.decision} size="md" />}
    >
      {result.confidence === null ? (
        <p className="text-13 text-muted">
          The API returned a decision without a confidence score.
        </p>
      ) : (
        <ConfidenceIndicator
          label="Biometric match confidence"
          value={result.confidence}
          threshold={IDENTITY_REVIEW_THRESHOLD}
          thresholdLabel="Review threshold (portal default)"
          tone={confidenceTone(entry)}
          className="md:flex md:flex-col md:items-center"
        />
      )}
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-13">
        <div>
          <dt className="text-muted">Reference video quality</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {result.referenceVideoQuality === null
              ? 'Not reported'
              : humanise(result.referenceVideoQuality)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Interview video quality</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {result.interviewVideoQuality === null
              ? 'Not reported'
              : humanise(result.interviewVideoQuality)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function LivenessCard({ checks }: { checks: CheckSummary[] }) {
  return (
    <Card
      title="Liveness"
      description="The API has no separate liveness field. These two phase 2 checks are its liveness signals: is this a real video, and is it one person throughout?"
    >
      {checks.length === 0 ? (
        <p className="text-13 text-muted">
          No liveness signals yet. They appear once a segment is analysed.
        </p>
      ) : (
        <ul className="space-y-4">
          {checks.map((check) => {
            const meta = checkMeta(check.key);
            return (
              <li key={check.key}>
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <meta.Icon aria-hidden="true" className="size-4 text-muted" />
                    {meta.label}
                  </p>
                  <RiskPill value={check.risk} />
                </div>
                <Meter
                  label={`${meta.label} model confidence`}
                  value={check.lowestConfidence}
                  tone={riskMeta(check.risk).tone}
                  className="mt-2"
                />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

interface IdentityTabProps {
  segments: RecordingSegment[];
}

export function IdentityTab({ segments }: IdentityTabProps) {
  const entries = collectIdentity(segments);
  const integrity = summariseIntegrity(segments);
  const liveness = (integrity?.checks ?? []).filter((check) =>
    LIVENESS_CHECKS.some((key) => key === check.key),
  );
  const anomalies = entries.flatMap(identityAnomalies);
  const matching = entries.flatMap((entry) =>
    entry.result.matchingEvidence.map((evidence, position) => ({
      id: `${entry.segmentId}-match-${position}`,
      timestamp: evidence.timestamp,
      text: evidence.text,
      segmentIndex: entry.segmentIndex,
    })),
  );
  const limitations = [...new Set(entries.flatMap((entry) => entry.result.limitations))];
  const multiSegment = segments.length > 1;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start">
      <div className="space-y-4">
        {entries.length === 0 ? (
          <Card
            title="Biometric match"
            description="Reference video compared with the interview recording."
          >
            <EmptyState
              Icon={ScanFace}
              size="compact"
              title="No biometric comparison"
              description={
                integrity === null
                  ? 'Nothing in scope has been analysed yet.'
                  : 'The analysis ran but returned no identity result (identity_phase1 is empty), so there is no match score to show.'
              }
            />
          </Card>
        ) : (
          entries.map((entry) => (
            <BiometricCard key={entry.segmentId} entry={entry} showSegment={multiSegment} />
          ))
        )}
        <LivenessCard checks={liveness} />
      </div>

      <div className="space-y-4">
        <Card
          title="Flagged anomalies"
          description="Conflicts and warnings from the identity check, most severe first."
        >
          {entries.length === 0 ? (
            <p className="text-13 text-muted">
              There is no identity result, so nothing could be flagged.
            </p>
          ) : anomalies.length === 0 ? (
            <EmptyState
              Icon={ShieldCheck}
              tone="success"
              size="compact"
              title="No identity anomalies flagged"
              description="No conflicting evidence, a consistent decision, and confidence above the review threshold."
            />
          ) : (
            <ObservationList
              items={anomalies.map((anomaly) => ({
                id: anomaly.id,
                timestamp: anomaly.timestamp,
                text: anomaly.text,
                badge: (
                  <>
                    <SeverityPill severity={anomaly.severity} />
                    <span className="font-medium text-ink">{anomaly.title}</span>
                  </>
                ),
              }))}
            />
          )}
        </Card>

        {matching.length > 0 && (
          <Card
            title="Matching evidence"
            description="What the model matched between the two videos."
          >
            <ObservationList items={matching} showSegment={multiSegment} />
          </Card>
        )}

        {limitations.length > 0 && (
          <Card
            title="Limitations"
            description="Conditions that reduce how much weight the result can carry."
          >
            <ul className="space-y-2">
              {limitations.map((limitation) => (
                <li key={limitation} className="flex gap-2 text-sm text-ink">
                  <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-muted" />
                  {limitation}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
