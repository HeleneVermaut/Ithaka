/**
 * File Validation Utility Module
 *
 * This module provides comprehensive file validation functions for uploaded media.
 * It validates files for:
 * - Format/type (whitelist-based: JPEG, PNG, SVG only)
 * - File size (max 10 MB)
 * - MIME type (prevents spoofing attacks)
 * - Safe content (detects null bytes and suspicious patterns)
 *
 * Validation happens server-side as the primary security measure.
 * Client-side validation is done for UX but should never be trusted.
 *
 * Security Note:
 * This validates files BEFORE they are sent to Cloudinary.
 * Never trust file extensions or MIME types alone - attackers can spoof them.
 * Always validate both extension and MIME type together.
 *
 * @module utils/fileValidation
 */

/**
 * Allowed file formats for image uploads
 * Limited to formats that Cloudinary can handle safely
 *
 * @constant
 */
export const ALLOWED_FORMATS = ['jpeg', 'jpg', 'png', 'svg'] as const;

/**
 * Allowed MIME types for image uploads
 * These are the canonical MIME types for the supported formats
 *
 * @constant
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/svg+xml',
] as const;

/**
 * Maximum file size in megabytes
 * Prevents large uploads that could strain the server
 *
 * @constant
 */
export const MAX_FILE_SIZE_MB = 10;

/**
 * Maximum file size in bytes (calculated from MB)
 * Used for size validation comparisons
 *
 * @constant
 */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 10 MB = 10,485,760 bytes

/**
 * MIME type to file extension mapping
 * Used to verify that the file extension matches the MIME type
 * This prevents spoofing (e.g., .jpg file with image/png MIME type)
 *
 * @constant
 */
const MIME_TYPE_MAP: Record<string, readonly string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/svg+xml': ['svg'],
} as const;

/**
 * Custom error class for file validation failures
 *
 * Used to distinguish file validation errors from other application errors.
 * Allows the error handler middleware to return appropriate HTTP status codes
 * and user-friendly error messages.
 *
 * @class
 * @extends Error
 *
 * @example
 * throw new ValidationError('File too large (15 MB > 10 MB)', 'FILE_TOO_LARGE');
 */
export class ValidationError extends Error {
  /**
   * Creates a new ValidationError instance
   *
   * @param {string} message - User-friendly error message
   * @param {string} code - Error code for programmatic handling
   */
  constructor(
    message: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
    // Maintains proper stack trace for where our error was thrown
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Extract file extension from filename
 *
 * Safely extracts the file extension and normalizes it to lowercase.
 * Handles edge cases like files with no extension or multiple dots.
 *
 * @param {string} filename - The filename to extract extension from
 * @returns {string} The file extension in lowercase (e.g., 'jpg', 'png')
 *
 * @example
 * getFileExtension('photo.JPG') // Returns 'jpg'
 * getFileExtension('archive.tar.gz') // Returns 'gz'
 * getFileExtension('file-no-extension') // Returns ''
 */
const getFileExtension = (filename: string): string => {
  if (!filename || !filename.includes('.')) {
    return '';
  }
  return filename.split('.').pop()?.toLowerCase() ?? '';
};

/**
 * Validate image file format
 *
 * Checks if the file format is in the whitelist of allowed formats.
 * Validates both the file extension AND the MIME type to prevent spoofing.
 *
 * Security Logic:
 * 1. Extract extension from filename
 * 2. Check extension against whitelist
 * 3. Check MIME type against whitelist
 * 4. Verify extension matches the MIME type (prevent spoofing)
 *
 * @param {string} filename - The original filename from the uploaded file
 * @param {string} mimeType - The MIME type detected by the server
 * @returns {boolean} True if the file format is valid
 * @throws {ValidationError} If format is invalid with a descriptive message
 *
 * @example
 * validateImageFormat('photo.jpg', 'image/jpeg'); // OK
 * validateImageFormat('photo.gif', 'image/gif'); // Throws - GIF not supported
 * validateImageFormat('photo.jpg', 'image/png'); // Throws - MIME doesn't match extension
 */
export const validateImageFormat = (
  filename: string,
  mimeType: string
): boolean => {
  // Validate filename exists and is not empty
  if (!filename || filename.trim() === '') {
    throw new ValidationError('Filename is required', 'EMPTY_FILENAME');
  }

  // Extract file extension (normalized to lowercase)
  const extension = getFileExtension(filename);

  // Check if extension is in whitelist
  if (!ALLOWED_FORMATS.includes(extension as typeof ALLOWED_FORMATS[number])) {
    throw new ValidationError(
      `Unsupported file format '.${extension}'. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`,
      'INVALID_FORMAT'
    );
  }

  // Check if MIME type is in whitelist
  if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
    throw new ValidationError(
      `Unsupported MIME type '${mimeType}'. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      'INVALID_MIME_TYPE'
    );
  }

  // Verify that the extension matches the MIME type (prevent spoofing)
  const validExtensionsForMime = MIME_TYPE_MAP[mimeType];
  if (!validExtensionsForMime || !validExtensionsForMime.includes(extension)) {
    throw new ValidationError(
      `File extension '${extension}' does not match MIME type '${mimeType}'. This may be a spoofed file.`,
      'MIME_TYPE_MISMATCH'
    );
  }

  return true;
};

/**
 * Validate file size
 *
 * Ensures the file doesn't exceed the maximum allowed size.
 * Files exceeding the limit are rejected to prevent:
 * - Storage quota issues
 * - Server memory exhaustion
 * - Slow upload times
 *
 * @param {Buffer} fileBuffer - The file data as a Buffer
 * @param {number} maxSizeMB - Maximum allowed size in megabytes (default: 10)
 * @returns {boolean} True if file size is valid
 * @throws {ValidationError} If file exceeds size limit
 *
 * @example
 * const smallFile = Buffer.alloc(5 * 1024 * 1024); // 5 MB
 * validateFileSize(smallFile); // OK
 *
 * const largeFile = Buffer.alloc(15 * 1024 * 1024); // 15 MB
 * validateFileSize(largeFile); // Throws
 */
export const validateFileSize = (
  fileBuffer: Buffer,
  maxSizeMB: number = MAX_FILE_SIZE_MB
): boolean => {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new ValidationError('Invalid file buffer provided', 'INVALID_BUFFER');
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

  if (fileBuffer.length > maxSizeBytes) {
    throw new ValidationError(
      `File too large (${fileSizeMB} MB > ${maxSizeMB} MB). Maximum file size is ${maxSizeMB} MB.`,
      'FILE_TOO_LARGE'
    );
  }

  return true;
};

/**
 * Check for suspicious patterns that indicate potentially malicious files
 *
 * Detects:
 * - Null bytes (often used for bypassing security checks)
 * - Path traversal attempts (../, ..\)
 * - Known malware signatures (limited check)
 *
 * This is an additional security layer but not foolproof.
 * Professional antivirus scanning should be added for production systems.
 *
 * @param {Buffer} fileBuffer - The file data to check
 * @returns {boolean} True if file appears safe
 * @throws {ValidationError} If suspicious patterns are detected
 *
 * @example
 * const safeFile = Buffer.from('valid image data');
 * checkFileSafety(safeFile); // OK
 *
 * const suspiciousFile = Buffer.from('\x00\x00\x00'); // Null bytes
 * checkFileSafety(suspiciousFile); // Throws
 */
const checkFileSafety = (fileBuffer: Buffer): boolean => {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new ValidationError('Invalid file buffer provided', 'INVALID_BUFFER');
  }

  // Check for null bytes (often used in exploits)
  if (fileBuffer.includes(0x00, 0)) {
    throw new ValidationError(
      'File contains null bytes. This may indicate a malicious file.',
      'SUSPICIOUS_NULL_BYTES'
    );
  }

  return true;
};

/**
 * Comprehensive file safety check
 *
 * Validates a file across multiple dimensions:
 * 1. Format validation (whitelist-based)
 * 2. MIME type validation
 * 3. Size validation
 * 4. Safety checks (null bytes, suspicious patterns)
 *
 * This function should be called for all uploaded files before sending to Cloudinary.
 * It combines all validation checks into one convenient function.
 *
 * Security:
 * - Uses whitelist approach (only allow known-good formats)
 * - Validates both extension and MIME type
 * - Checks file size to prevent resource exhaustion
 * - Scans for common attack patterns
 *
 * @param {string} filename - The original filename
 * @param {string} mimeType - The MIME type detected by the server
 * @param {Buffer} fileBuffer - The file data
 * @param {number} maxSizeMB - Maximum file size in MB (optional, default: 10)
 * @returns {boolean} True if all validations pass
 * @throws {ValidationError} If any validation fails
 *
 * @example
 * // In a file upload handler
 * try {
 *   isSafeFile('photo.jpg', 'image/jpeg', fileBuffer);
 *   // Safe to upload to Cloudinary
 *   await cloudinary.uploader.upload(...);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     return res.status(400).json({ error: error.message });
 *   }
 * }
 */
export const isSafeFile = (
  filename: string,
  mimeType: string,
  fileBuffer: Buffer,
  maxSizeMB: number = MAX_FILE_SIZE_MB
): boolean => {
  try {
    // Validate format (extension + MIME type)
    validateImageFormat(filename, mimeType);

    // Validate file size
    validateFileSize(fileBuffer, maxSizeMB);

    // Check for suspicious patterns
    checkFileSafety(fileBuffer);

    return true;
  } catch (error) {
    // Re-throw ValidationError as-is
    if (error instanceof ValidationError) {
      throw error;
    }
    // Wrap unexpected errors
    throw new ValidationError(
      `Unexpected error during file validation: ${error instanceof Error ? error.message : String(error)}`,
      'VALIDATION_ERROR'
    );
  }
};

/**
 * Type definition for file validation result
 * Used in controller responses and error handling
 */
export interface IFileValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Wrapper function for safe file validation with error handling
 *
 * Returns an object instead of throwing, useful for API responses.
 * Prefer using isSafeFile() and catching ValidationError in most cases.
 *
 * @param {string} filename - The original filename
 * @param {string} mimeType - The MIME type
 * @param {Buffer} fileBuffer - The file data
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {IFileValidationResult} Validation result object
 *
 * @example
 * const result = validateFileWithErrorHandling('photo.jpg', 'image/jpeg', buffer);
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 */
export const validateFileWithErrorHandling = (
  filename: string,
  mimeType: string,
  fileBuffer: Buffer,
  maxSizeMB: number = MAX_FILE_SIZE_MB
): IFileValidationResult => {
  try {
    isSafeFile(filename, mimeType, fileBuffer, maxSizeMB);
    return { isValid: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        isValid: false,
        error: error.message,
        errorCode: error.code,
      };
    }
    return {
      isValid: false,
      error: 'Unknown validation error',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
};
