import { cn } from '@/lib/cn';
import { formatFraction } from '@/lib/format';
import { TONE_FILL_CLASSES, type Tone } from '@/lib/statusMeta';

interface MeterProps {
  /** Accessible name, for example "Synthetic video model confidence". */
  label: string;
  /** 0 to 1, or null when the API sent no value. */
  value: number | null;
  tone: Tone;
  className?: string;
}

/** A horizontal meter with its value printed beside it. */
export function Meter({ label, value, tone, className }: MeterProps) {
  if (value === null) {
    return <p className={cn('text-13 text-muted', className)}>No confidence value</p>;
  }
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200 ease-out',
            TONE_FILL_CLASSES[tone],
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="tabular w-10 text-right text-13 font-medium text-ink">
        {formatFraction(value)}
      </span>
    </div>
  );
}
