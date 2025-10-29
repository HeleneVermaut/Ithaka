/**
 * UUID Validation Middleware
 *
 * This middleware validates that route parameters are valid UUIDs (v1-v5).
 * Invalid UUID formats are rejected at the middleware layer before reaching
 * controllers or services, providing early validation and clear error messages.
 *
 * UUID format: 8-4-4-4-12 hexadecimal characters
 * Example: 123e4567-e89b-12d3-a456-426614174000
 *
 * Security benefits:
 * - Prevents malformed input from reaching database queries
 * - Provides consistent validation across all routes
 * - Returns clear error messages to clients
 * - Reduces unnecessary database lookups for invalid IDs
 *
 * @module middleware/uuidValidator
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Regular expression for validating UUID format (v1-v5)
 *
 * Pattern breakdown:
 * - [0-9a-f]{8}: 8 hexadecimal characters
 * - [0-9a-f]{4}: 4 hexadecimal characters
 * - [1-5][0-9a-f]{3}: version digit (1-5) followed by 3 hex characters
 * - [89ab][0-9a-f]{3}: variant bits (8, 9, a, or b) followed by 3 hex characters
 * - [0-9a-f]{12}: 12 hexadecimal characters
 *
 * Flags:
 * - i: case insensitive (accepts both uppercase and lowercase)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Create UUID validation middleware for a specific parameter name
 *
 * This factory function creates middleware that validates a specific route parameter
 * is a valid UUID format. If validation fails, it returns a 400 Bad Request response.
 *
 * @param {string} paramName - The name of the route parameter to validate (default: 'id')
 * @returns {Function} Express middleware function
 *
 * @example
 * // Validate :id parameter
 * router.get('/notebooks/:id', validateUUID('id'), getNotebook);
 *
 * @example
 * // Validate :pageId parameter
 * router.get('/pages/:pageId', validateUUID('pageId'), getPage);
 *
 * @example
 * // Validate multiple parameters in sequence
 * router.get(
 *   '/notebooks/:notebookId/pages/:pageId',
 *   validateUUID('notebookId'),
 *   validateUUID('pageId'),
 *   getPage
 * );
 */
export const validateUUID = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];

    // Check if parameter exists in request
    if (!value) {
      logger.warn('UUID validation failed: Missing parameter', {
        paramName,
        path: req.path,
        method: req.method,
      });

      res.status(400).json({
        status: 'fail',
        statusCode: 400,
        message: `Missing required parameter: ${paramName}`,
      });
      return;
    }

    // Validate UUID format
    if (!UUID_REGEX.test(value)) {
      logger.warn('UUID validation failed: Invalid format', {
        paramName,
        value,
        path: req.path,
        method: req.method,
      });

      res.status(400).json({
        status: 'fail',
        statusCode: 400,
        message: `Invalid UUID format for parameter: ${paramName}`,
        detail: 'Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      });
      return;
    }

    // Validation passed, proceed to next middleware
    next();
  };
};

/**
 * Convenience validator for 'id' parameter
 *
 * Pre-configured middleware for the most common case: validating :id parameter.
 * Use this for routes like /notebooks/:id, /users/:id, etc.
 *
 * @example
 * router.get('/notebooks/:id', validateId, getNotebook);
 * router.put('/notebooks/:id', validateId, updateNotebook);
 * router.delete('/notebooks/:id', validateId, deleteNotebook);
 */
export const validateId = validateUUID('id');

/**
 * Convenience validator for 'notebookId' parameter
 *
 * Pre-configured middleware for validating :notebookId in nested routes.
 *
 * @example
 * router.get('/notebooks/:notebookId/pages', validateNotebookId, getPages);
 * router.post('/notebooks/:notebookId/pages', validateNotebookId, createPage);
 */
export const validateNotebookId = validateUUID('notebookId');

/**
 * Convenience validator for 'pageId' parameter
 *
 * Pre-configured middleware for validating :pageId in page routes.
 *
 * @example
 * router.get('/pages/:pageId', validatePageId, getPage);
 * router.put('/pages/:pageId', validatePageId, updatePage);
 * router.delete('/pages/:pageId', validatePageId, deletePage);
 */
export const validatePageId = validateUUID('pageId');

/**
 * Convenience validator for 'elementId' parameter
 *
 * Pre-configured middleware for validating :elementId in element routes.
 *
 * @example
 * router.put('/elements/:elementId', validateElementId, updateElement);
 * router.delete('/elements/:elementId', validateElementId, deleteElement);
 */
export const validateElementId = validateUUID('elementId');

export default {
  validateUUID,
  validateId,
  validateNotebookId,
  validatePageId,
  validateElementId,
};
