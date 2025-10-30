/**
 * Composable: useKeyboardShortcuts
 *
 * Gère tous les raccourcis clavier pour l'éditeur de page (PageEditor.vue).
 * Supporte les raccourcis multi-plateformes (Ctrl/Cmd) avec prévention des conflits navigateur.
 *
 * Raccourcis supportés:
 * - Ctrl+Z: Annuler (undo) - revenir à l'état précédent
 * - Ctrl+Shift+Z / Ctrl+Y: Refaire (redo) - avancer à l'état suivant
 * - Delete / Backspace: Supprimer l'élément sélectionné
 * - Ctrl+A: Sélectionner tous les éléments
 * - Ctrl+D: Dupliquer l'élément sélectionné
 * - Flèches (↑↓←→): Déplacer l'élément de 1px
 * - Flèches + Shift: Déplacer l'élément de 10px
 * - Escape: Désélectionner l'élément / Fermer les modals
 *
 * Comportements intelligents:
 * - Pas d'activation lors de la saisie dans inputs/textareas
 * - Prévention du comportement navigateur (Ctrl+S, Ctrl+P, etc.)
 * - Pas d'interférence avec les combinaisons navigateur (Ctrl+Tab, Ctrl+N)
 * - Support du répétage de touches pour les flèches
 * - Gestion des sauvegardes et de l'historique
 *
 * Intégration:
 * - pageElementsStore: selection, delete, duplicate
 * - editor store: undo, redo (via editorStore)
 * - pageElementService: mises à jour API
 * - Message notifications (NaiveUI)
 *
 * @module composables/useKeyboardShortcuts
 *
 * @example
 * ```typescript
 * // Dans PageEditor.vue
 * import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
 *
 * // Utilisation simple (attache automatiquement les listeners)
 * useKeyboardShortcuts()
 * ```
 */

import { onMounted, onUnmounted, ref } from 'vue'
import { usePageElementsStore } from '@/stores/pageElementsStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useMessage } from 'naive-ui'

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Configuration optionnelle pour les raccourcis clavier
 */
export interface KeyboardShortcutsConfig {
  /** Callback pour afficher le modal de suppression */
  onShowDeleteModal?: (show: boolean) => void
  /** Callback pour force save (Ctrl+S) */
  forceSave?: () => void | Promise<void>
  /** Activer les logs de debug */
  debug?: boolean
  /** État initial: raccourcis activés ou désactivés */
  initiallyEnabled?: boolean
}

/**
 * État des touches enfoncées (pour détecter les combinaisons)
 */
interface KeyState {
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
}

// ========================================
// CONSTANTES
// ========================================

/**
 * Valeur de nudge par défaut (pixels)
 */
const NUDGE_STEP = 1

/**
 * Valeur de nudge accélérée avec Shift (pixels)
 */
const NUDGE_STEP_FAST = 10

/**
 * Délai de debounce pour éviter les rafales de mises à jour API (ms)
 */
const API_UPDATE_DEBOUNCE = 150

/**
 * Délai minimum entre deux actions consécutives (ms)
 */
const ACTION_THROTTLE_DELAY = 50

// ========================================
// COMPOSABLE: useKeyboardShortcuts
// ========================================

/**
 * Composable pour gérer les raccourcis clavier de l'éditeur de page
 *
 * Gère les inputs clavier globaux et déclenche les actions correspondantes.
 * Intègre avec les stores (pageElementsStore, editorStore) et services (pageElementService).
 *
 * @param config - Configuration optionnelle des raccourcis
 *
 * @returns Objet contenant les méthodes de contrôle (enableShortcuts, disableShortcuts, etc.)
 *
 * @example
 * ```typescript
 * // Utilisation basique
 * useKeyboardShortcuts()
 *
 * // Avec configuration complète
 * useKeyboardShortcuts({
 *   onShowDeleteModal: (show) => { showDeleteModal.value = show },
 *   forceSave: async () => { await save() },
 *   debug: true,
 *   initiallyEnabled: true
 * })
 * ```
 */
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig = {}) {
  // ========================================
  // SETUP STORES & SERVICES
  // ========================================

  const pageElementsStore = usePageElementsStore()
  const historyStore = useHistoryStore()
  const message = useMessage()

  // ========================================
  // LOCAL STATE
  // ========================================

  /**
   * Indique si les raccourcis sont actuellement activés
   * Permet de désactiver temporairement sans détacher les listeners
   */
  const isEnabled = ref<boolean>(config.initiallyEnabled ?? true)

  /**
   * État des touches de modification pour la détection de combinaisons
   */
  const keyState = ref<KeyState>({
    ctrl: false,
    shift: false,
    alt: false,
    meta: false
  })

  /**
   * Timestamp de la dernière action pour throttling
   */
  let lastActionTime = 0

  /**
   * Timer pour debounce des mises à jour API
   */
  let apiUpdateTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Cache des touches actuellement enfoncées (pour éviter les événements répétés)
   */
  const pressedKeys = new Set<string>()

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Détecte si l'élément cible est un champ éditable (input, textarea, contentEditable)
   * Utilisé pour éviter d'intercepter les raccourcis de saisie
   *
   * @param target - Élément cible de l'événement
   * @returns true si l'élément est éditable
   *
   * @example
   * ```typescript
   * const editable = isEditableElement(event.target)
   * if (!editable) {
   *   // Traiter le raccourci clavier
   * }
   * ```
   */
  function isEditableElement(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) {
      return false
    }

    const tagName = target.tagName.toUpperCase()
    const isContentEditable = target.contentEditable === 'true'

    // Considérer comme éditable: input, textarea, contentEditable
    return (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      tagName === 'SELECT' ||
      isContentEditable
    )
  }

  /**
   * Détecte si on est sur macOS pour utiliser Cmd au lieu de Ctrl
   * Permet une expérience multi-plateforme cohérente
   *
   * @returns true si on est sur macOS
   *
   * @example
   * ```typescript
   * const isMac = isMacOS()
   * const modifier = isMac ? event.metaKey : event.ctrlKey
   * ```
   */
  function isMacOS(): boolean {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
  }

  /**
   * Vérifie si le raccourci peut être exécuté (security check)
   * Empêche les raccourcis dans les contextes non appropriés
   *
   * @param event - L'événement clavier
   * @returns true si le raccourci peut être exécuté
   */
  function isSafeToExecute(event: KeyboardEvent): boolean {
    // Ne pas intercepter si on est dans un élément éditable
    if (isEditableElement(event.target)) {
      return false
    }

    // Ne pas intercepter les combinaisons du navigateur essentielles
    const isMac = isMacOS()
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey

    // Autoriser Escape toujours
    if (event.key === 'Escape') {
      return true
    }

    // Bloquer les combinaisons navigateur (Ctrl+Tab, Ctrl+N, Ctrl+W, Ctrl+Q)
    if (ctrlKey && ['Tab', 'n', 'N', 'w', 'W', 'q', 'Q'].includes(event.key)) {
      return false
    }

    // Bloquer Alt+Tab sur Windows
    if (event.altKey && event.key === 'Tab') {
      return false
    }

    return true
  }

  /**
   * Applique throttling pour éviter trop d'actions rapides
   *
   * @returns true si suffisant de temps s'est écoulé depuis la dernière action
   */
  function canExecuteAction(): boolean {
    const now = Date.now()
    if (now - lastActionTime < ACTION_THROTTLE_DELAY) {
      return false
    }
    lastActionTime = now
    return true
  }

  /**
   * Débounce les mises à jour API pour éviter la surcharge
   *
   * @param callback - Fonction à exécuter après débounce
   */
  function debounceApiUpdate(callback: () => void): void {
    if (apiUpdateTimer !== null) {
      clearTimeout(apiUpdateTimer)
    }
    apiUpdateTimer = setTimeout(callback, API_UPDATE_DEBOUNCE)
  }

  /**
   * Log de debug (seulement si enabled)
   *
   * @param message - Message à afficher
   * @param data - Données optionnelles
   */
  function debugLog(message: string, data?: unknown): void {
    if (config.debug) {
      console.log(`[useKeyboardShortcuts] ${message}`, data || '')
    }
  }

  // ========================================
  // ACTION HANDLERS
  // ========================================

  /**
   * Gère Ctrl+Z: Annuler (undo)
   * Revient à l'état précédent en utilisant l'historique du history store
   */
  async function handleUndo(): Promise<void> {
    if (!canExecuteAction()) return

    try {
      const canUndo = historyStore.canUndo
      if (!canUndo) {
        message?.warning('Aucune action à annuler')
        return
      }

      const success = historyStore.undo()
      if (success) {
        debugLog('Undo executed')
        message?.success('Action annulée')
      } else {
        message?.error('Erreur lors de l\'annulation')
      }
    } catch (err) {
      debugLog('Undo failed', err)
      message?.error('Erreur lors de l\'annulation')
    }
  }

  /**
   * Gère Ctrl+Shift+Z / Ctrl+Y: Refaire (redo)
   * Avance à l'état suivant en utilisant l'historique du history store
   */
  async function handleRedo(): Promise<void> {
    if (!canExecuteAction()) return

    try {
      const canRedo = historyStore.canRedo
      if (!canRedo) {
        message?.warning('Aucune action à rétablir')
        return
      }

      const success = historyStore.redo()
      if (success) {
        debugLog('Redo executed')
        message?.success('Action rétablie')
      } else {
        message?.error('Erreur lors du rétablissement')
      }
    } catch (err) {
      debugLog('Redo failed', err)
      message?.error('Erreur lors du rétablissement')
    }
  }

  /**
   * Gère Delete / Backspace: Supprimer l'élément sélectionné
   * Supprime l'élément via pageElementsStore.deleteElement()
   */
  async function handleDelete(): Promise<void> {
    if (!canExecuteAction()) return

    // Get the first selected element ID (primary selection)
    const selectedIds = pageElementsStore.selectedElementIds
    if (!selectedIds || selectedIds.length === 0) {
      debugLog('Delete pressed but no element selected')
      return
    }

    const selectedId = selectedIds[0]

    try {
      await pageElementsStore.deleteElement(selectedId)
      message?.success('Élément supprimé')
      debugLog('Delete executed', { elementId: selectedId })
    } catch (err) {
      debugLog('Delete failed', err)
      message?.error('Erreur lors de la suppression')
    }
  }

  /**
   * Gère Ctrl+A: Sélectionner tous les éléments
   * Sélectionne tous les éléments de la page actuelle
   */
  async function handleSelectAll(): Promise<void> {
    if (!canExecuteAction()) return

    try {
      const elementCount = pageElementsStore.getElementCount
      if (elementCount === 0) {
        message?.info('Aucun élément sur la page')
        return
      }

      // Sélectionner tous les éléments via le store (selectAll method)
      pageElementsStore.selectAll()
      message?.info(`${elementCount} élément(s) sélectionnés`)
      debugLog('SelectAll executed', { count: elementCount })
    } catch (err) {
      debugLog('SelectAll failed', err)
    }
  }

  /**
   * Gère Ctrl+D: Dupliquer l'élément sélectionné
   * Crée une copie de l'élément via pageElementsStore.duplicateElement()
   */
  async function handleDuplicate(): Promise<void> {
    if (!canExecuteAction()) return

    // Get the first selected element ID (primary selection)
    const selectedIds = pageElementsStore.selectedElementIds
    if (!selectedIds || selectedIds.length === 0) {
      debugLog('Duplicate pressed but no element selected')
      return
    }

    const selectedId = selectedIds[0]

    try {
      await pageElementsStore.duplicateElement(selectedId)
      message?.success('Élément dupliqué')
      debugLog('Duplicate executed', { elementId: selectedId })
    } catch (err) {
      debugLog('Duplicate failed', err)
      message?.error('Erreur lors de la duplication')
    }
  }

  /**
   * Gère les flèches: Déplacer l'élément sélectionné
   * Nudge de 1px (normal) ou 10px (avec Shift)
   *
   * @param direction - Direction: 'up' | 'down' | 'left' | 'right'
   * @param isFast - true si Shift est enfoncé (10px au lieu de 1px)
   */
  async function handleNudge(
    direction: 'up' | 'down' | 'left' | 'right',
    isFast: boolean
  ): Promise<void> {
    if (!canExecuteAction()) return

    // Get the first selected element ID (primary selection)
    const selectedIds = pageElementsStore.selectedElementIds
    if (!selectedIds || selectedIds.length === 0) {
      debugLog('Nudge pressed but no element selected')
      return
    }

    const selectedId = selectedIds[0]

    try {
      const element = pageElementsStore.getElementById(selectedId)
      if (!element) return

      const nudgeValue = isFast ? NUDGE_STEP_FAST : NUDGE_STEP

      // Calculer la nouvelle position
      let newX = element.x
      let newY = element.y

      switch (direction) {
        case 'up':
          newY = Math.max(0, newY - nudgeValue)
          break
        case 'down':
          newY = newY + nudgeValue
          break
        case 'left':
          newX = Math.max(0, newX - nudgeValue)
          break
        case 'right':
          newX = newX + nudgeValue
          break
      }

      // Débounce la mise à jour API
      debounceApiUpdate(async () => {
        try {
          await pageElementsStore.updateElement(selectedId, {
            x: newX,
            y: newY
          })
          debugLog('Nudge API update', { direction, newX, newY })
        } catch (err) {
          debugLog('Nudge API update failed', err)
        }
      })

      debugLog('Nudge executed', {
        direction,
        isFast,
        newX,
        newY
      })
    } catch (err) {
      debugLog('Nudge failed', err)
    }
  }

  /**
   * Gère Escape: Désélectionner l'élément / Fermer les modals
   * Nettoie la sélection actuelle
   */
  async function handleEscape(): Promise<void> {
    const selectedIds = pageElementsStore.selectedElementIds
    const hasSelection = selectedIds && selectedIds.length > 0
    if (hasSelection) {
      pageElementsStore.deselectAll()
      debugLog('Escape executed: elements deselected')
    }

    // Appeler le callback si fourni
    if (config.onShowDeleteModal) {
      config.onShowDeleteModal(false)
    }
  }

  /**
   * Gère Ctrl+S: Forcer la sauvegarde
   * Appelle le callback forceSave fourni en configuration
   */
  async function handleForceSave(): Promise<void> {
    if (!canExecuteAction()) return

    try {
      if (config.forceSave) {
        const result = config.forceSave()

        if (result instanceof Promise) {
          await result
          message?.success('Sauvegarde effectuée')
        } else {
          message?.info('Sauvegarde en cours...')
        }
      } else {
        message?.info('Aucune fonction de sauvegarde configurée')
      }

      debugLog('ForceSave executed')
    } catch (err) {
      debugLog('ForceSave failed', err)
      message?.error('Erreur lors de la sauvegarde')
    }
  }

  // ========================================
  // MAIN EVENT HANDLERS
  // ========================================

  /**
   * Gestionnaire principal pour l'événement keydown
   * Détecte les raccourcis et déclenche les actions correspondantes
   *
   * @param event - L'événement clavier
   */
  function handleKeyDown(event: KeyboardEvent): void {
    // Vérifier que les raccourcis sont activés et que c'est sûr d'exécuter
    if (!isEnabled.value || !isSafeToExecute(event)) {
      return
    }

    // Mettre à jour l'état des modificateurs
    const isMac = isMacOS()
    keyState.value.ctrl = isMac ? event.metaKey : event.ctrlKey
    keyState.value.shift = event.shiftKey
    keyState.value.alt = event.altKey
    keyState.value.meta = event.metaKey

    const ctrlKey = keyState.value.ctrl
    const shiftKey = keyState.value.shift

    // ============================================
    // RACCOURCIS HISTORIQUE (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
    // ============================================

    // Ctrl+Z: Annuler (undo)
    if (ctrlKey && event.key === 'z' && !shiftKey) {
      event.preventDefault()
      handleUndo()
      return
    }

    // Ctrl+Shift+Z ou Ctrl+Y: Refaire (redo)
    if ((ctrlKey && shiftKey && event.key === 'z') || (ctrlKey && event.key === 'y')) {
      event.preventDefault()
      handleRedo()
      return
    }

    // ============================================
    // RACCOURCIS SUPPRESSION (Delete, Backspace)
    // ============================================

    // Delete ou Backspace: Supprimer l'élément sélectionné
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      handleDelete()
      return
    }

    // ============================================
    // RACCOURCIS SÉLECTION (Ctrl+A)
    // ============================================

    // Ctrl+A: Sélectionner tous les éléments
    if (ctrlKey && event.key === 'a') {
      event.preventDefault()
      handleSelectAll()
      return
    }

    // ============================================
    // RACCOURCIS DUPLICATION (Ctrl+D)
    // ============================================

    // Ctrl+D: Dupliquer l'élément sélectionné
    if (ctrlKey && event.key === 'd') {
      event.preventDefault()
      handleDuplicate()
      return
    }

    // ============================================
    // RACCOURCIS FLÈCHES (Nudge)
    // ============================================

    // Les flèches pour déplacer l'élément
    const arrowDirections: Record<string, 'up' | 'down' | 'left' | 'right'> = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right'
    }

    if (arrowDirections[event.key]) {
      event.preventDefault()
      const direction = arrowDirections[event.key]
      handleNudge(direction, shiftKey)
      return
    }

    // ============================================
    // RACCOURCIS DIVERS (Escape, Ctrl+S)
    // ============================================

    // Escape: Désélectionner ou fermer les modals
    if (event.key === 'Escape') {
      event.preventDefault()
      handleEscape()
      return
    }

    // Ctrl+S: Forcer la sauvegarde
    if (ctrlKey && event.key === 's') {
      event.preventDefault()
      handleForceSave()
      return
    }
  }

  /**
   * Gestionnaire pour l'événement keyup
   * Permet de détecter quand les touches sont relâchées
   *
   * @param event - L'événement clavier
   */
  function handleKeyUp(event: KeyboardEvent): void {
    const isMac = isMacOS()

    // Mettre à jour l'état des modificateurs
    keyState.value.ctrl = isMac ? event.metaKey : event.ctrlKey
    keyState.value.shift = event.shiftKey
    keyState.value.alt = event.altKey
    keyState.value.meta = event.metaKey

    // Retirer la touche de l'ensemble des touches enfoncées
    pressedKeys.delete(event.key)
  }

  // ========================================
  // CONTROL FUNCTIONS
  // ========================================

  /**
   * Active les raccourcis clavier
   * Les listeners restent attachés, mais les raccourcis ne s'exécutent pas
   *
   * @example
   * ```typescript
   * shortcuts.enableShortcuts()
   * ```
   */
  function enableShortcuts(): void {
    isEnabled.value = true
    debugLog('Shortcuts enabled')
  }

  /**
   * Désactive les raccourcis clavier
   * Les listeners restent attachés pour éviter les memory leaks
   *
   * @example
   * ```typescript
   * shortcuts.disableShortcuts()
   * ```
   */
  function disableShortcuts(): void {
    isEnabled.value = false
    debugLog('Shortcuts disabled')
  }

  /**
   * Toggle l'état des raccourcis (on/off)
   *
   * @returns État actuel après toggle
   *
   * @example
   * ```typescript
   * const isNowEnabled = shortcuts.toggleShortcuts()
   * ```
   */
  function toggleShortcuts(): boolean {
    isEnabled.value = !isEnabled.value
    debugLog('Shortcuts toggled', { isEnabled: isEnabled.value })
    return isEnabled.value
  }

  /**
   * Enregistre les event listeners au montage du composant
   * Attache les handlers keydown/keyup à la fenêtre globale
   */
  function registerShortcuts(): void {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    debugLog('Keyboard shortcuts registered')
  }

  /**
   * Désenregistre les event listeners au démontage du composant
   * Nettoie les listeners pour éviter les memory leaks
   */
  function unregisterShortcuts(): void {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)

    // Nettoyer les timers
    if (apiUpdateTimer !== null) {
      clearTimeout(apiUpdateTimer)
    }

    debugLog('Keyboard shortcuts unregistered')
  }

  // ========================================
  // LIFECYCLE HOOKS
  // ========================================

  /**
   * Attacher les listeners au montage du composant
   */
  onMounted(() => {
    registerShortcuts()
  })

  /**
   * Détacher les listeners au démontage du composant
   */
  onUnmounted(() => {
    unregisterShortcuts()
  })

  // ========================================
  // EXPORT API
  // ========================================

  return {
    // State
    isEnabled,
    keyState,

    // Control
    enableShortcuts,
    disableShortcuts,
    toggleShortcuts,
    registerShortcuts,
    unregisterShortcuts,

    // Handlers (exported for testing)
    handleKeyDown,
    handleKeyUp,
    handleUndo,
    handleRedo,
    handleDelete,
    handleSelectAll,
    handleDuplicate,
    handleNudge,
    handleEscape,
    handleForceSave,

    // Utils
    isEditableElement,
    isMacOS,
    isSafeToExecute,
    canExecuteAction
  }
}
