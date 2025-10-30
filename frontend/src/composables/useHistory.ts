/**
 * useHistory Composable (TASK30)
 *
 * High-level composable for managing undo/redo history in the page editor.
 * Provides a simplified API that integrates historyStore and useSnapshot.
 *
 * This composable abstracts the complexity of snapshot creation and history management,
 * offering easy-to-use methods for:
 * - Capturing element state before/after modifications
 * - Performing undo/redo operations
 * - Checking if undo/redo is possible
 * - Clearing history
 *
 * Key Features:
 * - Automatic snapshot creation before/after actions
 * - Debouncing for rapid changes (100ms)
 * - Max 50 actions in history (configurable)
 * - Integration with pageElementsStore
 *
 * @module composables/useHistory
 *
 * @example
 * ```typescript
 * import { useHistory } from '@/composables/useHistory'
 *
 * const { push, undo, redo, canUndo, canRedo, clear } = useHistory()
 *
 * // Before modifying elements
 * const beforeSnapshot = createSnapshot()
 *
 * // Modify element
 * await updateElement(id, { x: 100 })
 *
 * // After modification, push to history
 * push('Move element', beforeSnapshot)
 *
 * // Undo
 * if (canUndo.value) {
 *   undo()
 * }
 *
 * // Redo
 * if (canRedo.value) {
 *   redo()
 * }
 * ```
 */

import { computed } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'
import { useSnapshot } from '@/composables/useSnapshot'
import type { ElementSnapshot, HistoryAction } from '@/composables/useSnapshot'

/**
 * Composable for history management operations
 *
 * Provides reactive methods for undo/redo functionality with automatic
 * snapshot handling and debouncing for rapid changes.
 *
 * @returns {UseHistoryReturn} Object containing all history methods
 */
export function useHistory() {
  // ========================================
  // SETUP & DEPENDENCIES
  // ========================================

  // Initialize history store (centralized state)
  const historyStore = useHistoryStore()

  // Initialize snapshot utilities
  const {
    createSnapshot,
    restoreSnapshot,
    getActionFromSnapshot,
    areSnapshotsEqual
  } = useSnapshot()

  // ========================================
  // COMPUTED PROPERTIES (Derived State)
  // ========================================

  /**
   * Indicates if undo is possible
   *
   * Returns true if there is at least one action in the undo stack.
   * Used to enable/disable undo button in the interface.
   *
   * @returns true if undo is available
   *
   * @example
   * ```typescript
   * <n-button :disabled="!canUndo" @click="undo()">
   *   Undo
   * </n-button>
   * ```
   */
  const canUndo = computed<boolean>(() => historyStore.canUndo)

  /**
   * Indicates if redo is possible
   *
   * Returns true if there is at least one action in the redo stack.
   * Used to enable/disable redo button in the interface.
   *
   * @returns true if redo is available
   *
   * @example
   * ```typescript
   * <n-button :disabled="!canRedo" @click="redo()">
   *   Redo
   * </n-button>
   * ```
   */
  const canRedo = computed<boolean>(() => historyStore.canRedo)

  /**
   * Number of actions available for undo
   *
   * Useful for displaying history depth in the UI.
   *
   * @returns Number of actions in undo stack
   */
  const undoCount = computed<number>(() => historyStore.undoStackSize)

  /**
   * Number of actions available for redo
   *
   * Useful for displaying redo queue size in the UI.
   *
   * @returns Number of actions in redo stack
   */
  const redoCount = computed<number>(() => historyStore.redoStackSize)

  /**
   * Description of the last undo action
   *
   * Returns the description of what will be undone if undo() is called.
   * Null if no undo action is available.
   *
   * @returns Description string or null
   */
  const lastUndoDescription = computed<string | null>(() => {
    return historyStore.lastUndoAction?.description || null
  })

  /**
   * Description of the last redo action
   *
   * Returns the description of what will be redone if redo() is called.
   * Null if no redo action is available.
   *
   * @returns Description string or null
   */
  const lastRedoDescription = computed<string | null>(() => {
    return historyStore.lastRedoAction?.description || null
  })

  // ========================================
  // HISTORY OPERATIONS
  // ========================================

  /**
   * Pushes an action to history with before/after snapshots
   *
   * This is the primary method for adding actions to history.
   * It automatically creates the "after" snapshot and constructs
   * a HistoryAction from the before/after states.
   *
   * Important: The beforeSnapshot should be captured BEFORE the modification.
   * This method captures the afterSnapshot automatically.
   *
   * @param description - Human-readable description of the action
   * @param beforeSnapshot - Snapshot captured before modification
   *
   * @example
   * ```typescript
   * // Capture state before modification
   * const before = createSnapshot()
   *
   * // Perform modification
   * await pageElementsStore.updateElement(id, { x: 100, y: 50 })
   *
   * // Push to history (after snapshot is captured automatically)
   * push('Move element', before)
   * ```
   */
  function push(description: string, beforeSnapshot: ElementSnapshot): void {
    // Create snapshot of current state (after modification)
    const afterSnapshot = createSnapshot()

    // Check if snapshots are identical (no real change occurred)
    if (areSnapshotsEqual(beforeSnapshot, afterSnapshot)) {
      console.debug('Skipping history push: no changes detected')
      return
    }

    // Create history action from snapshots
    const action = getActionFromSnapshot(beforeSnapshot, afterSnapshot, description)

    // Push to history store
    historyStore.pushAction(action)
  }

  /**
   * Pushes an action with debouncing for rapid changes
   *
   * Useful for operations that fire frequently (drag, resize, rotate).
   * Only the last action within 100ms will be recorded to history.
   *
   * @param description - Human-readable description
   * @param beforeSnapshot - Snapshot captured before modification
   *
   * @example
   * ```typescript
   * // During drag (called on every mousemove)
   * function onDrag(x: number, y: number) {
   *   const before = lastSnapshot.value
   *   await updateElement(id, { x, y })
   *   pushDebounced('Move element', before)
   * }
   * // Only the final position after 100ms will be recorded
   * ```
   */
  function pushDebounced(description: string, beforeSnapshot: ElementSnapshot): void {
    // Create after snapshot
    const afterSnapshot = createSnapshot()

    // Check for changes
    if (areSnapshotsEqual(beforeSnapshot, afterSnapshot)) {
      return
    }

    // Create action
    const action = getActionFromSnapshot(beforeSnapshot, afterSnapshot, description)

    // Push with debouncing
    historyStore.pushActionDebounced(action)
  }

  /**
   * Pushes a complete HistoryAction to history
   *
   * Alternative method that accepts a pre-constructed HistoryAction.
   * Useful when you need full control over the action structure.
   *
   * @param action - Complete HistoryAction with before/after snapshots
   *
   * @example
   * ```typescript
   * const before = createSnapshot()
   * await deleteElement(id)
   * const after = createSnapshot()
   * const action = getActionFromSnapshot(before, after, 'Delete element')
   * pushAction(action)
   * ```
   */
  function pushAction(action: HistoryAction): void {
    historyStore.pushAction(action)
  }

  /**
   * Undoes the last action
   *
   * Pops the last action from undo stack, restores its before state,
   * and moves the action to redo stack.
   *
   * Returns true if undo succeeded, false if no action to undo
   * or if restoration failed.
   *
   * @returns true if undo succeeded, false otherwise
   *
   * @example
   * ```typescript
   * function handleUndo() {
   *   if (undo()) {
   *     message.success('Undo successful')
   *   } else {
   *     message.warning('Nothing to undo')
   *   }
   * }
   * ```
   */
  function undo(): boolean {
    return historyStore.undo()
  }

  /**
   * Redoes the last undone action
   *
   * Pops the last action from redo stack, restores its after state,
   * and moves the action back to undo stack.
   *
   * Returns true if redo succeeded, false if no action to redo
   * or if restoration failed.
   *
   * @returns true if redo succeeded, false otherwise
   *
   * @example
   * ```typescript
   * function handleRedo() {
   *   if (redo()) {
   *     message.success('Redo successful')
   *   } else {
   *     message.warning('Nothing to redo')
   *   }
   * }
   * ```
   */
  function redo(): boolean {
    return historyStore.redo()
  }

  /**
   * Clears all history (undo and redo stacks)
   *
   * Removes all actions from history. Used when changing pages
   * or closing the editor.
   *
   * @example
   * ```typescript
   * // When navigating to a different page
   * onBeforeUnmount(() => {
   *   clear()
   * })
   * ```
   */
  function clear(): void {
    historyStore.clear()
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Creates a snapshot of the current page elements state
   *
   * This is a convenience wrapper around useSnapshot's createSnapshot.
   * Returns a deep clone of all current elements.
   *
   * @returns ElementSnapshot of current state
   *
   * @example
   * ```typescript
   * // Before modifying
   * const snapshot = snapshot()
   *
   * // After modifying
   * push('My action', snapshot)
   * ```
   */
  function snapshot(): ElementSnapshot {
    return createSnapshot()
  }

  /**
   * Restores a snapshot directly (without history)
   *
   * Replaces all elements with those from the snapshot.
   * This does NOT add an action to history.
   *
   * Warning: Use with caution. This bypasses history tracking.
   *
   * @param elementSnapshot - Snapshot to restore
   *
   * @example
   * ```typescript
   * // Restore without adding to history
   * restore(previousSnapshot)
   * ```
   */
  function restore(elementSnapshot: ElementSnapshot): void {
    restoreSnapshot(elementSnapshot)
  }

  /**
   * Sets the maximum history size
   *
   * Changes the limit of how many actions are kept in history.
   * Default is 50. Minimum is 1.
   *
   * @param size - New maximum size (minimum 1)
   *
   * @example
   * ```typescript
   * // Increase history limit for power users
   * setMaxSize(100)
   * ```
   */
  function setMaxSize(size: number): void {
    historyStore.setMaxHistorySize(size)
  }

  /**
   * Gets the current maximum history size
   *
   * @returns Current max history size
   */
  function getMaxSize(): number {
    return historyStore.maxHistorySize
  }

  /**
   * Checks if debouncing should be applied
   *
   * Returns true if the last action was less than 100ms ago.
   * Useful for deciding whether to use push() or pushDebounced().
   *
   * @returns true if should debounce, false otherwise
   */
  function shouldDebounce(): boolean {
    return historyStore.shouldDebounce()
  }

  // ========================================
  // EXPORT COMPOSABLE INTERFACE
  // ========================================

  return {
    // Core operations
    push,
    pushDebounced,
    pushAction,
    undo,
    redo,
    clear,

    // Computed state
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    lastUndoDescription,
    lastRedoDescription,

    // Utilities
    snapshot,
    restore,
    setMaxSize,
    getMaxSize,
    shouldDebounce
  }
}

/**
 * Return type definition for the useHistory composable
 *
 * Exported for TypeScript type checking in components
 */
export type UseHistoryReturn = ReturnType<typeof useHistory>
