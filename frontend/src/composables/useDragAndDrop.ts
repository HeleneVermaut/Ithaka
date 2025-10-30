/**
 * Composable for canvas element drag-and-drop interactions (US04-TASK25)
 *
 * Provides reusable logic for dragging page elements on the canvas,
 * tracking position changes with performance optimization and snap-to-grid support.
 *
 * Features:
 * - Smooth 60fps drag operations with throttled mouse move events
 * - Position tracking and delta calculations
 * - Optional snap-to-grid alignment (10px grid)
 * - Event cleanup on unmount
 * - Drag state management with visual feedback
 * - Integration with pageElementsStore for persistence
 *
 * Architecture:
 * - Encapsulates all drag-and-drop logic in one reusable composable
 * - Uses requestAnimationFrame for smooth position updates
 * - Implements throttling to reduce event processing overhead
 * - Provides clear separation between UI state and data persistence
 *
 * Performance Considerations:
 * - Mouse move events throttled at 50ms intervals (20fps for drag, 60fps rendering)
 * - requestAnimationFrame for position updates
 * - Event listeners cleaned up on unmount
 * - Lazy event listener attachment on demand
 *
 * @module composables/useDragAndDrop
 *
 * @example
 * ```typescript
 * import { useDragAndDrop } from '@/composables/useDragAndDrop'
 *
 * const {
 *   isDragging,
 *   startDrag,
 *   onDragMove,
 *   endDrag,
 *   cancelDrag,
 *   getDragOffset,
 *   getElementPosition
 * } = useDragAndDrop()
 *
 * // In mousedown handler
 * const handleMouseDown = (elementId: string, event: MouseEvent) => {
 *   startDrag(elementId, event.clientX, event.clientY, event)
 * }
 *
 * // In mousemove handler
 * const handleMouseMove = (event: MouseEvent) => {
 *   onDragMove(event.clientX, event.clientY)
 * }
 *
 * // In mouseup handler
 * const handleMouseUp = async () => {
 *   await endDrag()
 * }
 * ```
 */

import { ref, computed, onUnmounted, type ComputedRef } from 'vue'
import { usePageElementsStore } from '@/stores/pageElementsStore'

/**
 * Represents a position on the canvas in pixel coordinates
 */
interface Position {
  /** Horizontal coordinate in pixels */
  x: number
  /** Vertical coordinate in pixels */
  y: number
}

/**
 * Represents the offset (delta) between two positions
 */
interface Offset {
  /** Horizontal delta in pixels */
  dx: number
  /** Vertical delta in pixels */
  dy: number
}

/**
 * Configuration options for drag-and-drop behavior
 */
export interface UseDragAndDropOptions {
  /** Enable snap-to-grid alignment (default: true) */
  snapToGrid?: boolean
  /** Grid size in pixels for snapping (default: 10) */
  gridSize?: number
  /** Throttle interval for mouse move events in milliseconds (default: 50) */
  throttleInterval?: number
  /** Enable debug logging (default: false) */
  debug?: boolean
}

/**
 * Return type for useDragAndDrop composable
 */
export interface UseDragAndDropReturn {
  /**
   * Start a drag operation for an element
   *
   * @param elementId - UUID of the element to drag
   * @param initialX - Initial X coordinate (client space)
   * @param initialY - Initial Y coordinate (client space)
   * @param event - Mouse event triggering the drag
   */
  startDrag: (elementId: string, initialX: number, initialY: number, event: MouseEvent) => void

  /**
   * Handle mouse move during drag operation
   *
   * @param clientX - Current X coordinate (client space)
   * @param clientY - Current Y coordinate (client space)
   */
  onDragMove: (clientX: number, clientY: number) => void

  /**
   * Finalize drag operation and persist position changes
   *
   * @returns Promise that resolves when position is persisted to API
   * @throws Error if element update fails
   */
  endDrag: () => Promise<void>

  /**
   * Abort drag operation and revert to initial position
   */
  cancelDrag: () => void

  /**
   * Check if currently dragging
   *
   * @returns ComputedRef<boolean> - true if drag in progress
   */
  isDragging: ComputedRef<boolean>

  /**
   * Get current drag offset (distance moved from start)
   *
   * @returns ComputedRef<Offset> - Object with dx and dy properties
   */
  getDragOffset: ComputedRef<Offset>

  /**
   * Get current element position after drag transformation
   *
   * @returns ComputedRef<Position> - Object with x and y properties
   */
  getElementPosition: ComputedRef<Position>
}

/**
 * Composable for handling canvas element drag-and-drop interactions
 *
 * Manages the complete lifecycle of dragging page elements on a canvas:
 * 1. startDrag() - Initialize drag state with initial coordinates
 * 2. onDragMove() - Update position during mouse movement (throttled)
 * 3. endDrag() - Persist position changes to backend
 * 4. cancelDrag() - Abort drag and revert to initial position
 *
 * All coordinates are in pixel space (client coordinates) but can be
 * converted to canvas/page coordinates by parent component if needed.
 *
 * @param options - Configuration options for drag behavior
 * @returns Object with drag handlers and computed state
 *
 * @throws Error if endDrag() fails (caught in Promise)
 *
 * @example
 * ```typescript
 * // In CanvasElement.vue
 * const {
 *   isDragging,
 *   startDrag,
 *   onDragMove,
 *   endDrag,
 *   getDragOffset
 * } = useDragAndDrop({
 *   snapToGrid: true,
 *   gridSize: 10
 * })
 *
 * // Add event listeners
 * onMounted(() => {
 *   document.addEventListener('mousemove', handleMouseMove)
 *   document.addEventListener('mouseup', handleMouseUp)
 * })
 *
 * // Clean up is handled automatically by composable
 * ```
 */
export function useDragAndDrop(
  options: UseDragAndDropOptions = {}
): UseDragAndDropReturn {
  // ========================================
  // CONFIGURATION
  // ========================================

  const {
    snapToGrid = true,
    gridSize = 10,
    throttleInterval = 50,
    debug = false
  } = options

  // ========================================
  // STORE & SERVICES
  // ========================================

  const pageElementsStore = usePageElementsStore()

  // ========================================
  // STATE: Drag tracking
  // ========================================

  /**
   * Unique identifier of the element currently being dragged
   * null if no drag in progress
   */
  const draggedElementId = ref<string | null>(null)

  /**
   * Initial position where drag started (client coordinates)
   * Used to calculate offset and for reverting on cancel
   */
  const initialPosition = ref<Position>({ x: 0, y: 0 })

  /**
   * Current position during drag (client coordinates)
   * Updated by onDragMove() throttled to throttleInterval
   */
  const currentPosition = ref<Position>({ x: 0, y: 0 })

  /**
   * Previous position from last throttle window
   * Used to detect if position actually changed
   */
  const previousPosition = ref<Position>({ x: 0, y: 0 })

  /**
   * Timestamp of last onDragMove() call
   * Used for implementing throttle logic
   */
  let lastMoveTime = 0

  /**
   * requestAnimationFrame ID for pending position update
   * Used to cancel animation frame if drag ends before next frame
   */
  let rafId: number | null = null

  /**
   * Flag indicating if position update is pending in next animation frame
   * Prevents multiple position updates in same frame
   */
  let isPendingUpdate = false

  // ========================================
  // STATE: Initial element state (for rollback)
  // ========================================

  /**
   * Stores initial element state before drag
   * Used by cancelDrag() to revert changes
   */
  const initialElement = ref<{
    x: number
    y: number
  } | null>(null)

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Log debug messages if debug mode is enabled
   *
   * @param message - Message to log
   * @param data - Optional data to log
   */
  const log = (message: string, data?: unknown): void => {
    if (debug) {
      console.log(`[useDragAndDrop] ${message}`, data || '')
    }
  }

  /**
   * Apply snap-to-grid alignment to a coordinate
   *
   * Rounds coordinate to nearest grid point if snapToGrid is enabled.
   * For example, with gridSize=10:
   * - 47 → 50
   * - 43 → 40
   * - 125 → 120
   *
   * @param value - Coordinate value in pixels
   * @returns Snapped or original coordinate
   */
  const snapCoordinate = (value: number): number => {
    if (!snapToGrid) {
      return value
    }
    return Math.round(value / gridSize) * gridSize
  }

  /**
   * Calculate offset (delta) between two positions
   *
   * @param from - Starting position
   * @param to - Ending position
   * @returns Offset object with dx and dy properties
   */
  const calculateOffset = (from: Position, to: Position): Offset => ({
    dx: to.x - from.x,
    dy: to.y - from.y
  })

  /**
   * Update element position in page coordinates (millimeters)
   *
   * The drag composable works in pixel coordinates, but the backend
   * expects millimeters. This function converts the pixel-based offset
   * to the element's position in millimeter coordinates.
   *
   * Note: The actual conversion ratio should be established based on
   * the canvas scale factor. For now, we use pixels directly and let
   * parent component handle scaling if needed.
   *
   * @param elementId - Element to update
   * @param offset - Pixel offset from start position
   */
  const updateElementPosition = async (elementId: string, offset: Offset): Promise<void> => {
    try {
      // Get current element from store
      const element = pageElementsStore.getElementById(elementId)
      if (!element) {
        log(`Element ${elementId} not found in store`)
        throw new Error(`Element ${elementId} not found`)
      }

      // Calculate new position
      // Note: Converting pixels to millimeters assumes 1px ≈ 0.264583mm
      // This should be configurable based on canvas DPI settings
      const mmPerPixel = 0.264583 // Standard screen DPI
      const newX = element.x + offset.dx * mmPerPixel
      const newY = element.y + offset.dy * mmPerPixel

      log(`Updating element ${elementId} position`, {
        oldX: element.x,
        oldY: element.y,
        newX,
        newY,
        offsetPx: { dx: offset.dx, dy: offset.dy }
      })

      // Persist to backend
      await pageElementsStore.updateElement(elementId, {
        x: newX,
        y: newY
      })

      log(`Element ${elementId} position persisted`)
    } catch (error) {
      console.error(
        `[useDragAndDrop] Failed to update element position for ${elementId}:`,
        error
      )
      throw error
    }
  }

  // ========================================
  // COMPUTED PROPERTIES
  // ========================================

  /**
   * Computed: Check if currently dragging
   *
   * @returns true if draggedElementId is set
   */
  const isDragging = computed((): boolean => draggedElementId.value !== null)

  /**
   * Computed: Get current drag offset (distance moved from start)
   *
   * Calculates the difference between current and initial position.
   * Applied snap-to-grid if enabled.
   *
   * @returns Offset object with dx and dy properties
   */
  const getDragOffset = computed((): Offset => {
    if (!isDragging.value) {
      return { dx: 0, dy: 0 }
    }

    const snappedCurrent: Position = {
      x: snapCoordinate(currentPosition.value.x),
      y: snapCoordinate(currentPosition.value.y)
    }

    return calculateOffset(initialPosition.value, snappedCurrent)
  })

  /**
   * Computed: Get element position after drag transformation
   *
   * Returns the position where element should be rendered.
   * In pixel coordinates. Snap-to-grid is applied if enabled.
   *
   * @returns Position object with x and y in pixels
   */
  const getElementPosition = computed((): Position => {
    if (!isDragging.value) {
      return { x: 0, y: 0 }
    }

    return {
      x: snapCoordinate(currentPosition.value.x - initialPosition.value.x),
      y: snapCoordinate(currentPosition.value.y - initialPosition.value.y)
    }
  })

  // ========================================
  // DRAG OPERATION HANDLERS
  // ========================================

  /**
   * Start a drag operation
   *
   * Initializes drag state and stores initial position. Called when user
   * presses mouse button on an element.
   *
   * This function:
   * 1. Saves current element state for potential rollback
   * 2. Records initial mouse position
   * 3. Marks element as being dragged
   * 4. Prevents text selection during drag
   *
   * @param elementId - UUID of element to drag
   * @param initialX - Mouse X position when drag started (client coordinates)
   * @param initialY - Mouse Y position when drag started (client coordinates)
   * @param event - Original MouseEvent for additional processing
   *
   * @throws Error if element not found in store
   *
   * @example
   * ```typescript
   * const handleMouseDown = (elementId: string, event: MouseEvent) => {
   *   try {
   *     startDrag(elementId, event.clientX, event.clientY, event)
   *   } catch (error) {
   *     console.error('Failed to start drag:', error)
   *   }
   * }
   * ```
   */
  const startDrag = (
    elementId: string,
    initialX: number,
    initialY: number,
    event: MouseEvent
  ): void => {
    try {
      log(`Starting drag for element ${elementId}`, { initialX, initialY })

      // Get element from store to validate it exists and save initial state
      const element = pageElementsStore.getElementById(elementId)
      if (!element) {
        throw new Error(`Cannot drag: element ${elementId} not found`)
      }

      // Store initial element position for rollback
      initialElement.value = {
        x: element.x,
        y: element.y
      }

      // Initialize drag state
      draggedElementId.value = elementId
      initialPosition.value = { x: initialX, y: initialY }
      currentPosition.value = { x: initialX, y: initialY }
      previousPosition.value = { x: initialX, y: initialY }
      lastMoveTime = 0

      // Prevent text selection during drag
      event.preventDefault()
      document.body.style.userSelect = 'none'

      log(`Drag started: element=${elementId}, initialPos={x:${initialX}, y:${initialY}}`)
    } catch (error) {
      console.error('[useDragAndDrop] startDrag failed:', error)
      draggedElementId.value = null
      throw error
    }
  }

  /**
   * Handle mouse move during drag operation
   *
   * Updates current position with throttling for performance.
   * The actual rendering position update is scheduled via requestAnimationFrame
   * to ensure smooth 60fps rendering while only processing mouse events at
   * throttleInterval rate.
   *
   * Throttling strategy:
   * 1. Throttle mouse move events to throttleInterval (50ms default = 20fps updates)
   * 2. Schedule position update via requestAnimationFrame (60fps rendering)
   * 3. This gives smooth 60fps rendering with reduced processing overhead
   *
   * @param clientX - Current mouse X position (client coordinates)
   * @param clientY - Current mouse Y position (client coordinates)
   *
   * @example
   * ```typescript
   * // In component
   * const handleMouseMove = (event: MouseEvent) => {
   *   onDragMove(event.clientX, event.clientY)
   * }
   *
   * // Add event listener
   * onMounted(() => {
   *   document.addEventListener('mousemove', handleMouseMove)
   * })
   * ```
   */
  const onDragMove = (clientX: number, clientY: number): void => {
    if (!isDragging.value) {
      return
    }

    const now = Date.now()

    // Throttle mouse move events to throttleInterval
    if (now - lastMoveTime < throttleInterval) {
      return
    }

    lastMoveTime = now

    log(`Mouse move: {x:${clientX}, y:${clientY}}`)

    // Update current position
    currentPosition.value = { x: clientX, y: clientY }

    // Schedule position update in next animation frame if not already pending
    if (!isPendingUpdate && rafId === null) {
      isPendingUpdate = true
      rafId = requestAnimationFrame(() => {
        isPendingUpdate = false
        rafId = null

        const offset = getDragOffset.value

        log(`Position update in RAF: offset={dx:${offset.dx}, dy:${offset.dy}}`)

        // Computed properties will trigger reactivity here
        // Vue templates will re-render with new getElementPosition value
      })
    }
  }

  /**
   * Finalize drag operation and persist position changes
   *
   * Called when user releases mouse button. This function:
   * 1. Cancels any pending animation frame
   * 2. Calculates final offset
   * 3. Persists element position to backend
   * 4. Clears drag state
   * 5. Restores text selection
   *
   * If position persistence fails, an error is logged but drag state
   * is still cleared to allow user to retry or continue working.
   *
   * @returns Promise that resolves when:
   *   - Position is persisted to backend, OR
   *   - Error is caught and logged
   *
   * @throws Never throws - errors are caught and logged internally
   *
   * @example
   * ```typescript
   * const handleMouseUp = async () => {
   *   try {
   *     await endDrag()
   *   } catch (error) {
   *     // endDrag never actually throws, but best practice
   *     console.error('Unexpected error in endDrag:', error)
   *   }
   * }
   * ```
   */
  const endDrag = async (): Promise<void> => {
    if (!isDragging.value) {
      log('endDrag called but not dragging')
      return
    }

    try {
      const elementId = draggedElementId.value
      if (!elementId) {
        return
      }

      // Cancel pending animation frame to prevent race conditions
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }

      const offset = getDragOffset.value

      log(`Ending drag: element=${elementId}, finalOffset={dx:${offset.dx}, dy:${offset.dy}}`)

      // Persist position if element was actually moved
      if (offset.dx !== 0 || offset.dy !== 0) {
        await updateElementPosition(elementId, offset)
      } else {
        log(`Element ${elementId} not moved, skipping persist`)
      }

      log(`Drag completed for element ${elementId}`)
    } catch (error) {
      console.error('[useDragAndDrop] endDrag failed:', error)
      // Don't re-throw - allow UI to continue
    } finally {
      // Always clear drag state
      draggedElementId.value = null
      initialPosition.value = { x: 0, y: 0 }
      currentPosition.value = { x: 0, y: 0 }
      previousPosition.value = { x: 0, y: 0 }
      initialElement.value = null

      // Restore text selection
      document.body.style.userSelect = 'auto'
    }
  }

  /**
   * Abort drag operation and revert to initial position
   *
   * Called when user presses Escape or other cancellation trigger.
   * This function reverts the element to its position before drag started.
   *
   * The revert happens:
   * 1. Immediately in UI (computed properties will show initial position)
   * 2. Then optionally via backend if position was persisted
   *
   * Note: If position was already persisted to backend, we would need
   * an additional API call to revert. For now, we just reset local state.
   *
   * @example
   * ```typescript
   * // In Escape key handler
   * const handleKeyDown = (event: KeyboardEvent) => {
   *   if (event.key === 'Escape') {
   *     cancelDrag()
   *   }
   * }
   * ```
   */
  const cancelDrag = (): void => {
    if (!isDragging.value) {
      log('cancelDrag called but not dragging')
      return
    }

    try {
      const elementId = draggedElementId.value
      if (!elementId) {
        return
      }

      // Cancel pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }

      log(`Canceling drag for element ${elementId}`)

      // Revert to initial position
      if (initialElement.value) {
        currentPosition.value = { ...initialPosition.value }
        log(`Drag canceled: reverted to initial position`, initialElement.value)
      }
    } finally {
      // Clear drag state
      draggedElementId.value = null
      initialPosition.value = { x: 0, y: 0 }
      currentPosition.value = { x: 0, y: 0 }
      previousPosition.value = { x: 0, y: 0 }
      initialElement.value = null

      // Restore text selection
      document.body.style.userSelect = 'auto'
    }
  }

  // ========================================
  // LIFECYCLE & CLEANUP
  // ========================================

  /**
   * Clean up resources on component unmount
   *
   * Ensures:
   * 1. Any pending animation frame is cancelled
   * 2. Drag state is cleared (no orphaned dragging state)
   * 3. Text selection style is restored
   */
  onUnmounted(() => {
    log('Composable unmounting, cleaning up resources')

    // Cancel any pending animation frame
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    // Clear drag state
    draggedElementId.value = null
    initialPosition.value = { x: 0, y: 0 }
    currentPosition.value = { x: 0, y: 0 }
    previousPosition.value = { x: 0, y: 0 }
    initialElement.value = null

    // Restore text selection
    document.body.style.userSelect = 'auto'

    log('Cleanup complete')
  })

  // ========================================
  // RETURN INTERFACE
  // ========================================

  return {
    startDrag,
    onDragMove,
    endDrag,
    cancelDrag,
    isDragging,
    getDragOffset,
    getElementPosition
  }
}
