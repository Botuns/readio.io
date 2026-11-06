import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  title: string;
  description?: ReactNode;
  /** Shown at the top right, usually a status pill. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A titled surface. Borders only: shadows are reserved for overlays. */
export function Card({ title, description, aside, children, className }: CardProps) {
  return (
    <section className={cn('rounded-card border border-line bg-surface', className)}>
      <header className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description !== undefined && (
            <p className="mt-0.5 text-13 text-pretty text-muted">{description}</p>
          )}
        </div>
        {aside}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
