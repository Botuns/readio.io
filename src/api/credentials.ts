import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { readStorage, writeStorage } from '@/lib/storage';
import { env } from './env';

/**
 * Where the API credentials come from.
 *
 * 1. The sign-in dialog. Values are kept in this browser only: in session
 *    storage by default, or in local storage when "Stay signed in" is ticked.
 * 2. Build-time env values, for local development with `.env.local`.
 *
 * A public deployment ships with neither, so no credential is ever in its
 * bundle; the auditor signs in at run time instead.
 */

const STORAGE_KEY = 'readie:credentials';
const BASIC_PREFIX = /^basic\s+/i;

const storedSchema = z.object({
  username: z.string().nullable(),
  basicAuth: z.string().min(1),
  customAuth: z.string().min(1),
});

export interface ApiCredentials {
  /** Shown as "Signed in as …". Null when it cannot be read from the token. */
  username: string | null;
  /** Base64 part of the `Authorization: Basic` header. */
  basicAuth: string;
  /** Value of the `MyAuthorizationx` header. */
  customAuth: string;
  origin: 'signed_in' | 'environment';
}

export type CredentialInput = Pick<ApiCredentials, 'basicAuth' | 'customAuth'>;

/** Base64 of `username:password`, safe for non-ASCII characters. */
export function encodeBasicAuth(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  return btoa(String.fromCharCode(...bytes));
}

/** Accepts a token pasted with or without its `Basic ` prefix. */
export function normaliseBasicToken(token: string): string {
  return token.trim().replace(BASIC_PREFIX, '').replace(/\s+/g, '');
}

/** The username inside a Basic token, or null when the token is not readable. */
export function usernameFromBasicAuth(basicAuth: string): string | null {
  try {
    const bytes = Uint8Array.from(atob(basicAuth), (character) => character.charCodeAt(0));
    const [username] = new TextDecoder().decode(bytes).split(':');
    return username === undefined || username === '' ? null : username;
  } catch {
    return null;
  }
}

const ENVIRONMENT_CREDENTIALS: ApiCredentials | null =
  env.VITE_API_BASIC_AUTH !== '' && env.VITE_API_CUSTOM_AUTH !== ''
    ? {
        username: usernameFromBasicAuth(env.VITE_API_BASIC_AUTH),
        basicAuth: env.VITE_API_BASIC_AUTH,
        customAuth: env.VITE_API_CUSTOM_AUTH,
        origin: 'environment',
      }
    : null;

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: ApiCredentials | null } | undefined;

function readStored(): string | null {
  return readStorage(STORAGE_KEY, 'session') ?? readStorage(STORAGE_KEY, 'local');
}

function parseStored(raw: string): ApiCredentials | null {
  try {
    const json: unknown = JSON.parse(raw);
    const parsed = storedSchema.safeParse(json);
    return parsed.success ? { ...parsed.data, origin: 'signed_in' } : null;
  } catch {
    return null;
  }
}

/** Signed-in credentials win over build-time ones. Null means "not signed in". */
export function getCredentials(): ApiCredentials | null {
  const raw = readStored();
  if (cache?.raw === raw) return cache.value;
  const value = (raw === null ? null : parseStored(raw)) ?? ENVIRONMENT_CREDENTIALS;
  cache = { raw, value };
  return value;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function saveCredentials(input: CredentialInput, remember: boolean): void {
  const stored = JSON.stringify({
    username: usernameFromBasicAuth(input.basicAuth),
    basicAuth: input.basicAuth,
    customAuth: input.customAuth,
  });
  writeStorage(STORAGE_KEY, remember ? null : stored, 'session');
  writeStorage(STORAGE_KEY, remember ? stored : null, 'local');
  notify();
}

/** Signs out. Build-time credentials, if any, apply again afterwards. */
export function clearCredentials(): void {
  writeStorage(STORAGE_KEY, null, 'session');
  writeStorage(STORAGE_KEY, null, 'local');
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCredentials(): ApiCredentials | null {
  return useSyncExternalStore(subscribe, getCredentials);
}
