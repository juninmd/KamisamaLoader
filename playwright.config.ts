import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['electron.spec.ts', 'full_system.spec.ts'], // Only run explicit E2E tests
  testIgnore: ['unit/**', 'integration.spec.ts'], // Explicitly ignore unit and vitest integration tests
  timeout: 60000, // Increased timeout for CI
  expect: {
    timeout: 15000,
  },
  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev:vite',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  retries: 2, // Add retries for stability
  workers: 1,
});
