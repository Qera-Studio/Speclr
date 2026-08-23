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
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/preview/invoice',
    reuseExistingServer: !process.env.CI,
    // A cold Turbopack compile of the first page is slow, and the print sheets
    // pull in the whole domain layer.
    timeout: 180_000,
  },
});
