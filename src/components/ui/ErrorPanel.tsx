import {
  FileQuestion,
  Lock,
  RefreshCw,
  SearchX,
  ServerCrash,
  TimerOff,
  WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApiError } from '@/api/errors';
import { assertNever } from '@/domain/assertNever';
import { describeError, technicalDetail } from '@/lib/errorCopy';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

function iconFor(error: ApiError): LucideIcon {
  switch (error.kind) {
    case 'network':
      return WifiOff;
    case 'timeout':
      return TimerOff;
    case 'http':
      return ServerCrash;
    case 'unauthorized':
      return Lock;
    case 'not_found':
      return SearchX;
    case 'parse':
      return FileQuestion;
    default:
      return assertNever(error);
  }
}

interface ErrorPanelProps {
  error: ApiError;
  /** What was being loaded, for example "campaign 119". */
  subject: string;
  onRetry: () => void;
  isRetrying: boolean;
  /** Replaces the default title and description (used for "Room not found"). */
  title?: string;
  description?: ReactNode;
  /** Extra actions shown next to Retry, such as a link back. */
  actions?: ReactNode;
}

/** The designed error state: plain-language copy, a way forward, and the technical detail. */
export function ErrorPanel({
  error,
  subject,
  onRetry,
  isRetrying,
  title,
  description,
  actions,
}: ErrorPanelProps) {
  const copy = describeError(error, subject);

  return (
    <div role="alert" className="rounded-card border border-line bg-surface">
      <EmptyState
        Icon={iconFor(error)}
        tone={error.kind === 'not_found' ? 'neutral' : 'danger'}
        title={title ?? copy.title}
        description={description ?? copy.description}
        action={
          <>
            {copy.canRetry && (
              <Button variant="primary" onClick={onRetry} disabled={isRetrying}>
                <RefreshCw
                  aria-hidden="true"
                  className={isRetrying ? 'size-4 animate-spin' : 'size-4'}
                />
                {isRetrying ? 'Retrying' : 'Try again'}
              </Button>
            )}
            {actions}
          </>
        }
      />
      <details className="group border-t border-line px-4 py-3 text-13">
        <summary className="cursor-pointer list-none font-medium text-muted select-none hover:text-ink">
          <span className="group-open:hidden">Show technical detail</span>
          <span className="hidden group-open:inline">Hide technical detail</span>
        </summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {technicalDetail(error).map(([term, value]) => (
            <div key={term} className="col-span-2 grid grid-cols-subgrid">
              <dt className="text-muted">{term}</dt>
              <dd className="font-mono text-xs break-all text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
