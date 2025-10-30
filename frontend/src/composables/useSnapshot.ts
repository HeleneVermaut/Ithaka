/**
 * useSnapshot Composable (TASK32)
 *
 * Provides snapshot capabilities for page elements to support undo/redo operations.
 * Creates deep clones of element state and enables comparison between snapshots.
 *
 * This composable integrates with pageElementsStore to capture and restore
 * complete element state including position, dimensions, rotation, content, and styling.
 *
 * Key Features:
 * - Deep cloning of element arrays to prevent reference mutations
 * - Snapshot creation from current store state
 * - Snapshot restoration with full element replacement
 * - Action creation from before/after snapshots
 *
 * @module composables/useSnapshot
 *
 * @example
 * ```typescript
 * import { useSnapshot } from '@/composables/useSnapshot'
 *
 * const { createSnapshot, restoreSnapshot, getActionFromSnapshot } = useSnapshot()
 *
 * // Create snapshot before modification
 * const beforeSnapshot = createSnapshot()
 *
 * // User modifies element
 * await updateElement(id, { x: 100 })
 *
 * // Create snapshot after modification
 * const afterSnapshot = createSnapshot()
 *
 * // Create history action
 * const action = getActionFromSnapshot(beforeSnapshot, afterSnapshot)
 * historyStore.pushAction(action)
 * ```
 */

import { usePageElementsStore } from '@/stores/pageElementsStore'
import type { IPageElement } from '@/types/models'

/**
 * Represents a snapshot of page elements at a point in time
 *
 * Snapshots are immutable copies of all elements on the page.
 * They preserve complete state for restoration during undo/redo.
 */
export interface ElementSnapshot {
  /** Timestamp when snapshot was created (ISO 8601) */
  timestamp: string

  /** ID of the page these elements belong to */
  pageId: string | null

  /** Deep clone of all page elements at the time of snapshot */
  elements: IPageElement[]

  /** Number of elements in snapshot (for quick checks) */
  count: number
}

/**
 * Represents a history action that can be undone/redone
 *
 * Contains before and after snapshots to enable bidirectional navigation
 * through history (undo uses beforeSnapshot, redo uses afterSnapshot).
 */
export interface HistoryAction {
  /** Unique identifier for this action (UUID) */
  id: string

  /** Human-readable description of the action */
  description: string

  /** Snapshot of state before the action */
  beforeSnapshot: ElementSnapshot

  /** Snapshot of state after the action */
  afterSnapshot: ElementSnapshot

  /** Timestamp when action was recorded (ISO 8601) */
  timestamp: string
}

/**
 * Composable for element snapshot operations
 *
 * Provides methods to capture, restore, and compare element snapshots
 * for implementing undo/redo functionality.
 *
 * @returns {UseSnapshotReturn} Object containing snapshot methods
 */
export function useSnapshot() {
  // ========================================
  // DEPENDENCIES
  // ========================================

  const pageElementsStore = usePageElementsStore()

  // ========================================
  // SNAPSHOT CREATION
  // ========================================

  /**
   * Creates a deep clone of a single element
   *
   * Performs a deep copy of the element object to prevent mutations
   * from affecting snapshot data. All nested objects and arrays are cloned.
   *
   * @param element - Element to clone
   * @returns Deep cloned element
   *
   * @private
   */
  function deepCloneElement(element: IPageElement): IPageElement {
    // Use JSON serialization for deep cloning
    // This creates completely independent copies with no shared references
    return JSON.parse(JSON.stringify(element))
  }

  /**
   * Creates a snapshot of the current page elements state
   *
   * Captures all elements currently in pageElementsStore.elements
   * and creates immutable copies for history tracking.
   *
   * This is the primary method called before any element modification
   * to enable undo/redo functionality.
   *
   * @returns Snapshot containing deep clones of all current elements
   *
   * @example
   * ```typescript
   * // Before modifying elements
   * const snapshot = createSnapshot()
   *
   * // Later, to restore
   * restoreSnapshot(snapshot)
   * ```
   */
  function createSnapshot(): ElementSnapshot {
    const elements = pageElementsStore.elements

    // Deep clone all elements to prevent mutations
    const clonedElements = elements.map(deepCloneElement)

    return {
      timestamp: new Date().toISOString(),
      pageId: pageElementsStore.currentPageId,
      elements: clonedElements,
      count: clonedElements.length
    }
  }

  // ========================================
  // SNAPSHOT RESTORATION
  // ========================================

  /**
   * Restores a snapshot to the page elements store
   *
   * Replaces all current elements in the store with the elements
   * from the provided snapshot. This is used for undo/redo operations.
   *
   * IMPORTANT: This does not call the API. It only updates local state.
   * For API persistence, the caller should handle element updates separately.
   *
   * @param snapshot - Snapshot to restore
   *
   * @example
   * ```typescript
   * // Undo operation: restore previous snapshot
   * const previousSnapshot = historyStore.undoStack[0]
   * restoreSnapshot(previousSnapshot)
   * ```
   */
  function restoreSnapshot(snapshot: ElementSnapshot): void {
    if (!snapshot || !snapshot.elements) {
      console.warn('Cannot restore: invalid snapshot')
      return
    }

    // Validate that snapshot belongs to current page
    if (snapshot.pageId !== pageElementsStore.currentPageId) {
      console.warn(
        `Snapshot page mismatch: expected ${pageElementsStore.currentPageId}, got ${snapshot.pageId}`
      )
      // Allow restore anyway but log warning
    }

    // Deep clone elements before restoring to maintain snapshot immutability
    const restoredElements = snapshot.elements.map(deepCloneElement)

    // Replace all elements in store
    pageElementsStore.elements = restoredElements

    // Clear selection to avoid selecting non-existent elements
    pageElementsStore.deselectAll()

    console.debug(
      `Snapshot restored: ${snapshot.count} elements from ${snapshot.timestamp}`
    )
  }

  // ========================================
  // ACTION CREATION
  // ========================================

  /**
   * Creates a history action from before and after snapshots
   *
   * Compares two snapshots and creates a HistoryAction that can be
   * pushed to the history store. This enables undo (uses beforeSnapshot)
   * and redo (uses afterSnapshot).
   *
   * @param beforeSnapshot - Snapshot taken before the modification
   * @param afterSnapshot - Snapshot taken after the modification
   * @param description - Human-readable description of the action (optional)
   * @returns HistoryAction containing both snapshots
   *
   * @example
   * ```typescript
   * const before = createSnapshot()
   * await updateElement(id, { x: 100 })
   * const after = createSnapshot()
   *
   * const action = getActionFromSnapshot(before, after, 'Move element')
   * historyStore.pushAction(action)
   * ```
   */
  function getActionFromSnapshot(
    beforeSnapshot: ElementSnapshot,
    afterSnapshot: ElementSnapshot,
    description?: string
  ): HistoryAction {
    // Generate unique ID for this action
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Auto-generate description if not provided
    let autoDescription = 'Element modification'

    if (beforeSnapshot.count !== afterSnapshot.count) {
      if (afterSnapshot.count > beforeSnapshot.count) {
        autoDescription = `Add element (${afterSnapshot.count - beforeSnapshot.count})`
      } else {
        autoDescription = `Delete element (${beforeSnapshot.count - afterSnapshot.count})`
      }
    } else if (beforeSnapshot.count > 0 && afterSnapshot.count > 0) {
      // Check if elements were modified
      const hasChanges = !areSnapshotsEqual(beforeSnapshot, afterSnapshot)
      if (hasChanges) {
        autoDescription = 'Update element'
      }
    }

    return {
      id: actionId,
      description: description || autoDescription,
      beforeSnapshot,
      afterSnapshot,
      timestamp: new Date().toISOString()
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Compares two snapshots for equality
   *
   * Performs a deep comparison of snapshot elements to determine
   * if they represent the same state. Used to avoid pushing
   * duplicate actions to history.
   *
   * @param snapshot1 - First snapshot
   * @param snapshot2 - Second snapshot
   * @returns true if snapshots are identical, false otherwise
   *
   * @private
   */
  function areSnapshotsEqual(
    snapshot1: ElementSnapshot,
    snapshot2: ElementSnapshot
  ): boolean {
    // Quick checks: count and pageId
    if (snapshot1.count !== snapshot2.count) {
      return false
    }

    if (snapshot1.pageId !== snapshot2.pageId) {
      return false
    }

    // Deep comparison using JSON serialization
    // This works because elements are plain data objects
    const json1 = JSON.stringify(snapshot1.elements)
    const json2 = JSON.stringify(snapshot2.elements)

    return json1 === json2
  }

  /**
   * Calculates the size of a snapshot in bytes
   *
   * Estimates memory usage of a snapshot by serializing to JSON.
   * Useful for monitoring history size and enforcing limits.
   *
   * @param snapshot - Snapshot to measure
   * @returns Approximate size in bytes
   *
   * @example
   * ```typescript
   * const snapshot = createSnapshot()
   * const size = getSnapshotSize(snapshot)
   * console.log(`Snapshot size: ${(size / 1024).toFixed(2)} KB`)
   * ```
   */
  function getSnapshotSize(snapshot: ElementSnapshot): number {
    const json = JSON.stringify(snapshot)
    return new Blob([json]).size
  }

  /**
   * Validates a snapshot for correctness
   *
   * Checks that a snapshot has the required structure and valid data.
   * Returns true if snapshot is valid, false otherwise.
   *
   * @param snapshot - Snapshot to validate
   * @returns true if valid, false otherwise
   */
  function isValidSnapshot(snapshot: ElementSnapshot): boolean {
    if (!snapshot) {
      return false
    }

    if (!snapshot.timestamp || !snapshot.elements) {
      return false
    }

    if (!Array.isArray(snapshot.elements)) {
      return false
    }

    if (snapshot.count !== snapshot.elements.length) {
      return false
    }

    return true
  }

  // ========================================
  // EXPORT COMPOSABLE INTERFACE
  // ========================================

  return {
    // Main operations
    createSnapshot,
    restoreSnapshot,
    getActionFromSnapshot,

    // Utilities
    areSnapshotsEqual,
    getSnapshotSize,
    isValidSnapshot
  }
}

/**
 * Return type definition for the useSnapshot composable
 *
 * Exported for TypeScript type checking in components
 */
export type UseSnapshotReturn = ReturnType<typeof useSnapshot>
