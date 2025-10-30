/**
 * Fabric.js Canvas Service
 *
 * Centralized service encapsulating all Fabric.js canvas operations.
 * Handles initialization, serialization/deserialization, and element management.
 * All coordinate conversions use unitConversion utilities (mm <-> px at 96 DPI).
 *
 * Architecture:
 * - fabricService exports pure functions (no state)
 * - All operations are unit-aware (mm for storage, px for canvas)
 * - Type-safe interfaces for serialized data
 * - Error handling for edge cases
 */

import { fabric } from 'fabric'
import { convertMmToPx, convertPxToMm } from '@/utils/unitConversion'

/**
 * Configuration options for canvas initialization
 */
export interface CanvasOptions {
  /** Canvas width in pixels */
  width: number
  /** Canvas height in pixels */
  height: number
  /** Canvas background color (default: white) */
  backgroundColor?: string
  /** Optimize rendering (default: false) */
  renderOnAddRemove?: boolean
}

/**
 * Configuration options for text elements
 */
export interface TextOptions {
  /** Font family name */
  fontFamily: string
  /** Font size in pixels */
  fontSize: number
  /** Text color in hex format */
  fill: string
  /** Text alignment (left, center, right) */
  textAlign?: 'left' | 'center' | 'right'
  /** Font weight */
  fontWeight?: 'normal' | 'bold'
  /** Font style */
  fontStyle?: 'normal' | 'italic'
}

/**
 * Serialized element data format (mm-based for storage)
 */
export interface SerializedElement {
  /** Unique identifier */
  id: string
  /** Element type (text, image, shape, etc.) */
  type: string
  /** X position in millimeters */
  x: number
  /** Y position in millimeters */
  y: number
  /** Width in millimeters */
  width: number
  /** Height in millimeters */
  height: number
  /** Rotation in degrees */
  rotation: number
  /** Z-index (stacking order) */
  zIndex: number
  /** Element-specific content */
  content: Record<string, any>
  /** Visual styling */
  style: Record<string, any>
  /** Custom metadata */
  metadata?: Record<string, any>
}

/**
 * Initialize Fabric.js canvas on DOM element
 *
 * Sets up canvas with specified dimensions and configuration.
 * Canvas is prepared for interactive editing with proper event handling.
 *
 * @param canvasElement - HTML canvas element to initialize on
 * @param options - Canvas configuration (width, height, background)
 * @returns Initialized fabric.Canvas instance
 * @throws Error if canvas element is invalid or initialization fails
 *
 * @example
 * ```typescript
 * const canvas = initializeCanvas(canvasElement, {
 *   width: 793.7,
 *   height: 1122.5,
 *   backgroundColor: 'white'
 * })
 * ```
 */
export function initializeCanvas(
  canvasElement: HTMLCanvasElement,
  options: CanvasOptions
): fabric.Canvas {
  if (!canvasElement) {
    throw new Error('Invalid canvas element provided')
  }

  try {
    const canvas = new fabric.Canvas(canvasElement, {
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor || 'white',
      renderOnAddRemove: options.renderOnAddRemove ?? false,
      selection: true,
      preserveObjectStacking: true
    })

    // Configure canvas for better performance and interaction
    canvas.freeDrawingBrush.width = 3
    canvas.freeDrawingBrush.color = '#000000'

    return canvas
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to initialize canvas: ${message}`)
  }
}

/**
 * Convert Fabric object to serialized element data
 *
 * Extracts all relevant properties from Fabric object and converts
 * coordinates from pixels to millimeters for storage.
 *
 * @param fabricObject - Fabric object to serialize
 * @returns SerializedElement with mm-based coordinates
 *
 * @example
 * ```typescript
 * const serialized = serializeElement(fabricTextbox)
 * // Returns { x: 10, y: 10, width: 100, height: 50, ... } (in mm)
 * ```
 */
export function serializeElement(fabricObject: fabric.Object): SerializedElement {
  const left = fabricObject.left ?? 0
  const top = fabricObject.top ?? 0
  const width = fabricObject.width ?? 0
  const height = fabricObject.height ?? 0
  const angle = fabricObject.angle ?? 0

  // Extract content based on object type
  const content: Record<string, any> = {}
  if (fabricObject instanceof fabric.Textbox) {
    content.text = fabricObject.text || ''
    content.fontFamily = fabricObject.fontFamily || 'Arial'
    content.fontSize = fabricObject.fontSize || 12
    content.fontWeight = fabricObject.fontWeight || 'normal'
    content.fontStyle = fabricObject.fontStyle || 'normal'
    content.textAlign = fabricObject.textAlign || 'left'
    content.lineHeight = fabricObject.lineHeight || 1.16
    // IMPORTANT: Store fill color in content for text elements
    // This ensures CanvasElement.vue can find it under elementContent.fill
    content.fill = fabricObject.fill || '#000000'
  }

  // Extract style properties
  const style: Record<string, any> = {
    fill: fabricObject.fill || '#000000',
    opacity: fabricObject.opacity ?? 1,
    stroke: fabricObject.stroke || null,
    strokeWidth: fabricObject.strokeWidth || 0
  }

  // Normalize Fabric.js type names to backend-compatible types
  // Fabric.js uses 'textbox' but backend expects 'text'
  let normalizedType = fabricObject.type || 'object'
  if (normalizedType === 'textbox') {
    normalizedType = 'text'
  }

  return {
    id: (fabricObject.data?.id as string) || crypto.randomUUID(),
    type: normalizedType,
    x: convertPxToMm(left),
    y: convertPxToMm(top),
    width: convertPxToMm(width),
    height: convertPxToMm(height),
    rotation: angle,
    zIndex: (fabricObject.data?.zIndex as number) ?? 0,
    content,
    style,
    metadata: fabricObject.data?.metadata as Record<string, any> | undefined
  }
}

/**
 * Convert serialized element data to Fabric object
 *
 * Reconstructs Fabric object from stored data, converting coordinates
 * from millimeters back to pixels.
 *
 * @param data - SerializedElement with mm-based coordinates
 * @returns Fabric object (Textbox, Rect, Image, etc.) positioned in px
 *
 * @example
 * ```typescript
 * const fabricObject = deserializeElement(serialized)
 * canvas.add(fabricObject)
 * ```
 */
export function deserializeElement(data: SerializedElement): fabric.Object {
  // Convert mm to px for canvas positioning
  const leftPx = convertMmToPx(data.x)
  const topPx = convertMmToPx(data.y)
  const widthPx = convertMmToPx(data.width)
  const heightPx = convertMmToPx(data.height)

  // Create appropriate object type based on content
  let fabricObject: fabric.Object

  if (data.type === 'text' && data.content.text) {
    fabricObject = new fabric.Textbox(data.content.text, {
      left: leftPx,
      top: topPx,
      width: widthPx,
      height: heightPx,
      fontFamily: data.content.fontFamily || 'Arial',
      fontSize: data.content.fontSize || 12,
      // IMPORTANT: Read fill from content first (new format), fallback to style (legacy)
      fill: data.content.fill || data.style.fill || '#000000',
      fontWeight: data.content.fontWeight || 'normal',
      fontStyle: data.content.fontStyle || 'normal',
      textAlign: data.content.textAlign || 'left',
      lineHeight: data.content.lineHeight || 1.16
    })
  } else {
    // Fallback to generic rectangle
    fabricObject = new fabric.Rect({
      left: leftPx,
      top: topPx,
      width: widthPx,
      height: heightPx,
      fill: data.style.fill || '#cccccc',
      stroke: data.style.stroke || null,
      strokeWidth: data.style.strokeWidth || 0
    })
  }

  // Apply common properties
  fabricObject.angle = data.rotation || 0
  fabricObject.opacity = data.style.opacity ?? 1

  // Store metadata in Fabric data attribute
  // Use 'elementId' as the key for consistency with event emits
  fabricObject.data = {
    elementId: data.id,
    id: data.id, // Keep for backward compatibility
    zIndex: data.zIndex ?? 0,
    metadata: data.metadata
  }

  return fabricObject
}

/**
 * Add text element to canvas
 *
 * Creates a Textbox object with specified options and adds to canvas.
 * Coordinates are in pixels (canvas space).
 *
 * @param canvas - Fabric canvas instance
 * @param text - Text content
 * @param options - Text styling options
 * @param position - Optional position { x, y } in px
 * @returns Created fabric.Textbox instance
 *
 * @example
 * ```typescript
 * const textbox = addTextToCanvas(canvas, 'Hello World', {
 *   fontFamily: 'Arial',
 *   fontSize: 16,
 *   fill: '#000000'
 * }, { x: 100, y: 100 })
 * ```
 */
export function addTextToCanvas(
  canvas: fabric.Canvas,
  text: string,
  options: TextOptions,
  position?: { x: number; y: number }
): fabric.Textbox {
  const textbox = new fabric.Textbox(text, {
    left: position?.x ?? 50,
    top: position?.y ?? 50,
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    fill: options.fill,
    fontWeight: options.fontWeight || 'normal',
    fontStyle: options.fontStyle || 'normal',
    textAlign: options.textAlign || 'left',
    width: 200 // Default width for new text
  })

  // Set unique ID for tracking
  const elementId = crypto.randomUUID()
  textbox.data = {
    elementId,
    id: elementId // Keep for backward compatibility
  }

  canvas.add(textbox)
  canvas.setActiveObject(textbox)
  canvas.renderAll()

  return textbox
}

/**
 * Serialize all canvas objects to array
 *
 * Returns all objects on canvas in serialized format, maintaining
 * z-index order for reconstruction.
 *
 * @param canvas - Fabric canvas instance
 * @returns Array of SerializedElement with mm-based coordinates
 *
 * @example
 * ```typescript
 * const elements = serializeCanvasElements(canvas)
 * // Returns array ready for API storage
 * ```
 */
export function serializeCanvasElements(canvas: fabric.Canvas): SerializedElement[] {
  return canvas
    .getObjects()
    .map((obj, index) => {
      const serialized = serializeElement(obj)
      serialized.zIndex = index // Maintain canvas order
      return serialized
    })
}

/**
 * Clear all objects from canvas
 *
 * Removes all objects while preserving canvas rendering surface.
 *
 * @param canvas - Fabric canvas instance
 *
 * @example
 * ```typescript
 * clearCanvas(canvas)
 * ```
 */
export function clearCanvas(canvas: fabric.Canvas): void {
  canvas.getObjects().forEach((obj) => canvas.remove(obj))
  canvas.renderAll()
}

/**
 * Load serialized elements onto canvas
 *
 * Deserializes elements and adds to canvas in order (respecting z-index).
 *
 * @param canvas - Fabric canvas instance
 * @param elements - Array of SerializedElement to load
 *
 * @example
 * ```typescript
 * loadCanvasElements(canvas, savedElements)
 * ```
 */
export function loadCanvasElements(
  canvas: fabric.Canvas,
  elements: SerializedElement[]
): void {
  clearCanvas(canvas)

  elements.forEach((element) => {
    const fabricObject = deserializeElement(element)
    canvas.add(fabricObject)
  })

  canvas.renderAll()
}

/**
 * Get canvas object by ID
 *
 * Searches canvas for object with matching ID in data attribute.
 *
 * @param canvas - Fabric canvas instance
 * @param id - Object ID to search for
 * @returns Fabric object or undefined if not found
 */
export function getObjectById(canvas: fabric.Canvas, id: string): fabric.Object | undefined {
  return canvas.getObjects().find((obj) => (obj.data?.id as string) === id)
}

/**
 * Update canvas object
 *
 * Updates object properties with new values and re-renders canvas.
 *
 * @param canvas - Fabric canvas instance
 * @param id - Object ID to update
 * @param updates - Partial SerializedElement with new values
 *
 * @example
 * ```typescript
 * updateCanvasObject(canvas, 'obj-123', { x: 20, y: 30 })
 * ```
 */
export function updateCanvasObject(
  canvas: fabric.Canvas,
  id: string,
  updates: Partial<SerializedElement>
): void {
  const obj = getObjectById(canvas, id)
  if (!obj) return

  // Apply updates
  if (updates.x !== undefined) obj.left = convertMmToPx(updates.x)
  if (updates.y !== undefined) obj.top = convertMmToPx(updates.y)
  if (updates.width !== undefined) obj.width = convertMmToPx(updates.width)
  if (updates.height !== undefined) obj.height = convertMmToPx(updates.height)
  if (updates.rotation !== undefined) obj.angle = updates.rotation

  obj.setCoords()
  canvas.renderAll()
}

/**
 * Remove object from canvas by ID
 *
 * @param canvas - Fabric canvas instance
 * @param id - Object ID to remove
 */
export function removeCanvasObject(canvas: fabric.Canvas, id: string): void {
  const obj = getObjectById(canvas, id)
  if (obj) {
    canvas.remove(obj)
    canvas.renderAll()
  }
}

/**
 * Get canvas dimensions in pixels
 *
 * Convenience function to get current canvas size.
 *
 * @param canvas - Fabric canvas instance
 * @returns Object with width and height in pixels
 */
export function getCanvasSizePx(canvas: fabric.Canvas): { width: number; height: number } {
  return {
    width: canvas.width ?? 0,
    height: canvas.height ?? 0
  }
}

/**
 * Export canvas as JSON for storage
 *
 * Serializes entire canvas state (including page dimensions) as JSON.
 *
 * @param canvas - Fabric canvas instance
 * @param pageFormat - Page format for metadata
 * @returns JSON-stringifiable object
 */
export function exportCanvasAsJSON(
  canvas: fabric.Canvas,
  pageFormat: 'A4' | 'A5' = 'A4'
): Record<string, any> {
  return {
    pageFormat,
    dimensions: {
      width: canvas.width,
      height: canvas.height
    },
    objects: serializeCanvasElements(canvas)
  }
}

/**
 * Serialize canvas for backend auto-save with complete element data
 *
 * Converts all canvas elements to backend-compatible format with:
 * - Complete content serialization for each element
 * - Z-index ordering maintained
 * - Ready for batch API save endpoint
 *
 * @param canvas - Fabric canvas instance
 * @param pageId - Page ID to associate elements with
 * @returns Object with pageId and elements array ready for API
 *
 * @example
 * ```typescript
 * const payload = serializeCanvasForBackend(canvas, pageId)
 * // { pageId: 'uuid', elements: [...] }
 * await pageService.saveElements(payload)
 * ```
 */
export function serializeCanvasForBackend(
  canvas: fabric.Canvas,
  pageId: string
): { pageId: string; elements: SerializedElement[] } {
  const elements = canvas
    .getObjects()
    .map((obj, index) => {
      // Serialize with all properties
      const serialized = serializeElement(obj)

      // Ensure proper z-index from canvas ordering
      serialized.zIndex = index

      // Ensure element has complete content data
      if (obj instanceof fabric.Textbox) {
        serialized.content = {
          text: obj.text || '',
          fontFamily: obj.fontFamily || 'Arial',
          fontSize: obj.fontSize || 12,
          fill: serialized.style.fill || '#000000',
          textAlign: obj.textAlign || 'left',
          fontWeight: obj.fontWeight || 'normal',
          fontStyle: obj.fontStyle || 'normal',
          underline: obj.underline || false,
          lineHeight: obj.lineHeight || 1.16
        }
      }

      // Ensure complete style data
      serialized.style = {
        opacity: obj.opacity ?? 1,
        fill: obj.fill || '#000000',
        stroke: obj.stroke || null,
        strokeWidth: obj.strokeWidth || 0,
        shadow: (obj as any).shadow || null,
        filter: (obj as any).filter || null
      }

      // Set timestamps
      const now = new Date().toISOString()
      return {
        ...serialized,
        pageId,
        createdAt: (obj.data?.createdAt as string) || now,
        updatedAt: now
      }
    })

  return { pageId, elements }
}

// ========================================
// Z-INDEX MANAGEMENT
// ========================================

/**
 * Bring object to front (above all other objects)
 *
 * Moves the specified object to the top of the z-index stack,
 * making it appear above all other objects on the canvas.
 *
 * @param canvas - Fabric canvas instance
 * @param obj - Fabric object to bring to front
 *
 * @example
 * ```typescript
 * bringToFront(canvas, selectedObject)
 * ```
 */
export function bringToFront(canvas: fabric.Canvas, obj: fabric.Object): void {
  canvas.bringToFront(obj)
  canvas.renderAll()
}

/**
 * Bring object forward (one layer up)
 *
 * Moves the specified object one layer up in the z-index stack.
 * If it's already at the top, nothing changes.
 *
 * @param canvas - Fabric canvas instance
 * @param obj - Fabric object to bring forward
 *
 * @example
 * ```typescript
 * bringForward(canvas, selectedObject)
 * ```
 */
export function bringForward(canvas: fabric.Canvas, obj: fabric.Object): void {
  canvas.bringForward(obj)
  canvas.renderAll()
}

/**
 * Send object backward (one layer down)
 *
 * Moves the specified object one layer down in the z-index stack.
 * If it's already at the bottom, nothing changes.
 *
 * @param canvas - Fabric canvas instance
 * @param obj - Fabric object to send backward
 *
 * @example
 * ```typescript
 * sendBackward(canvas, selectedObject)
 * ```
 */
export function sendBackward(canvas: fabric.Canvas, obj: fabric.Object): void {
  canvas.sendBackwards(obj)
  canvas.renderAll()
}

/**
 * Send object to back (below all other objects)
 *
 * Moves the specified object to the bottom of the z-index stack,
 * making it appear below all other objects on the canvas.
 *
 * @param canvas - Fabric canvas instance
 * @param obj - Fabric object to send to back
 *
 * @example
 * ```typescript
 * sendToBack(canvas, selectedObject)
 * ```
 */
export function sendToBack(canvas: fabric.Canvas, obj: fabric.Object): void {
  canvas.sendToBack(obj)
  canvas.renderAll()
}

// ========================================
// PERFORMANCE OPTIMIZATION UTILITIES
// ========================================

/**
 * Enable performance optimizations on canvas
 *
 * Configures canvas for optimal rendering performance:
 * - Enables object caching for faster rendering
 * - Disables retina scaling (reduces memory usage)
 * - Optimizes event handling with throttling
 *
 * Call this after canvas initialization for best performance.
 *
 * @param canvas - Fabric canvas instance
 *
 * @example
 * ```typescript
 * const canvas = initializeCanvas(canvasElement, options)
 * enablePerformanceOptimizations(canvas)
 * ```
 */
export function enablePerformanceOptimizations(canvas: fabric.Canvas): void {
  // Enable object caching for better rendering performance
  // Objects are cached as images when not being modified
  canvas.enableRetinaScaling = false // Disable retina for better performance
  canvas.preserveObjectStacking = true // Maintain z-order
  canvas.selection = true // Keep selection enabled
  canvas.skipTargetFind = false // Allow accurate object selection

  // Performance: Disable auto-render on add/remove (use requestRenderAll instead)
  canvas.renderOnAddRemove = false

  // Enable stateful canvas (better performance with selections)
  canvas.stateful = true

  console.log('[FabricService] Performance optimizations enabled')
}

/**
 * Throttle function for expensive operations
 *
 * Limits how often a function can be called. Useful for:
 * - Mouse move events
 * - Scroll handlers
 * - Resize handlers
 *
 * @param func - Function to throttle
 * @param wait - Minimum wait time between calls in milliseconds
 * @returns Throttled function
 *
 * @example
 * ```typescript
 * const throttledHandler = throttle((e) => {
 *   console.log('Mouse moved', e)
 * }, 16) // ~60fps
 *
 * canvas.on('mouse:move', throttledHandler)
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  let lastRan = 0

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()

    if (!lastRan || now - lastRan >= wait) {
      func.apply(this, args)
      lastRan = now
    } else {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        func.apply(this, args)
        lastRan = Date.now()
      }, wait - (now - lastRan))
    }
  }
}

/**
 * Batch render multiple canvas operations
 *
 * Disables rendering during operations, then triggers a single render.
 * This dramatically improves performance when adding/removing many elements.
 *
 * Use this when:
 * - Loading multiple elements from API
 * - Performing bulk delete operations
 * - Applying filters to multiple objects
 *
 * @param canvas - Fabric canvas instance
 * @param operations - Function containing all operations to batch
 *
 * @example
 * ```typescript
 * batchRender(canvas, () => {
 *   // Add 50 elements without triggering 50 renders
 *   elements.forEach(el => canvas.add(deserializeElement(el)))
 * })
 * // Single render happens here
 * ```
 */
export function batchRender(canvas: fabric.Canvas, operations: () => void): void {
  const originalRenderOnAddRemove = canvas.renderOnAddRemove

  // Disable auto-rendering
  canvas.renderOnAddRemove = false

  try {
    // Execute all operations
    operations()
  } finally {
    // Restore original setting and force single render
    canvas.renderOnAddRemove = originalRenderOnAddRemove
    canvas.requestRenderAll()
  }
}

/**
 * Enable object caching for all canvas objects
 *
 * Caches objects as images when not being modified, improving render speed.
 * Automatically disables caching when object is being edited.
 *
 * Call this after loading elements onto canvas.
 *
 * @param canvas - Fabric canvas instance
 *
 * @example
 * ```typescript
 * loadCanvasElements(canvas, elements)
 * enableObjectCaching(canvas)
 * ```
 */
export function enableObjectCaching(canvas: fabric.Canvas): void {
  canvas.getObjects().forEach((obj) => {
    obj.objectCaching = true
    obj.statefullCache = true
  })

  console.log('[FabricService] Object caching enabled for', canvas.getObjects().length, 'objects')
}

/**
 * Debounce function for operations that should only run after user stops
 *
 * Delays function execution until after a period of inactivity.
 * Useful for:
 * - Auto-save functionality
 * - Search input handlers
 * - Validation after user finishes typing
 *
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```typescript
 * const debouncedSave = debounce(async () => {
 *   await saveElements()
 * }, 1000)
 *
 * canvas.on('object:modified', debouncedSave)
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)

    timeout = setTimeout(() => {
      func.apply(this, args)
      timeout = null
    }, wait)
  }
}

/**
 * Optimize canvas for large element counts
 *
 * Applies aggressive performance optimizations when dealing with many elements:
 * - Disables certain interactive features
 * - Reduces rendering quality slightly
 * - Enables aggressive caching
 *
 * Use when element count > 50
 *
 * @param canvas - Fabric canvas instance
 *
 * @example
 * ```typescript
 * if (elements.length > 50) {
 *   optimizeForLargeCanvas(canvas)
 * }
 * ```
 */
export function optimizeForLargeCanvas(canvas: fabric.Canvas): void {
  // Disable features that impact performance with many objects
  canvas.enableRetinaScaling = false
  canvas.renderOnAddRemove = false
  canvas.skipTargetFind = false // Keep selection accurate
  canvas.perPixelTargetFind = false // Use bounding box for faster selection

  // Enable aggressive caching
  canvas.getObjects().forEach((obj) => {
    obj.objectCaching = true
    obj.statefullCache = true
  })

  console.log('[FabricService] Large canvas optimizations enabled')
}

/**
 * Dispose canvas and clean up resources
 *
 * Properly disposes of canvas to prevent memory leaks.
 * Always call this when unmounting editor component.
 *
 * @param canvas - Fabric canvas instance
 *
 * @example
 * ```typescript
 * onUnmounted(() => {
 *   if (canvas.value) {
 *     disposeCanvas(canvas.value)
 *   }
 * })
 * ```
 */
export function disposeCanvas(canvas: fabric.Canvas): void {
  // Remove all objects first
  canvas.getObjects().forEach((obj) => {
    canvas.remove(obj)
  })

  // Dispose of canvas
  canvas.dispose()

  console.log('[FabricService] Canvas disposed')
}
