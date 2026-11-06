import { useSyncExternalStore } from 'react';
import { readStorage, writeStorage } from './storage';

export type Theme = 'light' | 'dark';
type ThemePreference = Theme | 'system';

const STORAGE_KEY = 'readie:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const THEME_COLORS: Record<Theme, string> = { light: '#FAFAFB', dark: '#07070F' };

const listeners = new Set<() => void>();

function systemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function readPreference(): ThemePreference {
  const saved = readStorage(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

function resolveTheme(): Theme {
  const preference = readPreference();
  return preference === 'system' ? systemTheme() : preference;
}

function applyTheme(): void {
  const theme = resolveTheme();
  document.documentElement.dataset.theme = theme;
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', THEME_COLORS[theme]);
  }
  for (const notify of listeners) notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', applyTheme);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', applyTheme);
  };
}

/**
 * Follows the system theme until the user toggles. Toggling back to whatever
 * the system currently uses clears the override, so the app follows the system
 * again from then on.
 */
export function toggleTheme(): void {
  const next: Theme = resolveTheme() === 'dark' ? 'light' : 'dark';
  writeStorage(STORAGE_KEY, next === systemTheme() ? null : next);
  applyTheme();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, resolveTheme);
}
