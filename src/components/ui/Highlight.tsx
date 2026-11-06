interface HighlightProps {
  text: string;
  /** Substring to mark, matched case-insensitively. */
  query: string;
}

/** Renders `text` with every occurrence of `query` wrapped in `<mark>`. */
export function Highlight({ text, query }: HighlightProps) {
  const needle = query.trim().toLowerCase();
  if (needle === '') return text;

  const haystack = text.toLowerCase();
  const parts: { value: string; match: boolean; start: number }[] = [];
  let cursor = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    if (index > cursor)
      parts.push({ value: text.slice(cursor, index), match: false, start: cursor });
    parts.push({ value: text.slice(index, index + needle.length), match: true, start: index });
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push({ value: text.slice(cursor), match: false, start: cursor });

  return parts.map((part) =>
    part.match ? <mark key={part.start}>{part.value}</mark> : part.value,
  );
}
