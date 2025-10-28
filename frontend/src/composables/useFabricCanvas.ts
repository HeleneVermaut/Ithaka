/**
 * Composable for Fabric.js Canvas Lifecycle Management
 *
 * Provides reusable composition logic for canvas initialization, element loading,
 * and event setup. Encapsulates Fabric.js lifecycle concerns and allows
 * easy reuse across components.
 *
 * Usage:
 * ```typescript
 * const { initCanvas, loadElements, setupCanvasListeners } = useFabricCanvas()
 *
 * onMounted(() => {
 *   const canvas = initCanvas(canvasElement.value, 'A4')
 *   if (canvas) {
 *     loadElements(canvas, elements.value)
 *     const cleanup = setupCanvasListeners(canvas, onSelected, onModified)
 *   }
 * })
 *
 * onUnmounted(() => {
 *   cleanup?.()
 * })
 * ```
 */

import { fabric } from 'fabric'
import { getCanvasDimensions } from '@/utils/unitConversion'
import * as fabricService from '@/services/fabricService'
import type { SerializedElement } from '@/services/fabricService'

/**
 * Callback type for object selection
 */
export type ObjectSelectedCallback = (obj: SerializedElement | null) => void

/**
 * Callback type for object modification
 */
export type ObjectModifiedCallback = (obj: SerializedElement) => void

/**
 * Cleanup function type
 */
export type CleanupFunction = () => void

/**
 * Initialize Fabric.js canvas on a DOM element
 *
 * Sets up canvas with specified page format and orientation.
 * Configures canvas properties for optimal interactive editing.
 *
 * @param canvasElement - HTML canvas element to initialize on
 * @param pageFormat - Page format ('A4' or 'A5')
 * @param orientation - Page orientation ('portrait' or 'landscape')
 * @returns Initialized fabric.Canvas or null if initialization fails
 *
 * @example
 * ```typescript
 * const canvas = initCanvas(canvasElement.value, 'A4', 'portrait')
 * if (canvas) {
 *   console.log('Canvas ready')
 * }
 * ```
 */
export function initCanvas(
  canvasElement: HTMLCanvasElement | undefined,
  pageFormat: 'A4' | 'A5' = 'A4',
  orientation: 'portrait' | 'landscape' = 'portrait'
): fabric.Canvas | null {
  // Validate canvas element
  if (!canvasElement) {
    console.error('Cannot initialize canvas: element is undefined')
    return null
  }

  try {
    // Get canvas dimensions for page format
    const dimensions = getCanvasDimensions(pageFormat, orientation)

    // Initialize Fabric canvas
    const canvas = fabricService.initializeCanvas(canvasElement, {
      width: dimensions.widthPx,
      height: dimensions.heightPx,
      backgroundColor: 'white',
      renderOnAddRemove: false
    })

    console.log(
      `Canvas initialized via useFabricCanvas: ${pageFormat} ${orientation} (${dimensions.widthPx.toFixed(2)}x${dimensions.heightPx.toFixed(2)}px)`
    )

    return canvas
  } catch (error) {
    console.error('Failed to initialize canvas in composable:', error)
    return null
  }
}

/**
 * Load serialized elements onto canvas
 *
 * Deserializes elements and adds them to canvas in order.
 * Handles empty element arrays by clearing canvas.
 *
 * @param canvas - Fabric canvas instance
 * @param elements - Array of SerializedElement to load
 *
 * @example
 * ```typescript
 * const elements = [
 *   { id: '1', type: 'text', x: 10, y: 10, ... },
 *   { id: '2', type: 'text', x: 50, y: 50, ... }
 * ]
 * loadElements(canvas, elements)
 * ```
 */
export function loadElements(
  canvas: fabric.Canvas | null,
  elements: SerializedElement[]
): void {
  if (!canvas) {
    console.warn('Cannot load elements: canvas is null')
    return
  }

  try {
    if (Array.isArray(elements) && elements.length > 0) {
      // Load elements onto canvas
      fabricService.loadCanvasElements(canvas, elements)
      console.log(`Loaded ${elements.length} elements onto canvas`)
    } else {
      // Clear canvas if elements is empty
      fabricService.clearCanvas(canvas)
      console.log('Canvas cleared (no elements to load)')
    }
  } catch (error) {
    console.error('Failed to load elements:', error)
  }
}

/**
 * Setup Fabric.js event listeners for object interactions
 *
 * Attaches listeners for object selection and modification events.
 * Returns cleanup function to remove listeners when no longer needed.
 *
 * @param canvas - Fabric canvas instance
 * @param onObjectSelected - Callback when object is selected
 * @param onObjectModified - Callback when object is modified
 * @returns Cleanup function to remove all listeners
 *
 * @example
 * ```typescript
 * const cleanup = setupCanvasListeners(
 *   canvas,
 *   (obj) => console.log('Selected:', obj?.id),
 *   (obj) => console.log('Modified:', obj.id)
 * )
 *
 * // Later...
 * cleanup() // Remove listeners
 * ```
 */
export function setupCanvasListeners(
  canvas: fabric.Canvas | null,
  onObjectSelected: ObjectSelectedCallback,
  onObjectModified: ObjectModifiedCallback
): CleanupFunction {
  if (!canvas) {
    console.warn('Cannot setup listeners: canvas is null')
    return () => {}
  }

  try {
    /**
     * Handle object selection
     */
    const handleObjectSelected = (): void => {
      const activeObject = canvas.getActiveObject()

      if (activeObject) {
        const serialized = fabricService.serializeElement(activeObject)
        onObjectSelected(serialized)
        console.log(`Object selected: ${serialized.id}`)
      }
    }

    /**
     * Handle selection cleared (deselection)
     */
    const handleSelectionCleared = (): void => {
      onObjectSelected(null)
      console.log('Object deselected')
    }

    /**
     * Handle object modified (moved, resized, rotated)
     */
    const handleObjectModified = (e: fabric.IEvent): void => {
      const modifiedObject = e.target

      if (modifiedObject) {
        const serialized = fabricService.serializeElement(modifiedObject)
        onObjectModified(serialized)
        console.log(`Object modified: ${serialized.id}`)
      }
    }

    // Register event listeners
    canvas.on('object:selected', handleObjectSelected)
    canvas.on('selection:cleared', handleSelectionCleared)
    canvas.on('object:modified', handleObjectModified)

    console.log('Canvas event listeners setup completed')

    /**
     * Cleanup function: remove all listeners
     */
    const cleanup: CleanupFunction = (): void => {
      canvas.off('object:selected', handleObjectSelected)
      canvas.off('selection:cleared', handleSelectionCleared)
      canvas.off('object:modified', handleObjectModified)

      console.log('Canvas event listeners removed')
    }

    return cleanup
  } catch (error) {
    console.error('Failed to setup canvas listeners:', error)
    return () => {}
  }
}

/**
 * Get all canvas objects as serialized elements
 *
 * Convenience function to serialize current canvas state.
 *
 * @param canvas - Fabric canvas instance
 * @returns Array of SerializedElement
 *
 * @example
 * ```typescript
 * const currentState = getCanvasState(canvas)
 * console.log(`Canvas has ${currentState.length} objects`)
 * ```
 */
export function getCanvasState(
  canvas: fabric.Canvas | null
): SerializedElement[] {
  if (!canvas) {
    console.warn('Cannot get canvas state: canvas is null')
    return []
  }

  return fabricService.serializeCanvasElements(canvas)
}

/**
 * Clear all objects from canvas
 *
 * Removes all objects while preserving canvas.
 *
 * @param canvas - Fabric canvas instance
 *
 * @example
 * ```typescript
 * clearCanvasObjects(canvas)
 * console.log('Canvas cleared')
 * ```
 */
export function clearCanvasObjects(canvas: fabric.Canvas | null): void {
  if (!canvas) {
    console.warn('Cannot clear canvas: canvas is null')
    return
  }

  fabricService.clearCanvas(canvas)
  console.log('All objects removed from canvas')
}

/**
 * Get canvas dimensions in pixels
 *
 * Convenience function to get current canvas size.
 *
 * @param canvas - Fabric canvas instance
 * @returns Object with width and height in pixels
 *
 * @example
 * ```typescript
 * const { width, height } = getCanvasSizeInPixels(canvas)
 * console.log(`Canvas: ${width}x${height}px`)
 * ```
 */
export function getCanvasSizeInPixels(
  canvas: fabric.Canvas | null
): { width: number; height: number } {
  if (!canvas) {
    return { width: 0, height: 0 }
  }

  return fabricService.getCanvasSizePx(canvas)
}

/**
 * Composite hook using all canvas functions
 *
 * Returns object with all composable functions.
 * Useful for destructuring in components.
 *
 * @returns Object with all canvas composition functions
 *
 * @example
 * ```typescript
 * const { initCanvas, loadElements, setupCanvasListeners } = useFabricCanvas()
 * ```
 */
export function useFabricCanvas() {
  return {
    initCanvas,
    loadElements,
    setupCanvasListeners,
    getCanvasState,
    clearCanvasObjects,
    getCanvasSizeInPixels
  }
}
