import {
  AudioLines,
  BadgeCheck,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  CircleX,
  Eye,
  Headset,
  LoaderCircle,
  OctagonAlert,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  UserRound,
  Users,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';
import { assertNever } from '@/domain/assertNever';
import type {
  CheckKey,
  IdentityDecision,
  RiskLevel,
  SegmentState,
  Speaker,
  Verdict,
  VerificationStatus,
} from '@/domain/types';

/** Labels, tones and icons for every status union. Status is never colour alone. */

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusMeta {
  label: string;
  tone: Tone;
  Icon: LucideIcon;
}

export const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-sunken text-muted',
};

export const TONE_FILL_CLASSES: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted',
};

export const TONE_STROKE_CLASSES: Record<Tone, string> = {
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
  info: 'stroke-info',
  neutral: 'stroke-muted',
};

export function verificationMeta(status: VerificationStatus): StatusMeta {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Completed', tone: 'success', Icon: CircleCheck };
    case 'IN_PROGRESS':
      return { label: 'In progress', tone: 'info', Icon: LoaderCircle };
    case 'FAILED':
      return { label: 'Failed', tone: 'danger', Icon: CircleX };
    default:
      return assertNever(status);
  }
}

export function verdictMeta(verdict: Verdict): StatusMeta {
  switch (verdict) {
    case 'PASSED':
      return { label: 'Passed', tone: 'success', Icon: ShieldCheck };
    case 'WARNING':
      return { label: 'Warning', tone: 'warning', Icon: ShieldAlert };
    case 'FAILED':
      return { label: 'Failed', tone: 'danger', Icon: ShieldX };
    default:
      return assertNever(verdict);
  }
}

export function riskMeta(risk: RiskLevel): StatusMeta {
  switch (risk) {
    case 'LOW':
      return { label: 'Low risk', tone: 'success', Icon: CircleCheck };
    case 'MEDIUM':
      return { label: 'Medium risk', tone: 'warning', Icon: TriangleAlert };
    case 'HIGH':
      return { label: 'High risk', tone: 'danger', Icon: OctagonAlert };
    case 'UNKNOWN':
      return { label: 'Unrated', tone: 'neutral', Icon: CircleHelp };
    default:
      return assertNever(risk);
  }
}

export function segmentStateMeta(state: SegmentState): StatusMeta {
  switch (state) {
    case 'ANALYSED':
      return { label: 'Analysed', tone: 'success', Icon: CircleCheck };
    case 'PROCESSING':
      return { label: 'Processing', tone: 'info', Icon: LoaderCircle };
    case 'PENDING':
      return { label: 'Not analysed', tone: 'neutral', Icon: CircleDashed };
    case 'FAILED':
      return { label: 'Recording failed', tone: 'danger', Icon: CircleX };
    default:
      return assertNever(state);
  }
}

export function identityDecisionMeta(decision: IdentityDecision): StatusMeta {
  switch (decision) {
    case 'CONSISTENT':
      return { label: 'Consistent', tone: 'success', Icon: BadgeCheck };
    case 'INCONSISTENT':
      return { label: 'Inconsistent', tone: 'danger', Icon: CircleX };
    case 'INCONCLUSIVE':
      return { label: 'Inconclusive', tone: 'warning', Icon: CircleHelp };
    default:
      return assertNever(decision);
  }
}

export interface SpeakerMeta {
  label: string;
  Icon: LucideIcon;
}

export function speakerMeta(speaker: Speaker): SpeakerMeta {
  switch (speaker) {
    case 'INTERVIEWER':
      return { label: 'Interviewer', Icon: Headset };
    case 'CANDIDATE':
      return { label: 'Candidate', Icon: UserRound };
    case 'PARTICIPANT':
      return { label: 'Participant', Icon: Users };
    default:
      return assertNever(speaker);
  }
}

export interface CheckMeta {
  label: string;
  description: string;
  /** The field this check comes from, shown so the mapping is auditable. */
  apiField: string;
  Icon: LucideIcon;
}

export function checkMeta(key: CheckKey): CheckMeta {
  switch (key) {
    case 'syntheticVideo':
      return {
        label: 'Synthetic video',
        description: 'Signs that the video was generated or manipulated.',
        apiField: 'syntheticVideo',
        Icon: ScanFace,
      };
    case 'personContinuity':
      return {
        label: 'Person continuity',
        description: 'Whether the same person stays on camera throughout.',
        apiField: 'personContinuity',
        Icon: UserRoundCheck,
      };
    case 'audioVideoConsistency':
      return {
        label: 'Audio and video consistency',
        description: 'Whether speech matches lip movement and the environment.',
        apiField: 'audioVideoConsistency',
        Icon: AudioLines,
      };
    case 'offScreenAssistance':
      return {
        label: 'Gaze and off-screen activity',
        description: 'Reading, second devices or help from outside the frame.',
        apiField: 'possibleOffScreenAssistance',
        Icon: Eye,
      };
    default:
      return assertNever(key);
  }
}
