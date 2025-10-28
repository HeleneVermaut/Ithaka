/**
 * Jest Setup File
 *
 * This file runs before all test suites and sets up the test environment.
 * - Disables console logs during tests (can be re-enabled per test if needed)
 * - Sets test database environment variable
 * - Configures any global test utilities
 */

// Suppress console output during tests unless explicitly needed
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment
process.env['NODE_ENV'] = 'test';

// SAFETY CHECK: Ensure test database is used
// This prevents accidentally running tests against production database
const dbUrl = process.env['DATABASE_URL'] || 'postgresql://ithaka_user:test_password_change_me@localhost:5432/ithaka_db_test';
const dbName = dbUrl.split('/').pop()?.split('?')[0] || '';

if (!dbName.includes('test') && !dbName.includes('spec') && !dbName.includes('_test')) {
  console.error('❌ SAFETY CHECK FAILED: Tests must use a test database!');
  console.error(`   Expected database name to contain "test" or "spec"`);
  console.error(`   Current database: ${dbName}`);
  console.error('');
  console.error('   To fix this:');
  console.error('   1. Set DATABASE_URL environment variable to a test database');
  console.error('   2. Or ensure your database name contains "test" or "spec"');
  console.error('   Example: postgresql://user:pass@localhost:5432/ithaka_db_test');
  process.exit(1);
}

process.env['DATABASE_URL'] = dbUrl;
console.log(`✓ Using test database: ${dbName}`);

// Set test secrets (these are ONLY for testing, never use in production)
process.env['JWT_SECRET'] = 'test-secret-key-minimum-64-characters-xxxxxxxxxxxxxxxx';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-key-minimum-64-characters-xxxxxxxxxxxxxxx';
process.env['COOKIE_SECRET'] = 'test-cookie-key-minimum-32-characters-xxxxx';

// Extend test timeout if needed
jest.setTimeout(30000);
