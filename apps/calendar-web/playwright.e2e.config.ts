import { defineConfig, devices } from '@playwright/test';

/**
 * E2E Playwright Configuration
 * Tests the web app with real API backend
 */
export default defineConfig({
  testDir: './e2e-api',
  fullyParallel: false, // Run sequentially for database consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for database consistency
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd ../api && npm run dev',
      url: 'http://localhost:3002/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        VITE_API_URL: 'http://localhost:3002',
      },
    },
  ],
});
