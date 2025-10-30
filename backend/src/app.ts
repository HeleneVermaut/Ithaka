/**
 * Express Application Configuration
 *
 * This module sets up and configures the Express application with all
 * necessary middleware, routes, and error handlers.
 *
 * Middleware stack order is crucial:
 * 1. Security middleware (CORS, helmet)
 * 2. Body parsers (JSON, cookies)
 * 3. Logging
 * 4. Routes
 * 5. 404 handler
 * 6. Error handler (must be last)
 *
 * @module app
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

// Import all models to ensure they are initialized with Sequelize
// This must be done before the app starts to ensure all tables exist
import { User as _User, Notebook as _Notebook, NotebookPermissions as _NotebookPermissions, Page as _Page, PageElement as _PageElement, TokenBlacklist as _TokenBlacklist, UserSticker as _UserSticker } from './models';

// Use models in a void expression to satisfy TypeScript while keeping side effects
void _User, _Notebook, _NotebookPermissions, _Page, _PageElement, _TokenBlacklist, _UserSticker;

/**
 * Create and configure Express application
 *
 * @returns {Application} Configured Express application instance
 */
const createApp = (): Application => {
  const app: Application = express();

  /**
   * Helmet Security Middleware
   * Sets various HTTP headers to protect against common vulnerabilities
   * - XSS protection
   * - Clickjacking protection
   * - Content sniffing prevention
   * - HSTS (HTTP Strict Transport Security)
   * - Content Security Policy
   */
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", process.env['NODE_ENV'] === 'development' ? "'unsafe-inline'" : "'none'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for NaiveUI
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for development
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
  }));

  /**
   * CORS Configuration
   * Allows frontend applications to make requests to this API
   *
   * Important security settings:
   * - credentials: true - Allows cookies to be sent with requests
   * - origin - Only specified origins can make requests
   *
   * Security: In production, ALLOWED_ORIGINS must be explicitly configured.
   * In development, localhost origins are allowed as fallback.
   * This prevents accidental production deployment without proper CORS configuration.
   */
  const allowedOrigins = (process.env['ALLOWED_ORIGINS'] || '').split(',').filter(Boolean);

  // In development, allow localhost if no origins configured
  if (allowedOrigins.length === 0) {
    if (process.env['NODE_ENV'] === 'development') {
      allowedOrigins.push('http://localhost:3001', 'http://localhost:5173');
      logger.info('CORS: Using default localhost origins for development');
    } else {
      throw new Error('ALLOWED_ORIGINS must be defined in production environment');
    }
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn('CORS blocked request from unauthorized origin', { origin });
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true, // Allow cookies to be sent
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie'],
      maxAge: 86400, // 24 hours - how long to cache preflight requests
    })
  );

  /**
   * Body Parser Middleware
   * Parse incoming request bodies in JSON format
   * Limit: 10mb to prevent large payload attacks
   */
  app.use(express.json({ limit: '10mb' }));

  /**
   * URL-encoded Parser
   * Parse URL-encoded bodies (from HTML forms)
   */
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  /**
   * Cookie Parser Middleware
   * Parse cookies from request headers
   * Required for JWT authentication with httpOnly cookies
   *
   * Security: COOKIE_SECRET is required in production to prevent session forgery.
   * In development, a random secret is generated automatically.
   */
  let cookieSecret = process.env['COOKIE_SECRET'];

  if (!cookieSecret) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('COOKIE_SECRET must be defined in production environment');
    }
    // Generate random secret in development
    logger.warn('COOKIE_SECRET not set, generating random secret for development');
    cookieSecret = crypto.randomBytes(32).toString('hex');
  }

  app.use(cookieParser(cookieSecret));

  /**
   * Request Logging Middleware
   * Log all incoming requests for debugging and monitoring
   */
  app.use((req, _res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    });
    next();
  });

  /**
   * Health Check Endpoint
   * Verifies that the server and database are running properly
   * Used by load balancers and monitoring tools
   *
   * Returns:
   * - 200 OK: Server and database are healthy
   * - 503 Service Unavailable: Server is up but database is unreachable
   *
   * This endpoint is critical for production deployments where load balancers
   * need to know if the service can handle traffic. A server without database
   * connectivity should not receive traffic.
   */
  app.get('/health', async (_req, res) => {
    try {
      // Import sequelize here to avoid circular dependencies
      const { sequelize } = await import('./config/database');

      // Test database connectivity with a simple query
      await sequelize.authenticate();

      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env['NODE_ENV'] || 'development',
        database: 'connected',
      });
    } catch (error) {
      logger.error('Health check failed: Database unreachable', { error });

      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env['NODE_ENV'] || 'development',
        database: 'disconnected',
        message: 'Service unavailable - database connection failed',
      });
    }
  });

  /**
   * API Routes
   * All application routes are mounted under /api prefix
   */
  app.use('/api', routes);

  /**
   * 404 Handler
   * Catches all requests that don't match any defined routes
   * Must be registered AFTER all valid routes
   */
  app.use(notFoundHandler);

  /**
   * Global Error Handler
   * Catches all errors and formats them into consistent responses
   * Must be registered LAST, after all other middleware and routes
   */
  app.use(errorHandler);

  return app;
};

export default createApp;
