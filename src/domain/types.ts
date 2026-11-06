export const VERIFICATION_STATUSES = ['COMPLETED', 'IN_PROGRESS', 'FAILED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERDICTS = ['PASSED', 'WARNING', 'FAILED'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const SPEAKERS = ['INTERVIEWER', 'CANDIDATE', 'PARTICIPANT'] as const;
export type Speaker = (typeof SPEAKERS)[number];

export const SEGMENT_STATES = ['ANALYSED', 'PROCESSING', 'PENDING', 'FAILED'] as const;
export type SegmentState = (typeof SEGMENT_STATES)[number];

export const IDENTITY_DECISIONS = ['CONSISTENT', 'INCONSISTENT', 'INCONCLUSIVE'] as const;
export type IdentityDecision = (typeof IDENTITY_DECISIONS)[number];

export const CHECK_KEYS = [
  'syntheticVideo',
  'personContinuity',
  'audioVideoConsistency',
  'offScreenAssistance',
] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];

/** One row of the campaign overview. */
export interface CampaignJob {
  roomName: string;
  campaignId: number;
  candidateName: string | null;
  candidateEmail: string;
  jobTitle: string | null;
  /** Epoch milliseconds, or null when the API value is missing or unparseable. */
  submittedAt: number | null;
  verificationStatus: VerificationStatus;
  /** Share of the session's analysis that has finished, 0 to 100. */
  analysisProgress: number;
}

/** A timestamped note written by one of the analysis models. */
export interface Observation {
  /** Clock position inside the segment, as sent by the API (`mm:ss`). */
  timestamp: string | null;
  offsetSeconds: number | null;
  source: string;
  category: string;
  text: string;
}

export interface RiskCheck {
  key: CheckKey;
  risk: RiskLevel;
  /** The API's own risk string, kept for display when it is not a known level. */
  rawRisk: string;
  /** Model confidence in its assessment, 0 to 1. */
  confidence: number | null;
  observations: Observation[];
}

export interface IdentityResult {
  decision: IdentityDecision;
  rawDecision: string;
  /** Biometric match confidence, 0 to 1. */
  confidence: number | null;
  referenceVideoQuality: string | null;
  interviewVideoQuality: string | null;
  multiplePeopleDetected: boolean;
  matchingEvidence: Observation[];
  conflictingEvidence: Observation[];
  limitations: string[];
}

export interface IntegrityResult {
  overallRisk: RiskLevel;
  rawOverallRisk: string;
  checks: RiskCheck[];
  /** The API has only ever returned an empty list; items are shown verbatim. */
  suspiciousTimeRanges: string[];
  limitations: string[];
  disposition: string | null;
  humanReviewRequired: boolean;
}

export interface TranscriptEntry {
  id: string;
  timestamp: string;
  offsetSeconds: number | null;
  speaker: Speaker;
  rawSpeaker: string;
  text: string;
}

export interface SegmentAnalysis {
  verdict: Verdict;
  disposition: string;
  humanReviewRequired: boolean;
  identity: IdentityResult | null;
  integrity: IntegrityResult | null;
  transcript: TranscriptEntry[];
}

/** One recording chunk of a room. A room is a chronological list of these. */
export interface RecordingSegment {
  id: string;
  /** 1-based position in chronological order. */
  index: number;
  startedAt: number | null;
  state: SegmentState;
  attempts: number;
  lastError: string | null;
  analysis: SegmentAnalysis | null;
}

export interface RoomEvaluation {
  roomName: string;
  campaignId: number | null;
  segments: RecordingSegment[];
}
