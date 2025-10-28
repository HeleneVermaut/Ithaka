/**
 * Token Service
 *
 * This service handles all JWT token operations including generation, verification,
 * and cookie management. It provides a centralized way to manage authentication tokens.
 *
 * Token strategy:
 * - Access tokens: Short-lived (15 minutes), used for API authentication
 * - Refresh tokens: Long-lived (7 days), used to obtain new access tokens
 * - Tokens are stored in httpOnly cookies for security (prevents XSS attacks)
 *
 * Cookie security settings:
 * - httpOnly: Prevents JavaScript access (XSS protection)
 * - secure: HTTPS only (man-in-the-middle protection)
 * - sameSite: 'strict' - Prevents CSRF attacks
 *
 * @module services/tokenService
 */

import { Response } from 'express';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  JWTPayload,
  DecodedJWT,
} from '../utils/jwt';
import { logger } from '../utils/logger';

/**
 * Cookie configuration for JWT tokens
 * These settings ensure maximum security for authentication cookies
 */
interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}

/**
 * Get cookie options based on environment
 * In production, enforce HTTPS (secure: true)
 * In development, allow HTTP for local testing
 *
 * @param {number} maxAge - Maximum age of cookie in milliseconds
 * @returns {CookieOptions} Cookie configuration object
 */
const getCookieOptions = (maxAge: number): CookieOptions => {
  const isProduction = process.env['NODE_ENV'] === 'production';

  return {
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // Prevent CSRF attacks
    maxAge, // Cookie expiration time
    path: '/', // Cookie available for entire domain
  };
};

/**
 * Generate and set authentication tokens in cookies
 *
 * This function creates both access and refresh tokens and sets them
 * as httpOnly cookies in the response. This is the primary method used
 * during login and registration.
 *
 * @async
 * @param {Response} res - Express response object
 * @param {JWTPayload} payload - User data to encode in tokens
 * @returns {Promise<{ accessToken: string; refreshToken: string }>} Generated tokens
 *
 * @example
 * // In login controller
 * const tokens = await setAuthTokens(res, {
 *   userId: user.id,
 *   role: 'user'
 * });
 * // Tokens are now set in cookies automatically
 */
export const setAuthTokens = async (
  res: Response,
  payload: JWTPayload
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    // Generate both tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Access token expires in 15 minutes (900000 milliseconds)
    const accessTokenMaxAge = 15 * 60 * 1000;
    // Refresh token expires in 7 days (604800000 milliseconds)
    const refreshTokenMaxAge = 7 * 24 * 60 * 60 * 1000;

    // Set access token cookie
    res.cookie('accessToken', accessToken, getCookieOptions(accessTokenMaxAge));

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, getCookieOptions(refreshTokenMaxAge));

    logger.info('Authentication tokens set in cookies', {
      userId: payload.userId,
      accessTokenExpiry: '15 minutes',
      refreshTokenExpiry: '7 days',
    });

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Failed to set authentication tokens', error);
    throw new Error('Failed to set authentication tokens');
  }
};

/**
 * Clear authentication tokens from cookies
 *
 * This function removes both access and refresh tokens by setting their
 * maxAge to 0. Used during logout to ensure complete session termination.
 *
 * @param {Response} res - Express response object
 *
 * @example
 * // In logout controller
 * clearAuthTokens(res);
 * res.json({ message: 'Logged out successfully' });
 */
export const clearAuthTokens = (res: Response): void => {
  try {
    // Clear access token
    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    // Clear refresh token
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    logger.info('Authentication tokens cleared from cookies');
  } catch (error) {
    logger.error('Failed to clear authentication tokens', error);
    throw new Error('Failed to clear authentication tokens');
  }
};

/**
 * Verify access token validity
 *
 * Wrapper function that verifies an access token and returns the decoded payload.
 * Throws an error if the token is invalid or expired.
 *
 * @param {string} token - Access token to verify
 * @returns {DecodedJWT} Decoded token payload with user information
 * @throws {Error} If token is invalid, expired, or malformed
 *
 * @example
 * try {
 *   const decoded = verifyToken(req.cookies.accessToken);
 *   console.log('User ID:', decoded.userId);
 * } catch (error) {
 *   // Token is invalid, require login
 * }
 */
export const verifyToken = (token: string): DecodedJWT => {
  try {
    return verifyAccessToken(token);
  } catch (error) {
    logger.warn('Access token verification failed', { error: (error as Error).message });
    throw error;
  }
};

/**
 * Verify refresh token validity
 *
 * Wrapper function that verifies a refresh token. Used when generating
 * a new access token after the old one expires.
 *
 * @param {string} token - Refresh token to verify
 * @returns {DecodedJWT} Decoded token payload
 * @throws {Error} If token is invalid, expired, or malformed
 *
 * @example
 * try {
 *   const decoded = verifyRefresh(req.cookies.refreshToken);
 *   // Generate new access token
 *   const newAccessToken = generateAccessToken({
 *     userId: decoded.userId,
 *     role: decoded.role
 *   });
 * } catch (error) {
 *   // Refresh token expired, require login
 * }
 */
export const verifyRefresh = (token: string): DecodedJWT => {
  try {
    return verifyRefreshToken(token);
  } catch (error) {
    logger.warn('Refresh token verification failed', { error: (error as Error).message });
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 *
 * This function verifies the refresh token and generates a new access token.
 * The new access token is automatically set in cookies. This allows users
 * to stay logged in without re-entering credentials.
 *
 * @async
 * @param {Response} res - Express response object
 * @param {string} refreshToken - Refresh token from cookies
 * @returns {Promise<string>} New access token
 * @throws {Error} If refresh token is invalid or expired
 *
 * @example
 * // In refresh endpoint
 * try {
 *   const newAccessToken = await refreshAccessToken(res, req.cookies.refreshToken);
 *   res.json({ message: 'Token refreshed' });
 * } catch (error) {
 *   res.status(401).json({ error: 'Refresh token expired, please login' });
 * }
 */
export const refreshAccessToken = async (
  res: Response,
  refreshToken: string
): Promise<string> => {
  try {
    // Verify refresh token is valid
    const decoded = verifyRefreshToken(refreshToken);

    // Generate new access token with same payload
    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      role: decoded.role,
    });

    // Set new access token in cookie
    const accessTokenMaxAge = 15 * 60 * 1000; // 15 minutes
    res.cookie('accessToken', newAccessToken, getCookieOptions(accessTokenMaxAge));

    logger.info('Access token refreshed successfully', {
      userId: decoded.userId,
    });

    return newAccessToken;
  } catch (error) {
    logger.error('Failed to refresh access token', error);
    throw new Error('Failed to refresh access token');
  }
};

/**
 * Extract and verify token from cookies
 *
 * This helper function extracts the access token from request cookies
 * and verifies it. Returns null if token doesn't exist or is invalid.
 *
 * @param {any} cookies - Request cookies object
 * @returns {DecodedJWT | null} Decoded token or null if invalid
 *
 * @example
 * const decoded = extractAndVerifyToken(req.cookies);
 * if (decoded) {
 *   console.log('Authenticated user:', decoded.userId);
 * } else {
 *   console.log('No valid token found');
 * }
 */
export const extractAndVerifyToken = (cookies: any): DecodedJWT | null => {
  try {
    const token = cookies['accessToken'];
    if (!token) {
      return null;
    }
    return verifyAccessToken(token);
  } catch (error) {
    logger.debug('Token extraction/verification failed', { error: (error as Error).message });
    return null;
  }
};

/**
 * Check if refresh token exists and is valid
 *
 * Utility function to check if a refresh token is present in cookies
 * and still valid. Used to determine if automatic token refresh is possible.
 *
 * @param {any} cookies - Request cookies object
 * @returns {boolean} True if refresh token exists and is valid
 *
 * @example
 * if (canRefreshToken(req.cookies)) {
 *   // Attempt automatic token refresh
 *   await refreshAccessToken(res, req.cookies.refreshToken);
 * } else {
 *   // Require user to login again
 *   res.status(401).json({ error: 'Session expired' });
 * }
 */
export const canRefreshToken = (cookies: any): boolean => {
  try {
    const refreshToken = cookies['refreshToken'];
    if (!refreshToken) {
      return false;
    }
    verifyRefreshToken(refreshToken);
    return true;
  } catch (error) {
    return false;
  }
};

export default {
  setAuthTokens,
  clearAuthTokens,
  verifyToken,
  verifyRefresh,
  refreshAccessToken,
  extractAndVerifyToken,
  canRefreshToken,
};
