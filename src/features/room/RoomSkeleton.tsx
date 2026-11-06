import { Skeleton } from '@/components/ui/Skeleton';

const ENTRIES = [0, 1, 2, 3, 4];

/** Mirrors the loaded room: segment strip, tab bar, then timeline entries. */
export function RoomSkeleton() {
  return (
    <div aria-busy="true">
      <div className="rounded-card border border-line bg-surface p-4">
        <Skeleton className="h-3.5 w-40" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Skeleton className="h-8 w-24 rounded-control" />
          {[0, 1, 2, 3, 4, 5].map((tick) => (
            <Skeleton key={tick} className="size-8 rounded-control" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-control md:w-96" />
      <div className="mt-4 space-y-2">
        {ENTRIES.map((entry) => (
          <div
            key={entry}
            className="grid grid-cols-[3.25rem_1fr] gap-x-3 rounded-control bg-surface px-3 py-3"
          >
            <Skeleton className="h-3.5 w-10" />
            <div>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-2 h-3.5 w-full" />
              <Skeleton className="mt-1.5 h-3.5 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
