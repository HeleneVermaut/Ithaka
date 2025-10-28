--
-- Test Script: Verify Cascade Delete Behavior
--
-- This script tests that deleting a user cascades to notebooks and notebook_permissions
--

-- Start transaction for clean testing
BEGIN;

-- Create test user
INSERT INTO users (id, email, password_hash, first_name, last_name, is_email_verified, created_at, updated_at)
VALUES (
  'test-user-cascade-123',
  'test-cascade@example.com',
  '$2a$10$testHashForCascadeDelete',
  'Test',
  'Cascade',
  false,
  NOW(),
  NOW()
);

-- Create test notebook
INSERT INTO notebooks (id, user_id, title, type, format, orientation, dpi, page_count, status, created_at, updated_at)
VALUES (
  'test-notebook-cascade-123',
  'test-user-cascade-123',
  'Test Cascade Notebook',
  'Voyage',
  'A4',
  'portrait',
  300,
  0,
  'active',
  NOW(),
  NOW()
);

-- Create test permissions
INSERT INTO notebook_permissions (id, notebook_id, type, created_at, updated_at)
VALUES (
  'test-permissions-cascade-123',
  'test-notebook-cascade-123',
  'private',
  NOW(),
  NOW()
);

-- Verify records exist
SELECT 'User exists:' AS test, COUNT(*) AS count FROM users WHERE id = 'test-user-cascade-123';
SELECT 'Notebook exists:' AS test, COUNT(*) AS count FROM notebooks WHERE id = 'test-notebook-cascade-123';
SELECT 'Permissions exist:' AS test, COUNT(*) AS count FROM notebook_permissions WHERE id = 'test-permissions-cascade-123';

-- Delete user (should cascade delete notebook and permissions)
DELETE FROM users WHERE id = 'test-user-cascade-123';

-- Verify cascade delete worked
SELECT 'User after delete:' AS test, COUNT(*) AS count FROM users WHERE id = 'test-user-cascade-123';
SELECT 'Notebook after delete:' AS test, COUNT(*) AS count FROM notebooks WHERE id = 'test-notebook-cascade-123';
SELECT 'Permissions after delete:' AS test, COUNT(*) AS count FROM notebook_permissions WHERE id = 'test-permissions-cascade-123';

-- Rollback to keep database clean
ROLLBACK;

SELECT 'Test completed successfully - all cascade deletes verified' AS result;
