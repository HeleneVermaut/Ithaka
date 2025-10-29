/**
 * Token Blacklist Model
 *
 * This model stores revoked JWT tokens to implement a token revocation system.
 * When a user changes their password, deletes their account, or logs out,
 * their tokens are added to this blacklist. Before validating tokens,
 * the system checks if they've been revoked.
 *
 * Security considerations:
 * - Tokens are hashed using SHA-256 before storage to prevent exposure if DB is compromised
 * - Hashing is transparent: callers provide plaintext tokens, model handles hashing internally
 * - Each token includes the user ID for efficient filtering and auditing
 * - Expired entries are periodically cleaned up to prevent table bloat
 * - This prevents compromised tokens from being used after password changes
 * - Database indexes on token field ensure fast O(log n) lookups during authentication
 *
 * Breaking change notice:
 * - Tokens are now hashed before storage (implemented 2025-10-29)
 * - Any plaintext tokens stored before this change will no longer match
 * - Users may need to re-authenticate after this security upgrade
 *
 * @module models/TokenBlacklist
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/database';
import { hashToken } from '../utils/tokenHash';

/**
 * Interface defining all fields in the TokenBlacklist model
 *
 * Note: The 'token' field stores a SHA-256 hash, not the plaintext token.
 * This is transparent to callers - the model methods handle hashing automatically.
 *
 * @interface ITokenBlacklist
 */
export interface ITokenBlacklist {
  /** Unique identifier (UUID) */
  id: string;

  /** SHA-256 hash of the revoked JWT token (64 hex characters) */
  token: string;

  /** User ID that owns this token (for efficient filtering and auditing) */
  userId: string;

  /** Reason for revocation (e.g., 'password_change', 'account_deletion', 'logout') */
  revocationReason: string;

  /** Timestamp when the token was added to the blacklist */
  revokedAt: Date;

  /** Timestamp when the token will expire (matches JWT exp claim) */
  expiresAt: Date;

  /** Timestamp when record was created */
  createdAt: Date;

  /** Timestamp when record was last updated */
  updatedAt: Date;
}

/**
 * Attributes required when creating a new blacklist entry
 * Makes some fields optional that are auto-generated
 */
export interface TokenBlacklistCreationAttributes
  extends Optional<
    ITokenBlacklist,
    'id' | 'createdAt' | 'updatedAt'
  > {}

/**
 * TokenBlacklist Model
 *
 * Represents a revoked token entry in the database
 */
export class TokenBlacklist
  extends Model<ITokenBlacklist, TokenBlacklistCreationAttributes>
  implements ITokenBlacklist
{
  declare id: string;
  declare token: string;
  declare userId: string;
  declare revocationReason: string;
  declare revokedAt: Date;
  declare expiresAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /**
   * Check if a token is blacklisted
   *
   * This method hashes the provided token before querying the database.
   * Only checks for non-expired blacklist entries to avoid false positives
   * from tokens that expired naturally.
   *
   * Performance: Uses indexed lookup on token hash for O(log n) query time
   *
   * @async
   * @param {string} token - The plaintext JWT token to check (will be hashed internally)
   * @returns {Promise<boolean>} True if token is blacklisted and not expired, false otherwise
   *
   * @example
   * const isRevoked = await TokenBlacklist.isTokenBlacklisted(refreshToken);
   * if (isRevoked) {
   *   throw new Error('Token has been revoked');
   * }
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = hashToken(token);
    const entry = await this.findOne({
      where: {
        token: tokenHash,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });
    return !!entry;
  }

  /**
   * Revoke a specific token
   *
   * This method hashes the token before storing it in the database.
   * The original token is never persisted to prevent exposure if DB is compromised.
   *
   * Security: Token is hashed with SHA-256 and stored as a 64-character hex string
   *
   * @async
   * @param {string} token - The plaintext JWT token to revoke (will be hashed internally)
   * @param {string} userId - The user ID that owns the token
   * @param {string} revocationReason - Reason for revocation (password_change, logout, etc.)
   * @param {Date} expiresAt - When the token naturally expires (should match JWT exp claim)
   * @returns {Promise<TokenBlacklist>} Created blacklist entry with hashed token
   *
   * @example
   * // Revoke a refresh token when user changes password
   * await TokenBlacklist.revokeToken(
   *   refreshToken,
   *   user.id,
   *   'password_change',
   *   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
   * );
   */
  static async revokeToken(
    token: string,
    userId: string,
    revocationReason: string = 'manual_revocation',
    expiresAt: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ): Promise<TokenBlacklist> {
    const tokenHash = hashToken(token);
    return this.create({
      token: tokenHash,
      userId,
      revocationReason,
      revokedAt: new Date(),
      expiresAt,
    });
  }

  /**
   * Clean up expired tokens from the blacklist
   * Should be called periodically (e.g., via a cron job)
   *
   * This removes blacklist entries where the token has naturally expired.
   * Expired tokens cannot be used anyway, so keeping them wastes storage space.
   *
   * Performance: Uses indexed query on expiresAt field for efficient cleanup
   * Recommended frequency: Run daily during low-traffic hours
   *
   * @async
   * @returns {Promise<number>} Number of expired entries deleted
   *
   * @example
   * // Run as a scheduled cron job
   * const deletedCount = await TokenBlacklist.cleanupExpiredTokens();
   * logger.info(`Cleaned up ${deletedCount} expired tokens from blacklist`);
   */
  static async cleanupExpiredTokens(): Promise<number> {
    return this.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  }
}

/**
 * Initialize TokenBlacklist model with schema definition
 *
 * This configures the table structure, data types, validations, and indexes.
 */
TokenBlacklist.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique identifier for the blacklist entry',
    },
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'SHA-256 hash of the revoked JWT token (64 hex characters)',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'User ID that owns this token (for efficient filtering)',
    },
    revocationReason: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'manual_revocation',
      comment: 'Reason for revocation (password_change, account_deletion, logout, etc.)',
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when the token was added to the blacklist',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When the token naturally expires (matches JWT exp claim)',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when blacklist entry was created',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when blacklist entry was last updated',
    },
  },
  {
    sequelize,
    modelName: 'TokenBlacklist',
    tableName: 'token_blacklists',
    timestamps: true,
    underscored: false,
    paranoid: false, // Don't use soft delete for blacklist
    indexes: [
      {
        // Index for fast token lookup during authentication (O(log n) instead of O(n))
        // This is the most critical index - used on every authentication request
        name: 'token_blacklists_token_idx',
        fields: ['token'],
        unique: false,
      },
      {
        // Composite index for querying user revocation history and audit trails
        // Used for administrative operations and security audits
        name: 'token_blacklists_user_revoked_idx',
        fields: ['userId', 'revokedAt'],
        unique: false,
      },
      {
        // Index for cleanup queries to efficiently remove expired tokens
        // Used by scheduled cleanup jobs to maintain database health
        name: 'token_blacklists_expires_idx',
        fields: ['expiresAt'],
        unique: false,
      },
    ],
  }
);
