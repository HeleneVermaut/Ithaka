import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for E2E Testing
 *
 * This configuration defines how Playwright runs E2E tests for the Ithaka frontend.
 * Tests are organized by browser type and include authentication setup.
 *
 * Key features:
 * - Multi-browser testing (Chromium, Firefox, Mobile)
 * - Authentication persistence via storage state
 * - Screenshot capture on test failure
 * - Test timeout: 60 seconds per test
 * - Retry configuration for CI environments
 * - Integrated web server startup
 */

export default defineConfig({
  testDir: './e2e/tests',
  testMatch: '**/*.spec.ts',
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },
  fullyParallel: false, // Run tests sequentially to avoid state conflicts
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, // 1 worker in CI, default in dev
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['junit', { outputFile: 'junit.xml' }]] : [])
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry', // Capture trace on first retry for debugging
    screenshot: 'only-on-failure', // Screenshot only when test fails
    video: 'retain-on-failure' // Video only on failure
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start server
    env: {
      VITE_API_BASE_URL: 'http://localhost:3000'
    }
  }
})
