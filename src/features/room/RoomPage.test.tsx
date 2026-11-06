import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { campaignFixtures, roomFixtures } from '@/mocks/fixtures';
import { setScenario } from '@/mocks/scenarios';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/renderApp';

const SAMPLE = 'campaign_119interview~~stephtester1@readie.io~~a3953942a9f2';
const CANONICAL = '/jobs/room/campaign_119interview~~stephtester1%40readie.io~~a3953942a9f2';

function demoPath(emailPrefix: string, search = ''): string {
  const job = (campaignFixtures['900'] ?? []).find((item) =>
    item.candidateEmail.startsWith(emailPrefix),
  );
  if (job === undefined) throw new Error(`No demo room for ${emailPrefix}`);
  return `/jobs/room/${encodeURIComponent(job.roomName)}${search}`;
}

describe('room evaluation', () => {
  it('shows a skeleton while loading, then the room', async () => {
    server.use(
      http.get('*/roomsHACKATHON/:roomName', async () => {
        await delay(120);
        return HttpResponse.json(roomFixtures[SAMPLE]);
      }),
    );
    renderApp(CANONICAL);

    expect(await screen.findByText('Loading room evaluation')).toBeInTheDocument();
    expect(await screen.findByRole('tablist')).toBeInTheDocument();
    expect(screen.getByText('Loaded room evaluation')).toBeInTheDocument();
  });

  it('fills the header from the campaign list, because the room response has no candidate', async () => {
    renderApp(CANONICAL);
    expect(
      await screen.findByRole('heading', { name: 'Steph Tester', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(SAMPLE)).toBeInTheDocument();
    expect(await screen.findByText('Completed')).toBeInTheDocument();
    expect(await screen.findByText('Warning')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Campaign 119' })).toHaveAttribute(
      'href',
      '/jobs/campaign/119',
    );
    await waitFor(() =>
      expect(document.title).toBe('Room · stephtester1@readie.io · Readie Integrity Audit'),
    );
  });

  it.each([
    ['a raw @', '/jobs/room/campaign_119interview~~stephtester1@readie.io~~a3953942a9f2'],
    ['%40', CANONICAL],
    [
      'fully escaped',
      '/jobs/room/campaign_119interview%7E%7Estephtester1%40readie.io%7E%7Ea3953942a9f2',
    ],
  ])(
    'loads the same room from a URL with %s and settles on one canonical URL',
    async (_label, path) => {
      const { router } = renderApp(`${path}?tab=integrity`);
      expect(
        await screen.findByRole('heading', { name: 'Steph Tester', level: 1 }),
      ).toBeInTheDocument();
      await waitFor(() => expect(router.state.location.pathname).toBe(CANONICAL));
      expect(router.state.location.search).toBe('?tab=integrity');
      expect(router.state.location.pathname).not.toContain('%25');
    },
  );

  it('loads a real room name that contains a space', async () => {
    const { router } = renderApp('/jobs/room/campaign_119interview~~kofi.mensah 12@example.com');
    expect(
      await screen.findByText('campaign_119interview~~kofi.mensah 12@example.com'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('tablist')).toBeInTheDocument();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        '/jobs/room/campaign_119interview~~kofi.mensah%2012%40example.com',
      ),
    );
  });

  it('shows "Room not found" for an unknown room, distinct from a network error', async () => {
    renderApp('/jobs/room/campaign_119interview~~nobody%40example.com~~000000000000');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('heading', { name: 'Room not found' })).toBeInTheDocument();
    expect(within(alert).getByRole('link', { name: 'Back to campaign 119' })).toHaveAttribute(
      'href',
      '/jobs/campaign/119',
    );
    expect(within(alert).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('shows a retryable error when the request fails, and recovers', async () => {
    setScenario('offline');
    const user = userEvent.setup();
    renderApp(CANONICAL);

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByRole('heading', { name: 'Could not reach the Readie API' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Room not found' })).not.toBeInTheDocument();

    setScenario('default');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('tablist')).toBeInTheDocument();
  });

  it('falls back to the email from the room name when the campaign lookup fails', async () => {
    server.use(http.get('*/campaignHACKATHON/:id', () => HttpResponse.json({}, { status: 500 })));
    renderApp(CANONICAL);
    expect(
      await screen.findByRole('heading', { name: 'stephtester1@readie.io', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Candidate name could not be loaded/)).toBeInTheDocument();
    expect(await screen.findByRole('tablist')).toBeInTheDocument();
  });

  it('renders all three tabs and keeps the active tab in the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp(demoPath('warning'));

    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringContaining('Transcript'),
      expect.stringContaining('Identity'),
      expect.stringContaining('Integrity'),
    ]);
    expect(screen.getByRole('tab', { name: /Transcript/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(router.state.location.search).toBe('');

    await user.click(screen.getByRole('tab', { name: /Identity/ }));
    expect(router.state.location.search).toBe('?tab=identity');
    expect(
      await screen.findByRole('meter', { name: 'Biometric match confidence' }),
    ).toHaveAttribute('aria-valuenow', '64');

    await user.click(screen.getByRole('tab', { name: /Integrity/ }));
    expect(router.state.location.search).toBe('?tab=integrity');
    expect(
      await screen.findByRole('region', { name: 'Overall integrity status' }),
    ).toHaveTextContent('Warning');
  });

  it('moves between tabs with Back and Forward', async () => {
    const user = userEvent.setup();
    const { router } = renderApp(demoPath('warning'));
    await screen.findByRole('tablist');

    await user.click(screen.getByRole('tab', { name: /Identity/ }));
    await user.click(screen.getByRole('tab', { name: /Integrity/ }));

    await router.navigate(-1);
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Identity/ })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    await router.navigate(-1);
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Transcript/ })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    await router.navigate(1);
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Identity/ })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
  });

  it('switches tabs with the 1, 2 and 3 keys', async () => {
    const user = userEvent.setup();
    const { router } = renderApp(demoPath('warning'));
    await screen.findByRole('tablist');

    await user.keyboard('3');
    expect(router.state.location.search).toBe('?tab=integrity');
    await user.keyboard('1');
    expect(router.state.location.search).toBe('');
  });

  it('opens the tab named in a shared link and repairs an invalid one', async () => {
    const shared = renderApp(demoPath('failed', '?tab=integrity'));
    expect(await screen.findByRole('tab', { name: /Integrity/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    shared.unmount();

    const { router } = renderApp(demoPath('failed', '?tab=nonsense'));
    expect(await screen.findByRole('tab', { name: /Transcript/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('distinguishes interviewer and candidate entries, each with a speaker and timestamp', async () => {
    renderApp(demoPath('passed'));
    const firstSegment = await screen.findByRole('region', { name: 'Segment 1 transcript' });
    const entries = within(firstSegment).getAllByRole('listitem');
    expect(entries.length).toBeGreaterThan(10);
    for (const entry of entries) {
      expect(entry.textContent).toMatch(/^\d{2}:\d{2}(Interviewer|Candidate|Participant)/);
    }
    const interviewer = within(firstSegment).getAllByText('Interviewer')[0]?.closest('li');
    const candidate = within(firstSegment).getAllByText('Candidate')[0]?.closest('li');
    expect(interviewer?.className).not.toBe(candidate?.className);
  });

  it('searches inside the transcript', async () => {
    const user = userEvent.setup();
    renderApp(demoPath('passed'));
    await screen.findByRole('region', { name: 'Segment 1 transcript' });

    await user.type(screen.getByRole('searchbox', { name: 'Search the transcript' }), 'zzzz');
    expect(
      await screen.findByRole('heading', { name: 'Nothing in the transcript matches' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(await screen.findByRole('region', { name: 'Segment 1 transcript' })).toBeInTheDocument();
  });

  it('shows the integrity breakdown with a status tag and flagged frames', async () => {
    renderApp(demoPath('failed', '?tab=integrity'));
    const status = await screen.findByRole('region', { name: 'Overall integrity status' });
    expect(status).toHaveTextContent('Failed');
    expect(status).toHaveTextContent('Fail high risk');
    expect(screen.getByRole('heading', { name: 'Gaze tracking index' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Audio anomaly count' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Flagged frames' })).toHaveLength(2);
    // Listed once under flagged frames and once under the check that observed it.
    expect(
      screen.getAllByText(
        'A second device is held below the frame and referenced while answering.',
      ),
    ).toHaveLength(2);
    expect(
      screen.getByRole('meter', { name: 'Gaze tracking index, model confidence' }),
    ).toHaveAttribute('aria-valuenow', '88');
  });

  it('shows a positive empty state when nothing is flagged', async () => {
    renderApp(demoPath('passed', '?tab=integrity'));
    expect(
      await screen.findByRole('heading', { name: 'No integrity flags raised' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Overall integrity status' })).toHaveTextContent(
      'Passed',
    );
  });

  it('explains missing analysis instead of showing blank tabs', async () => {
    const first = renderApp(demoPath('recording-failed'));
    expect(await screen.findByRole('heading', { name: 'No transcript yet' })).toBeInTheDocument();
    expect(screen.getByText('Not yet analysed')).toBeInTheDocument();
    first.unmount();

    renderApp(demoPath('recording-failed', '?tab=integrity'));
    expect(await screen.findByRole('heading', { name: 'Not yet analysed' })).toBeInTheDocument();
  });

  it('says so when the API returned no identity result', async () => {
    renderApp(`${CANONICAL}?tab=identity`);
    expect(
      await screen.findByRole('heading', { name: 'No biometric comparison' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Liveness' })).toBeInTheDocument();
  });

  it('scopes the tabs to one segment and keeps the choice in the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp(demoPath('processing'));
    await screen.findByRole('tablist');

    await user.click(screen.getByRole('button', { name: /^Segment 3: not analysed/ }));
    expect(router.state.location.search).toMatch(/^\?segment=EG_DEMO\d+$/);
    expect(await screen.findByRole('heading', { name: 'No transcript yet' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All segments' }));
    expect(router.state.location.search).toBe('');
  });

  it('drops a segment id that does not belong to the room', async () => {
    const { router } = renderApp(demoPath('passed', '?segment=EG_NOPE'));
    await screen.findByRole('tablist');
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });
});
