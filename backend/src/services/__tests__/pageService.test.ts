/**
 * Unit Tests for pageService.ts
 * Tests all CRUD operations for page management
 * Coverage target: 80%+
 */

import { v4 as uuid } from 'uuid';
import * as pageService from '../pageService';
import { Page, Notebook, User } from '../../models';

// Mock the models
jest.mock('../../models', () => ({
  Page: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Notebook: {
    findByPk: jest.fn(),
  },
  User: {
    findByPk: jest.fn(),
  },
}));

describe('pageService', () => {
  const mockUserId = uuid();
  const mockNotebookId = uuid();
  const mockPageId = uuid();

  const mockNotebook = {
    id: mockNotebookId,
    userId: mockUserId,
    title: 'Test Notebook',
  };

  const mockPage = {
    id: mockPageId,
    notebookId: mockNotebookId,
    pageNumber: 1,
    isCustomCover: false,
    content: null,
    update: jest.fn(),
    destroy: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPagesByNotebook', () => {
    it('should return all pages for a notebook ordered by page number', async () => {
      const pages = [
        { ...mockPage, pageNumber: 1 },
        { ...mockPage, id: uuid(), pageNumber: 2 },
      ];

      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);
      (Page.findAll as jest.Mock).mockResolvedValue(pages);

      const result = await pageService.getPagesByNotebook(mockNotebookId, mockUserId);

      expect(Notebook.findByPk).toHaveBeenCalledWith(mockNotebookId);
      expect(Page.findAll).toHaveBeenCalledWith({
        where: { notebookId: mockNotebookId },
        order: [['pageNumber', 'ASC']],
      });
      expect(result).toEqual(pages);
    });

    it('should throw error when notebook not found', async () => {
      (Notebook.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(pageService.getPagesByNotebook(mockNotebookId, mockUserId)).rejects.toThrow(
        'Not found'
      );
    });

    it('should throw error when user does not own notebook', async () => {
      const differentUserId = uuid();
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      await expect(pageService.getPagesByNotebook(mockNotebookId, differentUserId)).rejects.toThrow(
        'Not found'
      );
    });
  });

  describe('getPageById', () => {
    it('should return a specific page for authorized user', async () => {
      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      const result = await pageService.getPageById(mockPageId, mockUserId);

      expect(Page.findByPk).toHaveBeenCalledWith(mockPageId);
      expect(Notebook.findByPk).toHaveBeenCalledWith(mockNotebookId);
      expect(result).toEqual(mockPage);
    });

    it('should throw error when page not found', async () => {
      (Page.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(pageService.getPageById(mockPageId, mockUserId)).rejects.toThrow('Not found');
    });

    it('should throw error when notebook not found', async () => {
      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(pageService.getPageById(mockPageId, mockUserId)).rejects.toThrow('Not found');
    });

    it('should throw error when user does not own notebook', async () => {
      const differentUserId = uuid();
      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      await expect(pageService.getPageById(mockPageId, differentUserId)).rejects.toThrow(
        'Not found'
      );
    });
  });

  describe('createPage', () => {
    it('should create a new page for authorized user', async () => {
      const newPageData = {
        notebookId: mockNotebookId,
        pageNumber: 2,
        isCustomCover: false,
      };

      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);
      (Page.create as jest.Mock).mockResolvedValue({
        ...mockPage,
        ...newPageData,
      });

      const result = await pageService.createPage(
        mockNotebookId,
        newPageData.pageNumber,
        newPageData.isCustomCover,
        mockUserId
      );

      expect(Notebook.findByPk).toHaveBeenCalledWith(mockNotebookId);
      expect(Page.create).toHaveBeenCalledWith({
        notebookId: mockNotebookId,
        pageNumber: 2,
        isCustomCover: false,
      });
      expect(result).toHaveProperty('id');
    });

    it('should throw error when notebook not found', async () => {
      (Notebook.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        pageService.createPage(mockNotebookId, 1, false, mockUserId)
      ).rejects.toThrow('Not found');
    });

    it('should throw error when user does not own notebook', async () => {
      const differentUserId = uuid();
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      await expect(
        pageService.createPage(mockNotebookId, 1, false, differentUserId)
      ).rejects.toThrow('Not found');
    });
  });

  describe('updatePage', () => {
    it('should update page for authorized user', async () => {
      const updates = { pageNumber: 5 };
      const updatedPage = { ...mockPage, ...updates };

      const mockPageWithUpdate = {
        ...mockPage,
        update: jest.fn().mockResolvedValue(updatedPage)
      };

      (Page.findByPk as jest.Mock).mockResolvedValue(mockPageWithUpdate);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      const result = await pageService.updatePage(mockPageId, updates, mockUserId);

      expect(Page.findByPk).toHaveBeenCalledWith(mockPageId);
      expect(mockPageWithUpdate.update).toHaveBeenCalledWith(updates);
      expect(result).toEqual(updatedPage);
    });

    it('should throw error when page not found', async () => {
      (Page.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(pageService.updatePage(mockPageId, {}, mockUserId)).rejects.toThrow(
        'Not found'
      );
    });

    it('should throw error when user does not own notebook', async () => {
      const differentUserId = uuid();
      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      await expect(pageService.updatePage(mockPageId, {}, differentUserId)).rejects.toThrow(
        'Not found'
      );
    });
  });

  describe('deletePage', () => {
    it('should delete page for authorized user', async () => {
      const mockPageWithDestroy = {
        ...mockPage,
        destroy: jest.fn().mockResolvedValue(undefined)
      };

      (Page.findByPk as jest.Mock).mockResolvedValue(mockPageWithDestroy);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      await pageService.deletePage(mockPageId, mockUserId);

      expect(Page.findByPk).toHaveBeenCalledWith(mockPageId);
      expect(mockPageWithDestroy.destroy).toHaveBeenCalled();
    });

    it('should throw error when page not found', async () => {
      (Page.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(pageService.deletePage(mockPageId, mockUserId)).rejects.toThrow('Not found');
    });

    it('should throw error when user does not own notebook', async () => {
      const differentUserId = uuid();
      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      await expect(pageService.deletePage(mockPageId, differentUserId)).rejects.toThrow(
        'Not found'
      );
    });
  });
});
