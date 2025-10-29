/**
 * Service d'API pour les carnets de voyage (Notebooks)
 *
 * Ce fichier centralise toutes les requêtes HTTP vers les endpoints backend
 * liés aux carnets :
 * - Création, lecture, mise à jour, suppression (CRUD)
 * - Duplication de carnets
 * - Archivage et restauration
 * - Filtrage, recherche, et pagination
 *
 * Toutes les fonctions utilisent l'instance Axios configurée (api.ts)
 * qui gère automatiquement :
 * - L'envoi des cookies httpOnly avec les JWT tokens
 * - Les headers par défaut (Content-Type, Accept)
 * - Les intercepteurs pour le logging en mode debug
 *
 * Convention de nommage :
 * - Fonctions : verbe + sujet en camelCase (ex: createNotebook, getNotebooks)
 * - Paramètres : camelCase (ex: notebookId, filters)
 */

import apiClient from './api'
import type {
  Notebook,
  CreateNotebookDto,
  UpdateNotebookDto,
  NotebookFilters,
  PaginatedNotebooksResponse,
  NotebookWithPermissionsResponse,
} from '@/types/notebook'
import axios, { AxiosError } from 'axios'

// ========================================
// ERROR HANDLING HELPER
// ========================================

/**
 * Gère les erreurs Axios et retourne un message d'erreur utilisateur
 *
 * Cette fonction centralise la gestion des erreurs pour éviter la duplication
 * de code dans chaque fonction d'API. Elle extrait le message d'erreur approprié
 * en fonction du code de statut HTTP et du contexte.
 *
 * @param error - Erreur capturée par try-catch
 * @param defaultMessage - Message par défaut si aucun message spécifique n'est trouvé
 * @returns Message d'erreur formaté pour l'utilisateur
 *
 * @example
 * try {
 *   await apiClient.get('/notebooks/123');
 * } catch (error) {
 *   throw new Error(handleApiError(error, 'Erreur lors de la récupération du carnet'));
 * }
 */
function handleApiError(error: unknown, defaultMessage: string): string {
  // Vérifie si c'est une erreur Axios (requête HTTP)
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: { message?: string } }>

    // 401 Unauthorized - Token expiré ou invalide
    if (axiosError.response?.status === 401) {
      return 'Votre session a expiré. Veuillez vous reconnecter.'
    }

    // 403 Forbidden - Accès refusé (permissions insuffisantes)
    if (axiosError.response?.status === 403) {
      return "Vous n'avez pas les permissions nécessaires pour cette action."
    }

    // 404 Not Found - Ressource introuvable
    if (axiosError.response?.status === 404) {
      return 'Carnet non trouvé. Il a peut-être été supprimé.'
    }

    // 400 Bad Request - Erreur de validation ou de requête
    if (axiosError.response?.status === 400) {
      const errorMessage = axiosError.response.data?.error?.message
      if (errorMessage) {
        return errorMessage
      }
      return 'Données invalides. Veuillez vérifier votre saisie.'
    }

    // 500+ Server Error - Erreur serveur
    if (axiosError.response?.status && axiosError.response.status >= 500) {
      return 'Erreur serveur. Veuillez réessayer plus tard.'
    }

    // Erreur réseau (pas de réponse du serveur)
    if (axiosError.request && !axiosError.response) {
      return 'Connexion perdue. Vérifiez votre connexion internet.'
    }

    // Erreur avec message personnalisé du backend
    if (axiosError.response?.data?.error?.message) {
      return axiosError.response.data.error.message
    }
  }

  // Erreur inconnue ou non-Axios
  return defaultMessage
}

// ========================================
// CREATE NOTEBOOK
// ========================================

/**
 * Crée un nouveau carnet de voyage
 *
 * Cette fonction envoie une requête POST au backend pour créer un nouveau carnet
 * avec les paramètres fournis (titre, description, type, format, orientation).
 *
 * Le backend génère automatiquement :
 * - L'ID unique (UUID)
 * - Le userId (depuis le JWT token)
 * - Le DPI (fixé à 300)
 * - Le pageCount (initialisé à 0)
 * - Le status (initialisé à 'active')
 * - Les timestamps (createdAt, updatedAt)
 * - Les permissions par défaut (private)
 *
 * @param data - Données du carnet à créer
 * @returns Promise résolue avec le carnet créé
 * @throws Error si la création échoue (validation, network, auth)
 *
 * @example
 * try {
 *   const notebook = await createNotebook({
 *     title: 'Mon voyage en Italie',
 *     description: 'Carnet de bord de mon road trip',
 *     type: 'Voyage',
 *     format: 'A4',
 *     orientation: 'portrait'
 *   });
 *   console.log('Carnet créé:', notebook.id);
 * } catch (error) {
 *   console.error('Erreur:', error.message);
 * }
 */
export async function createNotebook(data: CreateNotebookDto): Promise<Notebook> {
  try {
    const response = await apiClient.post('/notebooks', data)

    // Le backend retourne : { success: true, data: {...}, message: '...' }
    return response.data.data
  } catch (error: unknown) {
    throw new Error(handleApiError(error, 'Erreur lors de la création du carnet'))
  }
}

// ========================================
// GET NOTEBOOKS (PAGINATED & FILTERED)
// ========================================

/**
 * Récupère la liste des carnets de l'utilisateur avec filtres et pagination
 *
 * Cette fonction permet de récupérer les carnets avec des options de filtrage,
 * recherche, tri, et pagination. Tous les paramètres sont optionnels.
 *
 * Filtres disponibles :
 * - type : Filtrer par type(s) de carnet ('Voyage,Daily' pour plusieurs)
 * - status : Filtrer par statut (active ou archived)
 * - search : Recherche textuelle dans titre et description
 * - sort : Champ de tri (createdAt, updatedAt, title, pageCount, type)
 * - order : Ordre de tri (ASC ou DESC)
 * - page : Numéro de page (défaut: 1)
 * - limit : Éléments par page (défaut: 10, max: 50)
 *
 * @param filters - Paramètres de filtrage optionnels
 * @returns Promise résolue avec la liste paginée des carnets
 * @throws Error si la récupération échoue
 *
 * @example
 * // Récupérer tous les carnets actifs (défaut)
 * const result = await getNotebooks();
 *
 * // Filtrer les carnets de voyage, triés par date
 * const result = await getNotebooks({
 *   type: 'Voyage',
 *   sort: 'createdAt',
 *   order: 'DESC',
 *   page: 1,
 *   limit: 20
 * });
 *
 * // Rechercher dans les titres
 * const result = await getNotebooks({ search: 'Italie' });
 */
export async function getNotebooks(filters?: NotebookFilters): Promise<PaginatedNotebooksResponse> {
  try {
    // Construire les query params à partir des filtres
    // Axios gère automatiquement la sérialisation en query string
    const params: Record<string, string | number | undefined> = {}

    if (filters?.type) params.type = filters.type
    if (filters?.status) params.status = filters.status
    if (filters?.search) params.search = filters.search
    if (filters?.sort) params.sort = filters.sort
    if (filters?.order) params.order = filters.order
    if (filters?.page) params.page = filters.page
    if (filters?.limit) params.limit = filters.limit

    const response = await apiClient.get('/notebooks', { params })

    // Le backend retourne : { success: true, data: { notebooks: [...], pagination: {...} } }
    return response.data.data
  } catch (error: unknown) {
    throw new Error(handleApiError(error, 'Erreur lors de la récupération des carnets'))
  }
}

// ========================================
// GET ARCHIVED NOTEBOOKS
// ========================================

/**
 * Récupère la liste des carnets archivés de l'utilisateur
 *
 * Cette fonction récupère uniquement les carnets avec status='archived'.
 * Elle est utilisée pour afficher la liste des archives dans l'interface.
 *
 * @param page - Numéro de page (défaut: 1)
 * @param limit - Éléments par page (défaut: 10, max: 50)
 * @returns Promise résolue avec la liste paginée des carnets archivés
 * @throws Error si la récupération échoue
 *
 * @example
 * // Récupérer la première page des archives
 * const result = await getArchivedNotebooks(1, 20);
 * console.log(`${result.pagination.total} carnets archivés`);
 */
export async function getArchivedNotebooks(
  page?: number,
  limit?: number
): Promise<PaginatedNotebooksResponse> {
  try {
    const params: Record<string, number | undefined> = {}

    if (page) params.page = page
    if (limit) params.limit = limit

    const response = await apiClient.get('/notebooks/archived', { params })

    // Le backend retourne : { success: true, data: { notebooks: [...], pagination: {...} } }
    return response.data.data
  } catch (error: unknown) {
    throw new Error(handleApiError(error, 'Erreur lors de la récupération des carnets archivés'))
  }
}

// ========================================
// GET NOTEBOOK BY ID
// ========================================

/**
 * Récupère un carnet par son identifiant avec ses permissions
 *
 * Cette fonction récupère les détails complets d'un carnet, incluant
 * ses paramètres de partage (NotebookPermissions).
 *
 * Le carnet doit appartenir à l'utilisateur connecté, sinon une erreur 404
 * ou 403 est retournée.
 *
 * @param id - Identifiant unique du carnet (UUID)
 * @returns Promise résolue avec le carnet et ses permissions
 * @throws Error si le carnet n'existe pas ou si l'accès est refusé
 *
 * @example
 * try {
 *   const { notebook, permissions } = await getNotebookById('uuid-123');
 *   console.log('Carnet:', notebook.title);
 *   console.log('Permissions:', permissions.type);
 * } catch (error) {
 *   console.error('Carnet non trouvé:', error.message);
 * }
 */
export async function getNotebookById(id: string): Promise<NotebookWithPermissionsResponse> {
  try {
    const response = await apiClient.get(`/notebooks/${id}`)

    // Le backend retourne : { success: true, data: { notebook: {...}, permissions: {...} } }
    return response.data.data
  } catch (error: unknown) {
    throw new Error(handleApiError(error, 'Erreur lors de la récupération du carnet'))
  }
}

// ========================================
// UPDATE NOTEBOOK
// ========================================

/**
 * Met à jour un carnet existant
 *
 * Cette fonction permet de modifier le titre et la description d'un carnet.
 * Les autres champs (type, format, orientation) sont immuables après création
 * pour préserver la cohérence des pages existantes.
 *
 * Le carnet doit appartenir à l'utilisateur connecté et ne doit pas être archivé.
 *
 * @param id - Identifiant unique du carnet (UUID)
 * @param data - Données à mettre à jour (titre, description)
 * @returns Promise résolue avec le carnet mis à jour
 * @throws Error si la mise à jour échoue ou si le carnet est archivé
 *
 * @example
 * try {
 *   const updated = await updateNotebook('uuid-123', {
 *     title: 'Nouveau titre',
 *     description: 'Nouvelle description'
 *   });
 *   console.log('Carnet mis à jour:', updated.title);
 * } catch (error) {
 *   console.error('Erreur:', error.message);
 * }
 */
export async function updateNotebook(id: string, data: UpdateNotebookDto): Promise<Notebook> {
  try {
    const response = await apiClient.put(`/notebooks/${id}`, data)

    // Le backend retourne : { success: true, data: {...}, message: '...' }
    return response.data.data
  } catch (error: unknown) {
    throw new Error(handleApiError(error, 'Erreur lors de la mise à jour du carnet'))
  }
}

// ========================================
// DUPLICATE NOTEBOOK
// ========================================

/**
 * Duplique un carnet existant
 *
 * Cette fonction crée une copie complète d'un carnet avec un nouvel ID.
 * Le titre est automatiquement suffixé avec "(copie)" pour éviter les confusions.
 *
 * La duplication copie :
 * - Toutes les métadonnées (titre, description, type, format, orientation)
 * - Les permissions (initialisées à 'private' pour la copie)
 * - Les pages (US03 - sera implémenté plus tard)
 *
 * La duplication ne copie pas :
 * - Le pageCount (initialisé à 0 pour la copie, sera mis à jour avec les pages)
 * - Les timestamps (nouveaux createdAt/updatedAt)
 * - Le status (toujours 'active' pour la copie)
 *
 * @param id - Identifiant unique du carnet à dupliquer (UUID)
 * @returns Promise résolue avec le nouveau carnet dupliqué
 * @throws Error si la duplication échoue ou si le carnet n'existe pas
 *
 * @example
 * try {
 *   const duplicate = await duplicateNotebook('uuid-123');
 *   console.log('Nouveau carnet:', duplicate.id);
 *   console.log('Titre:', duplicate.title); // "Mon carnet (copie)"
 * } catch (error) {
 *   console.error('Erreur:', error.message);
 * }
 */
export async function duplicateNotebook(id: string): Promise<Notebook> {
  try {
    const response = await apiClient.post(`/notebooks/${id}/duplicate`)

    // Le backend retourne : { success: true, data: {...}, message: '...' }
    return response.data.data
  } catch (error: unknown) {
    throw new Error(handleApiError(error, 'Erreur lors de la duplication du carnet'))
  }
}

// ========================================
// ARCHIVE NOTEBOOK
// ========================================

/**
 * Archive un carnet
 *
 * Cette fonction marque un carnet comme archivé. Un carnet archivé :
 * - N'est plus visible dans la liste principale des carnets actifs
 * - Apparaît dans la liste des archives (GET /notebooks/archived)
 * - Ne peut plus être modifié (title, description, pages)
 * - Peut être restauré (voir restoreNotebook)
 * - Peut être supprimé définitivement (voir deleteNotebook)
 *
 * L'archivage met à jour :
 * - status : 'archived'
 * - archivedAt : Date actuelle
 *
 * @param id - Identifiant unique du carnet à archiver (UUID)
 * @returns Promise résolue avec le carnet archivé
 * @throws Error si l'archivage échoue ou si le carnet est déjà archivé
 *
 * @example
 * try {
 *   const archived = await archiveNotebook('uuid-123');
 *   console.log('Carnet archivé:', archived.status); // 'archived'
 *   console.log('Date archivage:', archived.archivedAt);
 * } catch (error) {
 *   console.error('Erreur:', error.message);
 * }
 */
export async function archiveNotebook(id: string): Promise<Notebook> {
  try {
    const response = await apiClient.put(`/notebooks/${id}/archive`)

    // Le backend retourne : { success: true, data: {...}, message: '...' }
    return response.data.data
  } catch (error: unknown) {
    throw new Error(handleApiError(error, "Erreur lors de l'archivage du carnet"))
  }
}

// ========================================
// RESTORE NOTEBOOK
// ========================================

/**
 * Restaure un carnet archivé
 *
 * Cette fonction réactive un carnet précédemment archivé. Un carnet restauré :
 * - Redevient visible dans la liste principale des carnets actifs
 * - Disparaît de la liste des archives
 * - Peut à nouveau être modifié
 *
 * La restauration met à jour :
 * - status : 'active'
 * - archivedAt : null
 *
 * @param id - Identifiant unique du carnet à restaurer (UUID)
 * @returns Promise résolue avec le carnet restauré
 * @throws Error si la restauration échoue ou si le carnet n'est pas archivé
 *
 * @example
 * try {
 *   const restored = await restoreNotebook('uuid-123');
 *   console.log('Carnet restauré:', restored.status); // 'active'
 *   console.log('ArchivedAt:', restored.archivedAt); // null
 * } catch (error) {
 *   console.error('Erreur:', error.message);
 * }
 */
export async function restoreNotebook(id: string): Promise<Notebook> {
  try {
    const response = await apiClient.put(`/notebooks/${id}/restore`)

    // Le backend retourne : { success: true, data: {...}, message: '...' }
    return response.data.data
  } catch (error: unknown) {
    throw new Error(handleApiError(error, 'Erreur lors de la restauration du carnet'))
  }
}

// ========================================
// DELETE NOTEBOOK
// ========================================

/**
 * Supprime définitivement un carnet
 *
 * Cette fonction effectue une suppression permanente (hard delete) d'un carnet.
 * Un carnet supprimé ne peut pas être récupéré.
 *
 * Règles de suppression :
 * - Le carnet DOIT être archivé avant suppression (status='archived')
 * - Si le carnet est actif, il faut d'abord l'archiver (voir archiveNotebook)
 * - La suppression est définitive et irréversible
 * - Toutes les pages associées sont également supprimées (CASCADE)
 * - Les permissions associées sont également supprimées (CASCADE)
 *
 * @param id - Identifiant unique du carnet à supprimer (UUID)
 * @returns Promise résolue (void) si la suppression réussit
 * @throws Error si la suppression échoue ou si le carnet n'est pas archivé
 *
 * @example
 * try {
 *   // D'abord archiver
 *   await archiveNotebook('uuid-123');
 *   // Puis supprimer
 *   await deleteNotebook('uuid-123');
 *   console.log('Carnet supprimé définitivement');
 * } catch (error) {
 *   console.error('Erreur:', error.message);
 * }
 */
export async function deleteNotebook(id: string): Promise<void> {
  try {
    // Le backend retourne 204 No Content (pas de corps de réponse)
    await apiClient.delete(`/notebooks/${id}`)
  } catch (error: unknown) {
    throw new Error(handleApiError(error, 'Erreur lors de la suppression du carnet'))
  }
}

// ========================================
// EXPORTS
// ========================================

/**
 * Export par défaut de toutes les fonctions du service
 *
 * Permet d'importer le service de deux façons :
 *
 * // Import nommé (recommandé)
 * import { createNotebook, getNotebooks } from '@/services/notebookService'
 *
 * // Import par défaut (si besoin de préfixer)
 * import notebookService from '@/services/notebookService'
 * notebookService.createNotebook(...)
 */
export default {
  createNotebook,
  getNotebooks,
  getArchivedNotebooks,
  getNotebookById,
  updateNotebook,
  duplicateNotebook,
  archiveNotebook,
  restoreNotebook,
  deleteNotebook,
}
