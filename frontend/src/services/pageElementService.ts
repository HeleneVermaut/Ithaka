/**
 * Frontend API service for page element operations (US04)
 *
 * Provides typed functions for all CRUD operations on page elements,
 * including text, images, shapes, emojis, and stickers.
 *
 * All functions use the centralized Axios instance with automatic
 * authentication via httpOnly cookies.
 *
 * @module services/pageElementService
 */

import api from './api'
import type {
  IPageElement,
  IPageElementInput,
  IPageElementUpdate,
} from '@/types/models'

/**
 * API response wrapper for single page element operations
 *
 * Standard response format used by the backend for element endpoints.
 */
interface PageElementApiResponse {
  /** Indicates success of the operation */
  success: boolean

  /** The element data (created, updated, or fetched) */
  data: IPageElement
}

/**
 * API response wrapper for page element list operations
 *
 * Standard response format used by the backend for listing elements.
 */
interface PageElementsListApiResponse {
  /** Indicates success of the operation */
  success: boolean

  /** Response data containing elements and count */
  data: {
    /** Array of page elements */
    elements: IPageElement[]

    /** Total count of elements on the page */
    total: number
  }
}

/**
 * Fetch all page elements for a specific page
 *
 * Retrieves non-deleted elements from a page, ordered by z-index.
 * This is typically used when loading a page for editing.
 *
 * @async
 * @param {string} pageId - The ID of the page to fetch elements for
 * @returns {Promise<IPageElement[]>} Array of page elements
 * @throws {AxiosError} If the page does not exist or user lacks permission
 *
 * @example
 * const elements = await fetchPageElements(pageId);
 * console.log(`Loaded ${elements.length} elements`);
 *
 * @route GET /api/page-elements?pageId=:pageId
 * @auth Required (JWT via cookie)
 * @status 200 Success
 * @status 403 Forbidden - User doesn't own the page
 * @status 404 Not Found - Page doesn't exist
 */
export async function fetchPageElements(pageId: string): Promise<IPageElement[]> {
  try {
    const response = await api.get<PageElementsListApiResponse>(
      `/page-elements?pageId=${pageId}`
    )
    return response.data.data.elements || []
  } catch (error) {
    console.error(`Failed to fetch page elements for page ${pageId}:`, error)
    throw error
  }
}

/**
 * Fetch a single page element by its ID
 *
 * Retrieves the complete element data including all properties,
 * content, and styling.
 *
 * @async
 * @param {string} elementId - The ID of the element to fetch
 * @returns {Promise<IPageElement>} The complete element object
 * @throws {AxiosError} If element not found or user lacks permission
 *
 * @example
 * const element = await fetchPageElement(elementId);
 * console.log(`Element type: ${element.type}`);
 *
 * @route GET /api/page-elements/:id
 * @auth Required (JWT via cookie)
 * @status 200 Success
 * @status 404 Not Found - Element doesn't exist
 */
export async function fetchPageElement(elementId: string): Promise<IPageElement> {
  try {
    const response = await api.get<PageElementApiResponse>(
      `/page-elements/${elementId}`
    )
    return response.data.data
  } catch (error) {
    console.error(`Failed to fetch page element ${elementId}:`, error)
    throw error
  }
}

/**
 * Create a new page element
 *
 * Adds a new element to a page with the provided properties.
 * The server automatically calculates z-index if not provided.
 *
 * @async
 * @param {IPageElementInput} data - Element creation parameters
 * @returns {Promise<IPageElement>} The created element with server-assigned ID and timestamps
 * @throws {AxiosError} If validation fails or page doesn't exist
 *
 * @example
 * const newElement = await createPageElement({
 *   pageId: 'page-123',
 *   type: 'text',
 *   x: 50,
 *   y: 75,
 *   width: 200,
 *   height: 100,
 *   content: {
 *     text: 'Hello World',
 *     fontFamily: 'Arial',
 *     fontSize: 16,
 *     fill: '#000000'
 *   }
 * });
 *
 * @route POST /api/page-elements
 * @auth Required (JWT via cookie)
 * @status 201 Created
 * @status 400 Bad Request - Invalid input data
 * @status 403 Forbidden - User doesn't own the page
 * @status 404 Not Found - Page doesn't exist
 */
export async function createPageElement(
  data: IPageElementInput
): Promise<IPageElement> {
  try {
    const response = await api.post<PageElementApiResponse>(
      '/page-elements',
      data
    )
    return response.data.data
  } catch (error) {
    console.error('Failed to create page element:', error)
    throw error
  }
}

/**
 * Update an existing page element
 *
 * Partially updates specified fields of an element (PATCH semantics).
 * Only provided fields are modified; omitted fields remain unchanged.
 *
 * @async
 * @param {string} elementId - The ID of the element to update
 * @param {IPageElementUpdate} updates - Partial element updates
 * @returns {Promise<IPageElement>} The updated element
 * @throws {AxiosError} If element not found, validation fails, or user lacks permission
 *
 * @example
 * // Move and rotate element
 * const updated = await updatePageElement(elementId, {
 *   x: 100,
 *   y: 150,
 *   rotation: 45,
 *   zIndex: 5
 * });
 *
 * // Update only text content
 * const updated = await updatePageElement(elementId, {
 *   content: {
 *     ...element.content,
 *     text: 'Updated text'
 *   }
 * });
 *
 * @route PATCH /api/page-elements/:id
 * @auth Required (JWT via cookie)
 * @status 200 Success
 * @status 400 Bad Request - Invalid update data
 * @status 404 Not Found - Element doesn't exist
 */
export async function updatePageElement(
  elementId: string,
  updates: IPageElementUpdate
): Promise<IPageElement> {
  try {
    const response = await api.patch<PageElementApiResponse>(
      `/page-elements/${elementId}`,
      updates
    )
    return response.data.data
  } catch (error) {
    console.error(`Failed to update page element ${elementId}:`, error)
    throw error
  }
}

/**
 * Delete (soft-delete) a page element
 *
 * Marks an element as deleted without removing it from the database.
 * Allows element recovery via the restore endpoint.
 *
 * @async
 * @param {string} elementId - The ID of the element to delete
 * @returns {Promise<void>}
 * @throws {AxiosError} If element not found or already deleted
 *
 * @example
 * await deletePageElement(elementId);
 * // Element is now hidden and can be restored
 *
 * @route DELETE /api/page-elements/:id
 * @auth Required (JWT via cookie)
 * @status 204 No Content - Successfully deleted
 * @status 404 Not Found - Element doesn't exist
 */
export async function deletePageElement(elementId: string): Promise<void> {
  try {
    await api.delete(`/page-elements/${elementId}`)
  } catch (error) {
    console.error(`Failed to delete page element ${elementId}:`, error)
    throw error
  }
}

/**
 * Delete multiple page elements (batch delete for multi-select)
 *
 * Soft-deletes multiple elements in one operation.
 * Useful for bulk deletion after multi-select (Ctrl+Click).
 *
 * @async
 * @param {string[]} elementIds - Array of element IDs to delete
 * @returns {Promise<void>}
 * @throws {AxiosError} If any element not found or other error occurs
 *
 * @example
 * await deletePageElements(['id1', 'id2', 'id3']);
 * // All three elements are now marked as deleted
 *
 * @route DELETE /api/page-elements with query parameter
 * @auth Required (JWT via cookie)
 * @status 204 No Content - All elements deleted
 * @status 400 Bad Request - Invalid element IDs
 * @status 404 Not Found - One or more elements don't exist
 */
export async function deletePageElements(elementIds: string[]): Promise<void> {
  if (elementIds.length === 0) {
    console.warn('No element IDs provided for batch delete')
    return
  }

  try {
    // Build query string with comma-separated IDs
    const idsQuery = elementIds.join(',')
    await api.delete(`/page-elements?ids=${idsQuery}`)
  } catch (error) {
    console.error(`Failed to delete page elements ${elementIds.join(',')}:`, error)
    throw error
  }
}

/**
 * Duplicate a page element with optional offset
 *
 * Creates an exact copy of an element on the same page with a position offset.
 * Useful for creating variations or multiple instances of the same element.
 *
 * @async
 * @param {string} elementId - The ID of the element to duplicate
 * @param {object} [offset] - Optional position offset in millimeters
 * @param {number} [offset.x=20] - Horizontal offset (default: 20mm)
 * @param {number} [offset.y=20] - Vertical offset (default: 20mm)
 * @returns {Promise<IPageElement>} The newly created duplicate element
 * @throws {AxiosError} If element not found or validation fails
 *
 * @example
 * // Duplicate with default offset
 * const duplicate = await duplicatePageElement(elementId);
 *
 * // Duplicate with custom offset
 * const duplicate = await duplicatePageElement(elementId, {
 *   x: 50,
 *   y: 30
 * });
 *
 * @route POST /api/page-elements/:id/duplicate
 * @auth Required (JWT via cookie)
 * @status 201 Created
 * @status 404 Not Found - Element doesn't exist
 */
export async function duplicatePageElement(
  elementId: string,
  offset?: { x?: number; y?: number }
): Promise<IPageElement> {
  try {
    const response = await api.post<PageElementApiResponse>(
      `/page-elements/${elementId}/duplicate`,
      { offset }
    )
    return response.data.data
  } catch (error) {
    console.error(`Failed to duplicate page element ${elementId}:`, error)
    throw error
  }
}

/**
 * Restore a previously deleted page element
 *
 * Restores a soft-deleted element by clearing its deletion timestamp.
 * The element becomes visible again and fully editable.
 *
 * @async
 * @param {string} elementId - The ID of the element to restore
 * @returns {Promise<IPageElement>} The restored element
 * @throws {AxiosError} If element not found or not deleted
 *
 * @example
 * const restored = await restorePageElement(elementId);
 * // Element is now visible on the canvas again
 *
 * @route POST /api/page-elements/:id/restore
 * @auth Required (JWT via cookie)
 * @status 200 Success
 * @status 404 Not Found - Element doesn't exist
 * @status 400 Bad Request - Element not deleted
 */
export async function restorePageElement(elementId: string): Promise<IPageElement> {
  try {
    const response = await api.post<PageElementApiResponse>(
      `/page-elements/${elementId}/restore`
    )
    return response.data.data
  } catch (error) {
    console.error(`Failed to restore page element ${elementId}:`, error)
    throw error
  }
}

/**
 * Update the z-index (stacking order) of a page element
 *
 * Changes the visual stacking order of an element on the canvas.
 * Lower values appear behind, higher values appear in front.
 *
 * @async
 * @param {string} elementId - The ID of the element
 * @param {number} newZIndex - The new z-index value (0-999)
 * @returns {Promise<IPageElement>} The updated element
 * @throws {AxiosError} If z-index is invalid or element not found
 *
 * @example
 * // Bring element to front
 * await updateElementZIndex(elementId, 999);
 *
 * // Send element to back
 * await updateElementZIndex(elementId, 0);
 *
 * @route PATCH /api/page-elements/:id
 * @auth Required (JWT via cookie)
 * @status 200 Success
 * @status 400 Bad Request - Invalid z-index
 * @status 404 Not Found - Element doesn't exist
 */
export async function updateElementZIndex(
  elementId: string,
  newZIndex: number
): Promise<IPageElement> {
  try {
    const response = await api.patch<PageElementApiResponse>(
      `/page-elements/${elementId}`,
      { zIndex: newZIndex }
    )
    return response.data.data
  } catch (error) {
    console.error(
      `Failed to update z-index for page element ${elementId}:`,
      error
    )
    throw error
  }
}

/**
 * Export all service functions as a namespace
 * Provides an alternative import pattern: `import pageElementService from '...'`
 */
export default {
  fetchPageElements,
  fetchPageElement,
  createPageElement,
  updatePageElement,
  deletePageElement,
  deletePageElements,
  duplicatePageElement,
  restorePageElement,
  updateElementZIndex,
}
