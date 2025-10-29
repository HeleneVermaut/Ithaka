/**
 * Audit Logger Utility
 *
 * This module provides centralized audit logging for security-critical events.
 * It tracks important security events like logins, password changes, and data access
 * for compliance purposes (GDPR Article 32).
 *
 * Logged Events:
 * - LOGIN_SUCCESS - User successfully logged in
 * - LOGIN_FAILURE - Failed login attempt
 * - PASSWORD_CHANGE - User changed their password
 * - ACCOUNT_DELETION - User deleted their account
 * - DATA_EXPORT - User exported their data
 * - TOKEN_REFRESH - Token was refreshed
 * - PROFILE_UPDATE - User profile was updated
 *
 * Each event includes:
 * - Event type and timestamp
 * - User identification (userId, email)
 * - Request context (IP address, user agent)
 * - Result and any relevant metadata
 *
 * @module utils/auditLogger
 */

import { logger } from './logger';

/**
 * Security event types that are audited
 */
export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'PASSWORD_CHANGE'
  | 'ACCOUNT_DELETION'
  | 'DATA_EXPORT'
  | 'TOKEN_REFRESH'
  | 'PROFILE_UPDATE';

/**
 * Structure of an audit log entry
 */
export interface AuditLogEntry {
  /** Type of security event */
  eventType: AuditEventType;

  /** Unique user identifier */
  userId?: string;

  /** User's email address */
  email?: string;

  /** Client IP address */
  ip?: string;

  /** Client user agent string */
  userAgent?: string;

  /** Timestamp when event occurred */
  timestamp: Date;

  /** Status of the operation (success, failure) */
  status: 'success' | 'failure';

  /** Human-readable message */
  message: string;

  /** Additional metadata specific to the event */
  metadata?: Record<string, unknown>;
}

/**
 * AuditLogger class for structured security event logging
 */
export class AuditLogger {
  /**
   * Log a security event
   *
   * @param {AuditEventType} eventType - Type of security event
   * @param {AuditLogEntry} entry - Complete audit log entry
   */
  static logEvent(eventType: AuditEventType, entry: Partial<AuditLogEntry>): void {
    const auditEntry: AuditLogEntry = {
      eventType,
      timestamp: new Date(),
      status: 'success',
      message: '',
      ...entry,
    };

    // Determine log level based on event type
    let logLevel = 'info';
    if (eventType === 'LOGIN_FAILURE' || eventType === 'ACCOUNT_DELETION') {
      logLevel = 'warn';
    }

    // Format audit log with sensitive data handling
    const sanitizedEntry = this.sanitizeForLogging(auditEntry);

    if (logLevel === 'warn') {
      logger.warn(`AUDIT: ${eventType}`, sanitizedEntry);
    } else {
      logger.info(`AUDIT: ${eventType}`, sanitizedEntry);
    }

    // In production, you would also store this in a database or audit log system
    // This could be done via a separate audit log table or external service
  }

  /**
   * Log successful login
   *
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} ip - Client IP address
   * @param {string} userAgent - Client user agent
   */
  static logLoginSuccess(
    userId: string,
    email: string,
    ip?: string,
    userAgent?: string
  ): void {
    this.logEvent('LOGIN_SUCCESS', {
      userId,
      email,
      ip,
      userAgent,
      status: 'success',
      message: `User ${email} logged in successfully`,
    });
  }

  /**
   * Log failed login attempt
   *
   * @param {string} email - Email that attempted login
   * @param {string} reason - Reason for failure (invalid credentials, user not found, etc.)
   * @param {string} ip - Client IP address
   * @param {string} userAgent - Client user agent
   */
  static logLoginFailure(
    email: string,
    reason: string = 'Invalid credentials',
    ip?: string,
    userAgent?: string
  ): void {
    this.logEvent('LOGIN_FAILURE', {
      email,
      ip,
      userAgent,
      status: 'failure',
      message: `Failed login attempt for ${email}: ${reason}`,
      metadata: { reason },
    });
  }

  /**
   * Log password change
   *
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} ip - Client IP address
   * @param {string} userAgent - Client user agent
   */
  static logPasswordChange(
    userId: string,
    email: string,
    ip?: string,
    userAgent?: string
  ): void {
    this.logEvent('PASSWORD_CHANGE', {
      userId,
      email,
      ip,
      userAgent,
      status: 'success',
      message: `User ${email} changed their password`,
    });
  }

  /**
   * Log account deletion
   *
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} ip - Client IP address
   * @param {string} userAgent - Client user agent
   */
  static logAccountDeletion(
    userId: string,
    email: string,
    ip?: string,
    userAgent?: string
  ): void {
    this.logEvent('ACCOUNT_DELETION', {
      userId,
      email,
      ip,
      userAgent,
      status: 'success',
      message: `User ${email} (ID: ${userId}) deleted their account`,
    });
  }

  /**
   * Log data export request
   *
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} format - Export format (json, csv, pdf, etc.)
   * @param {string} ip - Client IP address
   * @param {string} userAgent - Client user agent
   */
  static logDataExport(
    userId: string,
    email: string,
    format: string = 'json',
    ip?: string,
    userAgent?: string
  ): void {
    this.logEvent('DATA_EXPORT', {
      userId,
      email,
      ip,
      userAgent,
      status: 'success',
      message: `User ${email} exported their data in ${format} format`,
      metadata: { format },
    });
  }

  /**
   * Log token refresh
   *
   * @param {string} userId - User ID
   * @param {string} ip - Client IP address
   * @param {string} userAgent - Client user agent
   */
  static logTokenRefresh(
    userId: string,
    ip?: string,
    userAgent?: string
  ): void {
    this.logEvent('TOKEN_REFRESH', {
      userId,
      ip,
      userAgent,
      status: 'success',
      message: `Token refreshed for user ${userId}`,
    });
  }

  /**
   * Log profile update
   *
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string[]} updatedFields - List of fields that were updated
   * @param {string} ip - Client IP address
   * @param {string} userAgent - Client user agent
   */
  static logProfileUpdate(
    userId: string,
    email: string,
    updatedFields: string[] = [],
    ip?: string,
    userAgent?: string
  ): void {
    this.logEvent('PROFILE_UPDATE', {
      userId,
      email,
      ip,
      userAgent,
      status: 'success',
      message: `User ${email} updated profile fields: ${updatedFields.join(', ')}`,
      metadata: { updatedFields },
    });
  }

  /**
   * Sanitize audit log entry for safe logging
   * Removes sensitive data and formats for readability
   *
   * @private
   * @param {AuditLogEntry} entry - Audit log entry
   * @returns {Record<string, unknown>} Sanitized entry
   */
  private static sanitizeForLogging(entry: AuditLogEntry): Record<string, unknown> {
    return {
      eventType: entry.eventType,
      userId: entry.userId,
      email: entry.email,
      status: entry.status,
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      // IP and UserAgent are included for security audits but can be truncated in logs if needed
      ip: entry.ip ? this.truncateIp(entry.ip) : undefined,
      userAgent: entry.userAgent ? this.truncateUserAgent(entry.userAgent) : undefined,
      metadata: entry.metadata,
    };
  }

  /**
   * Truncate IP address for privacy (last octet anonymized)
   *
   * @private
   * @param {string} ip - IP address
   * @returns {string} Truncated IP
   */
  private static truncateIp(ip: string): string {
    if (ip.includes(':')) {
      // IPv6
      return ip.substring(0, ip.lastIndexOf(':') + 1) + 'xxxx';
    }
    // IPv4
    return ip.substring(0, ip.lastIndexOf('.') + 1) + 'xxx';
  }

  /**
   * Truncate user agent for readability
   *
   * @private
   * @param {string} userAgent - User agent string
   * @returns {string} Truncated user agent
   */
  private static truncateUserAgent(userAgent: string): string {
    // Extract browser and OS info, limit length
    return userAgent.substring(0, 100);
  }
}

export default AuditLogger;
