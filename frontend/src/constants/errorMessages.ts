/**
 * User-friendly error messages for US03 text editing
 * All messages should be actionable and help users understand what went wrong
 */

export const ERROR_MESSAGES = {
  // Network Errors
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  SAVE_FAILED: 'Failed to save your changes. We\'ll retry automatically.',
  SAVE_RETRY: 'Retrying save... ({attempt}/{maxAttempts})',
  LOAD_FAILED: 'Failed to load page content. Please refresh and try again.',

  // Validation Errors
  TEXT_EMPTY: 'Text content cannot be empty. Please enter some text.',
  TEXT_TOO_LONG: 'Text exceeds the 1000 character limit. Please shorten your text.',
  FONT_SIZE_INVALID: 'Font size must be between 8 and 200 pixels.',
  COLOR_INVALID: 'Please enter a valid color in HEX format (e.g., #FF5733).',

  // API Errors
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You don\'t have permission to edit this page.',
  PAGE_NOT_FOUND: 'This page doesn\'t exist or has been deleted.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again in a few moments.',
  RATE_LIMIT: 'Too many requests. Please wait a moment before trying again.',

  // Canvas Errors
  CANVAS_INIT_FAILED: 'Unable to initialize the editor. Please refresh the page.',
  FONT_LOAD_FAILED: 'Failed to load font "{fontName}". Using default font instead.',
  ELEMENT_NOT_FOUND: 'The selected element no longer exists.',

  // Library Errors
  LIBRARY_LOAD_FAILED: 'Failed to load your text library. Please try again.',
  LIBRARY_SAVE_FAILED: 'Failed to save text to library. Please try again.',
  LIBRARY_DELETE_FAILED: 'Failed to delete text from library. Please try again.',
  LIBRARY_FULL: 'You\'ve reached the maximum number of saved texts (100).',

  // Offline Mode
  OFFLINE_MODE: 'You\'re currently offline. Changes will be saved locally and synced when you\'re back online.',
  OFFLINE_SAVE: 'Changes saved locally. Will sync when connection is restored.',
  SYNC_FAILED: 'Failed to sync offline changes. Please try again.',

  // General
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

/**
 * Get user-friendly error message with optional interpolation
 *
 * @param key - The error message key
 * @param params - Optional parameters for string interpolation (e.g., {fontName: 'Arial'})
 * @returns The formatted error message
 *
 * @example
 * getErrorMessage('FONT_LOAD_FAILED', { fontName: 'Arial' })
 * // Returns: "Failed to load font "Arial". Using default font instead."
 */
export function getErrorMessage(
  key: ErrorMessageKey,
  params?: Record<string, string | number>
): string {
  let message: string = ERROR_MESSAGES[key];

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      message = message.replace(`{${paramKey}}`, String(value));
    });
  }

  return message;
}

/**
 * Map HTTP status codes to user-friendly error messages
 *
 * @param status - HTTP status code
 * @returns User-friendly error message
 *
 * @example
 * getErrorMessageFromStatus(401) // Returns: "Your session has expired..."
 * getErrorMessageFromStatus(404) // Returns: "This page doesn't exist..."
 */
export function getErrorMessageFromStatus(status: number): string {
  switch (status) {
    case 400:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
    case 401:
      return ERROR_MESSAGES.SESSION_EXPIRED;
    case 403:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case 404:
      return ERROR_MESSAGES.PAGE_NOT_FOUND;
    case 429:
      return ERROR_MESSAGES.RATE_LIMIT;
    case 500:
    case 502:
    case 503:
      return ERROR_MESSAGES.SERVER_ERROR;
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
}

/**
 * Error types for categorization
 * Used to determine error handling strategy and UI presentation
 */
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  API = 'api',
  CANVAS = 'canvas',
  LIBRARY = 'library',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown'
}

/**
 * Structured error object for consistent error handling
 */
export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  retry?: boolean;
  details?: any;
}
