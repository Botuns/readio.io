/** Web storage can throw (private mode, blocked site data), so every access is guarded. */

type StorageKind = 'local' | 'session';

function storageFor(kind: StorageKind): Storage {
  return kind === 'local' ? window.localStorage : window.sessionStorage;
}

export function readStorage(key: string, kind: StorageKind = 'local'): string | null {
  try {
    return storageFor(kind).getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null, kind: StorageKind = 'local'): void {
  try {
    if (value === null) storageFor(kind).removeItem(key);
    else storageFor(kind).setItem(key, value);
  } catch {
    // Persisting is a convenience; the app works without it.
  }
}
