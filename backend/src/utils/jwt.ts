/**
 * JWT (JSON Web Token) Utility Module
 *
 * This module provides functions to generate and verify JWT tokens for authentication.
 * JWTs are used to securely transmit information between the client and server.
 *
 * Security considerations:
 * - Tokens are signed with a secret key to prevent tampering
 * - Access tokens expire quickly (15 minutes) for security
 * - Refresh tokens last longer (7 days) to maintain user sessions
 * - Never store secrets in code; always use environment variables
 *
 * @module utils/jwt
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from './logger';

/**
 * Interface defining the data stored in a JWT token (the "payload")
 * This is the user information we embed in the token
 *
 * Security: Email is NOT included in JWT to comply with GDPR data minimization.
 * JWT tokens can be decoded without the secret key, so PII should not be stored.
 * If email is needed, retrieve it from the database using userId.
 *
 * @interface JWTPayload
 * @property {string} userId - The unique identifier of the user (UUID)
 * @property {string} [role] - Optional user role (e.g., 'user', 'admin')
 */
export interface JWTPayload {
  userId: string;
  role?: string;
}

/**
 * Interface for the decoded JWT token
 * Extends JWTPayload with standard JWT claims
 *
 * @interface DecodedJWT
 * @extends JWTPayload
 * @property {number} iat - "Issued at" timestamp (when token was created)
 * @property {number} exp - "Expiration" timestamp (when token expires)
 */
export interface DecodedJWT extends JWTPayload {
  iat: number;
  exp: number;
}

/**
 * Generate an access token for a user
 *
 * Access tokens are short-lived (15 minutes by default) and used for
 * authenticating API requests. They should be stored in httpOnly cookies
 * for security.
 *
 * @param {JWTPayload} payload - The user data to encode in the token
 * @returns {string} The signed JWT access token
 * @throws {Error} If JWT_SECRET is not configured in environment variables
 *
 * @example
 * const token = generateAccessToken({
 *   userId: '123e4567-e89b-12d3-a456-426614174000',
 *   role: 'user'
 * });
 * // Returns: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  const secret = process.env['JWT_SECRET'];

  if (!secret) {
    logger.error('JWT_SECRET is not defined in environment variables');
    throw new Error('JWT configuration error: JWT_SECRET is missing');
  }

  // Default expiration: 15 minutes
  const expiresIn = process.env['JWT_ACCESS_EXPIRATION'] || '15m';

  try {
    const token = jwt.sign(payload, secret, {
      expiresIn: expiresIn,
      algorithm: 'HS256', // HMAC with SHA-256
    } as SignOptions);

    logger.debug('Access token generated successfully', { userId: payload.userId });
    return token;
  } catch (error) {
    logger.error('Failed to generate access token', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate a refresh token for a user
 *
 * Refresh tokens are long-lived (7 days by default) and used to obtain
 * new access tokens without requiring the user to log in again.
 * They should be stored securely in httpOnly cookies.
 *
 * @param {JWTPayload} payload - The user data to encode in the token
 * @returns {string} The signed JWT refresh token
 * @throws {Error} If JWT_REFRESH_SECRET is not configured
 *
 * @example
 * const refreshToken = generateRefreshToken({
 *   userId: '123e4567-e89b-12d3-a456-426614174000',
 *   role: 'user'
 * });
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
  const secret = process.env['JWT_REFRESH_SECRET'];

  if (!secret) {
    logger.error('JWT_REFRESH_SECRET is not defined in environment variables');
    throw new Error('JWT configuration error: JWT_REFRESH_SECRET is missing');
  }

  // Default expiration: 7 days
  const expiresIn = process.env['JWT_REFRESH_EXPIRATION'] || '7d';

  try {
    const token = jwt.sign(payload, secret, {
      expiresIn: expiresIn,
      algorithm: 'HS256',
    } as SignOptions);

    logger.debug('Refresh token generated successfully', { userId: payload.userId });
    return token;
  } catch (error) {
    logger.error('Failed to generate refresh token', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify and decode an access token
 *
 * This function checks if the token is valid (properly signed and not expired)
 * and returns the decoded payload if successful.
 *
 * @param {string} token - The JWT token to verify
 * @returns {DecodedJWT} The decoded token payload
 * @throws {Error} If token is invalid, expired, or malformed
 *
 * @example
 * try {
 *   const decoded = verifyAccessToken(token);
 *   console.log('User ID:', decoded.userId);
 * } catch (error) {
 *   console.error('Invalid token');
 * }
 */
export const verifyAccessToken = (token: string): DecodedJWT => {
  const secret = process.env['JWT_SECRET'];

  if (!secret) {
    logger.error('JWT_SECRET is not defined in environment variables');
    throw new Error('JWT configuration error: JWT_SECRET is missing');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as DecodedJWT;

    logger.debug('Access token verified successfully', { userId: decoded.userId });
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Access token has expired');
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid access token', { error: (error as Error).message });
      throw new Error('Invalid token');
    } else {
      logger.error('Token verification failed', error);
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify and decode a refresh token
 *
 * Similar to verifyAccessToken but uses the refresh token secret.
 * Used when a client wants to obtain a new access token.
 *
 * @param {string} token - The JWT refresh token to verify
 * @returns {DecodedJWT} The decoded token payload
 * @throws {Error} If token is invalid, expired, or malformed
 *
 * @example
 * try {
 *   const decoded = verifyRefreshToken(refreshToken);
 *   const newAccessToken = generateAccessToken({
 *     userId: decoded.userId,
 *     role: decoded.role
 *   });
 * } catch (error) {
 *   // Require user to log in again
 * }
 */
export const verifyRefreshToken = (token: string): DecodedJWT => {
  const secret = process.env['JWT_REFRESH_SECRET'];

  if (!secret) {
    logger.error('JWT_REFRESH_SECRET is not defined in environment variables');
    throw new Error('JWT configuration error: JWT_REFRESH_SECRET is missing');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as DecodedJWT;

    logger.debug('Refresh token verified successfully', { userId: decoded.userId });
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Refresh token has expired');
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid refresh token', { error: (error as Error).message });
      throw new Error('Invalid refresh token');
    } else {
      logger.error('Refresh token verification failed', error);
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Generate both access and refresh tokens at once
 *
 * Convenience function typically used during login to create both tokens
 * in one call.
 *
 * @param {JWTPayload} payload - The user data to encode
 * @returns {{ accessToken: string; refreshToken: string }} Object containing both tokens
 *
 * @example
 * const tokens = generateTokenPair({
 *   userId: '123e4567-e89b-12d3-a456-426614174000',
 *   role: 'user'
 * });
 * // Set tokens in cookies
 * res.cookie('accessToken', tokens.accessToken, { httpOnly: true });
 * res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true });
 */
export const generateTokenPair = (payload: JWTPayload): {
  accessToken: string;
  refreshToken: string;
} => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  logger.info('Token pair generated successfully', { userId: payload.userId });

  return {
    accessToken,
    refreshToken,
  };
};
