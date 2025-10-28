<template>
  <div class="editor-canvas-container" :style="containerStyle">
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

  try {
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

    console.log(
      `Canvas initialized: ${props.pageFormat} ${props.orientation} (${dimensions.widthPx.toFixed(2)}x${dimensions.heightPx.toFixed(2)}px)`
    )
  } catch (error) {
    console.error('Failed to initialize canvas:', error)
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
      emit('elementSelected', selected.data.elementId)
      console.log(`Element selected: ${selected.data.elementId}`)
    }
  })

  // When selection is updated (switching from one object to another)
  fabricCanvas.on('selection:updated', (e: any) => {
    if (isUpdating) return

    const selected = e.selected?.[0]
    if (selected && selected.data?.elementId) {
      emit('elementSelected', selected.data.elementId)
      console.log(`Element selection updated: ${selected.data.elementId}`)
    }
  })

  // When selection is cleared (deselected)
  fabricCanvas.on('selection:cleared', () => {
    if (isUpdating) return

    emit('selectionCleared')
    console.log('Selection cleared')
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
      emit('elementModified', obj.data.elementId, changes)
      console.log(`Element modified: ${obj.data.elementId}`, changes)
    }
  })

  // When object is moving (real-time position tracking)
  fabricCanvas.on('object:moving', () => {
    // Optional: emit live position updates for snapping/guides
    // Currently disabled to avoid excessive events
  })

  // When object is added (for z-index tracking)
  fabricCanvas.on('object:added', () => {
    updateZIndexes()
  })

  // When object is removed
  fabricCanvas.on('object:removed', () => {
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

    if (Array.isArray(newElements) && newElements.length > 0) {
      isUpdating = true

      try {
        fabricService.loadCanvasElements(fabricCanvas, newElements)
        updateZIndexes()

        console.log(`Loaded ${newElements.length} elements onto canvas`)
      } catch (error) {
        console.error('Failed to load elements:', error)
      } finally {
        isUpdating = false
      }
    } else {
      // Clear canvas if elements is empty
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
  }, 0)
})

/**
 * Cleanup canvas when component unmounts
 */
onUnmounted(() => {
  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
  }

  isInitialized.value = false

  console.log('Canvas disposed and cleanup completed')
})
</script>

<style scoped>
/**
 * Editor Canvas Styles
 *
 * Container uses aspect-ratio to maintain page proportions
 * Canvas fills container using 100% width/height
 * Responsive design adapts to screen sizes
 */

.editor-canvas-container {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.editor-canvas-container:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Border animé quand élément sélectionné */
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
</style>
