import { devices, expect, test, type Page } from '@playwright/test';

const SAMPLE_ROOM = 'campaign_119interview~~stephtester1@readie.io~~a3953942a9f2';
const CANONICAL_PATH = '/jobs/room/campaign_119interview~~stephtester1%40readie.io~~a3953942a9f2';
const SPACED_ROOM_PATH = '/jobs/room/campaign_119interview~~kofi.mensah%2012%40example.com';

function pathOf(page: Page): string {
  const url = new URL(page.url());
  return url.pathname + url.search;
}

async function expectRoomLoaded(page: Page, heading: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await expect(page.getByRole('tablist')).toBeVisible();
}

test.describe('campaign to room', () => {
  test('a row click opens the room at its canonical URL', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/jobs\/campaign\/119$/);
    await expect(page.getByRole('table', { name: 'Candidates' }).getByRole('row')).toHaveCount(5);

    await page.getByRole('link', { name: 'Steph Tester' }).click();

    await expectRoomLoaded(page, 'Steph Tester');
    expect(pathOf(page)).toBe(CANONICAL_PATH);
    await expect(page.getByText(SAMPLE_ROOM)).toBeVisible();
    await expect(page).toHaveTitle('Room · stephtester1@readie.io · Readie Integrity Audit');
  });

  test('a row is a real link that opens in a new tab', async ({ page, context }) => {
    await page.goto('/jobs/campaign/119');
    const link = page.getByRole('link', { name: 'Steph Tester' });
    await expect(link).toHaveAttribute('href', CANONICAL_PATH);

    const [newTab] = await Promise.all([
      context.waitForEvent('page'),
      link.click({ modifiers: ['ControlOrMeta'] }),
    ]);
    await expectRoomLoaded(newTab, 'Steph Tester');
    expect(pathOf(page)).toBe('/jobs/campaign/119');
  });

  test('filters and search survive opening a room and going Back', async ({ page }) => {
    await page.goto('/jobs/campaign/119');
    await page.getByRole('button', { name: /In progress/ }).click();
    await page.getByRole('searchbox', { name: 'Search candidates by email' }).fill('kofi');
    await expect(page).toHaveURL(/status=IN_PROGRESS&q=kofi$/);
    await expect(page.locator('[data-job-row]')).toHaveCount(2);

    await page.getByRole('link', { name: 'Kofi Mensah' }).click();
    await expectRoomLoaded(page, 'Kofi Mensah');

    // Filtering replaced history entries, so one Back lands on the filtered table.
    await page.goBack();
    await expect(page).toHaveURL(/\/jobs\/campaign\/119\?status=IN_PROGRESS&q=kofi$/);
    await expect(page.getByRole('searchbox')).toHaveValue('kofi');
    await expect(page.locator('[data-job-row]')).toHaveCount(2);

    await page.goForward();
    await expectRoomLoaded(page, 'Kofi Mensah');
  });

  test('switching campaigns pushes history', async ({ page }) => {
    await page.goto('/jobs/campaign/119');
    await page
      .getByRole('navigation', { name: 'Campaign' })
      .getByRole('link', { name: '123' })
      .click();
    await expect(page.locator('[data-job-row]')).toHaveCount(6);
    await page
      .getByRole('navigation', { name: 'Campaign' })
      .getByRole('link', { name: '120' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'No candidates in campaign 120' }),
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/jobs\/campaign\/123$/);
    await expect(page.locator('[data-job-row]')).toHaveCount(6);
    await page.goBack();
    await expect(page).toHaveURL(/\/jobs\/campaign\/119$/);
  });
});

test.describe('room URL handling', () => {
  for (const [label, path] of [
    ['a raw @', `/jobs/room/${SAMPLE_ROOM}`],
    ['%40', CANONICAL_PATH],
    [
      'every character escaped',
      '/jobs/room/campaign_119interview%7E%7Estephtester1%40readie.io%7E%7Ea3953942a9f2',
    ],
  ] as const) {
    test(`a pasted URL with ${label} loads the room and settles on the canonical URL`, async ({
      page,
    }) => {
      await page.goto(`${path}?tab=identity`);
      await expectRoomLoaded(page, 'Steph Tester');
      await expect(page.getByRole('tab', { name: /Identity/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect.poll(() => pathOf(page)).toBe(`${CANONICAL_PATH}?tab=identity`);
      expect(page.url()).not.toContain('%25');
    });
  }

  test('canonicalising a pasted URL does not add a history entry', async ({ page }) => {
    await page.goto('/jobs/campaign/119');
    await page.goto(`/jobs/room/${SAMPLE_ROOM}`);
    await expect.poll(() => pathOf(page)).toBe(CANONICAL_PATH);
    await page.goBack();
    await expect(page).toHaveURL(/\/jobs\/campaign\/119$/);
  });

  test('a hard refresh keeps the room and the tab', async ({ page }) => {
    await page.goto(`${CANONICAL_PATH}?tab=integrity`);
    await expectRoomLoaded(page, 'Steph Tester');

    await page.reload();

    await expectRoomLoaded(page, 'Steph Tester');
    expect(pathOf(page)).toBe(`${CANONICAL_PATH}?tab=integrity`);
    await expect(page.getByRole('tab', { name: /Integrity/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('region', { name: 'Overall integrity status' })).toBeVisible();
  });

  test('a real room name with a space works from a click, a paste and a refresh', async ({
    page,
  }) => {
    await page.goto('/jobs/campaign/119');
    await page.getByRole('link', { name: 'Unnamed candidate' }).click();
    await expect(page.getByRole('tablist')).toBeVisible();
    expect(pathOf(page)).toBe(SPACED_ROOM_PATH);

    await page.goto('/jobs/room/campaign_119interview~~kofi.mensah 12@example.com');
    await expect(page.getByRole('tablist')).toBeVisible();
    await expect.poll(() => pathOf(page)).toBe(SPACED_ROOM_PATH);

    await page.reload();
    await expect(page.getByRole('tablist')).toBeVisible();
    expect(pathOf(page)).toBe(SPACED_ROOM_PATH);
  });

  test('an unknown room shows "Room not found"', async ({ page }) => {
    await page.goto('/jobs/room/campaign_119interview~~nobody%40example.com~~000000000000');
    await expect(page.getByRole('heading', { name: 'Room not found' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to campaign 119' }).click();
    await expect(page).toHaveURL(/\/jobs\/campaign\/119$/);
  });
});

test.describe('tabs and history', () => {
  test('changing tab updates the URL, and Back and Forward walk the tabs and pages', async ({
    page,
  }) => {
    await page.goto('/jobs/campaign/900');
    await page.getByRole('link', { name: 'Warning Demo' }).click();
    await expectRoomLoaded(page, 'Warning Demo');
    const roomPath = new URL(page.url()).pathname;
    expect(new URL(page.url()).search).toBe('');

    await page.getByRole('tab', { name: /Identity/ }).click();
    await expect(page).toHaveURL(/\?tab=identity$/);
    await expect(page.getByRole('meter', { name: 'Biometric match confidence' })).toBeVisible();

    await page.getByRole('tab', { name: /Integrity/ }).click();
    await expect(page).toHaveURL(/\?tab=integrity$/);
    await expect(page.getByRole('region', { name: 'Overall integrity status' })).toContainText(
      'Warning',
    );

    await page.goBack();
    await expect(page).toHaveURL(/\?tab=identity$/);
    await expect(page.getByRole('tab', { name: /Identity/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.goBack();
    expect(pathOf(page)).toBe(roomPath);
    await expect(page.getByRole('tab', { name: /Transcript/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.goBack();
    await expect(page).toHaveURL(/\/jobs\/campaign\/900$/);
    await expect(page.locator('[data-job-row]')).toHaveCount(5);

    await page.goForward();
    await expectRoomLoaded(page, 'Warning Demo');
    await page.goForward();
    await expect(page).toHaveURL(/\?tab=identity$/);
    await page.goForward();
    await expect(page).toHaveURL(/\?tab=integrity$/);
    await expect(page.getByRole('region', { name: 'Overall integrity status' })).toBeVisible();
  });

  test('keyboard shortcuts switch tabs and move through rows', async ({ page }) => {
    await page.goto('/jobs/campaign/119');
    await expect(page.locator('[data-job-row]')).toHaveCount(4);
    await page.keyboard.press('/');
    await expect(page.getByRole('searchbox')).toBeFocused();
    await page.keyboard.press('Escape');
    await page.getByRole('searchbox').blur();

    await page.keyboard.press('j');
    await page.keyboard.press('j');
    await expect(page.getByRole('link', { name: 'Steph Tester' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expectRoomLoaded(page, 'Steph Tester');

    await page.keyboard.press('3');
    await expect(page).toHaveURL(/\?tab=integrity$/);
    await page.keyboard.press('2');
    await expect(page).toHaveURL(/\?tab=identity$/);
  });

  test('an invalid tab falls back to the transcript without a new history entry', async ({
    page,
  }) => {
    await page.goto('/jobs/campaign/119');
    await page.goto(`${CANONICAL_PATH}?tab=nope`);
    await expectRoomLoaded(page, 'Steph Tester');
    await expect.poll(() => pathOf(page)).toBe(CANONICAL_PATH);
    await page.goBack();
    await expect(page).toHaveURL(/\/jobs\/campaign\/119$/);
  });
});

test.describe('async states through mock scenarios', () => {
  test('?scenario=error shows the error state, and Retry recovers', async ({ page }) => {
    await page.goto('/jobs/campaign/119?scenario=error');
    const alert = page.getByRole('alert');
    await expect(
      alert.getByRole('heading', { name: 'The Readie API reported a problem' }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /Data source/ }).click();
    await page.getByRole('radio', { name: 'Normal' }).click();
    await expect(page.locator('[data-job-row]')).toHaveCount(4);
  });

  test('?scenario=empty shows the empty state', async ({ page }) => {
    await page.goto('/jobs/campaign/119?scenario=empty');
    await expect(
      page.getByRole('heading', { name: 'No candidates in campaign 119' }),
    ).toBeVisible();
  });

  test('?scenario=slow keeps the skeleton visible', async ({ page }) => {
    await page.goto('/jobs/campaign/119?scenario=slow');
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.locator('[data-job-row]')).toHaveCount(4, { timeout: 10_000 });
  });
});

test.describe('live mode sign-in', () => {
  const ACCOUNT = { username: 'auditor', password: 's3cret' };
  /** Set for the test build in playwright.config.ts; the user never types it. */
  const ACCESS_KEY = 'e2e-access-key';
  const BASIC = `Basic ${Buffer.from(`${ACCOUNT.username}:${ACCOUNT.password}`).toString('base64')}`;

  /**
   * Stands in for the live API so the test needs no real credentials: it
   * answers 401 with a Basic challenge unless the expected pair is sent.
   */
  async function stubLiveApi(page: Page): Promise<(string | null)[]> {
    const authorizations: (string | null)[] = [];
    await page.route('**/api/jobs/**', async (route) => {
      const headers = route.request().headers();
      authorizations.push(headers.authorization ?? null);
      if (headers.authorization === BASIC && headers.myauthorizationx === ACCESS_KEY) {
        await route.fulfill({ json: [] });
      } else {
        await route.fulfill({
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Realm"' },
          json: { status: 401, error: 'Unauthorized' },
        });
      }
    });
    return authorizations;
  }

  async function fillSignIn(page: Page, password: string): Promise<void> {
    const dialog = page.getByRole('dialog', { name: 'Sign in to Readie' });
    await dialog.getByLabel('Username').fill(ACCOUNT.username);
    await dialog.getByLabel('Password', { exact: true }).fill(password);
  }

  test('choosing Live API opens the sign-in dialog, then loads live data with those credentials', async ({
    page,
  }) => {
    const authorizations = await stubLiveApi(page);
    await page.goto('/jobs/campaign/119');
    await expect(page.locator('[data-job-row]')).toHaveCount(4);

    await page.getByRole('button', { name: /Data source/ }).click();
    await page.getByRole('radio', { name: /Live API/ }).click();

    const dialog = page.getByRole('dialog', { name: 'Sign in to Readie' });
    await expect(dialog).toBeVisible();
    // Nothing has been sent to the API, so the browser has had no 401 to react to.
    expect(authorizations).toEqual([]);

    await fillSignIn(page, ACCOUNT.password);
    await dialog.getByRole('button', { name: 'Sign in and use live data' }).click();

    await expect(
      page.getByRole('heading', { name: 'No candidates in campaign 119' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Data source/ })).toContainText('Live API');
    expect(authorizations.length).toBeGreaterThan(0);
    expect(authorizations.every((value) => value === BASIC)).toBe(true);

    await page.getByRole('button', { name: /Data source/ }).click();
    await expect(page.getByText('Signed in as auditor.')).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in to load live data' })).toBeVisible();
  });

  test('rejected credentials are reported inside the dialog', async ({ page }) => {
    const authorizations = await stubLiveApi(page);
    const nativeDialogs: string[] = [];
    page.on('dialog', (nativeDialog) => nativeDialogs.push(nativeDialog.type()));
    await page.addInitScript(() => {
      window.localStorage.setItem('readie:data-source', 'live');
    });

    await page.goto('/jobs/campaign/119');
    const dialog = page.getByRole('dialog', { name: 'Sign in to Readie' });
    await expect(dialog).toBeVisible();
    expect(authorizations).toEqual([]);

    await fillSignIn(page, 'wrong-password');
    await dialog.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(dialog.getByRole('alert')).toContainText(
      'The API rejected this username and password',
    );
    await expect(dialog).toBeVisible();
    expect(authorizations).toHaveLength(1);
    expect(nativeDialogs).toEqual([]);

    await fillSignIn(page, ACCOUNT.password);
    await dialog.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole('heading', { name: 'No candidates in campaign 119' }),
    ).toBeVisible();
  });
});

test.describe('offline and mobile', () => {
  test('makes no request to any other host, so fonts and icons are self-hosted', async ({
    page,
  }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const { hostname, protocol } = new URL(request.url());
      if (protocol.startsWith('http') && hostname !== 'localhost') external.push(request.url());
    });

    await page.goto('/jobs/campaign/119');
    await page.getByRole('link', { name: 'Steph Tester' }).click();
    await expectRoomLoaded(page, 'Steph Tester');
    await page.getByRole('tab', { name: /Integrity/ }).click();
    await expect(page.getByRole('region', { name: 'Overall integrity status' })).toBeVisible();

    expect(external).toEqual([]);
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts]
        .filter((font) => font.status === 'loaded')
        .map((font) => font.family);
    });
    expect(fonts.join(' ')).toContain('Inter Variable');
    expect(fonts.join(' ')).toContain('JetBrains Mono Variable');
  });

  test('keeps working with the network switched off', async ({ page, context }) => {
    await page.goto('/jobs/campaign/119');
    await expect(page.locator('[data-job-row]')).toHaveCount(4);
    // Both page chunks are preloaded at start-up.
    await page.waitForLoadState('networkidle');

    await context.setOffline(true);
    await page
      .getByRole('navigation', { name: 'Campaign' })
      .getByRole('link', { name: '123' })
      .click();
    await expect(page.locator('[data-job-row]')).toHaveCount(6);
    await page.locator('[data-job-row]').last().click();
    await expect(page.getByRole('tablist')).toBeVisible();
    await page.getByRole('tab', { name: /Integrity/ }).click();
    await expect(page.getByRole('region', { name: 'Overall integrity status' })).toBeVisible();
    await context.setOffline(false);
  });

  test.describe('at phone width', () => {
    test.use({ viewport: devices['iPhone 13 Pro'].viewport, hasTouch: true, isMobile: true });

    test('shows cards, a filter sheet and segmented tabs with no horizontal scroll', async ({
      page,
    }) => {
      const noHorizontalScroll = () =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

      await page.goto('/jobs/campaign/123');
      await expect(page.getByRole('list', { name: 'Candidates' }).getByRole('link')).toHaveCount(6);
      await expect(page.getByRole('table')).toHaveCount(0);
      expect(await noHorizontalScroll()).toBe(true);

      await page.getByRole('button', { name: /Filters/ }).click();
      const sheet = page.getByRole('dialog');
      await expect(sheet.getByRole('radio', { name: /In progress/ })).toBeVisible();
      await sheet.getByRole('radio', { name: 'Oldest first' }).click();
      await expect(page).toHaveURL(/sort=submitted_asc$/);
      await sheet.getByRole('button', { name: /Show 6 candidates/ }).click();
      await expect(sheet).toBeHidden();

      await page.getByRole('list', { name: 'Candidates' }).getByRole('link').first().click();
      await expect(page.getByRole('tablist')).toBeVisible();
      expect(await noHorizontalScroll()).toBe(true);

      for (const tab of [/Identity/, /Integrity/, /Transcript/]) {
        await page.getByRole('tab', { name: tab }).click();
        await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
        expect(await noHorizontalScroll()).toBe(true);
      }

      const smallTargets = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button, a[href], [role="tab"], input, select')]
          .filter(
            (element) => element.offsetParent !== null && !element.classList.contains('sr-only'),
          )
          .map((element) => ({
            rect: element.getBoundingClientRect(),
            label: element.textContent.trim().slice(0, 30),
          }))
          .filter(({ rect }) => rect.height < 44 && rect.width > 0)
          .map(
            ({ rect, label }) => `${label} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          ),
      );
      expect(smallTargets).toEqual([]);
    });
  });
});
