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
  sanitizeEmail,
};
