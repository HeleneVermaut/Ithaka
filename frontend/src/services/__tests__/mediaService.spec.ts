/**
 * Tests unitaires pour le service mediaService
 *
 * Vérifie le bon fonctionnement des uploads de médias
 * et des transformations d'images
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import mediaService from '../mediaService'
import apiClient from '../api'
import type { IPageElement } from '@/types/models'

// Mock de l'instance Axios
vi.mock('../api', () => ({
  default: {
    post: vi.fn()
  }
}))

describe('mediaService', () => {
  const mockPageElement: IPageElement = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    pageId: '223e4567-e89b-12d3-a456-426614174000',
    type: 'image',
    x: 0,
    y: 0,
    width: 200,
    height: 150,
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

  describe('uploadMedia', () => {
    it('should upload media and track progress', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const pageId = '223e4567-e89b-12d3-a456-426614174000'
      const progressCallback = vi.fn()

      // Mock progress event
      let onUploadProgress: ((event: any) => void) | undefined

      vi.mocked(apiClient.post).mockImplementation((_url: string, _data: unknown, config: any) => {
        onUploadProgress = config?.onUploadProgress
        // Simuler la progression
        if (onUploadProgress) {
          onUploadProgress({ loaded: 50, total: 100 })
        }
        return Promise.resolve({ data: mockPageElement })
      })

      const result = await mediaService.uploadMedia(file, pageId, progressCallback)

      expect(apiClient.post).toHaveBeenCalled()
      expect(result).toEqual(mockPageElement)
    })

    it('should handle upload without progress callback', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const pageId = '223e4567-e89b-12d3-a456-426614174000'

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockPageElement
      })

      const result = await mediaService.uploadMedia(file, pageId)

      expect(result).toEqual(mockPageElement)
    })

    it('should throw error on upload failure', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const pageId = '223e4567-e89b-12d3-a456-426614174000'

      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 413,
          data: { message: 'File too large' }
        }
      })

      await expect(mediaService.uploadMedia(file, pageId)).rejects.toThrow()
    })
  })

  describe('transformImage', () => {
    it('should transform image with brightness adjustment', async () => {
      const elementId = '123e4567-e89b-12d3-a456-426614174000'
      const transformations = { brightness: 20 }
      const result = { cloudinaryUrl: 'https://res.cloudinary.com/transformed' }

      vi.mocked(apiClient.post).mockResolvedValue({
        data: result
      })

      const response = await mediaService.transformImage(elementId, transformations)

      expect(apiClient.post).toHaveBeenCalledWith(
        `/media/${elementId}/transform`,
        transformations
      )
      expect(response.cloudinaryUrl).toBe('https://res.cloudinary.com/transformed')
    })

    it('should transform image with crop parameters', async () => {
      const elementId = '123e4567-e89b-12d3-a456-426614174000'
      const transformations = {
        crop: {
          x: 10,
          y: 20,
          width: 100,
          height: 80
        }
      }
      const result = { cloudinaryUrl: 'https://res.cloudinary.com/cropped' }

      vi.mocked(apiClient.post).mockResolvedValue({
        data: result
      })

      const response = await mediaService.transformImage(elementId, transformations)

      expect(apiClient.post).toHaveBeenCalledWith(
        `/media/${elementId}/transform`,
        transformations
      )
      expect(response.cloudinaryUrl).toBe('https://res.cloudinary.com/cropped')
    })

    it('should handle multiple transformations', async () => {
      const elementId = '123e4567-e89b-12d3-a456-426614174000'
      const transformations = {
        brightness: 20,
        contrast: 10,
        saturation: 5,
        rotation: 90 as const,
        flip: 'horizontal' as const
      }
      const result = { cloudinaryUrl: 'https://res.cloudinary.com/transformed' }

      vi.mocked(apiClient.post).mockResolvedValue({
        data: result
      })

      const response = await mediaService.transformImage(elementId, transformations)

      expect(apiClient.post).toHaveBeenCalledWith(
        `/media/${elementId}/transform`,
        transformations
      )
      expect(response).toHaveProperty('cloudinaryUrl')
    })

    it('should throw error on transformation failure', async () => {
      const elementId = 'invalid-id'
      const transformations = { brightness: 20 }

      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Element not found' }
        }
      })

      await expect(mediaService.transformImage(elementId, transformations)).rejects.toThrow()
    })
  })
})
