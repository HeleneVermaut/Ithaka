/**
 * Sticker Library Routes
 *
 * This module defines routes for user sticker library management:
 * - GET /api/user-library/stickers - Get user's stickers
 * - POST /api/user-library/stickers - Upload sticker
 * - PATCH /api/user-library/stickers/:id - Rename/update sticker
 * - DELETE /api/user-library/stickers/:id - Delete sticker
 *
 * All routes require JWT authentication.
 * Users can only access and manage their own stickers.
 *
 * Security features:
 * - Authentication required for all endpoints
 * - File validation (format, size, safety checks)
 * - Request validation with Joi schemas
 * - User ownership verification
 * - File size limit: 10 MB
 *
 * @module routes/stickerLibraryRoutes
 */

import { Router } from 'express';
import multer from 'multer';
import {
  handleGetStickerLibrary,
  handleUploadStickerToLibrary,
  handleRenameStickerr,
  handleDeleteStickerFromLibrary,
} from '../controllers/stickerLibraryController';
import { authenticateUser } from '../middleware/authMiddleware';
import {
  validate,
  stickerUploadSchema,
  renameStickerSchema,
  validateFileUpload,
} from '../middleware/validation';
import { validateId } from '../middleware/uuidValidator';

const router = Router();

/**
 * Configure Multer for in-memory file storage
 * Files are kept in memory (Buffer) before being uploaded to Cloudinary
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
 * All sticker library routes require authentication
 * Apply JWT authentication middleware to all routes in this router
 */
router.use(authenticateUser);

/**
 * @route   GET /api/user-library/stickers
 * @desc    Get user's sticker library with optional filtering
 * @access  Private (requires JWT authentication)
 *
 * Query parameters (all optional):
 * - tags: string (comma-separated tags to filter by)
 * - isPublic: string ('true' or 'false')
 * - sortBy: string ('name' | 'createdAt' | 'usageCount', default: 'createdAt')
 * - order: string ('ASC' | 'DESC', default: 'DESC')
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     stickers: [
 *       {
 *         id: string,
 *         userId: string,
 *         name: string,
 *         cloudinaryUrl: string,
 *         cloudinaryPublicId: string,
 *         thumbnailUrl: string,
 *         tags: string[],
 *         isPublic: boolean,
 *         usageCount: number,
 *         createdAt: Date,
 *         updatedAt: Date
 *       }
 *     ],
 *     pagination: {
 *       currentPage: number,
 *       limit: number,
 *       total: number,
 *       totalPages: number
 *     }
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid query parameters
 * - 401: Unauthorized (no JWT token)
 * - 500: Database error
 *
 * Notes:
 * - Returns only stickers owned by authenticated user
 * - Default sort: newest first (DESC by createdAt)
 * - Maximum 100 results per page
 * - Supports filtering by multiple tags (all must match)
 *
 * @example
 * GET /api/user-library/stickers?tags=nature,animal&sortBy=name&order=ASC&page=1&limit=20
 */
router.get(
  '/',
  handleGetStickerLibrary
);

/**
 * @route   POST /api/user-library/stickers
 * @desc    Upload sticker to user's personal library
 * @access  Private (requires JWT authentication)
 *
 * Request (multipart/form-data):
 * - file: Image file (JPEG, PNG, SVG only, max 10 MB) - REQUIRED
 * - name: Sticker name (string, 1-100 chars) - REQUIRED
 * - tags: Tags as comma-separated string (optional, max 10 tags)
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   data: {
 *     id: string (sticker UUID),
 *     userId: string,
 *     name: string,
 *     cloudinaryUrl: string (full resolution URL),
 *     cloudinaryPublicId: string (format: /users/:userId/stickers/:id),
 *     thumbnailUrl: string (100x100 thumbnail URL),
 *     tags: string[] (lowercase, trimmed),
 *     isPublic: boolean (default: false),
 *     usageCount: number (default: 0),
 *     createdAt: Date,
 *     updatedAt: Date
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid file, missing name, or invalid tags
 * - 401: Unauthorized (no JWT token)
 * - 413: File too large (> 10 MB)
 * - 500: Cloudinary upload or database error
 *
 * Supported file types:
 * - image/jpeg (.jpg, .jpeg)
 * - image/png (.png)
 * - image/svg+xml (.svg)
 *
 * Tags constraints:
 * - Maximum 10 tags per sticker
 * - Each tag 1-30 characters
 * - Trimmed and lowercased by server
 *
 * File validation:
 * - Extension and MIME type must match
 * - File size <= 10 MB
 * - Scanned for null bytes/suspicious content
 *
 * Security:
 * - File validated before Cloudinary upload
 * - User ownership embedded in Cloudinary path
 * - Unique constraint on (userId, cloudinaryPublicId)
 *
 * @example
 * const formData = new FormData();
 * formData.append('file', fileInput.files[0]);
 * formData.append('name', 'Autumn Leaf');
 * formData.append('tags', 'nature,seasonal,leaf');
 *
 * const response = await fetch('/api/user-library/stickers', {
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer eyJhbGc...' },
 *   body: formData
 * });
 */
router.post(
  '/',
  upload.single('file'),
  validateFileUpload,
  validate(stickerUploadSchema, 'body'),
  handleUploadStickerToLibrary
);

/**
 * @route   PATCH /api/user-library/stickers/:id
 * @desc    Rename sticker and update tags
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: string (sticker UUID)
 *
 * Request body:
 * {
 *   newName: string (required, 1-100 chars),
 *   newTags?: string[] (optional, max 10 tags, each 1-30 chars)
 * }
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     userId: string,
 *     name: string (updated),
 *     cloudinaryUrl: string,
 *     cloudinaryPublicId: string,
 *     thumbnailUrl: string,
 *     tags: string[] (updated),
 *     isPublic: boolean,
 *     usageCount: number,
 *     updatedAt: Date
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid UUID format or invalid name/tags
 * - 401: Unauthorized (no JWT token)
 * - 403: User does not own the sticker
 * - 404: Sticker not found
 *
 * Validation:
 * - New name: 1-100 characters
 * - Tags: array of 1-30 character strings
 * - Maximum 10 tags per sticker
 * - Tags are lowercased and trimmed
 *
 * @example
 * PATCH /api/user-library/stickers/sticker-uuid
 * Body: {
 *   newName: "Autumn Maple Leaf",
 *   newTags: ["nature", "tree", "fall"]
 * }
 */
router.patch(
  '/:id',
  validateId,
  validate(renameStickerSchema, 'body'),
  handleRenameStickerr
);

/**
 * @route   DELETE /api/user-library/stickers/:id
 * @desc    Delete sticker from library (also deletes from Cloudinary)
 * @access  Private (requires JWT authentication)
 *
 * URL Parameters:
 * - id: string (sticker UUID)
 *
 * Response: 204 No Content
 * (Empty response body)
 *
 * Error responses:
 * - 400: Invalid UUID format
 * - 401: Unauthorized (no JWT token)
 * - 403: User does not own the sticker
 * - 404: Sticker not found
 * - 500: Cloudinary deletion or database error
 *
 * Deletion process:
 * 1. Verify user owns the sticker
 * 2. Delete sticker record from database (hard delete)
 * 3. Delete image from Cloudinary (using cloudinaryPublicId)
 * 4. Return 204 No Content
 *
 * Notes:
 * - This is a hard delete and cannot be undone
 * - Soft-deleted stickers show as deleted in UI
 * - Uses Cloudinary's destroy API to remove image
 * - PageElements referencing this sticker remain (reference becomes null if needed)
 *
 * @example
 * DELETE /api/user-library/stickers/sticker-uuid
 */
router.delete(
  '/:id',
  validateId,
  handleDeleteStickerFromLibrary
);

export default router;
