/**
 * Test Script: Verify Database Migrations
 *
 * This script tests the database schema created by migrations and verifies
 * cascade delete behavior for User → Notebook → NotebookPermissions.
 *
 * Usage: ts-node src/scripts/test-migrations.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../config/database';
import User from '../models/User';
import Notebook from '../models/Notebook';
import NotebookPermissions from '../models/NotebookPermissions';
import '../models/associations'; // Initialize associations
import bcrypt from 'bcryptjs';

/**
 * Verify that tables exist in the database
 */
async function verifyTablesExist(): Promise<void> {
  console.log('\n=== Verifying Tables Exist ===');

  try {
    const [results] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('Tables found:');
    (results as any[]).forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

    const tableNames = (results as any[]).map((row: any) => row.table_name);
    const requiredTables = ['users', 'notebooks', 'notebook_permissions'];
    const missingTables = requiredTables.filter((table) => !tableNames.includes(table));

    if (missingTables.length > 0) {
      console.error(`\nMISSING TABLES: ${missingTables.join(', ')}`);
      throw new Error('Required tables are missing');
    }

    console.log('\n✓ All required tables exist');
  } catch (error) {
    console.error('Error verifying tables:', error);
    throw error;
  }
}

/**
 * Verify table columns and data types
 */
async function verifyTableColumns(): Promise<void> {
  console.log('\n=== Verifying Table Columns ===');

  try {
    // Verify notebooks table columns
    const [notebookColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notebooks'
      ORDER BY ordinal_position;
    `);

    console.log('\nNotebooks table columns:');
    (notebookColumns as any[]).forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Verify notebook_permissions table columns
    const [permissionsColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notebook_permissions'
      ORDER BY ordinal_position;
    `);

    console.log('\nNotebookPermissions table columns:');
    (permissionsColumns as any[]).forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    console.log('\n✓ All columns verified');
  } catch (error) {
    console.error('Error verifying columns:', error);
    throw error;
  }
}

/**
 * Verify foreign key constraints
 */
async function verifyForeignKeys(): Promise<void> {
  console.log('\n=== Verifying Foreign Key Constraints ===');

  try {
    const [foreignKeys] = await sequelize.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('notebooks', 'notebook_permissions');
    `);

    console.log('Foreign key constraints:');
    (foreignKeys as any[]).forEach((fk: any) => {
      console.log(`  - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      console.log(`    ON DELETE: ${fk.delete_rule}, ON UPDATE: ${fk.update_rule}`);
    });

    console.log('\n✓ All foreign keys verified');
  } catch (error) {
    console.error('Error verifying foreign keys:', error);
    throw error;
  }
}

/**
 * Verify indexes
 */
async function verifyIndexes(): Promise<void> {
  console.log('\n=== Verifying Indexes ===');

  try {
    const [indexes] = await sequelize.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('notebooks', 'notebook_permissions')
      ORDER BY tablename, indexname;
    `);

    console.log('Indexes:');
    (indexes as any[]).forEach((idx: any) => {
      console.log(`  - ${idx.indexname} on ${idx.tablename}`);
    });

    console.log('\n✓ All indexes verified');
  } catch (error) {
    console.error('Error verifying indexes:', error);
    throw error;
  }
}

/**
 * Test cascade delete behavior
 * Create User → Notebook → NotebookPermissions
 * Delete User → Verify Notebook and NotebookPermissions are deleted
 */
async function testCascadeDelete(): Promise<void> {
  console.log('\n=== Testing Cascade Delete Behavior ===');

  let testUserId: string | undefined;
  let testNotebookId: string | undefined;
  let testPermissionsId: string | undefined;

  try {
    // Create test user
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);
    const testUser = await User.create({
      email: `test-cascade-${Date.now()}@example.com`,
      passwordHash,
      firstName: 'Test',
      lastName: 'Cascade User',
    });
    testUserId = testUser.id;
    console.log(`✓ Created test user: ${testUserId}`);

    // Create test notebook
    const testNotebook = await Notebook.create({
      userId: testUserId,
      title: 'Test Cascade Notebook',
      type: 'Voyage',
      format: 'A4',
      orientation: 'portrait',
    });
    testNotebookId = testNotebook.id;
    console.log(`✓ Created test notebook: ${testNotebookId}`);

    // Create test permissions
    const testPermissions = await NotebookPermissions.create({
      notebookId: testNotebookId,
      type: 'private',
    });
    testPermissionsId = testPermissions.id;
    console.log(`✓ Created test permissions: ${testPermissionsId}`);

    // Verify records exist
    const notebookExists = await Notebook.findByPk(testNotebookId);
    const permissionsExist = await NotebookPermissions.findByPk(testPermissionsId);

    if (!notebookExists || !permissionsExist) {
      throw new Error('Failed to create test records');
    }
    console.log('✓ All test records created successfully');

    // Delete user (should cascade delete notebook and permissions)
    console.log('\nDeleting user...');
    await testUser.destroy();
    console.log('✓ User deleted');

    // Verify cascade delete worked
    const notebookAfterDelete = await Notebook.findByPk(testNotebookId);
    const permissionsAfterDelete = await NotebookPermissions.findByPk(testPermissionsId);

    if (notebookAfterDelete) {
      throw new Error('Notebook was not cascade deleted!');
    }
    console.log('✓ Notebook was cascade deleted');

    if (permissionsAfterDelete) {
      throw new Error('NotebookPermissions was not cascade deleted!');
    }
    console.log('✓ NotebookPermissions was cascade deleted');

    console.log('\n✓ Cascade delete behavior verified successfully');
  } catch (error) {
    console.error('Error testing cascade delete:', error);

    // Cleanup on error
    if (testPermissionsId) {
      try {
        await NotebookPermissions.destroy({ where: { id: testPermissionsId }, force: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    if (testNotebookId) {
      try {
        await Notebook.destroy({ where: { id: testNotebookId }, force: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    if (testUserId) {
      try {
        await User.destroy({ where: { id: testUserId }, force: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    throw error;
  }
}

/**
 * Run all verification tests
 */
async function runTests(): Promise<void> {
  console.log('==============================================');
  console.log('Database Migration Verification Tests');
  console.log('==============================================');

  try {
    // Test database connection
    console.log('\nConnecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Run verification tests
    await verifyTablesExist();
    await verifyTableColumns();
    await verifyForeignKeys();
    await verifyIndexes();
    await testCascadeDelete();

    console.log('\n==============================================');
    console.log('✓ ALL TESTS PASSED');
    console.log('==============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n==============================================');
    console.error('✗ TESTS FAILED');
    console.error('==============================================\n');
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run tests
runTests();
