/**
 * Server Entry Point
 *
 * This is the main entry point of the application. It:
 * 1. Loads environment variables
 * 2. Connects to the database
 * 3. Starts the Express server
 * 4. Handles graceful shutdown
 *
 * The server will not start if database connection fails, ensuring
 * the application only runs when fully configured.
 *
 * @module server
 */

import dotenv from 'dotenv';
import { logger } from './utils/logger';
import createApp from './app';
import { testDatabaseConnection, closeDatabaseConnection } from './config/database';

/**
 * Load environment variables from .env file
 * This must be done before any other code that uses process.env
 */
dotenv.config();

/**
 * Validate required environment variables
 * Throws an error and exits if critical configuration is missing
 */
const validateEnvironment = (): void => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error('Missing required environment variables', { missingVars });
    logger.error('Please check your .env file and ensure all required variables are set');
    process.exit(1);
  }

  logger.info('Environment variables validated successfully');
};

/**
 * Get server port from environment or use default
 * @returns {number} Port number for the server
 */
const getPort = (): number => {
  const port = process.env['PORT'];
  return port ? parseInt(port, 10) : 3000;
};

/**
 * Start the server
 * This async function handles all startup procedures
 */
const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting Ithaka API server...');

    // Validate environment configuration
    validateEnvironment();

    // Test database connection with retry logic
    logger.info('Connecting to database...');
    await testDatabaseConnection();

    // Create Express application
    const app = createApp();
    const port = getPort();

    // Start listening for requests
    const server = app.listen(port, () => {
      logger.info(`Server is running successfully`, {
        port,
        environment: process.env['NODE_ENV'] || 'development',
        nodeVersion: process.version,
      });
      logger.info(`Health check available at: http://localhost:${port}/health`);
      logger.info(`API available at: http://localhost:${port}/api`);
    });

    /**
     * Graceful Shutdown Handler
     * Ensures the server closes all connections properly before exiting
     */
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connections
          await closeDatabaseConnection();
          logger.info('Database connections closed');

          logger.info('Graceful shutdown completed successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Register shutdown handlers for different signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    /**
     * Unhandled Rejection Handler
     * Catches promise rejections that weren't handled with .catch()
     */
    process.on('unhandledRejection', (reason: any, _promise: Promise<any>) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
      });
      // In production, you might want to restart the server here
      // For now, we'll just log it
    });

    /**
     * Uncaught Exception Handler
     * Catches synchronous errors that weren't handled with try/catch
     */
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', {
        message: error.message,
        stack: error.stack,
      });
      // Uncaught exceptions are serious - we should exit and restart
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Start the server
startServer();
