import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearCredentials, encodeBasicAuth, getCredentials } from '@/api/credentials';
import { closeSignIn } from '@/lib/signIn';
import { campaignFixtures } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/renderApp';

// A deployment with no build-time credentials, defaulting to the live API.
vi.mock('@/api/env', () => ({
  env: {
    VITE_API_BASE_URL: 'http://localhost:3000/api/jobs',
    VITE_API_CUSTOM_AUTH: '',
    VITE_API_BASIC_AUTH: '',
    VITE_DATA_SOURCE: 'live',
  },
}));

const GOOD = { username: 'auditor', password: 's3cret', accessKey: 'KEY-1' };

/** Stands in for the real API: 401 with a Basic challenge unless the pair is right. */
function requireCredentials() {
  const seen: { authorization: string | null; accessKey: string | null }[] = [];
  server.use(
    http.get('*/campaignHACKATHON/:id', ({ request }) => {
      const authorization = request.headers.get('Authorization');
      const accessKey = request.headers.get('MyAuthorizationx');
      seen.push({ authorization, accessKey });
      const accepted =
        authorization === `Basic ${encodeBasicAuth(GOOD.username, GOOD.password)}` &&
        accessKey === GOOD.accessKey;
      return accepted
        ? HttpResponse.json(campaignFixtures['119'])
        : HttpResponse.json(
            { status: 401, error: 'Unauthorized' },
            { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Realm"' } },
          );
    }),
  );
  return seen;
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, password: string) {
  const dialog = await screen.findByRole('dialog', { name: 'Sign in to the Readie API' });
  await user.type(within(dialog).getByLabelText('Username'), GOOD.username);
  await user.type(within(dialog).getByLabelText('Password'), password);
  await user.type(within(dialog).getByLabelText('Access key'), GOOD.accessKey);
  await user.click(within(dialog).getByRole('button', { name: 'Sign in' }));
  return dialog;
}

afterEach(() => {
  clearCredentials();
  closeSignIn();
});

describe('sign-in', () => {
  it('opens the sign-in dialog in live mode and sends nothing until signed in', async () => {
    const seen = requireCredentials();
    renderApp('/jobs/campaign/119');

    expect(
      await screen.findByRole('dialog', { name: 'Sign in to the Readie API' }),
    ).toBeInTheDocument();
    expect(
      // The page behind a modal dialog is hidden from assistive technology.
      await screen.findByRole('heading', { name: 'Sign in to load live data', hidden: true }),
    ).toBeInTheDocument();
    expect(seen).toEqual([]);
  });

  it('signs in, sends the entered credentials as headers and loads the data', async () => {
    const seen = requireCredentials();
    const user = userEvent.setup();
    renderApp('/jobs/campaign/119');

    await fillAndSubmit(user, GOOD.password);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('table', { name: 'Candidates' })).toBeInTheDocument();
    expect(seen.at(-1)).toEqual({
      authorization: `Basic ${encodeBasicAuth(GOOD.username, GOOD.password)}`,
      accessKey: GOOD.accessKey,
    });
    expect(getCredentials()).toMatchObject({ username: 'auditor', origin: 'signed_in' });
    expect(window.localStorage.getItem('readie:credentials')).toBeNull();
  });

  it('reports rejected credentials inside the dialog and saves nothing', async () => {
    requireCredentials();
    const user = userEvent.setup();
    renderApp('/jobs/campaign/119');

    const dialog = await fillAndSubmit(user, 'wrong');

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The API rejected these credentials',
    );
    expect(dialog).toBeInTheDocument();
    expect(getCredentials()).toBeNull();
  });

  it('asks for every field before calling the API', async () => {
    const seen = requireCredentials();
    const user = userEvent.setup();
    renderApp('/jobs/campaign/119');

    const dialog = await screen.findByRole('dialog', { name: 'Sign in to the Readie API' });
    await user.click(within(dialog).getByRole('button', { name: 'Sign in' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Enter your username and password.',
    );

    await user.type(within(dialog).getByLabelText('Username'), GOOD.username);
    await user.type(within(dialog).getByLabelText('Password'), GOOD.password);
    await user.click(within(dialog).getByRole('button', { name: 'Sign in' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter the access key.');
    expect(seen).toEqual([]);
  });

  it('accepts a pasted Basic token in place of a username and password', async () => {
    requireCredentials();
    const user = userEvent.setup();
    renderApp('/jobs/campaign/119');

    const dialog = await screen.findByRole('dialog', { name: 'Sign in to the Readie API' });
    await user.click(within(dialog).getByRole('button', { name: 'Use a Basic token instead' }));
    await user.type(
      within(dialog).getByLabelText('Basic token'),
      `Basic ${encodeBasicAuth(GOOD.username, GOOD.password)}`,
    );
    await user.type(within(dialog).getByLabelText('Access key'), GOOD.accessKey);
    await user.click(within(dialog).getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('table', { name: 'Candidates' })).toBeInTheDocument();
    expect(getCredentials()?.username).toBe('auditor');
  });

  it('can be dismissed, leaving a way back in', async () => {
    requireCredentials();
    const user = userEvent.setup();
    renderApp('/jobs/campaign/119');

    const dialog = await screen.findByRole('dialog', { name: 'Sign in to the Readie API' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const panel = await screen.findByRole('alert');
    await user.click(within(panel).getByRole('button', { name: 'Sign in' }));
    expect(
      await screen.findByRole('dialog', { name: 'Sign in to the Readie API' }),
    ).toBeInTheDocument();
  });

  it('remembers the sign-in on this device when asked', async () => {
    requireCredentials();
    const user = userEvent.setup();
    renderApp('/jobs/campaign/119');

    const dialog = await screen.findByRole('dialog', { name: 'Sign in to the Readie API' });
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Stay signed in on this device' }),
    );
    await fillAndSubmit(user, GOOD.password);

    await waitFor(() => expect(window.localStorage.getItem('readie:credentials')).not.toBeNull());
    expect(window.sessionStorage.getItem('readie:credentials')).toBeNull();
  });
});
