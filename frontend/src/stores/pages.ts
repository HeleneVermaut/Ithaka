/**
 * Pinia Store for Page and Element State Management
 *
 * Ce store gère l'état global des pages et des éléments de page.
 * Il permet :
 * - Charger les pages et éléments depuis le backend
 * - Ajouter, modifier, supprimer des éléments localement
 * - Synchroniser les changements avec le backend
 * - Gérer l'état de chargement et les erreurs
 *
 * Architecture :
 * - State: currentPage, elements, unsavedElements, loading, error
 * - Getters: elementsByZIndex, textElementCount, hasUnsavedChanges
 * - Actions: loadPage, addElement, updateElement, deleteElement, saveElements
 *
 * @module stores/pages
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pageService from '@/services/pageService'
import type {
  IPage,
  IPageElement,
  IPageElementCreateRequest,
} from '@/types/models'

/**
 * Store Pinia pour la gestion des pages et éléments
 */
export const usePagesStore = defineStore('pages', () => {
  // ========================================
  // STATE
  // ========================================

  /**
   * Page actuellement chargée en édition
   */
  const currentPage = ref<IPage | null>(null)

  /**
   * Toutes les pages du notebook
   */
  const pages = ref<IPage[]>([])

  /**
   * Éléments groupés par pageId: { pageId: [elements] }
   */
  const elements = ref<Record<string, IPageElement[]>>({})

  /**
   * Indicateur de chargement pour les opérations asynchrones
   */
  const loading = ref(false)

  /**
   * Message d'erreur en cas d'échec
   */
  const error = ref<string | null>(null)

  /**
   * Éléments non sauvegardés (créés/modifiés localement)
   * Key: elementId, Value: élément complet
   *
   * Cette Map permet de tracker les changements locaux avant synchronisation.
   * Lors d'une sauvegarde réussie, cette Map est vidée.
   * En cas d'erreur, elle est conservée pour retry.
   */
  const unsavedElements = ref<Map<string, IPageElement>>(new Map())

  // ========================================
  // GETTERS
  // ========================================

  /**
   * Retourne les éléments d'une page triés par zIndex croissant
   * (arrière-plan en premier, éléments au-dessus après)
   *
   * @param {string} pageId - ID de la page
   * @returns {IPageElement[]} Éléments triés par zIndex
   */
  const elementsByZIndex = computed(() => (pageId: string): IPageElement[] => {
    const pageElements = elements.value[pageId] || []
    return [...pageElements].sort((a, b) => a.zIndex - b.zIndex)
  })

  /**
   * Compte les éléments de type 'text' sur une page
   *
   * @param {string} pageId - ID de la page
   * @returns {number} Nombre d'éléments texte
   */
  const textElementCount = computed(() => (pageId: string): number => {
    const pageElements = elements.value[pageId] || []
    return pageElements.filter((el) => el.type === 'text').length
  })

  /**
   * Indique s'il y a des changements non sauvegardés
   *
   * @returns {boolean} true si unsavedElements n'est pas vide
   */
  const hasUnsavedChanges = computed(() => unsavedElements.value.size > 0)

  // ========================================
  // ACTIONS
  // ========================================

  /**
   * Charge une page et tous ses éléments depuis le backend
   *
   * @param {string} pageId - ID de la page
   * @throws {Error} Si le chargement échoue
   * @example
   * await loadPage('page-123');
   */
  const loadPage = async (pageId: string): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const [pageData, pageElements] = await Promise.all([
        pageService.fetchPageDetails(pageId),
        pageService.fetchPageElements(pageId),
      ])

      currentPage.value = pageData
      elements.value[pageId] = pageElements

      // Réinitialiser les changements non sauvegardés
      unsavedElements.value.clear()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load page'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Ajoute un nouvel élément en état non-sauvegardé
   *
   * L'élément est créé localement et sera synchronisé au backend lors de saveElements().
   * Les IDs et timestamps seront générés par le backend.
   *
   * @param {IPageElementCreateRequest} elementData - Données de l'élément
   * @throws {Error} Si pas de page actuellement chargée
   * @example
   * addElement({
   *   type: 'text',
   *   x: 10, y: 10,
   *   width: 100, height: 50,
   *   content: { text: 'Hello', fontFamily: 'Roboto', fontSize: 16, fill: '#000000' }
   * });
   */
  const addElement = (elementData: IPageElementCreateRequest): void => {
    if (!currentPage.value) {
      throw new Error('No page currently loaded')
    }

    const pageId = currentPage.value.id

    // Déterminer le zIndex (à la fin de la liste)
    const existingElements = elements.value[pageId] || []
    const maxZIndex = existingElements.length > 0
      ? Math.max(...existingElements.map((e) => e.zIndex))
      : 0
    const newZIndex = maxZIndex + 1

    // Utiliser un ID temporaire pour tracker localement
    // Cet ID sera remplacé par l'ID généré par le backend
    const tempId = `temp_${Date.now()}_${Math.random()}`

    // Créer un objet intermédiaire pour tracker l'élément non-sauvegardé
    const unsavedElement: any = {
      id: tempId,
      pageId,
      zIndex: elementData.zIndex ?? newZIndex,
      ...elementData,
    }

    // Ajouter aux changements non sauvegardés
    unsavedElements.value.set(tempId, unsavedElement)
  }

  /**
   * Met à jour un élément existant
   *
   * Applique les changements localement et les marque comme non-sauvegardés.
   *
   * @param {string} elementId - ID de l'élément
   * @param {Partial<IPageElement>} changes - Changements à appliquer
   * @throws {Error} Si l'élément n'existe pas
   * @example
   * updateElement('element-789', { x: 15, y: 15 });
   */
  const updateElement = (
    elementId: string,
    changes: Partial<IPageElement>
  ): void => {
    // Chercher l'élément dans les changements non sauvegardés
    if (unsavedElements.value.has(elementId)) {
      const existing = unsavedElements.value.get(elementId)!
      unsavedElements.value.set(elementId, {
        ...existing,
        ...changes,
        updatedAt: new Date().toISOString(),
      })
      return
    }

    // Chercher l'élément dans la page actuelle
    if (!currentPage.value) {
      throw new Error('No page currently loaded')
    }

    const pageId = currentPage.value.id
    const pageElements = elements.value[pageId] || []
    const existingIndex = pageElements.findIndex((e) => e.id === elementId)

    if (existingIndex === -1) {
      throw new Error(`Element ${elementId} not found`)
    }

    // Ajouter aux changements non sauvegardés
    const existing = pageElements[existingIndex]
    unsavedElements.value.set(elementId, {
      ...existing,
      ...changes,
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * Supprime un élément
   *
   * Marque l'élément comme supprimé (déplacement vers unsavedElements avec deletion flag).
   * La suppression réelle se fait lors de saveElements().
   *
   * @param {string} elementId - ID de l'élément
   * @throws {Error} Si l'élément n'existe pas
   * @example
   * deleteElement('element-789');
   */
  const deleteElement = (elementId: string): void => {
    if (!currentPage.value) {
      throw new Error('No page currently loaded')
    }

    const pageId = currentPage.value.id
    const pageElements = elements.value[pageId] || []
    const elementExists = pageElements.some((e) => e.id === elementId)

    if (!elementExists && !unsavedElements.value.has(elementId)) {
      throw new Error(`Element ${elementId} not found`)
    }

    // Marquer pour suppression (sera géré par le backend)
    // On ajoute à unsavedElements pour tracker que cet ID doit être supprimé
    unsavedElements.value.set(elementId, { ...{} } as IPageElement)
  }

  /**
   * Sauvegarde tous les changements non sauvegardés au backend
   *
   * Utilise un batch save pour minimiser les requêtes HTTP.
   * En cas de succès, vide la Map unsavedElements et met à jour l'état local.
   * En cas d'erreur, conserve unsavedElements pour retry.
   *
   * @throws {Error} Si la sauvegarde échoue
   * @example
   * try {
   *   await saveElements();
   *   showSuccessToast('Changes saved');
   * } catch (err) {
   *   showErrorToast('Save failed, will retry later');
   * }
   */
  const saveElements = async (): Promise<void> => {
    if (!currentPage.value || unsavedElements.value.size === 0) {
      return
    }

    loading.value = true
    error.value = null
    try {
      const pageId = currentPage.value.id
      const elementsToSave = Array.from(unsavedElements.value.values())

      // Envoyer les changements au backend
      await pageService.saveElements(pageId, elementsToSave)

      // Mettre à jour l'état local avec les éléments sauvegardés
      if (!elements.value[pageId]) {
        elements.value[pageId] = []
      }

      // Ajouter les éléments créés
      const savedElements = elementsToSave.filter((el) => el.id)
      for (const savedElement of savedElements) {
        const existingIndex = elements.value[pageId].findIndex(
          (e) => e.id === savedElement.id
        )
        if (existingIndex >= 0) {
          // Mise à jour
          elements.value[pageId][existingIndex] = savedElement
        } else if (Object.keys(savedElement).length > 0) {
          // Création
          elements.value[pageId].push(savedElement)
        }
      }

      // Vider les changements non sauvegardés
      unsavedElements.value.clear()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save elements'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Réordonne les éléments en modifiant leurs zIndex
   *
   * @param {string} pageId - ID de la page
   * @param {string[]} elementIds - IDs des éléments dans le nouvel ordre
   * @example
   * reorderByZIndex('page-123', ['elem-1', 'elem-3', 'elem-2']);
   */
  const reorderByZIndex = (pageId: string, elementIds: string[]): void => {
    const pageElements = elements.value[pageId] || []

    elementIds.forEach((elementId, index) => {
      const element = pageElements.find((e) => e.id === elementId)
      if (element) {
        updateElement(elementId, { zIndex: index })
      }
    })
  }

  /**
   * Réinitialise l'état actuel (lors de la navigation)
   *
   * @example
   * clearPage(); // Avant de charger une autre page
   */
  const clearPage = (): void => {
    currentPage.value = null
    unsavedElements.value.clear()
    error.value = null
  }

  /**
   * Réinitialise le message d'erreur
   */
  const clearError = (): void => {
    error.value = null
  }

  // ========================================
  // EXPORT
  // ========================================

  return {
    // State
    currentPage,
    pages,
    elements,
    loading,
    error,
    unsavedElements,

    // Getters
    elementsByZIndex,
    textElementCount,
    hasUnsavedChanges,

    // Actions
    loadPage,
    addElement,
    updateElement,
    deleteElement,
    saveElements,
    reorderByZIndex,
    clearPage,
    clearError,
  }
})
