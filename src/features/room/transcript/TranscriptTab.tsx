import { MessagesSquare, Search, SearchX, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Highlight } from '@/components/ui/Highlight';
import {
  collapseTranscript,
  countTranscriptEntries,
  groupTranscript,
  searchTranscript,
  type TranscriptGroup,
} from '@/domain/room';
import type { RecordingSegment, Speaker, TranscriptEntry } from '@/domain/types';
import { cn } from '@/lib/cn';
import { formatShortDateTime, pluralise } from '@/lib/format';
import { segmentStateMeta, speakerMeta } from '@/lib/statusMeta';

/** Interviewer and candidate differ by glyph, label and surface, not colour alone. */
const SPEAKER_SURFACE: Record<Speaker, string> = {
  INTERVIEWER: 'bg-sunken',
  CANDIDATE: 'bg-accent-soft shadow-[inset_2px_0_0_var(--accent)]',
  PARTICIPANT: 'bg-surface shadow-[inset_0_0_0_1px_var(--line)]',
};

const SPEAKER_LABEL: Record<Speaker, string> = {
  INTERVIEWER: 'text-muted',
  CANDIDATE: 'text-accent',
  PARTICIPANT: 'text-muted',
};

function Entry({ entry, query }: { entry: TranscriptEntry; query: string }) {
  const meta = speakerMeta(entry.speaker);
  return (
    <li
      className={cn(
        'grid grid-cols-[2.75rem_1fr] gap-x-3 rounded-control px-3 py-2.5',
        SPEAKER_SURFACE[entry.speaker],
      )}
    >
      <span className="tabular pt-px font-mono text-xs text-muted">{entry.timestamp}</span>
      <div className="min-w-0">
        <p
          className={cn(
            'flex items-center gap-1.5 text-xs font-semibold',
            SPEAKER_LABEL[entry.speaker],
          )}
        >
          <meta.Icon aria-hidden="true" className="size-3.5 shrink-0" />
          {meta.label}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-pretty text-ink">
          <Highlight text={entry.text} query={query} />
        </p>
      </div>
    </li>
  );
}

function SegmentBlock({ group, query }: { group: TranscriptGroup; query: string }) {
  const { segment, entries } = group;
  return (
    <section aria-label={`Segment ${segment.index} transcript`}>
      <h3 className="flex flex-wrap items-baseline gap-x-2 px-1 text-13">
        <span className="font-semibold text-ink">Segment {segment.index}</span>
        <span className="tabular text-muted">
          {segment.startedAt !== null && `${formatShortDateTime(segment.startedAt)} · `}
          {pluralise(entries.length, 'entry', 'entries')}
        </span>
      </h3>
      {entries.length === 0 ? (
        <p className="mt-2 rounded-control border border-dashed border-line px-3 py-2.5 text-13 text-muted">
          No speech was transcribed in this segment.
        </p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {entries.map((entry) => (
            <Entry key={entry.id} entry={entry} query={query} />
          ))}
        </ol>
      )}
    </section>
  );
}

function GapBlock({ segments }: { segments: RecordingSegment[] }) {
  const first = segments[0];
  const last = segments.at(-1);
  if (first === undefined || last === undefined) return null;
  const range =
    first.index === last.index
      ? `Segment ${first.index}`
      : `Segments ${first.index} to ${last.index}`;
  const states = [
    ...new Set(segments.map((segment) => segmentStateMeta(segment.state).label.toLowerCase())),
  ];
  return (
    <p className="tabular rounded-control border border-dashed border-line px-3 py-2.5 text-13 text-muted">
      {range}: {states.join(', ')}. No transcript.
    </p>
  );
}

interface TranscriptTabProps {
  /** The segments in scope: the whole session or the one selected segment. */
  segments: RecordingSegment[];
}

export function TranscriptTab({ segments }: TranscriptTabProps) {
  const [query, setQuery] = useState('');
  const groups = groupTranscript(segments);
  const total = countTranscriptEntries(groups);

  if (total === 0) {
    const analysed = segments.some((segment) => segment.analysis !== null);
    return (
      <div className="rounded-card border border-line bg-surface">
        <EmptyState
          Icon={MessagesSquare}
          title={analysed ? 'No speech was transcribed' : 'No transcript yet'}
          description={
            analysed
              ? 'The analysis ran, but it found nothing spoken in this recording.'
              : `${segments.length === 1 ? 'This segment has' : `None of the ${segments.length} segments have`} been analysed, so there is no transcript to show. Transcripts appear once analysis completes.`
          }
        />
      </div>
    );
  }

  const searching = query.trim() !== '';
  const matches = searchTranscript(groups, query);
  const matchCount = countTranscriptEntries(matches);
  const blocks = collapseTranscript(searching ? matches : groups);

  return (
    <div className="max-w-3xl">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the transcript"
          aria-label="Search the transcript"
          autoComplete="off"
          className="h-11 w-full rounded-control border border-line-strong bg-surface pr-11 pl-9 text-base text-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)] placeholder:text-muted hover:border-muted focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent/30 md:h-9 md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {searching && (
          <button
            type="button"
            aria-label="Clear transcript search"
            onClick={() => setQuery('')}
            className="absolute top-1/2 right-0 inline-flex size-11 -translate-y-1/2 items-center justify-center text-muted hover:text-ink md:right-1 md:size-7"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <p aria-live="polite" className="tabular mt-2 text-13 text-muted">
        {searching
          ? `${pluralise(matchCount, 'entry', 'entries')} of ${total} match`
          : pluralise(total, 'entry', 'entries')}
      </p>

      {searching && matchCount === 0 ? (
        <div className="mt-3 rounded-card border border-line bg-surface">
          <EmptyState
            Icon={SearchX}
            size="compact"
            title="Nothing in the transcript matches"
            description={`No entry contains “${query.trim()}”.`}
            action={<Button onClick={() => setQuery('')}>Clear search</Button>}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {blocks.map((block) =>
            block.kind === 'segment' ? (
              <SegmentBlock key={block.group.segment.id} group={block.group} query={query} />
            ) : (
              <GapBlock key={`gap-${block.segments[0]?.id ?? 'none'}`} segments={block.segments} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
