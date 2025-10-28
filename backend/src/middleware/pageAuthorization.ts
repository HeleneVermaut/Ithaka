/**
 * Page Authorization Middleware
 *
 * This middleware verifies that the requesting user owns the notebook containing a given page.
 * Applied to all page and element routes to enforce access control and prevent unauthorized
 * access to other users' content.
 *
 * Security Model:
 * - Extracts pageId from route parameters
 * - Verifies page exists and user owns its parent notebook
 * - Returns 404 for both "not found" and "unauthorized" cases (privacy preserving)
 * - Attaches page to request object for use in route handlers
 *
 * @module middleware/pageAuthorization
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { Page, Notebook } from '../models';
import { logger } from '../utils/logger';

/**
 * Extend Express Request type to include page property
 * Allows route handlers to access the page without re-querying the database
 */
declare global {
  namespace Express {
    interface Request {
      page?: Page;
    }
  }
}

/**
 * Check page ownership middleware
 *
 * Verifies that the requesting user owns the notebook containing the specified page.
 * This middleware should be applied to all routes that operate on specific pages.
 *
 * Performs the following checks:
 * 1. Extracts pageId from route params
 * 2. Fetches the page with its parent notebook
 * 3. Verifies the page exists
 * 4. Verifies the user owns the notebook
 * 5. Attaches page to request for handler use
 * 6. Calls next() to proceed
 *
 * Returns 404 for both not-found and unauthorized cases to preserve privacy.
 *
 * @param {Request} req - Express request object (must have user from authMiddleware)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @throws {AppError} - 400 if pageId missing, 404 if page not found or unauthorized
 *
 * @example
 * // In routes
 * router.get(
 *   '/api/pages/:pageId',
 *   authMiddleware,
 *   checkPageOwnership,
 *   handleGetPage
 * );
 */
export const checkPageOwnership = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Extract user ID from authentication middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      logger.warn('checkPageOwnership: user not authenticated', { path: req.path });
      throw new AppError('Unauthorized', 401);
    }

    // Extract page ID from URL parameters
    const pageId = req.params['pageId'];
    if (!pageId) {
      logger.warn('checkPageOwnership: pageId missing from params', { path: req.path });
      throw new AppError('Page ID is required', 400);
    }

    // Fetch page
    const page = await Page.findByPk(pageId);

    // Check if page exists
    if (!page) {
      logger.info('checkPageOwnership: page not found', {
        pageId,
        userId,
      });
      // Return 404 for both not-found and unauthorized (privacy preserving)
      throw new AppError('Page not found', 404);
    }

    // Check if user owns the page's notebook
    const notebook = await Notebook.findByPk(page.notebookId);
    if (!notebook || notebook.userId !== userId) {
      logger.info('checkPageOwnership: user does not own page', {
        pageId,
        userId,
        notebookUserId: notebook?.userId,
      });
      // Return 404 instead of 403 to preserve privacy (don't leak page existence)
      throw new AppError('Page not found', 404);
    }

    // Attach page to request for use in route handlers
    // This avoids duplicate database queries in controllers
    req.page = page;

    // Proceed to next middleware/handler
    next();
  } catch (error) {
    // Pass errors to error handler middleware
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('checkPageOwnership: unexpected error', {
        error,
        pageId: req.params['pageId'],
        userId: (req as any).user?.id,
      });
      next(new AppError('Internal server error', 500));
    }
  }
};

export default checkPageOwnership;
