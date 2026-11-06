import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, SlidersHorizontal, X } from 'lucide-react';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import type { JobSort } from '@/domain/jobs';

interface JobsToolbarProps {
  searchRef: RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (query: string) => void;
  sort: JobSort;
  onToggleSort: () => void;
  /** Number of filters applied beyond the default, shown on the mobile button. */
  activeFilterCount: number;
  onOpenFilters: () => void;
}

/** Email search (sticky and full width on mobile) plus sort and filter controls. */
export function JobsToolbar({
  searchRef,
  query,
  onQueryChange,
  sort,
  onToggleSort,
  activeFilterCount,
  onOpenFilters,
}: JobsToolbarProps) {
  const newestFirst = sort === 'submitted_desc';
  const SortIcon = newestFirst ? ArrowDownWideNarrow : ArrowUpNarrowWide;

  return (
    <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-line bg-canvas px-4 py-2.5 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
      <div className="relative flex-1 md:max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        />
        <input
          ref={searchRef}
          type="search"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by email"
          aria-label="Search candidates by email"
          aria-keyshortcuts="/"
          className="h-11 w-full rounded-control border border-line-strong bg-surface pr-10 pl-9 text-base text-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)] transition-colors duration-150 placeholder:text-muted hover:border-muted focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent/30 md:h-9 md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {query === '' ? (
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded border border-line bg-sunken px-1 font-mono text-2xs text-muted md:inline-flex">
            /
          </kbd>
        ) : (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onQueryChange('');
              searchRef.current?.focus();
            }}
            className="absolute top-1/2 right-0 inline-flex size-11 -translate-y-1/2 items-center justify-center text-muted hover:text-ink md:right-1 md:size-7"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <Button
        onClick={onToggleSort}
        className="hidden md:inline-flex"
        aria-label={`Sorted by submission time, ${newestFirst ? 'newest' : 'oldest'} first. Change order.`}
      >
        <SortIcon aria-hidden="true" className="size-4 text-muted" />
        {newestFirst ? 'Newest first' : 'Oldest first'}
      </Button>

      <Button size="lg" onClick={onOpenFilters} className="md:hidden" aria-haspopup="dialog">
        <SlidersHorizontal aria-hidden="true" className="size-4 text-muted" />
        Filters
        {activeFilterCount > 0 && (
          <span className="tabular inline-flex size-5 items-center justify-center rounded-full bg-accent text-2xs font-semibold text-white dark:text-canvas">
            {activeFilterCount}
          </span>
        )}
      </Button>
    </div>
  );
}
