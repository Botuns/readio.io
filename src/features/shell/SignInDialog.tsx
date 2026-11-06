import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, LoaderCircle, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { apiGet } from '@/api/client';
import {
  encodeBasicAuth,
  normaliseBasicToken,
  saveCredentials,
  type CredentialInput,
} from '@/api/credentials';
import type { ApiError } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { assertNever } from '@/domain/assertNever';
import { getDataSource, switchDataSource } from '@/lib/dataSource';
import { apiPaths, DEFAULT_CAMPAIGN_ID } from '@/lib/routes';
import { closeSignIn, useSignInOpen } from '@/lib/signIn';

const INPUT_CLASS =
  'h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)] transition-colors duration-150 placeholder:text-muted hover:border-muted focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent/30 md:text-sm';

type Mode = 'password' | 'token';

/** Why a credential check failed, in words; null when the pair was accepted. */
function describeRejection(error: ApiError): string | null {
  switch (error.kind) {
    case 'unauthorized':
      return 'The API rejected these credentials. Check the username, password and access key, then try again.';
    case 'http':
      return `The API could not check these credentials (${error.status}). The access key is the usual cause.`;
    case 'network':
      return error.offline
        ? 'You are offline. Reconnect, then try again.'
        : 'Could not reach the API to check these credentials. Try again.';
    case 'timeout':
      return 'The API took too long to answer. Try again.';
    case 'not_found':
    case 'parse':
      // The API answered and did not refuse the credentials.
      return null;
    default:
      return assertNever(error);
  }
}

function SignInForm() {
  const queryClient = useQueryClient();
  const id = useId();
  const switching = getDataSource() !== 'live';

  const [mode, setMode] = useState<Mode>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [remember, setRemember] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const readCredentials = (): CredentialInput | string => {
    if (mode === 'password' && (username.trim() === '' || password === '')) {
      return 'Enter your username and password.';
    }
    if (mode === 'token' && normaliseBasicToken(token) === '') return 'Enter the Basic token.';
    if (accessKey.trim() === '') return 'Enter the access key.';
    return {
      basicAuth:
        mode === 'password'
          ? encodeBasicAuth(username.trim(), password)
          : normaliseBasicToken(token),
      customAuth: accessKey.trim(),
    };
  };

  const submit = async () => {
    const credentials = readCredentials();
    if (typeof credentials === 'string') {
      setProblem(credentials);
      return;
    }

    if (switching) {
      // Mock mode answers every request from fixtures, so the pair cannot be
      // checked here. Live mode reports a rejected pair after the reload.
      saveCredentials(credentials, remember);
      switchDataSource('live');
      return;
    }

    setProblem(null);
    setChecking(true);
    const result = await apiGet({
      path: apiPaths.campaignJobs(DEFAULT_CAMPAIGN_ID),
      schema: z.unknown(),
      credentials,
    });
    setChecking(false);

    const rejection = result.ok ? null : describeRejection(result.error);
    if (rejection !== null) {
      setProblem(rejection);
      return;
    }
    saveCredentials(credentials, remember);
    closeSignIn();
    toast.success('Signed in');
    void queryClient.resetQueries();
  };

  const RevealIcon = revealed ? EyeOff : Eye;
  const secretLabel = mode === 'password' ? 'Password' : 'Basic token';

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className="mt-4 space-y-3.5"
    >
      {mode === 'password' && (
        <div>
          <label htmlFor={`${id}-username`} className="text-13 font-medium text-ink">
            Username
          </label>
          <input
            id={`${id}-username`}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={`${INPUT_CLASS} mt-1.5`}
          />
        </div>
      )}

      <div>
        <label htmlFor={`${id}-secret`} className="text-13 font-medium text-ink">
          {secretLabel}
        </label>
        <div className="relative mt-1.5">
          <input
            id={`${id}-secret`}
            name={mode === 'password' ? 'password' : 'token'}
            type={revealed ? 'text' : 'password'}
            autoComplete={mode === 'password' ? 'current-password' : 'off'}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={mode === 'password' ? password : token}
            onChange={(event) =>
              mode === 'password' ? setPassword(event.target.value) : setToken(event.target.value)
            }
            className={`${INPUT_CLASS} pr-12 font-mono`}
          />
          <button
            type="button"
            aria-label={
              revealed ? `Hide ${secretLabel.toLowerCase()}` : `Show ${secretLabel.toLowerCase()}`
            }
            aria-pressed={revealed}
            onClick={() => setRevealed((value) => !value)}
            className="absolute top-0 right-0 inline-flex size-11 items-center justify-center text-muted hover:text-ink"
          >
            <RevealIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'password' ? 'token' : 'password');
            setProblem(null);
          }}
          className="mt-1.5 inline-flex min-h-6 items-center text-13 font-medium text-accent underline-offset-2 hover:underline pointer-coarse:min-h-11"
        >
          {mode === 'password'
            ? 'Use a Basic token instead'
            : 'Use a username and password instead'}
        </button>
      </div>

      <div>
        <label htmlFor={`${id}-key`} className="text-13 font-medium text-ink">
          Access key
        </label>
        <input
          id={`${id}-key`}
          name="access-key"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={accessKey}
          onChange={(event) => setAccessKey(event.target.value)}
          aria-describedby={`${id}-key-hint`}
          className={`${INPUT_CLASS} mt-1.5 font-mono`}
        />
        <p id={`${id}-key-hint`} className="mt-1.5 text-xs text-muted">
          The value of the <code className="font-mono">MyAuthorizationx</code> header.
        </p>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="size-4 accent-(--accent)"
        />
        Stay signed in on this device
      </label>

      {problem !== null && (
        <p
          role="alert"
          className="rounded-control bg-danger-soft px-3 py-2.5 text-13 font-medium text-danger"
        >
          {problem}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Dialog.Close asChild>
          <Button variant="ghost" size="lg">
            Cancel
          </Button>
        </Dialog.Close>
        <Button type="submit" variant="accent" size="lg" className="flex-1" disabled={checking}>
          {checking && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {checking ? 'Checking' : switching ? 'Sign in and use live data' : 'Sign in'}
        </Button>
      </div>
    </form>
  );
}

/**
 * The portal's own sign-in. It replaces the browser's built-in password
 * prompt, which must never appear: requests are not sent without credentials,
 * and a rejected pair is reported here, inline.
 */
export function SignInDialog() {
  const open = useSignInOpen();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSignIn();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 dark:bg-canvas/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[92dvh] w-[min(25rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-sheet bg-surface p-5 shadow-overlay">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-ink">
                Sign in to the Readie API
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-13 text-pretty text-muted">
                Use the credentials from the hackathon brief. They stay in this browser.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" iconOnly aria-label="Close">
                <X aria-hidden="true" className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <SignInForm />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
