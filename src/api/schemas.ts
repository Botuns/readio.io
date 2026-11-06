import { z } from 'zod';

/**
 * DTO schemas. Field names, casing and nesting mirror the responses captured
 * from the live API on 2026-11-05 (see docs/api-findings.md).
 *
 * Two deliberate tolerances keep one odd record from blanking a whole screen:
 * - enum-like strings (`risk`, `speaker`, `disposition`, ...) are validated as
 *   strings and narrowed to literal unions in the mappers, because only a
 *   subset of their values has been observed;
 * - fields that were never observed with a value are typed `unknown`.
 */

const assessmentVideoDtoSchema = z.object({
  created_at: z.string().nullable(),
  video_url_link: z.string().nullable(),
  userId: z.string().nullable(),
  streakId: z.number().nullable(),
  profileAvatar: z.unknown(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  totalQuestions: z.number().nullable(),
  correctCount: z.number().nullable(),
  wrongCount: z.number().nullable(),
  unansweredCount: z.number().nullable(),
  pctCorrect: z.number().nullable(),
  created_date: z.string().nullable(),
  created_time: z.string().nullable(),
  totalActivityCount: z.number().nullable(),
  activityCountsByType: z.string().nullable(),
  invigilatorVideoUrlLink: z.string().nullable(),
});

export const campaignJobDtoSchema = z.object({
  roomName: z.string().min(1),
  campaignId: z.number(),
  userId: z.number(),
  analyticsCompleted: z.boolean(),
  candidateUserId: z.number().nullable(),
  candidateId: z.string().nullable(),
  candidateName: z.string().nullable(),
  candidateEmail: z.string(),
  candidateDateCreated: z.string().nullable(),
  campaignJobTitle: z.string().nullable(),
  percentageAnalyticCompleted: z.number().nullable(),
  // Not rendered by the portal, so a shape change here must not fail the page.
  campaign_assessment_video_link: z.array(assessmentVideoDtoSchema).catch([]),
});

export const campaignJobsResponseSchema = z.array(campaignJobDtoSchema);

const observationDtoSchema = z.object({
  timestamp: z.string().nullable(),
  source: z.string(),
  category: z.string(),
  observation: z.string(),
});

const riskCheckDtoSchema = z.object({
  risk: z.string(),
  confidence: z.number().nullable(),
  observations: z.array(observationDtoSchema),
});

const transcriptEntryDtoSchema = z.object({
  timestamp: z.string(),
  speaker: z.string(),
  text: z.string(),
  videoUrl: z.string().nullish(),
});

const identityPhase1DtoSchema = z.object({
  decision: z.string(),
  confidence: z.number().nullable(),
  referenceVideoQuality: z.string().nullable(),
  interviewVideoQuality: z.string().nullable(),
  multiplePeopleDetected: z.boolean(),
  matchingEvidence: z.array(observationDtoSchema),
  conflictingEvidence: z.array(observationDtoSchema),
  limitations: z.array(z.string()),
});

const deepfakePhase2DtoSchema = z.object({
  gemini: z.object({
    overallRisk: z.string(),
    syntheticVideo: riskCheckDtoSchema,
    personContinuity: riskCheckDtoSchema,
    audioVideoConsistency: riskCheckDtoSchema,
    possibleOffScreenAssistance: riskCheckDtoSchema,
    suspiciousTimeRanges: z.array(z.unknown()),
    limitations: z.array(z.string()),
    transcript: z.object({ entries: z.array(transcriptEntryDtoSchema) }),
  }),
  specialistResults: z.array(z.unknown()),
  disposition: z.string().nullable(),
  humanReviewRequired: z.boolean(),
});

const analyticDtoSchema = z.object({
  identity_phase1: identityPhase1DtoSchema.nullable(),
  deepfake_phase2: deepfakePhase2DtoSchema.nullable(),
  candidateId: z.string().nullable(),
  disposition: z.string(),
  humanReviewRequired: z.boolean(),
});

export const roomRecordDtoSchema = z.object({
  roomName: z.string(),
  recordingType: z.string(),
  databaseType: z.string(),
  campaignId: z.number().nullable(),
  userId: z.number().nullable(),
  status: z.string(),
  attempts: z.number(),
  lastError: z.string().nullable(),
  /** Present on every observed record, so it identifies the segment. */
  egressId: z.string().nullable(),
  objectPath: z.string().nullable(),
  finalUrl: z.string().nullable(),
  participantIdentity: z.unknown(),
  /** Null on a segment whose recording failed. */
  campaignRecordId: z.number().nullable(),
  parsedCampaignId: z.string().nullable(),
  extractedEmail: z.string().nullable(),
  campaignAssessments: z.array(z.unknown()),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  persistedAt: z.string().nullable(),
  nextCheckAt: z.string().nullable(),
  /** `"Y"`, `"N"` or `"P"` here; a boolean on the campaign endpoint. */
  analyticsCompleted: z.string(),
  analytic: analyticDtoSchema.nullable(),
});

export const roomResponseSchema = z.array(roomRecordDtoSchema);

export type CampaignJobDto = z.infer<typeof campaignJobDtoSchema>;
export type RoomRecordDto = z.infer<typeof roomRecordDtoSchema>;
export type AnalyticDto = z.infer<typeof analyticDtoSchema>;
export type IdentityPhase1Dto = z.infer<typeof identityPhase1DtoSchema>;
export type DeepfakePhase2Dto = z.infer<typeof deepfakePhase2DtoSchema>;
export type RiskCheckDto = z.infer<typeof riskCheckDtoSchema>;
export type ObservationDto = z.infer<typeof observationDtoSchema>;
export type TranscriptEntryDto = z.infer<typeof transcriptEntryDtoSchema>;
