/**
 * Page Element Controller
 *
 * Handles HTTP requests for page element CRUD operations.
 * Delegates business logic to elementService.
 * All responses follow standardized JSON format: { success: boolean, data?: any, error?: string }
 *
 * @module controllers/elementController
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as elementService from '../services/elementService';
import { logger } from '../utils/logger';

/**
 * Get all elements for a page
 *
 * @route GET /api/pages/:pageId/elements
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * GET /api/pages/987f6543-e21c-34d5-b678-901234567890/elements
 * Response: { success: true, data: [{ id: '...', type: 'text', zIndex: 0, ... }] }
 */
export const handleGetPageElements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { pageId } = req.params as { pageId: string };

    logger.debug(`Fetching elements for page: ${pageId}`);

    const elements = await elementService.getElementsByPage(pageId, userId);

    res.json({
      success: true,
      data: elements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch create/update elements for a page
 *
 * Processes array of elements:
 * - Elements without 'id' field are created
 * - Elements with 'id' field are updated
 *
 * @route POST /api/pages/:pageId/elements
 * @param {Request} req - Express request with body: Array of elements
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * POST /api/pages/987f6543-e21c-34d5-b678-901234567890/elements
 * Body: [
 *   { "type": "text", "x": 10, "y": 10, "width": 100, "height": 50, "content": {...} },
 *   { "id": "existing-id", "x": 20, "y": 20 }
 * ]
 * Response: { success: true, data: { created: 1, updated: 1 } }
 */
export const handleBatchSaveElements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { pageId } = req.params as { pageId: string };
    const elementsArray = req.body;

    logger.debug(`Batch saving ${elementsArray.length} elements for page: ${pageId}`);

    const result = await elementService.createBatchElements(
      pageId,
      elementsArray,
      userId
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a single element
 *
 * @route PUT /api/elements/:elementId
 * @param {Request} req - Express request with body: Partial element updates
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * PUT /api/elements/abc12345-6789-0def-1234-567890abcdef
 * Body: { "x": 15, "y": 15, "zIndex": 2 }
 * Response: { success: true, data: { id: '...', x: 15, y: 15, zIndex: 2, ... } }
 */
export const handleUpdateElement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { elementId } = req.params as { elementId: string };
    const updates = req.body;

    logger.debug(`Updating element: ${elementId}`, { updates });

    const element = await elementService.updateElement(elementId, updates, userId);

    res.json({
      success: true,
      data: element,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an element (soft delete via paranoid mode)
 *
 * @route DELETE /api/elements/:elementId
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * DELETE /api/elements/abc12345-6789-0def-1234-567890abcdef
 * Response: { success: true, data: null }
 */
export const handleDeleteElement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { elementId } = req.params as { elementId: string };

    logger.debug(`Deleting element: ${elementId}`);

    await elementService.deleteElement(elementId, userId);

    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
