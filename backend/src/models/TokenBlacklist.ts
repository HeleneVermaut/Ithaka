/**
 * Token Blacklist Model
 *
 * This model stores revoked JWT tokens to implement a token revocation system.
 * When a user changes their password, deletes their account, or logs out,
 * their tokens are added to this blacklist. Before validating tokens,
 * the system checks if they've been revoked.
 *
 * Security considerations:
 * - Tokens are stored in their full form (not hashed) for quick lookup
 * - Each token includes the user ID for efficient filtering
 * - Expired entries are periodically cleaned up to prevent table bloat
 * - This prevents compromised tokens from being used after password changes
 *
 * @module models/TokenBlacklist
 */

import { DataTypes, Model, Optional } from 'sequelize';

/**
 * Interface defining all fields in the TokenBlacklist model
 *
 * @interface ITokenBlacklist
 */
export interface ITokenBlacklist {
  /** Unique identifier (UUID) */
  id: string;

  /** The JWT token that has been revoked */
  token: string;

  /** User ID that owns this token (for efficient filtering) */
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
   * @async
   * @param {string} token - The JWT token to check
   * @returns {Promise<boolean>} True if token is blacklisted, false otherwise
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const entry = await this.findOne({ where: { token } });
    return !!entry;
  }

  /**
   * Revoke a specific token
   *
   * @async
   * @param {string} token - The JWT token to revoke
   * @param {string} userId - The user ID that owns the token
   * @param {string} revocationReason - Reason for revocation
   * @param {Date} expiresAt - When the token naturally expires
   * @returns {Promise<TokenBlacklist>} Created blacklist entry
   */
  static async revokeToken(
    token: string,
    userId: string,
    revocationReason: string = 'manual_revocation',
    expiresAt: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ): Promise<TokenBlacklist> {
    return this.create({
      token,
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
   * @async
   * @returns {Promise<number>} Number of entries deleted
   */
  static async cleanupExpiredTokens(): Promise<number> {
    // Import Op from sequelize for query operations
    const { Op } = require('sequelize');
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
 * Initialize TokenBlacklist model
 *
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {typeof TokenBlacklist} Model class
 */
export default (sequelize: any) => {
  TokenBlacklist.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for the blacklist entry',
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'The full JWT token that has been revoked',
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
    }
  );

  // Create indexes for performance
  TokenBlacklist.sync({ alter: false }).catch(() => {
    // Sync is handled by migrations
  });

  return TokenBlacklist;
};
