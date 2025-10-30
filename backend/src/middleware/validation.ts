/**
 * Validation Middleware
 *
 * This middleware provides request validation using Joi schemas.
 * It validates request bodies, query parameters, and URL parameters
 * before they reach the controller, ensuring data integrity and security.
 *
 * Key validation rules:
 * - Email format and uniqueness
 * - Password strength (8+ chars, uppercase, number)
 * - Required fields presence
 * - String length constraints
 * - Data type validation
 *
 * @module middleware/validation
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Interface for Express Request with Multer file property
 * Allows type-safe access to req.file for file upload handlers
 * Using any to avoid Multer type issues across different versions
 */
interface MulterRequest extends Request {
  file?: any;
}

/**
 * Custom Joi validator for strong passwords
 * Requires: 8+ chars, at least 1 uppercase, 1 lowercase, 1 number
 *
 * @param {string} value - Password to validate
 * @param {any} helpers - Joi helpers for error messages
 * @returns {string} Validated password
 */
const strongPasswordValidator = (value: string, helpers: any) => {
  if (value.length < 8) {
    return helpers.error('password.tooShort');
  }
  if (!/[A-Z]/.test(value)) {
    return helpers.error('password.noUppercase');
  }
  if (!/[a-z]/.test(value)) {
    return helpers.error('password.noLowercase');
  }
  if (!/[0-9]/.test(value)) {
    return helpers.error('password.noNumber');
  }
  return value;
};

/**
 * Custom Joi validator for base64-encoded images
 * Validates:
 * - Valid base64 encoding
 * - Valid image MIME type (JPEG, PNG, WebP, GIF)
 * - File size after decoding
 *
 * @param {string} value - Base64-encoded image string
 * @param {any} helpers - Joi helpers for error messages
 * @returns {string} Validated base64 string
 */
const base64ImageValidator = (value: string, helpers: any) => {
  if (!value) {
    return value; // Allow empty/null for optional fields
  }

  // Check if it's valid base64
  try {
    const buffer = Buffer.from(value, 'base64');
    // Verify it's actually base64 by re-encoding and comparing
    if (buffer.toString('base64') !== value) {
      return helpers.error('image.invalidBase64');
    }
  } catch (error) {
    return helpers.error('image.invalidBase64');
  }

  // Check MIME type from base64 magic bytes
  const mimeType = getBase64ImageMimeType(value);
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!mimeType || !allowedMimes.includes(mimeType)) {
    return helpers.error('image.invalidMimeType');
  }

  // Check file size (max 375KB after decoding)
  const buffer = Buffer.from(value, 'base64');
  if (buffer.length > 375000) {
    return helpers.error('image.fileTooLarge');
  }

  return value;
};

/**
 * Detect MIME type from base64 string magic bytes
 *
 * @private
 * @param {string} base64String - Base64-encoded data
 * @returns {string | null} MIME type or null if unknown
 */
const getBase64ImageMimeType = (base64String: string): string | null => {
  try {
    const buffer = Buffer.from(base64String, 'base64');
    const signature = buffer.toString('hex', 0, 4);

    // JPEG: FF D8 FF
    if (signature.substring(0, 6) === 'ffd8ff') {
      return 'image/jpeg';
    }
    // PNG: 89 50 4E 47
    if (signature === '89504e47') {
      return 'image/png';
    }
    // GIF: 47 49 46 38
    if (signature.substring(0, 6) === '474946') {
      return 'image/gif';
    }
    // WebP: RIFF ... WEBP (check for WEBP at position 8)
    if (signature.substring(0, 4) === '52494646') {
      const webpSignature = buffer.toString('ascii', 8, 12);
      if (webpSignature === 'WEBP') {
        return 'image/webp';
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Joi schema for user registration
 * Validates all required and optional fields for creating a new user
 */
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .max(255)
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
      'string.max': 'Email must not exceed 255 characters',
    }),

  password: Joi.string()
    .required()
    .custom(strongPasswordValidator)
    .messages({
      'any.required': 'Password is required',
      'password.tooShort': 'Password must be at least 8 characters long',
      'password.noUppercase': 'Password must contain at least one uppercase letter',
      'password.noLowercase': 'Password must contain at least one lowercase letter',
      'password.noNumber': 'Password must contain at least one number',
    }),

  firstName: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'any.required': 'First name is required',
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 100 characters',
    }),

  lastName: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'any.required': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name must not exceed 100 characters',
    }),

  pseudo: Joi.string()
    .optional()
    .trim()
    .min(3)
    .max(50)
    .alphanum()
    .messages({
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must not exceed 50 characters',
      'string.alphanum': 'Username must contain only letters and numbers',
    }),

  bio: Joi.string()
    .optional()
    .trim()
    .max(160)
    .allow('')
    .messages({
      'string.max': 'Bio must not exceed 160 characters',
    }),

  avatarBase64: Joi.string()
    .optional()
    .allow('')
    .custom(base64ImageValidator)
    .messages({
      'image.invalidBase64': 'Avatar must be a valid base64-encoded image',
      'image.invalidMimeType': 'Avatar must be JPEG, PNG, WebP, or GIF format',
      'image.fileTooLarge': 'Avatar image is too large (max 375KB)',
    }),
});

/**
 * Joi schema for user login
 * Validates email and password format
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

/**
 * Joi schema for profile update
 * All fields are optional since users can update individual fields
 */
export const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .optional()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 100 characters',
    }),

  lastName: Joi.string()
    .optional()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name must not exceed 100 characters',
    }),

  pseudo: Joi.string()
    .optional()
    .trim()
    .min(3)
    .max(50)
    .alphanum()
    .messages({
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must not exceed 50 characters',
      'string.alphanum': 'Username must contain only letters and numbers',
    }),

  bio: Joi.string()
    .optional()
    .trim()
    .max(160)
    .allow('')
    .messages({
      'string.max': 'Bio must not exceed 160 characters',
    }),

  avatarBase64: Joi.string()
    .optional()
    .allow('')
    .custom(base64ImageValidator)
    .messages({
      'image.invalidBase64': 'Avatar must be a valid base64-encoded image',
      'image.invalidMimeType': 'Avatar must be JPEG, PNG, WebP, or GIF format',
      'image.fileTooLarge': 'Avatar image is too large (max 375KB)',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Joi schema for checking if email is unique
 * Validates email format for check-email endpoint
 */
export const checkEmailSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .max(255)
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
      'string.max': 'Email must not exceed 255 characters',
    }),
});

/**
 * Joi schema for checking if username/pseudo is unique
 * Validates username format for check-pseudo endpoint
 */
export const checkPseudoSchema = Joi.object({
  pseudo: Joi.string()
    .required()
    .trim()
    .min(3)
    .max(50)
    .alphanum()
    .messages({
      'any.required': 'Username is required',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must not exceed 50 characters',
      'string.alphanum': 'Username must contain only letters and numbers',
    }),
});

/**
 * Joi schema for password change
 * Validates old and new passwords
 */
export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required',
    }),

  newPassword: Joi.string()
    .required()
    .custom(strongPasswordValidator)
    .messages({
      'any.required': 'New password is required',
      'password.tooShort': 'Password must be at least 8 characters long',
      'password.noUppercase': 'Password must contain at least one uppercase letter',
      'password.noLowercase': 'Password must contain at least one lowercase letter',
      'password.noNumber': 'Password must contain at least one number',
    }),

  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'any.required': 'Password confirmation is required',
      'any.only': 'Password confirmation does not match new password',
    }),
});

/**
 * Joi schema for forgot password request
 * Validates email format
 */
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});

/**
 * Joi schema for password reset
 * Validates token, email, and new password
 */
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required',
    }),

  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  newPassword: Joi.string()
    .required()
    .custom(strongPasswordValidator)
    .messages({
      'any.required': 'New password is required',
      'password.tooShort': 'Password must be at least 8 characters long',
      'password.noUppercase': 'Password must contain at least one uppercase letter',
      'password.noLowercase': 'Password must contain at least one lowercase letter',
      'password.noNumber': 'Password must contain at least one number',
    }),

  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'any.required': 'Password confirmation is required',
      'any.only': 'Password confirmation does not match new password',
    }),
});

/**
 * Joi schema for creating a new notebook
 * Validates all required fields for notebook creation
 *
 * Required fields:
 * - title: 1-100 characters, trimmed
 * - type: Must be 'Voyage', 'Daily', or 'Reportage'
 * - format: Must be 'A4' or 'A5'
 * - orientation: Must be 'portrait' or 'landscape'
 *
 * Optional fields:
 * - description: Max 300 characters, trimmed
 * - dpi: Integer between 72 and 600 (default 300 in service layer)
 * - coverImageUrl: Valid URI, max 2048 characters
 */
export const createNotebookSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'any.required': 'Title is required',
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title must not exceed 100 characters',
    }),

  description: Joi.string()
    .trim()
    .max(300)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 300 characters',
    }),

  type: Joi.string()
    .valid('Voyage', 'Daily', 'Reportage')
    .required()
    .messages({
      'any.required': 'Notebook type is required',
      'any.only': 'Type must be one of: Voyage, Daily, Reportage',
    }),

  format: Joi.string()
    .valid('A4', 'A5')
    .required()
    .messages({
      'any.required': 'Notebook format is required',
      'any.only': 'Format must be one of: A4, A5',
    }),

  orientation: Joi.string()
    .valid('portrait', 'landscape')
    .required()
    .messages({
      'any.required': 'Notebook orientation is required',
      'any.only': 'Orientation must be one of: portrait, landscape',
    }),

  dpi: Joi.number()
    .integer()
    .min(72)
    .max(600)
    .optional()
    .messages({
      'number.base': 'DPI must be a number',
      'number.integer': 'DPI must be an integer',
      'number.min': 'DPI must be at least 72',
      'number.max': 'DPI must not exceed 600',
    }),

  coverImageUrl: Joi.string()
    .uri()
    .max(2048)
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Cover image URL must be a valid URI',
      'string.max': 'Cover image URL must not exceed 2048 characters',
    }),
});

/**
 * Joi schema for updating a notebook
 * Only mutable fields are allowed to be updated
 *
 * Mutable fields (all optional):
 * - title: 1-100 characters, trimmed
 * - description: Max 300 characters, trimmed
 * - coverImageUrl: Valid URI, max 2048 characters
 * - dpi: Integer between 72 and 600
 *
 * Immutable fields (will be rejected if present):
 * - type, format, orientation are NOT allowed in update
 * - These are set at creation time and cannot be changed
 * - The schema uses stripUnknown to remove any disallowed fields
 */
export const updateNotebookSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title must not exceed 100 characters',
    }),

  description: Joi.string()
    .trim()
    .max(300)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 300 characters',
    }),

  coverImageUrl: Joi.string()
    .uri()
    .max(2048)
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Cover image URL must be a valid URI',
      'string.max': 'Cover image URL must not exceed 2048 characters',
    }),

  dpi: Joi.number()
    .integer()
    .min(72)
    .max(600)
    .optional()
    .messages({
      'number.base': 'DPI must be a number',
      'number.integer': 'DPI must be an integer',
      'number.min': 'DPI must be at least 72',
      'number.max': 'DPI must not exceed 600',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Joi schema for creating a page
 * Validates page number and custom cover flag for page creation
 */
export const createPageSchema = Joi.object({
  pageNumber: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Page number must be a number',
      'number.integer': 'Page number must be an integer',
      'number.min': 'Page number must be at least 1',
      'any.required': 'Page number is required',
    }),

  isCustomCover: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'isCustomCover must be a boolean',
    }),
});

/**
 * Joi schema for updating a page
 * Only mutable fields (pageNumber, isCustomCover) are allowed
 */
export const updatePageSchema = Joi.object({
  pageNumber: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Page number must be a number',
      'number.integer': 'Page number must be an integer',
      'number.min': 'Page number must be at least 1',
    }),

  isCustomCover: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isCustomCover must be a boolean',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Joi schema for page element (canvas element)
 * Validates type, positioning, sizing, and content/styling properties
 */
export const pageElementSchema = Joi.object({
  type: Joi.string()
    .valid('text', 'image', 'shape', 'emoji', 'sticker', 'moodTracker')
    .required()
    .messages({
      'any.required': 'Element type is required',
      'any.only': 'Type must be one of: text, image, shape, emoji, sticker, moodTracker',
    }),

  x: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'X coordinate must be a number',
      'number.min': 'X coordinate must be >= 0',
      'any.required': 'X coordinate is required',
    }),

  y: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Y coordinate must be a number',
      'number.min': 'Y coordinate must be >= 0',
      'any.required': 'Y coordinate is required',
    }),

  width: Joi.number()
    .greater(0)
    .required()
    .messages({
      'number.base': 'Width must be a number',
      'number.greater': 'Width must be greater than 0',
      'any.required': 'Width is required',
    }),

  height: Joi.number()
    .greater(0)
    .required()
    .messages({
      'number.base': 'Height must be a number',
      'number.greater': 'Height must be greater than 0',
      'any.required': 'Height is required',
    }),

  rotation: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .default(0)
    .messages({
      'number.base': 'Rotation must be a number',
      'number.min': 'Rotation must be >= -180',
      'number.max': 'Rotation must be <= 180',
    }),

  zIndex: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Z-index must be a number',
      'number.integer': 'Z-index must be an integer',
      'number.min': 'Z-index must be >= 0',
    }),

  content: Joi.object()
    .required()
    .messages({
      'object.base': 'Content must be an object',
      'any.required': 'Content is required',
    }),

  style: Joi.object()
    .optional()
    .default({})
    .messages({
      'object.base': 'Style must be an object',
    }),

  metadata: Joi.object()
    .optional()
    .allow(null)
    .messages({
      'object.base': 'Metadata must be an object',
    }),
});

/**
 * Joi schema for text element content
 * Validates text-specific properties when type === 'text'
 */
export const textElementSchema = pageElementSchema.append({
  content: Joi.object({
    text: Joi.string()
      .max(1000)
      .required()
      .messages({
        'string.max': 'Text must not exceed 1000 characters',
        'any.required': 'Text is required',
      }),

    fontFamily: Joi.string()
      .required()
      .messages({
        'any.required': 'Font family is required',
      }),

    fontSize: Joi.number()
      .min(8)
      .max(200)
      .required()
      .messages({
        'number.base': 'Font size must be a number',
        'number.min': 'Font size must be at least 8',
        'number.max': 'Font size must not exceed 200',
        'any.required': 'Font size is required',
      }),

    fill: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .required()
      .messages({
        'string.pattern.base': 'Fill color must be a valid hex color (#RRGGBB)',
        'any.required': 'Fill color is required',
      }),

    textAlign: Joi.string()
      .valid('left', 'center', 'right')
      .optional()
      .messages({
        'any.only': 'Text align must be one of: left, center, right',
      }),

    fontWeight: Joi.string()
      .valid('normal', 'bold')
      .optional()
      .messages({
        'any.only': 'Font weight must be one of: normal, bold',
      }),

    fontStyle: Joi.string()
      .valid('normal', 'italic')
      .optional()
      .messages({
        'any.only': 'Font style must be one of: normal, italic',
      }),

    underline: Joi.boolean()
      .optional()
      .messages({
        'boolean.base': 'Underline must be a boolean',
      }),

    lineHeight: Joi.number()
      .optional()
      .messages({
        'number.base': 'Line height must be a number',
      }),
  }).required(),
});

/**
 * Joi schema for batch element create/update operations
 * Array of elements where each can be a new element or update
 * New elements: no id field
 * Update elements: include id field
 */
export const batchElementsSchema = Joi.array()
  .items(
    pageElementSchema.append({
      id: Joi.string()
        .uuid()
        .optional()
        .messages({
          'string.uuid': 'Element ID must be a valid UUID',
        }),
    }),
  )
  .min(1)
  .max(100)
  .messages({
    'array.base': 'Elements must be an array',
    'array.min': 'At least one element must be provided',
    'array.max': 'Cannot process more than 100 elements at once',
  });

/**
 * Joi schema for updating a single page element
 * Only mutable fields are allowed (x, y, width, height, rotation, zIndex, content, style, metadata)
 */
export const updateElementSchema = Joi.object({
  x: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'X coordinate must be a number',
      'number.min': 'X coordinate must be >= 0',
    }),

  y: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Y coordinate must be a number',
      'number.min': 'Y coordinate must be >= 0',
    }),

  width: Joi.number()
    .greater(0)
    .optional()
    .messages({
      'number.base': 'Width must be a number',
      'number.greater': 'Width must be greater than 0',
    }),

  height: Joi.number()
    .greater(0)
    .optional()
    .messages({
      'number.base': 'Height must be a number',
      'number.greater': 'Height must be greater than 0',
    }),

  rotation: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .messages({
      'number.base': 'Rotation must be a number',
      'number.min': 'Rotation must be >= -180',
      'number.max': 'Rotation must be <= 180',
    }),

  zIndex: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Z-index must be a number',
      'number.integer': 'Z-index must be an integer',
      'number.min': 'Z-index must be >= 0',
    }),

  content: Joi.object()
    .optional()
    .messages({
      'object.base': 'Content must be an object',
    }),

  style: Joi.object()
    .optional()
    .messages({
      'object.base': 'Style must be an object',
    }),

  metadata: Joi.object()
    .optional()
    .allow(null)
    .messages({
      'object.base': 'Metadata must be an object',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Joi schema for creating/validating a saved text
 * Validates text elements for the user's personal library
 */
export const createSavedTextSchema = Joi.object({
  label: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(100)
    .messages({
      'any.required': 'Label is required',
      'string.min': 'Label must be at least 1 character',
      'string.max': 'Label must not exceed 100 characters',
    }),

  content: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(1000)
    .messages({
      'any.required': 'Content is required',
      'string.min': 'Content must be at least 1 character',
      'string.max': 'Content must not exceed 1000 characters',
    }),

  fontSize: Joi.number()
    .required()
    .min(8)
    .max(200)
    .messages({
      'any.required': 'Font size is required',
      'number.min': 'Font size must be at least 8 pixels',
      'number.max': 'Font size must not exceed 200 pixels',
    }),

  fontFamily: Joi.string()
    .required()
    .trim()
    .messages({
      'any.required': 'Font family is required',
    }),

  fontWeight: Joi.string()
    .required()
    .valid('normal', 'bold', '600', '700')
    .messages({
      'any.required': 'Font weight is required',
      'any.only': 'Font weight must be one of: normal, bold, 600, 700',
    }),

  fontStyle: Joi.string()
    .required()
    .valid('normal', 'italic')
    .messages({
      'any.required': 'Font style is required',
      'any.only': 'Font style must be one of: normal, italic',
    }),

  textDecoration: Joi.string()
    .required()
    .valid('none', 'underline', 'line-through')
    .messages({
      'any.required': 'Text decoration is required',
      'any.only': 'Text decoration must be one of: none, underline, line-through',
    }),

  color: Joi.string()
    .required()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .messages({
      'any.required': 'Color is required',
      'string.pattern.base': 'Color must be a valid HEX code (e.g., #000000)',
    }),

  textAlign: Joi.string()
    .required()
    .valid('left', 'center', 'right')
    .messages({
      'any.required': 'Text alignment is required',
      'any.only': 'Text alignment must be one of: left, center, right',
    }),

  lineHeight: Joi.number()
    .required()
    .min(0.8)
    .max(3)
    .messages({
      'any.required': 'Line height is required',
      'number.min': 'Line height must be at least 0.8',
      'number.max': 'Line height must not exceed 3.0',
    }),

  type: Joi.string()
    .optional()
    .trim()
    .messages({
      'string.base': 'Type must be a string',
    }),
});

/**
 * Joi schema for updating a saved text
 * All fields are optional; at least one field must be provided
 */
export const updateSavedTextSchema = Joi.object({
  label: Joi.string()
    .optional()
    .trim()
    .min(1)
    .max(100)
    .messages({
      'string.min': 'Label must be at least 1 character',
      'string.max': 'Label must not exceed 100 characters',
    }),

  content: Joi.string()
    .optional()
    .trim()
    .min(1)
    .max(1000)
    .messages({
      'string.min': 'Content must be at least 1 character',
      'string.max': 'Content must not exceed 1000 characters',
    }),

  fontSize: Joi.number()
    .optional()
    .min(8)
    .max(200)
    .messages({
      'number.min': 'Font size must be at least 8 pixels',
      'number.max': 'Font size must not exceed 200 pixels',
    }),

  fontFamily: Joi.string()
    .optional()
    .trim()
    .messages({
      'string.base': 'Font family must be a string',
    }),

  fontWeight: Joi.string()
    .optional()
    .valid('normal', 'bold', '600', '700')
    .messages({
      'any.only': 'Font weight must be one of: normal, bold, 600, 700',
    }),

  fontStyle: Joi.string()
    .optional()
    .valid('normal', 'italic')
    .messages({
      'any.only': 'Font style must be one of: normal, italic',
    }),

  textDecoration: Joi.string()
    .optional()
    .valid('none', 'underline', 'line-through')
    .messages({
      'any.only': 'Text decoration must be one of: none, underline, line-through',
    }),

  color: Joi.string()
    .optional()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .messages({
      'string.pattern.base': 'Color must be a valid HEX code (e.g., #000000)',
    }),

  textAlign: Joi.string()
    .optional()
    .valid('left', 'center', 'right')
    .messages({
      'any.only': 'Text alignment must be one of: left, center, right',
    }),

  lineHeight: Joi.number()
    .optional()
    .min(0.8)
    .max(3)
    .messages({
      'number.min': 'Line height must be at least 0.8',
      'number.max': 'Line height must not exceed 3.0',
    }),

  type: Joi.string()
    .optional()
    .trim()
    .messages({
      'string.base': 'Type must be a string',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Validation middleware factory
 *
 * Creates a middleware function that validates request data against a Joi schema.
 * Supports validation of body, query parameters, and URL parameters.
 *
 * @param {Joi.ObjectSchema} schema - Joi schema to validate against
 * @param {string} property - Request property to validate ('body', 'query', or 'params')
 * @returns {Function} Express middleware function
 *
 * @example
 * // In routes
 * router.post('/register', validate(registerSchema, 'body'), authController.register);
 * router.get('/verify', validate(verifyTokenSchema, 'query'), authController.verify);
 */
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const dataToValidate = req[property];

    // Validate data against schema
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Collect all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
      convert: true, // Type conversion (e.g., string to number)
    });

    if (error) {
      // Extract error messages
      const errorMessages = error.details.map((detail) => detail.message);

      logger.warn('Validation failed', {
        property,
        errors: errorMessages,
        path: req.path,
      });

      // Return validation error
      throw new AppError(`Validation error: ${errorMessages.join(', ')}`, 400);
    }

    // Replace request data with validated and sanitized data
    req[property] = value;

    next();
  };
};

/**
 * US04 MEDIA OPERATIONS VALIDATION SCHEMAS
 * ==========================================
 *
 * Schemas for media upload, page elements, transformations, and sticker operations
 * as defined in US04-TASK09.
 */

/**
 * Joi schema for media file upload validation
 * Validates FormData with file size and MIME type checks
 *
 * Note: Multer parses file into req.file, not in body.
 * This schema is for request body fields accompanying the file.
 * File validation happens in middleware using fileValidation utilities.
 *
 * Constraints:
 * - file: must be present, <= 10 MB
 * - MIME type: one of image/jpeg, image/png, image/svg+xml
 */
export const uploadMediaSchema = Joi.object({
  // File object is handled by Multer middleware, not Joi
  // This schema validates any additional body/query parameters
}).unknown(true); // Allow Multer's file object

/**
 * Joi schema for creating a page element (media, emoji, sticker, or shape)
 * Validates positioning, dimensions, and element-specific properties
 *
 * IMPORTANT: All position and dimension values are in MILLIMETERS (mm) for consistency
 * with PDF export and multi-format support. Frontend converts pixels to mm before sending.
 *
 * Constraints:
 * - pageId: UUID required
 * - type: enum (image, emoji, sticker, shape, text) required
 * - x, y: number 0-2000mm required (page position)
 * - width, height: number 0.5-3000mm required (element dimensions in millimeters)
 * - rotation: number 0-360 optional (default 0)
 * - zIndex: number 0-999 optional
 * - cloudinaryUrl: URL string required if type === image/sticker
 * - emojiContent: string 1-10 chars required if type === emoji
 * - shapeType: enum (circle, square, rectangle, triangle, heart) required if type === shape
 * - fillColor: hex color #RRGGBB required if type === shape
 * - opacity: number 0-100 optional (default 100)
 * - stickerLibraryId: UUID optional for sticker reference
 * - content: object optional, contains element-specific data (text content, styling, etc.)
 * - style: object optional, contains visual styling (fill, opacity, stroke, etc.)
 */
export const createPageElementSchema = Joi.object({
  pageId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.uuid': 'Page ID must be a valid UUID',
      'any.required': 'Page ID is required',
    }),

  type: Joi.string()
    .valid('text', 'image', 'emoji', 'sticker', 'shape', 'moodTracker')
    .required()
    .messages({
      'any.required': 'Element type is required',
      'any.only': 'Type must be one of: text, image, emoji, sticker, shape, moodTracker',
    }),

  x: Joi.number()
    .min(0)
    .max(2000)
    .required()
    .messages({
      'number.base': 'Position X must be a number',
      'number.min': 'Position X must be between 0 and 2000',
      'number.max': 'Position X must be between 0 and 2000',
      'any.required': 'Position X is required',
    }),

  y: Joi.number()
    .min(0)
    .max(2000)
    .required()
    .messages({
      'number.base': 'Position Y must be a number',
      'number.min': 'Position Y must be between 0 and 2000',
      'number.max': 'Position Y must be between 0 and 2000',
      'any.required': 'Position Y is required',
    }),

  width: Joi.number()
    .min(0.5)
    .max(3000)
    .required()
    .messages({
      'number.base': 'Width must be a number',
      'number.min': 'Width must be between 0.5mm and 3000mm (minimum ~2px at 96 DPI)',
      'number.max': 'Width must be between 0.5mm and 3000mm (maximum ~11339px at 96 DPI)',
      'any.required': 'Width is required',
    }),

  height: Joi.number()
    .min(0.5)
    .max(3000)
    .required()
    .messages({
      'number.base': 'Height must be a number',
      'number.min': 'Height must be between 0.5mm and 3000mm (minimum ~2px at 96 DPI)',
      'number.max': 'Height must be between 0.5mm and 3000mm (maximum ~11339px at 96 DPI)',
      'any.required': 'Height is required',
    }),

  rotation: Joi.number()
    .min(0)
    .max(360)
    .optional()
    .default(0)
    .messages({
      'number.base': 'Rotation must be a number',
      'number.min': 'Rotation must be between 0 and 360',
      'number.max': 'Rotation must be between 0 and 360',
    }),

  zIndex: Joi.number()
    .integer()
    .min(0)
    .max(999)
    .optional()
    .messages({
      'number.base': 'Z-index must be a number',
      'number.integer': 'Z-index must be an integer',
      'number.min': 'Z-index must be between 0 and 999',
      'number.max': 'Z-index must be between 0 and 999',
    }),

  cloudinaryUrl: Joi.when('type', {
    is: Joi.string().valid('image', 'sticker'),
    then: Joi.string()
      .uri()
      .required()
      .messages({
        'string.uri': 'Cloud URL must be a valid URI',
        'any.required': 'Cloud URL is required for image and sticker elements',
      }),
    otherwise: Joi.string()
      .uri()
      .optional()
      .allow(''),
  }),

  emojiContent: Joi.when('type', {
    is: 'emoji',
    then: Joi.string()
      .min(1)
      .max(10)
      .required()
      .messages({
        'string.min': 'Emoji content must be at least 1 character',
        'string.max': 'Emoji content must not exceed 10 characters',
        'any.required': 'Emoji content is required for emoji elements',
      }),
    otherwise: Joi.string()
      .optional()
      .allow(''),
  }),

  shapeType: Joi.when('type', {
    is: 'shape',
    then: Joi.string()
      .valid('circle', 'square', 'rectangle', 'triangle', 'heart')
      .required()
      .messages({
        'any.only': 'Shape type must be one of: circle, square, rectangle, triangle, heart',
        'any.required': 'Shape type is required for shape elements',
      }),
    otherwise: Joi.string()
      .optional()
      .allow(''),
  }),

  fillColor: Joi.when('type', {
    is: 'shape',
    then: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .required()
      .messages({
        'string.pattern.base': 'Fill color must be a valid hex color (#RRGGBB)',
        'any.required': 'Fill color is required for shape elements',
      }),
    otherwise: Joi.string()
      .optional()
      .allow(''),
  }),

  opacity: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .default(100)
    .messages({
      'number.base': 'Opacity must be a number',
      'number.min': 'Opacity must be between 0 and 100',
      'number.max': 'Opacity must be between 0 and 100',
    }),

  stickerLibraryId: Joi.alternatives().try(
    Joi.string().uuid({ version: 'uuidv4' }),
    Joi.string().allow(''),
    Joi.any().allow(null)
  ).optional()
    .messages({
      'string.uuid': 'Sticker library ID must be a valid UUID',
    }),

  content: Joi.object()
    .optional()
    .messages({
      'object.base': 'Content must be an object',
    }),

  style: Joi.object()
    .optional()
    .messages({
      'object.base': 'Style must be an object',
    }),

  metadata: Joi.object()
    .optional()
    .allow(null)
    .messages({
      'object.base': 'Metadata must be an object',
    }),
}).unknown(true);

/**
 * Joi schema for updating a page element (PATCH semantics)
 * All fields are optional for partial updates
 *
 * IMPORTANT: Position and dimension values are in MILLIMETERS (mm)
 * Same constraints as createPageElementSchema but all fields optional
 */
export const updatePageElementSchema = Joi.object({
  type: Joi.string()
    .valid('text', 'image', 'emoji', 'sticker', 'shape', 'moodTracker')
    .optional()
    .messages({
      'any.only': 'Type must be one of: text, image, emoji, sticker, shape, moodTracker',
    }),

  x: Joi.number()
    .min(0)
    .max(2000)
    .optional()
    .messages({
      'number.base': 'Position X must be a number',
      'number.min': 'Position X must be between 0 and 2000mm',
      'number.max': 'Position X must be between 0 and 2000mm',
    }),

  y: Joi.number()
    .min(0)
    .max(2000)
    .optional()
    .messages({
      'number.base': 'Position Y must be a number',
      'number.min': 'Position Y must be between 0 and 2000mm',
      'number.max': 'Position Y must be between 0 and 2000mm',
    }),

  width: Joi.number()
    .min(0.5)
    .max(3000)
    .optional()
    .messages({
      'number.base': 'Width must be a number',
      'number.min': 'Width must be between 0.5mm and 3000mm (minimum ~2px at 96 DPI)',
      'number.max': 'Width must be between 0.5mm and 3000mm (maximum ~11339px at 96 DPI)',
    }),

  height: Joi.number()
    .min(0.5)
    .max(3000)
    .optional()
    .messages({
      'number.base': 'Height must be a number',
      'number.min': 'Height must be between 0.5mm and 3000mm (minimum ~2px at 96 DPI)',
      'number.max': 'Height must be between 0.5mm and 3000mm (maximum ~11339px at 96 DPI)',
    }),

  rotation: Joi.number()
    .min(0)
    .max(360)
    .optional()
    .messages({
      'number.base': 'Rotation must be a number',
      'number.min': 'Rotation must be between 0 and 360',
      'number.max': 'Rotation must be between 0 and 360',
    }),

  zIndex: Joi.number()
    .integer()
    .min(0)
    .max(999)
    .optional()
    .messages({
      'number.base': 'Z-index must be a number',
      'number.integer': 'Z-index must be an integer',
      'number.min': 'Z-index must be between 0 and 999',
      'number.max': 'Z-index must be between 0 and 999',
    }),

  cloudinaryUrl: Joi.string()
    .uri()
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Cloud URL must be a valid URI',
    }),

  emojiContent: Joi.string()
    .min(1)
    .max(10)
    .optional()
    .allow('')
    .messages({
      'string.min': 'Emoji content must be at least 1 character',
      'string.max': 'Emoji content must not exceed 10 characters',
    }),

  shapeType: Joi.string()
    .valid('circle', 'square', 'rectangle', 'triangle', 'heart')
    .optional()
    .allow('')
    .messages({
      'any.only': 'Shape type must be one of: circle, square, rectangle, triangle, heart',
    }),

  fillColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Fill color must be a valid hex color (#RRGGBB)',
    }),

  opacity: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Opacity must be a number',
      'number.min': 'Opacity must be between 0 and 100',
      'number.max': 'Opacity must be between 0 and 100',
    }),

  stickerLibraryId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .optional()
    .allow('')
    .messages({
      'string.uuid': 'Sticker library ID must be a valid UUID',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
}).unknown(false);

/**
 * Joi schema for image transformation operations
 * Validates crop bounds and adjustment parameters
 *
 * Constraints:
 * - crop: object { x, y, width, height } optional
 *   - x, y: >= 0
 *   - width, height: > 0
 * - brightness: number -100 to 100 optional
 * - contrast: number -100 to 100 optional
 * - saturation: number -100 to 100 optional
 * - rotation: enum [0, 90, 180, 270] optional
 * - flip: enum [horizontal, vertical] optional
 * - At least one transformation required
 */
export const transformImageSchema = Joi.object({
  crop: Joi.object({
    x: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': 'Crop X must be a number',
        'number.min': 'Crop X must be >= 0',
        'any.required': 'Crop X is required when crop is specified',
      }),

    y: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': 'Crop Y must be a number',
        'number.min': 'Crop Y must be >= 0',
        'any.required': 'Crop Y is required when crop is specified',
      }),

    width: Joi.number()
      .greater(0)
      .required()
      .messages({
        'number.base': 'Crop width must be a number',
        'number.greater': 'Crop width must be > 0',
        'any.required': 'Crop width is required when crop is specified',
      }),

    height: Joi.number()
      .greater(0)
      .required()
      .messages({
        'number.base': 'Crop height must be a number',
        'number.greater': 'Crop height must be > 0',
        'any.required': 'Crop height is required when crop is specified',
      }),
  })
    .optional()
    .messages({
      'object.base': 'Crop must be an object',
    }),

  brightness: Joi.number()
    .min(-100)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Brightness must be a number',
      'number.min': 'Brightness must be between -100 and 100',
      'number.max': 'Brightness must be between -100 and 100',
    }),

  contrast: Joi.number()
    .min(-100)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Contrast must be a number',
      'number.min': 'Contrast must be between -100 and 100',
      'number.max': 'Contrast must be between -100 and 100',
    }),

  saturation: Joi.number()
    .min(-100)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Saturation must be a number',
      'number.min': 'Saturation must be between -100 and 100',
      'number.max': 'Saturation must be between -100 and 100',
    }),

  rotation: Joi.number()
    .valid(0, 90, 180, 270)
    .optional()
    .messages({
      'any.only': 'Rotation must be one of: 0, 90, 180, 270',
    }),

  flip: Joi.string()
    .valid('horizontal', 'vertical')
    .optional()
    .messages({
      'any.only': 'Flip must be one of: horizontal, vertical',
    }),
}).min(1).messages({
  'object.min': 'At least one transformation must be provided',
}).unknown(false);

/**
 * Joi schema for sticker upload
 * Validates file upload with sticker metadata
 *
 * Constraints:
 * - name: string 1-100 chars required
 * - tags: array of strings max 10, each 1-30 chars optional
 * - file: present, < 10 MB (validated via Multer middleware)
 */
export const stickerUploadSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Sticker name is required',
      'any.required': 'Sticker name is required',
      'string.min': 'Sticker name must be at least 1 character',
      'string.max': 'Sticker name must not exceed 100 characters',
    }),

  tags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(30)
        .messages({
          'string.min': 'Each tag must be at least 1 character',
          'string.max': 'Each tag must not exceed 30 characters',
        })
    )
    .max(10)
    .optional()
    .default([])
    .messages({
      'array.base': 'Tags must be an array',
      'array.max': 'Maximum 10 tags allowed',
    }),
}).unknown(true); // Allow Multer's file object

/**
 * Joi schema for renaming a sticker
 * Validates new name and optional tags for renaming operation
 *
 * Constraints:
 * - newName: string 1-100 chars required
 * - newTags: array of strings max 10, each 1-30 chars optional
 */
export const renameStickerSchema = Joi.object({
  newName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'New name is required',
      'any.required': 'New name is required',
      'string.min': 'New name must be at least 1 character',
      'string.max': 'New name must not exceed 100 characters',
    }),

  newTags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(30)
        .messages({
          'string.min': 'Each tag must be at least 1 character',
          'string.max': 'Each tag must not exceed 30 characters',
        })
    )
    .max(10)
    .optional()
    .messages({
      'array.base': 'Tags must be an array',
      'array.max': 'Maximum 10 tags allowed',
    }),
}).unknown(false);

/**
 * Middleware function to validate file uploads
 * Validates Multer req.file object for media uploads
 *
 * This validates the file AFTER Multer has processed it.
 * Checks:
 * - File exists and is not empty
 * - File size <= 10 MB
 * - MIME type is allowed
 * - File format/extension is allowed
 *
 * @param {MulterRequest} req - Express request object with Multer file
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @throws {AppError} If file validation fails
 *
 * @example
 * router.post('/upload', upload.single('file'), validateFileUpload, controller.handleUpload);
 */
export const validateFileUpload = (req: Request, _res: Response, next: NextFunction): void => {
  const multerReq = req as MulterRequest;
  if (!multerReq.file) {
    throw new AppError('File is required', 400);
  }

  // Check file size (Multer may filter, but double-check)
  const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
  if (multerReq.file.size > maxSizeBytes) {
    const sizeMB = (multerReq.file.size / (1024 * 1024)).toFixed(2);
    throw new AppError(
      `File too large (${sizeMB} MB > 10 MB)`,
      400
    );
  }

  // Check MIME type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/svg+xml'];
  if (!allowedMimes.includes(multerReq.file.mimetype)) {
    throw new AppError(
      `Invalid file type '${multerReq.file.mimetype}'. Allowed: image/jpeg, image/png, image/svg+xml`,
      400
    );
  }

  next();
};

/**
 * Sanitize email middleware
 *
 * Ensures email is lowercase and trimmed before processing.
 * This is a lightweight alternative to full validation when only
 * email normalization is needed.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * router.post('/login', sanitizeEmail, authController.login);
 */
export const sanitizeEmail = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body.email) {
    req.body.email = req.body.email.toLowerCase().trim();
  }
  next();
};

export default {
  validate,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  checkEmailSchema,
  checkPseudoSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createNotebookSchema,
  updateNotebookSchema,
  createPageSchema,
  updatePageSchema,
  pageElementSchema,
  textElementSchema,
  batchElementsSchema,
  updateElementSchema,
  createSavedTextSchema,
  updateSavedTextSchema,
  uploadMediaSchema,
  createPageElementSchema,
  updatePageElementSchema,
  transformImageSchema,
  stickerUploadSchema,
  renameStickerSchema,
  validateFileUpload,
  sanitizeEmail,
};
