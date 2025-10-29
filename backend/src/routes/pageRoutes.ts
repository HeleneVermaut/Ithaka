/**
 * Page and Element Routes
 *
 * This module defines all routes related to page and element management:
 * - GET /api/notebooks/:notebookId/pages - List pages in notebook
 * - POST /api/notebooks/:notebookId/pages - Create page
 * - GET /api/pages/:pageId - Get page details
 * - PUT /api/pages/:pageId - Update page
 * - DELETE /api/pages/:pageId - Delete page
 * - GET /api/pages/:pageId/elements - Get page elements
 * - POST /api/pages/:pageId/elements - Batch create/update elements
 * - PUT /api/elements/:elementId - Update element
 * - DELETE /api/elements/:elementId - Delete element
 *
 * Security features:
 * - JWT authentication on all routes (authMiddleware)
 * - Authorization checks via services
 * - Request validation with Joi schemas
 * - Proper HTTP status codes
 *
 * @module routes/pageRoutes
 */

import { Router } from 'express';
import { authenticateUser } from '../middleware/authMiddleware';
import {
  validate,
  createPageSchema,
  updatePageSchema,
  batchElementsSchema,
  updateElementSchema,
} from '../middleware/validation';
import {
  handleGetPages,
  handleCreatePage,
  handleGetPage,
  handleUpdatePage,
  handleDeletePage,
} from '../controllers/pageController';
import {
  handleGetPageElements,
  handleBatchSaveElements,
  handleUpdateElement,
  handleDeleteElement,
} from '../controllers/elementController';
import { validateNotebookId, validatePageId, validateElementId } from '../middleware/uuidValidator';

const router = Router();

/**
 * ============================================================================
 * PAGE ROUTES
 * ============================================================================
 */

/**
 * @route   GET /api/notebooks/:notebookId/pages
 * @desc    List all pages in a notebook
 * @access  Private (requires JWT authentication)
 *
 * Path Parameters:
 * - notebookId: string (UUID)
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "page-uuid",
 *       "notebookId": "notebook-uuid",
 *       "pageNumber": 1,
 *       "isCustomCover": false,
 *       "createdAt": "2024-10-28T10:00:00Z",
 *       "updatedAt": "2024-10-28T10:00:00Z"
 *     }
 *   ]
 * }
 *
 * Error: 400 Bad Request (invalid UUID), 401 Unauthorized, 404 Not Found
 */
router.get(
  '/notebooks/:notebookId/pages',
  authenticateUser,
  validateNotebookId,
  handleGetPages
);

/**
 * @route   POST /api/notebooks/:notebookId/pages
 * @desc    Create a new page in a notebook
 * @access  Private (requires JWT authentication)
 *
 * Path Parameters:
 * - notebookId: string (UUID)
 *
 * Request Body:
 * {
 *   "pageNumber": number (required),
 *   "isCustomCover": boolean (optional, default: false)
 * }
 *
 * Response: 201 Created
 * {
 *   "success": true,
 *   "data": {
 *     "id": "new-page-uuid",
 *     "notebookId": "notebook-uuid",
 *     "pageNumber": 1,
 *     "isCustomCover": false,
 *     "createdAt": "2024-10-28T10:00:00Z",
 *     "updatedAt": "2024-10-28T10:00:00Z"
 *   }
 * }
 *
 * Error: 400 Bad Request (invalid UUID or validation error), 401 Unauthorized, 404 Not Found
 */
router.post(
  '/notebooks/:notebookId/pages',
  authenticateUser,
  validateNotebookId,
  validate(createPageSchema, 'body'),
  handleCreatePage
);

/**
 * @route   GET /api/pages/:pageId
 * @desc    Get a single page by ID
 * @access  Private (requires JWT authentication)
 *
 * Path Parameters:
 * - pageId: string (UUID)
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "id": "page-uuid",
 *     "notebookId": "notebook-uuid",
 *     "pageNumber": 1,
 *     "isCustomCover": false,
 *     "createdAt": "2024-10-28T10:00:00Z",
 *     "updatedAt": "2024-10-28T10:00:00Z"
 *   }
 * }
 *
 * Error: 400 Bad Request (invalid UUID), 401 Unauthorized, 404 Not Found
 */
router.get(
  '/pages/:pageId',
  authenticateUser,
  validatePageId,
  handleGetPage
);

/**
 * @route   PUT /api/pages/:pageId
 * @desc    Update page metadata
 * @access  Private (requires JWT authentication)
 *
 * Path Parameters:
 * - pageId: string (UUID)
 *
 * Request Body:
 * {
 *   "pageNumber": number (optional),
 *   "isCustomCover": boolean (optional)
 * }
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "id": "page-uuid",
 *     "notebookId": "notebook-uuid",
 *     "pageNumber": 2,
 *     "isCustomCover": true,
 *     "createdAt": "2024-10-28T10:00:00Z",
 *     "updatedAt": "2024-10-28T11:00:00Z"
 *   }
 * }
 *
 * Error: 400 Bad Request (invalid UUID or validation error), 401 Unauthorized, 404 Not Found
 */
router.put(
  '/pages/:pageId',
  authenticateUser,
  validatePageId,
  validate(updatePageSchema, 'body'),
  handleUpdatePage
);

/**
 * @route   DELETE /api/pages/:pageId
 * @desc    Delete a page
 * @access  Private (requires JWT authentication)
 *
 * Path Parameters:
 * - pageId: string (UUID)
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": null
 * }
 *
 * Error: 400 Bad Request (invalid UUID), 401 Unauthorized, 404 Not Found
 */
router.delete(
  '/pages/:pageId',
  authenticateUser,
  validatePageId,
  handleDeletePage
);

/**
 * ============================================================================
 * PAGE ELEMENT ROUTES
 * ============================================================================
 */

/**
 * @route   GET /api/pages/:pageId/elements
 * @desc    Get all elements for a page (ordered by zIndex)
 * @access  Private (requires JWT authentication)
 *
 * Path Parameters:
 * - pageId: string (UUID)
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "element-uuid",
 *       "pageId": "page-uuid",
 *       "type": "text",
 *       "x": 10,
 *       "y": 10,
 *       "width": 100,
 *       "height": 50,
 *       "rotation": 0,
 *       "zIndex": 0,
 *       "content": { "text": "Hello", "fontFamily": "Roboto", ... },
 *       "style": { "opacity": 1 },
 *       "metadata": {},
 *       "createdAt": "2024-10-28T10:00:00Z",
 *       "updatedAt": "2024-10-28T10:00:00Z"
 *     }
 *   ]
 * }
 *
 * Error: 400 Bad Request (invalid UUID), 401 Unauthorized, 404 Not Found
 */
router.get(
  '/pages/:pageId/elements',
  authenticateUser,
  validatePageId,
  handleGetPageElements
);

/**
 * @route   POST /api/pages/:pageId/elements
 * @desc    Batch create/update elements for a page
 * @access  Private (requires JWT authentication)
 *
 * Path Parameters:
 * - pageId: string (UUID)
 *
 * Request Body (array of elements):
 * [
 *   {
 *     "type": "text" (required if creating),
 *     "x": number (required if creating),
 *     "y": number (required if creating),
 *     "width": number (required if creating),
 *     "height": number (required if creating),
 *     "rotation": number (optional),
 *     "zIndex": number (optional),
 *     "content": {} (required if creating),
 *     "style": {} (optional),
 *     "metadata": {} (optional)
 *   },
 *   {
 *     "id": "element-uuid" (present when updating),
 *     "x": number (optional),
 *     "y": number (optional),
 *     ...
 *   }
 * ]
 *
 * Response: 201 Created
 * {
 *   "success": true,
 *   "data": {
 *     "created": 1,
 *     "updated": 1
 *   }
 * }
 *
 * Error: 400 Bad Request (invalid UUID or validation error), 401 Unauthorized, 404 Not Found
 */
router.post(
  '/pages/:pageId/elements',
  authenticateUser,
  validatePageId,
  (req, res, next) => validate(batchElementsSchema as any, 'body')(req, res, next),
  handleBatchSaveElements
);

/**
 * @route   PUT /api/elements/:elementId
 * @desc    Update a single element
 * @access  Private (requires JWT authentication)
 *
 * Path Parameters:
 * - elementId: string (UUID)
 *
 * Request Body (partial update):
 * {
 *   "x": number (optional),
 *   "y": number (optional),
 *   "width": number (optional),
 *   "height": number (optional),
 *   "rotation": number (optional),
 *   "zIndex": number (optional),
 *   "content": {} (optional),
 *   "style": {} (optional),
 *   "metadata": {} (optional)
 * }
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "id": "element-uuid",
 *     "pageId": "page-uuid",
 *     "type": "text",
 *     "x": 15,
 *     "y": 15,
 *     ...
 *   }
 * }
 *
 * Error: 400 Bad Request (invalid UUID or validation error), 401 Unauthorized, 404 Not Found
 */
router.put(
  '/elements/:elementId',
  authenticateUser,
  validateElementId,
  validate(updateElementSchema, 'body'),
  handleUpdateElement
);

/**
 * @route   DELETE /api/elements/:elementId
 * @desc    Delete an element (soft delete)
 * @access  Private (requires JWT authentication)
 *
 * Path Parameters:
 * - elementId: string (UUID)
 *
 * Response: 200 OK
 * {
 *   "success": true,
 *   "data": null
 * }
 *
 * Error: 400 Bad Request (invalid UUID), 401 Unauthorized, 404 Not Found
 */
router.delete(
  '/elements/:elementId',
  authenticateUser,
  validateElementId,
  handleDeleteElement
);

export default router;
