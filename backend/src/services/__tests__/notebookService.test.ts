/**
 * Notebook Service Unit Tests
 *
 * Comprehensive test suite for notebookService with 90%+ coverage.
 * Tests all 10 service functions with mocked dependencies:
 * - createNotebook
 * - getNotebookById
 * - updateNotebook
 * - deleteNotebook
 * - getUserNotebooks
 * - getNotebooks (with pagination, filtering, sorting)
 * - duplicateNotebook
 * - archiveNotebook
 * - restoreNotebook
 * - getArchivedNotebooks
 *
 * Mock Strategy:
 * - Sequelize models mocked with jest.mock()
 * - Logger mocked with jest.spyOn()
 * - Transaction mocks for duplicateNotebook
 * - Error scenarios tested with AppError
 */

import * as notebookService from '../notebookService';
import { Notebook } from '../../models/Notebook';
import { NotebookPermissions } from '../../models/NotebookPermissions';
import { User } from '../../models/User';
import { AppError } from '../../middleware/errorHandler';
import { sequelize } from '../../config/database';
import { logger } from '../../utils/logger';
import { Op } from 'sequelize';

// Mock all dependencies
jest.mock('../../models/Notebook');
jest.mock('../../models/NotebookPermissions');
jest.mock('../../models/User');
jest.mock('../../config/database');
jest.mock('../../utils/logger');

describe('NotebookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotebook', () => {
    const userId = 'user-uuid-1';
    const mockUser = { id: userId, firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
    const createData = {
      title: 'My Travel Journal',
      description: 'Summer 2025',
      type: 'Voyage' as const,
      format: 'A4' as const,
      orientation: 'portrait' as const,
      dpi: 300,
      coverImageUrl: 'https://example.com/cover.jpg',
    };

    it('should create a notebook with default permissions', async () => {
      const mockNotebook = {
        id: 'notebook-uuid-1',
        userId,
        ...createData,
        pageCount: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockNotebookWithAssociations = {
        ...mockNotebook,
        permissions: { id: 'perm-uuid-1', notebookId: 'notebook-uuid-1', type: 'private' },
        owner: mockUser,
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (Notebook.create as jest.Mock).mockResolvedValue(mockNotebook);
      (NotebookPermissions.create as jest.Mock).mockResolvedValue({
        notebookId: 'notebook-uuid-1',
        type: 'private',
      });
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebookWithAssociations);

      const result = await notebookService.createNotebook(userId, createData);

      expect(User.findByPk).toHaveBeenCalledWith(userId);
      expect(Notebook.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          title: createData.title,
          type: createData.type,
          pageCount: 0,
          status: 'active',
          dpi: 300,
        }),
        undefined
      );
      expect(NotebookPermissions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notebookId: mockNotebook.id,
          type: 'private',
        }),
        undefined
      );
      expect(result).toEqual(mockNotebookWithAssociations);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should apply default DPI if not provided', async () => {
      const dataWithoutDpi = { ...createData, dpi: undefined };
      const mockNotebook = { ...createData, id: 'notebook-uuid-2', pageCount: 0, status: 'active', dpi: 300 };
      const mockNotebookWithAssociations = {
        ...mockNotebook,
        permissions: { type: 'private' },
        owner: mockUser,
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (Notebook.create as jest.Mock).mockResolvedValue(mockNotebook);
      (NotebookPermissions.create as jest.Mock).mockResolvedValue(null);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebookWithAssociations);

      await notebookService.createNotebook(userId, dataWithoutDpi as any);

      expect(Notebook.create).toHaveBeenCalledWith(
        expect.objectContaining({ dpi: 300 }),
        undefined
      );
    });

    it('should throw 404 if user not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(notebookService.createNotebook(userId, createData)).rejects.toThrow(
        expect.objectContaining({ status: 404 })
      );

      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw 500 if notebook creation fails', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (Notebook.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(notebookService.createNotebook(userId, createData)).rejects.toThrow(
        expect.objectContaining({ status: 500 })
      );

      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw 500 if findByPk after creation fails', async () => {
      const mockNotebook = { id: 'notebook-uuid-3', userId, ...createData, pageCount: 0, status: 'active' };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (Notebook.create as jest.Mock).mockResolvedValue(mockNotebook);
      (NotebookPermissions.create as jest.Mock).mockResolvedValue(null);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(notebookService.createNotebook(userId, createData)).rejects.toThrow(
        'Failed to retrieve created notebook'
      );
    });
  });

  describe('getNotebookById', () => {
    const notebookId = 'notebook-uuid-1';
    const userId = 'user-uuid-1';
    const mockNotebook = {
      id: notebookId,
      userId,
      title: 'My Notebook',
      permissions: { type: 'private' },
      owner: { id: userId, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    };

    it('should return notebook if user is the owner', async () => {
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      const result = await notebookService.getNotebookById(notebookId, userId);

      expect(Notebook.findByPk).toHaveBeenCalledWith(
        notebookId,
        expect.objectContaining({
          include: expect.any(Array),
        })
      );
      expect(result).toEqual(mockNotebook);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should return null if notebook not found', async () => {
      (Notebook.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await notebookService.getNotebookById(notebookId, userId);

      expect(result).toBeNull();
    });

    it('should return null if user is not the owner (unauthorized)', async () => {
      const differentUserId = 'user-uuid-2';
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      const result = await notebookService.getNotebookById(notebookId, differentUserId);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw 500 if database query fails', async () => {
      (Notebook.findByPk as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(notebookService.getNotebookById(notebookId, userId)).rejects.toThrow(
        expect.objectContaining({ status: 500 })
      );
    });
  });

  describe('updateNotebook', () => {
    const notebookId = 'notebook-uuid-1';
    const userId = 'user-uuid-1';
    const mockNotebook = {
      id: notebookId,
      userId,
      title: 'Original Title',
      description: 'Original Description',
      dpi: 300,
      update: jest.fn(),
    };

    it('should update allowed fields only', async () => {
      const updateData = {
        title: 'New Title',
        description: 'New Description',
        dpi: 150,
      };

      const updatedNotebook = {
        ...mockNotebook,
        ...updateData,
        permissions: { type: 'private' },
        owner: { id: userId },
      };

      (Notebook.findByPk as jest.Mock)
        .mockResolvedValueOnce(mockNotebook)
        .mockResolvedValueOnce(updatedNotebook);
      (mockNotebook.update as jest.Mock).mockResolvedValue(undefined);

      const result = await notebookService.updateNotebook(notebookId, userId, updateData);

      expect(mockNotebook.update).toHaveBeenCalledWith(updateData);
      expect(result).toEqual(updatedNotebook);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should ignore immutable fields in update', async () => {
      const updateData = {
        title: 'New Title',
        type: 'Daily', // Immutable - should be ignored
        format: 'A5', // Immutable - should be ignored
      };

      const updatedNotebook = { ...mockNotebook, title: 'New Title' };

      (Notebook.findByPk as jest.Mock)
        .mockResolvedValueOnce(mockNotebook)
        .mockResolvedValueOnce(updatedNotebook);
      (mockNotebook.update as jest.Mock).mockResolvedValue(undefined);

      await notebookService.updateNotebook(notebookId, userId, updateData as any);

      expect(mockNotebook.update).toHaveBeenCalledWith({ title: 'New Title' });
    });

    it('should return null if notebook not found', async () => {
      (Notebook.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await notebookService.updateNotebook(notebookId, userId, { title: 'New' });

      expect(result).toBeNull();
    });

    it('should return null if user is not the owner', async () => {
      const differentUserId = 'user-uuid-2';
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      const result = await notebookService.updateNotebook(notebookId, differentUserId, { title: 'New' });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('deleteNotebook', () => {
    const notebookId = 'notebook-uuid-1';
    const userId = 'user-uuid-1';
    const mockNotebook = {
      id: notebookId,
      userId,
      title: 'To Delete',
      destroy: jest.fn(),
    };

    it('should delete notebook and return true', async () => {
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);
      (mockNotebook.destroy as jest.Mock).mockResolvedValue(undefined);

      const result = await notebookService.deleteNotebook(notebookId, userId);

      expect(Notebook.findByPk).toHaveBeenCalledWith(notebookId);
      expect(mockNotebook.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should return false if notebook not found', async () => {
      (Notebook.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await notebookService.deleteNotebook(notebookId, userId);

      expect(result).toBe(false);
    });

    it('should return false if user is not the owner', async () => {
      const differentUserId = 'user-uuid-2';
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      const result = await notebookService.deleteNotebook(notebookId, differentUserId);

      expect(result).toBe(false);
      expect(mockNotebook.destroy).not.toHaveBeenCalled();
    });

    it('should throw 500 if deletion fails', async () => {
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);
      (mockNotebook.destroy as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(notebookService.deleteNotebook(notebookId, userId)).rejects.toThrow(
        expect.objectContaining({ status: 500 })
      );
    });
  });

  describe('getUserNotebooks', () => {
    const userId = 'user-uuid-1';
    const mockNotebooks = [
      {
        id: 'nb-1',
        userId,
        title: 'Notebook 1',
        status: 'active',
        createdAt: new Date('2025-01-02'),
      },
      {
        id: 'nb-2',
        userId,
        title: 'Notebook 2',
        status: 'active',
        createdAt: new Date('2025-01-01'),
      },
    ];

    it('should return all active notebooks for user, ordered by createdAt DESC', async () => {
      (Notebook.findAll as jest.Mock).mockResolvedValue(mockNotebooks);

      const result = await notebookService.getUserNotebooks(userId);

      expect(Notebook.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, status: 'active' },
          order: [['createdAt', 'DESC']],
        })
      );
      expect(result).toEqual(mockNotebooks);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should return empty array if user has no notebooks', async () => {
      (Notebook.findAll as jest.Mock).mockResolvedValue([]);

      const result = await notebookService.getUserNotebooks(userId);

      expect(result).toEqual([]);
    });

    it('should throw 500 if database query fails', async () => {
      (Notebook.findAll as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(notebookService.getUserNotebooks(userId)).rejects.toThrow(
        expect.objectContaining({ status: 500 })
      );
    });
  });

  describe('getNotebooks', () => {
    const userId = 'user-uuid-1';
    const mockNotebooks = [
      { id: 'nb-1', userId, title: 'Voyage 1', type: 'Voyage', status: 'active' },
      { id: 'nb-2', userId, title: 'Daily 1', type: 'Daily', status: 'active' },
    ];

    it('should retrieve paginated notebooks with default filters', async () => {
      const mockResult = { count: 2, rows: mockNotebooks };
      (Notebook.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      const result = await notebookService.getNotebooks(userId);

      expect(Notebook.findAndCountAll).toHaveBeenCalled();
      expect(result.notebooks).toEqual(mockNotebooks);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.limit).toBe(12);
    });

    it('should handle pagination parameters', async () => {
      const mockResult = { count: 50, rows: mockNotebooks };
      (Notebook.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      const result = await notebookService.getNotebooks(userId, {}, 2, 10);

      expect(Notebook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 10, // (page 2 - 1) * 10
        })
      );
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });

    it('should handle type filter', async () => {
      const mockResult = { count: 1, rows: [mockNotebooks[0]] };
      (Notebook.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      await notebookService.getNotebooks(userId, { type: 'Voyage' });

      expect(Notebook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        })
      );
    });

    it('should handle search filter', async () => {
      const mockResult = { count: 1, rows: [mockNotebooks[0]] };
      (Notebook.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      await notebookService.getNotebooks(userId, { search: 'Voyage' });

      expect(Notebook.findAndCountAll).toHaveBeenCalled();
    });

    it('should handle sorting parameters', async () => {
      const mockResult = { count: 2, rows: mockNotebooks };
      (Notebook.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      await notebookService.getNotebooks(userId, {}, 1, 12, 'title', 'ASC');

      expect(Notebook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.any(Array),
        })
      );
    });

    it('should throw 500 if query fails', async () => {
      (Notebook.findAndCountAll as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(notebookService.getNotebooks(userId)).rejects.toThrow(
        expect.objectContaining({ status: 500 })
      );
    });
  });

  describe('duplicateNotebook', () => {
    const sourceId = 'source-uuid-1';
    const userId = 'user-uuid-1';
    const mockSourceNotebook = {
      id: sourceId,
      userId,
      title: 'Original',
      type: 'Voyage',
      format: 'A4',
      orientation: 'portrait',
      description: 'Original description',
      dpi: 300,
    };

    it('should create a copy with (copie) suffix', async () => {
      const mockNewNotebook = {
        id: 'new-uuid-1',
        userId,
        title: 'Original (copie)',
        type: 'Voyage',
        pageCount: 0,
        status: 'active',
      };

      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (Notebook.findByPk as jest.Mock)
        .mockResolvedValueOnce(mockSourceNotebook)
        .mockResolvedValueOnce({ ...mockNewNotebook, permissions: { type: 'private' }, owner: {} });
      (Notebook.create as jest.Mock).mockResolvedValue(mockNewNotebook);
      (NotebookPermissions.create as jest.Mock).mockResolvedValue({});

      const result = await notebookService.duplicateNotebook(sourceId, userId);

      expect(Notebook.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Original (copie)',
          type: mockSourceNotebook.type,
          pageCount: 0,
          status: 'active',
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result?.title).toEqual('Original (copie)');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should return null if source not found', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await notebookService.duplicateNotebook(sourceId, userId);

      expect(result).toBeNull();
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should return null if user is not owner', async () => {
      const differentUserId = 'user-uuid-2';
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockSourceNotebook);

      const result = await notebookService.duplicateNotebook(sourceId, differentUserId);

      expect(result).toBeNull();
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (Notebook.findByPk as jest.Mock).mockResolvedValueOnce(mockSourceNotebook);
      (Notebook.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(notebookService.duplicateNotebook(sourceId, userId)).rejects.toThrow(
        expect.objectContaining({ status: 500 })
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('archiveNotebook', () => {
    const notebookId = 'notebook-uuid-1';
    const userId = 'user-uuid-1';
    const mockNotebook = {
      id: notebookId,
      userId,
      title: 'To Archive',
      status: 'active',
      archivedAt: null,
      update: jest.fn(),
    };

    it('should archive notebook and set archivedAt', async () => {
      const archivedNotebook = {
        ...mockNotebook,
        status: 'archived',
        archivedAt: new Date(),
      };

      (Notebook.findByPk as jest.Mock)
        .mockResolvedValueOnce(mockNotebook)
        .mockResolvedValueOnce(archivedNotebook);
      (mockNotebook.update as jest.Mock).mockResolvedValue(undefined);

      const result = await notebookService.archiveNotebook(notebookId, userId);

      expect(mockNotebook.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'archived',
          archivedAt: expect.any(Date),
        })
      );
      expect(result?.status).toBe('archived');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should return null if notebook not found', async () => {
      (Notebook.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await notebookService.archiveNotebook(notebookId, userId);

      expect(result).toBeNull();
    });

    it('should return null if user is not owner', async () => {
      const differentUserId = 'user-uuid-2';
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      const result = await notebookService.archiveNotebook(notebookId, differentUserId);

      expect(result).toBeNull();
    });
  });

  describe('restoreNotebook', () => {
    const notebookId = 'notebook-uuid-1';
    const userId = 'user-uuid-1';
    const mockNotebook = {
      id: notebookId,
      userId,
      title: 'Archived Notebook',
      status: 'archived',
      archivedAt: new Date(),
      update: jest.fn(),
    };

    it('should restore notebook to active state', async () => {
      const restoredNotebook = {
        ...mockNotebook,
        status: 'active',
        archivedAt: null,
      };

      (Notebook.findByPk as jest.Mock)
        .mockResolvedValueOnce(mockNotebook)
        .mockResolvedValueOnce(restoredNotebook);
      (mockNotebook.update as jest.Mock).mockResolvedValue(undefined);

      const result = await notebookService.restoreNotebook(notebookId, userId);

      expect(mockNotebook.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          archivedAt: null,
        })
      );
      expect(result?.status).toBe('active');
      expect(result?.archivedAt).toBeNull();
      expect(logger.info).toHaveBeenCalled();
    });

    it('should return null if notebook not found', async () => {
      (Notebook.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await notebookService.restoreNotebook(notebookId, userId);

      expect(result).toBeNull();
    });

    it('should return null if user is not owner', async () => {
      const differentUserId = 'user-uuid-2';
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      const result = await notebookService.restoreNotebook(notebookId, differentUserId);

      expect(result).toBeNull();
    });
  });

  describe('getArchivedNotebooks', () => {
    const userId = 'user-uuid-1';
    const mockArchivedNotebooks = [
      { id: 'nb-1', userId, title: 'Archived 1', status: 'archived', archivedAt: new Date('2025-01-02') },
      { id: 'nb-2', userId, title: 'Archived 2', status: 'archived', archivedAt: new Date('2025-01-01') },
    ];

    it('should retrieve archived notebooks with pagination', async () => {
      const mockResult = { count: 2, rows: mockArchivedNotebooks };
      (Notebook.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      const result = await notebookService.getArchivedNotebooks(userId);

      expect(Notebook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            archivedAt: expect.any(Object),
          }),
          order: [['archivedAt', 'DESC']],
        })
      );
      expect(result.notebooks).toEqual(mockArchivedNotebooks);
      expect(result.pagination.total).toBe(2);
    });

    it('should return empty array if no archived notebooks', async () => {
      const mockResult = { count: 0, rows: [] };
      (Notebook.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      const result = await notebookService.getArchivedNotebooks(userId);

      expect(result.notebooks).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle pagination parameters', async () => {
      const mockResult = { count: 50, rows: mockArchivedNotebooks };
      (Notebook.findAndCountAll as jest.Mock).mockResolvedValue(mockResult);

      const result = await notebookService.getArchivedNotebooks(userId, 2, 10);

      expect(Notebook.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 10,
        })
      );
      expect(result.pagination.currentPage).toBe(2);
    });

    it('should throw 500 if query fails', async () => {
      (Notebook.findAndCountAll as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(notebookService.getArchivedNotebooks(userId)).rejects.toThrow(
        expect.objectContaining({ status: 500 })
      );
    });
  });
});
