/**
 * Unit Tests for elementService.ts
 * Tests CRUD operations, batch operations, and transactions
 * Coverage target: 80%+
 */

import { v4 as uuid } from 'uuid';
import * as elementService from '../elementService';
import { Page, PageElement, Notebook } from '../../models';
import { sequelize } from '../../config/database';

// Mock the models and database
jest.mock('../../models', () => ({
  Page: {
    findByPk: jest.fn(),
  },
  PageElement: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  Notebook: {
    findByPk: jest.fn(),
  },
}));

jest.mock('../../config/database', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));

describe('elementService', () => {
  const mockUserId = uuid();
  const mockNotebookId = uuid();
  const mockPageId = uuid();
  const mockElementId = uuid();

  const mockNotebook = {
    id: mockNotebookId,
    userId: mockUserId,
  };

  const mockPage = {
    id: mockPageId,
    notebookId: mockNotebookId,
  };

  const mockElement = {
    id: mockElementId,
    pageId: mockPageId,
    type: 'text' as import('../../models/PageElement').ElementType,
    content: { text: 'Test content' },
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    zIndex: 1,
    style: {},
    update: jest.fn(),
    destroy: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getElementsByPage', () => {
    it('should return all elements for a page ordered by zIndex', async () => {
      const elements = [
        { ...mockElement, zIndex: 1 },
        { ...mockElement, id: uuid(), zIndex: 2 },
      ];

      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);
      (PageElement.findAll as jest.Mock).mockResolvedValue(elements);

      const result = await elementService.getElementsByPage(mockPageId, mockUserId);

      expect(Page.findByPk).toHaveBeenCalledWith(mockPageId);
      expect(Notebook.findByPk).toHaveBeenCalledWith(mockNotebookId);
      expect(PageElement.findAll).toHaveBeenCalledWith({
        where: { pageId: mockPageId },
        order: [['zIndex', 'ASC']],
      });
      expect(result).toEqual(elements);
    });

    it('should throw error when page not found', async () => {
      (Page.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(elementService.getElementsByPage(mockPageId, mockUserId)).rejects.toThrow(
        'Not found'
      );
    });

    it('should throw error when user does not own notebook', async () => {
      const differentUserId = uuid();
      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      await expect(elementService.getElementsByPage(mockPageId, differentUserId)).rejects.toThrow(
        'Not found'
      );
    });
  });

  describe('getElementsByIds', () => {
    it('should return elements mapped by their IDs', async () => {
      const elementId1 = uuid();
      const elementId2 = uuid();
      const elements = [
        { ...mockElement, id: elementId1 },
        { ...mockElement, id: elementId2 },
      ];

      (PageElement.findAll as jest.Mock).mockResolvedValue(elements);

      const result = await elementService.getElementsByIds([elementId1, elementId2], mockUserId);

      expect(PageElement.findAll).toHaveBeenCalledWith({
        where: { id: [elementId1, elementId2] },
      });
      expect(result[elementId1]).toEqual(elements[0]);
      expect(result[elementId2]).toEqual(elements[1]);
    });

    it('should return empty object when no elements found', async () => {
      (PageElement.findAll as jest.Mock).mockResolvedValue([]);

      const result = await elementService.getElementsByIds([uuid()], mockUserId);

      expect(result).toEqual({});
    });
  });

  describe('createElement', () => {
    it('should create a new element for authorized user', async () => {
      const newElementData = {
        type: 'text' as import('../../models/PageElement').ElementType,
        content: { text: 'New content' },
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        zIndex: 1,
      };

      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);
      (PageElement.create as jest.Mock).mockResolvedValue({
        ...mockElement,
        ...newElementData,
      });

      const result = await elementService.createElement(mockPageId, newElementData, mockUserId);

      expect(Page.findByPk).toHaveBeenCalledWith(mockPageId);
      expect(Notebook.findByPk).toHaveBeenCalledWith(mockNotebookId);
      expect(PageElement.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should throw error when page not found', async () => {
      (Page.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        elementService.createElement(mockPageId, {
          type: 'text' as import('../../models/PageElement').ElementType,
          content: {},
          x: 0,
          y: 0,
          width: 100,
          height: 50
        }, mockUserId)
      ).rejects.toThrow('Not found');
    });

    it('should throw error when user does not own notebook', async () => {
      const differentUserId = uuid();
      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      await expect(
        elementService.createElement(mockPageId, {
          type: 'text' as import('../../models/PageElement').ElementType,
          content: {},
          x: 0,
          y: 0,
          width: 100,
          height: 50
        }, differentUserId)
      ).rejects.toThrow('Not found');
    });
  });

  describe('createBatchElements', () => {
    it('should create and update multiple elements in a transaction', async () => {
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      const elementsToCreate = [
        {
          type: 'text' as import('../../models/PageElement').ElementType,
          content: { text: 'Element 1' },
          x: 0,
          y: 0,
          width: 100,
          height: 50
        },
        {
          id: uuid(),
          type: 'text' as import('../../models/PageElement').ElementType,
          content: { text: 'Element 2 updated' },
          x: 0,
          y: 0,
          width: 100,
          height: 50
        },
      ];

      const createdElement = {
        ...mockElement,
        type: 'text' as import('../../models/PageElement').ElementType,
        content: { text: 'Element 1' }
      };
      const updatedElement = {
        ...mockElement,
        id: elementsToCreate[1].id,
        type: 'text' as import('../../models/PageElement').ElementType,
        content: { text: 'Element 2 updated' },
      };

      (PageElement.update as jest.Mock).mockResolvedValue([1]);
      (PageElement.create as jest.Mock).mockResolvedValue(createdElement);
      (PageElement.findByPk as jest.Mock)
        .mockResolvedValueOnce(updatedElement)
        .mockResolvedValueOnce(createdElement);

      const result = await elementService.createBatchElements(
        mockPageId,
        elementsToCreate,
        mockUserId
      );

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.elements).toHaveLength(2);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn().mockResolvedValue(undefined),
      };

      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);
      (PageElement.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const elementsToCreate = [{
        type: 'text' as import('../../models/PageElement').ElementType,
        content: { text: 'Element 1' },
        x: 0,
        y: 0,
        width: 100,
        height: 50
      }];

      await expect(
        elementService.createBatchElements(mockPageId, elementsToCreate, mockUserId)
      ).rejects.toThrow('Database error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw error when user not authorized', async () => {
      const differentUserId = uuid();
      (Page.findByPk as jest.Mock).mockResolvedValue(mockPage);
      (Notebook.findByPk as jest.Mock).mockResolvedValue(mockNotebook);

      await expect(
        elementService.createBatchElements(mockPageId, [], differentUserId)
      ).rejects.toThrow('Not found');
    });
  });

  describe('updateElement', () => {
    it('should update an element', async () => {
      const updates = { content: { text: 'Updated content' } };
      const updatedElement = { ...mockElement, ...updates };

      const mockElementWithUpdate = {
        ...mockElement,
        update: jest.fn().mockResolvedValue(updatedElement)
      };

      (PageElement.findByPk as jest.Mock).mockResolvedValue(mockElementWithUpdate);

      const result = await elementService.updateElement(mockElementId, updates, mockUserId);

      expect(PageElement.findByPk).toHaveBeenCalledWith(mockElementId);
      expect(mockElementWithUpdate.update).toHaveBeenCalledWith(updates);
      expect(result).toEqual(updatedElement);
    });

    it('should throw error when element not found', async () => {
      (PageElement.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(elementService.updateElement(mockElementId, {}, mockUserId)).rejects.toThrow(
        'Not found'
      );
    });
  });

  describe('deleteElement', () => {
    it('should delete an element', async () => {
      const mockElementWithDestroy = {
        ...mockElement,
        destroy: jest.fn().mockResolvedValue(undefined)
      };

      (PageElement.findByPk as jest.Mock).mockResolvedValue(mockElementWithDestroy);

      await elementService.deleteElement(mockElementId, mockUserId);

      expect(PageElement.findByPk).toHaveBeenCalledWith(mockElementId);
      expect(mockElementWithDestroy.destroy).toHaveBeenCalled();
    });

    it('should throw error when element not found', async () => {
      (PageElement.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(elementService.deleteElement(mockElementId, mockUserId)).rejects.toThrow(
        'Not found'
      );
    });
  });

  describe('updateZIndex', () => {
    it('should update zIndex for multiple elements', async () => {
      const elementIds = [uuid(), uuid(), uuid()];
      const newOrder = [100, 200, 300];

      (PageElement.update as jest.Mock).mockResolvedValue([1]);

      await elementService.updateZIndex(elementIds, newOrder, mockUserId);

      expect(PageElement.update).toHaveBeenCalledTimes(3);
      expect(PageElement.update).toHaveBeenNthCalledWith(1, { zIndex: 100 }, {
        where: { id: elementIds[0] },
      });
      expect(PageElement.update).toHaveBeenNthCalledWith(2, { zIndex: 200 }, {
        where: { id: elementIds[1] },
      });
      expect(PageElement.update).toHaveBeenNthCalledWith(3, { zIndex: 300 }, {
        where: { id: elementIds[2] },
      });
    });

    it('should handle empty arrays', async () => {
      await elementService.updateZIndex([], [], mockUserId);

      expect(PageElement.update).not.toHaveBeenCalled();
    });
  });
});
