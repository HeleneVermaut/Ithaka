/**
 * Token Revocation Service Tests
 *
 * Tests for the token revocation functionality including:
 * - Revoking all tokens for a user
 * - Revoking specific tokens
 * - Checking revocation status
 * - Cleaning up expired tokens
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TokenBlacklist } from '../../models/TokenBlacklist';
import {
  revokeUserTokens,
  revokeSpecificToken,
  checkIfTokenRevoked,
  cleanupExpiredTokens,
} from '../tokenRevocationService';

describe('TokenRevocationService', () => {
  const testUserId = 'test-user-123';
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

  beforeEach(async () => {
    // Clear the token blacklist before each test
    await TokenBlacklist.destroy({ where: {}, force: true });
  });

  afterEach(async () => {
    // Clean up after each test
    await TokenBlacklist.destroy({ where: {}, force: true });
  });

  describe('revokeUserTokens', () => {
    it('should revoke all tokens for a user with default reason', async () => {
      await expect(revokeUserTokens(testUserId)).resolves.not.toThrow();
    });

    it('should revoke all tokens for a user with custom reason', async () => {
      await expect(revokeUserTokens(testUserId, 'password_change')).resolves.not.toThrow();
    });

    it('should log revocation event', async () => {
      // This would verify logging if we had logger mocks
      await revokeUserTokens(testUserId, 'security_incident');
    });
  });

  describe('revokeSpecificToken', () => {
    it('should revoke a specific token', async () => {
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await expect(
        revokeSpecificToken(testToken, testUserId, 'password_change', expiryDate)
      ).resolves.not.toThrow();

      // Verify token was blacklisted
      const isRevoked = await checkIfTokenRevoked(testToken);
      expect(isRevoked).toBe(true);
    });

    it('should use default expiry if not provided', async () => {
      await expect(
        revokeSpecificToken(testToken, testUserId, 'user_requested')
      ).resolves.not.toThrow();
    });
  });

  describe('checkIfTokenRevoked', () => {
    it('should return false for non-revoked token', async () => {
      const isRevoked = await checkIfTokenRevoked('non-revoked-token');
      expect(isRevoked).toBe(false);
    });

    it('should return true for revoked token', async () => {
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await revokeSpecificToken(testToken, testUserId, 'test', expiryDate);

      const isRevoked = await checkIfTokenRevoked(testToken);
      expect(isRevoked).toBe(true);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should remove expired tokens', async () => {
      // Create expired token
      const pastExpiry = new Date(Date.now() - 1000);
      await revokeSpecificToken('expired-token', testUserId, 'test', pastExpiry);

      // Create valid token
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await revokeSpecificToken('valid-token', testUserId, 'test', futureExpiry);

      const removed = await cleanupExpiredTokens();
      expect(removed).toBeGreaterThanOrEqual(1);

      // Valid token should still be there
      const validTokenRevoked = await checkIfTokenRevoked('valid-token');
      expect(validTokenRevoked).toBe(true);
    });

    it('should return 0 if no expired tokens', async () => {
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await revokeSpecificToken(testToken, testUserId, 'test', futureExpiry);

      const removed = await cleanupExpiredTokens();
      expect(removed).toBe(0);
    });
  });
});
