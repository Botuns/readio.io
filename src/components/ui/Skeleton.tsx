import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

/** A shimmering placeholder. Size it with utility classes to match the real content. */
export function Skeleton({ className }: SkeletonProps) {
  return <span aria-hidden="true" className={cn('skeleton block', className)} />;
}
