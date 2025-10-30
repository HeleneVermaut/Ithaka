/**
 * Page Element Routes
 *
 * This module defines routes for page element CRUD operations:
 * - GET /api/page-elements - Get elements for a page
 * - POST /api/page-elements - Create new element
 * - PATCH /api/page-elements/:id - Update element
 * - DELETE /api/page-elements/:id - Delete element
 * - POST /api/page-elements/duplicate/:id - Duplicate element
 * - POST /api/page-elements/restore/:id - Restore deleted element
 *
 * All routes require JWT authentication.
 * Users can only access elements on pages they own.
 *
 * Security features:
 * - Authentication required for all endpoints
 * - Request validation with Joi schemas
 * - Authorization checks (ownership verification)
 * - Proper HTTP status codes and error handling
 *
 * Route ordering:
 * - Specific routes (e.g., /duplicate, /restore) must be before generic routes (e.g., /:id)
 * - Otherwise Express matches specific paths as /:id parameters
 *
 * @module routes/pageElementRoutes
 */

import { Router } from 'express';
import {
  handleGetPageElements,
  handleCreatePageElement,
  handleUpdatePageElement,
  handleDeletePageElement,
  handleDuplicatePageElement,
  handleRestorePageElement,
} from '../controllers/pageElementController';
import { authenticateUser } from '../middleware/authMiddleware';
import {
  validate,
  createPageElementSchema,
  updatePageElementSchema,
} from '../middleware/validation';
import { validateId } from '../middleware/uuidValidator';

const router = Router();

/**
 * All page element routes require authentication
 * Apply JWT authentication middleware to all routes in this router
 */
router.use(authenticateUser);

/**
 * @route   GET /api/page-elements
 * @desc    Get all elements for a page
 * @access  Private (requires JWT authentication)
 *
 * Query parameters:
 * - pageId: string (UUID, required) - The page to fetch elements from
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     elements: [
 *       {
 *         id: string,
 *         pageId: string,
 *         type: 'text' | 'image' | 'shape' | 'emoji' | 'sticker' | 'moodTracker',
 *         x: number,
 *         y: number,
 *         width: number,
 *         height: number,
 *         rotation: number,
 *         zIndex: number,
 *         content: object,
 *         style: object,
 *         createdAt: Date,
 *         updatedAt: Date
 *       }
 *     ],
 *     total: number (count of elements)
 *   }
 * }
 *
 * Error responses:
 * - 400: Missing or invalid pageId
 * - 401: Unauthorized (no JWT token)
 * - 403: User does not own the page
 * - 404: Page not found
 *
 * Note: Elements are sorted by zIndex (ascending, bottom to top)
 *
 * @example
 * GET /api/page-elements?pageId=550e8400-e29b-41d4-a716-446655440000
 */
router.get(
  '/',
  handleGetPageElements
);

/**
 * @route   POST /api/page-elements
 * @desc    Create a new page element
 * @access  Private (requires JWT authentication)
 *
 * Request body:
 * {
 *   pageId: string (UUID, required),
 *   type: 'text' | 'image' | 'shape' | 'emoji' | 'sticker' | 'moodTracker' (required),
 *   x: number (>= 0, required),
 *   y: number (>= 0, required),
 *   width: number (> 0, required),
 *   height: number (> 0, required),
 *   rotation: number (0-360, optional, default 0),
 *   zIndex: number (>= 0, optional),
 *   content: object (required, type-specific),
 *   style: object (optional),
 *   metadata: object (optional),
 *   stickerLibraryId: string (UUID, optional, for sticker type)
 * }
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   data: {
 *     id: string (newly generated UUID),
 *     pageId: string,
 *     type: string,
 *     x: number,
 *     y: number,
 *     width: number,
 *     height: number,
 *     rotation: number,
 *     zIndex: number,
 *     content: object,
 *     style: object,
 *     createdAt: Date,
 *     updatedAt: Date
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid input or validation error
 * - 401: Unauthorized (no JWT token)
 * - 403: User does not own the page
 * - 404: Page not found
 *
 * Content type-specific requirements:
 * - text: { text, fontFamily, fontSize, fill, ... }
 * - image: { url, originalWidth, originalHeight }
 * - shape: { shapeType, fillColor, strokeColor, ... }
 * - emoji: { code }
 * - sticker: { url } (must have stickerLibraryId)
 * - moodTracker: { mood, scale, notes, ... }
 */
router.post(
  '/',
  validate(createPageElementSchema, 'body'),
  handleCreatePageElement
);

/**
 * @route   POST /api/page-elements/duplicate/:id
 * @desc    Duplicate a page element (create copy with offset)
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: string (element UUID)
 *
 * Request body (optional):
 * {
 *   offset?: {
 *     x: number (default 20),
 *     y: number (default 20)
 *   }
 * }
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   data: {
 *     id: string (new UUID),
 *     pageId: string (same as original),
 *     type: string (same as original),
 *     x: number (original x + offset x),
 *     y: number (original y + offset y),
 *     width: number (same as original),
 *     height: number (same as original),
 *     rotation: number (same as original),
 *     zIndex: number (same as original),
 *     content: object (deep copy),
 *     style: object (deep copy),
 *     createdAt: Date (new timestamp),
 *     updatedAt: Date (new timestamp)
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid UUID format
 * - 401: Unauthorized (no JWT token)
 * - 403: User does not own the element's page
 * - 404: Element not found
 *
 * Default offset: +20px in both X and Y (standard visual offset for UX)
 *
 * @example
 * POST /api/page-elements/duplicate/abc12345-6789-0def-1234-567890abcdef
 * Body: { offset: { x: 30, y: 30 } }
 */
router.post(
  '/duplicate/:id',
  validateId,
  handleDuplicatePageElement
);

/**
 * @route   POST /api/page-elements/restore/:id
 * @desc    Restore a soft-deleted page element
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: string (element UUID)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     pageId: string,
 *     type: string,
 *     x: number,
 *     y: number,
 *     width: number,
 *     height: number,
 *     rotation: number,
 *     zIndex: number,
 *     content: object,
 *     style: object,
 *     deletedAt: null,
 *     updatedAt: Date (restoration timestamp)
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid UUID format or element is not deleted
 * - 401: Unauthorized (no JWT token)
 * - 403: User does not own the element's page
 * - 404: Element not found
 *
 * Note: Only elements with deletedAt timestamp can be restored
 *       Already-active elements return 400 error
 *
 * @example
 * POST /api/page-elements/restore/abc12345-6789-0def-1234-567890abcdef
 */
router.post(
  '/restore/:id',
  validateId,
  handleRestorePageElement
);

/**
 * @route   PATCH /api/page-elements/:id
 * @desc    Update a page element (partial update)
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: string (element UUID)
 *
 * Request body (all fields optional, but at least one required):
 * {
 *   x?: number (>= 0),
 *   y?: number (>= 0),
 *   width?: number (> 0),
 *   height?: number (> 0),
 *   rotation?: number (0-360),
 *   zIndex?: number (>= 0),
 *   content?: object,
 *   style?: object,
 *   metadata?: object
 * }
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     pageId: string,
 *     type: string,
 *     x: number,
 *     y: number,
 *     width: number,
 *     height: number,
 *     rotation: number,
 *     zIndex: number,
 *     content: object,
 *     style: object,
 *     updatedAt: Date
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid updates or validation error
 * - 401: Unauthorized (no JWT token)
 * - 403: User does not own the element's page
 * - 404: Element not found
 *
 * PATCH semantics: Only provided fields are updated
 * Immutable fields: id, pageId, type, createdAt, deletedAt
 *
 * @example
 * PATCH /api/page-elements/abc12345-6789-0def-1234-567890abcdef
 * Body: { x: 50, y: 75, zIndex: 2 }
 */
router.patch(
  '/:id',
  validateId,
  validate(updatePageElementSchema, 'body'),
  handleUpdatePageElement
);

/**
 * @route   DELETE /api/page-elements/:id
 * @desc    Delete a page element (soft delete)
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: string (element UUID)
 *
 * Response: 204 No Content
 * (Empty response body)
 *
 * Error responses:
 * - 400: Invalid UUID format
 * - 401: Unauthorized (no JWT token)
 * - 403: User does not own the element's page
 * - 404: Element not found
 *
 * Soft Delete:
 * - Sets deletedAt timestamp instead of removing record
 * - Element can be restored with POST /restore/:id
 * - Deleted elements are excluded from normal queries
 * - Hard delete can be done by admin if needed
 *
 * @example
 * DELETE /api/page-elements/abc12345-6789-0def-1234-567890abcdef
 */
router.delete(
  '/:id',
  validateId,
  handleDeletePageElement
);

export default router;
