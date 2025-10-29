<template>
  <div
    class="editor-canvas-container"
    :class="{ 'is-drag-over': isDraggingOver }"
    :style="containerStyle"
    @dragover.prevent="onCanvasDragOver"
    @dragleave="onCanvasDragLeave"
    @drop="onCanvasDrop"
  >
    <!-- Grid Toggle Button -->
    <div class="canvas-controls">
      <button
        :class="['grid-toggle', { 'grid-toggle--active': showGrid }]"
        @click="toggleGrid"
        :title="showGrid ? 'Hide Grid' : 'Show Grid'"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="18" height="18" stroke="currentColor" stroke-width="1.5"/>
          <line x1="7" y1="1" x2="7" y2="19" stroke="currentColor" stroke-width="1"/>
          <line x1="13" y1="1" x2="13" y2="19" stroke="currentColor" stroke-width="1"/>
          <line x1="1" y1="7" x2="19" y2="7" stroke="currentColor" stroke-width="1"/>
          <line x1="1" y1="13" x2="19" y2="13" stroke="currentColor" stroke-width="1"/>
        </svg>
      </button>
    </div>

    <canvas
      ref="canvasElement"
      class="editor-canvas"
      @mousedown="onCanvasMouseDown"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * EditorCanvas Component
 *
 * Displays interactive Fabric.js canvas for page editing.
 * Handles canvas lifecycle, event delegation, and element management.
 *
 * Props:
 * - pageFormat: 'A4' | 'A5' - Page size (A4 portrait by default)
 * - elements: SerializedElement[] - Initial elements to load
 * - orientation: 'portrait' | 'landscape' - Page orientation (optional)
 *
 * Events:
 * - canvasReady: Emitted when canvas is initialized
 * - elementSelected: Emitted when object is selected
 * - elementModified: Emitted when object is modified
 *
 * Usage:
 * ```vue
 * <EditorCanvas
 *   :pageFormat="'A4'"
 *   :elements="pageElements"
 *   @canvas-ready="onCanvasReady"
 *   @element-selected="onElementSelected"
 *   @element-modified="onElementModified"
 * />
 * ```
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { fabric } from 'fabric'
import { getCanvasDimensions } from '@/utils/unitConversion'
import * as fabricService from '@/services/fabricService'
import type { SerializedElement } from '@/services/fabricService'
import { debugLog, debugError, debugCanvasState, DebugCategory, DEBUG, DebugTimer } from '@/utils/debug'
import { ERROR_MESSAGES } from '@/constants/errorMessages'

// ========================================
// PROPS & EMITS
// ========================================

interface EditorCanvasProps {
  /** Page format: A4 or A5 */
  pageFormat: 'A4' | 'A5'
  /** Initial elements to load on canvas */
  elements: SerializedElement[]
  /** Page orientation (default: portrait) */
  orientation?: 'portrait' | 'landscape'
}

const props = withDefaults(defineProps<EditorCanvasProps>(), {
  orientation: 'portrait'
})

const emit = defineEmits<{
  canvasReady: [canvas: fabric.Canvas]
  elementSelected: [elementId: string]
  selectionCleared: []
  elementModified: [elementId: string, changes: any]
}>()

// ========================================
// REFS & STATE
// ========================================

/** Reference to DOM canvas element */
const canvasElement = ref<HTMLCanvasElement>()

/** Fabric.js canvas instance */
let fabricCanvas: fabric.Canvas | null = null

/** Track if canvas is initialized */
const isInitialized = ref<boolean>(false)

/** Flag to prevent duplicate events */
let isUpdating = false

/** Grid visibility state */
const showGrid = ref<boolean>(false)

/** Grid size in millimeters (10mm = 37.8px at 96 DPI) */
const GRID_SIZE_MM = 10

/** Store grid line objects for later removal */
let gridLines: fabric.Line[] = []

/** Track if user is dragging over canvas for visual feedback */
const isDraggingOver = ref<boolean>(false)

// ========================================
// COMPUTED PROPERTIES
// ========================================

/**
 * Calculate container aspect ratio based on page format and orientation
 * A4 portrait: 793.7px / 1122.5px = 0.7068 (70.68%)
 * A4 landscape: 1122.5px / 793.7px = 1.4142 (141.42%)
 */
const containerStyle = computed(() => {
  const dimensions = getCanvasDimensions(props.pageFormat, props.orientation)
  const aspectRatio = (dimensions.widthPx / dimensions.heightPx).toFixed(4)

  return {
    aspectRatio,
    width: '100%',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '4px'
  }
})

// ========================================
// CANVAS INITIALIZATION
// ========================================

/**
 * Initialize Fabric.js canvas with page dimensions
 * Called in onMounted hook
 */
function initializeCanvas(): void {
  if (!canvasElement.value || isInitialized.value) return

  const timer = new DebugTimer('initializeCanvas')

  try {
    if (DEBUG) debugLog(DebugCategory.CANVAS, 'Initializing canvas', { format: props.pageFormat, orientation: props.orientation })

    const dimensions = getCanvasDimensions(props.pageFormat, props.orientation)

    fabricCanvas = fabricService.initializeCanvas(canvasElement.value, {
      width: dimensions.widthPx,
      height: dimensions.heightPx,
      backgroundColor: 'white',
      renderOnAddRemove: false
    })

    // Setup event listeners on canvas
    setupCanvasListeners()

    // Mark as initialized
    isInitialized.value = true

    // Emit ready event with canvas instance
    emit('canvasReady', fabricCanvas)

    if (DEBUG) {
      debugLog(DebugCategory.CANVAS, 'Canvas initialized successfully', {
        format: props.pageFormat,
        orientation: props.orientation,
        width: dimensions.widthPx.toFixed(2),
        height: dimensions.heightPx.toFixed(2)
      })
    }

    timer.end(100) // Warn if > 100ms
  } catch (error) {
    debugError(DebugCategory.CANVAS, 'Failed to initialize canvas', error)
    window.$message?.error(ERROR_MESSAGES.CANVAS_INIT_FAILED)
  }
}

// ========================================
// EVENT LISTENERS
// ========================================

/**
 * Setup Fabric.js event listeners for object interactions
 *
 * Listens to selection, modification, and movement events on canvas objects.
 * Emits Vue events for parent components to handle state updates.
 */
function setupCanvasListeners(): void {
  if (!fabricCanvas) return

  // When an object is selected (single selection)
  fabricCanvas.on('selection:created', (e: any) => {
    if (isUpdating) return

    const selected = e.selected?.[0]
    if (selected && selected.data?.elementId) {
      if (DEBUG) debugLog(DebugCategory.CANVAS, 'Element selected', { elementId: selected.data.elementId, type: selected.type })
      emit('elementSelected', selected.data.elementId)
    }
  })

  // When selection is updated (switching from one object to another)
  fabricCanvas.on('selection:updated', (e: any) => {
    if (isUpdating) return

    const selected = e.selected?.[0]
    if (selected && selected.data?.elementId) {
      if (DEBUG) debugLog(DebugCategory.CANVAS, 'Selection updated', { elementId: selected.data.elementId, type: selected.type })
      emit('elementSelected', selected.data.elementId)
    }
  })

  // When selection is cleared (deselected)
  fabricCanvas.on('selection:cleared', () => {
    if (isUpdating) return

    if (DEBUG) debugLog(DebugCategory.CANVAS, 'Selection cleared')
    emit('selectionCleared')
  })

  // When object is modified (moved, resized, rotated, scaled)
  fabricCanvas.on('object:modified', (e: any) => {
    if (isUpdating) return

    const obj = e.target
    if (obj && obj.data?.elementId) {
      const changes = {
        left: obj.left,
        top: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        width: obj.width,
        height: obj.height
      }
      if (DEBUG) debugLog(DebugCategory.CANVAS, 'Element modified', { elementId: obj.data.elementId, changes })
      emit('elementModified', obj.data.elementId, changes)
    }
  })

  // When object is moving (real-time position tracking)
  fabricCanvas.on('object:moving', () => {
    // Optional: emit live position updates for snapping/guides
    // Currently disabled to avoid excessive events
  })

  // When object is added (for z-index tracking)
  fabricCanvas.on('object:added', (e: any) => {
    if (DEBUG && e.target) debugLog(DebugCategory.CANVAS, 'Object added', { type: e.target.type, id: e.target.data?.elementId })
    updateZIndexes()
  })

  // When object is removed
  fabricCanvas.on('object:removed', (e: any) => {
    if (DEBUG && e.target) debugLog(DebugCategory.CANVAS, 'Object removed', { type: e.target.type, id: e.target.data?.elementId })
    updateZIndexes()
  })
}

/**
 * Update z-index for all canvas objects based on their order
 */
function updateZIndexes(): void {
  if (!fabricCanvas) return

  fabricCanvas.getObjects().forEach((obj, index) => {
    if (!obj.data) {
      obj.data = {}
    }
    obj.data.zIndex = index
  })
}

/**
 * Handle canvas mouse down for interaction tracking
 */
function onCanvasMouseDown(): void {
  // Canvas interactions are handled by Fabric.js internally
  // This handler can be extended for custom interactions
}

/**
 * Handle dragover event on canvas to allow dropping
 * Sets visual feedback to show user can drop here
 */
function onCanvasDragOver(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }

  // Enable drag-over visual feedback
  if (!isDraggingOver.value) {
    isDraggingOver.value = true
    if (DEBUG) debugLog(DebugCategory.CANVAS, 'Drag entered canvas drop zone')
  }
}

/**
 * Handle dragleave event on canvas to remove visual feedback
 */
function onCanvasDragLeave(event: DragEvent): void {
  event.preventDefault()

  // Only clear if actually leaving canvas (not entering child element)
  const relatedTarget = event.relatedTarget as HTMLElement
  const currentTarget = event.currentTarget as HTMLElement

  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    isDraggingOver.value = false
    if (DEBUG) debugLog(DebugCategory.CANVAS, 'Drag left canvas drop zone')
  }
}

/**
 * Handle drop event on canvas to add text from library
 * Creates new Fabric.js Textbox at drop coordinates with formatting preserved
 */
async function onCanvasDrop(event: DragEvent): Promise<void> {
  event.preventDefault()
  isDraggingOver.value = false // Clear drag-over state

  if (!fabricCanvas) {
    debugError(DebugCategory.CANVAS, 'Cannot drop: canvas is null', new Error('Canvas is null'))
    return
  }

  // Try to get JSON data (for saved texts from library)
  const jsonData = event.dataTransfer?.getData('application/json')
  if (!jsonData) {
    if (DEBUG) debugLog(DebugCategory.CANVAS, 'No JSON data in drop event')
    return
  }

  try {
    const savedText = JSON.parse(jsonData)

    // Get drop coordinates relative to canvas
    const canvasRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const dropX = event.clientX - canvasRect.left
    const dropY = event.clientY - canvasRect.top

    if (DEBUG) {
      debugLog(DebugCategory.CANVAS, 'Text dropped on canvas', {
        label: savedText.label,
        coordinates: { x: dropX, y: dropY }
      })
    }

    // Create fabric text object from saved text
    const fabricText = new fabric.Textbox(savedText.content.text, {
      left: dropX,
      top: dropY,
      fontFamily: savedText.content.fontFamily,
      fontSize: savedText.content.fontSize,
      fill: savedText.content.fill || '#000000',
      textAlign: savedText.content.textAlign || 'left',
      fontWeight: savedText.content.fontWeight || 'normal',
      fontStyle: savedText.content.fontStyle || 'normal',
      underline: savedText.content.underline || false,
      lineHeight: savedText.content.lineHeight || 1.2,
      width: 300 // Default width for textbox
    })

    // Add metadata for element tracking and traceability
    const elementId = `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    fabricText.data = {
      elementId,
      id: elementId, // Keep for backward compatibility
      sourceLibraryId: savedText.id,
      sourceLabel: savedText.label,
      sourceType: savedText.type,
      createdAt: new Date().toISOString()
    }

    // Add to canvas
    fabricCanvas.add(fabricText)
    fabricCanvas.setActiveObject(fabricText)
    fabricCanvas.requestRenderAll()

    if (DEBUG) {
      debugLog(DebugCategory.CANVAS, 'Textbox added to canvas from library', {
        elementId,
        sourceLabel: savedText.label,
        position: { x: dropX, y: dropY }
      })
    }

    // Show success message
    window.$message?.success(`"${savedText.label}" ajouté au canvas`)

    // Emit element modified event for auto-save
    emit('elementModified', elementId, {
      left: dropX,
      top: dropY,
      width: 300,
      height: fabricText.height || 50
    })
  } catch (error) {
    debugError(DebugCategory.CANVAS, 'Failed to parse dropped text', error)
    window.$message?.error('Erreur lors de l\'ajout du texte')
  }
}

// ========================================
// ELEMENT LOADING
// ========================================

/**
 * Load elements onto canvas when prop changes
 * Watches props.elements for changes and updates canvas
 */
watch(
  () => props.elements,
  (newElements) => {
    if (!fabricCanvas || !isInitialized.value) return

    const timer = new DebugTimer('loadCanvasElements')

    if (Array.isArray(newElements) && newElements.length > 0) {
      isUpdating = true

      try {
        if (DEBUG) debugLog(DebugCategory.CANVAS, 'Loading elements', { count: newElements.length })

        fabricService.loadCanvasElements(fabricCanvas, newElements)
        updateZIndexes()

        if (DEBUG) debugLog(DebugCategory.CANVAS, 'Elements loaded successfully', { count: newElements.length })
        timer.end(200) // Warn if > 200ms
      } catch (error) {
        debugError(DebugCategory.CANVAS, 'Failed to load elements', error)
        window.$message?.error(ERROR_MESSAGES.LOAD_FAILED)
      } finally {
        isUpdating = false
      }
    } else {
      // Clear canvas if elements is empty
      if (DEBUG) debugLog(DebugCategory.CANVAS, 'Clearing canvas (no elements)')
      fabricService.clearCanvas(fabricCanvas)
    }
  },
  { deep: true }
)

/**
 * Re-initialize canvas when page format or orientation changes
 */
watch(
  [() => props.pageFormat, () => props.orientation],
  () => {
    if (fabricCanvas) {
      fabricCanvas.dispose()
      fabricCanvas = null
      isInitialized.value = false
    }
    initializeCanvas()
  }
)

// ========================================
// GRID VISUALIZATION
// ========================================

/**
 * Toggle grid visibility on/off
 * Grid uses 10mm spacing (37.8px at 96 DPI)
 */
function toggleGrid(): void {
  showGrid.value = !showGrid.value

  if (showGrid.value) {
    drawGrid()
  } else {
    clearGrid()
  }
}

/**
 * Draw grid lines on canvas
 * Grid spacing: 10mm = 37.8px at 96 DPI
 */
function drawGrid(): void {
  if (!fabricCanvas) return

  // Convert mm to px (96 DPI: 1mm = 3.7795px)
  const mmToPx = 96 / 25.4
  const gridSizePx = GRID_SIZE_MM * mmToPx // ~37.8px

  const canvasWidth = fabricCanvas.width || 794
  const canvasHeight = fabricCanvas.height || 1123

  // Clear existing grid lines
  clearGrid()

  // Create vertical lines
  for (let x = 0; x <= canvasWidth; x += gridSizePx) {
    const line = new fabric.Line([x, 0, x, canvasHeight], {
      stroke: '#e0e0e0',
      strokeWidth: 0.5,
      selectable: false,
      evented: false,
      excludeFromExport: true
    })
    gridLines.push(line)
    fabricCanvas.add(line)
  }

  // Create horizontal lines
  for (let y = 0; y <= canvasHeight; y += gridSizePx) {
    const line = new fabric.Line([0, y, canvasWidth, y], {
      stroke: '#e0e0e0',
      strokeWidth: 0.5,
      selectable: false,
      evented: false,
      excludeFromExport: true
    })
    gridLines.push(line)
    fabricCanvas.add(line)
  }

  // Send grid lines to back
  gridLines.forEach(line => fabricCanvas!.sendToBack(line))
  fabricCanvas.requestRenderAll()

  console.log(`Grid drawn: ${gridLines.length} lines (${GRID_SIZE_MM}mm spacing)`)
}

/**
 * Clear grid lines from canvas
 */
function clearGrid(): void {
  if (!fabricCanvas) return

  // Remove all grid line objects
  gridLines.forEach(line => fabricCanvas!.remove(line))
  gridLines = []

  fabricCanvas.requestRenderAll()
  console.log('Grid cleared')
}

// ========================================
// LIFECYCLE HOOKS
// ========================================

/**
 * Setup visual feedback for element selection
 * Adds/removes CSS class on container when elements are selected
 */
function setupSelectionFeedback(): void {
  if (!fabricCanvas) return

  fabricCanvas.on('selection:created', () => {
    document.querySelector('.editor-canvas-container')?.classList.add('element-selected')
  })

  fabricCanvas.on('selection:updated', () => {
    document.querySelector('.editor-canvas-container')?.classList.add('element-selected')
  })

  fabricCanvas.on('selection:cleared', () => {
    document.querySelector('.editor-canvas-container')?.classList.remove('element-selected')
  })
}

/**
 * Initialize canvas when component mounts
 */
onMounted(() => {
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    initializeCanvas()
    setupSelectionFeedback()

    // Add global debug command
    if (DEBUG && fabricCanvas) {
      (window as any).debugCanvas = () => {
        if (fabricCanvas) {
          debugCanvasState(fabricCanvas)
        } else {
          console.warn('Canvas not initialized')
        }
      }
      if (DEBUG) debugLog(DebugCategory.CANVAS, 'Global debug command available: window.debugCanvas()')
    }
  }, 0)
})

/**
 * Cleanup canvas when component unmounts
 */
onUnmounted(() => {
  if (DEBUG) debugLog(DebugCategory.CANVAS, 'Unmounting canvas component')

  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
  }

  isInitialized.value = false

  if (DEBUG) debugLog(DebugCategory.CANVAS, 'Canvas disposed and cleanup completed')
})
</script>

<style scoped>
/**
 * Editor Canvas Styles
 *
 * Container uses aspect-ratio to maintain page proportions
 * Canvas fills container using 100% width/height
 * Responsive design adapts to screen sizes
 * Includes grid controls and smooth animations
 */

.editor-canvas-container {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  position: relative;
}

.editor-canvas-container:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Visual feedback when dragging text over canvas */
.editor-canvas-container.is-drag-over {
  background-color: rgba(24, 160, 88, 0.05);
  border-color: #18a058 !important;
  box-shadow: 0 0 0 3px rgba(24, 160, 88, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15);
}

.editor-canvas-container.is-drag-over::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    rgba(24, 160, 88, 0.05),
    rgba(24, 160, 88, 0.05) 10px,
    transparent 10px,
    transparent 20px
  );
  pointer-events: none;
  z-index: 1;
  animation: drop-zone-pulse 2s ease-in-out infinite;
}

@keyframes drop-zone-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* Canvas Controls (Grid Toggle, etc.) */
.canvas-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.grid-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.grid-toggle:hover {
  background: #f5f5f5;
  border-color: #18a058;
  color: #18a058;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.grid-toggle:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.grid-toggle--active {
  background: #18a058;
  border-color: #18a058;
  color: white;
}

.grid-toggle--active:hover {
  background: #16954f;
  border-color: #16954f;
}

/* Border animation when element is selected */
.editor-canvas-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 3px solid transparent;
  transition: border-color 0.3s ease;
  pointer-events: none;
  border-radius: 4px;
}

.editor-canvas-container.element-selected::after {
  border-color: #18a058;
  box-shadow: 0 0 0 1px rgba(24, 160, 88, 0.2);
}

.editor-canvas {
  display: block;
  width: 100%;
  height: 100%;
  transition: box-shadow 0.3s ease;
}

.editor-canvas:hover {
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
}

/* Prevent image drag behavior on canvas */
.editor-canvas::-moz-user-select {
  -moz-user-select: none;
}

.editor-canvas::selection {
  background: transparent;
}

/* Smooth transitions for Fabric.js objects */
.editor-canvas :deep(.canvas-container) {
  transition: transform 0.2s ease;
}

/* Selection animations */
.editor-canvas :deep(.fabric-object) {
  transition: opacity 0.2s ease;
}

.editor-canvas :deep(.fabric-object:hover) {
  cursor: move;
}

/* Control handle animations */
.editor-canvas :deep(.control-point) {
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.editor-canvas :deep(.control-point:hover) {
  transform: scale(1.2);
  background-color: #18a058 !important;
}

/* Rotation handle animation */
.editor-canvas :deep(.rotating-point) {
  transition: transform 0.15s ease;
}

.editor-canvas :deep(.rotating-point:hover) {
  transform: scale(1.3);
}
</style>
