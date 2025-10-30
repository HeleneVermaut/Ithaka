/**
 * Tests unitaires pour le service pageElementService
 *
 * Vérifie le bon fonctionnement de toutes les opérations CRUD
 * sur les éléments de page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import pageElementService from '../pageElementService'
import apiClient from '../api'
import type { IPageElement, IPageElementInput } from '@/types/models'

// Mock de l'instance Axios
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

describe('pageElementService', () => {
  const mockPageElement: IPageElement = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    pageId: '223e4567-e89b-12d3-a456-426614174000',
    type: 'image',
    x: 10,
    y: 20,
    width: 100,
    height: 80,
    rotation: 0,
    zIndex: 1,
    content: {},
    style: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchPageElements', () => {
    it('should fetch page elements for a given pageId', async () => {
      const pageId = '223e4567-e89b-12d3-a456-426614174000'
      const mockElements = [mockPageElement]

      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockElements
      })

      const result = await pageElementService.fetchPageElements(pageId)

      expect(apiClient.get).toHaveBeenCalledWith('/page-elements', {
        params: { pageId }
      })
      expect(result).toEqual(mockElements)
    })

    it('should throw error on network failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      })

      await expect(
        pageElementService.fetchPageElements('invalid-id')
      ).rejects.toThrow()
    })
  })

  describe('createPageElement', () => {
    it('should create a new page element', async () => {
      const createData: IPageElementInput = {
        pageId: mockPageElement.pageId,
        type: 'image',
        x: 10,
        y: 20,
        width: 100,
        height: 80
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockPageElement
      })

      const result = await pageElementService.createPageElement(createData)

      expect(apiClient.post).toHaveBeenCalledWith('/page-elements', createData)
      expect(result).toEqual(mockPageElement)
    })

    it('should throw error on validation failure', async () => {
      const createData: IPageElementInput = {
        pageId: mockPageElement.pageId,
        type: 'image',
        x: 10,
        y: 20,
        width: 100,
        height: 80
      }

      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Validation error' }
        }
      })

      await expect(
        pageElementService.createPageElement(createData)
      ).rejects.toThrow()
    })
  })

  describe('updatePageElement', () => {
    it('should update a page element with partial data', async () => {
      const elementId = mockPageElement.id
      const updateData = { x: 50, y: 100 }
      const updatedElement = { ...mockPageElement, ...updateData }

      vi.mocked(apiClient.patch).mockResolvedValue({
        data: updatedElement
      })

      const result = await pageElementService.updatePageElement(elementId, updateData)

      expect(apiClient.patch).toHaveBeenCalledWith(`/page-elements/${elementId}`, updateData)
      expect(result.x).toBe(50)
      expect(result.y).toBe(100)
    })

    it('should throw error when element not found', async () => {
      vi.mocked(apiClient.patch).mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Element not found' }
        }
      })

      await expect(
        pageElementService.updatePageElement('nonexistent', { x: 50 })
      ).rejects.toThrow()
    })
  })

  describe('deletePageElement', () => {
    it('should delete a page element', async () => {
      const elementId = mockPageElement.id

      vi.mocked(apiClient.delete).mockResolvedValue({})

      await pageElementService.deletePageElement(elementId)

      expect(apiClient.delete).toHaveBeenCalledWith(`/page-elements/${elementId}`)
    })

    it('should throw error on deletion failure', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      })

      await expect(
        pageElementService.deletePageElement('invalid')
      ).rejects.toThrow()
    })
  })

  describe('duplicatePageElement', () => {
    it('should duplicate a page element', async () => {
      const elementId = mockPageElement.id
      const duplicateElement = {
        ...mockPageElement,
        id: 'duplicate-id',
        x: mockPageElement.x + 10
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        data: duplicateElement
      })

      const result = await pageElementService.duplicatePageElement(elementId)

      expect(apiClient.post).toHaveBeenCalledWith(`/page-elements/duplicate/${elementId}`)
      expect(result.id).toBe('duplicate-id')
      expect(result.x).toBe(mockPageElement.x + 10)
    })
  })

  describe('restorePageElement', () => {
    it('should restore a deleted page element', async () => {
      const elementId = mockPageElement.id
      const restoredElement = { ...mockPageElement, deletedAt: null }

      vi.mocked(apiClient.post).mockResolvedValue({
        data: restoredElement
      })

      const result = await pageElementService.restorePageElement(elementId)

      expect(apiClient.post).toHaveBeenCalledWith(`/page-elements/restore/${elementId}`)
      expect(result.deletedAt).toBeNull()
    })
  })
})
