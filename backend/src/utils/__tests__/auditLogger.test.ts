/**
 * Audit Logger Tests
 *
 * Tests for audit logging functionality including:
 * - Login success/failure logging
 * - Password change logging
 * - Account deletion logging
 * - Token refresh logging
 * - Profile update logging
 * - Data export logging
 * - IP address and user agent capture
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuditLogger } from '../auditLogger';
import { logger } from '../logger';

// Mock the logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logLoginSuccess', () => {
    it('should log successful login with all required fields', () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const ip = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

      AuditLogger.logLoginSuccess(userId, email, ip, userAgent);

      expect(logger.info).toHaveBeenCalled();
      const call = (logger.info as any).mock.calls[0];
      expect(call[0]).toContain('AUDIT: LOGIN_SUCCESS');
      expect(call[1]).toMatchObject({
        userId,
        email,
      });
    });

    it('should handle missing optional parameters', () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      AuditLogger.logLoginSuccess(userId, email);

      expect(logger.info).toHaveBeenCalled();
      const call = (logger.info as any).mock.calls[0];
      expect(call[1]).toMatchObject({
        userId,
        email,
      });
    });

    it('should truncate IP addresses for privacy', () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const ip = '192.168.1.1';

      AuditLogger.logLoginSuccess(userId, email, ip);

      const call = (logger.info as any).mock.calls[0];
      expect(call[1].ip).toContain('xxx');
    });

    it('should truncate user agent strings', () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const userAgent = 'a'.repeat(150); // Very long user agent

      AuditLogger.logLoginSuccess(userId, email, undefined, userAgent);

      const call = (logger.info as any).mock.calls[0];
      expect(call[1].userAgent?.length).toBeLessThanOrEqual(100);
    });
  });

  describe('logLoginFailure', () => {
    it('should log failed login attempt', () => {
      const email = 'user@example.com';
      const ip = '192.168.1.1';

      AuditLogger.logLoginFailure(email, 'Invalid credentials', ip);

      expect(logger.warn).toHaveBeenCalled();
      const call = (logger.warn as any).mock.calls[0];
      expect(call[0]).toContain('AUDIT: LOGIN_FAILURE');
      expect(call[1]).toMatchObject({
        email,
        status: 'failure',
      });
    });

    it('should include failure reason in metadata', () => {
      const email = 'user@example.com';
      const reason = 'User not found';

      AuditLogger.logLoginFailure(email, reason);

      const call = (logger.warn as any).mock.calls[0];
      expect(call[1].metadata?.reason).toBe(reason);
    });

    it('should not include userId for non-existent users', () => {
      const email = 'nonexistent@example.com';

      AuditLogger.logLoginFailure(email, 'User not found');

      const call = (logger.warn as any).mock.calls[0];
      expect(call[1].userId).toBeUndefined();
    });
  });

  describe('logPasswordChange', () => {
    it('should log password change with user information', () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const ip = '192.168.1.1';

      AuditLogger.logPasswordChange(userId, email, ip);

      expect(logger.info).toHaveBeenCalled();
      const call = (logger.info as any).mock.calls[0];
      expect(call[0]).toContain('AUDIT: PASSWORD_CHANGE');
      expect(call[1]).toMatchObject({
        userId,
        email,
        status: 'success',
      });
    });

    it('should capture IP and user agent', () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const ip = '10.0.0.5';
      const userAgent = 'Mozilla/5.0';

      AuditLogger.logPasswordChange(userId, email, ip, userAgent);

      const call = (logger.info as any).mock.calls[0];
      expect(call[1]).toHaveProperty('ip');
      expect(call[1]).toHaveProperty('userAgent');
    });
  });

  describe('logAccountDeletion', () => {
    it('should log account deletion', () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      AuditLogger.logAccountDeletion(userId, email);

      expect(logger.warn).toHaveBeenCalled();
      const call = (logger.warn as any).mock.calls[0];
      expect(call[0]).toContain('AUDIT: ACCOUNT_DELETION');
      expect(call[1]).toMatchObject({
        userId,
        email,
        status: 'success',
      });
    });

    it('should include user ID and email in message', () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      AuditLogger.logAccountDeletion(userId, email);

      const call = (logger.warn as any).mock.calls[0];
      expect(call[1].message).toContain(userId);
      expect(call[1].message).toContain(email);
    });
  });

  describe('logTokenRefresh', () => {
    it('should log token refresh', () => {
      const userId = 'user-123';
      const ip = '192.168.1.1';

      AuditLogger.logTokenRefresh(userId, ip);

      expect(logger.info).toHaveBeenCalled();
      const call = (logger.info as any).mock.calls[0];
      expect(call[0]).toContain('AUDIT: TOKEN_REFRESH');
      expect(call[1]).toMatchObject({
        userId,
      });
    });

    it('should not require email for token refresh', () => {
      const userId = 'user-123';

      AuditLogger.logTokenRefresh(userId);

      const call = (logger.info as any).mock.calls[0];
      expect(call[1].email).toBeUndefined();
    });
  });

  describe('logProfileUpdate', () => {
    it('should log profile update with updated fields', () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const updatedFields = ['firstName', 'lastName', 'bio'];

      AuditLogger.logProfileUpdate(userId, email, updatedFields);

      expect(logger.info).toHaveBeenCalled();
      const call = (logger.info as any).mock.calls[0];
      expect(call[0]).toContain('AUDIT: PROFILE_UPDATE');
      expect(call[1]).toMatchObject({
        userId,
        email,
      });
      expect(call[1].metadata?.updatedFields).toEqual(updatedFields);
    });

    it('should list updated fields in message', () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const updatedFields = ['firstName', 'avatar'];

      AuditLogger.logProfileUpdate(userId, email, updatedFields);

      const call = (logger.info as any).mock.calls[0];
      expect(call[1].message).toContain('firstName');
      expect(call[1].message).toContain('avatar');
    });
  });

  describe('logDataExport', () => {
    it('should log data export with format', () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const format = 'json';

      AuditLogger.logDataExport(userId, email, format);

      expect(logger.info).toHaveBeenCalled();
      const call = (logger.info as any).mock.calls[0];
      expect(call[0]).toContain('AUDIT: DATA_EXPORT');
      expect(call[1]).toMatchObject({
        userId,
        email,
      });
      expect(call[1].metadata?.format).toBe(format);
    });

    it('should support different export formats', () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      const formats = ['json', 'csv', 'pdf'];
      formats.forEach((format) => {
        vi.clearAllMocks();
        AuditLogger.logDataExport(userId, email, format);

        const call = (logger.info as any).mock.calls[0];
        expect(call[1].metadata?.format).toBe(format);
      });
    });

    it('should default to json format', () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      AuditLogger.logDataExport(userId, email);

      const call = (logger.info as any).mock.calls[0];
      expect(call[1].metadata?.format).toBe('json');
    });
  });

  describe('IP Address Privacy', () => {
    it('should truncate IPv4 addresses', () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const ipv4 = '192.168.1.100';

      AuditLogger.logLoginSuccess(userId, email, ipv4);

      const call = (logger.info as any).mock.calls[0];
      expect(call[1].ip).toMatch(/\d+\.\d+\.\d+\.xxx/);
    });

    it('should truncate IPv6 addresses', () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

      AuditLogger.logLoginSuccess(userId, email, ipv6);

      const call = (logger.info as any).mock.calls[0];
      expect(call[1].ip).toContain('xxxx');
    });
  });

  describe('Timestamp Handling', () => {
    it('should include ISO timestamp in audit logs', () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      AuditLogger.logLoginSuccess(userId, email);

      const call = (logger.info as any).mock.calls[0];
      expect(call[1].timestamp).toBeDefined();
      // Check if it's a valid ISO string
      expect(new Date(call[1].timestamp).toISOString()).toBeDefined();
    });
  });
});
