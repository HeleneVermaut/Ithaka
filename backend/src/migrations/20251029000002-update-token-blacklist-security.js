'use strict';

/**
 * Migration: Security Enhancement for Token Blacklist
 *
 * This migration implements critical security improvements to the token blacklist system:
 *
 * 1. Changes token storage from TEXT to VARCHAR(64) to accommodate SHA-256 hashes
 *    - Tokens are now hashed before storage to prevent exposure if DB is compromised
 *    - SHA-256 produces exactly 64 hexadecimal characters
 *    - This is a breaking change: existing plaintext tokens will no longer work
 *
 * 2. Updates index names to match the standardized naming convention
 *    - Uses consistent naming: token_blacklists_{field}_idx
 *    - Makes indexes easier to identify and maintain
 *
 * BREAKING CHANGE WARNING:
 * - After this migration, the model will hash tokens before storage
 * - Any plaintext tokens stored before this migration will NOT match hashed lookups
 * - Users may need to re-authenticate after deployment
 * - For production: Consider clearing the blacklist table or providing a grace period
 *
 * Security context:
 * - Part of Phase 1 (CRITICAL) security fixes from enterprise architecture audit
 * - Prevents token exposure if database is compromised
 * - Maintains performance with indexed lookups on hashed values
 *
 * @param {QueryInterface} queryInterface - Sequelize query interface
 * @param {Sequelize} Sequelize - Sequelize instance with DataTypes
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Remove old indexes (we'll recreate them with new names)
    // Note: Indexes may fail to remove if they don't exist, wrapped in try/catch
    try {
      await queryInterface.removeIndex('token_blacklists', 'idx_token_blacklist_user_revoked');
    } catch (error) {
      console.log('Index idx_token_blacklist_user_revoked does not exist, skipping removal');
    }

    try {
      await queryInterface.removeIndex('token_blacklists', 'idx_token_blacklist_expires_at');
    } catch (error) {
      console.log('Index idx_token_blacklist_expires_at does not exist, skipping removal');
    }

    try {
      await queryInterface.removeIndex('token_blacklists', 'idx_token_blacklist_user_id');
    } catch (error) {
      console.log('Index idx_token_blacklist_user_id does not exist, skipping removal');
    }

    try {
      await queryInterface.removeIndex('token_blacklists', 'idx_token_blacklist_token');
    } catch (error) {
      console.log('Index idx_token_blacklist_token does not exist, skipping removal');
    }

    // Step 2: Modify token column from TEXT to VARCHAR(64)
    // This accommodates SHA-256 hash storage (64 hex characters)
    await queryInterface.changeColumn('token_blacklists', 'token', {
      type: Sequelize.STRING(64),
      allowNull: false,
      comment: 'SHA-256 hash of the revoked JWT token (64 hex characters)',
    });

    // Step 3: Create indexes with new naming convention
    // These indexes are critical for authentication performance

    // Primary lookup index - used on every token validation
    // Most important for performance: O(log n) vs O(n) without index
    await queryInterface.addIndex('token_blacklists', ['token'], {
      name: 'token_blacklists_token_idx',
      unique: false,
    });

    // Composite index for user revocation history queries
    // Used for audit trails and administrative operations
    await queryInterface.addIndex('token_blacklists', ['userId', 'revokedAt'], {
      name: 'token_blacklists_user_revoked_idx',
      unique: false,
    });

    // Index for cleanup cron jobs
    // Used to efficiently remove expired tokens
    await queryInterface.addIndex('token_blacklists', ['expiresAt'], {
      name: 'token_blacklists_expires_idx',
      unique: false,
    });

    console.log('✅ Token blacklist security migration completed successfully');
    console.log('⚠️  WARNING: Existing plaintext tokens will no longer work - users may need to re-authenticate');
  },

  async down(queryInterface, Sequelize) {
    // Step 1: Remove new indexes
    await queryInterface.removeIndex('token_blacklists', 'token_blacklists_expires_idx');
    await queryInterface.removeIndex('token_blacklists', 'token_blacklists_user_revoked_idx');
    await queryInterface.removeIndex('token_blacklists', 'token_blacklists_token_idx');

    // Step 2: Revert token column to TEXT
    await queryInterface.changeColumn('token_blacklists', 'token', {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: 'The full JWT token that has been revoked',
    });

    // Step 3: Recreate old indexes (for rollback compatibility)
    await queryInterface.addIndex('token_blacklists', ['token'], {
      name: 'idx_token_blacklist_token',
      unique: false,
    });

    await queryInterface.addIndex('token_blacklists', ['userId'], {
      name: 'idx_token_blacklist_user_id',
    });

    await queryInterface.addIndex('token_blacklists', ['expiresAt'], {
      name: 'idx_token_blacklist_expires_at',
    });

    await queryInterface.addIndex('token_blacklists', ['userId', 'revokedAt'], {
      name: 'idx_token_blacklist_user_revoked',
    });

    console.log('⚠️  Rolled back token blacklist security migration');
    console.log('   Token field reverted to TEXT (plaintext storage - NOT SECURE)');
  },
};
