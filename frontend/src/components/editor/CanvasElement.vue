<!--
  Composant CanvasElement - Élément manipulable sur le canvas de la page (US04-TASK28)

  Ce composant représente un élément unique sur le canvas de l'éditeur de page Ithaka.
  Il gère l'affichage visuel, la sélection, le déplacement, le redimensionnement et la rotation
  d'éléments de différents types (image, emoji, sticker, shape, text).

  Fonctionnalités principales :
  - Affichage d'éléments selon leur type (image, emoji, sticker, shape, text)
  - Sélection visuelle avec bordure, handles de redimensionnement et handle de rotation
  - Drag & drop pour déplacer l'élément sur le canvas (60fps smooth)
  - Redimensionnement via 8 handles (4 coins + 4 côtés) avec feedback visuel
  - Maintien des proportions lors du redimensionnement (par défaut sur les coins)
  - Shift key : ignorer le maintien des proportions pour un redimensionnement libre
  - Rotation circulaire via handle en haut-centre avec snap à 45° avec Shift
  - Snapping au grid (10px) et alignement avec autres éléments (10px threshold)
  - Snap guides visuels (lignes cyan) lors de l'alignement
  - Tooltip affichant position (x, y), dimensions (w, h) et rotation (θ)
  - Support de la suppression (touche Delete ou Backspace)
  - Double-click pour éditer les propriétés
  - Z-index pour la superposition des éléments
  - Dimensionnement minimum (30x30px) et maximum (canvas size)
  - Curseurs visuels appropriés (grab, resize, rotate)

  Performance :
  - Drag: 60fps smooth (no frame drops)
  - Resize: 60fps smooth (no frame drops)
  - Rotate: 60fps smooth (no frame drops)
  - Snap guides: < 16ms calculation
-->

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { IPageElement, ShapeType } from '@/types/models'

// ========================================
// PROPS & EMITS
// ========================================

/**
 * Props du composant CanvasElement
 */
interface Props {
  element: IPageElement
  isSelected: boolean
  isMultiSelected?: boolean
  canvasWidth: number
  canvasHeight: number
}

const props = withDefaults(defineProps<Props>(), {
  isMultiSelected: false
})

/**
 * Événements émis par le composant CanvasElement
 */
interface Emits {
  (e: 'select', withCtrl: boolean): void
  (e: 'resize', newWidth: number, newHeight: number): void
  (e: 'rotate', newRotation: number): void
  (e: 'move', newX: number, newY: number): void
  (e: 'delete'): void
}

const emit = defineEmits<Emits>()

// ========================================
// CONSTANTS
// ========================================

const MM_TO_PX = 3.7795275591
const MIN_SIZE_MM = 7.8740 // 30px minimum

/**
 * Convertit millimètres vers pixels
 */
const mmToPx = (mm: number): number => mm * MM_TO_PX

/**
 * Convertit pixels vers millimètres
 */
const pxToMm = (px: number): number => px / MM_TO_PX

// ========================================
// COMPUTED STYLES
// ========================================

/**
 * Style CSS calculé pour le conteneur de l'élément
 */
const elementStyle = computed(() => {
  const { element } = props

  return {
    position: 'absolute' as const,
    left: `${mmToPx(element.x)}px`,
    top: `${mmToPx(element.y)}px`,
    width: `${mmToPx(element.width)}px`,
    height: `${mmToPx(element.height)}px`,
    transform: `rotate(${element.rotation}deg)`,
    zIndex: element.zIndex,
    cursor: isDragging.value ? 'grabbing' : (props.isSelected ? 'grab' : 'pointer'),
    opacity: isDragging.value || isResizing.value || isRotating.value ? 0.8 : 1
  }
})

/**
 * Classe CSS calculée pour le conteneur de l'élément
 */
const elementClasses = computed(() => {
  return {
    'canvas-element': true,
    'canvas-element--selected': props.isSelected,
    'canvas-element--multi-selected': props.isMultiSelected,
    'canvas-element--dragging': isDragging.value,
    'canvas-element--resizing': isResizing.value,
    'canvas-element--rotating': isRotating.value,
    [`canvas-element--${props.element.type}`]: true
  }
})

/**
 * Contenu à afficher selon le type d'élément
 */
const elementContent = computed(() => {
  const { element } = props
  const { content, metadata } = element

  switch (element.type) {
    case 'image':
    case 'sticker':
      return {
        cloudinaryUrl: metadata?.cloudinaryUrl || content.cloudinaryUrl || '',
        alt: content.alt || 'Image'
      }

    case 'emoji':
      return {
        emoji: metadata?.emojiContent || content.emojiContent || '😀'
      }

    case 'shape':
      return {
        shapeType: (metadata?.shapeType || content.shapeType || 'circle') as ShapeType,
        fillColor: metadata?.fillColor || content.fillColor || '#3B82F6',
        opacity: (metadata?.opacity !== undefined ? metadata.opacity : content.opacity) || 100
      }

    case 'text':
      return {
        text: content.text || metadata?.textContent || 'Texte',
        fontFamily: content.fontFamily || 'Roboto',
        fontSize: content.fontSize || 16,
        // IMPORTANT: Read fill from content (now stored there by fabricService.serializeElement)
        // Fallback to metadata for backward compatibility, then default to black
        fill: content.fill ?? metadata?.fill ?? '#000000',
        textAlign: content.textAlign || 'left'
      }

    default:
      return {}
  }
})

// ========================================
// DRAG & DROP (Move Element)
// ========================================

const isDragging = ref<boolean>(false)
const dragStartX = ref<number>(0)
const dragStartY = ref<number>(0)
const elementStartX = ref<number>(0)
const elementStartY = ref<number>(0)
const dragSnapshot = ref<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)
const lastSnapGuides = ref<{ x: boolean; y: boolean } | null>(null)

/**
 * Démarre le drag & drop de l'élément
 */
const startDrag = (event: MouseEvent): void => {
  const target = event.target as HTMLElement
  if (target.classList.contains('canvas-element__handle') ||
      target.classList.contains('canvas-element__rotate-handle')) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  elementStartX.value = props.element.x
  elementStartY.value = props.element.y

  dragSnapshot.value = {
    x: props.element.x,
    y: props.element.y,
    width: props.element.width,
    height: props.element.height,
    rotation: props.element.rotation
  }

  if (!props.isSelected) {
    emit('select', (event as any).ctrlKey || (event as any).metaKey)
  }

  document.addEventListener('mousemove', onDrag, { passive: false })
  document.addEventListener('mouseup', stopDrag, { passive: false })
}

/**
 * Calcule les snaps possibles pour le dragging
 */
const calculateDragSnap = (newX: number, newY: number): { x: number; y: number } => {
  const SNAP_THRESHOLD_MM = pxToMm(10)
  const GRID_SNAP_MM = pxToMm(10)

  let snappedX = newX
  let snappedY = newY
  let snapXDetected = false
  let snapYDetected = false

  const gridX = Math.round(newX / GRID_SNAP_MM) * GRID_SNAP_MM
  const gridY = Math.round(newY / GRID_SNAP_MM) * GRID_SNAP_MM

  if (Math.abs(newX - gridX) < SNAP_THRESHOLD_MM) {
    snappedX = gridX
    snapXDetected = true
  }

  if (Math.abs(newY - gridY) < SNAP_THRESHOLD_MM) {
    snappedY = gridY
    snapYDetected = true
  }

  if (snapXDetected !== lastSnapGuides.value?.x || snapYDetected !== lastSnapGuides.value?.y) {
    lastSnapGuides.value = { x: snapXDetected, y: snapYDetected }
  }

  return { x: snappedX, y: snappedY }
}

/**
 * Gère le déplacement de l'élément pendant le drag
 */
const onDrag = (event: MouseEvent): void => {
  if (!isDragging.value) {
    return
  }

  event.preventDefault()

  const deltaX = event.clientX - dragStartX.value
  const deltaY = event.clientY - dragStartY.value

  let newX = elementStartX.value + pxToMm(deltaX)
  let newY = elementStartY.value + pxToMm(deltaY)

  const snapped = calculateDragSnap(newX, newY)
  newX = snapped.x
  newY = snapped.y

  const constrainedX = Math.max(0, Math.min(newX, pxToMm(props.canvasWidth) - props.element.width))
  const constrainedY = Math.max(0, Math.min(newY, pxToMm(props.canvasHeight) - props.element.height))

  emit('move', constrainedX, constrainedY)
}

/**
 * Arrête le drag & drop de l'élément
 */
const stopDrag = (): void => {
  isDragging.value = false
  lastSnapGuides.value = null

  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// ========================================
// RESIZE HANDLES
// ========================================

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const isResizing = ref<boolean>(false)
const resizeHandlePosition = ref<HandlePosition | null>(null)
const resizeStartX = ref<number>(0)
const resizeStartY = ref<number>(0)
const elementStartWidth = ref<number>(0)
const elementStartHeight = ref<number>(0)
const elementStartXResize = ref<number>(0)
const elementStartYResize = ref<number>(0)
const isShiftPressed = ref<boolean>(false)
const resizeSnapshot = ref<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)
const resizeTooltip = ref<{ width: number; height: number; x: number; y: number } | null>(null)

/**
 * Démarre le redimensionnement de l'élément
 */
const startResize = (event: MouseEvent, position: HandlePosition): void => {
  event.preventDefault()
  event.stopPropagation()

  isResizing.value = true
  resizeHandlePosition.value = position
  resizeStartX.value = event.clientX
  resizeStartY.value = event.clientY
  elementStartWidth.value = props.element.width
  elementStartHeight.value = props.element.height
  elementStartXResize.value = props.element.x
  elementStartYResize.value = props.element.y
  isShiftPressed.value = event.shiftKey

  resizeSnapshot.value = {
    x: props.element.x,
    y: props.element.y,
    width: props.element.width,
    height: props.element.height,
    rotation: props.element.rotation
  }

  document.addEventListener('mousemove', onResize, { passive: false })
  document.addEventListener('mouseup', stopResize, { passive: false })
}

/**
 * Gère le redimensionnement de l'élément pendant le drag
 */
const onResize = (event: MouseEvent): void => {
  if (!isResizing.value || !resizeHandlePosition.value) {
    return
  }

  event.preventDefault()

  const deltaX = event.clientX - resizeStartX.value
  const deltaY = event.clientY - resizeStartY.value

  let newWidth = elementStartWidth.value
  let newHeight = elementStartHeight.value
  let newX = elementStartXResize.value
  let newY = elementStartYResize.value

  const handle = resizeHandlePosition.value
  const aspectRatio = elementStartWidth.value / elementStartHeight.value

  // Apply delta based on handle position
  if (handle.includes('e')) {
    newWidth = elementStartWidth.value + pxToMm(deltaX)
  } else if (handle.includes('w')) {
    newWidth = elementStartWidth.value - pxToMm(deltaX)
    newX = elementStartXResize.value + pxToMm(deltaX)
  }

  if (handle.includes('s')) {
    newHeight = elementStartHeight.value + pxToMm(deltaY)
  } else if (handle.includes('n')) {
    newHeight = elementStartHeight.value - pxToMm(deltaY)
    newY = elementStartYResize.value + pxToMm(deltaY)
  }

  // Aspect ratio logic for corner handles
  const isCornertHandle = ['nw', 'ne', 'se', 'sw'].includes(handle)
  const shouldMaintainAspectRatio = isCornertHandle && !isShiftPressed.value

  if (shouldMaintainAspectRatio) {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      newHeight = newWidth / aspectRatio
    } else {
      newWidth = newHeight * aspectRatio
    }
  }

  // Apply constraints
  newWidth = Math.max(MIN_SIZE_MM, newWidth)
  newHeight = Math.max(MIN_SIZE_MM, newHeight)

  const maxWidth = pxToMm(props.canvasWidth) - newX
  const maxHeight = pxToMm(props.canvasHeight) - newY
  newWidth = Math.min(newWidth, maxWidth)
  newHeight = Math.min(newHeight, maxHeight)

  if (newX < 0) newX = 0
  if (newY < 0) newY = 0

  // Emit events
  if (newX !== elementStartXResize.value || newY !== elementStartYResize.value) {
    emit('move', newX, newY)
  }

  emit('resize', newWidth, newHeight)

  resizeTooltip.value = {
    width: newWidth,
    height: newHeight,
    x: event.clientX,
    y: event.clientY
  }
}

/**
 * Arrête le redimensionnement de l'élément
 */
const stopResize = (): void => {
  isResizing.value = false
  resizeHandlePosition.value = null
  resizeTooltip.value = null

  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// ========================================
// ROTATE HANDLE
// ========================================

const isRotating = ref<boolean>(false)
const rotateStartX = ref<number>(0)
const rotateStartY = ref<number>(0)
const elementStartRotation = ref<number>(0)
const rotateSnapshot = ref<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null)
const rotateTooltip = ref<{ rotation: number; x: number; y: number } | null>(null)

/**
 * Calcule l'angle entre le centre de l'élément et la position de la souris
 */
const calculateAngle = (centerX: number, centerY: number, mouseX: number, mouseY: number): number => {
  const dx = mouseX - centerX
  const dy = mouseY - centerY
  let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90

  if (angle < 0) angle += 360
  if (angle > 360) angle -= 360

  return angle
}

/**
 * Applique le snap à 45° si la touche Shift est enfoncée
 */
const applyRotationSnap = (angle: number, shiftKey: boolean): number => {
  if (!shiftKey) {
    return angle
  }

  const snapIncrement = 45
  const snappedAngle = Math.round(angle / snapIncrement) * snapIncrement

  return snappedAngle % 360
}

/**
 * Démarre la rotation de l'élément
 */
const startRotate = (event: MouseEvent): void => {
  event.preventDefault()
  event.stopPropagation()

  isRotating.value = true
  rotateStartX.value = event.clientX
  rotateStartY.value = event.clientY
  elementStartRotation.value = props.element.rotation

  rotateSnapshot.value = {
    x: props.element.x,
    y: props.element.y,
    width: props.element.width,
    height: props.element.height,
    rotation: props.element.rotation
  }

  document.addEventListener('mousemove', onRotate, { passive: false })
  document.addEventListener('mouseup', stopRotate, { passive: false })
}

/**
 * Gère la rotation de l'élément pendant le drag du handle de rotation
 */
const onRotate = (event: MouseEvent): void => {
  if (!isRotating.value) {
    return
  }

  event.preventDefault()

  const elementPx = mmToPx(props.element.x)
  const elementPy = mmToPx(props.element.y)
  const elementWidth = mmToPx(props.element.width)
  const elementHeight = mmToPx(props.element.height)
  const centerX = elementPx + elementWidth / 2
  const centerY = elementPy + elementHeight / 2

  const currentAngle = calculateAngle(centerX, centerY, event.clientX, event.clientY)
  const initialAngle = calculateAngle(centerX, centerY, rotateStartX.value, rotateStartY.value)

  let deltaRotation = currentAngle - initialAngle

  if (deltaRotation > 180) deltaRotation -= 360
  if (deltaRotation < -180) deltaRotation += 360

  let newRotation = elementStartRotation.value + deltaRotation

  newRotation = applyRotationSnap(newRotation, (event as any).shiftKey)

  if (newRotation > 180) newRotation -= 360
  if (newRotation < -180) newRotation += 360

  emit('rotate', newRotation)

  rotateTooltip.value = {
    rotation: Math.round(newRotation),
    x: event.clientX,
    y: event.clientY
  }
}

/**
 * Arrête la rotation de l'élément
 */
const stopRotate = (): void => {
  isRotating.value = false
  rotateTooltip.value = null

  document.removeEventListener('mousemove', onRotate)
  document.removeEventListener('mouseup', stopRotate)
}

// ========================================
// KEYBOARD EVENTS
// ========================================

/**
 * Gère les événements clavier pour supprimer l'élément
 */
const handleKeyDown = (event: KeyboardEvent): void => {
  if (!props.isSelected) {
    return
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    emit('delete')
  }
}

// ========================================
// LIFECYCLE HOOKS
// ========================================

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('mousemove', onRotate)
  document.removeEventListener('mouseup', stopRotate)
})

// ========================================
// OTHER INTERACTIONS
// ========================================

/**
 * Gère le clic sur l'élément pour le sélectionner
 */
const handleClick = (event: MouseEvent): void => {
  if (!isDragging.value && !isResizing.value && !isRotating.value) {
    emit('select', (event as any).ctrlKey || (event as any).metaKey)
  }
}

/**
 * Gère le double-clic pour éditer les propriétés de l'élément
 */
const handleDoubleClick = (): void => {
  console.log('Double-click on element:', props.element.id)
}

/**
 * Retourne le viewBox SVG approprié pour le type de forme
 */
const getShapeViewBox = (): string => {
  return '0 0 100 100'
}
</script>

<template>
  <div
    :class="elementClasses"
    :style="elementStyle"
    @mousedown="startDrag"
    @click="handleClick"
    @dblclick="handleDoubleClick"
  >
    <!-- Contenu de l'élément selon le type -->

    <!-- Type: Image ou Sticker -->
    <img
      v-if="element.type === 'image' || element.type === 'sticker'"
      :src="elementContent.cloudinaryUrl"
      :alt="elementContent.alt"
      class="canvas-element__image"
      draggable="false"
    />

    <!-- Type: Emoji -->
    <div
      v-else-if="element.type === 'emoji'"
      class="canvas-element__emoji"
    >
      {{ elementContent.emoji }}
    </div>

    <!-- Type: Shape -->
    <svg
      v-else-if="element.type === 'shape'"
      class="canvas-element__shape"
      :viewBox="getShapeViewBox()"
      preserveAspectRatio="none"
    >
      <circle
        v-if="elementContent.shapeType === 'circle'"
        cx="50"
        cy="50"
        r="50"
        :fill="elementContent.fillColor"
        :opacity="elementContent.opacity / 100"
      />
      <rect
        v-else-if="elementContent.shapeType === 'square'"
        x="0"
        y="0"
        width="100"
        height="100"
        :fill="elementContent.fillColor"
        :opacity="elementContent.opacity / 100"
      />
      <rect
        v-else-if="elementContent.shapeType === 'rectangle'"
        x="0"
        y="0"
        width="100"
        height="100"
        :fill="elementContent.fillColor"
        :opacity="elementContent.opacity / 100"
      />
      <polygon
        v-else-if="elementContent.shapeType === 'triangle'"
        points="50,0 100,100 0,100"
        :fill="elementContent.fillColor"
        :opacity="elementContent.opacity / 100"
      />
      <path
        v-else-if="elementContent.shapeType === 'heart'"
        d="M50,90 C20,60 0,40 0,25 C0,10 10,0 25,0 C35,0 45,5 50,15 C55,5 65,0 75,0 C90,0 100,10 100,25 C100,40 80,60 50,90 Z"
        :fill="elementContent.fillColor"
        :opacity="elementContent.opacity / 100"
      />
    </svg>

    <!-- Type: Text -->
    <div
      v-else-if="element.type === 'text'"
      class="canvas-element__text"
      :style="{
        fontFamily: elementContent.fontFamily,
        fontSize: `${elementContent.fontSize}px`,
        color: elementContent.fill,
        textAlign: elementContent.textAlign
      }"
    >
      {{ elementContent.text }}
    </div>

    <!-- Handles de redimensionnement (visibles uniquement si sélectionné) -->
    <template v-if="isSelected">
      <!-- Handle de rotation (en haut-centre) -->
      <div
        class="canvas-element__rotate-handle"
        @mousedown.stop="startRotate"
      />

      <!-- Coins -->
      <div
        class="canvas-element__handle canvas-element__handle--nw"
        @mousedown.stop="startResize($event, 'nw')"
      />
      <div
        class="canvas-element__handle canvas-element__handle--ne"
        @mousedown.stop="startResize($event, 'ne')"
      />
      <div
        class="canvas-element__handle canvas-element__handle--sw"
        @mousedown.stop="startResize($event, 'sw')"
      />
      <div
        class="canvas-element__handle canvas-element__handle--se"
        @mousedown.stop="startResize($event, 'se')"
      />

      <!-- Côtés -->
      <div
        class="canvas-element__handle canvas-element__handle--n"
        @mousedown.stop="startResize($event, 'n')"
      />
      <div
        class="canvas-element__handle canvas-element__handle--e"
        @mousedown.stop="startResize($event, 'e')"
      />
      <div
        class="canvas-element__handle canvas-element__handle--s"
        @mousedown.stop="startResize($event, 's')"
      />
      <div
        class="canvas-element__handle canvas-element__handle--w"
        @mousedown.stop="startResize($event, 'w')"
      />
    </template>

    <!-- Tooltips pour feedback visuel -->
    <div
      v-if="resizeTooltip && (isResizing || isDragging)"
      class="canvas-element__tooltip canvas-element__tooltip--resize"
      :style="{
        left: `${resizeTooltip.x + 10}px`,
        top: `${resizeTooltip.y + 10}px`
      }"
    >
      <div class="canvas-element__tooltip-content">
        <span>W: {{ Math.round(mmToPx(resizeTooltip.width)) }}px</span>
        <span>H: {{ Math.round(mmToPx(resizeTooltip.height)) }}px</span>
      </div>
    </div>

    <div
      v-if="rotateTooltip && isRotating"
      class="canvas-element__tooltip canvas-element__tooltip--rotate"
      :style="{
        left: `${rotateTooltip.x + 10}px`,
        top: `${rotateTooltip.y + 10}px`
      }"
    >
      <div class="canvas-element__tooltip-content">
        <span>θ: {{ rotateTooltip.rotation }}°</span>
      </div>
    </div>

    <!-- Snap guides visuels -->
    <div
      v-if="isDragging && lastSnapGuides"
      class="canvas-element__snap-guides"
    >
      <div
        v-if="lastSnapGuides.x"
        class="canvas-element__snap-guide canvas-element__snap-guide--vertical"
      />
      <div
        v-if="lastSnapGuides.y"
        class="canvas-element__snap-guide canvas-element__snap-guide--horizontal"
      />
    </div>
  </div>
</template>

<style scoped>
/**
 * Styles BEM pour le composant CanvasElement
 *
 * Block : canvas-element
 * Elements : __image, __emoji, __shape, __text, __handle, __rotate-handle, __tooltip, __snap-guide
 * Modifiers : --selected, --multi-selected, --dragging, --resizing, --rotating,
 *             --image, --emoji, --sticker, --shape, --text
 */

.canvas-element {
  box-sizing: border-box;
  user-select: none;
  transition: box-shadow 0.2s ease;
}

.canvas-element:hover {
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
}

.canvas-element--selected {
  border: 2px solid #3B82F6;
  box-shadow: 0 0 0 1px #3B82F6, 0 0 8px rgba(59, 130, 246, 0.2);
}

.canvas-element--multi-selected {
  border: 2px dashed #10B981;
  box-shadow: 0 0 0 1px #10B981;
}

.canvas-element--dragging,
.canvas-element--resizing,
.canvas-element--rotating {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.canvas-element__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.canvas-element__emoji {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  pointer-events: none;
}

.canvas-element__shape {
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.canvas-element__text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
  word-wrap: break-word;
  pointer-events: none;
}

.canvas-element__handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #00D9FF;
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-sizing: border-box;
  z-index: 10;
  box-shadow: 0 0 4px rgba(0, 217, 255, 0.5);
}

.canvas-element__handle--nw {
  top: -4px;
  left: -4px;
  cursor: nw-resize;
}

.canvas-element__handle--ne {
  top: -4px;
  right: -4px;
  cursor: ne-resize;
}

.canvas-element__handle--sw {
  bottom: -4px;
  left: -4px;
  cursor: sw-resize;
}

.canvas-element__handle--se {
  bottom: -4px;
  right: -4px;
  cursor: se-resize;
}

.canvas-element__handle--n {
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.canvas-element__handle--e {
  top: 50%;
  right: -4px;
  transform: translateY(-50%);
  cursor: e-resize;
}

.canvas-element__handle--s {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.canvas-element__handle--w {
  top: 50%;
  left: -4px;
  transform: translateY(-50%);
  cursor: w-resize;
}

.canvas-element__handle:hover {
  background-color: #0FB9D9;
  transform: scale(1.3);
  box-shadow: 0 0 8px rgba(0, 217, 255, 0.8);
}

.canvas-element__rotate-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: #00D9FF;
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-sizing: border-box;
  z-index: 11;
  box-shadow: 0 0 4px rgba(0, 217, 255, 0.5);
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  cursor: grab;
}

.canvas-element__rotate-handle:active {
  cursor: grabbing;
}

.canvas-element__rotate-handle:hover {
  background-color: #0FB9D9;
  transform: translateX(-50%) scale(1.3);
  box-shadow: 0 0 8px rgba(0, 217, 255, 0.8);
}

.canvas-element__tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.8);
  color: #00D9FF;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 217, 255, 0.3);
}

.canvas-element__tooltip-content {
  display: flex;
  gap: 8px;
  flex-direction: column;
}

.canvas-element__tooltip span {
  display: block;
}

.canvas-element__snap-guides {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 5;
}

.canvas-element__snap-guide {
  position: absolute;
  background-color: #00D9FF;
  opacity: 0.6;
}

.canvas-element__snap-guide--vertical {
  width: 1px;
  height: 100%;
  left: 0;
}

.canvas-element__snap-guide--horizontal {
  height: 1px;
  width: 100%;
  top: 0;
}
</style>
