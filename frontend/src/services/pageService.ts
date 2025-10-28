/**
 * Page and Element API Service
 *
 * Ce service centralise toutes les communications avec le backend pour :
 * - Gestion des pages (création, lecture, mise à jour, suppression)
 * - Gestion des éléments de page (création batch, mise à jour, suppression)
 *
 * Utilise l'instance Axios configurée (apiClient) qui inclut automatiquement
 * les JWT tokens via les cookies httpOnly.
 *
 * @module services/pageService
 */

import apiClient from './api'
import type {
  IPage,
  IPageElement,
  IPageElementCreateRequest,
  IPageElementUpdateRequest,
  BatchElementsResponse,
} from '@/types/models'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

/**
 * Type pour les réponses standardisées du backend
 */
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Récupère toutes les pages d'un notebook
 *
 * @param {string} notebookId - ID du notebook
 * @returns {Promise<IPage[]>} Array de pages triées par pageNumber
 * @throws {Error} Si la requête échoue
 *
 * @example
 * const pages = await pageService.fetchNotebookPages('notebook-123');
 * console.log(pages); // [{ id: '...', pageNumber: 1, ... }, ...]
 */
export const fetchNotebookPages = async (notebookId: string): Promise<IPage[]> => {
  try {
    const response = await apiClient.get<ApiResponse<IPage[]>>(
      `/notebooks/${notebookId}/pages`
    )

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch pages')
    }

    return response.data.data
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to fetch pages')
    console.error('fetchNotebookPages error:', message)
    throw new Error(message)
  }
}

/**
 * Crée une nouvelle page dans un notebook
 *
 * @param {string} notebookId - ID du notebook parent
 * @param {Object} pageData - Données de création
 * @param {number} pageData.pageNumber - Numéro de page séquentiel
 * @param {boolean} [pageData.isCustomCover] - Est-ce une couverture personnalisée
 * @returns {Promise<IPage>} Page créée avec son ID généré
 * @throws {Error} Si la requête échoue (400 validation, 401 non authentifié, 404 notebook not found)
 *
 * @example
 * const page = await pageService.createPage('notebook-123', { pageNumber: 1 });
 * console.log(page.id); // UUID généré par le backend
 */
export const createPage = async (
  notebookId: string,
  pageData: { pageNumber: number; isCustomCover?: boolean }
): Promise<IPage> => {
  try {
    const response = await apiClient.post<ApiResponse<IPage>>(
      `/notebooks/${notebookId}/pages`,
      pageData
    )

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create page')
    }

    return response.data.data
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to create page')
    console.error('createPage error:', message)
    throw new Error(message)
  }
}

/**
 * Récupère les détails d'une page spécifique
 *
 * @param {string} pageId - ID de la page
 * @returns {Promise<IPage>} Objet page complet
 * @throws {Error} Si la requête échoue (401 non authentifié, 404 page not found)
 *
 * @example
 * const page = await pageService.fetchPageDetails('page-456');
 * console.log(page.pageNumber); // 1
 */
export const fetchPageDetails = async (pageId: string): Promise<IPage> => {
  try {
    const response = await apiClient.get<ApiResponse<IPage>>(
      `/pages/${pageId}`
    )

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch page details')
    }

    return response.data.data
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to fetch page details')
    console.error('fetchPageDetails error:', message)
    throw new Error(message)
  }
}

/**
 * Met à jour les métadonnées d'une page
 *
 * @param {string} pageId - ID de la page
 * @param {Partial<IPage>} updates - Champs à mettre à jour
 * @returns {Promise<IPage>} Page mise à jour
 * @throws {Error} Si la requête échoue (400 validation, 401, 404)
 *
 * @example
 * const updated = await pageService.updatePage('page-456', { pageNumber: 2, isCustomCover: true });
 */
export const updatePage = async (
  pageId: string,
  updates: Partial<IPage>
): Promise<IPage> => {
  try {
    const response = await apiClient.put<ApiResponse<IPage>>(
      `/pages/${pageId}`,
      updates
    )

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update page')
    }

    return response.data.data
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to update page')
    console.error('updatePage error:', message)
    throw new Error(message)
  }
}

/**
 * Supprime une page
 *
 * @param {string} pageId - ID de la page
 * @returns {Promise<void>}
 * @throws {Error} Si la requête échoue (401, 404)
 *
 * @example
 * await pageService.deletePage('page-456');
 */
export const deletePage = async (pageId: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/pages/${pageId}`
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete page')
    }
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to delete page')
    console.error('deletePage error:', message)
    throw new Error(message)
  }
}

/**
 * Récupère tous les éléments d'une page
 *
 * @param {string} pageId - ID de la page
 * @returns {Promise<IPageElement[]>} Array d'éléments triés par zIndex
 * @throws {Error} Si la requête échoue (401, 404)
 *
 * @example
 * const elements = await pageService.fetchPageElements('page-456');
 * console.log(elements); // [{ id: '...', type: 'text', zIndex: 0, ... }, ...]
 */
export const fetchPageElements = async (pageId: string): Promise<IPageElement[]> => {
  try {
    const response = await apiClient.get<ApiResponse<IPageElement[]>>(
      `/pages/${pageId}/elements`
    )

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch page elements')
    }

    return response.data.data
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to fetch page elements')
    console.error('fetchPageElements error:', message)
    throw new Error(message)
  }
}

/**
 * Sauvegarde un batch d'éléments (création et mise à jour combinées)
 *
 * Les éléments SANS champ 'id' sont créés
 * Les éléments AVEC champ 'id' sont mis à jour
 *
 * @param {string} pageId - ID de la page
 * @param {IPageElementCreateRequest[]} elements - Array d'éléments
 * @returns {Promise<BatchElementsResponse>} Nombre d'éléments créés et mis à jour
 * @throws {Error} Si la requête échoue (400 validation, 401, 404)
 *
 * @example
 * const result = await pageService.saveElements('page-456', [
 *   { type: 'text', x: 10, y: 10, width: 100, height: 50, content: {...} },
 *   { id: 'existing-id', x: 20, y: 20 }
 * ]);
 * console.log(result); // { created: 1, updated: 1 }
 */
export const saveElements = async (
  pageId: string,
  elements: IPageElementCreateRequest[]
): Promise<BatchElementsResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<BatchElementsResponse>>(
      `/pages/${pageId}/elements`,
      elements
    )

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to save elements')
    }

    return response.data.data
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to save elements')
    console.error('saveElements error:', message)
    throw new Error(message)
  }
}

/**
 * Met à jour un élément spécifique
 *
 * @param {string} elementId - ID de l'élément
 * @param {IPageElementUpdateRequest} updates - Champs à mettre à jour
 * @returns {Promise<IPageElement>} Élément mis à jour
 * @throws {Error} Si la requête échoue (400 validation, 401, 404)
 *
 * @example
 * const updated = await pageService.updateElement('element-789', { x: 15, y: 15, zIndex: 2 });
 */
export const updateElement = async (
  elementId: string,
  updates: IPageElementUpdateRequest
): Promise<IPageElement> => {
  try {
    const response = await apiClient.put<ApiResponse<IPageElement>>(
      `/elements/${elementId}`,
      updates
    )

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update element')
    }

    return response.data.data
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to update element')
    console.error('updateElement error:', message)
    throw new Error(message)
  }
}

/**
 * Supprime un élément (soft delete)
 *
 * @param {string} elementId - ID de l'élément
 * @returns {Promise<void>}
 * @throws {Error} Si la requête échoue (401, 404)
 *
 * @example
 * await pageService.deleteElement('element-789');
 */
export const deleteElement = async (elementId: string): Promise<void> => {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/elements/${elementId}`
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete element')
    }
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to delete element')
    console.error('deleteElement error:', message)
    throw new Error(message)
  }
}

/**
 * Utility: Extrait un message d'erreur d'une exception Axios
 *
 * @param {unknown} error - Exception d'Axios ou autre erreur
 * @param {string} defaultMessage - Message par défaut si aucun détail trouvé
 * @returns {string} Message d'erreur lisible
 * @private
 */
function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    // Erreur Axios
    if ('response' in error && typeof error.response === 'object' && error.response !== null) {
      const response = error.response as any
      if (response.data?.error) {
        return response.data.error
      }
    }
    // Message d'erreur standard
    if (error.message) {
      return error.message
    }
  }
  return defaultMessage
}

/**
 * Export de tous les services de page
 */
export default {
  fetchNotebookPages,
  createPage,
  fetchPageDetails,
  updatePage,
  deletePage,
  fetchPageElements,
  saveElements,
  updateElement,
  deleteElement,
}
