/**
 * Store Pinia pour la gestion de l'historique Undo/Redo (TASK31)
 *
 * Ce store implémente un système d'historique bidirectionnel avec deux piles (stacks):
 * - undoStack: Actions passées qui peuvent être annulées
 * - redoStack: Actions annulées qui peuvent être refaites
 *
 * Architecture:
 * - State: undoStack, redoStack, maxHistorySize
 * - Getters: canUndo, canRedo, undoStackSize, redoStackSize
 * - Actions: pushAction, undo, redo, clear
 *
 * Fonctionnement:
 * 1. Chaque modification d'élément crée une HistoryAction (before/after snapshots)
 * 2. pushAction() ajoute l'action à undoStack et vide redoStack
 * 3. undo() déplace l'action de undoStack vers redoStack et restaure beforeSnapshot
 * 4. redo() déplace l'action de redoStack vers undoStack et restaure afterSnapshot
 *
 * Intégration:
 * - Utilise useSnapshot pour créer et restaurer des snapshots
 * - Limite configurable (50 actions par défaut)
 * - Débounce automatique des actions rapides (100ms)
 *
 * @module stores/historyStore
 *
 * @example
 * ```typescript
 * import { useHistoryStore } from '@/stores/historyStore'
 *
 * const historyStore = useHistoryStore()
 *
 * // Before modification
 * const before = createSnapshot()
 *
 * // Modify element
 * await updateElement(id, { x: 100 })
 *
 * // After modification
 * const after = createSnapshot()
 * const action = getActionFromSnapshot(before, after, 'Move element')
 * historyStore.pushAction(action)
 *
 * // Undo
 * if (historyStore.canUndo) {
 *   historyStore.undo()
 * }
 *
 * // Redo
 * if (historyStore.canRedo) {
 *   historyStore.redo()
 * }
 * ```
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSnapshot } from '@/composables/useSnapshot'
import type { HistoryAction } from '@/composables/useSnapshot'

/**
 * Configuration par défaut pour l'historique
 */
const DEFAULT_MAX_HISTORY_SIZE = 50

/**
 * Délai de debounce pour éviter de capturer des actions répétées trop rapidement
 * Par exemple, lors du drag d'un élément, on ne veut pas capturer chaque pixel de mouvement
 */
const DEBOUNCE_DELAY_MS = 100

/**
 * Store de gestion de l'historique undo/redo
 *
 * Implémente une architecture à deux piles pour gérer l'historique des modifications.
 * Chaque action contient des snapshots avant/après pour permettre une navigation
 * bidirectionnelle dans l'historique.
 */
export const useHistoryStore = defineStore('history', () => {
  // ========================================
  // DEPENDENCIES
  // ========================================

  const { restoreSnapshot } = useSnapshot()

  // ========================================
  // STATE (État réactif)
  // ========================================

  /**
   * Pile des actions qui peuvent être annulées
   *
   * Chaque élément contient les snapshots before/after d'une modification.
   * L'action la plus récente est à la fin du tableau.
   *
   * Structure: [oldest action, ..., most recent action]
   */
  const undoStack = ref<HistoryAction[]>([])

  /**
   * Pile des actions qui peuvent être refaites
   *
   * Contient les actions qui ont été annulées avec undo().
   * Se vide dès qu'une nouvelle action est effectuée (pushAction).
   *
   * Structure: [oldest undone action, ..., most recently undone action]
   */
  const redoStack = ref<HistoryAction[]>([])

  /**
   * Taille maximale de l'historique
   *
   * Limite le nombre d'actions conservées pour éviter une consommation
   * excessive de mémoire. Quand cette limite est atteinte, les actions
   * les plus anciennes sont supprimées.
   */
  const maxHistorySize = ref<number>(DEFAULT_MAX_HISTORY_SIZE)

  /**
   * Timestamp de la dernière action pour debouncing
   *
   * Permet d'éviter de capturer des actions trop rapprochées dans le temps.
   * Par exemple, lors du drag, on ne veut qu'un snapshot final.
   */
  const lastActionTimestamp = ref<number>(0)

  /**
   * Timer pour le debounce
   *
   * Utilisé pour différer l'ajout d'actions à l'historique et fusionner
   * les modifications rapides en une seule action.
   */
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // ========================================
  // GETTERS (État dérivé)
  // ========================================

  /**
   * Indique si undo est possible
   *
   * Retourne true si undoStack contient au moins une action.
   * Utilisé pour activer/désactiver le bouton Undo dans l'interface.
   *
   * @returns true si au moins une action peut être annulée
   *
   * @example
   * ```typescript
   * <n-button :disabled="!historyStore.canUndo" @click="historyStore.undo()">
   *   Undo
   * </n-button>
   * ```
   */
  const canUndo = computed<boolean>(() => undoStack.value.length > 0)

  /**
   * Indique si redo est possible
   *
   * Retourne true si redoStack contient au moins une action.
   * Utilisé pour activer/désactiver le bouton Redo dans l'interface.
   *
   * @returns true si au moins une action peut être refaite
   *
   * @example
   * ```typescript
   * <n-button :disabled="!historyStore.canRedo" @click="historyStore.redo()">
   *   Redo
   * </n-button>
   * ```
   */
  const canRedo = computed<boolean>(() => redoStack.value.length > 0)

  /**
   * Nombre d'actions dans undoStack
   *
   * Utile pour afficher le nombre d'actions disponibles pour undo.
   *
   * @returns Nombre d'actions dans undoStack
   */
  const undoStackSize = computed<number>(() => undoStack.value.length)

  /**
   * Nombre d'actions dans redoStack
   *
   * Utile pour afficher le nombre d'actions disponibles pour redo.
   *
   * @returns Nombre d'actions dans redoStack
   */
  const redoStackSize = computed<number>(() => redoStack.value.length)

  /**
   * Retourne la dernière action dans undoStack sans la retirer
   *
   * Permet de prévisualiser quelle action sera annulée.
   *
   * @returns Dernière action ou null si undoStack est vide
   */
  const lastUndoAction = computed<HistoryAction | null>(() => {
    if (undoStack.value.length === 0) {
      return null
    }
    return undoStack.value[undoStack.value.length - 1]
  })

  /**
   * Retourne la dernière action dans redoStack sans la retirer
   *
   * Permet de prévisualiser quelle action sera refaite.
   *
   * @returns Dernière action ou null si redoStack est vide
   */
  const lastRedoAction = computed<HistoryAction | null>(() => {
    if (redoStack.value.length === 0) {
      return null
    }
    return redoStack.value[redoStack.value.length - 1]
  })

  // ========================================
  // ACTIONS (Méthodes)
  // ========================================

  /**
   * Ajoute une action à l'historique
   *
   * Ajoute une nouvelle action à undoStack et vide redoStack (car une nouvelle
   * branche d'historique commence). Si undoStack dépasse maxHistorySize,
   * supprime les actions les plus anciennes.
   *
   * Important: Cette méthode vide redoStack car dès qu'une nouvelle action
   * est effectuée, les actions "redo" ne sont plus valides.
   *
   * @param action - Action à ajouter (contient before/after snapshots)
   *
   * @example
   * ```typescript
   * const before = createSnapshot()
   * await updateElement(id, { x: 100 })
   * const after = createSnapshot()
   * const action = getActionFromSnapshot(before, after, 'Move element')
   * historyStore.pushAction(action)
   * ```
   */
  function pushAction(action: HistoryAction): void {
    if (!action) {
      console.warn('Cannot push null action to history')
      return
    }

    // Vider redoStack car une nouvelle branche d'historique commence
    // Une fois qu'on fait une nouvelle action, on ne peut plus "redo" les anciennes
    if (redoStack.value.length > 0) {
      redoStack.value = []
      console.debug('Redo stack cleared due to new action')
    }

    // Ajouter l'action à undoStack
    undoStack.value.push(action)

    // Appliquer la limite de taille
    if (undoStack.value.length > maxHistorySize.value) {
      // Supprimer les actions les plus anciennes (début du tableau)
      const removed = undoStack.value.shift()
      console.debug(`History limit reached (${maxHistorySize.value}), removed oldest action: ${removed?.id}`)
    }

    // Mettre à jour le timestamp
    lastActionTimestamp.value = Date.now()

    console.debug(
      `Action pushed to history: ${action.description} (undo: ${undoStack.value.length}, redo: ${redoStack.value.length})`
    )
  }

  /**
   * Annule la dernière action (undo)
   *
   * Récupère la dernière action de undoStack, restaure son beforeSnapshot,
   * et déplace l'action vers redoStack pour permettre un redo ultérieur.
   *
   * @returns true si undo a réussi, false sinon
   *
   * @example
   * ```typescript
   * if (historyStore.canUndo) {
   *   historyStore.undo()
   * }
   * ```
   */
  function undo(): boolean {
    if (!canUndo.value) {
      console.warn('Cannot undo: no actions in history')
      return false
    }

    // Récupérer la dernière action de undoStack
    const action = undoStack.value.pop()

    if (!action) {
      console.error('Failed to pop action from undoStack')
      return false
    }

    try {
      // Restaurer le snapshot "avant" l'action
      restoreSnapshot(action.beforeSnapshot)

      // Déplacer l'action vers redoStack pour permettre redo
      redoStack.value.push(action)

      console.debug(
        `Undo executed: ${action.description} (undo: ${undoStack.value.length}, redo: ${redoStack.value.length})`
      )

      return true
    } catch (err) {
      console.error('Error during undo:', err)

      // En cas d'erreur, remettre l'action dans undoStack
      undoStack.value.push(action)

      return false
    }
  }

  /**
   * Refait la dernière action annulée (redo)
   *
   * Récupère la dernière action de redoStack, restaure son afterSnapshot,
   * et déplace l'action vers undoStack.
   *
   * @returns true si redo a réussi, false sinon
   *
   * @example
   * ```typescript
   * if (historyStore.canRedo) {
   *   historyStore.redo()
   * }
   * ```
   */
  function redo(): boolean {
    if (!canRedo.value) {
      console.warn('Cannot redo: no actions in redo stack')
      return false
    }

    // Récupérer la dernière action de redoStack
    const action = redoStack.value.pop()

    if (!action) {
      console.error('Failed to pop action from redoStack')
      return false
    }

    try {
      // Restaurer le snapshot "après" l'action
      restoreSnapshot(action.afterSnapshot)

      // Déplacer l'action vers undoStack
      undoStack.value.push(action)

      console.debug(
        `Redo executed: ${action.description} (undo: ${undoStack.value.length}, redo: ${redoStack.value.length})`
      )

      return true
    } catch (err) {
      console.error('Error during redo:', err)

      // En cas d'erreur, remettre l'action dans redoStack
      redoStack.value.push(action)

      return false
    }
  }

  /**
   * Réinitialise complètement l'historique
   *
   * Vide undoStack et redoStack. Utilisé lors du changement de page
   * ou de la fermeture de l'éditeur.
   *
   * @example
   * ```typescript
   * // Lors du changement de page
   * historyStore.clear()
   * ```
   */
  function clear(): void {
    undoStack.value = []
    redoStack.value = []
    lastActionTimestamp.value = 0

    // Nettoyer le timer de debounce
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    console.debug('History cleared')
  }

  /**
   * Configure la taille maximale de l'historique
   *
   * Change la limite du nombre d'actions conservées. Si la nouvelle limite
   * est inférieure à la taille actuelle, les actions les plus anciennes
   * sont supprimées.
   *
   * @param size - Nouvelle taille maximale (minimum 1)
   *
   * @example
   * ```typescript
   * historyStore.setMaxHistorySize(100) // Augmente la limite à 100 actions
   * ```
   */
  function setMaxHistorySize(size: number): void {
    if (size < 1) {
      console.warn('maxHistorySize must be at least 1')
      return
    }

    maxHistorySize.value = size

    // Si la taille actuelle dépasse la nouvelle limite, tronquer
    if (undoStack.value.length > size) {
      const toRemove = undoStack.value.length - size
      undoStack.value = undoStack.value.slice(toRemove)
      console.debug(`History truncated: removed ${toRemove} oldest actions`)
    }

    console.debug(`Max history size set to ${size}`)
  }

  /**
   * Vérifie si assez de temps s'est écoulé depuis la dernière action
   *
   * Utilisé pour le debouncing des actions rapides.
   * Empêche de capturer des actions trop fréquentes (ex: drag continu).
   *
   * @returns true si assez de temps s'est écoulé, false sinon
   *
   * @private
   */
  function shouldDebounce(): boolean {
    const now = Date.now()
    return now - lastActionTimestamp.value < DEBOUNCE_DELAY_MS
  }

  /**
   * Ajoute une action avec debouncing
   *
   * Diffère l'ajout de l'action pour fusionner les modifications rapides.
   * Si une nouvelle action arrive avant la fin du délai, le timer est réinitialisé.
   *
   * Utile pour les opérations continues comme le drag ou le resize.
   *
   * @param action - Action à ajouter avec debounce
   *
   * @example
   * ```typescript
   * // Pendant le drag (appelé plusieurs fois par seconde)
   * historyStore.pushActionDebounced(action)
   * // Seule la dernière action sera finalement ajoutée après 100ms
   * ```
   */
  function pushActionDebounced(action: HistoryAction): void {
    // Annuler le timer précédent
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
    }

    // Créer un nouveau timer
    debounceTimer = setTimeout(() => {
      pushAction(action)
      debounceTimer = null
    }, DEBOUNCE_DELAY_MS)
  }

  // ========================================
  // EXPORT DU STORE
  // ========================================

  return {
    // State
    undoStack,
    redoStack,
    maxHistorySize,

    // Getters
    canUndo,
    canRedo,
    undoStackSize,
    redoStackSize,
    lastUndoAction,
    lastRedoAction,

    // Actions
    pushAction,
    undo,
    redo,
    clear,
    setMaxHistorySize,
    pushActionDebounced,

    // Utils
    shouldDebounce
  }
})
