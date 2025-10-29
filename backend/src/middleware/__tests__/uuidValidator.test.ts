/**
 * UUID Validator Middleware Tests
 *
 * This test suite verifies the UUID validation middleware correctly:
 * - Validates UUID v1-v5 formats
 * - Rejects invalid UUID formats
 * - Returns appropriate error messages
 * - Handles missing parameters
 * - Calls next() when validation passes
 */

import { Request, Response, NextFunction } from 'express';
import {
  validateUUID,
  validateId,
  validateNotebookId,
  validatePageId,
  validateElementId,
} from '../uuidValidator';

describe('UUID Validator Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks before each test
    mockRequest = {
      params: {},
      path: '/test',
      method: 'GET',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('validateUUID factory function', () => {
    it('should accept valid UUID v4', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { id: validUUID };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should accept valid UUID v1', () => {
      const validUUIDv1 = '550e8400-e29b-11d4-a716-446655440000';
      mockRequest.params = { id: validUUIDv1 };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should accept valid UUID v5', () => {
      const validUUIDv5 = '74738ff5-5367-5958-9aee-98fffdcd1876';
      mockRequest.params = { id: validUUIDv5 };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should accept UUID with uppercase letters', () => {
      const uppercaseUUID = '123E4567-E89B-12D3-A456-426614174000';
      mockRequest.params = { id: uppercaseUUID };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid UUID format - missing dashes', () => {
      const invalidUUID = '123e4567e89b12d3a456426614174000';
      mockRequest.params = { id: invalidUUID };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        statusCode: 400,
        message: 'Invalid UUID format for parameter: id',
        detail: 'Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      });
    });

    it('should reject invalid UUID format - wrong length', () => {
      const invalidUUID = '123e4567-e89b-12d3-a456-42661417400';
      mockRequest.params = { id: invalidUUID };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid UUID format - invalid characters', () => {
      const invalidUUID = '123e4567-e89b-12d3-a456-42661417400g';
      mockRequest.params = { id: invalidUUID };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject non-UUID string', () => {
      const invalidUUID = 'not-a-uuid';
      mockRequest.params = { id: invalidUUID };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject empty string', () => {
      mockRequest.params = { id: '' };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle missing parameter', () => {
      mockRequest.params = {}; // No id parameter

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        statusCode: 400,
        message: 'Missing required parameter: id',
      });
    });

    it('should validate custom parameter name', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.params = { customParam: validUUID };

      const middleware = validateUUID('customParam');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid custom parameter', () => {
      const invalidUUID = 'invalid';
      mockRequest.params = { customParam: invalidUUID };

      const middleware = validateUUID('customParam');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid UUID format for parameter: customParam',
        })
      );
    });
  });

  describe('Convenience validators', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    const invalidUUID = 'invalid-uuid';

    it('validateId should validate id parameter', () => {
      mockRequest.params = { id: validUUID };
      validateId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('validateId should reject invalid id', () => {
      mockRequest.params = { id: invalidUUID };
      validateId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('validateNotebookId should validate notebookId parameter', () => {
      mockRequest.params = { notebookId: validUUID };
      validateNotebookId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('validateNotebookId should reject invalid notebookId', () => {
      mockRequest.params = { notebookId: invalidUUID };
      validateNotebookId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('validatePageId should validate pageId parameter', () => {
      mockRequest.params = { pageId: validUUID };
      validatePageId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('validatePageId should reject invalid pageId', () => {
      mockRequest.params = { pageId: invalidUUID };
      validatePageId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('validateElementId should validate elementId parameter', () => {
      mockRequest.params = { elementId: validUUID };
      validateElementId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('validateElementId should reject invalid elementId', () => {
      mockRequest.params = { elementId: invalidUUID };
      validateElementId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined params object', () => {
      mockRequest.params = undefined as any;

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle null parameter value', () => {
      mockRequest.params = { id: null as any };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle number as parameter (type coercion)', () => {
      mockRequest.params = { id: 123 as any };

      const middleware = validateUUID('id');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
});
