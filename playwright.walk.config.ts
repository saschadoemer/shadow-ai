import { defineConfig, devices } from '@playwright/test';

/**
 * The acceptance walks (docs/spec/testing.md §5): one script per feature under tests/walk/, run
 * by `npm run walk -- NNNN`. A walk plays the feature's acceptance plan in a browser by
 * simulating the keys, in real time, and saves a picture per expected step under
 * walk-results/. It is no part of `npm run check` and does not run in CI.
 */
const port = Number(process.env.WALK_PORT ?? 5174);

export default defineConfig({
  testDir: 'tests/walk',
  testMatch: '**/*.walk.ts',
  outputDir: 'walk-results/playwright',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // A walk plays the game at its own speed: minutes, not seconds.
  timeout: 20 * 60_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
