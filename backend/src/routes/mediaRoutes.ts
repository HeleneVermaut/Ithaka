/**
 * Media Routes
 *
 * This module defines routes for media operations:
 * - POST /api/media/upload - Upload media file to Cloudinary
 * - POST /api/media/:id/transform - Apply image transformations
 *
 * All routes require JWT authentication.
 * File upload is handled via Multer middleware with in-memory storage.
 *
 * Security features:
 * - Authentication required for all endpoints
 * - File validation (format, size, safety)
 * - Multipart file size limit: 10 MB
 * - Request validation with Joi schemas
 *
 * @module routes/mediaRoutes
 */

import { Router } from 'express';
import multer from 'multer';
import {
  handleUploadMedia,
  handleTransformImage,
} from '../controllers/mediaController';
import { authenticateUser } from '../middleware/authMiddleware';
import {
  validate,
  uploadMediaSchema,
  transformImageSchema,
  validateFileUpload,
} from '../middleware/validation';

const router = Router();

/**
 * Configure Multer for in-memory file storage
 * Files are kept in memory (Buffer) before being uploaded to Cloudinary
 * This avoids disk I/O and temporary file management
 *
 * Configuration:
 * - storage: Memory storage (no disk writes)
 * - limits.fileSize: 10 MB maximum
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

/**
 * All media routes require authentication
 * Apply JWT authentication middleware to all routes in this router
 */
router.use(authenticateUser);

/**
 * @route   POST /api/media/upload
 * @desc    Upload media file and create PageElement
 * @access  Private (requires JWT authentication)
 *
 * Request (multipart/form-data):
 * - file: Image file (JPEG, PNG, SVG only, max 10 MB)
 * - pageId: UUID of page where element will be created
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   data: {
 *     id: string (element UUID),
 *     pageId: string (page UUID),
 *     type: "image",
 *     cloudinaryUrl: string (Cloudinary URL),
 *     cloudinaryPublicId: string,
 *     width: number (image width in pixels),
 *     height: number (image height in pixels),
 *     x: number (default 0),
 *     y: number (default 0),
 *     zIndex: number (default 0),
 *     rotation: number (default 0),
 *     content: { url: string },
 *     style: {},
 *     createdAt: Date,
 *     updatedAt: Date
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid file format, size, or missing pageId
 * - 401: Unauthorized (no JWT token)
 * - 403: User does not own the page
 * - 404: Page not found
 * - 413: File too large (> 10 MB)
 * - 500: Cloudinary upload failed
 *
 * Supported file types:
 * - image/jpeg (.jpg, .jpeg)
 * - image/png (.png)
 * - image/svg+xml (.svg)
 *
 * Security:
 * - File extension and MIME type validation
 * - File size validation (max 10 MB)
 * - Null byte scanning
 * - User ownership verification
 *
 * @example
 * const formData = new FormData();
 * formData.append('file', fileInput.files[0]);
 * formData.append('pageId', '550e8400-e29b-41d4-a716-446655440000');
 *
 * const response = await fetch('/api/media/upload', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer eyJhbGc...'
 *   },
 *   body: formData
 * });
 */
router.post(
  '/upload',
  upload.single('file'),
  validateFileUpload,
  validate(uploadMediaSchema, 'body'),
  handleUploadMedia
);

/**
 * @route   POST /api/media/:id/transform
 * @desc    Apply transformations to media (image)
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: PageElement UUID (must be of type 'image')
 *
 * Request body:
 * {
 *   crop?: {
 *     x: number (>= 0),
 *     y: number (>= 0),
 *     width: number (> 0),
 *     height: number (> 0)
 *   },
 *   brightness?: number (-100 to 100),
 *   contrast?: number (-100 to 100),
 *   saturation?: number (-100 to 100),
 *   rotation?: number (0, 90, 180, or 270),
 *   flip?: 'horizontal' | 'vertical'
 * }
 *
 * Note: At least one transformation must be provided
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     cloudinaryUrl: string (transformed URL with Cloudinary effects),
 *     metadata: {
 *       width: number (new width after crop),
 *       height: number (new height after crop),
 *       crop: { x, y, width, height },
 *       adjustments: {
 *         brightness: number,
 *         contrast: number,
 *         saturation: number,
 *         rotation: number,
 *         flip: string
 *       }
 *     }
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid transformation parameters or missing required data
 * - 401: Unauthorized (no JWT token)
 * - 403: User does not own the element's page
 * - 404: Element not found
 * - 500: Transformation failed
 *
 * Transformation limits:
 * - Brightness: -100 (very dark) to 100 (very bright)
 * - Contrast: -100 (flat) to 100 (high contrast)
 * - Saturation: -100 (grayscale) to 100 (oversaturated)
 * - Rotation: Only 0, 90, 180, 270 degrees
 * - Flip: Horizontal (mirror) or Vertical (flip)
 * - Crop: Must be within image bounds
 *
 * Note: Transformations are previewed and not saved to database automatically.
 * Frontend should call PATCH /api/page-elements/:id with updated content/style
 * to permanently apply transformations.
 *
 * @example
 * const response = await fetch('/api/media/abc12345-6789-0def-1234-567890abcdef/transform', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer eyJhbGc...'
 *   },
 *   body: JSON.stringify({
 *     crop: { x: 100, y: 100, width: 400, height: 300 },
 *     brightness: 20,
 *     contrast: 10
 *   })
 * });
 */
router.post(
  '/:id/transform',
  validate(transformImageSchema, 'body'),
  handleTransformImage
);

export default router;
