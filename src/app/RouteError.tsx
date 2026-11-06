import { Bug } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

function describe(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

/** Last-resort boundary for render and chunk-load failures. */
export function RouteError() {
  const error = useRouteError();
  return (
    <div className="mx-auto w-full max-w-6xl safe-x py-10">
      <div role="alert" className="rounded-card border border-line bg-surface">
        <EmptyState
          Icon={Bug}
          tone="danger"
          title="Something went wrong"
          description="The page hit an unexpected error. Reloading usually fixes it."
          action={
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload the page
            </Button>
          }
        />
        <p className="border-t border-line px-4 py-3 font-mono text-xs break-all text-muted">
          {describe(error)}
        </p>
      </div>
    </div>
  );
}
