/**
 * Authentication Routes
 *
 * This module defines all routes related to user authentication:
 * - POST /api/auth/register - User registration
 * - POST /api/auth/login - User login
 * - POST /api/auth/logout - User logout (requires auth)
 * - POST /api/auth/refresh - Refresh access token
 * - POST /api/auth/forgot-password - Request password reset
 * - GET /api/auth/verify-reset-token - Verify password reset token
 * - POST /api/auth/reset-password - Reset password with token
 *
 * Security features:
 * - Rate limiting on sensitive endpoints
 * - Request validation with Joi schemas
 * - JWT authentication where required
 *
 * @module routes/authRoutes
 */

import { Router } from 'express';
import {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  verifyResetToken,
  resetPasswordWithToken,
  checkEmailUnique,
  checkPseudoUnique,
} from '../controllers/authController';
import { optionalAuth } from '../middleware/authMiddleware';
import {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../middleware/validation';
import {
  registerLimiter,
  loginLimiter,
  passwordResetLimiter,
  refreshLimiter,
} from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @rateLimit 3 requests per hour per IP
 *
 * Request body:
 * {
 *   email: string (required, valid email),
 *   password: string (required, 8+ chars, uppercase, number),
 *   firstName: string (required, 2-100 chars),
 *   lastName: string (required, 2-100 chars),
 *   pseudo?: string (optional, 3-50 chars, alphanumeric),
 *   bio?: string (optional, max 160 chars),
 *   avatarBase64?: string (optional, max 375KB)
 * }
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   message: "User registered successfully",
 *   user: { id, email, firstName, lastName, pseudo, bio, createdAt }
 * }
 * + Sets accessToken and refreshToken in httpOnly cookies
 */
router.post(
  '/register',
  registerLimiter,
  validate(registerSchema, 'body'),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email and password
 * @access  Public
 * @rateLimit 5 attempts per 15 minutes per IP
 *
 * Request body:
 * {
 *   email: string (required, valid email),
 *   password: string (required)
 * }
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: "Logged in successfully",
 *   user: { id, email, firstName, lastName, pseudo, lastLoginAt }
 * }
 * + Sets accessToken and refreshToken in httpOnly cookies
 */
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema, 'body'),
  login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (clear cookies and update lastLogoutAt)
 * @access  Public (clears cookies regardless of token validity)
 *
 * Note: Authentication is optional. If a valid token is provided,
 * the lastLogoutAt timestamp will be updated. If no token or an
 * expired token is provided, cookies will still be cleared.
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: "Logged out successfully"
 * }
 * + Clears accessToken and refreshToken cookies
 */
router.post(
  '/logout',
  optionalAuth,
  logout
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (requires valid refresh token in cookies)
 * @rateLimit 20 requests per 15 minutes per IP
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: "Access token refreshed successfully"
 * }
 * + Sets new accessToken in httpOnly cookie
 */
router.post(
  '/refresh',
  refreshLimiter,
  refresh
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (sends email with reset link)
 * @access  Public
 * @rateLimit 3 requests per hour per IP
 *
 * Request body:
 * {
 *   email: string (required, valid email)
 * }
 *
 * Response: 200 OK (always returns success for security)
 * {
 *   success: true,
 *   message: "If your email is registered, you will receive a password reset link"
 * }
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema, 'body'),
  forgotPassword
);

/**
 * @route   GET /api/auth/verify-reset-token
 * @desc    Verify password reset token validity
 * @access  Public
 *
 * Query parameters:
 * ?token=xxx&email=user@example.com
 *
 * Response: 200 OK (if token valid)
 * {
 *   success: true,
 *   message: "Token is valid",
 *   canResetPassword: true
 * }
 *
 * Response: 401 Unauthorized (if token invalid/expired)
 * {
 *   status: "fail",
 *   statusCode: 401,
 *   message: "Invalid or expired password reset token"
 * }
 */
router.get(
  '/verify-reset-token',
  verifyResetToken
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using valid reset token
 * @access  Public
 *
 * Request body:
 * {
 *   token: string (required),
 *   email: string (required, valid email),
 *   newPassword: string (required, 8+ chars, uppercase, number),
 *   confirmPassword: string (required, must match newPassword)
 * }
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: "Password reset successfully. Please login with your new password."
 * }
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema, 'body'),
  resetPasswordWithToken
);

/**
 * @route   GET /api/auth/check-email
 * @desc    Check if email is unique (available for registration)
 * @access  Public
 *
 * Query parameters:
 * ?email=user@example.com
 *
 * Response: 200 OK
 * {
 *   "isUnique": true
 * }
 *
 * Used by frontend for async validation (Vuelidate) during registration
 */
router.get('/check-email', checkEmailUnique);

/**
 * @route   GET /api/auth/check-pseudo
 * @desc    Check if pseudo is unique (available for registration)
 * @access  Public
 *
 * Query parameters:
 * ?pseudo=johndoe
 *
 * Response: 200 OK
 * {
 *   "isUnique": true
 * }
 *
 * Used by frontend for async validation (Vuelidate) during registration
 */
router.get('/check-pseudo', checkPseudoUnique);

export default router;
