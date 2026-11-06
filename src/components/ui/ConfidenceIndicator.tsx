import { cn } from '@/lib/cn';
import { TONE_FILL_CLASSES, TONE_STROKE_CLASSES, type Tone } from '@/lib/statusMeta';

const RADIUS = 80;
const CENTER_X = 100;
const BASELINE_Y = 100;
const ARC_LENGTH = Math.PI * RADIUS;
const ARC_PATH = `M ${CENTER_X - RADIUS} ${BASELINE_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X + RADIUS} ${BASELINE_Y}`;

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Point on the gauge arc for a 0 to 1 value, at the given distance from the centre. */
function pointOnArc(fraction: number, distance: number): { x: number; y: number } {
  const angle = Math.PI * (1 - fraction);
  return {
    x: CENTER_X + distance * Math.cos(angle),
    y: BASELINE_Y - distance * Math.sin(angle),
  };
}

interface ConfidenceIndicatorProps {
  /** Accessible name, for example "Biometric match confidence". */
  label: string;
  /** 0 to 1. */
  value: number;
  /** 0 to 1. Drawn as a labelled marker. */
  threshold: number;
  thresholdLabel: string;
  tone: Tone;
  className?: string;
}

/**
 * One meter, two drawings: a half-circle gauge from the `md` breakpoint up and
 * a threshold bar below it. Both show the same value and threshold marker.
 */
export function ConfidenceIndicator({
  label,
  value,
  threshold,
  thresholdLabel,
  tone,
  className,
}: ConfidenceIndicatorProps) {
  const fraction = clamp(value);
  const mark = clamp(threshold);
  const percent = Math.round(fraction * 100);
  const markPercent = Math.round(mark * 100);
  const inner = pointOnArc(mark, RADIUS - 11);
  const outer = pointOnArc(mark, RADIUS + 11);
  const labelPoint = pointOnArc(mark, RADIUS + 22);

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent}%. ${thresholdLabel} ${markPercent}%.`}
      className={className}
    >
      <svg viewBox="0 0 200 124" aria-hidden="true" className="hidden w-full max-w-64 md:block">
        <path
          d={ARC_PATH}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className="stroke-sunken"
        />
        <path
          d={ARC_PATH}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${ARC_LENGTH * fraction} ${ARC_LENGTH}`}
          className={cn(
            'transition-[stroke-dasharray] duration-200 ease-out',
            TONE_STROKE_CLASSES[tone],
          )}
        />
        <line
          x1={inner.x}
          y1={inner.y}
          x2={outer.x}
          y2={outer.y}
          strokeWidth="2"
          className="stroke-ink"
        />
        <text
          x={labelPoint.x}
          y={labelPoint.y}
          textAnchor={mark > 0.5 ? 'start' : 'end'}
          className="tabular fill-muted text-[9px] font-medium"
        >
          {markPercent}%
        </text>
        <text
          x={CENTER_X}
          y={BASELINE_Y - 12}
          textAnchor="middle"
          className="tabular fill-ink text-[34px] font-semibold"
        >
          {percent}%
        </text>
        <text
          x={CENTER_X}
          y={BASELINE_Y + 8}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          confidence
        </text>
      </svg>

      <div aria-hidden="true" className="md:hidden">
        <p className="tabular text-[28px] leading-[34px] font-semibold text-ink">
          {percent}%<span className="ml-2 text-13 font-normal text-muted">confidence</span>
        </p>
        <div className="relative mt-3 h-2.5 rounded-full bg-sunken">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-200 ease-out',
              TONE_FILL_CLASSES[tone],
            )}
            style={{ width: `${percent}%` }}
          />
          <span
            className="absolute -top-1.5 h-5.5 w-0.5 -translate-x-1/2 rounded-full bg-ink"
            style={{ left: `${markPercent}%` }}
          />
        </div>
      </div>

      <p className="tabular mt-2 text-xs text-muted md:mt-1 md:text-center">
        {thresholdLabel} {markPercent}%
      </p>
    </div>
  );
}
