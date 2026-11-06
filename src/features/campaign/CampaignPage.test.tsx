import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { campaignFixtures } from '@/mocks/fixtures';
import { setScenario } from '@/mocks/scenarios';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/renderApp';
import { viewport } from '@/test/setup';

const SAMPLE_PATH = '/jobs/room/campaign_119interview~~stephtester1%40readie.io~~a3953942a9f2';

async function findRows() {
  const table = await screen.findByRole('table', { name: 'Candidates' });
  return within(table).getAllByRole('row').slice(1);
}

describe('campaign overview', () => {
  it('redirects / to the default campaign', async () => {
    const { router } = renderApp('/');
    await screen.findByRole('heading', { name: 'Campaign 119' });
    expect(router.state.location.pathname).toBe('/jobs/campaign/119');
  });

  it('shows a skeleton while loading, then the candidates', async () => {
    server.use(
      http.get('*/campaignHACKATHON/:id', async () => {
        await delay(120);
        return HttpResponse.json(campaignFixtures['119']);
      }),
    );
    renderApp('/jobs/campaign/119');

    expect(await screen.findByText('Loading campaign 119 candidates')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    expect(await findRows()).toHaveLength(4);
    expect(screen.getByText('Loaded campaign 119 candidates')).toBeInTheDocument();
  });

  it('renders every required column', async () => {
    renderApp('/jobs/campaign/119');
    const table = await screen.findByRole('table', { name: 'Candidates' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Candidate name',
      'Email',
      'Room identifier',
      expect.stringContaining('Submitted'),
      'Verification status',
    ]);
    const row = within(table).getByRole('row', { name: /Steph Tester/ });
    expect(within(row).getByText('stephtester1@readie.io')).toBeInTheDocument();
    expect(within(row).getByText('Completed')).toBeInTheDocument();
  });

  it('makes each row a real link to the room, encoded once', async () => {
    renderApp('/jobs/campaign/119');
    const link = await screen.findByRole('link', { name: 'Steph Tester' });
    expect(link).toHaveAttribute('href', SAMPLE_PATH);
    expect(screen.getByRole('link', { name: 'Unnamed candidate' })).toHaveAttribute(
      'href',
      '/jobs/room/campaign_119interview~~kofi.mensah%2012%40example.com',
    );
  });

  it('shows the designed empty state for a campaign with no jobs', async () => {
    renderApp('/jobs/campaign/120');
    expect(
      await screen.findByRole('heading', { name: 'No candidates in campaign 120' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Campaign 119' })).toHaveAttribute(
      'href',
      '/jobs/campaign/119',
    );
  });

  it('shows an error with technical detail, and recovers on retry', async () => {
    setScenario('error');
    const user = userEvent.setup();
    renderApp('/jobs/campaign/119');

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByRole('heading', { name: 'The Readie API reported a problem' }),
    ).toBeInTheDocument();
    expect(within(alert).getByText(/campaignHACKATHON\/119/)).toBeInTheDocument();
    expect(within(alert).getByText(/^500/)).toBeInTheDocument();

    setScenario('default');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await findRows()).toHaveLength(4);
  });

  it('uses dedicated copy for unauthorised and network errors', async () => {
    setScenario('unauthorized');
    const first = renderApp('/jobs/campaign/119');
    expect(await screen.findByRole('heading', { name: 'Not authorised' })).toBeInTheDocument();
    first.unmount();

    setScenario('offline');
    renderApp('/jobs/campaign/119');
    expect(
      await screen.findByRole('heading', { name: 'Could not reach the Readie API' }),
    ).toBeInTheDocument();
  });

  it('rejects a non-numeric campaign id without calling the API', async () => {
    renderApp('/jobs/campaign/abc');
    expect(
      await screen.findByRole('heading', { name: 'That is not a campaign id' }),
    ).toBeInTheDocument();
  });

  it('filters by status from the summary strip and writes it to the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/jobs/campaign/119');
    await findRows();

    const completed = screen.getByRole('button', { name: /Completed/ });
    await user.click(completed);
    expect(completed).toHaveAttribute('aria-pressed', 'true');
    expect(await findRows()).toHaveLength(1);
    expect(router.state.location.search).toBe('?status=COMPLETED');

    await user.click(completed);
    expect(await findRows()).toHaveLength(4);
    expect(router.state.location.search).toBe('');
  });

  it('searches by email, highlights the match and updates the URL after a pause', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/jobs/campaign/119');
    await findRows();

    await user.type(screen.getByRole('searchbox', { name: 'Search candidates by email' }), 'STEPH');
    const rows = await findRows();
    expect(rows).toHaveLength(1);
    expect(
      within(rows[0] ?? document.body).getByText('steph', { selector: 'mark' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.search).toBe('?q=STEPH'));
  });

  it('sorts by submission time and exposes aria-sort', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/jobs/campaign/119');
    const newestFirst = (await findRows()).map((row) => row.textContent);

    const header = screen.getByRole('columnheader', { name: /Submitted/ });
    expect(header).toHaveAttribute('aria-sort', 'descending');

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect((await findRows()).map((row) => row.textContent)).toEqual([...newestFirst].reverse());
    expect(router.state.location.search).toBe('?sort=submitted_asc');
  });

  it('restores filters, search and sort from a shared link', async () => {
    renderApp('/jobs/campaign/119?status=IN_PROGRESS&q=kofi&sort=submitted_asc');
    expect(await findRows()).toHaveLength(2);
    expect(screen.getByRole('searchbox')).toHaveValue('kofi');
    expect(screen.getByRole('button', { name: /In progress/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('columnheader', { name: /Submitted/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('explains an empty result and clears the filters', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/jobs/campaign/119?status=FAILED&q=steph');

    expect(await screen.findByRole('heading', { name: 'No candidates match' })).toBeInTheDocument();
    expect(
      screen.getByText('No candidate email contains “steph” with status Failed.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await findRows()).toHaveLength(4);
    expect(router.state.location.search).toBe('');
  });

  it('removes invalid params from the URL instead of failing', async () => {
    const { router } = renderApp('/jobs/campaign/119?status=bogus&sort=sideways&scenario=default');
    expect(await findRows()).toHaveLength(4);
    await waitFor(() => expect(router.state.location.search).toBe('?scenario=default'));
  });

  it('renders a card list of full-width links on mobile', async () => {
    viewport.width = 390;
    renderApp('/jobs/campaign/119');
    const list = await screen.findByRole('list', { name: 'Candidates' });
    expect(within(list).getAllByRole('link')).toHaveLength(4);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(list).getByRole('link', { name: /Steph Tester/ })).toHaveAttribute(
      'href',
      SAMPLE_PATH,
    );
  });

  it('opens the room when a row is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/jobs/campaign/119');
    await user.click(await screen.findByRole('link', { name: 'Steph Tester' }));
    expect(
      await screen.findByRole('heading', { name: 'Steph Tester', level: 1 }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(SAMPLE_PATH);
  });
});
