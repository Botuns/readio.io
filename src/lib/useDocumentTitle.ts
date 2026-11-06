import { useEffect } from 'react';

const SUFFIX = 'Readie Integrity Audit';

/** Sets the tab title, for example "Room · stephtester1@readie.io". */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    document.title = title === null ? SUFFIX : `${title} · ${SUFFIX}`;
  }, [title]);
}
