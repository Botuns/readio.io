import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { z } from 'zod';

type ParamRecord = Record<string, string | undefined>;

export interface SearchParamsDefinition<T extends ParamRecord> {
  /**
   * Parses the raw params. Every field must carry a `.catch()` so an invalid
   * value falls back to its default instead of throwing.
   */
  schema: z.ZodType<T>;
  keys: readonly (keyof T & string)[];
  /** Values equal to their default are left out of the URL. */
  defaults: Partial<T>;
}

interface UpdateOptions {
  /** `true` replaces the history entry (filters, search); `false` pushes (tabs). */
  replace: boolean;
}

export type SearchParamsUpdater<T extends ParamRecord> = (
  patch: Partial<T>,
  options: UpdateOptions,
) => void;

function canonicalValue<T extends ParamRecord>(
  definition: SearchParamsDefinition<T>,
  state: T,
  key: keyof T & string,
): string | null {
  const value = state[key];
  if (value === undefined || value === '' || value === definition.defaults[key]) return null;
  return value;
}

/**
 * URL search params as typed, validated state.
 *
 * Reading: values are parsed with Zod, so the rest of the app sees literal
 * unions rather than strings. Writing: defaults are omitted, unknown params
 * (for example `scenario`) are preserved. If the URL holds an invalid or
 * redundant value, it is rewritten in place with a `replace` navigation so a
 * shared link always shows the canonical form.
 */
export function useTypedSearchParams<T extends ParamRecord>(
  definition: SearchParamsDefinition<T>,
): [T, SearchParamsUpdater<T>] {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const raw: ParamRecord = {};
    for (const key of definition.keys) raw[key] = searchParams.get(key) ?? undefined;
    return definition.schema.parse(raw);
  }, [definition, searchParams]);

  const update = useCallback<SearchParamsUpdater<T>>(
    (patch, { replace }) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const key of definition.keys) {
            if (!(key in patch)) continue;
            const value = patch[key];
            if (value === undefined || value === '' || value === definition.defaults[key]) {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          }
          return next;
        },
        { replace, preventScrollReset: true },
      );
    },
    [definition, setSearchParams],
  );

  useEffect(() => {
    const stale = definition.keys.some(
      (key) => searchParams.get(key) !== canonicalValue(definition, state, key),
    );
    if (!stale) return;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const key of definition.keys) {
          const value = canonicalValue(definition, state, key);
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }, [definition, searchParams, setSearchParams, state]);

  return [state, update];
}
