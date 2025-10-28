import { test as setup, expect, Page } from '@playwright/test'

/**
 * Authentication Setup for E2E Tests
 *
 * This file handles user authentication for E2E tests.
 * It logs in a test user and persists the session state to .auth/user.json.
 *
 * The stored authentication state is then used by all test files
 * to skip the login process and start authenticated.
 */

const authFile = 'e2e/.auth/user.json'

/**
 * Test user credentials from environment variables
 *
 * SECURITY: Credentials are loaded from environment variables to avoid
 * hardcoding sensitive information in the repository.
 *
 * Setup:
 * 1. Create a test user in your database with these credentials
 * 2. Set environment variables before running E2E tests:
 *    - E2E_TEST_EMAIL (default: e2e.test@example.com)
 *    - E2E_TEST_PASSWORD (required - no default)
 *
 * Example:
 *   export E2E_TEST_EMAIL="your-test-user@example.com"
 *   export E2E_TEST_PASSWORD="your-secure-password"
 *   npm run test:e2e
 */
const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'e2e.test@example.com',
  password: process.env.E2E_TEST_PASSWORD || ''
}

// Safety check: Ensure password is provided
if (!TEST_USER.password) {
  console.error('❌ E2E_TEST_PASSWORD environment variable is required!')
  console.error('   Set it before running E2E tests:')
  console.error('   export E2E_TEST_PASSWORD="your-test-password"')
  console.error('')
  console.error('   For CI/CD, add it as a secret in your pipeline configuration.')
  process.exit(1)
}

/**
 * Setup function: Authenticate user and save session state
 *
 * This runs before any tests and creates a persistent session file
 * that all tests can reuse for authentication.
 */
setup('authenticate user', async ({ page, context }) => {
  // Navigate to login page
  await page.goto('/login')

  // Wait for login form to load
  await expect(page.locator('input[type="email"]')).toBeVisible()

  // Fill in credentials
  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)

  // Submit login form
  await page.click('button[type="submit"]')

  // Wait for navigation to complete (user is now authenticated)
  await page.waitForURL('/dashboard')

  // Verify successful login
  await expect(page.locator('text=Tableau de bord')).toBeVisible({ timeout: 10000 })

  // Save storage state (cookies, local storage, session storage)
  // This includes JWT tokens stored in cookies
  await context.storageState({ path: authFile })

  console.log('Authentication successful - session saved to', authFile)
})

/**
 * Alternative setup if using localStorage for tokens
 * (Current implementation uses httpOnly cookies, so this is not used)
 */
setup.skip('authenticate with local storage', async ({ page, context }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')

  // Save storage state if tokens are in localStorage
  await context.storageState({ path: authFile })
})
