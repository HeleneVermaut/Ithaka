/**
 * Store Pinia pour la gestion de l'éditeur de page
 *
 * Ce store centralise toute la logique d'état pour l'éditeur de page :
 * - Instance du canvas Fabric.js
 * - Élément actuellement sélectionné
 * - Niveau de zoom et visibilité de la grille
 * - État d'auto-sauvegarde
 *
 * Architecture:
 * - State : Données réactives (canvas, selectedElement, zoom, etc.)
 * - Getters : État dérivé (isCanvasReady, selectedElement data)
 * - Actions : Méthodes pour manipuler le canvas et l'UI
 *
 * Utilisation dans les composants :
 * ```typescript
 * import { useEditorStore } from '@/stores/editor'
 *
 * const editorStore = useEditorStore()
 * editorStore.setCanvas(fabricCanvas)
 * editorStore.selectElement(element)
 * editorStore.updateZoom(1.5)
 * ```
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fabric } from 'fabric'
import * as fabricService from '@/services/fabricService'
import type { SerializedElement } from '@/services/fabricService'
import { usePagesStore } from './pages'

/**
 * Type pour l'état d'auto-sauvegarde
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Store d'édition de page
 */
export const useEditorStore = defineStore('editor', () => {
  // ========================================
  // STATE (État réactif)
  // ========================================

  /**
   * Instance du canvas Fabric.js
   * null si le canvas n'est pas initialisé
   *
   * Contient la surface de dessin interactive avec tous les objets
   */
  const canvas = ref<fabric.Canvas | null>(null)

  /**
   * Élément actuellement sélectionné
   * null si aucun élément n'est sélectionné
   *
   * Contient les données de l'objet sélectionné pour affichage
   * dans le panneau de propriétés de droite
   */
  const selectedElement = ref<SerializedElement | null>(null)

  /**
   * Niveau de zoom du canvas
   * 1 = 100%, 1.5 = 150%, 0.5 = 50%
   *
   * Utilisé pour afficher le niveau de zoom dans la barre d'outils
   * et pour effectuer les opérations de zoom
   */
  const zoom = ref<number>(1)

  /**
   * Visibilité de la grille d'aide
   * true si la grille est visible, false sinon
   *
   * Permet à l'utilisateur de basculer l'affichage de la grille
   */
  const gridVisible = ref<boolean>(true)

  /**
   * État d'auto-sauvegarde
   * idle: rien ne se passe
   * saving: sauvegarde en cours
   * saved: sauvegarde réussie
   * error: erreur lors de la sauvegarde
   *
   * Utilisé pour afficher le statut à l'utilisateur
   */
  const autoSaveStatus = ref<AutoSaveStatus>('idle')

  /**
   * Message d'erreur en cas d'échec
   * null si aucune erreur
   *
   * Contient le message d'erreur à afficher à l'utilisateur
   */
  const lastError = ref<string | null>(null)

  /**
   * Position historique du dernier undo/redo
   * Pour implémenter l'historique d'édition
   */
  const history = ref<SerializedElement[][]>([])

  /**
   * Index de la position actuelle dans l'historique
   */
  const historyIndex = ref<number>(-1)

  /**
   * Clipboard pour copier/coller des éléments
   * Stocke l'objet Fabric cloné temporairement
   */
  const clipboard = ref<fabric.Object | null>(null)

  /**
   * Référence vers l'objet Fabric sélectionné
   * Permet les opérations directes sur l'objet canvas
   */
  const selectedFabricObj = ref<fabric.Object | null>(null)

  // ========================================
  // GETTERS (État dérivé)
  // ========================================

  /**
   * Indique si le canvas est initialisé et prêt
   * true si canvas n'est pas null
   *
   * Utilisé par les composants pour vérifier l'état du canvas
   * avant d'effectuer des opérations
   */
  const isCanvasReady = computed<boolean>(() => canvas.value !== null)

  /**
   * Retourne les données de l'élément sélectionné
   * null si aucun élément n'est sélectionné
   *
   * Utilisé dans le panneau de propriétés pour afficher
   * les détails de l'élément sélectionné
   */
  const getSelectedElementData = computed(() => selectedElement.value)

  /**
   * Retourne la liste de tous les objets sur le canvas
   * Tableau vide si canvas n'est pas prêt
   *
   * Utilisé pour afficher la liste des objets ou pour
   * effectuer des opérations globales
   */
  const getCanvasObjects = computed(() => {
    if (!canvas.value) return []
    return canvas.value.getObjects()
  })

  /**
   * Indique si on peut faire undo
   * true si historyIndex > 0
   */
  const canUndo = computed<boolean>(() => historyIndex.value > 0)

  /**
   * Indique si on peut faire redo
   * true si historyIndex < history.length - 1
   */
  const canRedo = computed<boolean>(() => historyIndex.value < history.value.length - 1)

  // ========================================
  // ACTIONS (Méthodes)
  // ========================================

  /**
   * Définir l'instance du canvas
   *
   * Appelé par EditorCanvas après initialisation du canvas Fabric.js
   *
   * @param fabricCanvas - Instance fabric.Canvas à stocker
   *
   * @example
   * ```typescript
   * const canvas = new fabric.Canvas(element)
   * editorStore.setCanvas(canvas)
   * ```
   */
  const setCanvas = (fabricCanvas: fabric.Canvas): void => {
    canvas.value = fabricCanvas
    console.log('Canvas set in editor store')
  }

  /**
   * Nettoyer le canvas
   *
   * Réinitialise le store (sans disposer du canvas lui-même)
   * Appelé quand on quitte l'éditeur
   */
  const clearCanvas = (): void => {
    canvas.value = null
    selectedElement.value = null
    zoom.value = 1
    gridVisible.value = true
    autoSaveStatus.value = 'idle'
    lastError.value = null
    history.value = []
    historyIndex.value = -1

    console.log('Canvas cleared from editor store')
  }

  /**
   * Sélectionner un élément
   *
   * Met à jour l'état du selectedElement quand l'utilisateur
   * clique sur un objet du canvas. Récupère également l'objet Fabric correspondant.
   *
   * @param element - Élément sélectionné (null pour désélectionner)
   *
   * @example
   * ```typescript
   * editorStore.selectElement(serializedElement)
   * // Affiche les propriétés de cet élément dans le panneau droit
   * ```
   */
  const selectElement = (element: SerializedElement | null): void => {
    selectedElement.value = element

    // Récupérer l'objet Fabric correspondant
    if (element && canvas.value) {
      const obj = fabricService.getObjectById(canvas.value, element.id)
      selectedFabricObj.value = obj || null
    } else {
      selectedFabricObj.value = null
    }

    if (element) {
      console.log(`Element selected: ${element.id}`)
    } else {
      console.log('Element deselected')
    }
  }

  /**
   * Mettre à jour l'élément sélectionné
   *
   * Appelé quand l'élément sélectionné est modifié
   * (déplacé, redimensionné, roté, etc.)
   *
   * @param element - Élément avec les nouvelles données
   *
   * @example
   * ```typescript
   * // L'utilisateur redimensionne un élément
   * editorStore.updateSelectedElement(modifiedElement)
   * ```
   */
  const updateSelectedElement = (element: SerializedElement): void => {
    selectedElement.value = element
    console.log(`Element updated: ${element.id}`)
  }

  /**
   * Mettre à jour le zoom
   *
   * Change le niveau de zoom du canvas et le stocke dans l'état
   *
   * @param zoomLevel - Nouveau niveau de zoom (1 = 100%)
   *
   * @example
   * ```typescript
   * editorStore.updateZoom(1.5) // Zoom à 150%
   * editorStore.updateZoom(0.8) // Zoom à 80%
   * ```
   */
  const updateZoom = (zoomLevel: number): void => {
    // Limiter le zoom entre 10% et 400%
    const clampedZoom = Math.max(0.1, Math.min(4, zoomLevel))

    if (canvas.value) {
      canvas.value.setZoom(clampedZoom)
      canvas.value.renderAll()
    }

    zoom.value = clampedZoom
    console.log(`Zoom updated to ${(clampedZoom * 100).toFixed(0)}%`)
  }

  /**
   * Augmenter le zoom
   *
   * Augmente le zoom par pas de 10%
   *
   * @example
   * ```typescript
   * editorStore.zoomIn() // Augmente le zoom de 10%
   * ```
   */
  const zoomIn = (): void => {
    updateZoom(zoom.value + 0.1)
  }

  /**
   * Diminuer le zoom
   *
   * Diminue le zoom par pas de 10%
   *
   * @example
   * ```typescript
   * editorStore.zoomOut() // Diminue le zoom de 10%
   * ```
   */
  const zoomOut = (): void => {
    updateZoom(zoom.value - 0.1)
  }

  /**
   * Réinitialiser le zoom
   *
   * Revient à 100% (zoom = 1)
   *
   * @example
   * ```typescript
   * editorStore.resetZoom()
   * ```
   */
  const resetZoom = (): void => {
    updateZoom(1)
  }

  /**
   * Basculer la visibilité de la grille
   *
   * Inverse l'état de gridVisible
   *
   * @example
   * ```typescript
   * editorStore.toggleGrid() // Affiche/masque la grille
   * ```
   */
  const toggleGrid = (): void => {
    gridVisible.value = !gridVisible.value

    if (canvas.value) {
      // Redessiner le canvas pour appliquer les changements
      canvas.value.renderAll()
    }

    console.log(`Grid ${gridVisible.value ? 'shown' : 'hidden'}`)
  }

  /**
   * Définir la visibilité de la grille
   *
   * @param visible - true pour afficher, false pour masquer
   *
   * @example
   * ```typescript
   * editorStore.setGridVisible(true)
   * ```
   */
  const setGridVisible = (visible: boolean): void => {
    gridVisible.value = visible

    if (canvas.value) {
      canvas.value.renderAll()
    }

    console.log(`Grid visibility set to ${visible}`)
  }

  /**
   * Mettre à jour l'état d'auto-sauvegarde
   *
   * Utilisé pour afficher le statut de sauvegarde à l'utilisateur
   *
   * @param status - Nouvel état ('idle', 'saving', 'saved', 'error')
   *
   * @example
   * ```typescript
   * editorStore.setAutoSaveStatus('saving')
   * // ... opération API ...
   * editorStore.setAutoSaveStatus('saved')
   * ```
   */
  const setAutoSaveStatus = (status: AutoSaveStatus): void => {
    autoSaveStatus.value = status

    // Réinitialiser le message "saved" après 2 secondes
    if (status === 'saved') {
      setTimeout(() => {
        if (autoSaveStatus.value === 'saved') {
          autoSaveStatus.value = 'idle'
        }
      }, 2000)
    }

    console.log(`Auto-save status: ${status}`)
  }

  /**
   * Définir un message d'erreur
   *
   * Stocke le dernier message d'erreur pour affichage
   *
   * @param error - Message d'erreur (null pour effacer)
   *
   * @example
   * ```typescript
   * try {
   *   await saveElements()
   * } catch (err) {
   *   editorStore.setError(err.message)
   * }
   * ```
   */
  const setError = (error: string | null): void => {
    lastError.value = error

    if (error) {
      console.error(`Editor error: ${error}`)
      setAutoSaveStatus('error')
    }
  }

  /**
   * Ajouter une entrée à l'historique
   *
   * Sauvegarde l'état actuel pour undo/redo
   * Appelé après chaque modification importante
   *
   * @param elements - État actuel des éléments
   *
   * @example
   * ```typescript
   * const elements = serializeCanvasElements(canvas)
   * editorStore.pushHistory(elements)
   * ```
   */
  const pushHistory = (elements: SerializedElement[]): void => {
    // Si on était au milieu de l'historique, supprimer les états redo
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // Ajouter le nouvel état
    history.value.push([...elements])
    historyIndex.value = history.value.length - 1

    // Limiter l'historique à 50 entrées pour éviter la consommation excessive de mémoire
    if (history.value.length > 50) {
      history.value = history.value.slice(-50)
      historyIndex.value = history.value.length - 1
    }

    console.log(`History pushed (${historyIndex.value + 1}/${history.value.length})`)
  }

  /**
   * Revenir à l'état précédent (undo)
   *
   * @returns Élément ou null si undo n'est pas possible
   *
   * @example
   * ```typescript
   * const previousState = editorStore.undo()
   * if (previousState) {
   *   loadCanvasElements(canvas, previousState)
   * }
   * ```
   */
  const undo = (): SerializedElement[] | null => {
    if (historyIndex.value <= 0) {
      console.warn('Cannot undo: already at first state')
      return null
    }

    historyIndex.value--
    const state = history.value[historyIndex.value]

    console.log(`Undo (${historyIndex.value + 1}/${history.value.length})`)
    return state ? [...state] : null
  }

  /**
   * Aller à l'état suivant (redo)
   *
   * @returns Élément ou null si redo n'est pas possible
   *
   * @example
   * ```typescript
   * const nextState = editorStore.redo()
   * if (nextState) {
   *   loadCanvasElements(canvas, nextState)
   * }
   * ```
   */
  const redo = (): SerializedElement[] | null => {
    if (historyIndex.value >= history.value.length - 1) {
      console.warn('Cannot redo: already at last state')
      return null
    }

    historyIndex.value++
    const state = history.value[historyIndex.value]

    console.log(`Redo (${historyIndex.value + 1}/${history.value.length})`)
    return state ? [...state] : null
  }

  /**
   * Supprimer l'historique
   *
   * Réinitialise undo/redo (appelé après sauvegarde)
   */
  const clearHistory = (): void => {
    history.value = []
    historyIndex.value = -1
    console.log('History cleared')
  }

  /**
   * Ajouter un élément texte au canvas
   *
   * Crée un nouvel objet Fabric.Textbox avec les paramètres fournis,
   * l'ajoute au canvas, et le stocke dans l'historique.
   *
   * @param params - Paramètres du texte
   *   - text: Contenu du texte
   *   - fontSize: Taille de police (8-200px)
   *   - color: Couleur au format HEX
   *   - fontFamily: Famille de police
   *   - fontCategory: Catégorie de police pour fallback
   *   - styles: Styles appliqués (gras, italique, souligné)
   *
   * @returns L'élément sérialisé ajouté, ou null en cas d'erreur
   *
   * @example
   * ```typescript
   * const element = editorStore.addTextElement({
   *   text: 'Hello World',
   *   fontSize: 24,
   *   color: '#FF0000',
   *   fontFamily: 'Playfair Display',
   *   fontCategory: 'serif',
   *   styles: { isBold: true, isItalic: false, isUnderline: false }
   * })
   * ```
   */
  const addTextElement = (params: {
    text: string
    fontSize: number
    color: string
    fontFamily: string
    fontCategory: 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting'
    styles: {
      isBold: boolean
      isItalic: boolean
      isUnderline: boolean
    }
  }): SerializedElement | null => {
    if (!canvas.value) {
      console.error('Canvas not initialized')
      return null
    }

    try {
      // Créer l'objet Fabric.Textbox
      const textbox = new fabric.Textbox(params.text, {
        left: 100,
        top: 100,
        width: 200,
        fontSize: params.fontSize,
        fill: params.color,
        fontFamily: params.fontFamily,
        fontWeight: params.styles.isBold ? 'bold' : 'normal',
        fontStyle: params.styles.isItalic ? 'italic' : 'normal',
        underline: params.styles.isUnderline,
        editable: true,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        objectCaching: false
      })

      // Ajouter au canvas
      canvas.value.add(textbox)
      canvas.value.setActiveObject(textbox)
      canvas.value.renderAll()

      // Sérialiser l'élément
      const serialized = fabricService.serializeElement(textbox) as SerializedElement

      // Ajouter à l'historique
      const currentState = canvas.value.getObjects().map((obj) => fabricService.serializeElement(obj))
      pushHistory(currentState as SerializedElement[])

      console.log(`Text element added: ${serialized.id}`)
      return serialized
    } catch (error) {
      console.error('Error adding text element:', error)
      setError(`Erreur lors de l'ajout de texte: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    }
  }

  // ========================================
  // ACTIONS - CLIPBOARD (Copy/Paste)
  // ========================================

  /**
   * Copier l'élément sélectionné dans le clipboard
   *
   * Clone l'objet Fabric actuel et le stocke dans le state clipboard.
   * L'utilisateur peut ensuite coller avec Ctrl+V.
   *
   * @example
   * ```typescript
   * editorStore.copyToClipboard()
   * ```
   */
  function copyToClipboard(): void {
    if (!selectedFabricObj.value) {
      console.warn('No element selected to copy')
      return
    }

    selectedFabricObj.value.clone((cloned: fabric.Object) => {
      clipboard.value = cloned
      console.log('Element copied to clipboard')
    })
  }

  /**
   * Coller l'élément du clipboard sur le canvas
   *
   * Clone l'objet stocké dans clipboard, lui attribue un nouvel ID,
   * le décale légèrement (offset +10px), et l'ajoute au canvas.
   *
   * @example
   * ```typescript
   * editorStore.pasteFromClipboard()
   * ```
   */
  async function pasteFromClipboard(): Promise<void> {
    if (!clipboard.value || !canvas.value) {
      console.warn('Nothing to paste')
      return
    }

    try {
      clipboard.value.clone(async (clonedObj: fabric.Object) => {
        // Offset position pour éviter superposition exacte
        clonedObj.set({
          left: (clonedObj.left || 0) + 10,
          top: (clonedObj.top || 0) + 10
        })

        // Générer nouvel ID unique
        const newElementId = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        clonedObj.data = {
          elementId: newElementId,
          id: newElementId
        }

        // Ajouter au canvas
        canvas.value!.add(clonedObj)
        canvas.value!.setActiveObject(clonedObj)
        canvas.value!.renderAll()

        // Sérialiser et ajouter au store pages
        const serialized = fabricService.serializeElement(clonedObj) as SerializedElement
        serialized.id = newElementId

        const pagesStore = usePagesStore()
        pagesStore.addElement(serialized as any)

        // Mettre à jour l'historique
        const currentState = canvas.value!.getObjects().map((obj) =>
          fabricService.serializeElement(obj)
        )
        pushHistory(currentState as SerializedElement[])

        window.$message?.success('Élément collé')
        console.log(`Element pasted: ${newElementId}`)
      })
    } catch (error) {
      console.error('Failed to paste:', error)
      window.$message?.error('Erreur lors du collage')
    }
  }

  // ========================================
  // ACTIONS - ELEMENT MANAGEMENT
  // ========================================

  /**
   * Désélectionner l'élément actif
   *
   * Efface la sélection sur le canvas et dans le store.
   *
   * @example
   * ```typescript
   * editorStore.deselectElement()
   * ```
   */
  function deselectElement(): void {
    if (canvas.value) {
      canvas.value.discardActiveObject()
      canvas.value.renderAll()
    }

    selectedElement.value = null
    selectedFabricObj.value = null

    console.log('Element deselected')
  }

  /**
   * Supprimer l'élément sélectionné
   *
   * Supprime l'objet du canvas et du store pages.
   *
   * @example
   * ```typescript
   * await editorStore.deleteElement()
   * ```
   */
  async function deleteElement(): Promise<void> {
    if (!canvas.value || !selectedFabricObj.value || !selectedElement.value) {
      console.warn('No element selected to delete')
      return
    }

    try {
      // Supprimer du canvas
      canvas.value.remove(selectedFabricObj.value)
      canvas.value.renderAll()

      // Supprimer du store pages
      const pagesStore = usePagesStore()
      await pagesStore.deleteElement(selectedElement.value.id)

      // Mettre à jour l'historique
      const currentState = canvas.value.getObjects().map((obj) =>
        fabricService.serializeElement(obj)
      )
      pushHistory(currentState as SerializedElement[])

      // Clear selection
      deselectElement()

      window.$message?.success('Élément supprimé avec succès')
      console.log(`Element deleted: ${selectedElement.value.id}`)
    } catch (error) {
      console.error('Failed to delete element:', error)
      window.$message?.error('Erreur lors de la suppression')
    }
  }

  // ========================================
  // ACTIONS - Z-INDEX MANAGEMENT
  // ========================================

  /**
   * Amener l'élément au premier plan (au-dessus de tous)
   *
   * @example
   * ```typescript
   * editorStore.bringToFront()
   * ```
   */
  function bringToFront(): void {
    if (!canvas.value || !selectedFabricObj.value) {
      console.warn('No element selected')
      return
    }

    canvas.value.bringToFront(selectedFabricObj.value)
    canvas.value.renderAll()
    updateZIndexFromCanvas()

    window.$message?.success('Déplacé au premier plan')
  }

  /**
   * Avancer l'élément d'un plan
   *
   * @example
   * ```typescript
   * editorStore.bringForward()
   * ```
   */
  function bringForward(): void {
    if (!canvas.value || !selectedFabricObj.value) {
      console.warn('No element selected')
      return
    }

    canvas.value.bringForward(selectedFabricObj.value)
    canvas.value.renderAll()
    updateZIndexFromCanvas()
  }

  /**
   * Reculer l'élément d'un plan
   *
   * @example
   * ```typescript
   * editorStore.sendBackward()
   * ```
   */
  function sendBackward(): void {
    if (!canvas.value || !selectedFabricObj.value) {
      console.warn('No element selected')
      return
    }

    canvas.value.sendBackwards(selectedFabricObj.value)
    canvas.value.renderAll()
    updateZIndexFromCanvas()
  }

  /**
   * Envoyer l'élément à l'arrière-plan (en dessous de tous)
   *
   * @example
   * ```typescript
   * editorStore.sendToBack()
   * ```
   */
  function sendToBack(): void {
    if (!canvas.value || !selectedFabricObj.value) {
      console.warn('No element selected')
      return
    }

    canvas.value.sendToBack(selectedFabricObj.value)
    canvas.value.renderAll()
    updateZIndexFromCanvas()

    window.$message?.success('Déplacé à l\'arrière-plan')
  }

  /**
   * Mettre à jour les zIndex de tous les éléments depuis le canvas
   *
   * Synchronise l'ordre des objets sur le canvas avec le store pages.
   *
   * @private
   */
  function updateZIndexFromCanvas(): void {
    if (!canvas.value) return

    const objects = canvas.value.getObjects()
    const pagesStore = usePagesStore()

    objects.forEach((obj, index) => {
      if (obj.data?.elementId) {
        pagesStore.updateElement(obj.data.elementId, { zIndex: index })
      }
    })
  }

  // ========================================
  // EXPORT DU STORE
  // ========================================

  return {
    // State
    canvas,
    selectedElement,
    selectedFabricObj,
    clipboard,
    zoom,
    gridVisible,
    autoSaveStatus,
    lastError,
    history,
    historyIndex,

    // Getters
    isCanvasReady,
    getSelectedElementData,
    getCanvasObjects,
    canUndo,
    canRedo,

    // Actions - Canvas management
    setCanvas,
    clearCanvas,

    // Actions - Element selection
    selectElement,
    updateSelectedElement,
    deselectElement,

    // Actions - Zoom controls
    updateZoom,
    zoomIn,
    zoomOut,
    resetZoom,

    // Actions - Grid toggles
    toggleGrid,
    setGridVisible,

    // Actions - Auto-save status
    setAutoSaveStatus,
    setError,

    // Actions - Undo/Redo
    pushHistory,
    undo,
    redo,
    clearHistory,

    // Actions - Text element creation
    addTextElement,

    // Actions - Clipboard
    copyToClipboard,
    pasteFromClipboard,

    // Actions - Element management
    deleteElement,

    // Actions - Z-index
    bringToFront,
    bringForward,
    sendBackward,
    sendToBack
  }
})
