import type { ReactNode } from 'react';

export interface ObservationItem {
  id: string;
  timestamp: string | null;
  text: string;
  /** Shown as "Segment n" when the list spans more than one segment. */
  segmentIndex?: number;
  /** A pill or label placed before the text. */
  badge?: ReactNode;
}

interface ObservationListProps {
  items: ObservationItem[];
  showSegment?: boolean;
}

/** Timestamped notes, one per line, with the clock position in a fixed column. */
export function ObservationList({ items, showSegment = false }: ObservationListProps) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="grid grid-cols-[3rem_1fr] gap-x-3 py-2.5 first:pt-0 last:pb-0">
          <span className="tabular pt-0.5 font-mono text-xs text-muted">
            {item.timestamp ?? '—'}
          </span>
          <div className="min-w-0">
            {(item.badge !== undefined || (showSegment && item.segmentIndex !== undefined)) && (
              <p className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                {item.badge}
                {showSegment && item.segmentIndex !== undefined && (
                  <span className="tabular">Segment {item.segmentIndex}</span>
                )}
              </p>
            )}
            <p className="text-sm text-pretty text-ink">{item.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
