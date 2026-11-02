import { defineConfig, devices } from '@playwright/test';

/**
 * Without BASE_URL the smoke spec runs against the Vite dev server, which Playwright starts.
 * With BASE_URL (for example http://localhost:8080, the container) it runs against that URL and
 * starts nothing; the header checks in the spec run only then.
 */
const externalUrl = process.env.BASE_URL;
const inCi = process.env.CI !== undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: inCi,
  retries: 0,
  reporter: inCi ? [['list'], ['github']] : 'list',
  use: {
    baseURL: externalUrl ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(externalUrl === undefined
    ? {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !inCi,
          timeout: 30_000,
        },
      }
    : {}),
});
