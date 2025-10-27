/**
 * Global Error Handler Middleware
 *
 * This middleware catches all errors that occur in the application and
 * formats them into consistent JSON responses. It prevents sensitive
 * information from being leaked to clients.
 *
 * Error handling strategy:
 * - Operational errors (expected): Return user-friendly messages
 * - Programming errors (bugs): Log details but return generic message
 * - Never expose stack traces in production
 * - Always log errors for debugging
 *
 * @module middleware/errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom error class for application-specific errors
 *
 * This class extends the built-in Error class to include HTTP status codes
 * and flags to indicate whether the error is operational (expected) or
 * a programming error (bug).
 *
 * @class AppError
 * @extends Error
 *
 * @example
 * throw new AppError('User not found', 404);
 * throw new AppError('Invalid password', 401);
 */
export class AppError extends Error {
  /**
   * HTTP status code for this error
   * @type {number}
   */
  public statusCode: number;

  /**
   * Whether this is an operational error (expected) or programming error (bug)
   * Operational errors are safe to send to clients
   * @type {boolean}
   */
  public isOperational: boolean;

  /**
   * Create a new AppError
   *
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {boolean} isOperational - Whether error is operational (default: true)
   */
  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Interface for error response sent to client
 * Ensures consistent error response format across the API
 *
 * @interface ErrorResponse
 */
interface ErrorResponse {
  status: 'error' | 'fail';
  statusCode: number;
  message: string;
  stack?: string; // Only included in development mode
}

/**
 * Determine if error is operational (safe to send details to client)
 *
 * @param {any} error - The error to check
 * @returns {boolean} True if error is operational
 */
const isOperationalError = (error: any): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Get appropriate HTTP status code from error
 *
 * @param {any} error - The error object
 * @returns {number} HTTP status code
 */
const getStatusCode = (error: any): number => {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Default to 500 for unknown errors
  return 500;
};

/**
 * Get safe error message to send to client
 *
 * @param {any} error - The error object
 * @param {boolean} isDevelopment - Whether app is in development mode
 * @returns {string} Error message safe to send to client
 */
const getErrorMessage = (error: any, isDevelopment: boolean): string => {
  // In development, always show the actual error message
  if (isDevelopment) {
    return error.message || 'An error occurred';
  }

  // In production, only show message for operational errors
  if (isOperationalError(error)) {
    return error.message;
  }

  // For programming errors in production, send generic message
  return 'Internal server error';
};

/**
 * Global error handling middleware
 *
 * This middleware must be registered AFTER all routes and other middleware.
 * It catches any errors thrown in the application and formats them into
 * consistent JSON responses.
 *
 * Express error handlers must have 4 parameters: (err, req, res, next)
 * even if you don't use all of them.
 *
 * @param {any} err - The error that was thrown
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function (unused but required)
 *
 * @example
 * // In app.ts, register this AFTER all routes
 * app.use(errorHandler);
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDevelopment = process.env['NODE_ENV'] === 'development';
  const statusCode = getStatusCode(err);
  const message = getErrorMessage(err, isDevelopment);

  // Log all errors for debugging
  logger.error('Error occurred', {
    message: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
    isOperational: isOperationalError(err),
  });

  // Build error response
  const errorResponse: ErrorResponse = {
    status: statusCode >= 500 ? 'error' : 'fail',
    statusCode,
    message,
  };

  // Include stack trace only in development mode
  if (isDevelopment && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware to catch 404 errors (route not found)
 *
 * This middleware should be registered AFTER all valid routes but BEFORE
 * the error handler. It catches any requests that don't match defined routes.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // In app.ts
 * app.use('/api', routes);
 * app.use(notFoundHandler); // After routes
 * app.use(errorHandler);    // After notFoundHandler
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Async error wrapper utility
 *
 * This utility wraps async route handlers to automatically catch errors
 * and pass them to the error handler middleware. Without this, async errors
 * would cause unhandled promise rejections.
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function that catches errors
 *
 * @example
 * // Instead of try/catch in every route
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.findAll();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
