import { Hint } from '@/components/ui/Hint';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { useNow } from '@/lib/useNow';

interface SubmittedTimeProps {
  timestamp: number | null;
  className?: string;
}

/** Relative time with the absolute time in a tooltip and in the accessible name. */
export function SubmittedTime({ timestamp, className }: SubmittedTimeProps) {
  const now = useNow();
  if (timestamp === null) {
    return <span className={cn('text-muted', className)}>No timestamp</span>;
  }
  const absolute = formatDateTime(timestamp);
  return (
    <Hint label={absolute}>
      <time
        dateTime={new Date(timestamp).toISOString()}
        aria-label={`${formatRelativeTime(timestamp, now)}, ${absolute}`}
        className={cn('tabular relative z-10 cursor-default', className)}
      >
        {formatRelativeTime(timestamp, now)}
      </time>
    </Hint>
  );
}
