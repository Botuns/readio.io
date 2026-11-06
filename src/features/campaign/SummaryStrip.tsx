import type { StatusCounts } from '@/domain/jobs';
import { VERIFICATION_STATUSES, type VerificationStatus } from '@/domain/types';
import { cn } from '@/lib/cn';
import { TONE_CLASSES, verificationMeta } from '@/lib/statusMeta';

interface SummaryStripProps {
  counts: StatusCounts;
  active: VerificationStatus | undefined;
  /** Called with the status to filter by, or undefined to clear the filter. */
  onChange: (status: VerificationStatus | undefined) => void;
}

/** Counts per verification status. Each count is also a toggle that filters the list. */
export function SummaryStrip({ counts, active, onChange }: SummaryStripProps) {
  return (
    <div
      role="group"
      aria-label="Filter by verification status"
      className="grid grid-cols-3 gap-2 md:gap-3"
    >
      {VERIFICATION_STATUSES.map((status) => {
        const meta = verificationMeta(status);
        const pressed = active === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(pressed ? undefined : status)}
            className={cn(
              'btn-secondary flex min-h-16 flex-col items-start justify-center gap-1 rounded-card px-3 py-2.5 text-left transition-[box-shadow,background-color] duration-150 md:px-4 md:py-3',
              pressed && 'ring-2 ring-accent ring-inset',
            )}
          >
            <span className="tabular text-xl leading-7 font-semibold text-ink">
              {counts[status]}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted md:text-13">
              <span
                className={cn(
                  'inline-flex size-4 items-center justify-center rounded-full',
                  TONE_CLASSES[meta.tone],
                )}
              >
                <meta.Icon aria-hidden="true" className="size-3" />
              </span>
              {meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
