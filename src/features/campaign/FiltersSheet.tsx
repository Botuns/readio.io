import { Drawer } from 'vaul';
import { Button } from '@/components/ui/Button';
import { JOB_SORTS, type JobSort, type StatusCounts } from '@/domain/jobs';
import { VERIFICATION_STATUSES, type VerificationStatus } from '@/domain/types';
import { cn } from '@/lib/cn';
import { pluralise } from '@/lib/format';
import { verificationMeta } from '@/lib/statusMeta';

const SORT_LABELS: Record<JobSort, string> = {
  submitted_desc: 'Newest first',
  submitted_asc: 'Oldest first',
};

interface ChipProps {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

function Chip({ selected, onSelect, children }: ChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'btn btn-lg btn-secondary justify-start gap-2',
        selected && 'text-accent ring-2 ring-accent ring-inset',
      )}
    >
      {children}
    </button>
  );
}

interface FiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: StatusCounts;
  total: number;
  resultCount: number;
  status: VerificationStatus | undefined;
  onStatusChange: (status: VerificationStatus | undefined) => void;
  sort: JobSort;
  onSortChange: (sort: JobSort) => void;
  onClear: () => void;
}

/** Mobile filters and sort in a bottom sheet with thumb-sized chips. */
export function FiltersSheet({
  open,
  onOpenChange,
  counts,
  total,
  resultCount,
  status,
  onStatusChange,
  sort,
  onSortChange,
  onClear,
}: FiltersSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/40 dark:bg-canvas/70" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-sheet bg-surface shadow-overlay outline-none">
          <div
            aria-hidden="true"
            className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-line-strong"
          />
          <div className="overflow-y-auto overscroll-contain px-4 pt-3 safe-bottom">
            <Drawer.Title className="text-base font-semibold text-ink">
              Filter and sort
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Filter candidates by verification status and choose the sort order.
            </Drawer.Description>

            <div role="radiogroup" aria-label="Verification status" className="mt-4">
              <p className="eyebrow mb-2">Verification status</p>
              <div className="grid grid-cols-2 gap-2">
                <Chip selected={status === undefined} onSelect={() => onStatusChange(undefined)}>
                  All <span className="tabular text-muted">{total}</span>
                </Chip>
                {VERIFICATION_STATUSES.map((option) => {
                  const meta = verificationMeta(option);
                  return (
                    <Chip
                      key={option}
                      selected={status === option}
                      onSelect={() => onStatusChange(option)}
                    >
                      <meta.Icon aria-hidden="true" className="size-4" />
                      {meta.label} <span className="tabular text-muted">{counts[option]}</span>
                    </Chip>
                  );
                })}
              </div>
            </div>

            <div role="radiogroup" aria-label="Sort by submission time" className="mt-5">
              <p className="eyebrow mb-2">Sort by submission time</p>
              <div className="grid grid-cols-2 gap-2">
                {JOB_SORTS.map((option) => (
                  <Chip
                    key={option}
                    selected={sort === option}
                    onSelect={() => onSortChange(option)}
                  >
                    {SORT_LABELS[option]}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="ghost" size="lg" onClick={onClear}>
                Clear
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Show {pluralise(resultCount, 'candidate')}
              </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
