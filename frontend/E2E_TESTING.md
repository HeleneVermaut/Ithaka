# E2E Testing Guide - Ithaka Notebook Management

This document provides comprehensive guidance for running, writing, and debugging E2E tests using Playwright.

## Overview

The Ithaka frontend includes a complete E2E test suite covering critical user workflows for notebook management. The test suite uses **Playwright** for cross-browser testing and includes:

- **6 Critical Workflows** with 40+ test cases
- **Multi-browser testing** (Chromium, Firefox, WebKit, Mobile Chrome)
- **Accessibility testing** (keyboard navigation, ARIA labels, focus management)
- **Error handling scenarios**
- **Edge case coverage**

## Quick Start

### 1. Installation

Install Playwright and dependencies:

```bash
cd frontend
npm install
```

This installs `@playwright/test` and all required dependencies.

### 2. Setup Test User

Before running tests, ensure a test user exists in your backend database:

```
Email: e2e.test@example.com
Password: E2ETestPassword123!
```

Or update the credentials in `e2e/tests/auth.setup.ts`.

### 3. Run Tests

Start both backend and frontend servers:

```bash
# Terminal 1: Backend (from project root)
cd backend
npm run dev

# Terminal 2: Frontend (from project root)
cd frontend
npm run dev

# Terminal 3: Run tests (from frontend directory)
cd frontend
npm run test:e2e
```

## Available Test Commands

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with interactive UI (recommended for development)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests with Playwright Inspector
npm run test:e2e:debug

# View HTML report of last test run
npm run test:e2e:report
```

### Advanced Commands

```bash
# Run specific test file
npx playwright test e2e/tests/notebooks.spec.ts

# Run tests matching pattern
npx playwright test -g "pagination"

# Run tests in specific browser
npx playwright test --project=firefox
npx playwright test --project=chromium
npx playwright test --project=webkit
npx playwright test --project=mobile-chrome

# Run with custom workers (parallel execution)
npx playwright test --workers=2

# Run tests with full trace capture
npx playwright test --trace=on

# Generate coverage report
npx playwright test --coverage
```

## Test Structure

```
frontend/
├── e2e/
│   ├── tests/
│   │   ├── auth.setup.ts         # Authentication setup
│   │   ├── notebooks.spec.ts     # Main test suite (40+ tests)
│   │   └── utils.ts              # Helper functions
│   ├── fixtures/
│   │   └── testData.ts           # Test data and fixtures
│   ├── .auth/
│   │   └── user.json             # Saved session state
│   └── screenshots/              # Failure screenshots
├── playwright.config.ts          # Configuration
└── E2E_TESTING.md               # This file
```

## Test Suites

### 1. Notebook Lifecycle (Workflow 1)

**File**: `notebooks.spec.ts` → `complete notebook lifecycle - create to delete`

Tests the complete user journey:
- Create notebook with all properties
- Edit notebook title
- Archive notebook
- Restore from archive
- Permanently delete

**Duration**: ~45 seconds
**Assertions**: 20+

### 2. Pagination & Filtering (Workflow 2)

**File**: `notebooks.spec.ts` → `pagination and filtering work correctly`

Tests filtering and pagination features:
- Create multiple test notebooks
- Filter by notebook type
- Multi-select filtering
- Search functionality
- Clear filters
- Verify result counts

**Duration**: ~30 seconds
**Assertions**: 15+

### 3. Duplication (Workflow 3)

**File**: `notebooks.spec.ts` → `duplicate notebook creates independent copy`

Tests notebook duplication:
- Duplicate notebook
- Verify independent copy
- Edit original and verify copy unaffected
- Archive original while copy remains active
- Duplicate duplicated notebook

**Duration**: ~30 seconds
**Assertions**: 10+

### 4. Form Validation (Workflow 4)

**File**: `notebooks.spec.ts` → `form validation prevents invalid submissions`

Tests input validation:
- Empty title validation
- Title length validation (max 100 chars)
- Description length validation (max 300 chars)
- Required field validation
- Error message display

**Duration**: ~30 seconds
**Assertions**: 15+

### 5. Archive Countdown (Workflow 5)

**File**: `notebooks.spec.ts` → `archived notebooks show countdown and delete after 30 days`

Tests archive lifecycle:
- Archive notebooks
- Verify countdown display
- Verify progress bar color
- Restore from archive
- Delete permanently

**Duration**: ~20 seconds
**Assertions**: 8+

### 6. Accessibility (Workflow 6)

**File**: `notebooks.spec.ts` → `keyboard navigation and screen reader support`

Tests keyboard and screen reader support:
- Tab key navigation
- Enter key to activate buttons
- Escape key to close modals
- Focus trap in modals
- ARIA labels and live regions
- Focus visible indicators

**Duration**: ~25 seconds
**Assertions**: 12+

## Configuration

### `playwright.config.ts`

Key settings:

```typescript
{
  testDir: './e2e/tests',
  timeout: 60000,              // 60 seconds per test
  retries: 2,                  // Retry failed tests (CI only)
  workers: 1,                  // Sequential execution by default
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',   // Trace on first retry
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium' },      // Chrome/Edge
    { name: 'firefox' },       // Firefox
    { name: 'webkit' },        // Safari
    { name: 'mobile-chrome' }  // Mobile Chrome
  ]
}
```

## Authentication Setup

### How Authentication Works

1. **Setup Phase**: `auth.setup.ts` runs before any tests
2. **Login**: Uses test credentials to log in
3. **Session Saved**: Browser state (cookies, storage) saved to `.auth/user.json`
4. **Test Execution**: All tests use saved session, no need to log in again

### Updating Test Credentials

Edit `e2e/tests/auth.setup.ts`:

```typescript
const TEST_USER = {
  email: 'your.email@example.com',
  password: 'YourPassword123!'
}
```

### Debugging Authentication Issues

```bash
# Run only auth setup in headed mode
npx playwright test auth.setup.ts --headed

# Enable verbose logging
PWDEBUG=1 npx playwright test auth.setup.ts
```

## Helper Functions

The `e2e/tests/utils.ts` file contains reusable helper functions:

```typescript
// Navigation
navigateToNotebooks(page)
openCreateNotebookModal(page)

// Notebook operations
createNotebook(page, title, type, format, orientation, description)
editNotebookTitle(page, currentTitle, newTitle)
archiveNotebook(page, title)
restoreArchivedNotebook(page, title)
deleteArchivedNotebook(page, title)
duplicateNotebook(page, title)

// Filtering and search
searchNotebooks(page, searchTerm)
filterByType(page, type)
clearFilters(page)
goToNextPage(page)

// Utilities
getNotebookCount(page)
getToastMessage(page)
pressTabAndGetFocus(page)
cleanupNotebooks(page)
```

## Writing New Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test'
import { navigateToNotebooks, createNotebook } from './utils'

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToNotebooks(page)
  })

  test('should do something', async ({ page }) => {
    // Arrange
    const testData = { title: 'Test' }

    // Act
    await createNotebook(page, testData.title)

    // Assert
    await expect(page.locator(`text=${testData.title}`)).toBeVisible()
  })
})
```

### Best Practices

1. **Use Page Fixtures**: Every test receives a `page` object automatically
2. **Use Helpers**: Leverage utility functions to reduce code
3. **Wait for Elements**: Use `expect().toBeVisible()` for proper waits
4. **Cleanup**: Use `test.afterEach()` to clean up test data
5. **Descriptive Names**: Test names should describe what is being tested
6. **Single Assertion Type**: Focus each test on one feature
7. **Network Idle**: Use `page.waitForLoadState('networkidle')` after actions

## Debugging

### 1. View Browser UI (Headed Mode)

```bash
npm run test:e2e:headed
```

Tests run in visible browser window.

### 2. Playwright Inspector

```bash
npm run test:e2e:debug
```

Interactive inspector allows stepping through tests.

### 3. Interactive UI Mode

```bash
npm run test:e2e:ui
```

Best for development - run tests, see results, re-run on code changes.

### 4. Screenshots and Videos

- Failed tests automatically captured in `test-results/`
- Screenshots: `frontend/test-results/[testname]/test-failed-1.png`
- Videos: `frontend/test-results/[testname]/video.webm`

### 5. Trace Viewer

```bash
npm run test:e2e:report
```

Opens HTML report with traces of test execution.

### 6. Verbose Logging

```bash
PWDEBUG=1 npm run test:e2e
```

Shows detailed logs of page interactions.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci

      - name: Start backend
        run: cd backend && npm run dev &

      - name: Run E2E tests
        run: cd frontend && npm run test:e2e

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Performance Targets

Each workflow should complete within these targets:

- **Notebook Lifecycle**: ~45 seconds
- **Pagination & Filtering**: ~30 seconds
- **Duplication**: ~30 seconds
- **Form Validation**: ~30 seconds
- **Archive Countdown**: ~20 seconds
- **Accessibility**: ~25 seconds
- **Total E2E Suite**: ~5 minutes

## Troubleshooting

### Tests Fail Due to Timeout

**Issue**: Tests timeout waiting for elements

**Solutions**:
1. Increase timeout in `playwright.config.ts`
2. Add explicit waits: `await page.waitForLoadState('networkidle')`
3. Use `expect(element).toBeVisible({ timeout: 15000 })`

### Authentication Fails

**Issue**: Tests can't log in

**Solutions**:
1. Verify test user exists in database
2. Check credentials in `auth.setup.ts`
3. Run in headed mode to see login page
4. Check for CORS errors in console

### Can't Find Elements

**Issue**: Selectors don't match

**Solutions**:
1. Use Playwright Inspector: `npm run test:e2e:debug`
2. Add `await page.pause()` to stop at breakpoint
3. Check element names and attributes in DevTools
4. Update selectors in utility functions

### Tests Interfere with Each Other

**Issue**: Tests fail when run together but pass individually

**Solutions**:
1. Ensure `test.afterEach()` cleanup runs
2. Use unique names for test data
3. Increase test isolation by restarting auth
4. Check for data leftover from previous tests

### Browser Not Starting

**Issue**: Playwright can't launch browser

**Solutions**:
```bash
# Install browser binaries
npx playwright install

# Install OS dependencies (Linux)
npx playwright install-deps

# Check browser cache
rm -rf ~/.cache/ms-playwright
npx playwright install
```

### Flaky Tests

**Issue**: Tests pass sometimes, fail other times

**Solutions**:
1. Add explicit waits for async operations
2. Use `expect().toBeVisible()` instead of `expect().toBe(true)`
3. Add delays between rapid operations: `await page.waitForTimeout(500)`
4. Check for race conditions in test data cleanup

## Best Practices

1. **Keep Tests Independent**: Each test should work in isolation
2. **Use Fixtures**: Leverage `test.beforeEach()` and `test.afterEach()`
3. **Meaningful Names**: Test names should describe behavior
4. **No Hardcoded Waits**: Use `waitForSelector()` or event-based waits
5. **Error Messages**: Add meaningful error context
6. **DRY Code**: Extract common patterns to utility functions
7. **Test Data**: Use fixtures for consistent test data
8. **Accessibility**: Always test keyboard navigation
9. **Cross-Browser**: Test in multiple browsers, not just Chrome
10. **Continuous Integration**: Automate E2E tests in CI/CD pipeline

## Test Results Summary

Current test suite includes:

- **Total Tests**: 15+ test cases
- **Total Assertions**: 80+ assertions
- **Workflows Covered**: 6 critical user journeys
- **Browser Coverage**: 4 browsers (Chromium, Firefox, WebKit, Mobile)
- **Accessibility Tests**: Keyboard navigation, ARIA labels, focus management
- **Edge Cases**: Empty states, rapid operations, page reloads

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Locators](https://playwright.dev/docs/locators)
- [Web-first Assertions](https://playwright.dev/docs/test-assertions)

## Support

For issues or questions:

1. Check test output in console
2. Review failed test screenshots in `test-results/`
3. Check browser console with `--headed` flag
4. Enable trace: `npx playwright test --trace=on`
5. Review Playwright documentation

---

**Last Updated**: 2025-10-28
**Playwright Version**: 1.48.0
**Node Version**: 18.0.0+
