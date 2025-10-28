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
 * Batch create/update elements for a page with automatic retry logic
 *
 * Processes array of elements:
 * - Elements without 'id' field are created
 * - Elements with 'id' field are updated
 *
 * Implements retry mechanism with exponential backoff:
 * - Maximum 3 retry attempts
 * - Delays: 1s, 2s, 4s (2^(n-1) * 1000ms)
 * - Logs each retry attempt for debugging
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
 * Response: { success: true, data: { created: 1, updated: 1, elements: [...] } }
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

    // Execute with retry logic
    const result = await executeWithRetry(
      () => elementService.createBatchElements(pageId, elementsArray, userId),
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        operationName: `batch-save-elements-${pageId}`
      }
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
 * Execute async operation with exponential backoff retry logic
 *
 * Automatically retries failed operations with exponential backoff delays.
 * Useful for handling transient failures (network issues, temporary DB locks, etc.)
 *
 * @template T - Return type of the operation
 * @param operation - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to operation result
 * @throws Error if operation fails after all retries
 *
 * @example
 * const result = await executeWithRetry(
 *   () => fetchUserData(userId),
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * );
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries || 3;
  const baseDelayMs = options.baseDelayMs || 1000;
  const operationName = options.operationName || 'operation';

  let lastError: Error | null = null;
  let currentAttempt = 0;

  while (currentAttempt < maxRetries) {
    currentAttempt++;

    try {
      logger.debug(`Executing ${operationName} (attempt ${currentAttempt}/${maxRetries})`);
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isLastAttempt = currentAttempt >= maxRetries;

      if (isLastAttempt) {
        logger.error(
          `${operationName} failed after ${maxRetries} attempts:`,
          error
        );
        throw error;
      }

      // Calculate exponential backoff delay: 2^(attempt-1) * baseDelayMs
      const delayMs = Math.pow(2, currentAttempt - 1) * baseDelayMs;
      logger.warn(
        `${operationName} attempt ${currentAttempt} failed, retrying in ${delayMs}ms:`,
        error.message
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // This should not be reached, but throw error just in case
  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
}

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
