/**
 * Store Pinia pour la gestion des éléments de page (PageElement)
 *
 * Ce store centralise toute la logique de gestion des éléments de page dans l'application Ithaka :
 * - Récupération des éléments d'une page spécifique
 * - Création, mise à jour, suppression d'éléments (images, textes, stickers, formes, emojis)
 * - Duplication et restauration d'éléments (soft delete)
 * - Sélection d'éléments pour l'édition
 * - Filtrage par type d'élément
 *
 * Architecture:
 * - State : Données réactives (elements, selectedElementId, currentPageId, loading, error)
 * - Getters : État dérivé (getElementById, getSelectedElement, getElementCount, getElementsByType)
 * - Actions : Méthodes asynchrones appelant pageElementService
 *
 * Important: Tous les appels API utilisent des cookies httpOnly pour l'authentification JWT.
 * Les éléments sont associés à une page (currentPageId) et peuvent être soft-deleted (restaurés).
 *
 * Convention de nommage :
 * - State : camelCase (elements, selectedElementId, loading, error)
 * - Getters : camelCase (getElementById, getSelectedElement)
 * - Actions : verbe + nom (loadPageElements, createElement, updateElement)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pageElementService from '@/services/pageElementService'
import type { IPageElement, IPageElementInput, IPageElementUpdate, ElementType } from '@/types/models'

/**
 * Store de gestion des éléments de page
 *
 * Utilisation dans les composants :
 * ```typescript
 * import { usePageElementsStore } from '@/stores/pageElementsStore'
 *
 * const pageElementsStore = usePageElementsStore()
 * await pageElementsStore.loadPageElements(pageId)
 * await pageElementsStore.createElement({ type: 'image', x: 10, y: 20, ... })
 * ```
 */
export const usePageElementsStore = defineStore('pageElements', () => {
  // ========================================
  // STATE (État réactif)
  // ========================================

  /**
   * Liste de tous les éléments de la page actuellement chargée
   *
   * Contient tous les éléments (texte, image, sticker, forme, emoji) de la page active.
   * Les éléments soft-deleted ne sont pas inclus dans cette liste.
   *
   * Structure : Array d'IPageElement avec propriétés de positionnement (x, y, width, height, rotation, zIndex)
   */
  const elements = ref<IPageElement[]>([])

  /**
   * IDs des éléments actuellement sélectionnés dans l'éditeur
   * Array vide si aucun élément n'est sélectionné
   *
   * Utilisé pour afficher les contrôles d'édition (déplacement, redimensionnement, rotation)
   * et pour les opérations en masse (supprimer, déplacer, aligner).
   *
   * Ordre important : le premier élément du tableau est l'élément "principal" (utilisé pour les propriétés communes).
   * Cela permet une transition progressive depuis la simple sélection.
   */
  const selectedElementIds = ref<string[]>([])

  /**
   * Indicateur de chargement pour les opérations sur les éléments de page
   * true pendant les requêtes API (load, create, update, delete)
   *
   * Permet d'afficher un spinner et de désactiver les interactions pendant les opérations.
   */
  const loading = ref<boolean>(false)

  /**
   * Message d'erreur en cas d'échec d'opération
   * null si aucune erreur
   *
   * Contient le message d'erreur retourné par le backend ou
   * un message générique en cas d'erreur réseau.
   */
  const error = ref<string | null>(null)

  /**
   * ID de la page actuellement chargée
   * null si aucune page n'est chargée
   *
   * Utilisé pour filtrer les éléments et pour associer les nouveaux éléments à la bonne page.
   */
  const currentPageId = ref<string | null>(null)

  // ========================================
  // GETTERS (État dérivé)
  // ========================================

  /**
   * Récupère un élément par son ID
   *
   * Retourne l'élément correspondant à l'ID fourni, ou undefined si introuvable.
   *
   * @param id - UUID de l'élément recherché
   * @returns IPageElement | undefined
   *
   * @example
   * ```typescript
   * const element = pageElementsStore.getElementById('123e4567-e89b-12d3-a456-426614174000')
   * if (element) {
   *   console.log('Élément trouvé:', element.type, element.x, element.y)
   * }
   * ```
   */
  const getElementById = computed(() => {
    return (id: string): IPageElement | undefined => {
      return elements.value.find(el => el.id === id)
    }
  })

  /**
   * Récupère le premier élément sélectionné (élément "principal")
   *
   * Retourne l'élément correspondant au premier ID dans selectedElementIds.
   * Cela permet une compatibilité progressive avec le code existant qui attend un seul élément.
   *
   * @returns IPageElement | null
   *
   * @example
   * ```typescript
   * const selected = pageElementsStore.getSelectedElement()
   * if (selected) {
   *   console.log('Élément principal sélectionné:', selected.type)
   * }
   * ```
   */
  const getSelectedElement = computed((): IPageElement | null => {
    if (selectedElementIds.value.length === 0) {
      return null
    }
    const primaryId = selectedElementIds.value[0]
    return elements.value.find(el => el.id === primaryId) || null
  })

  /**
   * Récupère tous les éléments sélectionnés
   *
   * Retourne un tableau contenant tous les éléments dont l'ID figure dans selectedElementIds.
   * L'ordre est préservé depuis le tableau selectedElementIds.
   *
   * @returns IPageElement[]
   *
   * @example
   * ```typescript
   * const selected = pageElementsStore.getSelectedElements()
   * console.log(`${selected.length} éléments sélectionnés`)
   * ```
   */
  const getSelectedElements = computed((): IPageElement[] => {
    return selectedElementIds.value
      .map(id => elements.value.find(el => el.id === id))
      .filter((el): el is IPageElement => el !== undefined)
  })

  /**
   * Nombre total d'éléments sur la page actuelle
   *
   * Retourne le nombre d'éléments chargés (hors éléments soft-deleted).
   *
   * @returns number
   *
   * @example
   * ```typescript
   * const count = pageElementsStore.getElementCount()
   * console.log(`La page contient ${count} éléments`)
   * ```
   */
  const getElementCount = computed((): number => {
    return elements.value.length
  })

  /**
   * Filtre les éléments par type
   *
   * Retourne un tableau de tous les éléments du type spécifié.
   * Utile pour afficher des listes filtrées ou compter les éléments par type.
   *
   * @param type - Type d'élément recherché ('text', 'image', 'shape', 'emoji', 'sticker', 'moodTracker')
   * @returns IPageElement[]
   *
   * @example
   * ```typescript
   * const images = pageElementsStore.getElementsByType('image')
   * console.log(`La page contient ${images.length} images`)
   * ```
   */
  const getElementsByType = computed(() => {
    return (type: ElementType): IPageElement[] => {
      return elements.value.filter(el => el.type === type)
    }
  })

  // ========================================
  // ACTIONS (Méthodes)
  // ========================================

  /**
   * Charge tous les éléments d'une page spécifique
   *
   * Appelle pageElementService.getPageElements(pageId) pour récupérer
   * tous les éléments de la page depuis le backend.
   *
   * Cette méthode est appelée :
   * - Lors de l'ouverture d'une page dans l'éditeur
   * - Lors du rafraîchissement de la page
   *
   * En cas de succès, remplace tous les éléments dans le state et met à jour currentPageId.
   *
   * @param pageId - UUID de la page à charger
   * @throws Error si le chargement échoue (404 page introuvable, 401 non authentifié, 500 erreur serveur)
   *
   * @example
   * ```typescript
   * try {
   *   await pageElementsStore.loadPageElements('123e4567-e89b-12d3-a456-426614174000')
   *   console.log('Éléments chargés:', pageElementsStore.getElementCount())
   * } catch (err) {
   *   console.error('Erreur chargement:', pageElementsStore.error)
   * }
   * ```
   */
  const loadPageElements = async (pageId: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour récupérer les éléments de la page
      const pageElements = await pageElementService.fetchPageElements(pageId)

      // Mise à jour du state avec les éléments chargés
      elements.value = pageElements
      currentPageId.value = pageId

      // Déselection de tous les éléments si des éléments étaient sélectionnés avant
      selectedElementIds.value = []

      console.log(`Page elements loaded successfully: ${pageElements.length} elements for page ${pageId}`)
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors du chargement des éléments de la page'
      }
      console.error('Load page elements failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Crée un nouvel élément de page
   *
   * Appelle pageElementService.createPageElement(data) pour créer un élément
   * sur la page actuelle (image, texte, sticker, forme, emoji).
   *
   * En cas de succès, ajoute l'élément au state local et le sélectionne automatiquement
   * pour permettre son édition immédiate.
   *
   * @param data - Données de l'élément à créer (type, position, dimensions, contenu)
   * @returns Promise<IPageElement> - Élément créé avec son ID attribué
   * @throws Error si la création échoue (400 validation, 404 page introuvable, 401 auth, 500 serveur)
   *
   * @example
   * ```typescript
   * try {
   *   const newElement = await pageElementsStore.createElement({
   *     pageId: currentPageId,
   *     type: 'image',
   *     x: 10,
   *     y: 20,
   *     width: 100,
   *     height: 80,
   *     cloudinaryUrl: 'https://res.cloudinary.com/...'
   *   })
   *   console.log('Élément créé:', newElement.id)
   * } catch (err) {
   *   console.error('Erreur création:', pageElementsStore.error)
   * }
   * ```
   */
  const createElement = async (data: IPageElementInput): Promise<IPageElement> => {
    loading.value = true
    error.value = null

    try {
      // Normalize element type: Fabric.js uses 'textbox' but backend expects 'text'
      let normalizedType = data.type
      if ((data.type as any) === 'textbox') {
        normalizedType = 'text'
      }

      const normalizedData: IPageElementInput = {
        ...data,
        type: normalizedType
      }

      // Appel API pour créer l'élément
      const newElement = await pageElementService.createPageElement(normalizedData)

      // Ajout de l'élément au state
      elements.value.push(newElement)

      // Sélection automatique de l'élément créé pour édition immédiate
      selectedElementIds.value = [newElement.id]

      console.log('Page element created successfully:', newElement.id)
      return newElement
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = "Erreur lors de la création de l'élément"
      }
      console.error('Create element failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Met à jour un élément existant
   *
   * Appelle pageElementService.updatePageElement(id, data) pour mettre à jour
   * les propriétés d'un élément (position, dimensions, rotation, contenu, style).
   *
   * Mise à jour partielle : seuls les champs fournis dans `data` sont modifiés.
   *
   * En cas de succès, met à jour l'élément dans le state local.
   *
   * @param id - UUID de l'élément à mettre à jour
   * @param data - Données partielles à mettre à jour
   * @returns Promise<IPageElement> - Élément mis à jour
   * @throws Error si la mise à jour échoue (404 élément introuvable, 400 validation, 401 auth, 500 serveur)
   *
   * @example
   * ```typescript
   * try {
   *   const updated = await pageElementsStore.updateElement(elementId, {
   *     x: 50,
   *     y: 100,
   *     rotation: 45
   *   })
   *   console.log('Élément mis à jour:', updated.id)
   * } catch (err) {
   *   console.error('Erreur mise à jour:', pageElementsStore.error)
   * }
   * ```
   */
  const updateElement = async (id: string, data: IPageElementUpdate): Promise<IPageElement> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour mettre à jour l'élément
      const updatedElement = await pageElementService.updatePageElement(id, data)

      // Mise à jour de l'élément dans le state
      const index = elements.value.findIndex(el => el.id === id)
      if (index !== -1) {
        elements.value[index] = updatedElement
      }

      console.log('Page element updated successfully:', id)
      return updatedElement
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = "Erreur lors de la mise à jour de l'élément"
      }
      console.error('Update element failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Supprime un élément de page (soft delete)
   *
   * Appelle pageElementService.deletePageElement(id) pour marquer l'élément comme supprimé.
   * La suppression est en mode "soft delete" : l'élément reste en base de données
   * avec un deletedAt timestamp mais n'apparaît plus dans les listes.
   *
   * En cas de succès, retire l'élément du state local.
   * Si l'élément supprimé était sélectionné, désélectionne l'élément.
   *
   * @param id - UUID de l'élément à supprimer
   * @throws Error si la suppression échoue (404 élément introuvable, 401 auth, 500 serveur)
   *
   * @example
   * ```typescript
   * try {
   *   await pageElementsStore.deleteElement(elementId)
   *   console.log('Élément supprimé')
   * } catch (err) {
   *   console.error('Erreur suppression:', pageElementsStore.error)
   * }
   * ```
   */
  const deleteElement = async (id: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour supprimer l'élément
      await pageElementService.deletePageElement(id)

      // Retrait de l'élément du state
      elements.value = elements.value.filter(el => el.id !== id)

      // Retrait de l'élément supprimé de la sélection
      selectedElementIds.value = selectedElementIds.value.filter(elementId => elementId !== id)

      console.log('Page element deleted successfully:', id)
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = "Erreur lors de la suppression de l'élément"
      }
      console.error('Delete element failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Duplique un élément existant
   *
   * Appelle pageElementService.duplicatePageElement(id) pour créer une copie
   * complète de l'élément avec toutes ses propriétés (type, contenu, style).
   *
   * Le backend décale automatiquement la position de l'élément dupliqué
   * (+10mm en x et y) pour clarifier qu'il s'agit d'une copie.
   *
   * En cas de succès, ajoute l'élément dupliqué au state et le sélectionne.
   *
   * @param id - UUID de l'élément à dupliquer
   * @returns Promise<IPageElement> - Élément dupliqué avec un nouvel ID
   * @throws Error si la duplication échoue (404 élément introuvable, 401 auth, 500 serveur)
   *
   * @example
   * ```typescript
   * try {
   *   const duplicate = await pageElementsStore.duplicateElement(elementId)
   *   console.log('Élément dupliqué:', duplicate.id)
   * } catch (err) {
   *   console.error('Erreur duplication:', pageElementsStore.error)
   * }
   * ```
   */
  const duplicateElement = async (id: string): Promise<IPageElement> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour dupliquer l'élément
      const duplicatedElement = await pageElementService.duplicatePageElement(id)

      // Ajout de l'élément dupliqué au state
      elements.value.push(duplicatedElement)

      // Sélection automatique de l'élément dupliqué (remplace la sélection précédente)
      selectedElementIds.value = [duplicatedElement.id]

      console.log('Page element duplicated successfully:', id, '->', duplicatedElement.id)
      return duplicatedElement
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = "Erreur lors de la duplication de l'élément"
      }
      console.error('Duplicate element failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Restaure un élément précédemment supprimé (soft delete)
   *
   * Appelle pageElementService.restorePageElement(id) pour récupérer un élément
   * qui a été marqué comme supprimé mais n'a pas été définitivement supprimé de la base.
   *
   * Cette fonctionnalité permet un "undo" après suppression accidentelle.
   *
   * En cas de succès, ajoute l'élément restauré au state.
   *
   * @param id - UUID de l'élément à restaurer
   * @returns Promise<IPageElement> - Élément restauré
   * @throws Error si la restauration échoue (404 élément introuvable, 401 auth, 500 serveur)
   *
   * @example
   * ```typescript
   * try {
   *   const restored = await pageElementsStore.restoreElement(elementId)
   *   console.log('Élément restauré:', restored.id)
   * } catch (err) {
   *   console.error('Erreur restauration:', pageElementsStore.error)
   * }
   * ```
   */
  const restoreElement = async (id: string): Promise<IPageElement> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour restaurer l'élément
      const restoredElement = await pageElementService.restorePageElement(id)

      // Ajout de l'élément restauré au state
      elements.value.push(restoredElement)

      console.log('Page element restored successfully:', id)
      return restoredElement
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = "Erreur lors de la restauration de l'élément"
      }
      console.error('Restore element failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sélectionne un seul élément (remplace la sélection actuelle)
   *
   * Remplace completement la sélection actuelle par le seul élément fourni.
   * Cette action ne fait pas d'appel API, elle met seulement à jour le state local
   * pour afficher les contrôles d'édition dans l'interface.
   *
   * Cas d'usage :
   * - Clic simple sur un élément (sans Ctrl)
   * - Double-clic pour éditer un élément
   *
   * @param id - UUID de l'élément à sélectionner
   *
   * @example
   * ```typescript
   * pageElementsStore.selectElement('123e4567-e89b-12d3-a456-426614174000')
   * console.log('Élément sélectionné:', pageElementsStore.getSelectedElement())
   * ```
   */
  const selectElement = (id: string): void => {
    selectedElementIds.value = [id]
    console.log('Element selected:', id)
  }

  /**
   * Sélectionne plusieurs éléments d'une seule opération
   *
   * Remplace la sélection actuelle par le tableau d'IDs fournis.
   * Utile pour la sélection par plage ou les opérations de groupe.
   *
   * @param ids - Array d'UUIDs des éléments à sélectionner
   *
   * @example
   * ```typescript
   * pageElementsStore.selectMultiple(['id1', 'id2', 'id3'])
   * console.log(`${pageElementsStore.getSelectedCount()} éléments sélectionnés`)
   * ```
   */
  const selectMultiple = (ids: string[]): void => {
    selectedElementIds.value = ids
    console.log(`Selected ${ids.length} elements`)
  }

  /**
   * Bascule un élément dans/hors de la sélection (Ctrl+Click)
   *
   * Si l'élément est déjà sélectionné, le retire de la sélection.
   * Si l'élément n'est pas sélectionné, l'ajoute à la sélection actuelle.
   * Permet la création de sélections multi-éléments avec Ctrl+Click.
   *
   * Cas d'usage :
   * - Clic avec Ctrl appuyé pour ajouter/retirer un élément de la sélection
   * - Créer des groupes d'éléments pour des opérations en masse
   *
   * @param id - UUID de l'élément à basculer
   *
   * @example
   * ```typescript
   * pageElementsStore.toggleElementSelection('id1')  // Ajoute id1
   * pageElementsStore.toggleElementSelection('id1')  // Retire id1
   * ```
   */
  const toggleElementSelection = (id: string): void => {
    const index = selectedElementIds.value.indexOf(id)
    if (index > -1) {
      // Élément déjà sélectionné : le retirer
      selectedElementIds.value.splice(index, 1)
      console.log('Element deselected from multi-selection:', id)
    } else {
      // Élément non sélectionné : l'ajouter
      selectedElementIds.value.push(id)
      console.log('Element added to multi-selection:', id)
    }
  }

  /**
   * Sélectionne tous les éléments de la page
   *
   * Ajoute tous les éléments de la page actuelle à la sélection.
   * Utile pour les opérations en masse comme "Supprimer tout" ou "Exporter tout".
   *
   * Cas d'usage :
   * - Ctrl+A pour sélectionner tous les éléments du canvas
   * - Opérations de groupe sur tous les éléments
   *
   * @example
   * ```typescript
   * pageElementsStore.selectAll()
   * console.log(`${pageElementsStore.getSelectedCount()} éléments sélectionnés`)
   * ```
   */
  const selectAll = (): void => {
    selectedElementIds.value = elements.value.map(el => el.id)
    console.log(`All ${selectedElementIds.value.length} elements selected`)
  }

  /**
   * Désélectionne tous les éléments actuellement sélectionnés
   *
   * Vide le tableau de sélection pour masquer tous les contrôles d'édition.
   * Cette action ne fait pas d'appel API, elle met seulement à jour le state local.
   *
   * Cas d'usage :
   * - Clic sur le canvas vide pour déselectionner
   * - Touche Escape pour annuler la sélection
   * - Avant de charger une nouvelle page
   *
   * @example
   * ```typescript
   * pageElementsStore.deselectAll()
   * console.log('Tous les éléments sont déselectionnés')
   * ```
   */
  const deselectAll = (): void => {
    selectedElementIds.value = []
    console.log('All elements deselected')
  }

  /**
   * Vérifie si un élément est actuellement sélectionné
   *
   * Retourne true si l'ID fourni figure dans le tableau selectedElementIds.
   * Utile pour appliquer des styles CSS ou des états UI conditionnels.
   *
   * @param id - UUID de l'élément à vérifier
   * @returns true si l'élément est sélectionné, false sinon
   *
   * @example
   * ```typescript
   * if (pageElementsStore.isSelected('id1')) {
   *   console.log('Élément id1 est sélectionné')
   * }
   * ```
   */
  const isSelected = (id: string): boolean => {
    return selectedElementIds.value.includes(id)
  }

  /**
   * Retourne le nombre d'éléments actuellement sélectionnés
   *
   * Utile pour afficher un compteur de sélection dans l'interface
   * ou pour conditionner l'affichage de boutons d'opérations en masse.
   *
   * @returns Nombre d'éléments sélectionnés (0 si aucun)
   *
   * @example
   * ```typescript
   * const count = pageElementsStore.getSelectedCount()
   * console.log(`${count} éléments sélectionnés`)
   * ```
   */
  const getSelectedCount = (): number => {
    return selectedElementIds.value.length
  }

  /**
   * Supprime tous les éléments actuellement sélectionnés
   *
   * Appelle deletePageElement pour chaque élément sélectionné.
   * Les appels API sont faits en séquence pour maintenir la cohérence.
   *
   * Cas d'usage :
   * - Touche Delete avec multi-sélection
   * - Bouton "Supprimer sélection" dans l'interface
   * - Opération en masse après sélection avec Ctrl+Click
   *
   * @throws Error si une suppression échoue
   *
   * @example
   * ```typescript
   * try {
   *   await pageElementsStore.deleteSelected()
   *   console.log('Éléments sélectionnés supprimés')
   * } catch (err) {
   *   console.error('Erreur lors de la suppression:', err)
   * }
   * ```
   */
  const deleteSelected = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Créer une copie de la sélection car deleteElement la modifie
      const idsToDelete = [...selectedElementIds.value]

      // Supprimer chaque élément sélectionné
      for (const id of idsToDelete) {
        await deleteElement(id)
      }

      console.log(`${idsToDelete.length} selected elements deleted successfully`)
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la suppression des éléments sélectionnés'
      }
      console.error('Delete selected failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ========================================
  // EXPORT DU STORE
  // ========================================

  return {
    // State
    elements,
    selectedElementIds,
    loading,
    error,
    currentPageId,

    // Getters
    getElementById,
    getSelectedElement,
    getSelectedElements,
    getElementCount,
    getElementsByType,

    // Actions - Page Element CRUD
    loadPageElements,
    createElement,
    updateElement,
    deleteElement,
    duplicateElement,
    restoreElement,

    // Actions - Single Selection (backward compatible)
    selectElement,

    // Actions - Multi-Selection
    selectMultiple,
    toggleElementSelection,
    selectAll,
    deselectAll,
    isSelected,
    getSelectedCount,
    deleteSelected
  }
})
