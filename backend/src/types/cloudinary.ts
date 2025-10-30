/**
 * TypeScript Type Definitions for Cloudinary Service
 *
 * This module provides comprehensive TypeScript interfaces for all Cloudinary interactions.
 * Includes upload responses, transformation parameters, and error types for type-safe
 * operations throughout the application.
 *
 * @module types/cloudinary
 */

/**
 * Response object returned after a successful media upload to Cloudinary
 * Contains all metadata about the uploaded file including URL, dimensions, and format
 *
 * @interface CloudinaryUploadResponse
 */
export interface CloudinaryUploadResponse {
  /** Full public URL to access the uploaded media on Cloudinary CDN */
  cloudinaryUrl: string;

  /** Cloudinary public ID for the uploaded resource (used for future operations) */
  cloudinaryPublicId: string;

  /** Image width in pixels (0 for non-image resources) */
  width: number;

  /** Image height in pixels (0 for non-image resources) */
  height: number;

  /** File format (jpg, png, svg) */
  format: string;
}

/**
 * Crop parameters for image transformation
 * Allows precise cropping of images with pixel-level coordinates
 *
 * @interface CropParameters
 */
export interface CropParameters {
  /** X coordinate in pixels from the left edge where crop starts */
  x: number;

  /** Y coordinate in pixels from the top edge where crop starts */
  y: number;

  /** Width of the crop area in pixels */
  width: number;

  /** Height of the crop area in pixels */
  height: number;
}

/**
 * Flip direction options for image transformations
 * Allows horizontal or vertical flipping of images
 *
 * @type FlipDirection
 */
export type FlipDirection = 'horizontal' | 'vertical';

/**
 * Rotation angle options for image transformations
 * Only supports 90-degree increments for optimal quality
 *
 * @type RotationAngle
 */
export type RotationAngle = 0 | 90 | 180 | 270;

/**
 * Cloudinary transformation parameters for image manipulation
 * Supports cropping, brightness, contrast, saturation, rotation, and flipping
 *
 * @interface CloudinaryTransformations
 */
export interface CloudinaryTransformations {
  /**
   * Crop area coordinates and dimensions
   * Example: { x: 100, y: 50, width: 500, height: 400 }
   * Optional - if not provided, no cropping is applied
   */
  crop?: CropParameters;

  /**
   * Brightness adjustment (-100 to +100)
   * -100: completely dark
   * 0: original brightness
   * +100: completely bright
   * Optional - if not provided, no brightness adjustment
   */
  brightness?: number;

  /**
   * Contrast adjustment (-100 to +100)
   * -100: no contrast (gray)
   * 0: original contrast
   * +100: maximum contrast
   * Optional - if not provided, no contrast adjustment
   */
  contrast?: number;

  /**
   * Saturation adjustment (-100 to +100)
   * -100: grayscale (no color)
   * 0: original saturation
   * +100: maximum saturation
   * Optional - if not provided, no saturation adjustment
   */
  saturation?: number;

  /**
   * Rotation angle in degrees (0, 90, 180, or 270)
   * Only 90-degree increments are supported
   * Optional - if not provided, no rotation
   */
  rotation?: RotationAngle;

  /**
   * Flip direction (horizontal or vertical)
   * Optional - if not provided, no flipping
   */
  flip?: FlipDirection;
}

/**
 * Type of error that occurred in Cloudinary operations
 * Allows programmatic error handling based on specific failure types
 *
 * @type CloudinaryErrorType
 */
export type CloudinaryErrorType =
  | 'INVALID_CREDENTIALS'
  | 'QUOTA_EXCEEDED'
  | 'FILE_TOO_LARGE'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_ERROR'
  | 'RETRY_EXHAUSTED'
  | 'UNKNOWN_ERROR';

/**
 * Custom error class for Cloudinary operation failures
 * Extends the built-in Error class with type information and retry details
 *
 * @class CloudinaryError
 * @extends Error
 */
export class CloudinaryError extends Error {
  /**
   * Creates a new CloudinaryError instance
   *
   * @param {string} message - User-friendly error message
   * @param {CloudinaryErrorType} type - Categorized error type for programmatic handling
   * @param {number} retryAttempts - Number of retry attempts made before failure (optional)
   * @param {number} maxRetries - Maximum number of retries configured (optional)
   *
   * @example
   * throw new CloudinaryError(
   *   'Upload timeout after 3 attempts - please try again later',
   *   'TIMEOUT',
   *   3,
   *   3
   * );
   */
  constructor(
    message: string,
    public type: CloudinaryErrorType,
    public retryAttempts?: number,
    public maxRetries?: number
  ) {
    super(message);
    this.name = 'CloudinaryError';
    // Maintains proper stack trace for where our error was thrown
    Object.setPrototypeOf(this, CloudinaryError.prototype);
  }

  /**
   * Determines if the error indicates an operation that should be retried
   * Certain error types (auth, permissions, validation) should not be retried
   * while transient errors (timeout, temporary failures) can benefit from retries
   *
   * @returns {boolean} True if the operation should be retried
   *
   * @example
   * const error = new CloudinaryError('Timeout', 'TIMEOUT');
   * if (error.isRetryable()) {
   *   // Attempt retry with backoff
   * }
   */
  public isRetryable(): boolean {
    const nonRetryableTypes: CloudinaryErrorType[] = [
      'INVALID_CREDENTIALS',
      'PERMISSION_ERROR',
      'VALIDATION_ERROR',
    ];
    return !nonRetryableTypes.includes(this.type);
  }
}

/**
 * Configuration for retry behavior with exponential backoff
 * Controls how many times operations are attempted and the delay between attempts
 *
 * @interface RetryConfig
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts (including the initial attempt)
   * Default: 3 (1 initial attempt + 2 retries)
   */
  maxRetries: number;

  /**
   * Base delay in milliseconds for exponential backoff
   * Each subsequent attempt doubles this delay
   * Example: baseDelayMs=1000 → delays: 1s, 2s, 4s
   * Default: 1000
   */
  baseDelayMs: number;

  /**
   * Maximum timeout for a single upload attempt in milliseconds
   * If an upload takes longer than this, it will be cancelled
   * Default: 60000 (60 seconds)
   */
  uploadTimeoutMs: number;
}

/**
 * Folder type for organizing uploads
 * Used to determine the subdirectory path in Cloudinary
 *
 * @type UploadFolder
 */
export type UploadFolder = 'images' | 'stickers';

/**
 * Standard response wrapper for Cloudinary operations
 * Provides consistent structure for all Cloudinary service method returns
 *
 * @interface CloudinaryOperationResult
 */
export interface CloudinaryOperationResult<T> {
  /** Whether the operation succeeded */
  success: boolean;

  /** Data returned by successful operation (null if failed) */
  data?: T;

  /** Error details if operation failed (null if successful) */
  error?: {
    /** User-friendly error message */
    message: string;

    /** Categorized error type */
    type: CloudinaryErrorType;

    /** Number of retries attempted (for transient errors) */
    retriesAttempted?: number;
  };
}
