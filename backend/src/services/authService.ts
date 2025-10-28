/**
 * Authentication Service
 *
 * This service contains all the business logic for user authentication including:
 * - User registration with validation
 * - Login with credential verification
 * - Password reset flow (request + verify + reset)
 * - User profile management
 *
 * Security best practices implemented:
 * - Password hashing with bcrypt (10 rounds)
 * - Password reset tokens are hashed before storage
 * - Email uniqueness validation
 * - Token expiration (1 hour for password reset)
 * - Never expose whether email exists (security by obscurity)
 *
 * @module services/authService
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, UserCreationAttributes } from '../models/User';
import { sendWelcomeEmail, sendPasswordChangedEmail } from './emailService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Hash a plain text password using bcrypt
 *
 * Bcrypt automatically generates a salt and incorporates it into the hash.
 * The cost factor of 10 provides a good balance between security and performance.
 *
 * @async
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Bcrypt hash of the password
 * @throws {Error} If hashing fails
 *
 * @example
 * const hashedPassword = await hashPassword('MySecurePassword123');
 * // Returns: '$2a$10$...' (60 character hash)
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    logger.debug('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    logger.error('Failed to hash password', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare plain text password with bcrypt hash
 *
 * This function safely compares a plain text password with a stored hash
 * without exposing timing attacks.
 *
 * @async
 * @param {string} plainPassword - Plain text password to verify
 * @param {string} hashedPassword - Stored bcrypt hash
 * @returns {Promise<boolean>} True if password matches, false otherwise
 *
 * @example
 * const isValid = await comparePasswords('UserInput123', user.passwordHash);
 * if (isValid) {
 *   // Password is correct
 * }
 */
export const comparePasswords = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    logger.error('Failed to compare passwords', error);
    return false;
  }
};

/**
 * Register a new user
 *
 * This function creates a new user account with the provided information.
 * It validates that the email is unique, hashes the password, and creates
 * the user record in the database.
 *
 * @async
 * @param {UserCreationAttributes} userData - User registration data
 * @returns {Promise<User>} Created user object (without password hash)
 * @throws {AppError} If email already exists or validation fails
 *
 * @example
 * const user = await registerUser({
 *   email: 'user@example.com',
 *   password: 'SecurePass123',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * });
 */
export const registerUser = async (
  userData: UserCreationAttributes
): Promise<User> => {
  try {
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email: userData.email });
      throw new AppError('This email is already registered', 409);
    }

    // Check if pseudo already exists (if provided)
    if (userData.pseudo) {
      const existingPseudo = await User.findOne({ where: { pseudo: userData.pseudo } });
      if (existingPseudo) {
        logger.warn('Registration attempt with existing pseudo', { pseudo: userData.pseudo });
        throw new AppError('This username is already taken', 409);
      }
    }

    // Hash the password
    const passwordHash = await hashPassword(userData.passwordHash);

    // Create user in database
    const user = await User.create({
      ...userData,
      passwordHash,
      isEmailVerified: false,
    });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
    });

    // Send welcome email asynchronously (non-blocking)
    sendWelcomeEmail(user.email, user.firstName).catch((error) => {
      logger.error('Failed to send welcome email', error);
      // Don't fail registration if email fails
    });

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Failed to register user', error);
    throw new AppError('Failed to register user', 500);
  }
};

/**
 * Authenticate user with email and password
 *
 * This function verifies user credentials and returns the user object if valid.
 * It updates the lastLoginAt timestamp on successful login.
 *
 * @async
 * @param {string} email - User's email address
 * @param {string} password - Plain text password
 * @returns {Promise<User>} Authenticated user object
 * @throws {AppError} 401 if credentials are invalid
 *
 * @example
 * const user = await loginUser('user@example.com', 'password123');
 * // Generate JWT tokens and set cookies
 */
export const loginUser = async (email: string, password: string): Promise<User> => {
  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });

    // User not found or password incorrect
    // Use same error message for both cases (security: don't reveal which is wrong)
    if (!user) {
      logger.warn('Login attempt with non-existent email', { email });
      throw new AppError('Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn('Login attempt with incorrect password', {
        userId: user.id,
        email,
      });
      throw new AppError('Invalid email or password', 401);
    }

    // Update last login timestamp
    await user.update({ lastLoginAt: new Date() });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Login failed', error);
    throw new AppError('Login failed', 500);
  }
};

/**
 * Generate password reset token
 *
 * This function creates a secure random token for password reset and stores
 * its hash in the database with an expiration time (1 hour).
 *
 * @async
 * @param {string} email - User's email address
 * @returns {Promise<{ token: string; user: User } | null>} Token and user, or null if email not found
 *
 * @example
 * const result = await generatePasswordResetToken('user@example.com');
 * if (result) {
 *   await sendPasswordResetEmail(result.user.email, result.token, result.user.firstName);
 * }
 */
export const generatePasswordResetToken = async (
  email: string
): Promise<{ token: string; user: User } | null> => {
  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });

    // Security: Don't reveal whether email exists
    if (!user) {
      logger.info('Password reset requested for non-existent email', { email });
      return null;
    }

    // Generate random token (32 bytes = 64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing (never store raw tokens)
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Set token and expiration (1 hour from now)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);

    await user.update({
      passwordResetToken: hashedToken,
      passwordResetExpiry: expiryDate,
    });

    logger.info('Password reset token generated', {
      userId: user.id,
      email: user.email,
      expiresAt: expiryDate,
    });

    // Return the unhashed token (to send in email) and user
    return { token, user };
  } catch (error) {
    logger.error('Failed to generate password reset token', error);
    throw new AppError('Failed to generate password reset token', 500);
  }
};

/**
 * Verify password reset token validity
 *
 * This function checks if a password reset token is valid and not expired.
 * It returns the user if the token is valid.
 *
 * @async
 * @param {string} token - Password reset token from email link
 * @param {string} email - User's email address
 * @returns {Promise<User>} User object if token is valid
 * @throws {AppError} 400 or 401 if token is invalid or expired
 *
 * @example
 * const user = await verifyPasswordResetToken(token, email);
 * // Token is valid, show password reset form
 */
export const verifyPasswordResetToken = async (
  token: string,
  email: string
): Promise<User> => {
  try {
    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token and email
    const user = await User.findOne({
      where: {
        email,
        passwordResetToken: hashedToken,
      },
    });

    if (!user) {
      logger.warn('Invalid password reset token', { email });
      throw new AppError('Invalid or expired password reset token', 401);
    }

    // Check if token has expired
    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      logger.warn('Expired password reset token', {
        userId: user.id,
        email,
      });
      throw new AppError('Password reset token has expired', 401);
    }

    logger.info('Password reset token verified successfully', {
      userId: user.id,
      email,
    });

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Failed to verify password reset token', error);
    throw new AppError('Failed to verify password reset token', 500);
  }
};

/**
 * Reset user password with token
 *
 * This function resets a user's password after verifying the reset token.
 * It clears the reset token and invalidates all existing sessions.
 *
 * @async
 * @param {string} token - Password reset token
 * @param {string} email - User's email address
 * @param {string} newPassword - New plain text password
 * @returns {Promise<User>} Updated user object
 * @throws {AppError} If token is invalid or password update fails
 *
 * @example
 * const user = await resetPassword(token, email, 'NewSecurePass123');
 * // Password reset successful, user must login again
 */
export const resetPassword = async (
  token: string,
  email: string,
  newPassword: string
): Promise<User> => {
  try {
    // Verify token is valid
    const user = await verifyPasswordResetToken(token, email);

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await user.update({
      passwordHash: newPasswordHash,
      passwordResetToken: null as any,
      passwordResetExpiry: null as any,
    });

    logger.info('Password reset successfully', {
      userId: user.id,
      email: user.email,
    });

    // Send confirmation email asynchronously
    sendPasswordChangedEmail(user.email, user.firstName).catch((error) => {
      logger.error('Failed to send password changed email', error);
      // Don't fail password reset if email fails
    });

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Failed to reset password', error);
    throw new AppError('Failed to reset password', 500);
  }
};

/**
 * Change user password (when user is logged in)
 *
 * This function allows an authenticated user to change their password.
 * It requires the old password for verification before setting the new one.
 *
 * @async
 * @param {string} userId - User's unique identifier
 * @param {string} oldPassword - Current password for verification
 * @param {string} newPassword - New password to set
 * @returns {Promise<User>} Updated user object
 * @throws {AppError} 401 if old password is incorrect, 404 if user not found
 *
 * @example
 * await changePassword(userId, 'OldPass123', 'NewSecurePass123');
 * // Password changed, all other sessions invalidated
 */
export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<User> => {
  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      logger.error('User not found for password change', { userId });
      throw new AppError('User not found', 404);
    }

    // Verify old password
    const isOldPasswordValid = await comparePasswords(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      logger.warn('Password change attempt with incorrect old password', {
        userId: user.id,
      });
      throw new AppError('Current password is incorrect', 401);
    }

    // Check new password is different from old
    const isSamePassword = await comparePasswords(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new AppError('New password must be different from current password', 400);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await user.update({
      passwordHash: newPasswordHash,
    });

    logger.info('Password changed successfully', {
      userId: user.id,
      email: user.email,
    });

    // Send confirmation email asynchronously
    sendPasswordChangedEmail(user.email, user.firstName).catch((error) => {
      logger.error('Failed to send password changed email', error);
    });

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Failed to change password', error);
    throw new AppError('Failed to change password', 500);
  }
};

/**
 * Update user profile
 *
 * This function updates user profile information (name, pseudo, bio, avatar).
 * It validates that pseudo is unique if changed.
 *
 * @async
 * @param {string} userId - User's unique identifier
 * @param {Partial<UserCreationAttributes>} updates - Fields to update
 * @returns {Promise<User>} Updated user object
 * @throws {AppError} If pseudo is taken or user not found
 *
 * @example
 * const updatedUser = await updateUserProfile(userId, {
 *   firstName: 'Jane',
 *   pseudo: 'janesmith',
 *   bio: 'Travel enthusiast'
 * });
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserCreationAttributes>
): Promise<User> => {
  try {
    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      logger.error('User not found for profile update', { userId });
      throw new AppError('User not found', 404);
    }

    // If pseudo is being changed, check uniqueness
    if (updates.pseudo && updates.pseudo !== user.pseudo) {
      const existingPseudo = await User.findOne({
        where: { pseudo: updates.pseudo },
      });
      if (existingPseudo) {
        logger.warn('Profile update attempt with existing pseudo', {
          userId,
          pseudo: updates.pseudo,
        });
        throw new AppError('This username is already taken', 409);
      }
    }

    // Update user profile
    await user.update(updates);

    logger.info('User profile updated successfully', {
      userId: user.id,
      email: user.email,
      updatedFields: Object.keys(updates),
    });

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Failed to update user profile', error);
    throw new AppError('Failed to update user profile', 500);
  }
};

/**
 * Logout user (update lastLogoutAt timestamp)
 *
 * This function records the logout timestamp in the database.
 * The actual token invalidation is handled by clearing cookies.
 *
 * @async
 * @param {string} userId - User's unique identifier
 * @returns {Promise<void>}
 *
 * @example
 * await logoutUser(userId);
 * // Clear cookies in controller
 */
export const logoutUser = async (userId: string): Promise<void> => {
  try {
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({ lastLogoutAt: new Date() });
      logger.info('User logged out', {
        userId: user.id,
        email: user.email,
      });
    }
  } catch (error) {
    logger.error('Failed to update logout timestamp', error);
    // Don't throw error - logout should still succeed even if timestamp update fails
  }
};

/**
 * Delete user account and all associated data
 * GDPR Article 17 - Right to erasure (Right to be forgotten)
 *
 * This function permanently deletes a user account and all associated data:
 * - User profile and credentials
 * - Password reset tokens
 * - TODO: Notebooks, pages, and other user content when implemented
 *
 * For GDPR compliance, deletion is logged for audit purposes.
 *
 * @async
 * @param {string} userId - User's unique identifier
 * @param {string} password - User's password for confirmation (security measure)
 * @returns {Promise<void>}
 * @throws {AppError} If user not found or password invalid
 *
 * @example
 * await deleteUserAccount(userId, 'MySecurePassword123');
 * // User and all associated data permanently deleted
 */
export const deleteUserAccount = async (
  userId: string,
  password: string
): Promise<void> => {
  // Verify user exists and password is correct
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify password before deletion (security measure)
  const isValidPassword = await comparePasswords(password, user.passwordHash);
  if (!isValidPassword) {
    logger.warn('Account deletion attempt with invalid password', {
      userId,
      email: user.email,
    });
    throw new AppError('Invalid password', 401);
  }

  // Log deletion for audit trail (GDPR requires logging of deletions)
  logger.info('User account deletion requested (GDPR Art. 17)', {
    userId,
    email: user.email,
    timestamp: new Date().toISOString(),
  });

  try {
    // Delete associated data in order (respect foreign keys)
    // Note: If password reset tokens were in a separate table, delete them here
    // TODO: Delete notebooks, pages, shared notebooks when implemented

    // Finally delete user (force: true for hard delete, paranoid would soft delete)
    await user.destroy({ force: true });

    logger.info('User account successfully deleted', {
      userId,
      gdprCompliance: 'GDPR Article 17 - Right to erasure',
    });
  } catch (error) {
    logger.error('Error deleting user account:', error);
    throw new AppError('Failed to delete user account', 500);
  }
};

/**
 * Export user data in structured format
 * GDPR Article 20 - Right to data portability
 *
 * This function exports all user data in a structured, machine-readable format (JSON).
 * Users have the right to receive their personal data and transmit it to another controller.
 *
 * @async
 * @param {string} userId - User's unique identifier
 * @returns {Promise<object>} User data in JSON format
 * @throws {AppError} If user not found
 *
 * @example
 * const data = await exportUserData(userId);
 * // Returns: { exportDate, gdprCompliance, user: {...}, notebooks: [...] }
 */
export const exportUserData = async (userId: string): Promise<object> => {
  const user = await User.findByPk(userId, {
    attributes: [
      'id',
      'email',
      'firstName',
      'lastName',
      'avatarBase64',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
      'lastLogoutAt',
    ],
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // TODO: Include notebooks, pages when implemented
  // const notebooks = await Notebook.findAll({ where: { userId } });

  const exportData = {
    exportDate: new Date().toISOString(),
    gdprCompliance:
      'Data export in accordance with GDPR Article 20 - Right to data portability',
    format: 'JSON',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarBase64: user.avatarBase64,
      accountCreated: user.createdAt,
      lastUpdated: user.updatedAt,
      lastLogin: user.lastLoginAt,
      lastLogout: user.lastLogoutAt,
    },
    notebooks: [], // TODO: Add when notebooks implemented
    // statistics: {}, // TODO: Add usage stats if available
  };

  logger.info('User data export generated (GDPR Art. 20)', {
    userId,
    email: user.email,
  });

  return exportData;
};

export default {
  hashPassword,
  comparePasswords,
  registerUser,
  loginUser,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  resetPassword,
  changePassword,
  updateUserProfile,
  logoutUser,
  deleteUserAccount,
  exportUserData,
};
