import { defineConfig, devices } from '@playwright/test';

/**
 * The browser half of the suite.
 *
 * Jest owns behaviour; this owns geometry. Everything here is a measurement
 * jsdom is structurally incapable of making — where a page breaks, whether a
 * row fell off the bottom of a sheet of A4 — which is the gap `docs/vendors.md`
 * §6.1 names as the highest-value unpaid upgrade on its list.
 *
 * `next dev`, not a production build: the fixtures render at `/preview/…`,
 * which `notFound()`s in production on purpose.
 */
/**
 * 3000 unless told otherwise. `next dev` walks up a port when 3000 is taken, so
 * a second server (a production build left running, another worktree) puts the
 * fixtures on 3001 while this still points at 3000 — where `/preview/…` is a
 * real 404, because it `notFound()`s outside dev. That failure reads exactly
 * like a broken selector, which cost a debugging cycle once.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: `${BASE_URL}/preview/invoice`,
    reuseExistingServer: !process.env.CI,
    // A cold Turbopack compile of the first page is slow, and the print sheets
    // pull in the whole domain layer.
    timeout: 180_000,
  },
});
