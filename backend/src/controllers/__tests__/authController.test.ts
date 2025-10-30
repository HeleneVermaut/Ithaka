/**
 * Authentication Controller Tests - Session Verification
 *
 * Unit tests for the verifySession endpoint (GET /api/auth/verify).
 * Tests cover:
 * - Valid session verification with user data
 * - Invalid user ID in token
 * - User not found in database
 * - Database connection errors
 * - Proper response formatting and security
 *
 * Note: Tests mock authMiddleware to focus on verifySession logic.
 * For integration tests with real middleware, see api.integration.test.ts
 *
 * @module controllers/__tests__/authController.test.ts
 */

import request from 'supertest';
import express, { Express, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from '../../middleware/errorHandler';
import { verifySession } from '../authController';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../models/User');

describe('Authentication Controller - Session Verification', () => {
  let app: Express;
  const mockUserId = 'test-user-uuid-1';
  const mockUserSafeData = {
    id: mockUserId,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    pseudo: 'johndoe',
    bio: 'Travel enthusiast',
    avatarBase64: null,
    isEmailVerified: true,
    lastLoginAt: '2024-01-27T10:30:00Z',
    lastLogoutAt: null,
    createdAt: '2024-01-20T15:00:00Z',
    updatedAt: '2024-01-27T10:30:00Z',
  };

  const mockUserModel = {
    id: mockUserId,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    pseudo: 'johndoe',
    bio: 'Travel enthusiast',
    avatarBase64: null,
    isEmailVerified: true,
    lastLoginAt: new Date('2024-01-27T10:30:00Z'),
    lastLogoutAt: null,
    createdAt: new Date('2024-01-20T15:00:00Z'),
    updatedAt: new Date('2024-01-27T10:30:00Z'),
    toSafeJSON: jest.fn(() => mockUserSafeData),
  };

  beforeAll(() => {
    // Create test Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Mock authentication middleware - simulates successful authentication
    // This allows us to focus on testing verifySession logic
    app.use((req: any, _res: any, next: NextFunction) => {
      // Mock user data in request (as if authMiddleware validated the token)
      if (req.path === '/api/auth/verify') {
        req.user = { userId: mockUserId };
      }
      next();
    });

    // Mount verify endpoint
    app.get('/api/auth/verify', verifySession);

    // Mount error handler
    app.use(errorHandler);
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/auth/verify - Success Cases', () => {
    /**
     * Test Case 1: Valid session - user data should be returned
     * This verifies the happy path where token is valid and user exists
     */
    it('should return user data when session is valid', async () => {
      // Arrange
      const User = require('../../models/User').default;
      User.findByPk = jest.fn().mockResolvedValue(mockUserModel);

      // Act
      const response = await request(app).get('/api/auth/verify');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Session is valid');
      expect(response.body.user).toEqual(mockUserSafeData);
      expect(User.findByPk).toHaveBeenCalledWith(mockUserId);
    });

    /**
     * Test Case 2: Session verification does NOT modify database
     * Ensures endpoint is read-only with no side effects
     */
    it('should not generate new tokens or modify session', async () => {
      // Arrange
      const User = require('../../models/User').default;
      User.findByPk = jest.fn().mockResolvedValue(mockUserModel);

      // Act
      const response = await request(app).get('/api/auth/verify');

      // Assert
      // Should only READ from database, not WRITE
      expect(response.status).toBe(200);
      expect(User.findByPk).toHaveBeenCalledTimes(1);
      // Response should not set new cookies
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    /**
     * Test Case 3: User data is properly transformed to safe JSON
     * Sensitive fields must be excluded from response
     */
    it('should return only safe user data without sensitive fields', async () => {
      // Arrange
      const User = require('../../models/User').default;
      User.findByPk = jest.fn().mockResolvedValue(mockUserModel);

      // Act
      const response = await request(app).get('/api/auth/verify');

      // Assert
      const user = response.body.user;
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('passwordResetToken');
      expect(user).not.toHaveProperty('passwordResetExpiry');
      expect(user).not.toHaveProperty('deletedAt');
    });
  });

  describe('GET /api/auth/verify - Error Cases', () => {
    /**
     * Test Case 4: User not found in database - should return 401
     * Even with valid token, if user is deleted from DB, deny access
     * Security: Ensures consistency between token and actual user record
     */
    it('should return 401 when user is not found in database', async () => {
      // Arrange
      const User = require('../../models/User').default;
      User.findByPk = jest.fn().mockResolvedValue(null);

      // Act
      const response = await request(app).get('/api/auth/verify');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('User not found');
      expect(User.findByPk).toHaveBeenCalledWith(mockUserId);
    });

    /**
     * Test Case 5: Database connection error - should return 500
     * If database is unavailable, return server error
     */
    it('should return 500 when database query fails', async () => {
      // Arrange
      const User = require('../../models/User').default;
      User.findByPk = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app).get('/api/auth/verify');

      // Assert
      expect(response.status).toBe(500);
    });

    /**
     * Test Case 6: No user ID in token - should return 401
     * Security: Malformed token without userId should be rejected
     */
    it('should return 401 when user ID is missing from token', async () => {
      // We need to override the mock middleware for this specific test
      const testApp = express();
      testApp.use(express.json());
      testApp.use(express.urlencoded({ extended: true }));
      testApp.use(cookieParser());

      // Mock middleware that sets invalid user (no userId)
      testApp.use((req: any, _res: any, next: NextFunction) => {
        req.user = {}; // Missing userId
        next();
      });

      testApp.get('/api/auth/verify', verifySession);
      testApp.use(errorHandler);

      // Act
      const response = await request(testApp).get('/api/auth/verify');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('User information not found');
    });
  });

  describe('GET /api/auth/verify - Response Format', () => {
    /**
     * Test Case 7: Response structure is correct
     * Ensures consistent and properly formatted API response
     */
    it('should return properly structured response', async () => {
      // Arrange
      const User = require('../../models/User').default;
      User.findByPk = jest.fn().mockResolvedValue(mockUserModel);

      // Act
      const response = await request(app).get('/api/auth/verify');

      // Assert
      expect(response.body).toEqual({
        success: true,
        message: 'Session is valid',
        user: mockUserSafeData,
      });
    });

    /**
     * Test Case 8: Response has correct HTTP status
     * Successful verification should return 200 OK
     */
    it('should return 200 status for valid session', async () => {
      // Arrange
      const User = require('../../models/User').default;
      User.findByPk = jest.fn().mockResolvedValue(mockUserModel);

      // Act
      const response = await request(app).get('/api/auth/verify');

      // Assert
      expect(response.status).toBe(200);
      expect(response.type).toContain('application/json');
    });
  });

  describe('GET /api/auth/verify - Security Tests', () => {
    /**
     * Test Case 9: No tokens are generated or modified
     * This is a read-only verification endpoint, not a token refresh
     */
    it('should NOT set any authentication cookies in response', async () => {
      // Arrange
      const User = require('../../models/User').default;
      User.findByPk = jest.fn().mockResolvedValue(mockUserModel);

      // Act
      const response = await request(app).get('/api/auth/verify');

      // Assert - no Set-Cookie headers should be present
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    /**
     * Test Case 10: Audit logging is performed
     * Security events should be logged for monitoring
     */
    it('should log successful session verification', async () => {
      // Arrange
      const User = require('../../models/User').default;
      const { logger } = require('../../utils/logger');
      User.findByPk = jest.fn().mockResolvedValue(mockUserModel);

      // Act
      await request(app).get('/api/auth/verify');

      // Assert
      expect(logger.info).toHaveBeenCalledWith('Session verified successfully', {
        userId: mockUserId,
      });
    });

    /**
     * Test Case 11: Only safe user data is returned
     * Sensitive fields must never leak in API responses
     */
    it('should never return sensitive user fields', async () => {
      // Arrange
      const User = require('../../models/User').default;
      User.findByPk = jest.fn().mockResolvedValue(mockUserModel);

      // Act
      const response = await request(app).get('/api/auth/verify');

      // Assert
      const user = response.body.user;
      const sensitiveFields = ['passwordHash', 'passwordResetToken', 'passwordResetExpiry', 'deletedAt'];
      sensitiveFields.forEach((field) => {
        expect(user).not.toHaveProperty(field);
      });
    });
  });
});
