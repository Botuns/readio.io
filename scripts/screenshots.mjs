// Captures the README screenshots from a running mock-mode preview.
//
// Usage:
//   pnpm exec vite build --mode mock --outDir dist-e2e
//   pnpm exec vite preview --outDir dist-e2e --port 4174 --strictPort
//   PW_CHANNEL=chrome node scripts/screenshots.mjs
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4174';
const outDir = join(import.meta.dirname, '..', 'docs', 'screenshots');
const WARNING_ROOM = 'campaign_900interview~~warning.demo%40example.com~~d02f84efee25';
const FAILED_ROOM = 'campaign_900interview~~failed.demo%40example.com~~0280d733ab19';
const PASSED_ROOM = 'campaign_900interview~~passed.demo%40example.com~~f042e2aad1ca';

const SHOTS = [
  { name: 'campaign', path: '/jobs/campaign/123', ready: '[data-job-row]' },
  { name: 'room-transcript', path: `/jobs/room/${PASSED_ROOM}`, ready: '[role="tablist"]' },
  { name: 'room-identity', path: `/jobs/room/${WARNING_ROOM}?tab=identity`, ready: '[role="meter"]' },
  { name: 'room-integrity', path: `/jobs/room/${FAILED_ROOM}?tab=integrity`, ready: '[role="meter"]' },
  { name: 'empty', path: '/jobs/campaign/120', ready: 'h3' },
  { name: 'error', path: '/jobs/campaign/119?scenario=error', ready: '[role="alert"]' },
];

const VIEWPORTS = [
  { name: 'desktop', options: { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 } },
  {
    name: 'mobile',
    options: { viewport: devices['iPhone 13 Pro'].viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(
  process.env.PW_CHANNEL === undefined ? {} : { channel: process.env.PW_CHANNEL },
);

for (const viewport of VIEWPORTS) {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ ...viewport.options, colorScheme });
    const page = await context.newPage();
    for (const shot of SHOTS) {
      await page.goto(BASE_URL + shot.path);
      await page.waitForSelector(shot.ready, { timeout: 20_000 });
      await page.evaluate('document.fonts.ready.then(() => true)');
      await page.waitForTimeout(400);
      const file = `${shot.name}-${viewport.name}-${colorScheme}.png`;
      await page.screenshot({ path: join(outDir, file) });
      console.log(`Saved ${file}`);
    }
    await context.close();
  }
}

await browser.close();
