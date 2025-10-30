/**
 * Cloudinary Configuration Module
 *
 * This module sets up the Cloudinary SDK for handling image uploads, transformations,
 * and CDN delivery. Cloudinary is a cloud-based service that provides:
 * - Image storage and retrieval
 * - Automatic image optimization and transformations
 * - CDN delivery for fast global distribution
 * - Advanced features like cropping, brightness adjustment, etc.
 *
 * Security Notes:
 * - API_SECRET is sensitive and should NEVER be exposed to the frontend
 * - API_SECRET is only used server-side for:
 *   - Generating upload signatures
 *   - Direct API calls for transformations and deletions
 * - The cloud name and API key are less sensitive but still confidential
 *
 * @module config/cloudinary
 */

import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';

/**
 * Folder structure constants for organizing uploads by user
 * These paths define where files are stored in Cloudinary's directory structure
 *
 * @constant
 */
export const CLOUDINARY_FOLDERS = {
  /**
   * User image folder path
   * Pattern: /users/:userId/images/
   * Purpose: Store user-uploaded images for notebooks/pages
   */
  IMAGES: '/users/:userId/images/',

  /**
   * User stickers folder path
   * Pattern: /users/:userId/stickers/
   * Purpose: Store saved stickers and reusable visual elements
   */
  STICKERS: '/users/:userId/stickers/',
} as const;

/**
 * Validate that all required Cloudinary environment variables are configured
 *
 * Required environment variables:
 * - CLOUDINARY_NAME: Cloud name for accessing Cloudinary services
 * - CLOUDINARY_API_KEY: API key for authentication
 * - CLOUDINARY_API_SECRET: API secret for signing requests (SENSITIVE)
 *
 * This validation runs at startup to prevent runtime failures during uploads.
 * Missing variables will throw an error and prevent the application from starting.
 *
 * @throws {Error} If any required Cloudinary variable is missing
 * @returns {void}
 */
const validateCloudinaryConfig = (): void => {
  const requiredVars = [
    'CLOUDINARY_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error(
      `Missing required Cloudinary environment variables: ${missingVars.join(', ')}`
    );
    throw new Error(
      `Cloudinary configuration error: ${missingVars.join(', ')} are required`
    );
  }
};

/**
 * Initialize and configure the Cloudinary SDK
 *
 * This function:
 * 1. Validates all required environment variables exist
 * 2. Initializes the Cloudinary v2 SDK with credentials
 * 3. Enables secure mode for all operations
 * 4. Logs successful initialization (without exposing secrets)
 *
 * The function is called immediately when this module is imported,
 * ensuring Cloudinary is ready for use throughout the application.
 *
 * Security: API secret is only used in this initialization and for
 * generating signatures server-side. It is NEVER logged or exposed.
 *
 * @returns {void}
 * @throws {Error} If configuration validation fails
 *
 * @example
 * // This runs automatically when you import this module
 * import { cloudinary } from './config/cloudinary';
 * // Now you can use cloudinary for uploads and transformations
 */
const initializeCloudinary = (): void => {
  try {
    validateCloudinaryConfig();

    cloudinary.config({
      cloud_name: process.env['CLOUDINARY_NAME'],
      api_key: process.env['CLOUDINARY_API_KEY'],
      api_secret: process.env['CLOUDINARY_API_SECRET'],
      secure: true, // Enforce HTTPS for all Cloudinary URLs
    });

    logger.info('Cloudinary SDK initialized successfully', {
      cloud_name: process.env['CLOUDINARY_NAME'],
      environment: process.env['NODE_ENV'] || 'development',
    });
  } catch (error) {
    logger.error('Failed to initialize Cloudinary configuration', error);
    throw error;
  }
};

// Initialize Cloudinary when this module is imported
initializeCloudinary();

/**
 * Generate a folder path for user uploads
 *
 * Replaces the :userId placeholder with the actual user ID.
 * Useful for organizing uploads by user in the folder structure.
 *
 * @param {string} baseFolderPath - Base folder path with :userId placeholder
 * @param {string} userId - The user's unique identifier
 * @returns {string} Complete folder path (e.g., /users/abc123/images/)
 *
 * @example
 * const imagePath = generateCloudinaryFolder(CLOUDINARY_FOLDERS.IMAGES, 'user-uuid-123');
 * // Returns: /users/user-uuid-123/images/
 */
export const generateCloudinaryFolder = (
  baseFolderPath: string,
  userId: string
): string => {
  return baseFolderPath.replace(':userId', userId);
};

/**
 * Type definition for Cloudinary upload response
 * Describes the structure of data returned by Cloudinary after a successful upload
 */
export interface ICloudinaryUploadResponse {
  /** Unique identifier for the uploaded resource */
  public_id: string;
  /** Complete URL to access the uploaded resource */
  secure_url: string;
  /** MIME type of the uploaded file (e.g., 'image/jpeg') */
  format: string;
  /** Original filename of the uploaded resource */
  original_filename: string;
  /** File size in bytes */
  bytes: number;
  /** Width of image in pixels (for images only) */
  width?: number;
  /** Height of image in pixels (for images only) */
  height?: number;
  /** Creation timestamp (Unix timestamp) */
  created_at: string;
  /** Folder where the resource is stored */
  folder: string;
  /** Resource type (image, video, raw, etc.) */
  resource_type: string;
  /** Type of resource (upload, private, authenticated, etc.) */
  type: string;
}

// Export the initialized Cloudinary client for use throughout the application
export default cloudinary;
export { cloudinary };
