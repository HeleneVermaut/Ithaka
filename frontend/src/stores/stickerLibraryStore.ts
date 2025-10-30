/**
 * Pinia Store pour la gestion de la bibliothèque de stickers utilisateur
 *
 * Ce store centralise la gestion de la sticker library personnelle de l'utilisateur :
 * - Chargement de la liste des stickers
 * - Upload de nouveaux stickers vers Cloudinary
 * - Renommage et mise à jour des métadonnées
 * - Suppression de stickers
 * - Sélection de stickers pour l'édition de pages
 * - Recherche et filtrage de stickers par nom/tags
 *
 * Architecture Pinia avec Composition API :
 * - State réactif pour les stickers, loading, erreurs et pagination
 * - Actions pour toutes les opérations CRUD
 * - Getters pour les opérations de recherche et de sélection
 *
 * @example
 * ```ts
 * // Dans un composant Vue
 * const stickerLibrary = useStickerLibraryStore()
 * await stickerLibrary.loadStickerLibrary()
 * const stickers = stickerLibrary.stickers
 * ```
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import stickerService from '@/services/stickerService'
import type { IUserSticker } from '@/types/models'
import type { UploadProgressCallback } from '@/services/mediaService'

/**
 * Interface pour la pagination des stickers
 *
 * Permet de gérer l'affichage paginé de grandes bibliothèques de stickers
 */
interface IPagination {
  /** Numéro de la page courante (1-indexed) */
  page: number

  /** Nombre de stickers par page */
  limit: number

  /** Nombre total de stickers dans la bibliothèque */
  total: number
}

/**
 * Store Pinia pour la bibliothèque de stickers utilisateur
 *
 * Gère l'état global de la sticker library avec support de la pagination,
 * recherche, sélection et opérations CRUD complètes.
 */
export const useStickerLibraryStore = defineStore('stickerLibrary', () => {
  // ========================================
  // STATE
  // ========================================

  /**
   * Liste de tous les stickers de l'utilisateur
   *
   * Tableau réactif contenant les stickers chargés depuis le backend.
   * Mis à jour après chaque opération CRUD.
   */
  const stickers = ref<IUserSticker[]>([])

  /**
   * ID du sticker actuellement sélectionné
   *
   * Utilisé pour la sélection dans l'interface d'édition de page.
   * null si aucun sticker n'est sélectionné.
   */
  const selectedStickerId = ref<string | null>(null)

  /**
   * Indicateur de chargement en cours
   *
   * true pendant les opérations asynchrones (load, upload, delete).
   * Utilisé pour afficher des spinners ou désactiver les boutons.
   */
  const loading = ref<boolean>(false)

  /**
   * Message d'erreur de la dernière opération
   *
   * Contient le message d'erreur lisible si une opération échoue.
   * null si aucune erreur.
   */
  const error = ref<string | null>(null)

  /**
   * Configuration de pagination
   *
   * Stocke l'état de la pagination pour supporter de grandes bibliothèques.
   * Mis à jour après chaque chargement de stickers.
   */
  const pagination = ref<IPagination>({
    page: 1,
    limit: 20,
    total: 0
  })

  // ========================================
  // GETTERS
  // ========================================

  /**
   * Récupère un sticker par son ID
   *
   * @param id - UUID du sticker recherché
   * @returns Le sticker correspondant ou undefined
   *
   * @example
   * const sticker = stickerLibrary.getStickerById('uuid-123')
   * if (sticker) {
   *   console.log(sticker.name)
   * }
   */
  const getStickerById = computed(() => {
    return (id: string): IUserSticker | undefined => {
      return stickers.value.find((sticker) => sticker.id === id)
    }
  })

  /**
   * Retourne le sticker actuellement sélectionné
   *
   * @returns Le sticker sélectionné ou undefined si aucun n'est sélectionné
   *
   * @example
   * const selected = stickerLibrary.getSelectedSticker()
   * if (selected) {
   *   addStickerToPage(selected)
   * }
   */
  const getSelectedSticker = computed((): IUserSticker | undefined => {
    if (!selectedStickerId.value) {
      return undefined
    }
    return stickers.value.find((sticker) => sticker.id === selectedStickerId.value)
  })

  /**
   * Retourne le nombre total de stickers dans la bibliothèque
   *
   * @returns Le nombre total de stickers
   *
   * @example
   * const count = stickerLibrary.getStickerCount()
   * console.log(`Vous avez ${count} stickers`)
   */
  const getStickerCount = computed((): number => {
    return pagination.value.total
  })

  /**
   * Filtre les stickers par terme de recherche (nom ou tags)
   *
   * Recherche insensible à la casse dans le nom du sticker et ses tags.
   *
   * @param query - Terme de recherche (vide = tous les stickers)
   * @returns Stickers correspondant à la recherche
   *
   * @example
   * const results = stickerLibrary.getFilteredStickers('nature')
   * // Retourne tous les stickers avec "nature" dans le nom ou les tags
   */
  const getFilteredStickers = computed(() => {
    return (query: string): IUserSticker[] => {
      if (!query || query.trim() === '') {
        return stickers.value
      }

      const normalizedQuery = query.toLowerCase().trim()

      return stickers.value.filter((sticker) => {
        // Recherche dans le nom du sticker
        const matchesName = sticker.name.toLowerCase().includes(normalizedQuery)

        // Recherche dans les tags
        const matchesTags = sticker.tags.some((tag) =>
          tag.toLowerCase().includes(normalizedQuery)
        )

        return matchesName || matchesTags
      })
    }
  })

  // ========================================
  // ACTIONS
  // ========================================

  /**
   * Charge la bibliothèque de stickers depuis le backend
   *
   * Récupère tous les stickers de l'utilisateur avec pagination.
   * Réinitialise l'état d'erreur avant le chargement.
   *
   * @throws Error si le chargement échoue (capturé et stocké dans error)
   *
   * @example
   * await stickerLibrary.loadStickerLibrary()
   * // Charge la première page avec 20 stickers
   */
  async function loadStickerLibrary(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Appel au service backend
      const response = await stickerService.fetchStickerLibrary()

      // Mise à jour de l'état
      stickers.value = response.stickers
      pagination.value = {
        page: response.pagination.currentPage,
        limit: response.pagination.limit,
        total: response.pagination.total
      }
    } catch (err) {
      // Gestion des erreurs : message utilisateur-friendly
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      error.value = `Échec du chargement de la bibliothèque: ${errorMessage}`
      console.error('[stickerLibraryStore] Load error:', err)
    } finally {
      // Toujours désactiver le spinner, même en cas d'erreur
      loading.value = false
    }
  }

  /**
   * Upload un nouveau sticker vers la bibliothèque
   *
   * Upload le fichier vers Cloudinary via le backend, puis recharge
   * automatiquement la bibliothèque pour afficher le nouveau sticker.
   *
   * @param file - Fichier image du sticker
   * @param name - Nom du sticker (max 100 caractères)
   * @param tags - Tags optionnels pour la recherche
   * @param onProgress - Callback optionnel pour suivre la progression (0-100)
   * @returns Le sticker créé avec ses métadonnées Cloudinary
   * @throws Error si l'upload échoue (capturé et stocké dans error)
   *
   * @example
   * const file = new File([blob], 'my-sticker.png', { type: 'image/png' })
   * const sticker = await stickerLibrary.uploadSticker(
   *   file,
   *   'Custom Sticker',
   *   ['nature', 'forest'],
   *   (progress) => console.log(`Upload: ${progress}%`)
   * )
   */
  async function uploadSticker(
    file: File,
    name: string,
    tags?: string[],
    onProgress?: UploadProgressCallback
  ): Promise<IUserSticker | null> {
    loading.value = true
    error.value = null

    try {
      // Appel au service d'upload
      const newSticker = await stickerService.uploadStickerToLibrary(
        file,
        name,
        tags,
        onProgress
      )

      // Recharger la bibliothèque pour inclure le nouveau sticker
      // Note: On pourrait aussi simplement ajouter le sticker au tableau,
      // mais recharger garantit la cohérence avec le backend
      await loadStickerLibrary()

      return newSticker
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      error.value = `Échec de l'upload du sticker: ${errorMessage}`
      console.error('[stickerLibraryStore] Upload error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Renomme un sticker existant et met à jour ses tags
   *
   * Permet de modifier le nom et les tags d'un sticker sauvegardé.
   * Recharge la bibliothèque après la mise à jour pour garantir la cohérence.
   *
   * @param id - UUID du sticker à renommer
   * @param newName - Nouveau nom du sticker (optionnel)
   * @param newTags - Nouveaux tags (optionnel)
   * @returns Le sticker mis à jour ou null en cas d'erreur
   * @throws Error si le renommage échoue (capturé et stocké dans error)
   *
   * @example
   * await stickerLibrary.renameSticker(
   *   'uuid-123',
   *   'Updated Name',
   *   ['new', 'tags']
   * )
   */
  async function renameSticker(
    id: string,
    newName?: string,
    newTags?: string[]
  ): Promise<IUserSticker | null> {
    loading.value = true
    error.value = null

    try {
      // Appel au service de mise à jour
      const updatedSticker = await stickerService.updateStickerMetadata(id, newName, newTags)

      // Recharger la bibliothèque pour refléter les changements
      await loadStickerLibrary()

      return updatedSticker
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      error.value = `Échec du renommage du sticker: ${errorMessage}`
      console.error('[stickerLibraryStore] Rename error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Supprime un sticker de la bibliothèque
   *
   * La suppression est définitive et ne peut pas être annulée.
   * Recharge automatiquement la bibliothèque après suppression.
   * Si le sticker supprimé était sélectionné, désélectionne automatiquement.
   *
   * @param id - UUID du sticker à supprimer
   * @throws Error si la suppression échoue (capturé et stocké dans error)
   *
   * @example
   * await stickerLibrary.deleteSticker('uuid-123')
   */
  async function deleteSticker(id: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Appel au service de suppression
      await stickerService.deleteStickerFromLibrary(id)

      // Désélectionner si le sticker supprimé était sélectionné
      if (selectedStickerId.value === id) {
        selectedStickerId.value = null
      }

      // Recharger la bibliothèque pour retirer le sticker supprimé
      await loadStickerLibrary()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      error.value = `Échec de la suppression du sticker: ${errorMessage}`
      console.error('[stickerLibraryStore] Delete error:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Sélectionne un sticker pour l'édition de page
   *
   * Définit le sticker actif qui peut être ajouté à une page.
   * Utilisé dans l'interface d'édition pour gérer la sélection.
   *
   * @param id - UUID du sticker à sélectionner
   *
   * @example
   * stickerLibrary.selectSticker('uuid-123')
   * // Le sticker uuid-123 est maintenant sélectionné
   */
  function selectSticker(id: string): void {
    selectedStickerId.value = id
  }

  /**
   * Désélectionne le sticker actuellement sélectionné
   *
   * Réinitialise la sélection à null.
   *
   * @example
   * stickerLibrary.deselectSticker()
   * // Aucun sticker n'est sélectionné
   */
  function deselectSticker(): void {
    selectedStickerId.value = null
  }

  // ========================================
  // RETURN (PUBLIC API)
  // ========================================

  return {
    // State
    stickers,
    selectedStickerId,
    loading,
    error,
    pagination,

    // Getters
    getStickerById,
    getSelectedSticker,
    getStickerCount,
    getFilteredStickers,

    // Actions
    loadStickerLibrary,
    uploadSticker,
    renameSticker,
    deleteSticker,
    selectSticker,
    deselectSticker
  }
})

export default useStickerLibraryStore
