import type {
  CheckKey,
  IdentityResult,
  Observation,
  RecordingSegment,
  RiskLevel,
  RoomEvaluation,
  SegmentAnalysis,
  SegmentState,
  TranscriptEntry,
  Verdict,
} from './types';
import { CHECK_KEYS } from './types';

/**
 * Pure roll-ups over a room's recording segments. Every figure the room page
 * shows is computed here from API values; nothing is estimated.
 */

/**
 * Portal default, not an API value: identity confidence below this is drawn as
 * needing review. The API sends a confidence but no pass mark.
 */
export const IDENTITY_REVIEW_THRESHOLD = 0.7;

const RISK_RANK: Record<RiskLevel, number> = { LOW: 0, UNKNOWN: 1, MEDIUM: 2, HIGH: 3 };
const VERDICT_RANK: Record<Verdict, number> = { PASSED: 0, WARNING: 1, FAILED: 2 };

export interface AnalysedSegment extends RecordingSegment {
  analysis: SegmentAnalysis;
}

export function isAnalysed(segment: RecordingSegment): segment is AnalysedSegment {
  return segment.analysis !== null;
}

/** All segments, or only the selected one when the id matches a segment. */
export function scopeSegments(
  room: RoomEvaluation,
  segmentId: string | undefined,
): RecordingSegment[] {
  const selected = room.segments.find((segment) => segment.id === segmentId);
  return selected === undefined ? room.segments : [selected];
}

export function worstRisk(levels: readonly RiskLevel[]): RiskLevel | null {
  return levels.reduce<RiskLevel | null>(
    (worst, level) => (worst === null || RISK_RANK[level] > RISK_RANK[worst] ? level : worst),
    null,
  );
}

export function worstVerdict(verdicts: readonly Verdict[]): Verdict | null {
  return verdicts.reduce<Verdict | null>(
    (worst, verdict) =>
      worst === null || VERDICT_RANK[verdict] > VERDICT_RANK[worst] ? verdict : worst,
    null,
  );
}

export type SegmentCounts = Record<SegmentState, number> & { total: number };

export function countSegments(segments: readonly RecordingSegment[]): SegmentCounts {
  const counts: SegmentCounts = {
    ANALYSED: 0,
    PROCESSING: 0,
    PENDING: 0,
    FAILED: 0,
    total: segments.length,
  };
  for (const segment of segments) counts[segment.state] += 1;
  return counts;
}

export interface VerdictSummary {
  /** Worst verdict across analysed segments; null when none are analysed. */
  verdict: Verdict | null;
  humanReviewRequired: boolean;
  /** Distinct raw dispositions from the API, in first-seen order. */
  dispositions: string[];
  analysedCount: number;
}

export function summariseVerdict(segments: readonly RecordingSegment[]): VerdictSummary {
  const analysed = segments.filter(isAnalysed);
  return {
    verdict: worstVerdict(analysed.map((segment) => segment.analysis.verdict)),
    humanReviewRequired: analysed.some((segment) => segment.analysis.humanReviewRequired),
    dispositions: [...new Set(analysed.map((segment) => segment.analysis.disposition))],
    analysedCount: analysed.length,
  };
}

export interface ScopedObservation extends Observation {
  id: string;
  segmentIndex: number;
  checkKey: CheckKey;
  risk: RiskLevel;
}

export interface CheckSummary {
  key: CheckKey;
  /** Worst risk reported for this check across the segments in scope. */
  risk: RiskLevel;
  /** Lowest model confidence across the segments in scope. */
  lowestConfidence: number | null;
  observations: ScopedObservation[];
}

export type FlagKind = 'observation' | 'time_range' | 'multiple_people';

export interface FlaggedItem {
  id: string;
  kind: FlagKind;
  /** API category for observations; a fixed label for the other kinds. */
  category: string;
  text: string;
  timestamp: string | null;
  offsetSeconds: number | null;
  segmentIndex: number;
  risk: RiskLevel | null;
}

export interface IntegritySummary {
  analysedCount: number;
  overallRisk: RiskLevel;
  checks: CheckSummary[];
  flagged: FlaggedItem[];
  /** Audio/video observations in segments where that check is above low risk. */
  audioAnomalyCount: number;
  limitations: string[];
}

function isElevated(risk: RiskLevel): boolean {
  return risk !== 'LOW';
}

function minOrNull(values: readonly (number | null)[]): number | null {
  const numbers = values.filter((value) => value !== null);
  return numbers.length === 0 ? null : Math.min(...numbers);
}

/** Rolls the phase-2 results up across segments. Null when none has results. */
export function summariseIntegrity(segments: readonly RecordingSegment[]): IntegritySummary | null {
  const withIntegrity = segments.filter(isAnalysed).flatMap((segment) => {
    const { integrity } = segment.analysis;
    return integrity === null ? [] : [{ segment, integrity }];
  });
  if (withIntegrity.length === 0) return null;

  const checks = CHECK_KEYS.map((key): CheckSummary => {
    const perSegment = withIntegrity.flatMap(({ segment, integrity }) => {
      const check = integrity.checks.find((candidate) => candidate.key === key);
      return check === undefined ? [] : [{ segment, check }];
    });
    return {
      key,
      risk: worstRisk(perSegment.map(({ check }) => check.risk)) ?? 'UNKNOWN',
      lowestConfidence: minOrNull(perSegment.map(({ check }) => check.confidence)),
      observations: perSegment.flatMap(({ segment, check }) =>
        check.observations.map((observation, position) => ({
          ...observation,
          id: `${segment.id}-${key}-${position}`,
          segmentIndex: segment.index,
          checkKey: key,
          risk: check.risk,
        })),
      ),
    };
  });

  const flaggedObservations = checks.flatMap((check) =>
    check.observations
      .filter((observation) => isElevated(observation.risk))
      .map((observation): FlaggedItem => ({
        id: observation.id,
        kind: 'observation',
        category: observation.category,
        text: observation.text,
        timestamp: observation.timestamp,
        offsetSeconds: observation.offsetSeconds,
        segmentIndex: observation.segmentIndex,
        risk: observation.risk,
      })),
  );

  const flaggedRanges = withIntegrity.flatMap(({ segment, integrity }) =>
    integrity.suspiciousTimeRanges.map((range, position): FlaggedItem => ({
      id: `${segment.id}-range-${position}`,
      kind: 'time_range',
      category: 'SUSPICIOUS_TIME_RANGE',
      text: range,
      timestamp: null,
      offsetSeconds: null,
      segmentIndex: segment.index,
      risk: null,
    })),
  );

  const flaggedPeople = segments.filter(isAnalysed).flatMap((segment): FlaggedItem[] =>
    segment.analysis.identity?.multiplePeopleDetected === true
      ? [
          {
            id: `${segment.id}-people`,
            kind: 'multiple_people',
            category: 'MULTIPLE_PEOPLE',
            text: 'More than one person was detected in the recording.',
            timestamp: null,
            offsetSeconds: null,
            segmentIndex: segment.index,
            risk: null,
          },
        ]
      : [],
  );

  const flagged = [...flaggedObservations, ...flaggedRanges, ...flaggedPeople].sort(
    (a, b) =>
      a.segmentIndex - b.segmentIndex ||
      (a.offsetSeconds ?? Number.MAX_SAFE_INTEGER) - (b.offsetSeconds ?? Number.MAX_SAFE_INTEGER),
  );

  return {
    analysedCount: withIntegrity.length,
    overallRisk:
      worstRisk(withIntegrity.map(({ integrity }) => integrity.overallRisk)) ?? 'UNKNOWN',
    checks,
    flagged,
    audioAnomalyCount: checks
      .filter((check) => check.key === 'audioVideoConsistency')
      .flatMap((check) => check.observations)
      .filter((observation) => isElevated(observation.risk)).length,
    limitations: [...new Set(withIntegrity.flatMap(({ integrity }) => integrity.limitations))],
  };
}

export interface IdentityEntry {
  segmentId: string;
  segmentIndex: number;
  result: IdentityResult;
}

export function collectIdentity(segments: readonly RecordingSegment[]): IdentityEntry[] {
  return segments.filter(isAnalysed).flatMap((segment) => {
    const { identity } = segment.analysis;
    return identity === null
      ? []
      : [{ segmentId: segment.id, segmentIndex: segment.index, result: identity }];
  });
}

export interface TranscriptGroup {
  segment: RecordingSegment;
  entries: TranscriptEntry[];
}

/** One group per segment in scope, in order, including segments with no transcript. */
export function groupTranscript(segments: readonly RecordingSegment[]): TranscriptGroup[] {
  return segments.map((segment) => ({
    segment,
    entries: segment.analysis?.transcript ?? [],
  }));
}

export function countTranscriptEntries(groups: readonly TranscriptGroup[]): number {
  return groups.reduce((total, group) => total + group.entries.length, 0);
}

/** Keeps only entries whose text contains the query; drops groups left empty. */
export function searchTranscript(
  groups: readonly TranscriptGroup[],
  query: string,
): TranscriptGroup[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...groups];
  return groups
    .map((group) => ({
      segment: group.segment,
      entries: group.entries.filter((entry) => entry.text.toLowerCase().includes(needle)),
    }))
    .filter((group) => group.entries.length > 0);
}

export type TranscriptBlock =
  { kind: 'segment'; group: TranscriptGroup } | { kind: 'gap'; segments: RecordingSegment[] };

/**
 * Merges runs of segments that have no analysis into a single "gap" block, so
 * a room with one analysed segment and fifteen pending ones stays readable.
 */
export function collapseTranscript(groups: readonly TranscriptGroup[]): TranscriptBlock[] {
  const blocks: TranscriptBlock[] = [];
  for (const group of groups) {
    if (isAnalysed(group.segment)) {
      blocks.push({ kind: 'segment', group });
      continue;
    }
    const previous = blocks.at(-1);
    if (previous?.kind === 'gap') previous.segments.push(group.segment);
    else blocks.push({ kind: 'gap', segments: [group.segment] });
  }
  return blocks;
}

export type AnomalySeverity = 'HIGH' | 'MEDIUM';

export interface IdentityAnomaly {
  id: string;
  severity: AnomalySeverity;
  title: string;
  text: string;
  timestamp: string | null;
}

/** Everything in an identity result that an auditor should look at, worst first. */
export function identityAnomalies(entry: IdentityEntry): IdentityAnomaly[] {
  const { result, segmentId } = entry;
  const anomalies: IdentityAnomaly[] = result.conflictingEvidence.map((evidence, position) => ({
    id: `${segmentId}-conflict-${position}`,
    severity: 'HIGH',
    title: 'Conflicting evidence',
    text: evidence.text,
    timestamp: evidence.timestamp,
  }));

  if (result.decision !== 'CONSISTENT') {
    anomalies.push({
      id: `${segmentId}-decision`,
      severity: result.decision === 'INCONSISTENT' ? 'HIGH' : 'MEDIUM',
      title: 'Identity not confirmed',
      text: `The identity check returned “${result.rawDecision}”.`,
      timestamp: null,
    });
  }
  if (result.multiplePeopleDetected) {
    anomalies.push({
      id: `${segmentId}-people`,
      severity: 'MEDIUM',
      title: 'Multiple people detected',
      text: 'More than one person appears in the interview recording.',
      timestamp: null,
    });
  }
  if (result.confidence !== null && result.confidence < IDENTITY_REVIEW_THRESHOLD) {
    anomalies.push({
      id: `${segmentId}-confidence`,
      severity: 'MEDIUM',
      title: 'Confidence below the review threshold',
      text: `Match confidence is ${Math.round(result.confidence * 100)}%, under the portal's ${Math.round(IDENTITY_REVIEW_THRESHOLD * 100)}% review threshold.`,
      timestamp: null,
    });
  }
  return anomalies.sort((a, b) => Number(b.severity === 'HIGH') - Number(a.severity === 'HIGH'));
}

export interface TimelineMarker {
  id: string;
  /** 0 to 1 along the track. */
  position: number;
  timestamp: string;
  text: string;
  risk: RiskLevel;
  checkKey: CheckKey;
}

export interface TimelineTrack {
  segmentId: string;
  segmentIndex: number;
  /** Latest timestamp seen in the segment, in seconds. The API sends no duration. */
  extentSeconds: number;
  markers: TimelineMarker[];
}

/**
 * Places each timestamped observation along its segment. The API gives no
 * segment length, so each track runs to the latest timestamp seen in that
 * segment's transcript and observations.
 */
export function buildTimeline(segments: readonly RecordingSegment[]): TimelineTrack[] {
  return segments.filter(isAnalysed).flatMap((segment): TimelineTrack[] => {
    const checks = segment.analysis.integrity?.checks ?? [];
    const observed = checks.flatMap((check) =>
      check.observations.flatMap((observation, position) =>
        observation.offsetSeconds === null || observation.timestamp === null
          ? []
          : [
              {
                id: `${segment.id}-${check.key}-${position}`,
                offsetSeconds: observation.offsetSeconds,
                timestamp: observation.timestamp,
                text: observation.text,
                risk: check.risk,
                checkKey: check.key,
              },
            ],
      ),
    );
    if (observed.length === 0) return [];

    const extentSeconds = Math.max(
      1,
      ...observed.map((item) => item.offsetSeconds),
      ...segment.analysis.transcript.map((entry) => entry.offsetSeconds ?? 0),
    );
    return [
      {
        segmentId: segment.id,
        segmentIndex: segment.index,
        extentSeconds,
        markers: observed
          .map(({ offsetSeconds, ...marker }) => ({
            ...marker,
            position: offsetSeconds / extentSeconds,
          }))
          .sort((a, b) => a.position - b.position),
      },
    ];
  });
}

/** Seconds as `m:ss` or `h:mm:ss`. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
    : `${String(minutes).padStart(2, '0')}:${rest}`;
}
