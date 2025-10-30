/**
 * useCropTool Composable - Professional image crop tool state and logic
 *
 * This composable handles all crop tool functionality:
 * - Crop state management (position, size, aspect ratio)
 * - Mouse drag/resize event handling
 * - Aspect ratio enforcement (square, portrait, landscape, custom, free)
 * - Snap-to-grid calculations (10px increments)
 * - Drag handle detection and boundary constraints
 * - Real-time dimension updates
 * - Keyboard fine-tuning support (arrow keys: ±5px)
 *
 * Architecture:
 * - State: crop dimensions (x, y, width, height), aspect ratio preset, custom aspect ratio
 * - Computed: visible crop area, drag handles, grid positions
 * - Methods: handle drag/resize, enforce constraints, snap to grid, keyboard adjustments
 * - Events: emits crop changes for parent component reactivity
 *
 * Usage example:
 * ```typescript
 * const {
 *   cropData,
 *   aspectRatioPreset,
 *   isDragging,
 *   activeHandle,
 *   snapGridSize,
 *   handleMouseDown,
 *   handleMouseMove,
 *   handleMouseUp,
 *   handleKeyDown,
 *   setAspectRatio,
 *   resetCrop,
 *   adjustCropByKeyboard
 * } = useCropTool(imageWidth, imageHeight)
 * ```
 *
 * Aspect Ratio Presets:
 * - 'square': 1:1 (square)
 * - 'portrait_3_4': 3:4 (common portrait)
 * - 'portrait_9_16': 9:16 (mobile portrait)
 * - 'landscape_16_9': 16:9 (widescreen)
 * - 'landscape_4_3': 4:3 (standard)
 * - 'custom': user-defined aspect ratio
 * - 'free': no constraint
 *
 * @module composables/useCropTool
 */

import { ref, computed } from 'vue'

// ========================================
// TYPES
// ========================================

/**
 * Available aspect ratio presets for crop
 *
 * Each preset represents a common image format or composition standard.
 * Custom allows user-defined aspect ratio, free allows unconstrained cropping.
 */
export type AspectRatioPreset =
  | 'square'
  | 'portrait_3_4'
  | 'portrait_9_16'
  | 'landscape_16_9'
  | 'landscape_4_3'
  | 'custom'
  | 'free'

/**
 * Mapping of aspect ratio presets to their numerical values
 *
 * Used to enforce aspect ratio constraints during crop resizing.
 * Format: width / height (e.g., 16:9 = 1.778)
 */
const ASPECT_RATIOS: Record<Exclude<AspectRatioPreset, 'custom' | 'free'>, number> = {
  square: 1,
  portrait_3_4: 3 / 4,
  portrait_9_16: 9 / 16,
  landscape_16_9: 16 / 9,
  landscape_4_3: 4 / 3,
}

/**
 * Crop handle positions on the crop box
 *
 * Used for cursor styling and drag detection:
 * - Corners: tl, tr, bl, br (for diagonal resize)
 * - Edges: t, r, b, l (for single-direction resize)
 * - center: for moving the entire crop box
 */
export type CropHandle = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l' | 'center'

/**
 * Crop data structure with dimensions and constraints
 *
 * All coordinates are in pixels relative to the original image.
 * x, y: top-left corner position
 * width, height: crop box dimensions
 */
export interface CropData {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Drag state during mouse operations
 *
 * Tracks the active drag operation to enable smooth resize/move feedback.
 */
interface DragState {
  active: boolean
  handle: CropHandle | null
  startX: number
  startY: number
  startCrop: CropData
}

// ========================================
// COMPOSABLE
// ========================================

/**
 * Professional image crop tool composable
 *
 * Manages all state and logic for interactive image cropping with:
 * - Visual crop area selector with 3x3 grid overlay
 * - Draggable crop handles (corners + edges)
 * - Aspect ratio enforcement
 * - Snap-to-grid calculations
 * - Keyboard fine-tuning support
 * - Real-time dimension updates
 *
 * @param {number} imageWidth - Original image width in pixels
 * @param {number} imageHeight - Original image height in pixels
 * @returns {Object} Crop tool state, computed properties, and methods
 *
 * @example
 * const { cropData, handleMouseDown, setAspectRatio } = useCropTool(800, 600)
 * // Now use in template with mouse event handlers and aspect ratio setters
 */
export function useCropTool(imageWidth: number, imageHeight: number) {
  // ========================================
  // STATE
  // ========================================

  /**
   * Current crop dimensions and position
   *
   * Initialized to 50% of image size, centered.
   * All values are in pixels.
   */
  const cropData = ref<CropData>({
    x: Math.round(imageWidth * 0.25),
    y: Math.round(imageHeight * 0.25),
    width: Math.round(imageWidth * 0.5),
    height: Math.round(imageHeight * 0.5),
  })

  /**
   * Currently selected aspect ratio preset
   *
   * Determines whether crop resizing is constrained to a specific aspect ratio.
   * 'free' allows unconstrained resizing.
   */
  const aspectRatioPreset = ref<AspectRatioPreset>('free')

  /**
   * Custom aspect ratio value
   *
   * Used when aspectRatioPreset is 'custom'.
   * Format: width / height (e.g., 1.5 for 3:2)
   */
  const customAspectRatio = ref<number>(1)

  /**
   * Size of grid for snap-to-grid calculations
   *
   * Crop dimensions snap to multiples of this value (pixels).
   * Default: 10px for precise control.
   */
  const snapGridSize = ref<number>(10)

  /**
   * Current drag operation state
   *
   * Tracks which handle is being dragged and initial positions
   * to enable smooth drag-to-resize interactions.
   */
  const dragState = ref<DragState>({
    active: false,
    handle: null,
    startX: 0,
    startY: 0,
    startCrop: { x: 0, y: 0, width: 0, height: 0 },
  })

  /**
   * Keyboard arrow key repeat state
   *
   * Prevents multiple simultaneous adjustments from held-down keys.
   * Set to true when arrow key is pressed, false on release.
   */
  const keyboardRepeatActive = ref<Map<string, boolean>>(new Map())

  // ========================================
  // COMPUTED
  // ========================================

  /**
   * Get current aspect ratio value
   *
   * Returns the numerical aspect ratio based on current preset or custom value.
   * Returns null if preset is 'free' (no constraint).
   *
   * @returns {number | null} Aspect ratio (width/height) or null if free
   */
  const currentAspectRatio = computed((): number | null => {
    if (aspectRatioPreset.value === 'free') {
      return null
    }
    if (aspectRatioPreset.value === 'custom') {
      return customAspectRatio.value
    }
    return ASPECT_RATIOS[aspectRatioPreset.value as keyof typeof ASPECT_RATIOS]
  })

  /**
   * Crop box coordinates for CSS positioning
   *
   * Converts crop data to percentage-based values for CSS positioning
   * on the preview image container.
   * Used for rendering the visual crop box and handles.
   *
   * @returns {Object} CSS position values in percentages
   */
  const cropBoxPosition = computed(() => {
    return {
      left: `${(cropData.value.x / imageWidth) * 100}%`,
      top: `${(cropData.value.y / imageHeight) * 100}%`,
      width: `${(cropData.value.width / imageWidth) * 100}%`,
      height: `${(cropData.value.height / imageHeight) * 100}%`,
    }
  })

  /**
   * Grid line positions for rule-of-thirds visualization
   *
   * Calculates positions of the 3x3 grid overlay that helps
   * users compose their crop using rule of thirds guidelines.
   *
   * @returns {Array} Grid line positions as percentages
   */
  const gridLinePositions = computed(() => {
    return {
      vertical: [33.333, 66.667],
      horizontal: [33.333, 66.667],
    }
  })

  /**
   * Handles for visual crop box manipulation
   *
   * Defines 8 draggable handles (4 corners + 4 edges) and center handle.
   * Each handle enables different resize/move operations.
   *
   * @returns {Object} Handle positions with cursor styles
   */
  const cropHandles = computed(() => {
    const pos = cropBoxPosition.value

    return {
      tl: { top: pos.top, left: pos.left, cursor: 'nw-resize' },
      tr: { top: pos.top, right: 'calc(100% - ' + pos.left + ' - ' + pos.width + ')', cursor: 'ne-resize' },
      bl: { bottom: 'calc(100% - ' + pos.top + ' - ' + pos.height + ')', left: pos.left, cursor: 'sw-resize' },
      br: {
        bottom: 'calc(100% - ' + pos.top + ' - ' + pos.height + ')',
        right: 'calc(100% - ' + pos.left + ' - ' + pos.width + ')',
        cursor: 'se-resize',
      },
      t: { top: pos.top, left: 'calc(' + pos.left + ' + ' + pos.width + ' / 2)', cursor: 'n-resize' },
      b: { bottom: 'calc(100% - ' + pos.top + ' - ' + pos.height + ')', left: 'calc(' + pos.left + ' + ' + pos.width + ' / 2)', cursor: 's-resize' },
      l: { top: 'calc(' + pos.top + ' + ' + pos.height + ' / 2)', left: pos.left, cursor: 'w-resize' },
      r: { top: 'calc(' + pos.top + ' + ' + pos.height + ' / 2)', right: 'calc(100% - ' + pos.left + ' - ' + pos.width + ')', cursor: 'e-resize' },
      center: { cursor: 'move' },
    }
  })

  /**
   * Indicates if crop tool is currently in drag/resize mode
   *
   * @returns {boolean} True if dragging, false otherwise
   */
  const isDragging = computed(() => dragState.value.active)

  /**
   * Currently active drag handle
   *
   * @returns {CropHandle | null} Handle being dragged or null
   */
  const activeHandle = computed(() => dragState.value.handle)

  // ========================================
  // METHODS - Constraint & Validation
  // ========================================

  /**
   * Snap a value to the nearest grid increment
   *
   * Rounds values to the nearest multiple of snapGridSize for
   * precise, predictable crop dimensions.
   *
   * @param {number} value - Value to snap
   * @returns {number} Snapped value
   *
   * @example
   * snapToGrid(47, 10) → 50
   * snapToGrid(63, 10) → 60
   */
  const snapToGrid = (value: number): number => {
    const gridSize = snapGridSize.value
    return Math.round(value / gridSize) * gridSize
  }

  /**
   * Enforce minimum and maximum constraints on crop box
   *
   * Prevents crop box from:
   * - Going outside image boundaries
   * - Becoming smaller than minimum size (50x50 pixels)
   * - Becoming larger than image
   *
   * @param {CropData} crop - Crop to constrain
   * @returns {CropData} Constrained crop
   */
  const constrainCrop = (crop: CropData): CropData => {
    const MIN_SIZE = 50

    return {
      x: Math.max(0, Math.min(crop.x, imageWidth - MIN_SIZE)),
      y: Math.max(0, Math.min(crop.y, imageHeight - MIN_SIZE)),
      width: Math.max(MIN_SIZE, Math.min(crop.width, imageWidth - crop.x)),
      height: Math.max(MIN_SIZE, Math.min(crop.height, imageHeight - crop.y)),
    }
  }

  /**
   * Enforce aspect ratio constraint on crop dimensions
   *
   * If an aspect ratio preset is active, adjusts crop dimensions
   * to match the required ratio while maintaining user intent.
   *
   * Priority order:
   * 1. Maintain width if resizing from right/bottom
   * 2. Maintain height if resizing from top/left
   * 3. Center the crop box if manual adjustment
   *
   * @param {CropData} crop - Crop to adjust
   * @param {CropHandle} [handle] - Handle being resized (for smart adjustments)
   * @returns {CropData} Crop with aspect ratio enforced
   */
  const enforceAspectRatio = (crop: CropData, handle?: CropHandle): CropData => {
    const ratio = currentAspectRatio.value
    if (!ratio) {
      return crop // No constraint if 'free' mode
    }

    const currentRatio = crop.width / crop.height

    // Determine which dimension to adjust based on drag handle
    if (handle && ['r', 'tr', 'br'].includes(handle)) {
      // Dragging from right: adjust height to match width
      crop.height = Math.round(crop.width / ratio)
    } else if (handle && ['b', 'bl', 'br'].includes(handle)) {
      // Dragging from bottom: adjust width to match height
      crop.width = Math.round(crop.height * ratio)
    } else if (handle && ['l', 'tl', 'bl'].includes(handle)) {
      // Dragging from left: adjust height to match width
      crop.height = Math.round(crop.width / ratio)
    } else if (handle && ['t', 'tl', 'tr'].includes(handle)) {
      // Dragging from top: adjust width to match height
      crop.width = Math.round(crop.height * ratio)
    } else {
      // No handle specified: adjust based on which ratio is off
      if (currentRatio > ratio) {
        crop.height = Math.round(crop.width / ratio)
      } else {
        crop.width = Math.round(crop.height * ratio)
      }
    }

    return crop
  }

  // ========================================
  // METHODS - Drag & Resize
  // ========================================

  /**
   * Detect which handle was clicked based on mouse position
   *
   * Determines if user clicked on a drag handle to start resize/move operation.
   * Handles have a clickable area larger than their visual size for better UX.
   *
   * @param {number} clientX - Mouse X coordinate
   * @param {number} clientY - Mouse Y coordinate
   * @param {HTMLElement} containerElement - Crop container element
   * @returns {CropHandle | null} Handle name or null if no handle clicked
   */
  const detectHandle = (
    clientX: number,
    clientY: number,
    containerElement: HTMLElement
  ): CropHandle | null => {
    const rect = containerElement.getBoundingClientRect()
    const handleClickableArea = 16 // clickable area in pixels
    const x = clientX - rect.left
    const y = clientY - rect.top

    const cropPercent = cropBoxPosition.value
    const cropBox = {
      left: (parseFloat(cropPercent.left) / 100) * rect.width,
      top: (parseFloat(cropPercent.top) / 100) * rect.height,
      width: (parseFloat(cropPercent.width) / 100) * rect.width,
      height: (parseFloat(cropPercent.height) / 100) * rect.height,
    }

    // Check corners first (larger clickable area)
    if (
      x >= cropBox.left - handleClickableArea &&
      x <= cropBox.left + handleClickableArea &&
      y >= cropBox.top - handleClickableArea &&
      y <= cropBox.top + handleClickableArea
    ) {
      return 'tl'
    }
    if (
      x >= cropBox.left + cropBox.width - handleClickableArea &&
      x <= cropBox.left + cropBox.width + handleClickableArea &&
      y >= cropBox.top - handleClickableArea &&
      y <= cropBox.top + handleClickableArea
    ) {
      return 'tr'
    }
    if (
      x >= cropBox.left - handleClickableArea &&
      x <= cropBox.left + handleClickableArea &&
      y >= cropBox.top + cropBox.height - handleClickableArea &&
      y <= cropBox.top + cropBox.height + handleClickableArea
    ) {
      return 'bl'
    }
    if (
      x >= cropBox.left + cropBox.width - handleClickableArea &&
      x <= cropBox.left + cropBox.width + handleClickableArea &&
      y >= cropBox.top + cropBox.height - handleClickableArea &&
      y <= cropBox.top + cropBox.height + handleClickableArea
    ) {
      return 'br'
    }

    // Check edges
    if (x >= cropBox.left && x <= cropBox.left + cropBox.width) {
      if (y >= cropBox.top - handleClickableArea / 2 && y <= cropBox.top + handleClickableArea / 2) {
        return 't'
      }
      if (y >= cropBox.top + cropBox.height - handleClickableArea / 2 && y <= cropBox.top + cropBox.height + handleClickableArea / 2) {
        return 'b'
      }
    }
    if (y >= cropBox.top && y <= cropBox.top + cropBox.height) {
      if (x >= cropBox.left - handleClickableArea / 2 && x <= cropBox.left + handleClickableArea / 2) {
        return 'l'
      }
      if (x >= cropBox.left + cropBox.width - handleClickableArea / 2 && x <= cropBox.left + cropBox.width + handleClickableArea / 2) {
        return 'r'
      }
    }

    // Check center (move entire crop box)
    if (
      x >= cropBox.left &&
      x <= cropBox.left + cropBox.width &&
      y >= cropBox.top &&
      y <= cropBox.top + cropBox.height
    ) {
      return 'center'
    }

    return null
  }

  /**
   * Handle mouse down event on crop area
   *
   * Initiates drag/resize operation by:
   * 1. Detecting which handle was clicked
   * 2. Storing initial position and crop state
   * 3. Setting active drag flag
   *
   * @param {MouseEvent} event - Mouse event
   * @param {HTMLElement} containerElement - Crop container element
   */
  const handleMouseDown = (event: MouseEvent, containerElement: HTMLElement): void => {
    const handle = detectHandle(event.clientX, event.clientY, containerElement)
    if (!handle) {
      return
    }

    dragState.value = {
      active: true,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: { ...cropData.value },
    }
  }

  /**
   * Handle mouse move event during drag/resize
   *
   * Updates crop dimensions based on mouse movement and selected handle.
   * Applies constraints and aspect ratio enforcement.
   *
   * Handles:
   * - Corner handles: resize both dimensions
   * - Edge handles: resize single dimension
   * - Center handle: move entire crop box
   *
   * @param {MouseEvent} event - Mouse event
   * @param {HTMLElement} containerElement - Crop container element for coordinates
   */
  const handleMouseMove = (event: MouseEvent, containerElement: HTMLElement): void => {
    if (!dragState.value.active || !dragState.value.handle) {
      return
    }

    const rect = containerElement.getBoundingClientRect()
    const deltaX = event.clientX - dragState.value.startX
    const deltaY = event.clientY - dragState.value.startY

    // Convert delta from pixels to image coordinates
    const imageDeltaX = Math.round((deltaX / rect.width) * imageWidth)
    const imageDeltaY = Math.round((deltaY / rect.height) * imageHeight)

    let newCrop = { ...dragState.value.startCrop }
    const handle = dragState.value.handle

    // Update crop based on handle type
    switch (handle) {
      // Corners
      case 'tl':
        newCrop.x += imageDeltaX
        newCrop.y += imageDeltaY
        newCrop.width -= imageDeltaX
        newCrop.height -= imageDeltaY
        break
      case 'tr':
        newCrop.y += imageDeltaY
        newCrop.width += imageDeltaX
        newCrop.height -= imageDeltaY
        break
      case 'bl':
        newCrop.x += imageDeltaX
        newCrop.width -= imageDeltaX
        newCrop.height += imageDeltaY
        break
      case 'br':
        newCrop.width += imageDeltaX
        newCrop.height += imageDeltaY
        break

      // Edges
      case 't':
        newCrop.y += imageDeltaY
        newCrop.height -= imageDeltaY
        break
      case 'b':
        newCrop.height += imageDeltaY
        break
      case 'l':
        newCrop.x += imageDeltaX
        newCrop.width -= imageDeltaX
        break
      case 'r':
        newCrop.width += imageDeltaX
        break

      // Center (move)
      case 'center':
        newCrop.x += imageDeltaX
        newCrop.y += imageDeltaY
        break
    }

    // Enforce aspect ratio
    newCrop = enforceAspectRatio(newCrop, handle)

    // Apply constraints
    newCrop = constrainCrop(newCrop)

    // Snap to grid
    newCrop.x = snapToGrid(newCrop.x)
    newCrop.y = snapToGrid(newCrop.y)
    newCrop.width = snapToGrid(newCrop.width)
    newCrop.height = snapToGrid(newCrop.height)

    cropData.value = newCrop
  }

  /**
   * Handle mouse up event to end drag/resize
   *
   * Clears the active drag state and stops tracking mouse movement.
   */
  const handleMouseUp = (): void => {
    dragState.value.active = false
    dragState.value.handle = null
  }

  // ========================================
  // METHODS - Keyboard Support
  // ========================================

  /**
   * Handle keyboard input for fine-tuning crop dimensions
   *
   * Supports arrow keys for precision adjustments:
   * - Arrow Up/Down: adjust height (±5px)
   * - Arrow Left/Right: adjust width (±5px)
   * - Shift + Arrow: move entire crop box (±5px)
   *
   * Multiple simultaneous arrow keys are handled via key repeat tracking.
   *
   * @param {KeyboardEvent} event - Keyboard event
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    const adjustmentSize = 5

    // Check if this key is already being pressed
    if (keyboardRepeatActive.value.get(event.key)) {
      return
    }

    keyboardRepeatActive.value.set(event.key, true)

    let newCrop = { ...cropData.value }

    if (event.shiftKey) {
      // Shift + arrows: move crop box
      switch (event.key) {
        case 'ArrowUp':
          newCrop.y = Math.max(0, newCrop.y - adjustmentSize)
          event.preventDefault()
          break
        case 'ArrowDown':
          newCrop.y = Math.min(imageHeight - newCrop.height, newCrop.y + adjustmentSize)
          event.preventDefault()
          break
        case 'ArrowLeft':
          newCrop.x = Math.max(0, newCrop.x - adjustmentSize)
          event.preventDefault()
          break
        case 'ArrowRight':
          newCrop.x = Math.min(imageWidth - newCrop.width, newCrop.x + adjustmentSize)
          event.preventDefault()
          break
      }
    } else {
      // Plain arrows: resize crop box
      switch (event.key) {
        case 'ArrowUp':
          newCrop.height = Math.max(50, newCrop.height - adjustmentSize)
          newCrop = enforceAspectRatio(newCrop, 't')
          event.preventDefault()
          break
        case 'ArrowDown':
          newCrop.height = Math.min(imageHeight - newCrop.y, newCrop.height + adjustmentSize)
          newCrop = enforceAspectRatio(newCrop, 'b')
          event.preventDefault()
          break
        case 'ArrowLeft':
          newCrop.width = Math.max(50, newCrop.width - adjustmentSize)
          newCrop = enforceAspectRatio(newCrop, 'l')
          event.preventDefault()
          break
        case 'ArrowRight':
          newCrop.width = Math.min(imageWidth - newCrop.x, newCrop.width + adjustmentSize)
          newCrop = enforceAspectRatio(newCrop, 'r')
          event.preventDefault()
          break
      }
    }

    cropData.value = constrainCrop(newCrop)
  }

  /**
   * Handle keyboard key up to track repeat state
   *
   * Removes key from repeat tracking to allow next press to register.
   *
   * @param {KeyboardEvent} event - Keyboard event
   */
  const handleKeyUp = (event: KeyboardEvent): void => {
    keyboardRepeatActive.value.delete(event.key)
  }

  // ========================================
  // METHODS - Aspect Ratio Control
  // ========================================

  /**
   * Set aspect ratio preset
   *
   * Changes the aspect ratio constraint and updates crop dimensions
   * to match the new preset.
   *
   * @param {AspectRatioPreset} preset - Aspect ratio preset name
   *
   * @example
   * setAspectRatio('square')      // 1:1
   * setAspectRatio('landscape_16_9') // 16:9
   * setAspectRatio('free')       // No constraint
   */
  const setAspectRatio = (preset: AspectRatioPreset): void => {
    aspectRatioPreset.value = preset

    // When changing preset, enforce the new aspect ratio
    let newCrop = { ...cropData.value }
    newCrop = enforceAspectRatio(newCrop)
    newCrop = constrainCrop(newCrop)
    cropData.value = newCrop
  }

  /**
   * Set custom aspect ratio
   *
   * Used when aspectRatioPreset is 'custom'.
   * Value should be width / height (e.g., 1.5 for 3:2).
   *
   * @param {number} ratio - Custom aspect ratio value
   *
   * @example
   * setCustomAspectRatio(1.5)  // 3:2 aspect ratio
   * setAspectRatio('custom')   // Activate custom preset
   */
  const setCustomAspectRatio = (ratio: number): void => {
    customAspectRatio.value = Math.max(0.1, Math.min(ratio, 10)) // Constrain to reasonable range

    // If custom preset is active, enforce the new ratio
    if (aspectRatioPreset.value === 'custom') {
      let newCrop = { ...cropData.value }
      newCrop = enforceAspectRatio(newCrop)
      newCrop = constrainCrop(newCrop)
      cropData.value = newCrop
    }
  }

  // ========================================
  // METHODS - Utility & Reset
  // ========================================

  /**
   * Reset crop to default (50% of image, centered)
   *
   * Resets both dimensions and aspect ratio to initial state.
   * Useful for "Reset Crop" button functionality.
   */
  const resetCrop = (): void => {
    cropData.value = {
      x: Math.round(imageWidth * 0.25),
      y: Math.round(imageHeight * 0.25),
      width: Math.round(imageWidth * 0.5),
      height: Math.round(imageHeight * 0.5),
    }
    aspectRatioPreset.value = 'free'
    customAspectRatio.value = 1
  }

  /**
   * Get crop data in original image pixels
   *
   * Returns the current crop as pixel coordinates suitable for
   * sending to the API backend.
   *
   * @returns {CropData} Crop with x, y, width, height in pixels
   */
  const getCropData = (): CropData => {
    return { ...cropData.value }
  }

  /**
   * Update crop data directly
   *
   * Useful for programmatically setting crop from external source
   * or restoring saved crop values.
   *
   * @param {Partial<CropData>} newCrop - Partial crop data to merge
   */
  const updateCropData = (newCrop: Partial<CropData>): void => {
    const merged = { ...cropData.value, ...newCrop }
    const constrained = constrainCrop(merged)
    cropData.value = constrained
  }

  /**
   * Enable global keyboard and mouse event listeners
   *
   * Should be called in component mount to enable keyboard shortcuts.
   * Returns cleanup function for component unmount.
   *
   * @returns {() => void} Cleanup function
   */
  const enableEventListeners = (): (() => void) => {
    const keyDownHandler = handleKeyDown
    const keyUpHandler = handleKeyUp

    window.addEventListener('keydown', keyDownHandler)
    window.addEventListener('keyup', keyUpHandler)

    return () => {
      window.removeEventListener('keydown', keyDownHandler)
      window.removeEventListener('keyup', keyUpHandler)
    }
  }

  // ========================================
  // RETURN
  // ========================================

  return {
    // State
    cropData,
    aspectRatioPreset,
    customAspectRatio,
    snapGridSize,
    dragState: computed(() => dragState.value),

    // Computed
    currentAspectRatio,
    cropBoxPosition,
    gridLinePositions,
    cropHandles,
    isDragging,
    activeHandle,

    // Methods - Drag/Resize
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,

    // Methods - Keyboard
    handleKeyDown,
    handleKeyUp,

    // Methods - Aspect Ratio
    setAspectRatio,
    setCustomAspectRatio,

    // Methods - Utility
    resetCrop,
    getCropData,
    updateCropData,
    enableEventListeners,

    // Helpers for constraint/validation (exposed for testing)
    snapToGrid,
    constrainCrop,
    enforceAspectRatio,
  }
}
