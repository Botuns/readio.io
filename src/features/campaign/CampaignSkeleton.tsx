import { Skeleton } from '@/components/ui/Skeleton';

const ROWS = [0, 1, 2, 3, 4];

/** Mirrors the loaded layout: three count tiles, the toolbar, then rows. */
export function CampaignSkeleton() {
  return (
    <div aria-busy="true">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {[0, 1, 2].map((tile) => (
          <div
            key={tile}
            className="min-h-16 rounded-card border border-line bg-surface px-3 py-2.5 md:px-4 md:py-3"
          >
            <Skeleton className="h-6 w-8" />
            <Skeleton className="mt-2 h-3.5 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2 py-2.5 md:py-0">
        <Skeleton className="h-11 flex-1 rounded-control md:h-9 md:max-w-sm" />
        <Skeleton className="h-11 w-24 rounded-control md:h-9 md:w-32" />
      </div>
      <div className="mt-4 rounded-card border border-line bg-surface">
        <div className="hidden h-10 rounded-t-card border-b border-line bg-sunken md:block" />
        {ROWS.map((row) => (
          <div
            key={row}
            className="border-b border-line px-4 py-3 last:border-b-0 md:flex md:h-13 md:items-center md:gap-4 md:py-0"
          >
            <div className="flex items-center justify-between gap-3 md:w-1/5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-24 md:hidden" />
            </div>
            <Skeleton className="mt-2 h-3.5 w-48 md:mt-0 md:w-1/4" />
            <Skeleton className="mt-2 h-3.5 w-56 md:mt-0 md:w-1/4" />
            <Skeleton className="hidden h-3.5 w-20 md:block" />
            <Skeleton className="hidden h-6 w-24 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
