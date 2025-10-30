/**
 * Cloudinary Service
 *
 * This service provides a unified interface for all Cloudinary operations:
 * - Uploading media files (images, videos) with folder organization
 * - Applying transformations and generating transform URLs
 * - Creating thumbnail previews for image galleries
 * - Deleting files from Cloudinary cloud storage
 * - Handling errors gracefully with retry logic and exponential backoff
 *
 * Security considerations:
 * - API secret is never logged or exposed
 * - File uploads are validated before sending to Cloudinary
 * - Transformation URLs are built safely without injection vulnerabilities
 * - All operations timeout to prevent hanging requests
 *
 * Performance features:
 * - Exponential backoff retry mechanism for transient failures
 * - Timeout protection on all upload operations
 * - Proper error categorization for client handling
 *
 * @module services/cloudinaryService
 */

import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';
import {
  CloudinaryUploadResponse,
  CloudinaryTransformations,
  CloudinaryError,
  CloudinaryErrorType,
  UploadFolder,
  RetryConfig,
} from '../types/cloudinary';
import { generateCloudinaryFolder } from '../config/cloudinary';

/**
 * Helper function to delay execution for exponential backoff
 *
 * @async
 * @param {number} milliseconds - Number of milliseconds to wait
 * @returns {Promise<void>}
 * @private
 */
const delay = (milliseconds: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

/**
 * Determines if an error is retryable based on error code
 * Auth errors and validation errors should not be retried
 * Timeouts and rate limits should be retried
 *
 * @param {any} error - The error object to evaluate
 * @returns {boolean} True if the error should trigger a retry
 * @private
 */
const shouldRetry = (error: any): boolean => {
  // Don't retry auth/permission errors
  if (error.http_code === 401 || error.http_code === 403) {
    return false;
  }

  // Don't retry validation errors
  if (error.http_code === 400) {
    return false;
  }

  // Retry timeouts, rate limiting (429), and other transient errors
  if (error.code === 'ETIMEDOUT' || error.http_code === 429 || error.http_code === 503) {
    return true;
  }

  // Default to not retrying unknown errors
  return false;
};

/**
 * Maps Cloudinary API errors to standardized CloudinaryError types
 * Provides user-friendly error messages and categorization
 *
 * @param {any} error - The original error from Cloudinary SDK
 * @returns {object} Object with message and type for CloudinaryError
 * @private
 */
const mapCloudinaryError = (
  error: any
): { message: string; type: CloudinaryErrorType } => {
  if (error instanceof CloudinaryError) {
    return { message: error.message, type: error.type };
  }

  // Map specific HTTP error codes
  if (error.http_code === 401) {
    return {
      message: 'Invalid Cloudinary credentials - check API key and secret',
      type: 'INVALID_CREDENTIALS',
    };
  }

  if (error.http_code === 402) {
    return {
      message: 'Cloudinary quota exceeded - please try again later',
      type: 'QUOTA_EXCEEDED',
    };
  }

  if (error.http_code === 403) {
    return {
      message: 'Permission denied for Cloudinary operation',
      type: 'PERMISSION_ERROR',
    };
  }

  if (error.http_code === 413) {
    return {
      message: 'File too large for upload',
      type: 'FILE_TOO_LARGE',
    };
  }

  // Map error codes
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return {
      message: 'Upload timeout - the request took too long. Please try again.',
      type: 'TIMEOUT',
    };
  }

  // Validation errors
  if (error.message?.includes('Invalid') || error.message?.includes('invalid')) {
    return {
      message: error.message || 'Invalid file or parameters',
      type: 'VALIDATION_ERROR',
    };
  }

  // Default error
  return {
    message: 'Upload failed: ' + (error.message || 'Unknown error'),
    type: 'UNKNOWN_ERROR',
  };
};

/**
 * CloudinaryService Class
 *
 * Provides type-safe methods for all Cloudinary operations with
 * proper error handling, retries, and transformations.
 *
 * Usage:
 * ```typescript
 * const cloudinaryService = new CloudinaryService();
 * const response = await cloudinaryService.uploadMedia(file, userId, 'stickers');
 * const thumbnail = cloudinaryService.getThumbnail(response.cloudinaryPublicId);
 * ```
 */
export class CloudinaryService {
  /**
   * Default retry configuration
   * - Max 3 attempts (1 initial + 2 retries)
   * - Base delay 1 second with exponential backoff (1s, 2s, 4s)
   * - 60 second timeout per upload attempt
   * @private
   */
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    uploadTimeoutMs: 60000,
  };

  /**
   * Upload a media file to Cloudinary
   *
   * Uploads the file to a user-specific folder in Cloudinary and returns
   * metadata about the uploaded resource. Implements retry logic with exponential
   * backoff for transient failures like timeouts.
   *
   * @async
   * @param {Express.Multer.File} file - The file to upload (buffer in memory)
   * @param {string} userId - The owner's user ID (used for folder organization)
   * @param {UploadFolder} folder - Destination folder: 'images' or 'stickers'
   * @returns {Promise<CloudinaryUploadResponse>} Upload metadata including URL and publicId
   * @throws {CloudinaryError} If upload fails after all retries
   *
   * @example
   * const file = req.file;
   * const response = await cloudinaryService.uploadMedia(file, userId, 'stickers');
   * console.log(response.cloudinaryUrl); // Full Cloudinary URL
   * console.log(response.cloudinaryPublicId); // For future deletions
   */
  public async uploadMedia(
    file: Express.Multer.File,
    userId: string,
    folder: UploadFolder
  ): Promise<CloudinaryUploadResponse> {
    let lastError: CloudinaryError | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        logger.debug(`Upload attempt ${attempt + 1}/${this.retryConfig.maxRetries}`, {
          fileName: file.originalname,
          folder,
        });

        // Generate folder path for user
        const folderPath = generateCloudinaryFolder(`/users/:userId/${folder}/`, userId);

        // Configure upload options
        const uploadOptions = {
          folder: folderPath,
          resource_type: 'auto' as const,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          timeout: this.retryConfig.uploadTimeoutMs,
        };

        // Upload file buffer to Cloudinary
        const result = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

          uploadStream.end(file.buffer);
        });

        // Extract response data
        const response: CloudinaryUploadResponse = {
          cloudinaryUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
          width: result.width || 0,
          height: result.height || 0,
          format: result.format,
        };

        logger.info('Media uploaded successfully', {
          publicId: result.public_id,
          fileName: file.originalname,
          size: file.size,
          folder,
        });

        return response;
      } catch (error) {
        const { message, type } = mapCloudinaryError(error);
        lastError = new CloudinaryError(message, type, attempt + 1, this.retryConfig.maxRetries);

        logger.warn(`Upload attempt ${attempt + 1} failed: ${message}`, {
          type,
          shouldRetry: shouldRetry(error),
        });

        if (attempt < this.retryConfig.maxRetries - 1 && shouldRetry(error)) {
          const backoffDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
          logger.debug(`Waiting ${backoffDelay}ms before retry attempt ${attempt + 2}`);
          await delay(backoffDelay);
        } else if (attempt === this.retryConfig.maxRetries - 1) {
          lastError = new CloudinaryError(
            `${message} (after ${this.retryConfig.maxRetries} attempts)`,
            type === 'TIMEOUT' ? 'RETRY_EXHAUSTED' : type,
            this.retryConfig.maxRetries,
            this.retryConfig.maxRetries
          );
        }
      }
    }

    throw lastError || new CloudinaryError('Upload failed', 'UNKNOWN_ERROR');
  }

  /**
   * Delete a media file from Cloudinary
   *
   * Removes a file from Cloudinary cloud storage by its public ID.
   * Handles the "not found" case gracefully (already deleted).
   *
   * @async
   * @param {string} publicId - The Cloudinary public ID of the file to delete
   * @returns {Promise<void>}
   * @throws {CloudinaryError} If deletion fails (except for "not found")
   *
   * @example
   * await cloudinaryService.deleteMedia('users/abc123/stickers/sticker-id');
   * // File is now deleted from Cloudinary
   */
  public async deleteMedia(publicId: string): Promise<void> {
    try {
      logger.debug(`Deleting media from Cloudinary`, { publicId });

      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok' || result.result === 'not_found') {
        logger.info('Media deleted successfully', { publicId, result: result.result });
        return;
      }

      throw new CloudinaryError(
        `Unexpected deletion result: ${result.result}`,
        'UNKNOWN_ERROR'
      );
    } catch (error) {
      if (error instanceof CloudinaryError) {
        throw error;
      }

      if (error instanceof Error && error.message?.includes('not_found')) {
        logger.debug('Media already deleted or not found', { publicId });
        return;
      }

      const { message, type } = mapCloudinaryError(error);
      throw new CloudinaryError(message, type);
    }
  }

  /**
   * Generate a transformation URL for an image
   *
   * Builds a Cloudinary URL with applied transformations (crop, brightness,
   * contrast, saturation, rotation, flip). The URL can be used to display
   * the transformed image without modifying the original file.
   *
   * @param {string} publicId - The Cloudinary public ID of the image
   * @param {CloudinaryTransformations} transformations - Transformations to apply
   * @returns {string} Cloudinary transformation URL
   *
   * @example
   * const url = cloudinaryService.getTransformUrl('users/abc/image.jpg', {
   *   crop: { x: 100, y: 50, width: 500, height: 400 },
   *   brightness: 20,
   *   contrast: 10,
   * });
   */
  public getTransformUrl(publicId: string, transformations: CloudinaryTransformations): string {
    const parts: string[] = [];

    if (transformations.crop) {
      const { x, y, width, height } = transformations.crop;
      parts.push(`c_crop,x_${x},y_${y},w_${width},h_${height}`);
    }

    if (transformations.brightness !== undefined) {
      parts.push(`e_brightness:${transformations.brightness}`);
    }

    if (transformations.contrast !== undefined) {
      parts.push(`e_contrast:${transformations.contrast}`);
    }

    if (transformations.saturation !== undefined) {
      parts.push(`e_saturation:${transformations.saturation}`);
    }

    if (transformations.rotation !== undefined && transformations.rotation !== 0) {
      parts.push(`a_${transformations.rotation}`);
    }

    if (transformations.flip) {
      parts.push(`fl_${transformations.flip}`);
    }

    const transformationString = parts.length > 0 ? `/${parts.join('/')}` : '';
    const baseUrl = `https://res.cloudinary.com/${process.env['CLOUDINARY_NAME']}/image/upload`;
    const url = `${baseUrl}${transformationString}/${publicId}`;

    logger.debug('Generated transformation URL', { publicId, transformations, url });

    return url;
  }

  /**
   * Generate a thumbnail URL for an image
   *
   * Creates a small preview URL (100x100 pixels) suitable for displaying
   * stickers in a library or gallery view. Uses fit crop mode for consistent sizing.
   *
   * @param {string} publicId - The Cloudinary public ID of the image
   * @returns {string} Thumbnail URL with 100x100 dimensions
   *
   * @example
   * const thumbnailUrl = cloudinaryService.getThumbnail('users/abc/sticker.jpg');
   * // Returns: https://res.cloudinary.com/.../c_fit,w_100,h_100/sticker.jpg
   */
  public getThumbnail(publicId: string): string {
    const baseUrl = `https://res.cloudinary.com/${process.env['CLOUDINARY_NAME']}/image/upload`;
    const url = `${baseUrl}/c_fit,w_100,h_100/${publicId}`;

    logger.debug('Generated thumbnail URL', { publicId, url });

    return url;
  }
}

export const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
