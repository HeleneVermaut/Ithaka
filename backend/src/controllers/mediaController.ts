/**
 * Media Controller
 *
 * Handles HTTP requests for media operations:
 * - File upload to Cloudinary and PageElement creation
 * - Image transformations (brightness, contrast, saturation, crop, rotation, flip)
 *
 * All responses follow standardized JSON format: { success: boolean, data?: any, error?: string }
 * All operations require JWT authentication.
 *
 * Security features:
 * - Input validation with Joi schemas
 * - File validation (type, size, safety checks)
 * - Authorization checks (user can only modify their own elements)
 * - Comprehensive error handling
 * - No sensitive data in responses
 *
 * @module controllers/mediaController
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as mediaService from '../services/mediaService';
import { logger } from '../utils/logger';
import { isSafeFile } from '../utils/fileValidation';

/**
 * Extends AuthRequest to include Multer file property
 */
interface FileRequest extends AuthRequest {
  file?: Express.Multer.File;
}

/**
 * Upload media file to Cloudinary and create PageElement
 *
 * Multipart FormData handler that:
 * 1. Validates file (type, size, safety)
 * 2. Uploads to Cloudinary
 * 3. Creates PageElement in database
 * 4. Returns element with Cloudinary metadata
 *
 * @route POST /api/media/upload
 * @param {AuthRequest} req - Express request with authenticated user and file
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * POST /api/media/upload
 * Content-Type: multipart/form-data
 * Authorization: Bearer eyJhbGc...
 *
 * Body:
 * - file: (binary file data)
 * - pageId: 550e8400-e29b-41d4-a716-446655440000
 *
 * Response 201 Created:
 * {
 *   success: true,
 *   data: {
 *     id: "element-uuid",
 *     pageId: "page-uuid",
 *     type: "image",
 *     cloudinaryUrl: "https://res.cloudinary.com/...",
 *     cloudinaryPublicId: "/users/user-id/media/element-id",
 *     width: 1920,
 *     height: 1080,
 *     x: 0,
 *     y: 0,
 *     zIndex: 0,
 *     rotation: 0,
 *     content: { url: "https://res.cloudinary.com/..." },
 *     style: {},
 *     createdAt: "2024-01-15T10:30:00Z"
 *   }
 * }
 *
 * Error 400 Bad Request: Invalid file format/size
 * Error 413 Payload Too Large: File exceeds 10 MB
 * Error 500 Internal Server Error: Cloudinary upload failed
 */
export const handleUploadMedia = async (
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

    logger.debug(`Processing media upload for user: ${userId}`, {
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

    // Extract page ID from request body
    const pageId = (req.body['pageId'] || req.query['pageId']) as string | undefined;
    if (!pageId) {
      res.status(400).json({
        success: false,
        error: 'pageId is required in request body or query',
      });
      return;
    }

    // Upload media and create PageElement
    const element = await mediaService.uploadMediaAndCreateElement(
      userId,
      pageId,
      req.file
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
 * Apply image transformation to media
 *
 * Applies Cloudinary transformations to an existing media element:
 * - Crop (x, y, width, height)
 * - Brightness (-100 to 100)
 * - Contrast (-100 to 100)
 * - Saturation (-100 to 100)
 * - Rotation (0, 90, 180, 270 degrees)
 * - Flip (horizontal or vertical)
 *
 * Returns transformed URL and updated metadata without modifying database.
 * Element can then apply transformation or save it permanently via PATCH.
 *
 * @route POST /api/media/:id/transform
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 *
 * @example
 * POST /api/media/abc12345-6789-0def-1234-567890abcdef/transform
 * Authorization: Bearer eyJhbGc...
 *
 * Body:
 * {
 *   crop: {
 *     x: 100,
 *     y: 100,
 *     width: 400,
 *     height: 300
 *   },
 *   brightness: 20,
 *   contrast: 10,
 *   saturation: -15,
 *   rotation: 90,
 *   flip: "horizontal"
 * }
 *
 * Response 200 OK:
 * {
 *   success: true,
 *   data: {
 *     cloudinaryUrl: "https://res.cloudinary.com/.../c_crop,x_100,y_100,w_400,h_300,e_brightness:20,e_contrast:10,e_saturation:-15,a_90,fl_h/...",
 *     metadata: {
 *       width: 400,
 *       height: 300,
 *       crop: { x: 100, y: 100, width: 400, height: 300 },
 *       adjustments: {
 *         brightness: 20,
 *         contrast: 10,
 *         saturation: -15,
 *         rotation: 90,
 *         flip: "horizontal"
 *       }
 *     }
 *   }
 * }
 *
 * Error 400 Bad Request: Invalid transformation parameters
 * Error 404 Not Found: Element does not exist
 * Error 500 Internal Server Error: Transformation failed
 */
export const handleTransformImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const elementId = req.params['id'] as string;
    const transformations = req.body;

    logger.debug(`Transforming media element: ${elementId}`, {
      transformations,
    });

    // Apply transformations and get transformed URL
    const result = await mediaService.transformImage(
      userId,
      elementId,
      transformations
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  handleUploadMedia,
  handleTransformImage,
};
