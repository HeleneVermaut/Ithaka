/**
 * User Controller
 *
 * This controller handles all HTTP requests related to user profile management:
 * - Get user profile
 * - Update user profile (name, pseudo, bio, avatar)
 * - Change password
 *
 * All endpoints in this controller require authentication (JWT middleware).
 * Users can only access and modify their own profile data.
 *
 * @module controllers/userController
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { updateUserProfile, changePassword } from '../services/authService';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Get current user's profile
 *
 * GET /api/users/profile
 * Requires: JWT authentication
 *
 * Returns complete user profile data including avatar
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "pseudo": "johndoe",
 *     "bio": "Travel enthusiast",
 *     "avatarBase64": "data:image/jpeg;base64,...",
 *     "lastLoginAt": "2024-01-27T10:30:00Z",
 *     "createdAt": "2024-01-20T08:00:00Z",
 *     "updatedAt": "2024-01-27T10:30:00Z"
 *   }
 * }
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Fetch user from database
    const user = await User.findByPk(userId.toString());

    if (!user) {
      throw new AppError('User not found', 404);
    }

    logger.info('User profile retrieved', { userId });

    res.status(200).json({
      success: true,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 *
 * PUT /api/users/profile
 * Requires: JWT authentication
 * Body: { firstName?, lastName?, pseudo?, bio?, avatarBase64? }
 *
 * Updates user profile information. All fields are optional.
 * Validates pseudo uniqueness if changed.
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Request body
 * {
 *   "firstName": "Jane",
 *   "lastName": "Smith",
 *   "pseudo": "janesmith",
 *   "bio": "Designer and traveler",
 *   "avatarBase64": "data:image/jpeg;base64,..."
 * }
 *
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "message": "Profile updated successfully",
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "firstName": "Jane",
 *     "lastName": "Smith",
 *     "pseudo": "janesmith",
 *     "bio": "Designer and traveler",
 *     "avatarBase64": "data:image/jpeg;base64,...",
 *     "updatedAt": "2024-01-27T11:00:00Z"
 *   }
 * }
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { firstName, lastName, pseudo, bio, avatarBase64 } = req.body;

    // Build update object with only provided fields
    const updates: any = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (pseudo !== undefined) updates.pseudo = pseudo;
    if (bio !== undefined) updates.bio = bio;
    if (avatarBase64 !== undefined) updates.avatarBase64 = avatarBase64;

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    // Update profile via service
    const updatedUser = await updateUserProfile(userId.toString(), updates);

    logger.info('User profile updated', {
      userId,
      updatedFields: Object.keys(updates),
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 *
 * PUT /api/users/password
 * Requires: JWT authentication
 * Body: { oldPassword, newPassword, confirmPassword }
 *
 * Changes the user's password after verifying the old password.
 * Invalidates all other sessions (user must login again on other devices).
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Request body
 * {
 *   "oldPassword": "CurrentPass123",
 *   "newPassword": "NewSecurePass456",
 *   "confirmPassword": "NewSecurePass456"
 * }
 *
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "message": "Password changed successfully. You have been logged out from other sessions."
 * }
 */
export const updatePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!oldPassword || !newPassword || !confirmPassword) {
      throw new AppError('All password fields are required', 400);
    }

    // Verify new password and confirmation match
    if (newPassword !== confirmPassword) {
      throw new AppError('New password and confirmation do not match', 400);
    }

    // Change password via service
    await changePassword(userId.toString(), oldPassword, newPassword);

    logger.info('User password changed', { userId });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. You have been logged out from other sessions.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account (soft delete)
 *
 * DELETE /api/users/profile
 * Requires: JWT authentication
 * Body: { password } - Confirm password before deletion
 *
 * Soft deletes the user account (sets deletedAt timestamp).
 * User data is retained for recovery but account is inaccessible.
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * // Request body
 * {
 *   "password": "CurrentPass123"
 * }
 *
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "message": "Account deleted successfully"
 * }
 */
export const deleteAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { password } = req.body;

    if (!password) {
      throw new AppError('Password is required to delete account', 400);
    }

    // Fetch user
    const user = await User.findByPk(userId.toString());

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Incorrect password', 401);
    }

    // Soft delete user (sets deletedAt)
    await user.destroy();

    logger.info('User account deleted (soft delete)', {
      userId,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getProfile,
  updateProfile,
  updatePassword,
  deleteAccount,
};
