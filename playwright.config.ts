import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * End-to-end tests run against a production build in mock mode, so they are
 * deterministic, need no credentials and keep working after the hackathon
 * endpoint is switched off.
 *
 * Chromium only, one worker. On machines where Playwright's bundled Chromium
 * is unavailable (for example macOS 12), run with `PW_CHANNEL=chrome` to drive
 * the installed Google Chrome instead.
 */
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    ...(process.env.PW_CHANNEL === undefined ? {} : { channel: process.env.PW_CHANNEL }),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec vite build --mode mock --outDir dist-e2e && pnpm exec vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
