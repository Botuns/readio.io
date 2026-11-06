import { Skeleton } from '@/components/ui/Skeleton';

/** Shown while a route's code chunk loads. */
export function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl safe-x py-6" aria-busy="true">
      <p className="sr-only" aria-live="polite">
        Loading page
      </p>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-64" />
      <Skeleton className="mt-8 h-64 w-full rounded-card" />
    </div>
  );
}
