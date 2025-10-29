/**
 * Unit Tests for Validation Schemas
 * Tests all Joi validation schemas for request validation
 * Coverage target: All validation rules tested
 */

import {
  registerSchema,
  loginSchema,
  createPageSchema,
  updatePageSchema,
  createSavedTextSchema,
  updateSavedTextSchema,
  batchElementsSchema,
  updateElementSchema,
} from '../validation';

describe('Validation Schemas', () => {
  // ============================================================================
  // REGISTRATION SCHEMA
  // ============================================================================

  describe('registerSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      firstName: 'John',
      lastName: 'Doe',
      pseudo: 'johndoe',
    };

    it('should validate correct registration data', () => {
      const { error, value } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value).toHaveProperty('email');
      expect(value).toHaveProperty('password');
    });

    it('should reject invalid email format', () => {
      const { error } = registerSchema.validate({
        ...validData,
        email: 'invalid-email',
      });
      expect(error).toBeDefined();
    });

    it('should reject short password', () => {
      const { error } = registerSchema.validate({
        ...validData,
        password: 'Short1',
      });
      expect(error).toBeDefined();
    });

    it('should reject password without uppercase', () => {
      const { error } = registerSchema.validate({
        ...validData,
        password: 'lowercase123',
      });
      expect(error).toBeDefined();
    });

    it('should reject password without lowercase', () => {
      const { error } = registerSchema.validate({
        ...validData,
        password: 'UPPERCASE123',
      });
      expect(error).toBeDefined();
    });

    it('should reject password without number', () => {
      const { error } = registerSchema.validate({
        ...validData,
        password: 'NoNumbers',
      });
      expect(error).toBeDefined();
    });

    it('should reject short firstName', () => {
      const { error } = registerSchema.validate({
        ...validData,
        firstName: 'A',
      });
      expect(error).toBeDefined();
    });

    it('should reject long firstName', () => {
      const { error } = registerSchema.validate({
        ...validData,
        firstName: 'A'.repeat(101),
      });
      expect(error).toBeDefined();
    });

    it('should reject missing required fields', () => {
      const { error: emailError } = registerSchema.validate({
        ...validData,
        email: undefined,
      });
      expect(emailError).toBeDefined();

      const { error: passwordError } = registerSchema.validate({
        ...validData,
        password: undefined,
      });
      expect(passwordError).toBeDefined();
    });

    it('should allow optional pseudo field', () => {
      const { error, value } = registerSchema.validate({
        email: 'test@example.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        // pseudo omitted
      });
      expect(error).toBeUndefined();
      expect(value).toHaveProperty('email');
    });

    it('should trim whitespace from email', () => {
      const { value } = registerSchema.validate({
        ...validData,
        email: '  test@example.com  ',
      });
      expect(value.email).toBe('test@example.com');
    });

    it('should lowercase email', () => {
      const { value } = registerSchema.validate({
        ...validData,
        email: 'TEST@EXAMPLE.COM',
      });
      expect(value.email).toBe('test@example.com');
    });
  });

  // ============================================================================
  // LOGIN SCHEMA
  // ============================================================================

  describe('loginSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'SecurePass123',
    };

    it('should validate correct login data', () => {
      const { error } = loginSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const { error } = loginSchema.validate({
        ...validData,
        email: 'not-an-email',
      });
      expect(error).toBeDefined();
    });

    it('should reject missing email', () => {
      const { error } = loginSchema.validate({
        password: 'SecurePass123',
      });
      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const { error } = loginSchema.validate({
        email: 'test@example.com',
      });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // PAGE SCHEMAS
  // ============================================================================

  describe('createPageSchema', () => {
    it('should validate correct page creation data', () => {
      const { error } = createPageSchema.validate({
        pageNumber: 1,
        isCustomCover: false,
      });
      expect(error).toBeUndefined();
    });

    it('should require pageNumber', () => {
      const { error } = createPageSchema.validate({
        isCustomCover: false,
      });
      expect(error).toBeDefined();
    });

    it('should allow optional isCustomCover', () => {
      const { error } = createPageSchema.validate({
        pageNumber: 5,
      });
      expect(error).toBeUndefined();
    });

    it('should default isCustomCover to false', () => {
      const { value } = createPageSchema.validate({
        pageNumber: 1,
      });
      expect(value.isCustomCover).toBe(false);
    });
  });

  describe('updatePageSchema', () => {
    it('should validate page update data', () => {
      const { error } = updatePageSchema.validate({
        pageNumber: 5,
        isCustomCover: true,
      });
      expect(error).toBeUndefined();
    });

    it('should allow partial updates', () => {
      const { error } = updatePageSchema.validate({
        pageNumber: 5,
      });
      expect(error).toBeUndefined();
    });

    it('should allow empty updates', () => {
      const { error } = updatePageSchema.validate({});
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // SAVED TEXT SCHEMAS
  // ============================================================================

  describe('createSavedTextSchema', () => {
    const validData = {
      label: 'Chapter Title',
      content: 'Chapter content here',
      fontSize: 32,
      fontFamily: 'Georgia',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000',
      textAlign: 'center',
      lineHeight: 1.5,
    };

    it('should validate correct saved text data', () => {
      const { error } = createSavedTextSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject empty label', () => {
      const { error } = createSavedTextSchema.validate({
        ...validData,
        label: '',
      });
      expect(error).toBeDefined();
    });

    it('should reject label > 100 chars', () => {
      const { error } = createSavedTextSchema.validate({
        ...validData,
        label: 'A'.repeat(101),
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid font size', () => {
      const { error: tooSmall } = createSavedTextSchema.validate({
        ...validData,
        fontSize: 5,
      });
      expect(tooSmall).toBeDefined();

      const { error: tooLarge } = createSavedTextSchema.validate({
        ...validData,
        fontSize: 300,
      });
      expect(tooLarge).toBeDefined();
    });

    it('should reject invalid font weight', () => {
      const { error } = createSavedTextSchema.validate({
        ...validData,
        fontWeight: 'invalid',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid font style', () => {
      const { error } = createSavedTextSchema.validate({
        ...validData,
        fontStyle: 'oblique',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid text decoration', () => {
      const { error } = createSavedTextSchema.validate({
        ...validData,
        textDecoration: 'blink',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid color format', () => {
      const { error: invalidHex } = createSavedTextSchema.validate({
        ...validData,
        color: 'not-a-color',
      });
      expect(invalidHex).toBeDefined();

      const { error: shortHex } = createSavedTextSchema.validate({
        ...validData,
        color: '#FF', // Too short
      });
      expect(shortHex).toBeDefined();
    });

    it('should accept valid hex colors', () => {
      const { error: fullHex } = createSavedTextSchema.validate({
        ...validData,
        color: '#FF0000',
      });
      expect(fullHex).toBeUndefined();

      const { error: shortHex } = createSavedTextSchema.validate({
        ...validData,
        color: '#F0F',
      });
      expect(shortHex).toBeUndefined();
    });

    it('should reject invalid text alignment', () => {
      const { error } = createSavedTextSchema.validate({
        ...validData,
        textAlign: 'justified',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid line height', () => {
      const { error: tooSmall } = createSavedTextSchema.validate({
        ...validData,
        lineHeight: 0.5,
      });
      expect(tooSmall).toBeDefined();

      const { error: tooLarge } = createSavedTextSchema.validate({
        ...validData,
        lineHeight: 4,
      });
      expect(tooLarge).toBeDefined();
    });

    it('should allow optional type field', () => {
      const { error } = createSavedTextSchema.validate({
        ...validData,
        // type omitted
      });
      expect(error).toBeUndefined();
    });
  });

  describe('updateSavedTextSchema', () => {
    it('should allow partial updates', () => {
      const { error } = updateSavedTextSchema.validate({
        fontSize: 40,
        color: '#FF0000',
      });
      expect(error).toBeUndefined();
    });

    it('should allow empty updates', () => {
      const { error } = updateSavedTextSchema.validate({});
      expect(error).toBeUndefined();
    });

    it('should validate individual fields', () => {
      const { error } = updateSavedTextSchema.validate({
        fontSize: 300, // Invalid
      });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // ELEMENT SCHEMAS
  // ============================================================================

  describe('batchElementsSchema', () => {
    const validElement = {
      type: 'text',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      content: { text: 'Hello' },
      zIndex: 0,
    };

    it('should validate array of elements', () => {
      const { error } = batchElementsSchema.validate([validElement]);
      expect(error).toBeUndefined();
    });

    it('should validate mixed create/update operations', () => {
      const { error } = batchElementsSchema.validate([
        validElement,
        {
          id: 'element-uuid',
          x: 50,
          content: { text: 'Updated' },
        },
      ]);
      expect(error).toBeUndefined();
    });

    it('should require array', () => {
      const { error } = batchElementsSchema.validate(validElement);
      expect(error).toBeDefined();
    });

    it('should reject element without required create fields', () => {
      const { error } = batchElementsSchema.validate([
        {
          type: 'text',
          // Missing x, y, width, height, content
        },
      ]);
      expect(error).toBeDefined();
    });

    it('should allow elements with id for updates', () => {
      const { error } = batchElementsSchema.validate([
        {
          id: 'element-id',
          x: 100, // Only updating position
        },
      ]);
      expect(error).toBeUndefined();
    });
  });

  describe('updateElementSchema', () => {
    it('should validate element update', () => {
      const { error } = updateElementSchema.validate({
        x: 50,
        y: 50,
        width: 150,
        height: 75,
      });
      expect(error).toBeUndefined();
    });

    it('should allow partial updates', () => {
      const { error } = updateElementSchema.validate({
        x: 100,
      });
      expect(error).toBeUndefined();
    });

    it('should allow empty updates', () => {
      const { error } = updateElementSchema.validate({});
      expect(error).toBeUndefined();
    });

    it('should validate numeric fields', () => {
      const { error } = updateElementSchema.validate({
        x: 'not-a-number',
      });
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases & Security', () => {
    it('should handle very long strings gracefully', () => {
      const { error } = registerSchema.validate({
        email: 'test@example.com',
        password: 'SecurePass123',
        firstName: 'A'.repeat(1000),
        lastName: 'Doe',
      });
      expect(error).toBeDefined();
    });

    it('should handle null values', () => {
      const { error } = registerSchema.validate({
        email: null,
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(error).toBeDefined();
    });

    it('should handle undefined values', () => {
      const { error } = registerSchema.validate({
        email: undefined,
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(error).toBeDefined();
    });

    it('should handle special characters in strings', () => {
      const { error, value } = registerSchema.validate({
        email: 'test+alias@example.com',
        password: 'SecurePass123',
        firstName: 'José',
        lastName: "O'Brien",
      });
      expect(error).toBeUndefined();
      expect(value.firstName).toBe('José');
    });

    it('should handle unicode characters', () => {
      const { error, value } = createSavedTextSchema.validate({
        label: '章节标题',
        content: 'Содержание',
        fontSize: 32,
        fontFamily: 'Georgia',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        textAlign: 'left',
        lineHeight: 1.5,
      });
      expect(error).toBeUndefined();
      expect(value.label).toBe('章节标题');
    });
  });
});
