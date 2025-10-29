/**
 * Rate Limiting Middleware
 *
 * This middleware protects the API from abuse by limiting the number of requests
 * a client can make within a specific time window. It helps prevent:
 * - Brute force attacks on login endpoints
 * - Spam account creation
 * - API abuse and DDoS attacks
 *
 * Rate limits are applied per IP address by default.
 * Different endpoints have different limits based on their sensitivity.
 *
 * @module middleware/rateLimiter
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom handler for when rate limit is exceeded
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const rateLimitExceededHandler = (req: Request, res: Response): void => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
  });

  res.status(429).json({
    status: 'fail',
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * General API rate limiter
 *
 * Applies to all API endpoints as a baseline protection.
 * Allows 100 requests per 15 minutes per IP address.
 *
 * Use this as the default rate limiter for most endpoints.
 *
 * @example
 * // In routes
 * router.use(generalLimiter);
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: rateLimitExceededHandler,
  skip: (req) => {
    // Skip rate limiting in development for localhost (both IPv4 and IPv6)
    if (process.env['NODE_ENV'] === 'development' && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  },
});

/**
 * Strict rate limiter for authentication endpoints
 *
 * Protects login endpoint from brute force attacks.
 * Allows 5 login attempts per 15 minutes per IP address.
 *
 * This is critical for preventing credential stuffing and brute force attacks.
 *
 * @example
 * // In auth routes
 * router.post('/login', loginLimiter, authController.login);
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts per window per IP
  message: 'Too many login attempts. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: rateLimitExceededHandler,
  skip: (req) => {
    if (process.env['NODE_ENV'] === 'development' && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  },
});

/**
 * Rate limiter for user registration
 *
 * Prevents spam account creation.
 * Allows 3 registrations per hour per IP address.
 *
 * This helps prevent automated account creation and spam.
 *
 * @example
 * // In auth routes
 * router.post('/register', registerLimiter, authController.register);
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 registrations per hour per IP
  message: 'Too many accounts created from this IP. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitExceededHandler,
  skip: (req) => {
    if (process.env['NODE_ENV'] === 'development' && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  },
});

/**
 * Rate limiter for password reset requests
 *
 * Prevents abuse of password reset functionality.
 * Allows 3 password reset requests per hour per IP address.
 *
 * This prevents attackers from flooding users with password reset emails.
 *
 * @example
 * // In auth routes
 * router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 password reset requests per hour per IP
  message: 'Too many password reset attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitExceededHandler,
  skip: (req) => {
    if (process.env['NODE_ENV'] === 'development' && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  },
});

/**
 * Rate limiter for token refresh endpoint
 *
 * Prevents abuse of token refresh functionality.
 * Allows 20 refresh requests per 15 minutes per IP address.
 *
 * This is more lenient than login since refresh is a normal operation,
 * but still prevents abuse.
 *
 * @example
 * // In auth routes
 * router.post('/refresh', refreshLimiter, authController.refresh);
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 refresh requests per window per IP
  message: 'Too many token refresh attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitExceededHandler,
  skip: (req) => {
    if (process.env['NODE_ENV'] === 'development' && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  },
});

/**
 * Strict rate limiter for profile updates
 *
 * Prevents rapid profile changes that could indicate automated abuse.
 * Allows 10 profile updates per hour per IP address.
 *
 * @example
 * // In user routes
 * router.put('/profile', profileUpdateLimiter, userController.updateProfile);
 */
export const profileUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 profile updates per hour per IP
  message: 'Too many profile updates. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitExceededHandler,
  skip: (req) => {
    if (process.env['NODE_ENV'] === 'development' && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  },
});

/**
 * Rate limiter for password change
 *
 * Allows 5 password changes per day per IP address.
 * Frequent password changes could indicate account compromise.
 *
 * @example
 * // In user routes
 * router.put('/password', passwordChangeLimiter, userController.updatePassword);
 */
export const passwordChangeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // Max 5 password changes per day per IP
  message: 'Too many password changes. Please contact support if you need assistance.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitExceededHandler,
  skip: (req) => {
    if (process.env['NODE_ENV'] === 'development' && (req.ip === '127.0.0.1' || req.ip === '::1')) {
      return true;
    }
    return false;
  },
});

/**
 * Create custom rate limiter with specific configuration
 *
 * Factory function to create rate limiters with custom settings.
 *
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum number of requests in window
 * @param {string} message - Error message when limit exceeded
 * @returns {Function} Rate limiter middleware
 *
 * @example
 * const customLimiter = createRateLimiter(5 * 60 * 1000, 10, 'Custom rate limit message');
 * router.use('/custom-endpoint', customLimiter);
 */
export const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string
) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitExceededHandler,
    skip: (req) => {
      if (process.env['NODE_ENV'] === 'development' && req.ip === '127.0.0.1') {
        return true;
      }
      return false;
    },
  });
};

export default {
  generalLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshLimiter,
  profileUpdateLimiter,
  passwordChangeLimiter,
  createRateLimiter,
};
