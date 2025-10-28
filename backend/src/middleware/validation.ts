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
    .max(500000)
    .allow('')
    .messages({
      'string.max': 'Avatar image is too large (max 375KB)',
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
    .max(500000)
    .allow('')
    .messages({
      'string.max': 'Avatar image is too large (max 375KB)',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
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
  sanitizeEmail,
};
