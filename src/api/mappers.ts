import type {
  CampaignJob,
  CheckKey,
  IdentityDecision,
  IdentityResult,
  IntegrityResult,
  Observation,
  RecordingSegment,
  RiskCheck,
  RiskLevel,
  RoomEvaluation,
  SegmentAnalysis,
  SegmentState,
  Speaker,
  TranscriptEntry,
  Verdict,
} from '@/domain/types';
import type {
  AnalyticDto,
  CampaignJobDto,
  DeepfakePhase2Dto,
  IdentityPhase1Dto,
  ObservationDto,
  RiskCheckDto,
  RoomRecordDto,
  TranscriptEntryDto,
} from './schemas';

const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const FRACTION = /\.(\d{3})\d+/;
const CLOCK = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/;

/**
 * Parses an API timestamp to epoch milliseconds.
 *
 * The campaign endpoint sends an offset (`2026-10-27T09:17:20.822+00:00`); the
 * room endpoint sends microseconds and no offset (`2026-10-27T09:17:20.822875`).
 * The two describe the same instant, so offset-less values are read as UTC.
 */
export function parseApiTimestamp(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === '') return null;
  const trimmed = value.trim().replace(' ', 'T').replace(FRACTION, '.$1');
  const ms = Date.parse(HAS_ZONE.test(trimmed) ? trimmed : `${trimmed}Z`);
  return Number.isNaN(ms) ? null : ms;
}

/** Parses `mm:ss` or `h:mm:ss` to seconds. */
export function parseClock(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const match = CLOCK.exec(value.trim());
  if (match === null) return null;
  const [, hours = '0', minutes = '0', seconds = '0'] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

/**
 * The campaign endpoint has no status field, so the spec's verification status
 * is derived from `analyticsCompleted`. It carries no failure signal, which
 * means FAILED is part of the model but is never produced from live data.
 */
export function toCampaignJob(dto: CampaignJobDto): CampaignJob {
  const progress = dto.percentageAnalyticCompleted ?? (dto.analyticsCompleted ? 100 : 0);
  return {
    roomName: dto.roomName,
    campaignId: dto.campaignId,
    candidateName: blankToNull(dto.candidateName),
    candidateEmail: dto.candidateEmail,
    jobTitle: blankToNull(dto.campaignJobTitle),
    submittedAt: parseApiTimestamp(dto.candidateDateCreated),
    verificationStatus: dto.analyticsCompleted ? 'COMPLETED' : 'IN_PROGRESS',
    analysisProgress: Math.min(100, Math.max(0, progress)),
  };
}

export function toRiskLevel(raw: string): RiskLevel {
  switch (raw.trim().toUpperCase()) {
    case 'LOW':
    case 'NONE':
      return 'LOW';
    case 'MEDIUM':
    case 'MODERATE':
      return 'MEDIUM';
    case 'HIGH':
    case 'CRITICAL':
      return 'HIGH';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Maps the API's disposition onto the spec's status tag.
 * Observed values: `PASS_WITH_LOW_RISK` and `REVIEW_REQUIRED`. Fail-like values
 * have not been observed, so they are matched by prefix; anything unrecognised
 * is treated as WARNING so it is looked at rather than waved through.
 */
export function toVerdict(
  disposition: string,
  humanReviewRequired: boolean,
  overallRisk: RiskLevel | null,
): Verdict {
  const value = disposition.trim().toUpperCase();
  if (value.startsWith('FAIL') || value.startsWith('REJECT') || overallRisk === 'HIGH') {
    return 'FAILED';
  }
  if (value.startsWith('PASS') && !humanReviewRequired && overallRisk !== 'MEDIUM') {
    return 'PASSED';
  }
  return 'WARNING';
}

function toIdentityDecision(raw: string): IdentityDecision {
  const value = raw.trim().toUpperCase();
  if (value === 'CONSISTENT' || value === 'MATCH') return 'CONSISTENT';
  if (value.startsWith('INCONSISTENT') || value.includes('MISMATCH')) return 'INCONSISTENT';
  return 'INCONCLUSIVE';
}

function toSpeaker(raw: string): Speaker {
  switch (raw.trim().toUpperCase()) {
    case 'INTERVIEWER':
    case 'AI':
    case 'ASSISTANT':
      return 'INTERVIEWER';
    case 'INTERVIEWEE':
    case 'CANDIDATE':
      return 'CANDIDATE';
    default:
      return 'PARTICIPANT';
  }
}

function toSegmentState(dto: RoomRecordDto): SegmentState {
  if (dto.status.toUpperCase() === 'FAILED') return 'FAILED';
  if (dto.analytic !== null) return 'ANALYSED';
  switch (dto.analyticsCompleted.toUpperCase()) {
    case 'P':
      return 'PROCESSING';
    default:
      return 'PENDING';
  }
}

function blankToNull(value: string | null): string | null {
  return value === null || value.trim() === '' ? null : value;
}

function toObservation(dto: ObservationDto): Observation {
  return {
    timestamp: blankToNull(dto.timestamp),
    offsetSeconds: parseClock(dto.timestamp),
    source: dto.source,
    category: dto.category,
    text: dto.observation,
  };
}

function toRiskCheck(key: CheckKey, dto: RiskCheckDto): RiskCheck {
  return {
    key,
    risk: toRiskLevel(dto.risk),
    rawRisk: dto.risk,
    confidence: dto.confidence,
    observations: dto.observations.map(toObservation),
  };
}

function toIdentity(dto: IdentityPhase1Dto): IdentityResult {
  return {
    decision: toIdentityDecision(dto.decision),
    rawDecision: dto.decision,
    confidence: dto.confidence,
    referenceVideoQuality: blankToNull(dto.referenceVideoQuality),
    interviewVideoQuality: blankToNull(dto.interviewVideoQuality),
    multiplePeopleDetected: dto.multiplePeopleDetected,
    matchingEvidence: dto.matchingEvidence.map(toObservation),
    conflictingEvidence: dto.conflictingEvidence.map(toObservation),
    limitations: dto.limitations,
  };
}

function describeTimeRange(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function toIntegrity(dto: DeepfakePhase2Dto): IntegrityResult {
  const { gemini } = dto;
  return {
    overallRisk: toRiskLevel(gemini.overallRisk),
    rawOverallRisk: gemini.overallRisk,
    checks: [
      toRiskCheck('syntheticVideo', gemini.syntheticVideo),
      toRiskCheck('personContinuity', gemini.personContinuity),
      toRiskCheck('audioVideoConsistency', gemini.audioVideoConsistency),
      toRiskCheck('offScreenAssistance', gemini.possibleOffScreenAssistance),
    ],
    suspiciousTimeRanges: gemini.suspiciousTimeRanges.map(describeTimeRange),
    limitations: gemini.limitations,
    disposition: dto.disposition,
    humanReviewRequired: dto.humanReviewRequired,
  };
}

function toTranscript(segmentId: string, entries: TranscriptEntryDto[]): TranscriptEntry[] {
  return entries.map((entry, position) => ({
    id: `${segmentId}-${position}`,
    timestamp: entry.timestamp,
    offsetSeconds: parseClock(entry.timestamp),
    speaker: toSpeaker(entry.speaker),
    rawSpeaker: entry.speaker,
    text: entry.text,
  }));
}

function toAnalysis(segmentId: string, dto: AnalyticDto): SegmentAnalysis {
  const integrity = dto.deepfake_phase2 === null ? null : toIntegrity(dto.deepfake_phase2);
  return {
    verdict: toVerdict(dto.disposition, dto.humanReviewRequired, integrity?.overallRisk ?? null),
    disposition: dto.disposition,
    humanReviewRequired: dto.humanReviewRequired,
    identity: dto.identity_phase1 === null ? null : toIdentity(dto.identity_phase1),
    integrity,
    transcript:
      dto.deepfake_phase2 === null
        ? []
        : toTranscript(segmentId, dto.deepfake_phase2.gemini.transcript.entries),
  };
}

/** Segments arrive unordered; missing start times sort last. */
function byStartTime(a: { startedAt: number | null }, b: { startedAt: number | null }): number {
  if (a.startedAt === b.startedAt) return 0;
  if (a.startedAt === null) return 1;
  if (b.startedAt === null) return -1;
  return a.startedAt - b.startedAt;
}

/** A room response is a list of recording segments, not a single evaluation. */
export function toRoomEvaluation(roomName: string, records: RoomRecordDto[]): RoomEvaluation {
  const segments = records
    .map((dto, position) => {
      // `campaignRecordId` is null on failed recordings; `egressId` never was.
      const id = dto.egressId ?? String(dto.campaignRecordId ?? `segment-${position}`);
      return {
        id,
        startedAt: parseApiTimestamp(dto.createdAt),
        state: toSegmentState(dto),
        attempts: dto.attempts,
        lastError: blankToNull(dto.lastError),
        analysis: dto.analytic === null ? null : toAnalysis(id, dto.analytic),
      };
    })
    .sort(byStartTime)
    .map((segment, position): RecordingSegment => ({ ...segment, index: position + 1 }));

  return {
    roomName,
    campaignId: records.find((record) => record.campaignId !== null)?.campaignId ?? null,
    segments,
  };
}
