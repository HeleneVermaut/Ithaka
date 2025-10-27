/**
 * Logger utility for the application
 *
 * This module provides a simple logging system with multiple log levels.
 * It helps developers track application behavior and debug issues.
 *
 * Log levels:
 * - debug: Detailed information for diagnosing problems
 * - info: General informational messages about application flow
 * - warn: Warning messages about potential issues
 * - error: Error messages when something goes wrong
 *
 * @example
 * logger.info('Server started successfully');
 * logger.error('Database connection failed', error);
 */

/**
 * Log level type definition
 * Used to enforce type safety when calling logger methods
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * ANSI color codes for console output
 * Makes logs easier to read by color-coding different log levels
 */
const colors = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
} as const;

/**
 * Logger class that provides structured logging functionality
 * All methods are static, so you don't need to instantiate the class
 */
class Logger {
  /**
   * Get the current log level from environment variables
   * Defaults to 'info' if not set
   *
   * @returns {LogLevel} The current log level
   */
  private static getLogLevel(): LogLevel {
    const level = process.env['LOG_LEVEL']?.toLowerCase();
    if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
      return level;
    }
    return 'info';
  }

  /**
   * Check if a message should be logged based on the current log level
   *
   * Log level hierarchy: debug < info < warn < error
   * If LOG_LEVEL is 'warn', only 'warn' and 'error' messages will be logged
   *
   * @param {LogLevel} messageLevel - The level of the message to log
   * @returns {boolean} True if the message should be logged
   */
  private static shouldLog(messageLevel: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.getLogLevel());
    const messageLevelIndex = levels.indexOf(messageLevel);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format and output a log message
   *
   * @param {LogLevel} level - The severity level of the log
   * @param {string} message - The main log message
   * @param {any} data - Optional additional data to log (objects, errors, etc.)
   */
  private static log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const color = colors[level];
    const levelUpperCase = level.toUpperCase().padEnd(5);

    // Format: [2024-01-27T10:30:45.123Z] INFO  Message here
    console.log(`${color}[${timestamp}] ${levelUpperCase}${colors.reset} ${message}`);

    // If additional data is provided, log it on a separate line
    if (data !== undefined) {
      if (data instanceof Error) {
        // For errors, log the stack trace
        console.log(`${color}${data.stack}${colors.reset}`);
      } else {
        // For objects, pretty-print them
        console.log(`${color}${JSON.stringify(data, null, 2)}${colors.reset}`);
      }
    }
  }

  /**
   * Log a debug message
   * Use for detailed diagnostic information during development
   *
   * @param {string} message - The debug message
   * @param {any} data - Optional additional data to log
   * @example
   * logger.debug('User query params', { userId: 123, filter: 'active' });
   */
  public static debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Log an info message
   * Use for general application flow information
   *
   * @param {string} message - The info message
   * @param {any} data - Optional additional data to log
   * @example
   * logger.info('Server started on port 3000');
   */
  public static info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log a warning message
   * Use for potentially problematic situations that don't stop execution
   *
   * @param {string} message - The warning message
   * @param {any} data - Optional additional data to log
   * @example
   * logger.warn('API rate limit approaching', { requestCount: 95, limit: 100 });
   */
  public static warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log an error message
   * Use when something goes wrong that needs attention
   *
   * @param {string} message - The error message
   * @param {any} data - Optional error object or additional data
   * @example
   * logger.error('Database connection failed', error);
   */
  public static error(message: string, data?: any): void {
    this.log('error', message, data);
  }
}

// Export a singleton instance for convenient usage
export const logger = Logger;
