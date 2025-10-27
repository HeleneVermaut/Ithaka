/**
 * Database Configuration Module
 *
 * This module sets up the connection to PostgreSQL using Sequelize ORM.
 * Sequelize is an Object-Relational Mapping (ORM) tool that allows us to
 * interact with the database using JavaScript/TypeScript instead of raw SQL.
 *
 * Key features:
 * - Connects to PostgreSQL database
 * - Handles connection pooling for performance
 * - Provides logging for database queries
 * - Implements retry logic for connection failures
 *
 * @module config/database
 */

import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';

/**
 * Validate that required database configuration exists
 * Throws an error if DATABASE_URL is not set in environment variables
 *
 * @throws {Error} If DATABASE_URL is not configured
 */
const validateDatabaseConfig = (): void => {
  if (!process.env['DATABASE_URL']) {
    logger.error('DATABASE_URL is not defined in environment variables');
    throw new Error('Database configuration error: DATABASE_URL is required');
  }
};

/**
 * Initialize Sequelize instance with PostgreSQL connection
 *
 * The connection string format is:
 * postgres://username:password@host:port/database
 *
 * Connection pool settings:
 * - max: Maximum number of connections in pool (20)
 * - min: Minimum number of connections in pool (0)
 * - acquire: Maximum time (ms) to get connection before timeout (30000)
 * - idle: Maximum time (ms) connection can be idle before release (10000)
 */
validateDatabaseConfig();

/**
 * Sequelize instance configured for PostgreSQL
 * This is the main database connection object used throughout the application
 *
 * @constant {Sequelize}
 */
export const sequelize = new Sequelize(process.env['DATABASE_URL'] as string, {
  dialect: 'postgres',

  /**
   * Connection pool configuration
   * Manages multiple database connections for better performance
   */
  pool: {
    max: 20,        // Maximum 20 concurrent connections
    min: 0,         // Minimum 0 connections when idle
    acquire: 30000, // Maximum wait time to acquire connection: 30 seconds
    idle: 10000,    // Maximum idle time before releasing connection: 10 seconds
  },

  /**
   * Logging configuration
   * In development, log all SQL queries
   * In production, disable logging for performance
   */
  logging: process.env['NODE_ENV'] === 'development'
    ? (msg) => logger.debug('Sequelize Query', msg)
    : false,

  /**
   * Define settings
   * Controls default behavior for all models
   */
  define: {
    timestamps: true,      // Automatically add createdAt and updatedAt fields
    underscored: true,     // Use snake_case for automatically added fields
    freezeTableName: true, // Use model name as table name (don't pluralize)
  },

  /**
   * Timezone configuration
   * Store all timestamps in UTC for consistency across timezones
   */
  timezone: '+00:00',
});

/**
 * Test the database connection
 *
 * This function attempts to connect to the database and verify that
 * authentication is successful. It should be called when the server starts.
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If connection fails after all retry attempts
 *
 * @example
 * // In server.ts
 * try {
 *   await testDatabaseConnection();
 *   console.log('Database connected successfully');
 * } catch (error) {
 *   console.error('Failed to connect to database');
 *   process.exit(1);
 * }
 */
export const testDatabaseConnection = async (): Promise<void> => {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info('Database connection established successfully', {
        dialect: sequelize.getDialect(),
        database: sequelize.getDatabaseName(),
      });
      return;
    } catch (error) {
      logger.error(`Database connection attempt ${attempt}/${maxRetries} failed`, error);

      if (attempt === maxRetries) {
        logger.error('Max retry attempts reached. Could not connect to database.');
        throw new Error('Failed to connect to database after multiple attempts');
      }

      logger.info(`Retrying database connection in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};

/**
 * Synchronize all models with the database
 *
 * This function creates tables for all defined models if they don't exist.
 * Use with caution in production - it can drop existing tables if { force: true }.
 *
 * @async
 * @param {boolean} force - If true, drop existing tables before creating new ones (DANGEROUS!)
 * @returns {Promise<void>}
 *
 * @example
 * // In development
 * await syncDatabase(false); // Safe: only creates missing tables
 *
 * // NEVER in production
 * await syncDatabase(true); // DANGEROUS: drops all data!
 */
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    if (force && process.env['NODE_ENV'] === 'production') {
      logger.error('Attempted to force sync database in production - BLOCKED');
      throw new Error('Force sync is not allowed in production environment');
    }

    await sequelize.sync({ force });

    if (force) {
      logger.warn('Database synchronized with force=true (all tables dropped and recreated)');
    } else {
      logger.info('Database synchronized successfully (tables created if not exists)');
    }
  } catch (error) {
    logger.error('Database synchronization failed', error);
    throw error;
  }
};

/**
 * Close database connection gracefully
 *
 * This function should be called when the server is shutting down
 * to ensure all database connections are properly closed.
 *
 * @async
 * @returns {Promise<void>}
 *
 * @example
 * // In server shutdown handler
 * process.on('SIGTERM', async () => {
 *   await closeDatabaseConnection();
 *   process.exit(0);
 * });
 */
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database connection closed successfully');
  } catch (error) {
    logger.error('Error closing database connection', error);
    throw error;
  }
};

export default sequelize;
