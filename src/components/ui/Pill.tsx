import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  IdentityDecision,
  RiskLevel,
  SegmentState,
  Verdict,
  VerificationStatus,
} from '@/domain/types';
import { cn } from '@/lib/cn';
import {
  identityDecisionMeta,
  riskMeta,
  segmentStateMeta,
  TONE_CLASSES,
  verdictMeta,
  verificationMeta,
  type StatusMeta,
  type Tone,
} from '@/lib/statusMeta';

type PillSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<PillSize, string> = {
  sm: 'h-6 gap-1 px-2 text-xs',
  md: 'h-7 gap-1.5 px-2.5 text-13',
  lg: 'h-10 gap-2 px-3.5 text-base',
};

const ICON_CLASSES: Record<PillSize, string> = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
};

interface PillProps {
  tone: Tone;
  Icon: LucideIcon;
  size?: PillSize;
  className?: string;
  children: ReactNode;
}

/** Status as an icon and a word on a soft tint. Colour is never the only signal. */
export function Pill({ tone, Icon, size = 'sm', className, children }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-chip font-medium whitespace-nowrap',
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn('shrink-0', ICON_CLASSES[size])} />
      {children}
    </span>
  );
}

interface MetaPillProps {
  meta: StatusMeta;
  size?: PillSize;
  className?: string;
}

function MetaPill({ meta, size, className }: MetaPillProps) {
  return (
    <Pill
      tone={meta.tone}
      Icon={meta.Icon}
      {...(size && { size })}
      {...(className && { className })}
    >
      {meta.label}
    </Pill>
  );
}

interface StatusPillProps<T> {
  value: T;
  size?: PillSize;
  className?: string;
}

export function VerificationPill({ value, ...rest }: StatusPillProps<VerificationStatus>) {
  return <MetaPill meta={verificationMeta(value)} {...rest} />;
}

export function VerdictTag({ value, ...rest }: StatusPillProps<Verdict>) {
  return <MetaPill meta={verdictMeta(value)} {...rest} />;
}

export function RiskPill({ value, ...rest }: StatusPillProps<RiskLevel>) {
  return <MetaPill meta={riskMeta(value)} {...rest} />;
}

export function SegmentStatePill({ value, ...rest }: StatusPillProps<SegmentState>) {
  return <MetaPill meta={segmentStateMeta(value)} {...rest} />;
}

export function IdentityDecisionPill({ value, ...rest }: StatusPillProps<IdentityDecision>) {
  return <MetaPill meta={identityDecisionMeta(value)} {...rest} />;
}
