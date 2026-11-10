import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright for feature 000 (plan.md §4.4, AC-000-09).
 *
 * - **chromium only** (ASM-015): one browser keeps the download and the run
 *   inside the timebox; the cross-browser matrix is not a 000 commitment.
 * - **`webServer` runs the built production server**, never `next dev`. The AC
 *   is about the artefact that ships: dev mode has different error overlays,
 *   different caching and no production bundle. `pnpm build` is part of the
 *   command so `pnpm test:e2e` is self-contained — the CI job that runs it does
 *   not have to remember to build first.
 * - **No axe.** `@axe-core/playwright` is deliberately absent in 000; the axe
 *   scan and the contrast check were moved to feature 003 by the Technical
 *   Director's decision of 2026-11-09 (spec v0.3). Do not add it back here.
 */
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
