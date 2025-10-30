/**
 * Page Element Controller
 *
 * Handles HTTP requests for page element CRUD operations:
 * - Get all elements for a page
 * - Create new element
 * - Update element (PATCH semantics)
 * - Delete element (soft delete)
 * - Duplicate element with optional offset
 * - Restore soft-deleted element
 *
 * All operations require JWT authentication.
 * Users can only access/modify elements on pages they own.
 *
 * Security features:
 * - Input validation with Joi schemas
 * - Authorization checks (verify user owns the page)
 * - Comprehensive error handling
 * - No sensitive data in responses
 *
 * @module controllers/pageElementController
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as elementService from '../services/elementService';
import { logger } from '../utils/logger';

/**
 * Get all page elements for a specific page
 *
 * Retrieves all non-deleted elements on a page, ordered by zIndex (ascending).
 * Verifies user owns the page before returning elements.
 *
 * @route GET /api/page-elements?pageId=uuid
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * GET /api/page-elements?pageId=550e8400-e29b-41d4-a716-446655440000
 * Authorization: Bearer eyJhbGc...
 *
 * Response 200 OK:
 * {
 *   success: true,
 *   data: {
 *     elements: [
 *       {
 *         id: "element-1",
 *         pageId: "page-uuid",
 *         type: "text",
 *         x: 10,
 *         y: 20,
 *         width: 100,
 *         height: 50,
 *         rotation: 0,
 *         zIndex: 0,
 *         content: { text: "Hello", fontFamily: "Arial", fontSize: 16, fill: "#000000" },
 *         style: {},
 *         createdAt: "2024-01-15T10:30:00Z",
 *         updatedAt: "2024-01-15T10:30:00Z"
 *       }
 *     ],
 *     total: 1
 *   }
 * }
 *
 * Error 400 Bad Request: Missing or invalid pageId
 * Error 403 Forbidden: User does not own the page
 * Error 404 Not Found: Page does not exist
 */
export const handleGetPageElements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const pageId = req.query['pageId'] as string | undefined;

    if (!pageId) {
      res.status(400).json({
        success: false,
        error: 'pageId query parameter is required',
      });
      return;
    }

    logger.debug(`Fetching elements for page: ${pageId}`);

    const result = await elementService.getElementsByPage(pageId, userId);

    res.status(200).json({
      success: true,
      data: {
        elements: result,
        total: result.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new page element
 *
 * Creates a new element on a page. Validates user owns the page before creation.
 * Element type determines required content properties (text, image, shape, emoji, sticker).
 *
 * @route POST /api/page-elements
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * POST /api/page-elements
 * Authorization: Bearer eyJhbGc...
 *
 * Body:
 * {
 *   pageId: "550e8400-e29b-41d4-a716-446655440000",
 *   type: "text",
 *   x: 10,
 *   y: 20,
 *   width: 100,
 *   height: 50,
 *   content: {
 *     text: "Hello World",
 *     fontFamily: "Arial",
 *     fontSize: 16,
 *     fill: "#000000",
 *     textAlign: "left"
 *   },
 *   style: {}
 * }
 *
 * Response 201 Created:
 * {
 *   success: true,
 *   data: {
 *     id: "element-uuid",
 *     pageId: "page-uuid",
 *     type: "text",
 *     x: 10,
 *     y: 20,
 *     width: 100,
 *     height: 50,
 *     rotation: 0,
 *     zIndex: 0,
 *     content: { text: "Hello World", fontFamily: "Arial", fontSize: 16, fill: "#000000", textAlign: "left" },
 *     style: {},
 *     createdAt: "2024-01-15T10:30:00Z",
 *     updatedAt: "2024-01-15T10:30:00Z"
 *   }
 * }
 *
 * Error 400 Bad Request: Invalid input
 * Error 403 Forbidden: User does not own the page
 * Error 404 Not Found: Page does not exist
 */
export const handleCreatePageElement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const elementData = req.body;

    logger.debug(`Creating page element on page: ${elementData.pageId}`);

    const element = await elementService.createElement(
      elementData.pageId,
      elementData,
      userId
    );

    res.status(201).json({
      success: true,
      data: element,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a page element
 *
 * Partially updates specified fields of an existing element (PATCH semantics).
 * Verifies user owns the page before allowing update.
 * Only mutable fields can be updated: x, y, width, height, rotation, zIndex, content, style, metadata.
 *
 * @route PATCH /api/page-elements/:id
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * PATCH /api/page-elements/abc12345-6789-0def-1234-567890abcdef
 * Authorization: Bearer eyJhbGc...
 *
 * Body:
 * {
 *   x: 50,
 *   y: 75,
 *   zIndex: 2,
 *   content: { text: "Updated text" }
 * }
 *
 * Response 200 OK:
 * {
 *   success: true,
 *   data: {
 *     id: "element-uuid",
 *     pageId: "page-uuid",
 *     type: "text",
 *     x: 50,
 *     y: 75,
 *     width: 100,
 *     height: 50,
 *     rotation: 0,
 *     zIndex: 2,
 *     content: { text: "Updated text" },
 *     style: {},
 *     updatedAt: "2024-01-15T11:45:00Z"
 *   }
 * }
 *
 * Error 400 Bad Request: Invalid updates
 * Error 403 Forbidden: User does not own the element's page
 * Error 404 Not Found: Element does not exist
 */
export const handleUpdatePageElement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const elementId = req.params['id'] as string;
    const updates = req.body;

    logger.debug(`Updating element: ${elementId}`, { updates });

    const element = await elementService.updateElement(elementId, updates, userId);

    res.status(200).json({
      success: true,
      data: element,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a page element (soft delete)
 *
 * Soft-deletes an element by setting deletedAt timestamp (paranoid mode).
 * Element can be restored with the restore endpoint.
 * Verifies user owns the page before allowing deletion.
 *
 * @route DELETE /api/page-elements/:id
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * DELETE /api/page-elements/abc12345-6789-0def-1234-567890abcdef
 * Authorization: Bearer eyJhbGc...
 *
 * Response 204 No Content
 * (Empty response body)
 *
 * Error 403 Forbidden: User does not own the element's page
 * Error 404 Not Found: Element does not exist
 */
export const handleDeletePageElement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const elementId = req.params['id'] as string;

    logger.debug(`Deleting element: ${elementId}`);

    await elementService.deleteElement(elementId, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate a page element
 *
 * Creates an exact copy of an element on the same page with optional offset.
 * Default offset: +20px in both X and Y directions.
 * Duplicated element gets new UUID and updated timestamps.
 *
 * @route POST /api/page-elements/duplicate/:id
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * POST /api/page-elements/duplicate/abc12345-6789-0def-1234-567890abcdef
 * Authorization: Bearer eyJhbGc...
 *
 * Body (optional):
 * {
 *   offset: {
 *     x: 30,
 *     y: 30
 *   }
 * }
 *
 * Response 201 Created:
 * {
 *   success: true,
 *   data: {
 *     id: "new-element-uuid",
 *     pageId: "page-uuid",
 *     type: "text",
 *     x: 30,  // original x (10) + offset (20)
 *     y: 40,  // original y (20) + offset (20)
 *     width: 100,
 *     height: 50,
 *     rotation: 0,
 *     zIndex: 0,
 *     content: { ...same as original },
 *     style: { ...same as original },
 *     createdAt: "2024-01-15T10:35:00Z",
 *     updatedAt: "2024-01-15T10:35:00Z"
 *   }
 * }
 *
 * Error 403 Forbidden: User does not own the element's page
 * Error 404 Not Found: Element does not exist
 */
export const handleDuplicatePageElement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const elementId = req.params['id'] as string;
    const { offset } = req.body || {};

    logger.debug(`Duplicating element: ${elementId}`, { offset });

    const duplicatedElement = await elementService.duplicateElement(
      elementId,
      userId,
      offset
    );

    res.status(201).json({
      success: true,
      data: duplicatedElement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Restore a soft-deleted page element
 *
 * Restores a previously soft-deleted element by clearing deletedAt timestamp.
 * Element must have been deleted (deletedAt not null) to restore it.
 * Verifies user owns the page before allowing restoration.
 *
 * @route POST /api/page-elements/restore/:id
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * POST /api/page-elements/restore/abc12345-6789-0def-1234-567890abcdef
 * Authorization: Bearer eyJhbGc...
 *
 * Response 200 OK:
 * {
 *   success: true,
 *   data: {
 *     id: "element-uuid",
 *     pageId: "page-uuid",
 *     type: "text",
 *     x: 10,
 *     y: 20,
 *     width: 100,
 *     height: 50,
 *     rotation: 0,
 *     zIndex: 0,
 *     content: { text: "Hello", fontFamily: "Arial", fontSize: 16, fill: "#000000" },
 *     style: {},
 *     deletedAt: null,
 *     updatedAt: "2024-01-15T10:40:00Z"
 *   }
 * }
 *
 * Error 400 Bad Request: Element is not deleted (deletedAt is null)
 * Error 403 Forbidden: User does not own the element's page
 * Error 404 Not Found: Element does not exist
 */
export const handleRestorePageElement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const elementId = req.params['id'] as string;

    logger.debug(`Restoring element: ${elementId}`);

    const element = await elementService.restoreElement(elementId, userId);

    res.status(200).json({
      success: true,
      data: element,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  handleGetPageElements,
  handleCreatePageElement,
  handleUpdatePageElement,
  handleDeletePageElement,
  handleDuplicatePageElement,
  handleRestorePageElement,
};
