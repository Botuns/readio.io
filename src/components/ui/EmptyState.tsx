import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { TONE_CLASSES, type Tone } from '@/lib/statusMeta';

interface EmptyStateProps {
  Icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** The next useful thing to do, usually a button or link. */
  action?: ReactNode;
  tone?: Tone;
  /** `compact` fits inside a card; `page` fills a content area. */
  size?: 'compact' | 'page';
  className?: string;
}

export function EmptyState({
  Icon,
  title,
  description,
  action,
  tone = 'neutral',
  size = 'page',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        size === 'page' ? 'px-6 py-14' : 'px-4 py-8',
        className,
      )}
    >
      <span
        className={cn(
          'mb-3 inline-flex size-10 items-center justify-center rounded-card',
          TONE_CLASSES[tone],
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description !== undefined && (
        <p className="mt-1 max-w-md text-sm text-pretty text-muted">{description}</p>
      )}
      {action !== undefined && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  );
}
