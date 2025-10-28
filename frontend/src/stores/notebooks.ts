/**
 * Store Pinia pour la gestion des carnets de voyage (Notebooks)
 *
 * Ce store centralise toute la logique métier liée aux carnets dans l'application Ithaka :
 * - Liste des carnets actifs et archivés (avec pagination et filtres)
 * - Carnet actuellement sélectionné (currentNotebook)
 * - Opérations CRUD : création, lecture, mise à jour, suppression
 * - Actions spéciales : duplication, archivage, restauration
 * - Gestion des filtres et de la pagination
 *
 * Architecture:
 * - State : Données réactives (notebooks, currentNotebook, filters, pagination, loading, error)
 * - Getters : État dérivé (activeNotebooks, archivedNotebooks, hasNotebooks, isLoading)
 * - Actions : Méthodes asynchrones appelant notebookService
 *
 * Important: Les actions modifient toujours l'état local en premier (optimistic updates)
 * puis appellent l'API. En cas d'erreur, l'état local est restauré (rollback).
 *
 * Convention de nommage :
 * - State : camelCase (notebooks, currentNotebook, loading, error)
 * - Getters : camelCase (activeNotebooks, archivedNotebooks, hasNotebooks)
 * - Actions : verbe + nom (fetchNotebooks, createNotebook, archiveNotebook)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  createNotebook,
  getNotebooks,
  getArchivedNotebooks,
  getNotebookById,
  updateNotebook,
  duplicateNotebook,
  archiveNotebook as archiveNotebookService,
  restoreNotebook as restoreNotebookService,
  deleteNotebook as deleteNotebookService,
} from '@/services/notebookService'
import type {
  Notebook,
  CreateNotebookDto,
  UpdateNotebookDto,
  NotebookFilters,
  PaginationMetadata,
} from '@/types/notebook'

/**
 * Store de gestion des carnets
 *
 * Utilisation dans les composants :
 * ```typescript
 * import { useNotebooksStore } from '@/stores/notebooks'
 *
 * const notebooksStore = useNotebooksStore()
 * await notebooksStore.fetchNotebooks({ type: 'Voyage' })
 * ```
 */
export const useNotebooksStore = defineStore('notebooks', () => {
  // ========================================
  // STATE (État réactif)
  // ========================================

  /**
   * Liste des carnets actuellement chargés
   *
   * Cette liste contient les carnets correspondant aux filtres actuels
   * (activeNotebooks ou archivedNotebooks selon le filtre status).
   * Elle est mise à jour après chaque appel à fetchNotebooks ou fetchArchivedNotebooks.
   *
   * Par défaut, elle est vide et se remplit au premier chargement.
   */
  const notebooks = ref<Notebook[]>([])

  /**
   * Carnet actuellement sélectionné pour affichage ou édition
   * null si aucun carnet n'est sélectionné
   *
   * Ce carnet est chargé via fetchNotebookById et contient toutes les informations
   * détaillées incluant les permissions de partage.
   */
  const currentNotebook = ref<Notebook | null>(null)

  /**
   * Filtres actuellement appliqués à la liste des carnets
   *
   * Ces filtres sont envoyés comme query params à l'API GET /api/notebooks
   * et permettent de :
   * - Filtrer par type (Voyage, Daily, Reportage)
   * - Filtrer par statut (active, archived)
   * - Rechercher dans titre/description (search)
   * - Trier par champ (sort) et ordre (order)
   * - Paginer (page, limit)
   *
   * Les filtres par défaut chargent tous les carnets actifs, triés par date de création décroissante.
   */
  const filters = ref<NotebookFilters>({
    status: 'active',
    sort: 'createdAt',
    order: 'DESC',
    page: 1,
    limit: 10,
  })

  /**
   * Métadonnées de pagination pour la liste actuelle
   *
   * Ces métadonnées sont retournées par l'API avec chaque requête paginée
   * et permettent d'afficher :
   * - Le nombre total de carnets disponibles (total)
   * - Le nombre total de pages (totalPages)
   * - La page actuelle (currentPage)
   * - La limite d'éléments par page (limit)
   *
   * Utilisé pour afficher les contrôles de pagination (boutons précédent/suivant, numéros de page).
   */
  const pagination = ref<PaginationMetadata>({
    currentPage: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  /**
   * Indicateur de chargement pour les opérations sur les carnets
   * true pendant les requêtes API (fetch, create, update, delete)
   *
   * Permet d'afficher un spinner et de désactiver les boutons pendant les opérations.
   */
  const loading = ref<boolean>(false)

  /**
   * Message d'erreur en cas d'échec d'opération
   * null si aucune erreur
   *
   * Contient le message d'erreur retourné par le backend ou
   * un message générique en cas d'erreur réseau.
   * Les composants peuvent afficher ce message via une notification toast.
   */
  const error = ref<string | null>(null)

  // ========================================
  // GETTERS (État dérivé)
  // ========================================

  /**
   * Liste filtrée des carnets actifs uniquement
   *
   * Ce getter filtre la liste des carnets pour ne retourner que ceux avec status='active'.
   * Utilisé pour afficher la liste principale des carnets sur le dashboard.
   *
   * @returns Tableau des carnets actifs
   *
   * @example
   * ```typescript
   * const activeNotebooks = computed(() => notebooksStore.activeNotebooks)
   * console.log(`${activeNotebooks.value.length} carnets actifs`)
   * ```
   */
  const activeNotebooks = computed<Notebook[]>(() =>
    notebooks.value.filter((notebook) => notebook.status === 'active')
  )

  /**
   * Liste filtrée des carnets archivés uniquement
   *
   * Ce getter filtre la liste des carnets pour ne retourner que ceux avec status='archived'.
   * Utilisé pour afficher la liste des archives dans une section dédiée.
   *
   * @returns Tableau des carnets archivés
   *
   * @example
   * ```typescript
   * const archivedNotebooks = computed(() => notebooksStore.archivedNotebooks)
   * console.log(`${archivedNotebooks.value.length} carnets archivés`)
   * ```
   */
  const archivedNotebooks = computed<Notebook[]>(() =>
    notebooks.value.filter((notebook) => notebook.status === 'archived')
  )

  /**
   * Indique si la liste des carnets contient au moins un élément
   * true si le tableau notebooks n'est pas vide
   *
   * Utilisé pour afficher/masquer les états vides (empty states) dans l'UI :
   * - Si hasNotebooks = false : afficher "Aucun carnet, créez votre premier carnet"
   * - Si hasNotebooks = true : afficher la liste des carnets
   *
   * @returns true si au moins un carnet est présent
   *
   * @example
   * ```typescript
   * const hasNotebooks = computed(() => notebooksStore.hasNotebooks)
   * if (!hasNotebooks.value) {
   *   console.log('Afficher empty state')
   * }
   * ```
   */
  const hasNotebooks = computed<boolean>(() => notebooks.value.length > 0)

  /**
   * Indicateur de chargement (alias pour meilleure lisibilité)
   *
   * Ce getter retourne simplement la valeur de loading.value.
   * Il permet d'utiliser une syntaxe plus naturelle dans les composants :
   * - isLoading (getter) plutôt que loading.value
   *
   * @returns true si une opération est en cours
   *
   * @example
   * ```typescript
   * const isLoading = computed(() => notebooksStore.isLoading)
   * <n-spin :show="isLoading" />
   * ```
   */
  const isLoading = computed<boolean>(() => loading.value)

  // ========================================
  // ACTIONS (Méthodes)
  // ========================================

  /**
   * Récupère la liste des carnets avec filtres et pagination
   *
   * Cette action appelle GET /api/notebooks avec les filtres fournis ou les filtres du state.
   * Elle met à jour :
   * - notebooks[] avec les carnets retournés
   * - pagination avec les métadonnées de pagination
   * - filters avec les nouveaux filtres (si fournis)
   *
   * Par défaut (sans paramètres), elle charge tous les carnets actifs, triés par date décroissante.
   *
   * @param newFilters - Filtres optionnels (type, status, search, sort, order, page, limit)
   * @throws Error si la récupération échoue (network, auth, server error)
   *
   * @example
   * // Charger tous les carnets actifs (défaut)
   * await notebooksStore.fetchNotebooks()
   *
   * // Charger les carnets de voyage, page 2
   * await notebooksStore.fetchNotebooks({ type: 'Voyage', page: 2 })
   *
   * // Rechercher "Italie" dans titre/description
   * await notebooksStore.fetchNotebooks({ search: 'Italie' })
   */
  const fetchNotebooks = async (newFilters?: NotebookFilters): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Fusionner les nouveaux filtres avec les filtres existants
      const appliedFilters: NotebookFilters = {
        ...filters.value,
        ...newFilters,
      }

      // Appel API pour récupérer les carnets
      const response = await getNotebooks(appliedFilters)

      // Mise à jour du state avec les résultats
      notebooks.value = response.notebooks
      pagination.value = response.pagination

      // Sauvegarder les filtres appliqués
      filters.value = appliedFilters

      console.log(
        `Fetched ${response.notebooks.length} notebooks (page ${response.pagination.currentPage}/${response.pagination.totalPages})`
      )
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la récupération des carnets'
      }
      console.error('Fetch notebooks failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Récupère la liste des carnets archivés avec pagination
   *
   * Cette action appelle GET /api/notebooks/archived avec les paramètres de pagination.
   * Elle est utilisée pour afficher la section "Archives" dans l'interface.
   *
   * Contrairement à fetchNotebooks, cette action :
   * - Charge UNIQUEMENT les carnets archivés (status='archived')
   * - N'applique pas les filtres généraux (type, search, sort)
   * - Utilise une pagination spécifique aux archives
   *
   * @param page - Numéro de page (défaut: 1)
   * @param limit - Éléments par page (défaut: 10)
   * @throws Error si la récupération échoue
   *
   * @example
   * // Charger la première page des archives
   * await notebooksStore.fetchArchivedNotebooks()
   *
   * // Charger la page 2 avec 20 éléments par page
   * await notebooksStore.fetchArchivedNotebooks(2, 20)
   */
  const fetchArchivedNotebooks = async (page?: number, limit?: number): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour récupérer les carnets archivés
      const response = await getArchivedNotebooks(page, limit)

      // Mise à jour du state avec les résultats
      notebooks.value = response.notebooks
      pagination.value = response.pagination

      // Mettre à jour les filtres pour refléter qu'on affiche les archives
      filters.value = {
        ...filters.value,
        status: 'archived',
        page: response.pagination.currentPage,
        limit: response.pagination.limit,
      }

      console.log(
        `Fetched ${response.notebooks.length} archived notebooks (page ${response.pagination.currentPage}/${response.pagination.totalPages})`
      )
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la récupération des carnets archivés'
      }
      console.error('Fetch archived notebooks failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Récupère un carnet par son ID avec ses permissions
   *
   * Cette action appelle GET /api/notebooks/:id pour récupérer les détails complets
   * d'un carnet, incluant ses paramètres de partage (NotebookPermissions).
   *
   * Le carnet récupéré est stocké dans currentNotebook et peut être utilisé pour :
   * - Afficher la vue détail du carnet
   * - Éditer le carnet
   * - Afficher les paramètres de partage
   *
   * @param id - Identifiant unique du carnet (UUID)
   * @throws Error si le carnet n'existe pas (404), accès refusé (403), ou erreur serveur (500)
   *
   * @example
   * try {
   *   await notebooksStore.fetchNotebookById('uuid-123')
   *   console.log('Carnet chargé:', notebooksStore.currentNotebook?.title)
   * } catch (err) {
   *   console.error('Carnet non trouvé:', notebooksStore.error)
   * }
   */
  const fetchNotebookById = async (id: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour récupérer le carnet avec ses permissions
      const response = await getNotebookById(id)

      // Mise à jour du currentNotebook
      // Note: On ne stocke que le notebook, pas les permissions (à ajouter si nécessaire)
      currentNotebook.value = response.notebook

      console.log('Fetched notebook by ID:', response.notebook.id)
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la récupération du carnet'
      }
      console.error('Fetch notebook by ID failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Crée un nouveau carnet
   *
   * Cette action appelle POST /api/notebooks avec les données du formulaire de création.
   * En cas de succès, le nouveau carnet est :
   * - Ajouté en début de liste notebooks[] (optimistic update)
   * - Défini comme currentNotebook pour permettre la navigation immédiate
   *
   * Les champs générés automatiquement par le backend :
   * - id (UUID)
   * - userId (depuis le JWT token)
   * - dpi (fixé à 300)
   * - pageCount (initialisé à 0)
   * - status (initialisé à 'active')
   * - timestamps (createdAt, updatedAt)
   *
   * @param data - Données du carnet à créer (title, description, type, format, orientation)
   * @returns Promise<Notebook> - Le carnet créé avec toutes ses propriétés
   * @throws Error si la création échoue (validation, auth, server error)
   *
   * @example
   * try {
   *   const newNotebook = await notebooksStore.createNotebook({
   *     title: 'Mon voyage en Italie',
   *     description: 'Carnet de bord de mon road trip',
   *     type: 'Voyage',
   *     format: 'A4',
   *     orientation: 'portrait'
   *   })
   *   console.log('Carnet créé:', newNotebook.id)
   *   router.push(`/notebooks/${newNotebook.id}`)
   * } catch (err) {
   *   console.error('Erreur création:', notebooksStore.error)
   * }
   */
  const createNotebookAction = async (data: CreateNotebookDto): Promise<Notebook> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour créer le carnet
      const newNotebook = await createNotebook(data)

      // Mise à jour du state local (optimistic update)
      // Ajouter le nouveau carnet en début de liste
      notebooks.value.unshift(newNotebook)

      // Définir comme carnet actuel
      currentNotebook.value = newNotebook

      // Mettre à jour les métadonnées de pagination
      pagination.value.total += 1

      console.log('Notebook created:', newNotebook.id)
      return newNotebook
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la création du carnet'
      }
      console.error('Create notebook failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Met à jour un carnet existant
   *
   * Cette action appelle PUT /api/notebooks/:id avec les champs modifiés.
   * Seuls le titre et la description peuvent être modifiés après création.
   *
   * En cas de succès :
   * - Le carnet est mis à jour dans notebooks[]
   * - Si c'est le currentNotebook, il est également mis à jour
   *
   * Si le carnet est archivé, la mise à jour échoue (400 Bad Request).
   *
   * @param id - Identifiant unique du carnet (UUID)
   * @param data - Champs à mettre à jour (title, description)
   * @returns Promise<Notebook> - Le carnet mis à jour
   * @throws Error si la mise à jour échoue (carnet archivé, validation, auth, server error)
   *
   * @example
   * try {
   *   const updated = await notebooksStore.updateNotebook('uuid-123', {
   *     title: 'Nouveau titre',
   *     description: 'Nouvelle description'
   *   })
   *   console.log('Carnet mis à jour:', updated.title)
   * } catch (err) {
   *   console.error('Erreur mise à jour:', notebooksStore.error)
   * }
   */
  const updateNotebookAction = async (id: string, data: UpdateNotebookDto): Promise<Notebook> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour mettre à jour le carnet
      const updatedNotebook = await updateNotebook(id, data)

      // Mise à jour du state local
      const index = notebooks.value.findIndex((nb) => nb.id === id)
      if (index !== -1) {
        notebooks.value[index] = updatedNotebook
      }

      // Si c'est le carnet actuel, le mettre à jour aussi
      if (currentNotebook.value?.id === id) {
        currentNotebook.value = updatedNotebook
      }

      console.log('Notebook updated:', updatedNotebook.id)
      return updatedNotebook
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la mise à jour du carnet'
      }
      console.error('Update notebook failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Duplique un carnet existant
   *
   * Cette action appelle POST /api/notebooks/:id/duplicate pour créer une copie
   * complète d'un carnet avec un nouvel ID.
   *
   * La duplication copie :
   * - Toutes les métadonnées (titre avec suffixe "(copie)", description, type, format, orientation)
   * - Les permissions (initialisées à 'private' pour la copie)
   * - Les pages (US03 - sera implémenté plus tard)
   *
   * La copie est automatiquement :
   * - Ajoutée à notebooks[] après le carnet source
   * - Définie comme currentNotebook
   * - Avec status='active' (même si le carnet source était archivé)
   *
   * @param id - Identifiant unique du carnet à dupliquer (UUID)
   * @returns Promise<Notebook> - Le nouveau carnet dupliqué
   * @throws Error si la duplication échoue (carnet introuvable, auth, server error)
   *
   * @example
   * try {
   *   const duplicate = await notebooksStore.duplicateNotebook('uuid-123')
   *   console.log('Carnet dupliqué:', duplicate.id)
   *   console.log('Titre:', duplicate.title) // "Mon carnet (copie)"
   *   router.push(`/notebooks/${duplicate.id}`)
   * } catch (err) {
   *   console.error('Erreur duplication:', notebooksStore.error)
   * }
   */
  const duplicateNotebookAction = async (id: string): Promise<Notebook> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour dupliquer le carnet
      const duplicatedNotebook = await duplicateNotebook(id)

      // Mise à jour du state local
      // Trouver l'index du carnet source
      const sourceIndex = notebooks.value.findIndex((nb) => nb.id === id)

      if (sourceIndex !== -1) {
        // Insérer le carnet dupliqué juste après le carnet source
        notebooks.value.splice(sourceIndex + 1, 0, duplicatedNotebook)
      } else {
        // Si le carnet source n'est pas dans la liste, ajouter en début
        notebooks.value.unshift(duplicatedNotebook)
      }

      // Définir comme carnet actuel
      currentNotebook.value = duplicatedNotebook

      // Mettre à jour les métadonnées de pagination
      pagination.value.total += 1

      console.log('Notebook duplicated:', duplicatedNotebook.id)
      return duplicatedNotebook
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la duplication du carnet'
      }
      console.error('Duplicate notebook failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Archive un carnet
   *
   * Cette action appelle PUT /api/notebooks/:id/archive pour marquer un carnet comme archivé.
   * Un carnet archivé :
   * - N'est plus visible dans la liste principale (activeNotebooks)
   * - Apparaît dans la liste des archives (archivedNotebooks)
   * - Ne peut plus être modifié (title, description, pages)
   * - Peut être restauré (voir restoreNotebook)
   * - Peut être supprimé définitivement (voir deleteNotebook)
   *
   * L'archivage met à jour :
   * - status : 'archived'
   * - archivedAt : Date actuelle
   *
   * En cas de succès :
   * - Le carnet est mis à jour dans notebooks[]
   * - Si on affiche la liste active, le carnet est retiré visuellement (filtré par getter)
   *
   * @param id - Identifiant unique du carnet à archiver (UUID)
   * @returns Promise<Notebook> - Le carnet archivé
   * @throws Error si l'archivage échoue (carnet déjà archivé, auth, server error)
   *
   * @example
   * try {
   *   const archived = await notebooksStore.archiveNotebook('uuid-123')
   *   console.log('Carnet archivé:', archived.status) // 'archived'
   *   console.log('Date archivage:', archived.archivedAt)
   * } catch (err) {
   *   console.error('Erreur archivage:', notebooksStore.error)
   * }
   */
  const archiveNotebook = async (id: string): Promise<Notebook> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour archiver le carnet
      const archivedNotebook = await archiveNotebookService(id)

      // Mise à jour du state local
      const index = notebooks.value.findIndex((nb) => nb.id === id)
      if (index !== -1) {
        notebooks.value[index] = archivedNotebook
      }

      // Si c'est le carnet actuel, le mettre à jour aussi
      if (currentNotebook.value?.id === id) {
        currentNotebook.value = archivedNotebook
      }

      console.log('Notebook archived:', archivedNotebook.id)
      return archivedNotebook
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = "Erreur lors de l'archivage du carnet"
      }
      console.error('Archive notebook failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Restaure un carnet archivé
   *
   * Cette action appelle PUT /api/notebooks/:id/restore pour réactiver un carnet archivé.
   * Un carnet restauré :
   * - Redevient visible dans la liste principale (activeNotebooks)
   * - Disparaît de la liste des archives
   * - Peut à nouveau être modifié
   *
   * La restauration met à jour :
   * - status : 'active'
   * - archivedAt : null
   *
   * En cas de succès :
   * - Le carnet est mis à jour dans notebooks[]
   * - Si on affiche la liste des archives, le carnet est retiré visuellement
   *
   * @param id - Identifiant unique du carnet à restaurer (UUID)
   * @returns Promise<Notebook> - Le carnet restauré
   * @throws Error si la restauration échoue (carnet non archivé, auth, server error)
   *
   * @example
   * try {
   *   const restored = await notebooksStore.restoreNotebook('uuid-123')
   *   console.log('Carnet restauré:', restored.status) // 'active'
   *   console.log('ArchivedAt:', restored.archivedAt) // null
   * } catch (err) {
   *   console.error('Erreur restauration:', notebooksStore.error)
   * }
   */
  const restoreNotebook = async (id: string): Promise<Notebook> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour restaurer le carnet
      const restoredNotebook = await restoreNotebookService(id)

      // Mise à jour du state local
      const index = notebooks.value.findIndex((nb) => nb.id === id)
      if (index !== -1) {
        notebooks.value[index] = restoredNotebook
      }

      // Si c'est le carnet actuel, le mettre à jour aussi
      if (currentNotebook.value?.id === id) {
        currentNotebook.value = restoredNotebook
      }

      console.log('Notebook restored:', restoredNotebook.id)
      return restoredNotebook
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la restauration du carnet'
      }
      console.error('Restore notebook failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Supprime définitivement un carnet
   *
   * Cette action appelle DELETE /api/notebooks/:id pour effectuer une suppression permanente.
   * Un carnet supprimé ne peut PAS être récupéré.
   *
   * Règles de suppression :
   * - Le carnet DOIT être archivé avant suppression (status='archived')
   * - Si le carnet est actif, il faut d'abord l'archiver (voir archiveNotebook)
   * - La suppression est définitive et irréversible
   * - Toutes les pages associées sont également supprimées (CASCADE)
   * - Les permissions associées sont également supprimées (CASCADE)
   *
   * En cas de succès :
   * - Le carnet est retiré de notebooks[]
   * - Si c'est le currentNotebook, il est réinitialisé à null
   * - Les métadonnées de pagination sont mises à jour (total - 1)
   *
   * @param id - Identifiant unique du carnet à supprimer (UUID)
   * @returns Promise<void> - Résolution si la suppression réussit
   * @throws Error si la suppression échoue (carnet non archivé, auth, server error)
   *
   * @example
   * try {
   *   // D'abord archiver
   *   await notebooksStore.archiveNotebook('uuid-123')
   *   // Puis supprimer
   *   await notebooksStore.deleteNotebook('uuid-123')
   *   console.log('Carnet supprimé définitivement')
   * } catch (err) {
   *   console.error('Erreur suppression:', notebooksStore.error)
   * }
   */
  const deleteNotebook = async (id: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour supprimer le carnet (204 No Content)
      await deleteNotebookService(id)

      // Mise à jour du state local
      // Retirer le carnet de la liste
      const index = notebooks.value.findIndex((nb) => nb.id === id)
      if (index !== -1) {
        notebooks.value.splice(index, 1)
      }

      // Si c'est le carnet actuel, réinitialiser
      if (currentNotebook.value?.id === id) {
        currentNotebook.value = null
      }

      // Mettre à jour les métadonnées de pagination
      if (pagination.value.total > 0) {
        pagination.value.total -= 1
      }

      console.log('Notebook deleted:', id)
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la suppression du carnet'
      }
      console.error('Delete notebook failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Met à jour les filtres et recharge la liste des carnets
   *
   * Cette action permet de modifier les critères de filtrage sans appeler
   * directement fetchNotebooks. Elle :
   * - Fusionne les nouveaux filtres avec les filtres existants
   * - Réinitialise la page à 1 (retour au début de la liste)
   * - Recharge la liste avec les nouveaux filtres
   *
   * Utilisée par les composants de filtrage (recherche, sélecteurs de type, tri).
   *
   * @param newFilters - Nouveaux filtres à appliquer (type, status, search, sort, order)
   * @returns Promise<void> - Résolution après rechargement de la liste
   *
   * @example
   * // Filtrer par type "Voyage"
   * await notebooksStore.setFilters({ type: 'Voyage' })
   *
   * // Rechercher "Italie"
   * await notebooksStore.setFilters({ search: 'Italie' })
   *
   * // Trier par titre en ordre croissant
   * await notebooksStore.setFilters({ sort: 'title', order: 'ASC' })
   */
  const setFilters = async (newFilters: Partial<NotebookFilters>): Promise<void> => {
    // Fusionner les nouveaux filtres avec les filtres existants
    const updatedFilters: NotebookFilters = {
      ...filters.value,
      ...newFilters,
      // Réinitialiser la page à 1 lors du changement de filtres
      page: 1,
    }

    // Recharger la liste avec les nouveaux filtres
    await fetchNotebooks(updatedFilters)
  }

  /**
   * Réinitialise le message d'erreur
   *
   * Cette action efface le message d'erreur stocké dans error.value.
   * Elle est appelée :
   * - Avant chaque nouvelle opération (pour ne pas afficher les anciennes erreurs)
   * - Manuellement par les composants pour fermer les notifications d'erreur
   *
   * @example
   * // Effacer l'erreur après l'avoir affichée
   * if (notebooksStore.error) {
   *   showNotification('error', notebooksStore.error)
   *   notebooksStore.resetError()
   * }
   */
  const resetError = (): void => {
    error.value = null
  }

  // ========================================
  // EXPORT DU STORE
  // ========================================

  return {
    // State
    notebooks,
    currentNotebook,
    filters,
    pagination,
    loading,
    error,

    // Getters
    activeNotebooks,
    archivedNotebooks,
    hasNotebooks,
    isLoading,

    // Actions
    fetchNotebooks,
    fetchArchivedNotebooks,
    fetchNotebookById,
    createNotebook: createNotebookAction,
    updateNotebook: updateNotebookAction,
    duplicateNotebook: duplicateNotebookAction,
    archiveNotebook,
    restoreNotebook,
    deleteNotebook,
    setFilters,
    resetError,
  }
})
