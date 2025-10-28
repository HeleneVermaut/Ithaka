/**
 * Page Controller
 *
 * Handles HTTP requests for page CRUD operations.
 * Delegates business logic to pageService.
 * All responses follow standardized JSON format: { success: boolean, data?: any, error?: string }
 *
 * @module controllers/pageController
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as pageService from '../services/pageService';
import { logger } from '../utils/logger';

/**
 * Get all pages in a notebook
 *
 * @route GET /api/notebooks/:notebookId/pages
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * GET /api/notebooks/123e4567-e89b-12d3-a456-426614174000/pages
 * Response: { success: true, data: [{ id: '...', pageNumber: 1, ... }] }
 */
export const handleGetPages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { notebookId } = req.params as { notebookId: string };

    logger.debug(`Fetching pages for notebook: ${notebookId}`);

    const pages = await pageService.getPagesByNotebook(notebookId, userId);

    res.json({
      success: true,
      data: pages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new page in a notebook
 *
 * @route POST /api/notebooks/:notebookId/pages
 * @param {Request} req - Express request with body: { pageNumber, isCustomCover? }
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * POST /api/notebooks/123e4567-e89b-12d3-a456-426614174000/pages
 * Body: { "pageNumber": 1, "isCustomCover": false }
 * Response: { success: true, data: { id: '...', notebookId: '...', pageNumber: 1, ... } }
 */
export const handleCreatePage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { notebookId } = req.params as { notebookId: string };
    const { pageNumber, isCustomCover = false } = req.body;

    logger.debug(`Creating page in notebook: ${notebookId}, page number: ${pageNumber}`);

    const page = await pageService.createPage(
      notebookId,
      pageNumber,
      isCustomCover,
      userId
    );

    res.status(201).json({
      success: true,
      data: page,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single page by ID
 *
 * @route GET /api/pages/:pageId
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * GET /api/pages/987f6543-e21c-34d5-b678-901234567890
 * Response: { success: true, data: { id: '...', pageNumber: 1, ... } }
 */
export const handleGetPage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { pageId } = req.params as { pageId: string };

    logger.debug(`Fetching page: ${pageId}`);

    const page = await pageService.getPageById(pageId, userId);

    res.json({
      success: true,
      data: page,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update page metadata
 *
 * @route PUT /api/pages/:pageId
 * @param {Request} req - Express request with body: { pageNumber?, isCustomCover? }
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * PUT /api/pages/987f6543-e21c-34d5-b678-901234567890
 * Body: { "pageNumber": 2, "isCustomCover": true }
 * Response: { success: true, data: { id: '...', pageNumber: 2, isCustomCover: true, ... } }
 */
export const handleUpdatePage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { pageId } = req.params as { pageId: string };
    const updates = req.body;

    logger.debug(`Updating page: ${pageId}`, { updates });

    const page = await pageService.updatePage(pageId, updates, userId);

    res.json({
      success: true,
      data: page,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a page
 *
 * @route DELETE /api/pages/:pageId
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * DELETE /api/pages/987f6543-e21c-34d5-b678-901234567890
 * Response: { success: true, data: null }
 */
export const handleDeletePage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { pageId } = req.params as { pageId: string };

    logger.debug(`Deleting page: ${pageId}`);

    await pageService.deletePage(pageId, userId);

    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
