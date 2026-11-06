import { FlaskConicalOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { switchDataSource } from '@/lib/dataSource';

interface StartupErrorProps {
  error: unknown;
}

/**
 * Shown when mock mode was requested but the mock layer could not start. The
 * app does not quietly fall back to live data, because the reviewer would
 * then be looking at something other than what the label says.
 */
export function StartupError({ error }: StartupErrorProps) {
  return (
    <div className="mx-auto w-full max-w-2xl safe-x py-16">
      <div role="alert" className="rounded-card border border-line bg-surface">
        <EmptyState
          Icon={FlaskConicalOff}
          tone="danger"
          title="Mock data could not start"
          description="The service worker that serves the offline fixtures failed to start. Service workers need a secure context: localhost or HTTPS."
          action={
            <>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Reload
              </Button>
              <Button onClick={() => switchDataSource('live')}>Use the live API</Button>
            </>
          }
        />
        <p className="border-t border-line px-4 py-3 font-mono text-xs break-all text-muted">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    </div>
  );
}
