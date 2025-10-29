/**
 * Unit tests for error message utilities
 */

import { describe, it, expect } from 'vitest'
import {
  ERROR_MESSAGES,
  getErrorMessage,
  getErrorMessageFromStatus,
  ErrorType
} from '../errorMessages'

describe('errorMessages', () => {
  describe('ERROR_MESSAGES', () => {
    it('should have network error messages', () => {
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBeDefined()
      expect(ERROR_MESSAGES.SAVE_FAILED).toBeDefined()
      expect(ERROR_MESSAGES.LOAD_FAILED).toBeDefined()
    })

    it('should have validation error messages', () => {
      expect(ERROR_MESSAGES.TEXT_EMPTY).toBeDefined()
      expect(ERROR_MESSAGES.TEXT_TOO_LONG).toBeDefined()
      expect(ERROR_MESSAGES.FONT_SIZE_INVALID).toBeDefined()
      expect(ERROR_MESSAGES.COLOR_INVALID).toBeDefined()
    })

    it('should have API error messages', () => {
      expect(ERROR_MESSAGES.SESSION_EXPIRED).toBeDefined()
      expect(ERROR_MESSAGES.UNAUTHORIZED).toBeDefined()
      expect(ERROR_MESSAGES.PAGE_NOT_FOUND).toBeDefined()
      expect(ERROR_MESSAGES.SERVER_ERROR).toBeDefined()
    })

    it('should have canvas error messages', () => {
      expect(ERROR_MESSAGES.CANVAS_INIT_FAILED).toBeDefined()
      expect(ERROR_MESSAGES.FONT_LOAD_FAILED).toBeDefined()
      expect(ERROR_MESSAGES.ELEMENT_NOT_FOUND).toBeDefined()
    })

    it('should have library error messages', () => {
      expect(ERROR_MESSAGES.LIBRARY_LOAD_FAILED).toBeDefined()
      expect(ERROR_MESSAGES.LIBRARY_SAVE_FAILED).toBeDefined()
      expect(ERROR_MESSAGES.LIBRARY_DELETE_FAILED).toBeDefined()
    })

    it('should have general error message', () => {
      expect(ERROR_MESSAGES.UNKNOWN_ERROR).toBeDefined()
    })
  })

  describe('getErrorMessage', () => {
    it('should return error message without interpolation', () => {
      const message = getErrorMessage('TEXT_EMPTY')
      expect(message).toBe('Text content cannot be empty. Please enter some text.')
    })

    it('should interpolate parameters in message', () => {
      const message = getErrorMessage('SAVE_RETRY', { attempt: '2', maxAttempts: '3' })
      expect(message).toContain('2')
      expect(message).toContain('3')
    })

    it('should handle font name interpolation', () => {
      const message = getErrorMessage('FONT_LOAD_FAILED', { fontName: 'Arial' })
      expect(message).toContain('Arial')
    })

    it('should return message unchanged if no params provided', () => {
      const message = getErrorMessage('NETWORK_ERROR')
      expect(message).toBe(ERROR_MESSAGES.NETWORK_ERROR)
    })
  })

  describe('getErrorMessageFromStatus', () => {
    it('should return SESSION_EXPIRED for 401', () => {
      const message = getErrorMessageFromStatus(401)
      expect(message).toBe(ERROR_MESSAGES.SESSION_EXPIRED)
    })

    it('should return UNAUTHORIZED for 403', () => {
      const message = getErrorMessageFromStatus(403)
      expect(message).toBe(ERROR_MESSAGES.UNAUTHORIZED)
    })

    it('should return PAGE_NOT_FOUND for 404', () => {
      const message = getErrorMessageFromStatus(404)
      expect(message).toBe(ERROR_MESSAGES.PAGE_NOT_FOUND)
    })

    it('should return RATE_LIMIT for 429', () => {
      const message = getErrorMessageFromStatus(429)
      expect(message).toBe(ERROR_MESSAGES.RATE_LIMIT)
    })

    it('should return SERVER_ERROR for 500', () => {
      const message = getErrorMessageFromStatus(500)
      expect(message).toBe(ERROR_MESSAGES.SERVER_ERROR)
    })

    it('should return SERVER_ERROR for 502', () => {
      const message = getErrorMessageFromStatus(502)
      expect(message).toBe(ERROR_MESSAGES.SERVER_ERROR)
    })

    it('should return SERVER_ERROR for 503', () => {
      const message = getErrorMessageFromStatus(503)
      expect(message).toBe(ERROR_MESSAGES.SERVER_ERROR)
    })

    it('should return UNKNOWN_ERROR for unhandled status codes', () => {
      const message = getErrorMessageFromStatus(418) // I'm a teapot
      expect(message).toBe(ERROR_MESSAGES.UNKNOWN_ERROR)
    })
  })

  describe('ErrorType enum', () => {
    it('should have all error types defined', () => {
      expect(ErrorType.NETWORK).toBe('network')
      expect(ErrorType.VALIDATION).toBe('validation')
      expect(ErrorType.API).toBe('api')
      expect(ErrorType.CANVAS).toBe('canvas')
      expect(ErrorType.LIBRARY).toBe('library')
      expect(ErrorType.OFFLINE).toBe('offline')
      expect(ErrorType.UNKNOWN).toBe('unknown')
    })
  })

  describe('message quality', () => {
    it('should have actionable messages (tell user what to do)', () => {
      // Check that messages provide guidance
      expect(ERROR_MESSAGES.NETWORK_ERROR).toContain('check')
      expect(ERROR_MESSAGES.TEXT_EMPTY).toContain('enter')
      expect(ERROR_MESSAGES.SESSION_EXPIRED).toContain('log in')
      expect(ERROR_MESSAGES.LOAD_FAILED).toContain('refresh')
    })

    it('should have user-friendly language (no technical jargon)', () => {
      // Messages should avoid terms like "null", "undefined", "exception"
      Object.values(ERROR_MESSAGES).forEach(message => {
        expect(message.toLowerCase()).not.toContain('null')
        expect(message.toLowerCase()).not.toContain('undefined')
        expect(message.toLowerCase()).not.toContain('exception')
      })
    })

    it('should be concise (not too long)', () => {
      // Most error messages should be under 120 characters for good UX
      Object.values(ERROR_MESSAGES).forEach(message => {
        expect(message.length).toBeLessThan(150)
      })
    })
  })
})
