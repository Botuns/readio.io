import { env } from '@/api/env';
import { readStorage, writeStorage } from './storage';

export const DATA_SOURCES = ['live', 'mock'] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

const STORAGE_KEY = 'readie:data-source';

function isDataSource(value: string | null): value is DataSource {
  return DATA_SOURCES.some((source) => source === value);
}

/** The reviewer's saved choice, falling back to the build-time default. */
export function getDataSource(): DataSource {
  const saved = readStorage(STORAGE_KEY);
  return isDataSource(saved) ? saved : env.VITE_DATA_SOURCE;
}

/** Saves the choice and reloads, so the service worker starts or stops cleanly. */
export function switchDataSource(source: DataSource): void {
  writeStorage(STORAGE_KEY, source);
  window.location.reload();
}
