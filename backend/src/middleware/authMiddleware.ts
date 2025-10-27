/**
 * Authentication Middleware
 *
 * This middleware protects routes by verifying JWT tokens in cookies.
 * It ensures that only authenticated users can access protected endpoints.
 *
 * Security features:
 * - Verifies JWT token signature and expiration
 * - Extracts user information from token
 * - Attaches user data to request object for use in controllers
 * - Handles token errors gracefully
 *
 * @module middleware/authMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, DecodedJWT } from '../utils/jwt';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Extend Express Request interface to include user property
 * This allows TypeScript to recognize req.user in our route handlers
 *
 * @interface AuthRequest
 * @extends Request
 */
export interface AuthRequest extends Request {
  /**
   * User information extracted from JWT token
   * Available in all authenticated routes
   */
  user?: DecodedJWT;
}

/**
 * Authentication middleware to verify JWT tokens
 *
 * This middleware:
 * 1. Extracts the access token from httpOnly cookies
 * 2. Verifies the token is valid and not expired
 * 3. Attaches decoded user data to request object
 * 4. Allows request to proceed to the route handler
 *
 * If authentication fails, it throws an error that will be caught
 * by the global error handler.
 *
 * @async
 * @param {AuthRequest} req - Express request object (extended with user property)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @throws {AppError} 401 if token is missing, invalid, or expired
 *
 * @example
 * // Protect a route
 * router.get('/profile', authenticateUser, getUserProfile);
 *
 * // Access user data in controller
 * const getUserProfile = (req: AuthRequest, res: Response) => {
 *   const userId = req.user?.userId;
 *   // ... fetch user data
 * };
 */
export const authenticateUser = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from cookies
    // Note: cookie-parser middleware must be registered before this middleware
    const token = req.cookies['accessToken'];

    // Check if token exists
    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        path: req.path,
        ip: req.ip,
      });
      throw new AppError('Authentication required. Please log in.', 401);
    }

    // Verify and decode the token
    try {
      const decoded = verifyAccessToken(token);

      // Attach user information to request object
      // This makes user data available to all subsequent middleware and route handlers
      req.user = decoded;

      logger.debug('User authenticated successfully', {
        userId: decoded.userId,
        path: req.path,
      });

      // Proceed to next middleware or route handler
      next();
    } catch (error) {
      // Token verification failed (expired, invalid, etc.)
      logger.warn('Token verification failed', {
        error: (error as Error).message,
        path: req.path,
      });

      if ((error as Error).message === 'Token expired') {
        throw new AppError('Your session has expired. Please log in again.', 401);
      }

      throw new AppError('Invalid authentication token. Please log in again.', 401);
    }
  } catch (error) {
    // Pass error to global error handler
    next(error);
  }
};

/**
 * Optional authentication middleware
 *
 * This middleware attempts to authenticate the user but doesn't fail
 * if no token is provided. Useful for routes that have different behavior
 * for authenticated vs. anonymous users.
 *
 * @async
 * @param {AuthRequest} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Route accessible to everyone, but with extra features for logged-in users
 * router.get('/notebooks/public', optionalAuth, getPublicNotebooks);
 *
 * const getPublicNotebooks = (req: AuthRequest, res: Response) => {
 *   if (req.user) {
 *     // Show personalized content for logged-in users
 *   } else {
 *     // Show public content only
 *   }
 * };
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies['accessToken'];

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;

      logger.debug('Optional auth: User authenticated', {
        userId: decoded.userId,
      });
    } catch (error) {
      // Token verification failed, but continue without authentication
      logger.debug('Optional auth: Token verification failed, continuing as anonymous');
    }

    next();
  } catch (error) {
    // Even if optional auth fails, continue to next middleware
    next();
  }
};

/**
 * Role-based authorization middleware factory
 *
 * This function creates middleware that checks if the authenticated user
 * has one of the required roles. Must be used AFTER authenticateUser middleware.
 *
 * @param {string[]} allowedRoles - Array of roles that can access the route
 * @returns {Function} Middleware function that checks user role
 * @throws {AppError} 403 if user doesn't have required role
 *
 * @example
 * // Only admins can access this route
 * router.delete('/users/:id', authenticateUser, requireRole(['admin']), deleteUser);
 *
 * // Admins and moderators can access this route
 * router.post('/content/review', authenticateUser, requireRole(['admin', 'moderator']), reviewContent);
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated (should be guaranteed by authenticateUser middleware)
      if (!req.user) {
        logger.error('requireRole called without authentication middleware');
        throw new AppError('Authentication required', 401);
      }

      const userRole = req.user.role;

      // Check if user has one of the allowed roles
      if (!userRole || !allowedRoles.includes(userRole)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          userId: req.user.userId,
          userRole,
          requiredRoles: allowedRoles,
          path: req.path,
        });

        throw new AppError('You do not have permission to access this resource', 403);
      }

      logger.debug('Authorization successful', {
        userId: req.user.userId,
        userRole,
        path: req.path,
      });

      // User has required role, proceed
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authenticateUser;
