/**
 * Token Hashing Utility
 *
 * This module provides cryptographic hashing functions for JWT tokens
 * before storing them in the token blacklist database.
 *
 * Security rationale:
 * - JWT tokens contain sensitive information and should never be stored in plaintext
 * - If the database is compromised, hashed tokens cannot be used to impersonate users
 * - SHA-256 is a one-way hash function - tokens cannot be recovered from the hash
 * - All tokens are hashed consistently so lookups remain functional
 *
 * Implementation notes:
 * - Uses Node.js built-in crypto module (no external dependencies)
 * - SHA-256 produces a fixed 64-character hex string regardless of input length
 * - Hashing is deterministic: same token always produces the same hash
 * - No salt is needed since tokens are already cryptographically random
 *
 * @module utils/tokenHash
 */

import crypto from 'crypto';

/**
 * Hashes a JWT token using SHA-256 for secure storage in the database.
 *
 * This function is used before storing tokens in the TokenBlacklist table
 * to prevent exposure of valid tokens if the database is compromised.
 *
 * Technical details:
 * - Algorithm: SHA-256 (256-bit hash function)
 * - Output format: Hexadecimal string (64 characters)
 * - Deterministic: Same input always produces same output
 * - One-way function: Cannot reverse the hash to get the original token
 *
 * Security considerations:
 * - Tokens should be hashed immediately before storage
 * - Tokens should be hashed before lookup queries
 * - The original token should never be logged after hashing
 * - SHA-256 is sufficient because JWT tokens are already random (no rainbow tables)
 *
 * Performance:
 * - SHA-256 hashing is very fast (microseconds per operation)
 * - Negligible impact on authentication request latency
 * - Much faster than bcrypt (which is intentionally slow for passwords)
 *
 * @param {string} token - The full JWT token string to hash (format: header.payload.signature)
 * @returns {string} The SHA-256 hash as a hexadecimal string (64 characters)
 *
 * @example
 * const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
 * const hash = hashToken(token);
 * // hash = 'a3f5b8c9d2e1f4a7b6c5d8e9f2a1b4c7d6e9f8a1b2c3d4e5f6a7b8c9d0e1f2a3'
 *
 * @example
 * // Store token in blacklist
 * await TokenBlacklist.create({
 *   token: hashToken(refreshToken),
 *   userId: user.id,
 *   revocationReason: 'password_change'
 * });
 *
 * @example
 * // Check if token is blacklisted
 * const isBlacklisted = await TokenBlacklist.findOne({
 *   where: { token: hashToken(refreshToken) }
 * });
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Validates that a token hash matches the expected format.
 *
 * This function can be used to verify that a stored hash is valid
 * before performing database operations. Useful for data integrity checks.
 *
 * @param {string} hash - The hash string to validate
 * @returns {boolean} True if the hash is a valid SHA-256 hex string (64 chars)
 *
 * @example
 * const hash = hashToken(token);
 * if (isValidTokenHash(hash)) {
 *   // Proceed with database operation
 * }
 */
export const isValidTokenHash = (hash: string): boolean => {
  // SHA-256 produces exactly 64 hexadecimal characters
  return /^[a-f0-9]{64}$/i.test(hash);
};

/**
 * Compares a token against a stored hash for verification.
 *
 * This function hashes the provided token and compares it to the stored hash
 * using a timing-safe comparison to prevent timing attacks.
 *
 * Note: For most use cases, you should query the database with the hashed token
 * rather than retrieving and comparing hashes. This function is provided for
 * special cases where you need to verify a hash in memory.
 *
 * @param {string} token - The token to verify
 * @param {string} storedHash - The hash stored in the database
 * @returns {boolean} True if the token matches the stored hash
 *
 * @example
 * const storedHash = '...'; // Retrieved from database
 * if (verifyTokenHash(token, storedHash)) {
 *   console.log('Token matches stored hash');
 * }
 */
export const verifyTokenHash = (token: string, storedHash: string): boolean => {
  const tokenHash = hashToken(token);

  // Use timing-safe comparison to prevent timing attacks
  // This ensures comparison time is constant regardless of where strings differ
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash),
    Buffer.from(storedHash)
  );
};
