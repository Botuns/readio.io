import { afterEach, describe, expect, it } from 'vitest';
import {
  clearCredentials,
  encodeBasicAuth,
  getCredentials,
  normaliseBasicToken,
  saveCredentials,
  usernameFromBasicAuth,
} from './credentials';

afterEach(() => {
  clearCredentials();
});

describe('Basic auth helpers', () => {
  it('encodes a username and password the way the Authorization header expects', () => {
    expect(encodeBasicAuth('auditor', 's3cret')).toBe('YXVkaXRvcjpzM2NyZXQ=');
  });

  it('round-trips non-ASCII characters', () => {
    const token = encodeBasicAuth('zoë', 'pässwörd');
    expect(usernameFromBasicAuth(token)).toBe('zoë');
  });

  it('keeps colons that are part of the password', () => {
    expect(usernameFromBasicAuth(encodeBasicAuth('auditor', 'a:b:c'))).toBe('auditor');
  });

  it.each([
    ['YXVkaXRvcjpzM2NyZXQ=', 'YXVkaXRvcjpzM2NyZXQ='],
    ['Basic YXVkaXRvcjpzM2NyZXQ=', 'YXVkaXRvcjpzM2NyZXQ='],
    ['  basic   YXVkaXRv\ncjpzM2NyZXQ=  ', 'YXVkaXRvcjpzM2NyZXQ='],
  ])('normalises a pasted token %j', (pasted, expected) => {
    expect(normaliseBasicToken(pasted)).toBe(expected);
  });

  it.each(['', 'not base64!!', btoa(':no-username')])('finds no username in %j', (token) => {
    expect(usernameFromBasicAuth(token)).toBeNull();
  });
});

describe('credential storage', () => {
  const input = { basicAuth: encodeBasicAuth('auditor', 's3cret'), customAuth: 'KEY-1' };

  it('falls back to the build-time credentials when nobody is signed in', () => {
    expect(getCredentials()).toMatchObject({
      origin: 'environment',
      customAuth: 'test-custom-auth',
    });
  });

  it('prefers signed-in credentials and records the username', () => {
    saveCredentials(input, false);
    expect(getCredentials()).toEqual({ ...input, username: 'auditor', origin: 'signed_in' });
  });

  it('keeps a session sign-in out of local storage, and a remembered one in it', () => {
    saveCredentials(input, false);
    expect(window.sessionStorage.getItem('readie:credentials')).not.toBeNull();
    expect(window.localStorage.getItem('readie:credentials')).toBeNull();

    saveCredentials(input, true);
    expect(window.sessionStorage.getItem('readie:credentials')).toBeNull();
    expect(window.localStorage.getItem('readie:credentials')).not.toBeNull();
  });

  it('signs out', () => {
    saveCredentials(input, true);
    clearCredentials();
    expect(getCredentials()?.origin).toBe('environment');
  });

  it('ignores a corrupted stored value', () => {
    window.sessionStorage.setItem('readie:credentials', '{"basicAuth":42');
    expect(getCredentials()?.origin).toBe('environment');
  });

  it('returns a stable object while nothing changes', () => {
    saveCredentials(input, false);
    expect(getCredentials()).toBe(getCredentials());
  });
});
