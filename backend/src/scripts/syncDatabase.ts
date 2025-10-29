/**
 * Database Synchronization Script
 *
 * This script synchronizes Sequelize models with the PostgreSQL database.
 * It creates tables if they don't exist and updates their structure.
 *
 * Usage:
 *   npm run db:sync        - Sync without dropping tables
 *   npm run db:sync:force  - Drop all tables and recreate (DANGEROUS)
 *
 * @module scripts/syncDatabase
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { sequelize } from '../config/database';
import { User } from '../models/User';
import { TokenBlacklist as _TokenBlacklist } from '../models/TokenBlacklist';
import { Notebook as _Notebook } from '../models/Notebook';
import { NotebookPermissions as _NotebookPermissions } from '../models/NotebookPermissions';
import { Page as _Page } from '../models/Page';
import { PageElement as _PageElement } from '../models/PageElement';
import { logger } from '../utils/logger';
import '../models/associations'; // Import associations to initialize relationships

// Use models in void expressions to satisfy TypeScript while keeping side effects
void _TokenBlacklist;
void _Notebook;
void _NotebookPermissions;
void _Page;
void _PageElement;

/**
 * Synchronize database models
 *
 * @param {boolean} force - If true, drops all tables before recreating
 */
async function syncDatabase(force: boolean = false): Promise<void> {
  try {
    logger.info('Starting database synchronization...');

    // Test connection
    await sequelize.authenticate();
    logger.info('✓ Database connection established successfully');

    // Sync models
    if (force) {
      logger.warn('⚠️  FORCE SYNC: All tables will be dropped and recreated!');
      await sequelize.sync({ force: true });
      logger.info('✓ Database synchronized with FORCE (all data lost)');
    } else {
      await sequelize.sync({ alter: true });
      logger.info('✓ Database synchronized (tables updated)');
    }

    // Show created tables
    const tables = await sequelize.getQueryInterface().showAllTables();
    logger.info(`Tables in database: ${tables.join(', ')}`);

    // Show User model structure
    const userAttributes = User.getAttributes();
    const userFields = Object.keys(userAttributes).join(', ');
    logger.info(`User model fields: ${userFields}`);

    logger.info('✓ Database synchronization completed successfully!');

    // Create a test user (optional, only in dev)
    if (process.env['NODE_ENV'] === 'development' && force) {
      logger.info('Creating test user...');
      const bcrypt = await import('bcryptjs');
      const testUser = await User.create({
        email: 'test@ithaka.com',
        passwordHash: await bcrypt.hash('TestPass123!', 10),
        firstName: 'Test',
        lastName: 'User',
        pseudo: 'testuser',
        bio: 'This is a test user for development',
      });
      logger.info(`✓ Test user created: ${testUser.email} (ID: ${testUser.id})`);
      logger.info('  You can login with: test@ithaka.com / TestPass123!');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Database synchronization failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        logger.error('❌ Cannot connect to PostgreSQL. Make sure:');
        logger.error('   1. Docker container is running: docker ps');
        logger.error('   2. Port 5432 is not used by another process');
        logger.error('   3. DATABASE_URL in .env is correct');
      } else if (error.message.includes('authentication failed')) {
        logger.error('❌ PostgreSQL authentication failed. Check:');
        logger.error('   1. Username and password in DATABASE_URL');
        logger.error('   2. Database user exists and has permissions');
      }
    }

    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const force = args.includes('--force');

// Run synchronization
syncDatabase(force);
