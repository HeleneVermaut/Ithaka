/**
 * Authentication Controller
 *
 * This controller handles all HTTP requests related to authentication including:
 * - User registration
 * - User login
 * - User logout
 * - Token refresh
 * - Password reset flow (request, verify, reset)
 *
 * Controllers are responsible for:
 * - Extracting data from requests
 * - Calling appropriate service methods
 * - Formatting responses
 * - Setting HTTP status codes
 * - Managing cookies
 *
 * @module controllers/authController
 */

import { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  resetPassword,
} from '../services/authService';
import { setAuthTokens, clearAuthTokens, refreshAccessToken } from '../services/tokenService';
import { sendPasswordResetEmail } from '../services/emailService';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Register a new user
 *
 * POST /api/auth/register
 * Body: { email, password, firstName, lastName, pseudo?, bio?, avatarBase64? }
 *
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for error handling
 *
 * @example
 * // Request body
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123",
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "pseudo": "johndoe",
 *   "bio": "Travel enthusiast"
 * }
 *
 * // Success response (201 Created)
 * {
 *   "success": true,
 *   "message": "User registered successfully",
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "pseudo": "johndoe",
 *     "bio": "Travel enthusiast",
 *     "createdAt": "2024-01-27T10:30:00Z"
 *   }
 * }
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, firstName, lastName, pseudo, bio, avatarBase64 } = req.body;

    // Create user via service
    const user = await registerUser({
      email,
      passwordHash: password, // Service will hash this
      firstName,
      lastName,
      pseudo,
      bio,
      avatarBase64,
    });

    // Generate and set JWT tokens in cookies
    await setAuthTokens(res, {
      userId: user.id,
      role: 'user',
    });

    logger.info('User registration successful', { userId: user.id });

    // Return user data (without password)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user with email and password
 *
 * POST /api/auth/login
 * Body: { email, password }
 *
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Request body
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123"
 * }
 *
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "message": "Logged in successfully",
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "pseudo": "johndoe",
 *     "lastLoginAt": "2024-01-27T10:30:00Z"
 *   }
 * }
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Authenticate user via service (pass request for audit logging)
    const user = await loginUser(email, password, req);

    // Generate and set JWT tokens in cookies
    await setAuthTokens(res, {
      userId: user.id,
      role: 'user',
    });

    logger.info('User login successful', { userId: user.id });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: user.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 *
 * POST /api/auth/logout
 * Requires: JWT authentication
 *
 * Clears authentication cookies and updates lastLogoutAt timestamp
 *
 * @async
 * @param {AuthRequest} req - Express request with user data
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 */
export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (userId) {
      // Update lastLogoutAt timestamp
      await logoutUser(userId.toString());
    }

    // Clear authentication cookies
    clearAuthTokens(res);

    logger.info('User logout successful', { userId });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    // Even if logout fails, clear cookies
    clearAuthTokens(res);
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 *
 * POST /api/auth/refresh
 * Cookies: refreshToken
 *
 * Generates a new access token if refresh token is valid
 *
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "message": "Access token refreshed successfully"
 * }
 */
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new AppError('Refresh token not found. Please login again.', 401);
    }

    // Generate new access token (pass request for audit logging)
    await refreshAccessToken(res, refreshToken, req);

    logger.info('Access token refreshed successfully');

    res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 *
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Generates reset token and sends email with reset link.
 * Always returns success (security: don't reveal if email exists)
 *
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Request body
 * {
 *   "email": "user@example.com"
 * }
 *
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "message": "If your email is registered, you will receive a password reset link"
 * }
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    // Generate reset token
    const result = await generatePasswordResetToken(email);

    // If user exists, send email
    if (result) {
      await sendPasswordResetEmail(result.user.email, result.token, result.user.firstName);
    }

    // Always return success (security: don't reveal if email exists)
    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify password reset token
 *
 * GET /api/auth/verify-reset-token?token=XXX&email=user@example.com
 *
 * Verifies that reset token is valid and not expired
 *
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "message": "Token is valid",
 *   "canResetPassword": true
 * }
 *
 * // Error response (401 Unauthorized)
 * {
 *   "status": "fail",
 *   "statusCode": 401,
 *   "message": "Invalid or expired password reset token"
 * }
 */
export const verifyResetToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      throw new AppError('Token and email are required', 400);
    }

    // Verify token validity
    await verifyPasswordResetToken(token as string, email as string);

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      canResetPassword: true,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 *
 * POST /api/auth/reset-password
 * Body: { token, email, newPassword, confirmPassword }
 *
 * Resets user password after verifying token validity
 *
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Request body
 * {
 *   "token": "abc123def456",
 *   "email": "user@example.com",
 *   "newPassword": "NewSecurePass123",
 *   "confirmPassword": "NewSecurePass123"
 * }
 *
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "message": "Password reset successfully. Please login with your new password."
 * }
 */
export const resetPasswordWithToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, email, newPassword, confirmPassword } = req.body;

    // Verify passwords match
    if (newPassword !== confirmPassword) {
      throw new AppError('Passwords do not match', 400);
    }

    // Reset password via service (pass request for audit logging)
    await resetPassword(token, email, newPassword, req);

    logger.info('Password reset successful', { email });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if email is unique (available)
 *
 * GET /api/auth/check-email?email=user@example.com
 *
 * Used by frontend for async validation during registration
 *
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "isUnique": true
 * }
 */
export const checkEmailUnique = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      throw new AppError('Email is required', 400);
    }

    // Import User model
    const { User } = await import('../models/User');

    // Check if email exists
    const existingUser = await User.findOne({ where: { email } });

    res.status(200).json({
      isUnique: !existingUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if pseudo is unique (available)
 *
 * GET /api/auth/check-pseudo?pseudo=johndoe
 *
 * Used by frontend for async validation during registration
 *
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "isUnique": true
 * }
 */
export const checkPseudoUnique = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pseudo } = req.query;

    if (!pseudo || typeof pseudo !== 'string') {
      throw new AppError('Pseudo is required', 400);
    }

    // Import User model
    const { User } = await import('../models/User');

    // Check if pseudo exists
    const existingUser = await User.findOne({ where: { pseudo } });

    res.status(200).json({
      isUnique: !existingUser,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  verifyResetToken,
  resetPasswordWithToken,
  checkEmailUnique,
  checkPseudoUnique,
};
