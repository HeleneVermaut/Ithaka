/**
 * Frontend API service for sticker library operations (US04)
 *
 * Provides typed functions for:
 * - Fetching user's sticker library with pagination and filtering
 * - Uploading new stickers to the library
 * - Updating sticker metadata (name and tags)
 * - Deleting stickers from the library
 *
 * All uploads support progress tracking callbacks for UI feedback.
 *
 * @module services/stickerService
 */

import api from './api'
import type {
  IUserSticker,
  IStickerLibraryListResponse,
  IStickerLibraryFilters,
} from '@/types/sticker'
import type { UploadProgressCallback } from './mediaService'

/**
 * API response wrapper for single sticker operations
 */
interface StickerApiResponse {
  /** Indicates success of the operation */
  success: boolean

  /** The sticker data */
  data: IUserSticker
}

/**
 * API response wrapper for sticker library list operations
 */
interface StickerLibraryApiResponse {
  /** Indicates success of the operation */
  success: boolean

  /** The sticker library data with pagination */
  data: IStickerLibraryListResponse
}

/**
 * Fetch user's sticker library with optional filtering and pagination
 *
 * Retrieves all stickers owned by the authenticated user with support
 * for filtering by tags and public/private status, sorting, and pagination.
 *
 * @async
 * @param {IStickerLibraryFilters} [filters] - Optional filtering, sorting, and pagination options
 * @returns {Promise<IStickerLibraryListResponse>} Paginated list of stickers
 * @throws {AxiosError} If database query fails
 *
 * @example
 * // Get all stickers (default: 20 per page, sorted by creation date DESC)
 * const result = await fetchStickerLibrary();
 *
 * // Get stickers with filters
 * const filtered = await fetchStickerLibrary({
 *   tags: 'nature,animal',
 *   sortBy: 'name',
 *   order: 'ASC',
 *   page: 1,
 *   limit: 20
 * });
 * console.log(`Found ${filtered.pagination.total} stickers`);
 *
 * @route GET /api/user-library/stickers
 * @auth Required (JWT via cookie)
 * @status 200 Success
 * @status 400 Bad Request - Invalid query parameters
 */
export async function fetchStickerLibrary(
  filters?: IStickerLibraryFilters
): Promise<IStickerLibraryListResponse> {
  try {
    const params = new URLSearchParams()

    if (filters?.tags) {
      params.append('tags', filters.tags)
    }
    if (filters?.isPublic !== undefined) {
      params.append('isPublic', String(filters.isPublic))
    }
    if (filters?.sortBy) {
      params.append('sortBy', filters.sortBy)
    }
    if (filters?.order) {
      params.append('order', filters.order)
    }
    if (filters?.page) {
      params.append('page', String(filters.page))
    }
    if (filters?.limit) {
      params.append('limit', String(filters.limit))
    }

    const url = `/user-library/stickers${params.toString() ? '?' + params.toString() : ''}`
    const response = await api.get<StickerLibraryApiResponse>(url)
    return response.data.data
  } catch (error) {
    console.error('Failed to fetch sticker library:', error)
    throw error
  }
}

/**
 * Upload a new sticker to the user's library
 *
 * Uploads the sticker image file as multipart FormData to the server,
 * which uploads it to Cloudinary and creates a UserSticker record.
 *
 * New stickers are private by default and must be manually made public.
 * Supports upload progress tracking for display UI feedback.
 *
 * @async
 * @param {File} file - Sticker image file (JPEG, PNG, or SVG)
 * @param {string} name - User-friendly name (1-100 characters)
 * @param {string[]} [tags] - Optional tags for organization (max 10 tags, 1-30 chars each)
 * @param {UploadProgressCallback} [onProgress] - Optional callback to track upload progress (0-100)
 * @returns {Promise<IUserSticker>} The created sticker with metadata
 * @throws {AxiosError} If file validation fails, name invalid, or upload fails
 *
 * @example
 * const file = new File([...], 'my-sticker.png', { type: 'image/png' });
 * const sticker = await uploadStickerToLibrary(
 *   file,
 *   'My Awesome Sticker',
 *   ['custom', 'favorite'],
 *   (percent) => console.log(`Upload: ${percent}%`)
 * );
 * console.log(`Sticker saved: ${sticker.id}`);
 *
 * @route POST /api/user-library/stickers
 * @auth Required (JWT via cookie)
 * @status 201 Created
 * @status 400 Bad Request - Invalid file or name
 * @status 413 Payload Too Large - File exceeds 10 MB
 */
export async function uploadStickerToLibrary(
  file: File,
  name: string,
  tags?: string[],
  onProgress?: UploadProgressCallback
): Promise<IUserSticker> {
  try {
    // Create FormData for multipart upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)

    // Add tags if provided
    if (tags && tags.length > 0) {
      tags.forEach((tag) => {
        formData.append('tags', tag)
      })
    }

    // Upload with progress tracking
    const response = await api.post<StickerApiResponse>(
      '/user-library/stickers',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            // Calculate percentage completed
            const percentCompleted = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            )
            // Call callback if provided
            onProgress?.(percentCompleted)
          }
        },
      }
    )

    return response.data.data
  } catch (error) {
    console.error('Failed to upload sticker to library:', error)
    throw error
  }
}

/**
 * Update sticker name and/or tags
 *
 * Renames a sticker and/or updates its tags for better organization.
 *
 * @async
 * @param {string} stickerId - The ID of the sticker to update
 * @param {string} [newName] - New name for the sticker (1-100 characters)
 * @param {string[]} [newTags] - New tags (max 10 tags, 1-30 chars each)
 * @returns {Promise<IUserSticker>} The updated sticker
 * @throws {AxiosError} If sticker not found, name invalid, or user not authorized
 *
 * @example
 * const updated = await updateStickerMetadata(
 *   stickerId,
 *   'Updated Sticker Name',
 *   ['updated', 'tags']
 * );
 *
 * @route PATCH /api/user-library/stickers/:id
 * @auth Required (JWT via cookie)
 * @status 200 Success
 * @status 400 Bad Request - Invalid name or tags
 * @status 403 Forbidden - User doesn't own the sticker
 * @status 404 Not Found - Sticker doesn't exist
 */
export async function updateStickerMetadata(
  stickerId: string,
  newName?: string,
  newTags?: string[]
): Promise<IUserSticker> {
  try {
    const updateData: Record<string, unknown> = {}

    if (newName) {
      updateData.newName = newName
    }

    if (newTags && newTags.length > 0) {
      updateData.newTags = newTags
    }

    const response = await api.patch<StickerApiResponse>(
      `/user-library/stickers/${stickerId}`,
      updateData
    )
    return response.data.data
  } catch (error) {
    console.error(`Failed to update sticker ${stickerId}:`, error)
    throw error
  }
}

/**
 * Delete a sticker from the library
 *
 * Permanently removes a sticker from the user's library and deletes it from
 * Cloudinary. This action cannot be undone.
 *
 * @async
 * @param {string} stickerId - The ID of the sticker to delete
 * @returns {Promise<void>}
 * @throws {AxiosError} If sticker not found or user not authorized
 *
 * @example
 * await deleteStickerFromLibrary(stickerId);
 * console.log('Sticker deleted');
 *
 * @route DELETE /api/user-library/stickers/:id
 * @auth Required (JWT via cookie)
 * @status 204 No Content - Successfully deleted
 * @status 403 Forbidden - User doesn't own the sticker
 * @status 404 Not Found - Sticker doesn't exist
 */
export async function deleteStickerFromLibrary(stickerId: string): Promise<void> {
  try {
    await api.delete(`/user-library/stickers/${stickerId}`)
  } catch (error) {
    console.error(`Failed to delete sticker ${stickerId}:`, error)
    throw error
  }
}

/**
 * Export all sticker service functions as a namespace
 * Provides an alternative import pattern: `import stickerService from '...'`
 */
export default {
  fetchStickerLibrary,
  uploadStickerToLibrary,
  updateStickerMetadata,
  deleteStickerFromLibrary,
}
