/**
 * Saved Texts Controller
 *
 * This controller handles HTTP requests for managing user's saved text library.
 * All endpoints require authentication and validate request data.
 *
 * Endpoints:
 * - GET /api/users/saved-texts - Get all saved texts for user
 * - POST /api/users/saved-texts - Create new saved text
 * - PUT /api/users/saved-texts/:id - Update existing saved text
 * - DELETE /api/users/saved-texts/:id - Delete saved text
 *
 * @module controllers/savedTextsController
 */

import { Request, Response, NextFunction } from 'express';
import userProfileService from '../services/userProfileService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Get all saved texts for authenticated user
 *
 * Returns all text elements in the user's personal library,
 * ordered by creation date (newest first).
 *
 * @async
 * @param {Request} req - Express request object (userId from authMiddleware)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void} Sends JSON response with saved texts array
 *
 * @example
 * GET /api/users/saved-texts
 * Response: { success: true, data: [{...}, {...}] }
 */
export const handleGetSavedTexts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId; // Set by authMiddleware

    logger.debug('Getting saved texts', { userId });

    const savedTexts = await userProfileService.getSavedTexts(userId);

    res.json({
      success: true,
      data: savedTexts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new saved text in user's library
 *
 * Adds a new text element to the user's personal library with validation.
 * Auto-generates ID and timestamps.
 *
 * @async
 * @param {Request} req - Express request object with body containing SavedText data
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void} Sends JSON response (201) with newly created saved text
 *
 * @example
 * POST /api/users/saved-texts
 * Body: { label: "Chapter 1", content: "...", fontSize: 32, ... }
 * Response: { success: true, message: "...", data: { id: "uuid", ... } }
 */
export const handleAddSavedText = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId; // Set by authMiddleware
    const textData = req.body;

    logger.debug('Adding saved text', { userId, label: textData.label });

    const newText = await userProfileService.addSavedText(userId, textData);

    res.status(201).json({
      success: true,
      message: 'Text saved to library successfully',
      data: newText,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing saved text
 *
 * Updates one or more fields in a saved text element.
 * Preserves createdAt, updates updatedAt automatically.
 *
 * @async
 * @param {Request} req - Express request object with ID param and update data in body
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void} Sends JSON response (200) with updated saved text
 *
 * @example
 * PUT /api/users/saved-texts/text-uuid
 * Body: { fontSize: 36, color: "#333333" }
 * Response: { success: true, message: "...", data: { id: "text-uuid", ... } }
 */
export const handleUpdateSavedText = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId; // Set by authMiddleware
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      throw new AppError('Text ID is required', 400);
    }

    logger.debug('Updating saved text', { userId, textId: id });

    const updatedText = await userProfileService.updateSavedText(userId, id, updates);

    res.json({
      success: true,
      message: 'Text updated successfully',
      data: updatedText,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete saved text from user's library
 *
 * Permanently removes a text element from the user's library.
 *
 * @async
 * @param {Request} req - Express request object with ID param
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void} Sends JSON response (200) with success message
 *
 * @example
 * DELETE /api/users/saved-texts/text-uuid
 * Response: { success: true, message: "Text deleted successfully" }
 */
export const handleDeleteSavedText = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId; // Set by authMiddleware
    const { id } = req.params;

    if (!id) {
      throw new AppError('Text ID is required', 400);
    }

    logger.debug('Deleting saved text', { userId, textId: id });

    await userProfileService.deleteSavedText(userId, id);

    res.json({
      success: true,
      message: 'Text deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  handleGetSavedTexts,
  handleAddSavedText,
  handleUpdateSavedText,
  handleDeleteSavedText,
};
