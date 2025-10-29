'use strict';

/**
 * Migration: Create token_blacklists table
 *
 * Creates the token_blacklists table to store revoked JWT tokens.
 * This table is used to implement a token revocation system that prevents
 * compromised or old tokens from being used after password changes or account deletion.
 *
 * @param {QueryInterface} queryInterface - Sequelize query interface
 * @param {Sequelize} Sequelize - Sequelize instance with DataTypes
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('token_blacklists', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for the blacklist entry',
      },
      token: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'The full JWT token that has been revoked',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'User ID that owns this token (for efficient filtering)',
      },
      revocationReason: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'manual_revocation',
        comment: 'Reason for revocation (password_change, account_deletion, logout, etc.)',
      },
      revokedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when the token was added to the blacklist',
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the token naturally expires (matches JWT exp claim)',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when blacklist entry was created',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when blacklist entry was last updated',
      },
    });

    // Create indexes for performance
    // Index on token for fast lookups
    await queryInterface.addIndex('token_blacklists', ['token'], {
      name: 'idx_token_blacklist_token',
      unique: false,
    });

    // Index on userId for filtering user tokens
    await queryInterface.addIndex('token_blacklists', ['userId'], {
      name: 'idx_token_blacklist_user_id',
    });

    // Index on expiresAt for cleanup queries
    await queryInterface.addIndex('token_blacklists', ['expiresAt'], {
      name: 'idx_token_blacklist_expires_at',
    });

    // Composite index for user token lookups
    await queryInterface.addIndex('token_blacklists', ['userId', 'revokedAt'], {
      name: 'idx_token_blacklist_user_revoked',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('token_blacklists', 'idx_token_blacklist_user_revoked');
    await queryInterface.removeIndex('token_blacklists', 'idx_token_blacklist_expires_at');
    await queryInterface.removeIndex('token_blacklists', 'idx_token_blacklist_user_id');
    await queryInterface.removeIndex('token_blacklists', 'idx_token_blacklist_token');

    // Then drop table
    await queryInterface.dropTable('token_blacklists');
  },
};
