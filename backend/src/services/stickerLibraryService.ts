/**
 * Sticker Library Service
 *
 * This service manages user's personal sticker library:
 * - Uploading and organizing saved stickers
 * - Retrieving stickers with filtering and sorting
 * - Renaming and tagging stickers for organization
 * - Deleting stickers from library and cloud storage
 * - Authorization checks to ensure users can only access their own stickers
 *
 * Security considerations:
 * - All operations verify userId ownership to prevent cross-user access
 * - Stickers are soft-deleted for recovery capability
 * - Cloudinary files are deleted when stickers are removed
 * - Returns 403 Forbidden for unauthorized access attempts
 *
 * Business rules:
 * - New stickers are private by default (isPublic: false)
 * - Usage count starts at 0 and increments when sticker is used on a page
 * - Tags are limited to 10 per sticker, max 30 characters each
 * - Sticker names must be 1-100 characters
 *
 * @module services/stickerLibraryService
 */

import { UserSticker, IUserSticker } from '../models/UserSticker';
import { CloudinaryError } from '../types/cloudinary';
import { cloudinaryService } from './cloudinaryService';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

/**
 * Custom error class for sticker library operations
 * Extends Error with specific error codes for client handling
 *
 * @class StickerLibraryError
 * @extends Error
 */
export class StickerLibraryError extends Error {
  /**
   * Creates a new StickerLibraryError
   *
   * @param {string} message - Error message
   * @param {string} code - Error code (FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, etc.)
   *
   * @example
   * throw new StickerLibraryError('Sticker not found', 'NOT_FOUND');
   */
  constructor(
    message: string,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'StickerLibraryError';
    Object.setPrototypeOf(this, StickerLibraryError.prototype);
  }
}

/**
 * Filter options for retrieving stickers
 *
 * @interface StickerFilters
 */
export interface StickerFilters {
  /** Filter by tags (OR logic - sticker must have at least one tag) */
  tags?: string[];

  /** Filter by public/private status */
  isPublic?: boolean;

  /** Sort field: 'name', 'createdAt', or 'usageCount' */
  sortBy?: 'name' | 'createdAt' | 'usageCount';

  /** Sort order: ASC or DESC */
  order?: 'ASC' | 'DESC';

  /** Page number for pagination */
  page?: number;

  /** Number of results per page */
  limit?: number;
}

/**
 * Pagination metadata in list response
 *
 * @interface PaginationMetadata
 */
export interface PaginationMetadata {
  /** Current page number */
  currentPage: number;

  /** Results per page */
  limit: number;

  /** Total number of results */
  total: number;

  /** Total number of pages */
  totalPages: number;
}

/**
 * Response for list operations with pagination
 *
 * @interface GetStickersResponse
 */
export interface GetStickersResponse {
  /** Array of sticker records */
  stickers: IUserSticker[];

  /** Pagination metadata */
  pagination: PaginationMetadata;
}

/**
 * StickerLibraryService Class
 *
 * Provides methods for managing user's personal sticker library
 * with full CRUD operations and proper authorization checks.
 *
 * Usage:
 * ```typescript
 * const service = new StickerLibraryService();
 * const result = await service.uploadStickerToLibrary(userId, name, tags, file);
 * const library = await service.getUserStickers(userId);
 * ```
 */
export class StickerLibraryService {
  /**
   * Upload sticker to user's library
   *
   * Uploads the sticker image to Cloudinary and creates a UserSticker record
   * in the database. The sticker is saved to the /users/:userId/stickers/ folder.
   *
   * @async
   * @param {string} userId - The owner's user ID
   * @param {string} name - User-friendly name for the sticker (1-100 characters)
   * @param {string[]} tags - Tags for organization (max 10 tags, 1-30 chars each)
   * @param {Express.Multer.File} file - The sticker image file
   * @returns {Promise<IUserSticker>} The created UserSticker record
   * @throws {StickerLibraryError} If save fails
   * @throws {CloudinaryError} If upload to Cloudinary fails
   *
   * @example
   * const sticker = await stickerService.uploadStickerToLibrary(
   *   userId,
   *   'Autumn Leaf',
   *   ['nature', 'seasonal'],
   *   req.file
   * );
   */
  public async uploadStickerToLibrary(
    userId: string,
    name: string,
    tags: string[],
    file: Express.Multer.File
  ): Promise<IUserSticker> {
    try {
      // Validate inputs
      if (!name || name.length < 1 || name.length > 100) {
        throw new StickerLibraryError(
          'Sticker name must be between 1 and 100 characters',
          'VALIDATION_ERROR'
        );
      }

      if (tags && tags.length > 10) {
        throw new StickerLibraryError('Maximum 10 tags allowed per sticker', 'VALIDATION_ERROR');
      }

      if (tags) {
        for (const tag of tags) {
          if (tag.length < 1 || tag.length > 30) {
            throw new StickerLibraryError(
              'Each tag must be between 1 and 30 characters',
              'VALIDATION_ERROR'
            );
          }
        }
      }

      logger.debug('Uploading sticker to Cloudinary', { userId, name });

      // Upload to Cloudinary
      const uploadResult = await cloudinaryService.uploadMedia(file, userId, 'stickers');

      // Generate thumbnail URL
      const thumbnailUrl = cloudinaryService.getThumbnail(uploadResult.cloudinaryPublicId);

      logger.debug('Creating UserSticker record', { userId, name });

      // Create UserSticker record
      const sticker = await UserSticker.create({
        userId,
        name,
        cloudinaryUrl: uploadResult.cloudinaryUrl,
        cloudinaryPublicId: uploadResult.cloudinaryPublicId,
        thumbnailUrl,
        tags: tags || [],
        isPublic: false,
        usageCount: 0,
      });

      logger.info('Sticker saved to library', {
        stickerId: sticker.id,
        userId,
        name,
        tags: tags?.length || 0,
      });

      return sticker.toJSON() as IUserSticker;
    } catch (error) {
      if (error instanceof StickerLibraryError || error instanceof CloudinaryError) {
        throw error;
      }

      logger.error('Failed to save sticker to library', { error, userId, name });
      throw new StickerLibraryError('Failed to save sticker', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get user's sticker library with pagination
   *
   * Retrieves all non-deleted stickers owned by the user with optional filtering,
   * sorting, and pagination.
   *
   * @async
   * @param {string} userId - The owner's user ID
   * @param {StickerFilters} [filters] - Optional filtering, sorting, and pagination options
   * @returns {Promise<GetStickersResponse>} Stickers with pagination metadata
   * @throws {StickerLibraryError} If database query fails
   *
   * @example
   * // Get all stickers
   * const result = await stickerService.getUserStickers(userId);
   *
   * // Get stickers with filters
   * const filtered = await stickerService.getUserStickers(userId, {
   *   tags: ['nature'],
   *   isPublic: false,
   *   sortBy: 'name',
   *   order: 'ASC',
   *   page: 1,
   *   limit: 20
   * });
   */
  public async getUserStickers(
    userId: string,
    filters?: StickerFilters
  ): Promise<GetStickersResponse> {
    try {
      // Build WHERE clause
      const whereClause: any = { userId };

      // Add tag filter if provided (OR logic - sticker must have at least one tag)
      if (filters?.tags && filters.tags.length > 0) {
        whereClause.tags = {
          [Op.overlap]: filters.tags,
        };
      }

      // Add public filter if provided
      if (filters?.isPublic !== undefined) {
        whereClause.isPublic = filters.isPublic;
      }

      // Build ORDER clause
      const sortBy = filters?.sortBy || 'createdAt';
      const order = filters?.order || 'DESC';
      const orderBy: any[] = [[sortBy, order]];

      // Pagination
      const page = Math.max(filters?.page || 1, 1);
      const limit = Math.max(Math.min(filters?.limit || 20, 100), 1);
      const offset = (page - 1) * limit;

      logger.debug('Fetching sticker library', { userId, filters });

      // Query total count
      const total = await UserSticker.count({ where: whereClause });

      // Query paginated results
      const stickers = await UserSticker.findAll({
        where: whereClause,
        order: orderBy,
        limit,
        offset,
      });

      logger.debug('Sticker library fetched', { userId, count: stickers.length, total });

      const totalPages = Math.ceil(total / limit);

      return {
        stickers: stickers.map((s) => s.toJSON() as IUserSticker),
        pagination: {
          currentPage: page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch sticker library', { error, userId });
      throw new StickerLibraryError('Failed to fetch stickers', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get a single sticker by ID
   *
   * Retrieves a sticker record with authorization check to ensure
   * the user owns the sticker.
   *
   * @async
   * @param {string} id - The sticker's unique ID
   * @param {string} userId - The requesting user's ID (for authorization)
   * @returns {Promise<IUserSticker>} The sticker data
   * @throws {StickerLibraryError} If sticker not found or user not authorized
   *
   * @example
   * const sticker = await stickerService.getStickerById(stickerId, userId);
   */
  public async getStickerById(id: string, userId: string): Promise<IUserSticker> {
    try {
      logger.debug('Fetching sticker by ID', { id, userId });

      const sticker = await UserSticker.findByPk(id);

      if (!sticker) {
        throw new StickerLibraryError('Sticker not found', 'NOT_FOUND');
      }

      // Authorization check
      if (sticker.userId !== userId) {
        throw new StickerLibraryError('Not authorized to access this sticker', 'FORBIDDEN');
      }

      logger.debug('Sticker fetched', { id, userId });

      return sticker.toJSON() as IUserSticker;
    } catch (error) {
      if (error instanceof StickerLibraryError) {
        throw error;
      }

      logger.error('Failed to fetch sticker', { error, id, userId });
      throw new StickerLibraryError('Failed to fetch sticker', 'INTERNAL_ERROR');
    }
  }

  /**
   * Rename a sticker and optionally update its tags
   *
   * Updates the sticker's name and/or tags with validation.
   * Authorization check ensures user owns the sticker.
   *
   * @async
   * @param {string} userId - The requesting user's ID (for authorization)
   * @param {string} stickerId - The sticker's unique ID
   * @param {string} newName - New name for the sticker (1-100 characters)
   * @param {string[]} [newTags] - Optional new tags (max 10, 1-30 chars each)
   * @returns {Promise<IUserSticker>} Updated sticker record
   * @throws {StickerLibraryError} If validation fails or user not authorized
   *
   * @example
   * const updated = await stickerService.renameStickerr(
   *   userId,
   *   stickerId,
   *   'New Name',
   *   ['updated', 'tag']
   * );
   */
  public async renameStickerr(
    userId: string,
    stickerId: string,
    newName: string,
    newTags?: string[]
  ): Promise<IUserSticker> {
    try {
      // Validate new name
      if (!newName || newName.length < 1 || newName.length > 100) {
        throw new StickerLibraryError(
          'Sticker name must be between 1 and 100 characters',
          'VALIDATION_ERROR'
        );
      }

      // Validate new tags
      if (newTags && newTags.length > 10) {
        throw new StickerLibraryError('Maximum 10 tags allowed per sticker', 'VALIDATION_ERROR');
      }

      if (newTags) {
        for (const tag of newTags) {
          if (tag.length < 1 || tag.length > 30) {
            throw new StickerLibraryError(
              'Each tag must be between 1 and 30 characters',
              'VALIDATION_ERROR'
            );
          }
        }
      }

      logger.debug('Updating sticker', { stickerId, userId, newName });

      // Get sticker and check authorization
      await this.getStickerById(stickerId, userId);

      // Update sticker
      await UserSticker.update(
        {
          name: newName,
          ...(newTags && { tags: newTags }),
        },
        {
          where: { id: stickerId, userId },
        }
      );

      // Fetch updated sticker
      const updated = await UserSticker.findByPk(stickerId);
      if (!updated) {
        throw new StickerLibraryError('Sticker not found', 'NOT_FOUND');
      }

      logger.info('Sticker updated', { stickerId, userId, newName });

      return updated.toJSON() as IUserSticker;
    } catch (error) {
      if (error instanceof StickerLibraryError) {
        throw error;
      }

      logger.error('Failed to update sticker', { error, stickerId, userId });
      throw new StickerLibraryError('Failed to update sticker', 'INTERNAL_ERROR');
    }
  }

  /**
   * Delete a sticker from the library
   *
   * Soft-deletes the sticker from the database and removes it from Cloudinary.
   * Authorization check ensures user owns the sticker.
   *
   * @async
   * @param {string} userId - The requesting user's ID (for authorization)
   * @param {string} stickerId - The sticker's unique ID
   * @returns {Promise<void>}
   * @throws {StickerLibraryError} If sticker not found or user not authorized
   *
   * @example
   * await stickerService.deleteStickerFromLibrary(userId, stickerId);
   */
  public async deleteStickerFromLibrary(userId: string, stickerId: string): Promise<void> {
    try {
      logger.debug('Deleting sticker from library', { stickerId, userId });

      // Get sticker and check authorization
      const sticker = await this.getStickerById(stickerId, userId);

      // Soft-delete from database (paranoid: true sets deletedAt)
      await UserSticker.destroy({
        where: { id: stickerId, userId },
        force: false,
      });

      logger.debug('Sticker soft-deleted from database', { stickerId, userId });

      // Delete from Cloudinary (handle gracefully if already deleted)
      try {
        await cloudinaryService.deleteMedia(sticker.cloudinaryPublicId);
        logger.info('Sticker deleted from Cloudinary', { stickerId, userId });
      } catch (cloudinaryError) {
        // Log but don't fail if Cloudinary deletion fails
        if (cloudinaryError instanceof CloudinaryError) {
          logger.warn('Failed to delete sticker from Cloudinary', {
            stickerId,
            userId,
            error: cloudinaryError.message,
          });
        } else {
          logger.warn('Unexpected error deleting from Cloudinary', {
            stickerId,
            userId,
            error: cloudinaryError,
          });
        }
      }

      logger.info('Sticker deleted from library', { stickerId, userId });
    } catch (error) {
      if (error instanceof StickerLibraryError) {
        throw error;
      }

      logger.error('Failed to delete sticker', { error, stickerId, userId });
      throw new StickerLibraryError('Failed to delete sticker', 'INTERNAL_ERROR');
    }
  }
}

/**
 * Export singleton instance of StickerLibraryService
 * Use this throughout the application instead of creating new instances
 */
export const stickerLibraryService = new StickerLibraryService();

/**
 * Export service functions for controller imports
 * This allows the controller to import the service as a namespace
 */
export const getUserStickers = stickerLibraryService.getUserStickers.bind(stickerLibraryService);
export const uploadStickerToLibrary = stickerLibraryService.uploadStickerToLibrary.bind(stickerLibraryService);
export const renameStickerr = stickerLibraryService.renameStickerr.bind(stickerLibraryService);
export const deleteStickerFromLibrary = stickerLibraryService.deleteStickerFromLibrary.bind(stickerLibraryService);

export default stickerLibraryService;
