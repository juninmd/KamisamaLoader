import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['incremental.spec.ts', 'install-lifecycle.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  outputDir: 'test-results/incremental',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
