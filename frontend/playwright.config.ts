import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the AirAIE platform frontend smoke suite.
 *
 * Run locally with `npm run test:e2e`. The Vite dev server is launched
 * automatically via the `webServer` block; set `E2E_NO_SERVER=1` to skip
 * (e.g. when CI provisions a separate server). Override the target URL with
 * `E2E_BASE_URL` to run against a deployed environment.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
