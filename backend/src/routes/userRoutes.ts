/**
 * User Routes
 *
 * This module defines all routes related to user profile management:
 * - GET /api/users/profile - Get current user's profile
 * - PUT /api/users/profile - Update user profile
 * - PUT /api/users/password - Change password
 * - DELETE /api/users/profile - Delete user account (soft delete)
 *
 * All routes require JWT authentication.
 * Users can only access and modify their own profile data.
 *
 * @module routes/userRoutes
 */

import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updatePassword,
  deleteAccount,
  exportData,
} from '../controllers/userController';
import { authenticateUser } from '../middleware/authMiddleware';
import {
  validate,
  updateProfileSchema,
  changePasswordSchema,
} from '../middleware/validation';
import {
  profileUpdateLimiter,
  passwordChangeLimiter,
} from '../middleware/rateLimiter';

const router = Router();

/**
 * All user routes require authentication
 * Apply JWT authentication middleware to all routes in this router
 */
router.use(authenticateUser);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user's profile
 * @access  Private (requires JWT authentication)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   user: {
 *     id: string,
 *     email: string,
 *     firstName: string,
 *     lastName: string,
 *     pseudo?: string,
 *     bio?: string,
 *     avatarBase64?: string,
 *     isEmailVerified: boolean,
 *     lastLoginAt?: Date,
 *     createdAt: Date,
 *     updatedAt: Date
 *   }
 * }
 */
router.get('/profile', getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile information
 * @access  Private (requires JWT authentication)
 * @rateLimit 10 updates per hour per IP
 *
 * Request body (all fields optional, but at least one required):
 * {
 *   firstName?: string (2-100 chars),
 *   lastName?: string (2-100 chars),
 *   pseudo?: string (3-50 chars, alphanumeric, must be unique),
 *   bio?: string (max 160 chars),
 *   avatarBase64?: string (max 375KB)
 * }
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: "Profile updated successfully",
 *   user: { id, email, firstName, lastName, pseudo, bio, avatarBase64, updatedAt }
 * }
 */
router.put(
  '/profile',
  profileUpdateLimiter,
  validate(updateProfileSchema, 'body'),
  updateProfile
);

/**
 * @route   PUT /api/users/password
 * @desc    Change user password
 * @access  Private (requires JWT authentication)
 * @rateLimit 5 changes per day per IP
 *
 * Request body:
 * {
 *   oldPassword: string (required),
 *   newPassword: string (required, 8+ chars, uppercase, number),
 *   confirmPassword: string (required, must match newPassword)
 * }
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: "Password changed successfully. You have been logged out from other sessions."
 * }
 *
 * Note: All other sessions will be invalidated after password change
 */
router.put(
  '/password',
  passwordChangeLimiter,
  validate(changePasswordSchema, 'body'),
  updatePassword
);

/**
 * @route   DELETE /api/users/profile
 * @desc    Delete user account (GDPR Article 17 - Right to erasure)
 * @access  Private (requires JWT authentication)
 *
 * Request body:
 * {
 *   password: string (required for confirmation)
 * }
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   message: "Account successfully deleted",
 *   gdprCompliance: "Data deletion completed in accordance with GDPR Article 17"
 * }
 *
 * Note: This permanently deletes all user data for GDPR compliance
 */
router.delete('/profile', deleteAccount);

/**
 * @route   GET /api/users/export
 * @desc    Export user data in JSON format (GDPR Article 20 - Right to data portability)
 * @access  Private (requires JWT authentication)
 *
 * Response: 200 OK
 * Content-Type: application/json
 * Content-Disposition: attachment; filename="ithaka-export-{timestamp}.json"
 * {
 *   exportDate: string (ISO 8601),
 *   gdprCompliance: "Data export in accordance with GDPR Article 20",
 *   format: "JSON",
 *   user: { id, email, firstName, lastName, profilePicture, ... },
 *   notebooks: [ ... ]
 * }
 *
 * Note: Returns all user data in machine-readable format for portability
 */
router.get('/export', exportData);

export default router;
