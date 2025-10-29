/**
 * Notebook Routes
 *
 * This module defines all routes related to notebook management:
 * - POST /api/notebooks - Create a new notebook
 * - GET /api/notebooks - List notebooks with pagination/filtering
 * - GET /api/notebooks/archived - List archived notebooks
 * - GET /api/notebooks/:id - Get a notebook by ID
 * - PUT /api/notebooks/:id - Update a notebook
 * - DELETE /api/notebooks/:id - Delete a notebook
 * - POST /api/notebooks/:id/duplicate - Duplicate a notebook
 * - PUT /api/notebooks/:id/archive - Archive a notebook
 * - PUT /api/notebooks/:id/restore - Restore an archived notebook
 *
 * All routes require JWT authentication.
 * Users can only access and modify their own notebooks.
 *
 * Security features:
 * - Authentication required for all endpoints
 * - Request validation with Joi schemas for create/update
 * - Ownership validation in service layer
 *
 * Route ordering:
 * - Specific routes (e.g., /archived) are registered BEFORE generic routes (e.g., /:id)
 * - This prevents Express from matching /archived as an :id parameter
 *
 * @module routes/notebookRoutes
 */

import { Router } from 'express';
import {
  handleCreateNotebook,
  handleGetNotebook,
  handleUpdateNotebook,
  handleDeleteNotebook,
  handleGetNotebooks,
  handleDuplicateNotebook,
  handleArchiveNotebook,
  handleRestoreNotebook,
  handleGetArchivedNotebooks,
} from '../controllers/notebookController';
import { authenticateUser } from '../middleware/authMiddleware';
import {
  validate,
  createNotebookSchema,
  updateNotebookSchema,
} from '../middleware/validation';
import { createRateLimiter } from '../middleware/rateLimiter';
import { validateId } from '../middleware/uuidValidator';

const router = Router();

/**
 * All notebook routes require authentication
 * Apply JWT authentication middleware to all routes in this router
 */
router.use(authenticateUser);

/**
 * Rate limiter for notebook creation
 * Limit: 10 notebooks per hour per user
 * Protects against excessive notebook creation and storage abuse
 */
const notebookCreateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // Max 10 notebooks per hour per IP
  'Too many notebooks created. Please try again later (max 10 per hour).'
);

/**
 * IMPORTANT: Route ordering matters in Express!
 * Specific routes (like /archived) must be registered BEFORE generic routes (like /:id)
 * Otherwise, Express will match /archived as /:id with id="archived"
 */

/**
 * @route   GET /api/notebooks/archived
 * @desc    Get archived notebooks with pagination
 * @access  Private (requires JWT authentication)
 *
 * Query parameters:
 * - page?: number (default 1)
 * - limit?: number (default 12, max 100)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     notebooks: [
 *       {
 *         id: string,
 *         userId: string,
 *         title: string,
 *         status: 'archived',
 *         archivedAt: Date,
 *         permissions: { id, notebookId, type },
 *         ...
 *       }
 *     ],
 *     pagination: {
 *       currentPage: number,
 *       limit: number,
 *       total: number,
 *       totalPages: number
 *     }
 *   }
 * }
 */
router.get(
  '/archived',
  handleGetArchivedNotebooks
);

/**
 * @route   GET /api/notebooks
 * @desc    List notebooks with pagination, filtering, and sorting
 * @access  Private (requires JWT authentication)
 *
 * Query parameters:
 * - page?: number (default 1)
 * - limit?: number (default 12, max 100)
 * - sort?: string (default 'createdAt') - createdAt, title, pageCount, updatedAt, type
 * - order?: 'ASC' | 'DESC' (default 'DESC')
 * - type?: string (comma-separated) - Voyage, Daily, Reportage
 * - status?: string - active (default), archived, all
 * - search?: string (case-insensitive partial match in title)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     notebooks: [...],
 *     pagination: {
 *       currentPage: number,
 *       limit: number,
 *       total: number,
 *       totalPages: number
 *     }
 *   }
 * }
 */
router.get(
  '/',
  handleGetNotebooks
);

/**
 * @route   POST /api/notebooks
 * @desc    Create a new notebook
 * @access  Private (requires JWT authentication)
 *
 * Request body:
 * {
 *   title: string (required, 1-100 chars),
 *   description?: string (optional, max 300 chars),
 *   type: 'Voyage' | 'Daily' | 'Reportage' (required),
 *   format: 'A4' | 'A5' (required),
 *   orientation: 'portrait' | 'landscape' (required),
 *   dpi?: number (optional, 72-600, default 300),
 *   coverImageUrl?: string (optional, valid URI, max 2048 chars)
 * }
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   message: "Notebook created successfully",
 *   data: {
 *     id: string,
 *     userId: string,
 *     title: string,
 *     description?: string,
 *     type: string,
 *     format: string,
 *     orientation: string,
 *     dpi: number,
 *     pageCount: number,
 *     status: 'active',
 *     coverImageUrl?: string,
 *     permissions: { id, notebookId, type: 'private' },
 *     owner: { id, firstName, lastName, email },
 *     createdAt: Date,
 *     updatedAt: Date
 *   }
 * }
 */
/**
 * @route   POST /api/notebooks
 * @desc    Create a new notebook (with rate limiting)
 * @access  Private (requires JWT authentication)
 *
 * Rate limiting:
 * - Max 10 notebooks per hour per IP address
 * - Returns 429 Too Many Requests when limit exceeded
 * - Protects against storage abuse and excessive resource usage
 */
router.post(
  '/',
  notebookCreateLimiter,
  validate(createNotebookSchema, 'body'),
  handleCreateNotebook
);

/**
 * @route   POST /api/notebooks/:id/duplicate
 * @desc    Duplicate a notebook (create a copy)
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: Notebook UUID
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   message: "Notebook duplicated successfully",
 *   data: {
 *     id: string (new UUID),
 *     userId: string,
 *     title: string (with "(copie)" suffix),
 *     ...
 *     pageCount: 0,
 *     status: 'active',
 *     permissions: { id, notebookId, type: 'private' },
 *     owner: { id, firstName, lastName, email }
 *   }
 * }
 *
 * Error: 400 Bad Request (invalid UUID), 404 Not Found (if notebook doesn't exist or user is not the owner)
 */
router.post(
  '/:id/duplicate',
  validateId,
  handleDuplicateNotebook
);

/**
 * @route   PUT /api/notebooks/:id/archive
 * @desc    Archive a notebook
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: Notebook UUID
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: "Notebook archived successfully",
 *   data: {
 *     id: string,
 *     userId: string,
 *     title: string,
 *     status: 'archived',
 *     archivedAt: Date,
 *     ...
 *   }
 * }
 *
 * Error: 400 Bad Request (invalid UUID), 404 Not Found (if notebook doesn't exist or user is not the owner)
 */
router.put(
  '/:id/archive',
  validateId,
  handleArchiveNotebook
);

/**
 * @route   PUT /api/notebooks/:id/restore
 * @desc    Restore an archived notebook
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: Notebook UUID
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: "Notebook restored successfully",
 *   data: {
 *     id: string,
 *     userId: string,
 *     title: string,
 *     status: 'active',
 *     archivedAt: null,
 *     ...
 *   }
 * }
 *
 * Error: 400 Bad Request (invalid UUID), 404 Not Found (if notebook doesn't exist or user is not the owner)
 */
router.put(
  '/:id/restore',
  validateId,
  handleRestoreNotebook
);

/**
 * @route   GET /api/notebooks/:id
 * @desc    Get a notebook by ID
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: Notebook UUID
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     userId: string,
 *     title: string,
 *     description?: string,
 *     type: string,
 *     format: string,
 *     orientation: string,
 *     dpi: number,
 *     pageCount: number,
 *     status: string,
 *     coverImageUrl?: string,
 *     permissions: { id, notebookId, type },
 *     owner: { id, firstName, lastName, email },
 *     createdAt: Date,
 *     updatedAt: Date
 *   }
 * }
 *
 * Error: 400 Bad Request (invalid UUID), 404 Not Found (if notebook doesn't exist or user is not the owner)
 */
router.get(
  '/:id',
  validateId,
  handleGetNotebook
);

/**
 * @route   PUT /api/notebooks/:id
 * @desc    Update a notebook
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: Notebook UUID
 *
 * Request body (all fields optional, but at least one required):
 * {
 *   title?: string (1-100 chars),
 *   description?: string (max 300 chars),
 *   coverImageUrl?: string (valid URI, max 2048 chars),
 *   dpi?: number (72-600)
 * }
 *
 * Note: Immutable fields (type, format, orientation) cannot be updated
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: "Notebook updated successfully",
 *   data: {
 *     id: string,
 *     userId: string,
 *     title: string,
 *     description?: string,
 *     type: string,
 *     format: string,
 *     orientation: string,
 *     dpi: number,
 *     pageCount: number,
 *     status: string,
 *     coverImageUrl?: string,
 *     permissions: { id, notebookId, type },
 *     owner: { id, firstName, lastName, email },
 *     updatedAt: Date
 *   }
 * }
 *
 * Error: 400 Bad Request (invalid UUID or validation error), 404 Not Found (if notebook doesn't exist or user is not the owner)
 */
router.put(
  '/:id',
  validateId,
  validate(updateNotebookSchema, 'body'),
  handleUpdateNotebook
);

/**
 * @route   DELETE /api/notebooks/:id
 * @desc    Delete a notebook (hard delete)
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: Notebook UUID
 *
 * Response: 204 No Content
 * (No response body)
 *
 * Error: 400 Bad Request (invalid UUID), 404 Not Found (if notebook doesn't exist or user is not the owner)
 *
 * Note: This is a hard delete. The notebook and all associated data
 * (NotebookPermissions) are permanently removed from the database.
 * Use the archive endpoint for soft delete functionality.
 */
router.delete(
  '/:id',
  validateId,
  handleDeleteNotebook
);

export default router;
