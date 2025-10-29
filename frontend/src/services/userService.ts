/**
 * User Service - API client for user profile and saved texts operations
 *
 * This service centralizes all HTTP requests related to user profile management
 * and saved text library operations. It uses the centralized Axios instance
 * configured with authentication, error handling, and request/response logging.
 *
 * All methods are properly typed with TypeScript and use the ISavedText interface
 * for type safety and IDE autocompletion.
 *
 * Features:
 * - Fetch saved texts from user's library
 * - Create new saved text (save to library)
 * - Update existing saved text
 * - Delete saved text from library
 * - All requests include JWT tokens via httpOnly cookies (automatically)
 * - Centralized error handling via Axios interceptors
 *
 * Usage:
 * ```typescript
 * import userService from '@/services/userService'
 *
 * // Fetch all saved texts
 * const texts = await userService.fetchSavedTexts()
 *
 * // Save new text
 * const newText = await userService.saveText({
 *   label: 'My Quote',
 *   type: 'citation',
 *   content: { ... }
 * })
 * ```
 *
 * @module services/userService
 */

import apiClient from './api'
import type { ISavedText } from '@/types/models'

/**
 * Type for creating/saving a new text (omits auto-generated fields)
 */
type SaveTextData = Omit<ISavedText, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Type for partial updates to existing text
 */
type UpdateTextData = Partial<Omit<ISavedText, 'id' | 'createdAt' | 'updatedAt'>>

/**
 * API Response for saved text operations
 */
interface SavedTextResponse {
  success: boolean
  message: string
  data: ISavedText
}

/**
 * API Response for saved texts list
 */
interface SavedTextsResponse {
  success: boolean
  message: string
  data: ISavedText[]
}

/**
 * API Response for delete operation
 */
interface DeleteResponse {
  success: boolean
  message: string
}

/**
 * User Service - handles all user-related API operations
 */
const userService = {
  /**
   * Fetch all saved texts for authenticated user
   *
   * Retrieves all texts from the user's saved text library.
   * Each text contains formatting information (font, size, color, alignment, etc.)
   * for reuse in page elements.
   *
   * Endpoint: GET /api/users/saved-texts
   * Status: 200 OK if successful, 401 if unauthorized, 500 if server error
   *
   * @returns Promise<ISavedText[]> - Array of saved texts with all formatting info
   * @throws AxiosError if request fails (handled by global interceptor)
   *
   * @example
   * ```typescript
   * try {
   *   const texts = await userService.fetchSavedTexts()
   *   console.log('Found', texts.length, 'saved texts')
   *   // texts[0] => {
   *   //   id: 'uuid-123',
   *   //   label: 'My Citation',
   *   //   type: 'citation',
   *   //   content: { text: '...', fontFamily: 'Arial', fontSize: 14, fill: '#000' },
   *   //   createdAt: '2025-01-15T10:30:00Z',
   *   //   updatedAt: '2025-01-15T10:30:00Z'
   *   // }
   * } catch (err) {
   *   if (err.response?.status === 401) {
   *     console.error('User not authenticated')
   *   } else {
   *     console.error('Failed to fetch saved texts:', err.message)
   *   }
   * }
   * ```
   */
  async fetchSavedTexts(): Promise<ISavedText[]> {
    try {
      const response = await apiClient.get<SavedTextsResponse>('/users/saved-texts')

      // Return the array of saved texts from response data
      if (response.data && response.data.data) {
        return response.data.data
      }

      // Fallback to empty array if structure is unexpected
      console.warn('Unexpected response structure for fetchSavedTexts')
      return []
    } catch (error) {
      console.error('Error fetching saved texts:', error)
      throw error
    }
  },

  /**
   * Create and save new text to user's library
   *
   * Saves a new text entry to the user's text library with all formatting information.
   * The text includes properties like label, type (citation/poem/free), and complete
   * formatting details (font family, size, color, alignment, etc.).
   *
   * Endpoint: POST /api/users/saved-texts
   * Status: 201 Created if successful, 400 if validation fails, 401 if unauthorized
   *
   * @param textData - Text content and formatting info (label, type, content)
   *   - label: Text identifier/title (max 100 chars)
   *   - type: 'citation' | 'poeme' | 'libre'
   *   - content: ITextContent with formatting (text, fontFamily, fontSize, fill, etc.)
   *
   * @returns Promise<ISavedText> - Created text with generated id and timestamps
   * @throws AxiosError if request fails (validation or server error)
   *
   * @example
   * ```typescript
   * try {
   *   const newText = await userService.saveText({
   *     label: 'My Favorite Quote',
   *     type: 'citation',
   *     content: {
   *       text: 'The only way to do great work...',
   *       fontFamily: 'Georgia',
   *       fontSize: 16,
   *       fill: '#333333',
   *       textAlign: 'center',
   *       fontWeight: 'bold'
   *     }
   *   })
   *   console.log('Text saved with ID:', newText.id)
   * } catch (err) {
   *   if (err.response?.status === 400) {
   *     console.error('Validation failed:', err.response.data.message)
   *   } else {
   *     console.error('Failed to save text:', err.message)
   *   }
   * }
   * ```
   */
  async saveText(textData: SaveTextData): Promise<ISavedText> {
    try {
      const response = await apiClient.post<SavedTextResponse>('/users/saved-texts', textData)

      // Return the created text with id and timestamps
      if (response.data && response.data.data) {
        return response.data.data
      }

      throw new Error('Unexpected response structure from saveText')
    } catch (error) {
      console.error('Error saving text:', error)
      throw error
    }
  },

  /**
   * Update existing saved text
   *
   * Modifies an existing text entry in the user's library. Only provided fields
   * are updated (partial update). The backend validates all changes and prevents
   * unauthorized modifications.
   *
   * Endpoint: PUT /api/users/saved-texts/:id
   * Status: 200 OK if successful, 404 if text not found, 401 if unauthorized
   *
   * @param textId - UUID of the text to update
   * @param updates - Fields to modify (all optional)
   *   - label?: New text identifier
   *   - type?: New type (citation/poem/free)
   *   - content?: Updated formatting info
   *
   * @returns Promise<ISavedText> - Updated text with new timestamps
   * @throws AxiosError if text not found (404), unauthorized (401), or server error
   *
   * @example
   * ```typescript
   * try {
   *   const updated = await userService.updateText(textId, {
   *     label: 'Updated Quote Title',
   *     content: {
   *       ...existingContent,
   *       fontSize: 18  // Change only font size
   *     }
   *   })
   *   console.log('Text updated, new timestamp:', updated.updatedAt)
   * } catch (err) {
   *   if (err.response?.status === 404) {
   *     console.error('Text not found')
   *   } else if (err.response?.status === 401) {
   *     console.error('Unauthorized - not your text')
   *   } else {
   *     console.error('Failed to update text:', err.message)
   *   }
   * }
   * ```
   */
  async updateText(textId: string, updates: UpdateTextData): Promise<ISavedText> {
    try {
      const response = await apiClient.put<SavedTextResponse>(
        `/users/saved-texts/${textId}`,
        updates
      )

      // Return the updated text
      if (response.data && response.data.data) {
        return response.data.data
      }

      throw new Error('Unexpected response structure from updateText')
    } catch (error) {
      console.error('Error updating text:', error)
      throw error
    }
  },

  /**
   * Delete saved text from user's library
   *
   * Removes a text entry from the user's library. Once deleted, the text cannot
   * be recovered. The backend verifies ownership before deletion.
   *
   * Endpoint: DELETE /api/users/saved-texts/:id
   * Status: 204 No Content if successful, 404 if text not found, 401 if unauthorized
   *
   * @param textId - UUID of the text to delete
   * @returns Promise<void> - Resolves when deletion is complete
   * @throws AxiosError if text not found (404), unauthorized (401), or server error
   *
   * @example
   * ```typescript
   * try {
   *   await userService.deleteText(textId)
   *   console.log('Text deleted successfully')
   * } catch (err) {
   *   if (err.response?.status === 404) {
   *     console.error('Text not found - already deleted?')
   *   } else if (err.response?.status === 401) {
   *     console.error('Unauthorized - not your text')
   *   } else {
   *     console.error('Failed to delete text:', err.message)
   *   }
   * }
   * ```
   */
  async deleteText(textId: string): Promise<void> {
    try {
      await apiClient.delete<DeleteResponse>(`/users/saved-texts/${textId}`)

      // Deletion successful - no response body (204 No Content)
      console.debug('Text deleted successfully:', textId)
    } catch (error) {
      console.error('Error deleting text:', error)
      throw error
    }
  }
}

export default userService
