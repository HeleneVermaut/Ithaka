/**
 * Sticker Library Controller
 *
 * Handles HTTP requests for user sticker library management:
 * - Get user's stickers (with optional filtering and sorting)
 * - Upload sticker to personal library
 * - Rename sticker and update tags
 * - Delete sticker from library (also deletes from Cloudinary)
 *
 * All operations require JWT authentication.
 * Users can only access/manage their own stickers.
 *
 * Security features:
 * - Input validation with Joi schemas
 * - User ownership verification (userId matching)
 * - File validation (type, size, safety)
 * - Comprehensive error handling
 * - No sensitive data in responses
 *
 * @module controllers/stickerLibraryController
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as stickerService from '../services/stickerLibraryService';
import { logger } from '../utils/logger';
import { isSafeFile } from '../utils/fileValidation';

/**
 * Extends AuthRequest to include Multer file property
 */
interface FileRequest extends AuthRequest {
  file?: Express.Multer.File;
}

/**
 * Get user's sticker library
 *
 * Retrieves all stickers in user's personal library with optional filtering.
 * Returns only stickers owned by the authenticated user.
 *
 * Query parameters (optional):
 * - tags: comma-separated tag strings to filter by
 * - isPublic: boolean to filter public/private stickers
 * - sortBy: field to sort by (name, createdAt, usageCount, default: createdAt)
 * - order: ASC or DESC (default: DESC)
 * - page: pagination page number (default: 1)
 * - limit: results per page (default: 20, max: 100)
 *
 * @route GET /api/user-library/stickers
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * GET /api/user-library/stickers?tags=nature,animal&sortBy=name&order=ASC&page=1&limit=20
 * Authorization: Bearer eyJhbGc...
 *
 * Response 200 OK:
 * {
 *   success: true,
 *   data: {
 *     stickers: [
 *       {
 *         id: "sticker-uuid",
 *         userId: "user-uuid",
 *         name: "Autumn Leaf",
 *         cloudinaryUrl: "https://res.cloudinary.com/.../autumn-leaf.png",
 *         cloudinaryPublicId: "/users/user-id/stickers/sticker-id",
 *         thumbnailUrl: "https://res.cloudinary.com/.../w_100,h_100,c_fit/autumn-leaf.png",
 *         tags: ["nature", "animal"],
 *         isPublic: false,
 *         usageCount: 5,
 *         createdAt: "2024-01-15T10:30:00Z",
 *         updatedAt: "2024-01-15T10:30:00Z"
 *       }
 *     ],
 *     pagination: {
 *       currentPage: 1,
 *       limit: 20,
 *       total: 42,
 *       totalPages: 3
 *     }
 *   }
 * }
 *
 * Error 400 Bad Request: Invalid query parameters
 * Error 500 Internal Server Error: Database error
 */
export const handleGetStickerLibrary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const tagsQuery = req.query['tags'] as string | undefined;
    const isPublicQuery = req.query['isPublic'] as string | undefined;
    const sortByQuery = req.query['sortBy'] as string | undefined;
    const orderQuery = req.query['order'] as string | undefined;
    const pageQuery = req.query['page'] as string | undefined;
    const limitQuery = req.query['limit'] as string | undefined;

    const sortByValue = (sortByQuery || 'createdAt') as 'name' | 'createdAt' | 'usageCount';
    const orderValue = (orderQuery || 'DESC') as 'ASC' | 'DESC';

    const filters = {
      tags: tagsQuery ? tagsQuery.split(',') : undefined,
      isPublic: isPublicQuery ? isPublicQuery === 'true' : undefined,
      sortBy: sortByValue,
      order: orderValue,
      page: parseInt(pageQuery || '1', 10) || 1,
      limit: Math.min(parseInt(limitQuery || '20', 10) || 20, 100),
    };

    logger.debug(`Fetching sticker library for user: ${userId}`, { filters });

    const result = await stickerService.getUserStickers(userId, filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload sticker to user's library
 *
 * Handles multipart FormData upload of sticker image.
 * Validates file, uploads to Cloudinary, creates UserSticker record.
 *
 * Form fields:
 * - file: image file (JPEG, PNG, SVG only)
 * - name: sticker name (required, 1-100 chars)
 * - tags: comma-separated tags (optional, max 10 tags, each 1-30 chars)
 *
 * @route POST /api/user-library/stickers
 * @param {AuthRequest} req - Express request with authenticated user and file
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * POST /api/user-library/stickers
 * Content-Type: multipart/form-data
 * Authorization: Bearer eyJhbGc...
 *
 * Body:
 * - file: (binary image file)
 * - name: "Autumn Leaf"
 * - tags: "nature,seasonal,leaf"
 *
 * Response 201 Created:
 * {
 *   success: true,
 *   data: {
 *     id: "sticker-uuid",
 *     userId: "user-uuid",
 *     name: "Autumn Leaf",
 *     cloudinaryUrl: "https://res.cloudinary.com/.../autumn-leaf.png",
 *     cloudinaryPublicId: "/users/user-id/stickers/sticker-id",
 *     thumbnailUrl: "https://res.cloudinary.com/.../w_100,h_100,c_fit/autumn-leaf.png",
 *     tags: ["nature", "seasonal", "leaf"],
 *     isPublic: false,
 *     usageCount: 0,
 *     createdAt: "2024-01-15T10:30:00Z",
 *     updatedAt: "2024-01-15T10:30:00Z"
 *   }
 * }
 *
 * Error 400 Bad Request: Invalid file or sticker name
 * Error 413 Payload Too Large: File exceeds 10 MB
 * Error 500 Internal Server Error: Cloudinary upload or database error
 */
export const handleUploadStickerToLibrary = async (
  req: FileRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Validate file exists (middleware should have already checked)
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'File is required',
      });
      return;
    }

    logger.debug(`Processing sticker upload for user: ${userId}`, {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Validate file safety (type, size, null bytes, etc.)
    try {
      isSafeFile(
        req.file.originalname,
        req.file.mimetype,
        req.file.buffer
      );
    } catch (validationError: any) {
      logger.warn(`File validation failed for user ${userId}:`, validationError.message);
      res.status(400).json({
        success: false,
        error: validationError.message,
      });
      return;
    }

    // Extract sticker metadata from request body
    const name = req.body.name as string | undefined;
    const tagsStr = req.body.tags as string | undefined;
    const tags = tagsStr
      ? tagsStr.split(',').map((t: string) => t.trim())
      : [];

    if (!name) {
      res.status(400).json({
        success: false,
        error: 'Sticker name is required',
      });
      return;
    }

    // Upload sticker and create UserSticker record
    const sticker = await stickerService.uploadStickerToLibrary(
      userId,
      name,
      tags,
      req.file
    );

    res.status(201).json({
      success: true,
      data: sticker,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rename sticker and update tags
 *
 * Updates the name and/or tags of an existing sticker.
 * Verifies user owns the sticker before allowing update.
 *
 * @route PATCH /api/user-library/stickers/:id
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * PATCH /api/user-library/stickers/sticker-uuid
 * Authorization: Bearer eyJhbGc...
 *
 * Body:
 * {
 *   newName: "Autumn Maple Leaf",
 *   newTags: ["nature", "tree", "fall", "seasonal"]
 * }
 *
 * Response 200 OK:
 * {
 *   success: true,
 *   data: {
 *     id: "sticker-uuid",
 *     userId: "user-uuid",
 *     name: "Autumn Maple Leaf",
 *     cloudinaryUrl: "https://res.cloudinary.com/.../autumn-leaf.png",
 *     cloudinaryPublicId: "/users/user-id/stickers/sticker-id",
 *     thumbnailUrl: "https://res.cloudinary.com/.../w_100,h_100,c_fit/autumn-leaf.png",
 *     tags: ["nature", "tree", "fall", "seasonal"],
 *     isPublic: false,
 *     usageCount: 5,
 *     updatedAt: "2024-01-15T11:45:00Z"
 *   }
 * }
 *
 * Error 400 Bad Request: Invalid new name or tags
 * Error 403 Forbidden: User does not own the sticker
 * Error 404 Not Found: Sticker does not exist
 */
export const handleRenameStickerr = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const stickerId = req.params['id'] as string;
    const { newName, newTags } = req.body;

    logger.debug(`Renaming sticker: ${stickerId}`, {
      newName,
      newTags,
    });

    const sticker = await stickerService.renameStickerr(
      userId,
      stickerId,
      newName,
      newTags
    );

    res.status(200).json({
      success: true,
      data: sticker,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete sticker from library
 *
 * Permanently deletes a sticker from user's library and from Cloudinary.
 * This is a hard delete and cannot be undone.
 * Verifies user owns the sticker before allowing deletion.
 *
 * @route DELETE /api/user-library/stickers/:id
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * DELETE /api/user-library/stickers/sticker-uuid
 * Authorization: Bearer eyJhbGc...
 *
 * Response 204 No Content
 * (Empty response body)
 *
 * Error 403 Forbidden: User does not own the sticker
 * Error 404 Not Found: Sticker does not exist
 * Error 500 Internal Server Error: Cloudinary deletion failed
 */
export const handleDeleteStickerFromLibrary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const stickerId = req.params['id'] as string;

    logger.debug(`Deleting sticker: ${stickerId}`);

    await stickerService.deleteStickerFromLibrary(userId, stickerId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export default {
  handleGetStickerLibrary,
  handleUploadStickerToLibrary,
  handleRenameStickerr,
  handleDeleteStickerFromLibrary,
};
