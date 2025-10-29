/**
 * Unit Tests for userProfileService.ts
 * Tests SavedText CRUD operations with validation
 * Coverage target: 80%+
 */

import { v4 as uuid } from 'uuid';
import * as userProfileService from '../userProfileService';
import { User, SavedText } from '../../models/User';
import { AppError } from '../../middleware/errorHandler';
import { sequelize } from '../../config/database';

// Mock dependencies - must be before imports
jest.mock('../../config/database', () => ({
  sequelize: {
    transaction: jest.fn(),
    define: jest.fn(),
  },
}));
jest.mock('../../models/User');
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('userProfileService', () => {
  const mockUserId = uuid();

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    savedTexts: [] as any[], // Allow any[] for test mocks to enable flexible test data assignment
    update: jest.fn(),
  };

  const mockSavedText: SavedText = {
    id: uuid(),
    label: 'Chapter Title',
    content: 'My Novel Chapter',
    fontSize: 32,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 1.5,
    type: 'title',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSavedTexts', () => {
    it('should return all saved texts for a user ordered by date descending', async () => {
      const now = new Date();
      const savedTexts = [
        { ...mockSavedText, id: uuid(), createdAt: new Date(now.getTime() + 1000) },
        { ...mockSavedText, id: uuid(), createdAt: new Date(now.getTime()) },
      ];

      (User.findByPk as jest.Mock).mockResolvedValue({
        ...mockUser,
        savedTexts,
      });

      const result = await userProfileService.getSavedTexts(mockUserId);

      expect(User.findByPk).toHaveBeenCalledWith(mockUserId);
      expect(result).toHaveLength(2);
      expect(result[0]!.createdAt.getTime()).toBeGreaterThan(result[1]!.createdAt.getTime());
    });

    it('should return empty array if user has no saved texts', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({
        ...mockUser,
        savedTexts: [],
      });

      const result = await userProfileService.getSavedTexts(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle legacy data where savedTexts is not an array', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({
        ...mockUser,
        savedTexts: null,
      });

      const result = await userProfileService.getSavedTexts(mockUserId);

      expect(result).toEqual([]);
    });

    it('should throw error when user not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(userProfileService.getSavedTexts(mockUserId)).rejects.toThrow(AppError);
    });
  });

  describe('addSavedText', () => {
    it('should create and save a new text', async () => {
      const textData = {
        label: 'Chapter Title',
        content: 'My Novel Chapter',
        fontSize: 32,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        textAlign: 'center',
        lineHeight: 1.5,
        type: 'title' as const,
      };

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await userProfileService.addSavedText(mockUserId, textData);

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(User.findByPk).toHaveBeenCalledWith(mockUserId, { transaction: mockTransaction });
      expect(mockUser.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result.label).toBe(textData.label);
      expect(result.content).toBe(textData.content);
    });

    it('should throw error when label is missing', async () => {
      const invalidData = {
        label: '',
        content: 'Test',
        fontSize: 32,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        textAlign: 'left',
        lineHeight: 1.2,
      };

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);

      await expect(userProfileService.addSavedText(mockUserId, invalidData)).rejects.toThrow(
        AppError
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should validate font size range', async () => {
      const invalidData = {
        label: 'Test',
        content: 'Test',
        fontSize: 300, // Too large
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        textAlign: 'left',
        lineHeight: 1.2,
      };

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);

      await expect(userProfileService.addSavedText(mockUserId, invalidData)).rejects.toThrow(
        AppError
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should validate color hex format', async () => {
      const invalidData = {
        label: 'Test',
        content: 'Test',
        fontSize: 32,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: 'invalid-color', // Invalid hex
        textAlign: 'left',
        lineHeight: 1.2,
      };

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);

      await expect(userProfileService.addSavedText(mockUserId, invalidData)).rejects.toThrow(
        AppError
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      const validData = {
        label: 'Test',
        content: 'Test',
        fontSize: 32,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        textAlign: 'left',
        lineHeight: 1.2,
      };

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(userProfileService.addSavedText(mockUserId, validData)).rejects.toThrow(
        AppError
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('updateSavedText', () => {
    it('should update a saved text', async () => {
      const textId = uuid();
      const updates = { fontSize: 36, color: '#333333' };

      mockUser.savedTexts = [
        {
          ...mockSavedText,
          id: textId,
          fontSize: 32,
          color: '#000000',
        },
      ];

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await userProfileService.updateSavedText(mockUserId, textId, updates);

      expect(result.fontSize).toBe(36);
      expect(result.color).toBe('#333333');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should preserve createdAt timestamp', async () => {
      const textId = uuid();
      const originalCreatedAt = new Date('2024-01-01');

      mockUser.savedTexts = [
        {
          ...mockSavedText,
          id: textId,
          createdAt: originalCreatedAt,
        },
      ];

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await userProfileService.updateSavedText(mockUserId, textId, {
        fontSize: 40,
      });

      expect(result.createdAt).toEqual(originalCreatedAt);
    });

    it('should throw error when text not found', async () => {
      mockUser.savedTexts = [];

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        userProfileService.updateSavedText(mockUserId, uuid(), { fontSize: 40 })
      ).rejects.toThrow(AppError);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should validate updates', async () => {
      const textId = uuid();
      mockUser.savedTexts = [{ ...mockSavedText, id: textId }];

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        userProfileService.updateSavedText(mockUserId, textId, {
          fontSize: 500, // Invalid
        })
      ).rejects.toThrow(AppError);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('deleteSavedText', () => {
    it('should delete a saved text', async () => {
      const textId = uuid();
      mockUser.savedTexts = [
        { ...mockSavedText, id: textId },
        { ...mockSavedText, id: uuid() },
      ];

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      await userProfileService.deleteSavedText(mockUserId, textId);

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockUser.update).toHaveBeenCalled();
    });

    it('should throw error when text not found', async () => {
      mockUser.savedTexts = [];

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        userProfileService.deleteSavedText(mockUserId, uuid())
      ).rejects.toThrow(AppError);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(userProfileService.deleteSavedText(mockUserId, uuid())).rejects.toThrow(
        AppError
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
