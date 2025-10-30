/**
 * useElementManipulation Composable (TASK24)
 *
 * Handles element selection, property updates, and deletion operations for the canvas editor.
 * Provides a high-level API for manipulating individual page elements with automatic
 * state management through Pinia store and API synchronization.
 *
 * This composable supports all PageElement types (text, image, emoji, shape, sticker).
 * Single-element manipulation with support for transitioning to multi-select architecture.
 *
 * @module composables/useElementManipulation
 *
 * @example
 * ```typescript
 * import { useElementManipulation } from '@/composables/useElementManipulation'
 *
 * const {
 *   selectElement,
 *   deselectElement,
 *   deleteElement,
 *   updateElementProperty,
 *   duplicateElement,
 *   bringToFront,
 *   sendToBack,
 *   getSelectedElement,
 *   isElementSelected
 * } = useElementManipulation()
 *
 * // Select an element
 * selectElement(elementId)
 *
 * // Update position
 * await updateElementProperty(elementId, 'x', 50)
 *
 * // Bring to front
 * bringToFront(elementId)
 * ```
 */

import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { usePageElementsStore } from '@/stores/pageElementsStore'
import { useHistory } from '@/composables/useHistory'
import pageElementService from '@/services/pageElementService'
import type { IPageElement, IPageElementUpdate } from '@/types/models'

/**
 * Z-index range configuration for element stacking
 *
 * Defines the valid range and boundaries for z-index values.
 * Minimum is 0 (back of canvas), maximum is 999 (front of canvas).
 */
const Z_INDEX_CONFIG = {
  /** Minimum z-index value (element at back) */
  MIN: 0,
  /** Maximum z-index value (element at front) */
  MAX: 999,
  /** Step increment for z-index adjustments */
  STEP: 1,
} as const

/**
 * Composable for element manipulation operations
 *
 * Provides reactive methods for selecting, updating, and deleting page elements.
 * Integrates with pageElementsStore for state management and pageElementService
 * for API communication.
 *
 * @returns {UseElementManipulationReturn} Object containing all manipulation methods
 */
export function useElementManipulation() {
  // ========================================
  // SETUP & DEPENDENCIES
  // ========================================

  // Initialize Pinia store for centralized state management
  const pageElementsStore = usePageElementsStore()

  // Initialize history composable for undo/redo functionality
  const { push, snapshot } = useHistory()

  // Initialize NaiveUI message component for error notifications
  const message = useMessage()

  // Local ref to track if an operation is in progress
  const isOperationInProgress = ref<boolean>(false)

  // ========================================
  // COMPUTED PROPERTIES (Derived State)
  // ========================================

  /**
   * Currently selected element from the store
   *
   * Returns the full IPageElement object of the currently selected element,
   * or null if no element is selected.
   *
   * This is a computed property that reactively updates when the store's
   * selectedElementIds or elements array changes.
   */
  const selectedElement = computed<IPageElement | null>(() => {
    return pageElementsStore.getSelectedElement
  })

  /**
   * Determines if any element is currently selected
   *
   * Returns true if selectedElementIds array is not empty, false otherwise.
   * Useful for conditional rendering of selection controls.
   */
  const isAnyElementSelected = computed<boolean>(() => {
    return pageElementsStore.selectedElementIds.length > 0
  })

  // ========================================
  // SELECTION METHODS
  // ========================================

  /**
   * Select an element by its ID
   *
   * Updates the store's selectedElementIds to mark the specified element as selected.
   * For single-element selection in this task, replaces any existing selection.
   * This is a synchronous operation that does not call the API.
   * Used when user clicks on a canvas element to select it for editing.
   *
   * @param {string} elementId - UUID of the element to select
   * @returns {void}
   *
   * @example
   * ```typescript
   * selectElement('123e4567-e89b-12d3-a456-426614174000')
   * console.log(getSelectedElement()) // Returns the element data
   * ```
   */
  function selectElement(elementId: string): void {
    try {
      // Validate that element exists in store before selecting
      const element = pageElementsStore.getElementById(elementId)
      if (!element) {
        console.warn(`Element with ID ${elementId} not found in store`)
        return
      }

      // For single-select behavior, replace selection with new element
      pageElementsStore.selectedElementIds = [elementId]
      console.debug(`Element selected: ${elementId}`)
    } catch (err) {
      console.error('Error selecting element:', err)
    }
  }

  /**
   * Deselect the currently selected element(s)
   *
   * Clears the store's selectedElementIds array to remove all selection.
   * This is a synchronous operation that does not call the API.
   * Used when user clicks on empty canvas or presses Escape.
   *
   * @returns {void}
   *
   * @example
   * ```typescript
   * deselectElement()
   * console.log(getSelectedElement()) // Returns null
   * ```
   */
  function deselectElement(): void {
    try {
      pageElementsStore.selectedElementIds = []
      console.debug('Element deselected')
    } catch (err) {
      console.error('Error deselecting element:', err)
    }
  }

  // ========================================
  // ELEMENT MODIFICATION METHODS
  // ========================================

  /**
   * Update a specific property of an element
   *
   * Performs a partial update on a single property of an element.
   * Calls the API to persist changes and updates the local store.
   * Handles errors with user-friendly notifications.
   *
   * This is a generic method supporting all IPageElement properties including:
   * - Position: x, y
   * - Dimensions: width, height
   * - Appearance: rotation, zIndex, style, metadata
   * - Content: content (type-specific)
   *
   * @template K - Key type extending IPageElement property names
   * @param {string} elementId - UUID of the element to update
   * @param {K} property - Property name to update (must be valid IPageElement key)
   * @param {IPageElement[K]} value - New value for the property
   * @returns {Promise<void>} Resolves when update is complete
   * @throws Will not throw, errors are caught and displayed as messages
   *
   * @example
   * ```typescript
   * // Update position
   * await updateElementProperty(elementId, 'x', 100)
   *
   * // Update rotation
   * await updateElementProperty(elementId, 'rotation', 45)
   *
   * // Update text content
   * await updateElementProperty(elementId, 'content', {
   *   text: 'Updated text',
   *   fontFamily: 'Arial',
   *   fontSize: 16,
   *   fill: '#000000'
   * })
   * ```
   */
  async function updateElementProperty<K extends keyof IPageElement>(
    elementId: string,
    property: K,
    value: IPageElement[K]
  ): Promise<void> {
    // Guard against missing parameters
    if (!elementId || !property) {
      console.warn('updateElementProperty: missing elementId or property')
      return
    }

    // Prevent concurrent operations
    if (isOperationInProgress.value) {
      console.warn('Update already in progress, skipping duplicate request')
      return
    }

    isOperationInProgress.value = true

    // Capture state before modification for undo/redo
    const beforeSnapshot = snapshot()

    try {
      // Build partial update object with only the changed property
      const updates: IPageElementUpdate = {
        [property]: value,
      }

      // Call API to persist the change
      await pageElementService.updatePageElement(elementId, updates)

      // Update store with changes
      // The store action already handles store state synchronization
      await pageElementsStore.updateElement(elementId, updates)

      // Push action to history for undo/redo
      push(`Update ${String(property)}`, beforeSnapshot)

      console.debug(`Element property updated: ${elementId}.${String(property)} = ${JSON.stringify(value)}`)
    } catch (err) {
      // Extract error message for user display
      const errorMessage = err instanceof Error ? err.message : 'Failed to update element property'

      // Show user-friendly error notification
      message.error(errorMessage, {
        duration: 4,
      })

      console.error(`Error updating element property ${String(property)}:`, err)
    } finally {
      isOperationInProgress.value = false
    }
  }

  /**
   * Delete an element from the page
   *
   * Performs a soft-delete operation on the specified element via API,
   * then removes it from the store. If the deleted element was selected,
   * clears the selection.
   *
   * Soft-delete allows recovery of accidentally deleted elements.
   * For permanent deletion, use a separate hard-delete method (future).
   *
   * @param {string} elementId - UUID of the element to delete
   * @returns {Promise<void>} Resolves when deletion is complete
   * @throws Will not throw, errors are caught and displayed as messages
   *
   * @example
   * ```typescript
   * await deleteElement(elementId)
   * // Element is now deleted and hidden from canvas
   * ```
   */
  async function deleteElement(elementId: string): Promise<void> {
    // Guard against missing parameter
    if (!elementId) {
      console.warn('deleteElement: missing elementId')
      return
    }

    // Prevent concurrent operations
    if (isOperationInProgress.value) {
      console.warn('Delete already in progress, skipping duplicate request')
      return
    }

    isOperationInProgress.value = true

    // Capture state before deletion for undo/redo
    const beforeSnapshot = snapshot()

    try {
      // Verify element exists before attempting deletion
      const element = pageElementsStore.getElementById(elementId)
      if (!element) {
        throw new Error(`Element ${elementId} not found in store`)
      }

      // Call API to delete element (soft-delete with deletedAt timestamp)
      await pageElementService.deletePageElement(elementId)

      // Update store to remove element from local state
      await pageElementsStore.deleteElement(elementId)

      // Push action to history for undo/redo
      push('Delete element', beforeSnapshot)

      // Show success message
      message.success('Element deleted successfully', {
        duration: 2,
      })

      console.debug(`Element deleted: ${elementId}`)
    } catch (err) {
      // Extract error message for user display
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete element'

      // Show user-friendly error notification
      message.error(errorMessage, {
        duration: 4,
      })

      console.error(`Error deleting element ${elementId}:`, err)
    } finally {
      isOperationInProgress.value = false
    }
  }

  /**
   * Duplicate an element on the same page
   *
   * Creates an exact copy of the specified element with all properties,
   * content, and styling preserved. The backend automatically offsets
   * the duplicated element's position (+10mm in x and y).
   *
   * The duplicated element is automatically selected for immediate editing.
   *
   * @param {string} elementId - UUID of the element to duplicate
   * @returns {Promise<void>} Resolves when duplication is complete
   * @throws Will not throw, errors are caught and displayed as messages
   *
   * @example
   * ```typescript
   * await duplicateElement(elementId)
   * // New element is created and automatically selected
   * ```
   */
  async function duplicateElement(elementId: string): Promise<void> {
    // Guard against missing parameter
    if (!elementId) {
      console.warn('duplicateElement: missing elementId')
      return
    }

    // Prevent concurrent operations
    if (isOperationInProgress.value) {
      console.warn('Duplicate already in progress, skipping duplicate request')
      return
    }

    isOperationInProgress.value = true

    // Capture state before duplication for undo/redo
    const beforeSnapshot = snapshot()

    try {
      // Verify element exists before attempting duplication
      const element = pageElementsStore.getElementById(elementId)
      if (!element) {
        throw new Error(`Element ${elementId} not found in store`)
      }

      // Call API to duplicate element (backend handles offset)
      const duplicatedElement = await pageElementService.duplicatePageElement(elementId)

      // Update store with new duplicated element
      // The store action handles auto-selection of the duplicate
      await pageElementsStore.duplicateElement(elementId)

      // Push action to history for undo/redo
      push('Duplicate element', beforeSnapshot)

      // Show success message
      message.success('Element duplicated successfully', {
        duration: 2,
      })

      console.debug(`Element duplicated: ${elementId} -> ${duplicatedElement.id}`)
    } catch (err) {
      // Extract error message for user display
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate element'

      // Show user-friendly error notification
      message.error(errorMessage, {
        duration: 4,
      })

      console.error(`Error duplicating element ${elementId}:`, err)
    } finally {
      isOperationInProgress.value = false
    }
  }

  // ========================================
  // Z-INDEX STACKING METHODS
  // ========================================

  /**
   * Bring an element to the front of the canvas
   *
   * Sets the element's z-index to the maximum value (999),
   * making it appear on top of all other elements.
   *
   * Updates locally and persists via API.
   *
   * @param {string} elementId - UUID of the element to bring to front
   * @returns {Promise<void>} Resolves when operation is complete
   * @throws Will not throw, errors are caught and logged
   *
   * @example
   * ```typescript
   * bringToFront(elementId)
   * // Element now appears on top
   * ```
   */
  async function bringToFront(elementId: string): Promise<void> {
    // Guard against missing parameter
    if (!elementId) {
      console.warn('bringToFront: missing elementId')
      return
    }

    try {
      // Update z-index to maximum value
      await updateElementProperty(elementId, 'zIndex', Z_INDEX_CONFIG.MAX)
      console.debug(`Element brought to front: ${elementId}`)
    } catch (err) {
      console.error(`Error bringing element to front ${elementId}:`, err)
    }
  }

  /**
   * Send an element to the back of the canvas
   *
   * Sets the element's z-index to the minimum value (0),
   * making it appear behind all other elements.
   *
   * Updates locally and persists via API.
   *
   * @param {string} elementId - UUID of the element to send to back
   * @returns {Promise<void>} Resolves when operation is complete
   * @throws Will not throw, errors are caught and logged
   *
   * @example
   * ```typescript
   * sendToBack(elementId)
   * // Element now appears at back
   * ```
   */
  async function sendToBack(elementId: string): Promise<void> {
    // Guard against missing parameter
    if (!elementId) {
      console.warn('sendToBack: missing elementId')
      return
    }

    try {
      // Update z-index to minimum value
      await updateElementProperty(elementId, 'zIndex', Z_INDEX_CONFIG.MIN)
      console.debug(`Element sent to back: ${elementId}`)
    } catch (err) {
      console.error(`Error sending element to back ${elementId}:`, err)
    }
  }

  // ========================================
  // QUERY METHODS (Getters)
  // ========================================

  /**
   * Get the currently selected element
   *
   * Returns the full element object of the currently selected element,
   * or null if no element is selected.
   *
   * This is a computed property that reactively updates when selection changes.
   *
   * @returns {IPageElement | null} Selected element object or null
   *
   * @example
   * ```typescript
   * const selected = getSelectedElement()
   * if (selected) {
   *   console.log('Selected:', selected.type, selected.x, selected.y)
   * } else {
   *   console.log('No element selected')
   * }
   * ```
   */
  function getSelectedElement(): IPageElement | null {
    return selectedElement.value
  }

  /**
   * Check if a specific element is currently selected
   *
   * Returns true if the provided element ID is in the selectedElementIds array,
   * false otherwise. Useful for styling or conditional rendering.
   *
   * @param {string} elementId - UUID to check for selection
   * @returns {boolean} True if element is selected, false otherwise
   *
   * @example
   * ```typescript
   * if (isElementSelected(elementId)) {
   *   console.log('This element is selected')
   * }
   * ```
   */
  function isElementSelected(elementId: string): boolean {
    return pageElementsStore.selectedElementIds.includes(elementId)
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get an element by its ID without selecting it
   *
   * Returns the element object if found, undefined otherwise.
   * Does not modify selection state.
   *
   * Useful for retrieving element data for read-only operations.
   *
   * @param {string} elementId - UUID of the element to retrieve
   * @returns {IPageElement | undefined} Element object or undefined
   *
   * @example
   * ```typescript
   * const element = getElementById(elementId)
   * if (element) {
   *   console.log('Element dimensions:', element.width, element.height)
   * }
   * ```
   */
  function getElementById(elementId: string): IPageElement | undefined {
    return pageElementsStore.getElementById(elementId)
  }

  /**
   * Get all elements currently loaded on the page
   *
   * Returns an array of all non-deleted elements.
   * Useful for bulk operations or canvas rendering.
   *
   * @returns {IPageElement[]} Array of all page elements
   *
   * @example
   * ```typescript
   * const allElements = getAllElements()
   * console.log(`Canvas has ${allElements.length} elements`)
   * ```
   */
  function getAllElements(): IPageElement[] {
    return pageElementsStore.elements
  }

  // ========================================
  // EXPORT COMPOSABLE INTERFACE
  // ========================================

  return {
    // Selection methods
    selectElement,
    deselectElement,

    // Modification methods
    deleteElement,
    updateElementProperty,
    duplicateElement,

    // Z-index methods
    bringToFront,
    sendToBack,

    // Query methods
    getSelectedElement,
    isElementSelected,
    getElementById,
    getAllElements,

    // Computed state (for reactive UI bindings)
    selectedElement,
    isAnyElementSelected,
    isOperationInProgress,
  }
}

/**
 * Return type definition for the useElementManipulation composable
 *
 * Exported for TypeScript type checking in components
 */
export type UseElementManipulationReturn = ReturnType<typeof useElementManipulation>
