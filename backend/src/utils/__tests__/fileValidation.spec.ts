/**
 * File Validation Tests
 *
 * Comprehensive unit tests for the file validation utility module.
 * Tests cover all acceptance criteria:
 * - Format validation (accept .jpg, .jpeg, .png, .svg)
 * - Format rejection (.gif, .exe, .pdf, etc.)
 * - Case-insensitive extension checking
 * - File size validation
 * - MIME type validation and spoofing prevention
 * - Error handling and messages
 *
 * @module utils/__tests__/fileValidation.spec.ts
 */

import {
  validateImageFormat,
  validateFileSize,
  isSafeFile,
  ValidationError,
  validateFileWithErrorHandling,
  ALLOWED_FORMATS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
} from '../fileValidation';

/**
 * Helper function to create a realistic file buffer
 * Fills buffer with non-zero data to avoid triggering null byte checks
 */
const createFakeImageBuffer = (sizeInMB: number): Buffer => {
  // Round to handle decimal values like 3.5 MB
  const sizeInBytes = Math.floor(sizeInMB * 1024 * 1024);

  // Create buffer filled with 0xFF (common in JPEG/PNG headers)
  const buffer = Buffer.alloc(sizeInBytes, 0xFF);

  // Add some variation to make it more realistic (avoid null bytes!)
  for (let i = 0; i < Math.min(256, buffer.length); i++) {
    // Use values 1-255 to avoid null bytes
    buffer[i] = ((0xFF - i) % 255) + 1;
  }

  return buffer;
};

describe('fileValidation', () => {
  describe('validateImageFormat', () => {
    describe('should accept valid formats', () => {
      it('accepts .jpg with image/jpeg MIME type', () => {
        expect(() =>
          validateImageFormat('photo.jpg', 'image/jpeg')
        ).not.toThrow();
      });

      it('accepts .jpeg with image/jpeg MIME type', () => {
        expect(() =>
          validateImageFormat('photo.jpeg', 'image/jpeg')
        ).not.toThrow();
      });

      it('accepts .png with image/png MIME type', () => {
        expect(() =>
          validateImageFormat('photo.png', 'image/png')
        ).not.toThrow();
      });

      it('accepts .svg with image/svg+xml MIME type', () => {
        expect(() =>
          validateImageFormat('logo.svg', 'image/svg+xml')
        ).not.toThrow();
      });
    });

    describe('should be case-insensitive', () => {
      it('accepts uppercase .JPG extension', () => {
        expect(() =>
          validateImageFormat('photo.JPG', 'image/jpeg')
        ).not.toThrow();
      });

      it('accepts mixed case .Png extension', () => {
        expect(() =>
          validateImageFormat('photo.Png', 'image/png')
        ).not.toThrow();
      });

      it('accepts uppercase .JPEG extension', () => {
        expect(() =>
          validateImageFormat('photo.JPEG', 'image/jpeg')
        ).not.toThrow();
      });

      it('accepts uppercase .SVG extension', () => {
        expect(() =>
          validateImageFormat('logo.SVG', 'image/svg+xml')
        ).not.toThrow();
      });
    });

    describe('should reject invalid formats', () => {
      it('rejects .gif format', () => {
        expect(() =>
          validateImageFormat('animation.gif', 'image/gif')
        ).toThrow(ValidationError);
      });

      it('rejects .webp format', () => {
        expect(() =>
          validateImageFormat('photo.webp', 'image/webp')
        ).toThrow(ValidationError);
      });

      it('rejects .bmp format', () => {
        expect(() =>
          validateImageFormat('bitmap.bmp', 'image/bmp')
        ).toThrow(ValidationError);
      });

      it('rejects .exe format', () => {
        expect(() =>
          validateImageFormat('malware.exe', 'application/x-msdownload')
        ).toThrow(ValidationError);
      });

      it('rejects .pdf format', () => {
        expect(() =>
          validateImageFormat('document.pdf', 'application/pdf')
        ).toThrow(ValidationError);
      });

      it('rejects unknown format', () => {
        expect(() =>
          validateImageFormat('file.xyz', 'application/octet-stream')
        ).toThrow(ValidationError);
      });
    });

    describe('should prevent MIME type spoofing', () => {
      it('rejects .jpg with image/png MIME type', () => {
        expect(() =>
          validateImageFormat('photo.jpg', 'image/png')
        ).toThrow(ValidationError);
      });

      it('rejects .png with image/jpeg MIME type', () => {
        expect(() =>
          validateImageFormat('photo.png', 'image/jpeg')
        ).toThrow(ValidationError);
      });

      it('rejects .svg with image/jpeg MIME type', () => {
        expect(() =>
          validateImageFormat('logo.svg', 'image/jpeg')
        ).toThrow(ValidationError);
      });
    });

    describe('should handle edge cases', () => {
      it('rejects empty filename', () => {
        expect(() =>
          validateImageFormat('', 'image/jpeg')
        ).toThrow(ValidationError);
      });

      it('rejects whitespace-only filename', () => {
        expect(() =>
          validateImageFormat('   ', 'image/jpeg')
        ).toThrow(ValidationError);
      });

      it('rejects file without extension', () => {
        expect(() =>
          validateImageFormat('noextension', 'image/jpeg')
        ).toThrow(ValidationError);
      });

      it('handles filename with multiple dots', () => {
        expect(() =>
          validateImageFormat('photo.backup.jpg', 'image/jpeg')
        ).not.toThrow();
      });
    });

    describe('error messages', () => {
      it('provides clear error message for unsupported format', () => {
        expect(() => {
          validateImageFormat('animation.gif', 'image/gif');
        }).toThrow(/Unsupported file format/);
      });

      it('provides clear error message for MIME type mismatch', () => {
        expect(() => {
          validateImageFormat('photo.jpg', 'image/png');
        }).toThrow(/does not match MIME type/);
      });

      it('includes ValidationError code for format errors', () => {
        try {
          validateImageFormat('file.gif', 'image/gif');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).code).toBe('INVALID_FORMAT');
        }
      });
    });
  });

  describe('validateFileSize', () => {
    describe('should accept valid sizes', () => {
      it('accepts file of 5 MB', () => {
        const buffer = createFakeImageBuffer(5);
        expect(() => validateFileSize(buffer)).not.toThrow();
      });

      it('accepts file of exactly 10 MB (max size)', () => {
        const buffer = createFakeImageBuffer(10);
        expect(() => validateFileSize(buffer)).not.toThrow();
      });

      it('accepts small file of 1 KB', () => {
        const buffer = Buffer.from('x'.repeat(1024));
        expect(() => validateFileSize(buffer)).not.toThrow();
      });

      it('accepts custom max size parameter', () => {
        const buffer = createFakeImageBuffer(15); // 15 MB
        expect(() => validateFileSize(buffer, 20)).not.toThrow(); // Allow up to 20 MB
      });
    });

    describe('should reject large sizes', () => {
      it('rejects file of 15 MB', () => {
        const buffer = createFakeImageBuffer(15);
        expect(() => validateFileSize(buffer)).toThrow(ValidationError);
      });

      it('rejects file of 50 MB', () => {
        const buffer = createFakeImageBuffer(50);
        expect(() => validateFileSize(buffer)).toThrow(ValidationError);
      });

      it('rejects file exceeding custom max size', () => {
        const buffer = createFakeImageBuffer(15); // 15 MB
        expect(() => validateFileSize(buffer, 10)).toThrow(ValidationError); // Only allow 10 MB
      });
    });

    describe('error messages', () => {
      it('includes file size in error message', () => {
        const buffer = createFakeImageBuffer(15); // 15 MB
        expect(() => {
          validateFileSize(buffer);
        }).toThrow(/15\.00 MB/);
      });

      it('includes max size in error message', () => {
        const buffer = createFakeImageBuffer(15);
        expect(() => {
          validateFileSize(buffer);
        }).toThrow(/10 MB/);
      });

      it('includes error code FILE_TOO_LARGE', () => {
        const buffer = createFakeImageBuffer(15);
        try {
          validateFileSize(buffer);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).code).toBe('FILE_TOO_LARGE');
        }
      });
    });

    describe('edge cases', () => {
      it('rejects non-Buffer input', () => {
        expect(() => {
          // @ts-expect-error - Testing invalid input
          validateFileSize('not a buffer');
        }).toThrow(ValidationError);
      });

      it('rejects null', () => {
        expect(() => {
          // @ts-expect-error - Testing invalid input
          validateFileSize(null);
        }).toThrow(ValidationError);
      });

      it('rejects undefined', () => {
        expect(() => {
          // @ts-expect-error - Testing invalid input
          validateFileSize(undefined);
        }).toThrow(ValidationError);
      });
    });
  });

  describe('isSafeFile', () => {
    it('accepts valid JPEG file', () => {
      const buffer = createFakeImageBuffer(5);
      expect(() =>
        isSafeFile('photo.jpg', 'image/jpeg', buffer)
      ).not.toThrow();
    });

    it('accepts valid PNG file', () => {
      const buffer = createFakeImageBuffer(3);
      expect(() =>
        isSafeFile('photo.png', 'image/png', buffer)
      ).not.toThrow();
    });

    it('accepts valid SVG file', () => {
      const buffer = Buffer.from('x'.repeat(100 * 1024)); // 100 KB
      expect(() =>
        isSafeFile('logo.svg', 'image/svg+xml', buffer)
      ).not.toThrow();
    });

    it('rejects file with invalid format', () => {
      const buffer = createFakeImageBuffer(5);
      expect(() =>
        isSafeFile('animation.gif', 'image/gif', buffer)
      ).toThrow(ValidationError);
    });

    it('rejects file that is too large', () => {
      const buffer = createFakeImageBuffer(15); // 15 MB
      expect(() =>
        isSafeFile('photo.jpg', 'image/jpeg', buffer)
      ).toThrow(ValidationError);
    });

    it('rejects file with MIME type mismatch', () => {
      const buffer = createFakeImageBuffer(5);
      expect(() =>
        isSafeFile('photo.jpg', 'image/png', buffer)
      ).toThrow(ValidationError);
    });

    it('rejects file with null bytes', () => {
      const buffer = Buffer.concat([
        Buffer.from('fake image'),
        Buffer.from([0x00]), // Null byte
        Buffer.from('data'),
      ]);
      expect(() =>
        isSafeFile('photo.jpg', 'image/jpeg', buffer)
      ).toThrow(ValidationError);
    });

    it('respects custom max size parameter', () => {
      const buffer = createFakeImageBuffer(15); // 15 MB
      expect(() =>
        isSafeFile('photo.jpg', 'image/jpeg', buffer, 20) // Allow up to 20 MB
      ).not.toThrow();
    });
  });

  describe('validateFileWithErrorHandling', () => {
    it('returns valid true for safe file', () => {
      const buffer = createFakeImageBuffer(5);
      const result = validateFileWithErrorHandling('photo.jpg', 'image/jpeg', buffer);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns error object for invalid format', () => {
      const buffer = createFakeImageBuffer(5);
      const result = validateFileWithErrorHandling('file.gif', 'image/gif', buffer);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe('INVALID_FORMAT');
    });

    it('returns error object for oversized file', () => {
      const buffer = createFakeImageBuffer(15);
      const result = validateFileWithErrorHandling('photo.jpg', 'image/jpeg', buffer);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe('FILE_TOO_LARGE');
    });

    it('returns error object for MIME type mismatch', () => {
      const buffer = createFakeImageBuffer(5);
      const result = validateFileWithErrorHandling('photo.jpg', 'image/png', buffer);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe('MIME_TYPE_MISMATCH');
    });
  });

  describe('ValidationError class', () => {
    it('creates error with message and code', () => {
      const error = new ValidationError('Test message', 'TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('uses default code if not provided', () => {
      const error = new ValidationError('Test message');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('has proper error name', () => {
      const error = new ValidationError('Test message', 'TEST_CODE');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('Constants', () => {
    it('exports ALLOWED_FORMATS with correct values', () => {
      expect(ALLOWED_FORMATS).toContain('jpeg');
      expect(ALLOWED_FORMATS).toContain('jpg');
      expect(ALLOWED_FORMATS).toContain('png');
      expect(ALLOWED_FORMATS).toContain('svg');
      expect(ALLOWED_FORMATS).toHaveLength(4);
    });

    it('exports ALLOWED_MIME_TYPES with correct values', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES).toContain('image/png');
      expect(ALLOWED_MIME_TYPES).toContain('image/svg+xml');
      expect(ALLOWED_MIME_TYPES).toHaveLength(3);
    });

    it('exports MAX_FILE_SIZE_MB as 10', () => {
      expect(MAX_FILE_SIZE_MB).toBe(10);
    });

    it('calculates MAX_FILE_SIZE_BYTES correctly', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });
  });

  describe('Integration tests', () => {
    it('complete workflow: validate realistic JPEG upload', () => {
      const filename = 'vacation-photo.jpg';
      const mimeType = 'image/jpeg';
      const buffer = createFakeImageBuffer(3.5);

      expect(() => {
        isSafeFile(filename, mimeType, buffer);
      }).not.toThrow();
    });

    it('complete workflow: validate realistic PNG upload', () => {
      const filename = 'screenshot.png';
      const mimeType = 'image/png';
      const buffer = createFakeImageBuffer(2);

      expect(() => {
        isSafeFile(filename, mimeType, buffer);
      }).not.toThrow();
    });

    it('complete workflow: validate realistic SVG upload', () => {
      const filename = 'icon.svg';
      const mimeType = 'image/svg+xml';
      const buffer = Buffer.from('x'.repeat(50 * 1024)); // 50 KB

      expect(() => {
        isSafeFile(filename, mimeType, buffer);
      }).not.toThrow();
    });

    it('complete workflow: reject multiple issues', () => {
      const filename = 'malware.exe';
      const mimeType = 'application/x-msdownload';
      const buffer = createFakeImageBuffer(5);

      expect(() => {
        isSafeFile(filename, mimeType, buffer);
      }).toThrow(ValidationError);
    });
  });
});
