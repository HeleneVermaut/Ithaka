/**
 * Main Routes Index
 *
 * This module serves as the central routing hub for the API.
 * All route modules are imported and mounted here, providing a single
 * entry point for the entire API route structure.
 *
 * Route organization:
 * - /api/auth - Authentication routes (login, register, refresh token)
 * - /api/users - User management routes
 * - /api/notebooks - Notebook CRUD operations
 * - /api/pages - Page management within notebooks
 * - /api/elements - Page elements (text, images)
 * - /api/export - Export functionality (PDF generation)
 *
 * @module routes/index
 */

import { Router } from 'express';
import { logger } from '../utils/logger';

/**
 * Main API router
 * All routes will be prefixed with /api (configured in app.ts)
 */
const router = Router();

/**
 * Root API endpoint
 * Provides API information and available endpoints
 */
router.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to Ithaka API',
    version: '1.0.0',
    documentation: '/api/docs', // Future Swagger documentation URL
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      notebooks: '/api/notebooks',
      legal: '/api/legal',
      pages: '/api/pages',
      elements: '/api/elements',
      export: '/api/export',
    },
  });
});

/**
 * Authentication Routes
 * Handles user registration, login, logout, token refresh, and password reset
 */
import authRoutes from './authRoutes';
router.use('/auth', authRoutes);

/**
 * User Routes
 * Handles user profile management (view, update, password change)
 */
import userRoutes from './userRoutes';
router.use('/users', userRoutes);

/**
 * Notebook Routes
 * Handles notebook CRUD operations (create, read, update, delete)
 */
import notebookRoutes from './notebookRoutes';
router.use('/notebooks', notebookRoutes);

/**
 * Legal Routes
 * Handles legal documents (privacy policy, terms of service)
 * GDPR compliance - Articles 13 & 14
 */
import legalRoutes from './legalRoutes';
router.use('/legal', legalRoutes);

/**
 * Page and Element Routes
 * Handles page CRUD operations and page element management
 */
import pageRoutes from './pageRoutes';
router.use(pageRoutes);

/**
 * Export Routes
 * TODO: Import and mount export routes when implemented
 * Example:
 * import exportRoutes from './exportRoutes';
 * router.use('/export', exportRoutes);
 */

logger.info('Routes initialized');

export default router;
