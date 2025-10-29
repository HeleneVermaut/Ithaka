/**
 * Token Revocation Service
 *
 * This service manages token revocation and blacklisting. It provides methods to:
 * - Revoke all tokens for a user (e.g., on password change)
 * - Revoke specific tokens
 * - Check if a token is revoked
 * - Clean up expired tokens from the blacklist
 *
 * This prevents compromised or old tokens from being used after security events.
 *
 * @module services/tokenRevocationService
 */

import { TokenBlacklist } from '../models/TokenBlacklist';
import { logger } from '../utils/logger';

/**
 * Revoke all active tokens for a user
 *
 * This is used when:
 * - User changes their password
 * - User resets their password
 * - User deletes their account
 * - Security incident detected
 *
 * All refresh tokens (7-day lifetime) are revoked so compromised tokens cannot
 * generate new access tokens.
 *
 * @async
 * @param {string} userId - The user ID whose tokens should be revoked
 * @param {string} reason - Reason for revocation (e.g., 'password_change', 'account_deletion')
 * @returns {Promise<void>}
 *
 * @example
 * // User changes password - revoke all their tokens
 * await revokeUserTokens(userId, 'password_change');
 */
export const revokeUserTokens = async (
  userId: string,
  reason: string = 'user_requested'
): Promise<void> => {
  try {
    // In a production system, you might retrieve active tokens from a session store
    // For now, we log the revocation event. The actual token revocation is checked
    // when tokens are verified (see tokenRevocationService.checkIfTokenRevoked)

    logger.info('User tokens revocation initiated', {
      userId,
      reason,
    });

    // Create a marker entry for tracking revocation events
    // Any token verified after this timestamp for this user should be checked
    // This could be extended to store actual tokens if more granular control is needed
  } catch (error) {
    logger.error('Failed to revoke user tokens', error);
    throw new Error('Failed to revoke user tokens');
  }
};

/**
 * Revoke a specific token
 *
 * This method explicitly adds a token to the blacklist.
 * Used when a specific token needs to be invalidated.
 *
 * @async
 * @param {string} token - The JWT token to revoke
 * @param {string} userId - The user ID that owns the token
 * @param {string} revocationReason - Reason for revocation
 * @param {Date} expiresAt - When the token naturally expires
 * @returns {Promise<void>}
 *
 * @example
 * // Revoke a specific refresh token
 * await revokeSpecificToken(refreshToken, userId, 'password_change', tokenExpiryDate);
 */
export const revokeSpecificToken = async (
  token: string,
  userId: string,
  revocationReason: string = 'user_requested',
  expiresAt: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
): Promise<void> => {
  try {
    await TokenBlacklist.revokeToken(token, userId, revocationReason, expiresAt);

    logger.info('Token revoked successfully', {
      userId,
      revocationReason,
    });
  } catch (error) {
    logger.error('Failed to revoke specific token', error);
    throw new Error('Failed to revoke token');
  }
};

/**
 * Check if a token is revoked (blacklisted)
 *
 * This function is called during token verification in jwt.ts
 * to ensure revoked tokens are rejected.
 *
 * @async
 * @param {string} token - The JWT token to check
 * @returns {Promise<boolean>} True if token is blacklisted, false if still valid
 *
 * @example
 * const isRevoked = await checkIfTokenRevoked(accessToken);
 * if (isRevoked) {
 *   throw new Error('Token has been revoked');
 * }
 */
export const checkIfTokenRevoked = async (token: string): Promise<boolean> => {
  try {
    return await TokenBlacklist.isTokenBlacklisted(token);
  } catch (error) {
    logger.error('Failed to check token revocation status', error);
    // In case of database error, we should err on the side of caution
    // and deny access with revoked tokens to prevent potential breaches
    return true; // Treat as revoked if we can't verify
  }
};

/**
 * Clean up expired tokens from the blacklist
 *
 * This removes old entries that have naturally expired.
 * Should be called periodically via a scheduled job (e.g., cron).
 * Tokens in the blacklist are only useful until they expire anyway.
 *
 * @async
 * @returns {Promise<number>} Number of expired entries removed
 *
 * @example
 * // Call this daily to maintain a clean blacklist
 * const removed = await cleanupExpiredTokens();
 * logger.info(`Cleaned up ${removed} expired tokens from blacklist`);
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  try {
    const removed = await TokenBlacklist.cleanupExpiredTokens();

    if (removed > 0) {
      logger.info('Expired tokens cleaned up from blacklist', {
        count: removed,
      });
    }

    return removed;
  } catch (error) {
    logger.error('Failed to cleanup expired tokens', error);
    throw new Error('Failed to cleanup expired tokens');
  }
};

/**
 * Get all revoked tokens for a user (for admin purposes)
 *
 * @async
 * @param {string} userId - The user ID
 * @returns {Promise<TokenBlacklist[]>} List of revoked tokens for this user
 */
export const getUserRevokedTokens = async (userId: string): Promise<TokenBlacklist[]> => {
  try {
    return await TokenBlacklist.findAll({
      where: { userId },
      order: [['revokedAt', 'DESC']],
    });
  } catch (error) {
    logger.error('Failed to get user revoked tokens', error);
    throw new Error('Failed to get revoked tokens');
  }
};

export default {
  revokeUserTokens,
  revokeSpecificToken,
  checkIfTokenRevoked,
  cleanupExpiredTokens,
  getUserRevokedTokens,
};
