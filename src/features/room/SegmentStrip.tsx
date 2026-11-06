import { Hint } from '@/components/ui/Hint';
import { countSegments } from '@/domain/room';
import { SEGMENT_STATES, type RecordingSegment } from '@/domain/types';
import { cn } from '@/lib/cn';
import { formatShortDateTime, pluralise } from '@/lib/format';
import { segmentStateMeta, TONE_CLASSES } from '@/lib/statusMeta';

interface SegmentStripProps {
  segments: RecordingSegment[];
  selectedId: string | undefined;
  /** Called with a segment id, or undefined for the whole session. */
  onSelect: (segmentId: string | undefined) => void;
}

function describe(segment: RecordingSegment): string {
  const state = segmentStateMeta(segment.state).label;
  const started =
    segment.startedAt === null
      ? 'start time unknown'
      : `started ${formatShortDateTime(segment.startedAt)}`;
  return `Segment ${segment.index}: ${state.toLowerCase()}, ${started}`;
}

/**
 * A room is recorded in segments and each is analysed separately. The strip
 * shows every segment's state and scopes all three tabs to one segment.
 */
export function SegmentStrip({ segments, selectedId, onSelect }: SegmentStripProps) {
  const counts = countSegments(segments);

  return (
    <section
      aria-labelledby="segments-heading"
      className="rounded-card border border-line bg-surface p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="segments-heading" className="eyebrow">
          Recording segments
        </h2>
        <p className="tabular text-13 text-muted">
          {counts.ANALYSED} of {pluralise(counts.total, 'segment')} analysed
        </p>
      </div>

      <div role="group" aria-label="Show results for" className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={selectedId === undefined}
          onClick={() => onSelect(undefined)}
          className="btn btn-sm btn-secondary"
        >
          <span className="btn-content">All segments</span>
        </button>
        {segments.map((segment) => {
          const meta = segmentStateMeta(segment.state);
          const pressed = selectedId === segment.id;
          return (
            <Hint key={segment.id} label={describe(segment)}>
              <button
                type="button"
                aria-pressed={pressed}
                aria-label={describe(segment)}
                onClick={() => onSelect(pressed ? undefined : segment.id)}
                className={cn(
                  'tabular relative inline-flex h-8 min-w-8 items-center justify-center rounded-control px-1.5 text-13 font-medium transition-shadow duration-150 pointer-coarse:h-11 pointer-coarse:min-w-11',
                  TONE_CLASSES[meta.tone],
                  pressed
                    ? 'shadow-[inset_0_2px_1px_rgb(0_0_0/0.18)] ring-2 ring-accent'
                    : 'shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] hover:ring-1 hover:ring-line-strong',
                )}
              >
                {segment.index}
              </button>
            </Hint>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {SEGMENT_STATES.filter((state) => counts[state] > 0).map((state) => {
          const meta = segmentStateMeta(state);
          return (
            <li key={state} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex size-4 items-center justify-center rounded',
                  TONE_CLASSES[meta.tone],
                )}
              >
                <meta.Icon aria-hidden="true" className="size-3" />
              </span>
              <span className="tabular">
                {meta.label} {counts[state]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
