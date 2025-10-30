/**
 * Tests unitaires pour le service stickerService
 *
 * Vérifie le bon fonctionnement de la gestion de la bibliothèque de stickers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import stickerService from '../stickerService'
import apiClient from '../api'
import type { IUserSticker } from '@/types/models'

// Mock de l'instance Axios
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

describe('stickerService', () => {
  const mockSticker: IUserSticker = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '223e4567-e89b-12d3-a456-426614174000',
    name: 'My Sticker',
    cloudinaryUrl: 'https://res.cloudinary.com/my-sticker.png',
    cloudinaryPublicId: 'my-sticker',
    thumbnailUrl: 'https://res.cloudinary.com/my-sticker-thumb.png',
    tags: ['nature', 'animals'],
    isPublic: false,
    usageCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchStickerLibrary', () => {
    it('should fetch user sticker library', async () => {
      const mockStickers = [mockSticker]

      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockStickers
      })

      const result = await stickerService.fetchStickerLibrary()

      expect(apiClient.get).toHaveBeenCalledWith('/user-library/stickers')
      expect(result).toEqual(mockStickers)
      expect(result).toHaveLength(1)
    })

    it('should return empty array if no stickers', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: []
      })

      const result = await stickerService.fetchStickerLibrary()

      expect(result).toEqual([])
    })

    it('should throw error on fetch failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      })

      await expect(stickerService.fetchStickerLibrary()).rejects.toThrow()
    })
  })

  describe('uploadStickerToLibrary', () => {
    it('should upload sticker with name and tags', async () => {
      const file = new File(['test'], 'sticker.png', { type: 'image/png' })
      const name = 'My Sticker'
      const tags = ['nature', 'animals']
      const progressCallback = vi.fn()

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockSticker
      })

      const result = await stickerService.uploadStickerToLibrary(
        file,
        name,
        tags,
        progressCallback
      )

      expect(apiClient.post).toHaveBeenCalled()
      expect(result).toEqual(mockSticker)
    })

    it('should upload sticker without tags', async () => {
      const file = new File(['test'], 'sticker.png', { type: 'image/png' })
      const name = 'My Sticker'

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockSticker
      })

      const result = await stickerService.uploadStickerToLibrary(file, name)

      expect(apiClient.post).toHaveBeenCalled()
      expect(result).toEqual(mockSticker)
    })

    it('should throw error on upload failure', async () => {
      const file = new File(['test'], 'sticker.png', { type: 'image/png' })

      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 413,
          data: { message: 'File too large' }
        }
      })

      await expect(
        stickerService.uploadStickerToLibrary(file, 'My Sticker')
      ).rejects.toThrow()
    })
  })

  describe('updateStickerMetadata', () => {
    it('should rename a sticker', async () => {
      const stickerId = mockSticker.id
      const newName = 'Updated Name'
      const updatedSticker = { ...mockSticker, name: newName }

      vi.mocked(apiClient.patch).mockResolvedValue({
        data: updatedSticker
      })

      const result = await stickerService.updateStickerMetadata(stickerId, newName)

      expect(apiClient.patch).toHaveBeenCalledWith(
        `/user-library/stickers/${stickerId}`,
        { newName }
      )
      expect(result.name).toBe(newName)
    })

    it('should update sticker tags', async () => {
      const stickerId = mockSticker.id
      const newTags = ['updated', 'tags']
      const updatedSticker = { ...mockSticker, tags: newTags }

      vi.mocked(apiClient.patch).mockResolvedValue({
        data: updatedSticker
      })

      const result = await stickerService.updateStickerMetadata(stickerId, undefined, newTags)

      expect(apiClient.patch).toHaveBeenCalledWith(
        `/user-library/stickers/${stickerId}`,
        { newTags }
      )
      expect(result.tags).toEqual(newTags)
    })

    it('should update both name and tags', async () => {
      const stickerId = mockSticker.id
      const newName = 'Updated Name'
      const newTags = ['updated', 'tags']
      const updatedSticker = { ...mockSticker, name: newName, tags: newTags }

      vi.mocked(apiClient.patch).mockResolvedValue({
        data: updatedSticker
      })

      const result = await stickerService.updateStickerMetadata(stickerId, newName, newTags)

      expect(apiClient.patch).toHaveBeenCalledWith(
        `/user-library/stickers/${stickerId}`,
        { newName, newTags }
      )
      expect(result.name).toBe(newName)
      expect(result.tags).toEqual(newTags)
    })

    it('should throw error on update failure', async () => {
      vi.mocked(apiClient.patch).mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Sticker not found' }
        }
      })

      await expect(
        stickerService.updateStickerMetadata('nonexistent', 'New Name')
      ).rejects.toThrow()
    })
  })

  describe('deleteStickerFromLibrary', () => {
    it('should delete a sticker', async () => {
      const stickerId = mockSticker.id

      vi.mocked(apiClient.delete).mockResolvedValue({})

      await stickerService.deleteStickerFromLibrary(stickerId)

      expect(apiClient.delete).toHaveBeenCalledWith(`/user-library/stickers/${stickerId}`)
    })

    it('should throw error on deletion failure', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Sticker not found' }
        }
      })

      await expect(
        stickerService.deleteStickerFromLibrary('nonexistent')
      ).rejects.toThrow()
    })
  })
})
