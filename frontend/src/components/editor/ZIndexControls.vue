<script setup lang="ts">
/**
 * ZIndexControls Component
 *
 * Provides controls for managing the z-index (layer order) of selected canvas elements.
 * Displays the current layer position and allows users to move elements forward, backward,
 * to the front, or to the back of the layer stack.
 *
 * Features:
 * - Four z-index manipulation actions (front, forward, backward, back)
 * - Visual indication of current layer position (e.g., "Calque 2 sur 5")
 * - Tooltips with keyboard shortcuts
 * - Disabled state when no element is selected
 *
 * @component
 */

import { computed } from 'vue'
import { NSpace, NButton, NText, NTooltip } from 'naive-ui'

/**
 * Props interface for ZIndexControls component
 */
interface Props {
  /** The currently selected element with zIndex property */
  selectedElement?: { id: string; zIndex?: number } | null
  /** Total number of elements on the canvas */
  totalElements: number
}

const props = defineProps<Props>()

/**
 * Emits interface for ZIndexControls component
 */
const emit = defineEmits<{
  /** Emitted when user clicks "Bring to Front" button */
  bringToFront: []
  /** Emitted when user clicks "Bring Forward" button */
  bringForward: []
  /** Emitted when user clicks "Send Backward" button */
  sendBackward: []
  /** Emitted when user clicks "Send to Back" button */
  sendToBack: []
}>()

/**
 * Computed property to determine if controls should be disabled
 * Controls are disabled when no element is selected or there are no elements
 */
const isDisabled = computed(() => {
  return !props.selectedElement || props.totalElements === 0
})

/**
 * Computed property to calculate the current layer position
 * Returns a human-readable string like "Calque 2 sur 5"
 * Z-index is 0-based, so we add 1 for display purposes
 */
const currentLayerPosition = computed(() => {
  if (!props.selectedElement || typeof props.selectedElement.zIndex !== 'number') {
    return 'Aucune sélection'
  }

  // Z-index is 0-based, display as 1-based for user friendliness
  const position = props.selectedElement.zIndex + 1
  return `Calque ${position} sur ${props.totalElements}`
})

/**
 * Handler for "Bring to Front" action
 * Moves the selected element to the topmost layer
 */
function handleBringToFront(): void {
  if (!isDisabled.value) {
    emit('bringToFront')
  }
}

/**
 * Handler for "Bring Forward" action
 * Moves the selected element one layer up
 */
function handleBringForward(): void {
  if (!isDisabled.value) {
    emit('bringForward')
  }
}

/**
 * Handler for "Send Backward" action
 * Moves the selected element one layer down
 */
function handleSendBackward(): void {
  if (!isDisabled.value) {
    emit('sendBackward')
  }
}

/**
 * Handler for "Send to Back" action
 * Moves the selected element to the bottommost layer
 */
function handleSendToBack(): void {
  if (!isDisabled.value) {
    emit('sendToBack')
  }
}
</script>

<template>
  <div class="z-index-controls">
    <!-- Layer position indicator -->
    <div class="layer-position">
      <n-text depth="3" style="font-size: 13px;">
        {{ currentLayerPosition }}
      </n-text>
    </div>

    <!-- Z-index control buttons -->
    <n-space vertical :size="12">
      <!-- Bring to Front button -->
      <n-tooltip placement="right">
        <template #trigger>
          <n-button
            block
            :disabled="isDisabled"
            @click="handleBringToFront"
          >
            <template #icon>
              <span style="font-size: 16px;">⬆️</span>
            </template>
            Premier plan
          </n-button>
        </template>
        <span>Ctrl + Shift + ]</span>
      </n-tooltip>

      <!-- Bring Forward button -->
      <n-tooltip placement="right">
        <template #trigger>
          <n-button
            block
            :disabled="isDisabled"
            @click="handleBringForward"
          >
            <template #icon>
              <span style="font-size: 16px;">⬆</span>
            </template>
            Avancer
          </n-button>
        </template>
        <span>Ctrl + ]</span>
      </n-tooltip>

      <!-- Send Backward button -->
      <n-tooltip placement="right">
        <template #trigger>
          <n-button
            block
            :disabled="isDisabled"
            @click="handleSendBackward"
          >
            <template #icon>
              <span style="font-size: 16px;">⬇</span>
            </template>
            Reculer
          </n-button>
        </template>
        <span>Ctrl + [</span>
      </n-tooltip>

      <!-- Send to Back button -->
      <n-tooltip placement="right">
        <template #trigger>
          <n-button
            block
            :disabled="isDisabled"
            @click="handleSendToBack"
          >
            <template #icon>
              <span style="font-size: 16px;">⬇️</span>
            </template>
            Arrière-plan
          </n-button>
        </template>
        <span>Ctrl + Shift + [</span>
      </n-tooltip>
    </n-space>
  </div>
</template>

<style scoped>
/**
 * Main container for z-index controls
 * Provides consistent spacing and layout
 */
.z-index-controls {
  padding: 16px;
  animation: fadeIn 0.3s ease;
}

/**
 * Layer position indicator styling
 * Centers the text and adds spacing below
 */
.layer-position {
  text-align: center;
  margin-bottom: 20px;
  padding: 12px;
  background-color: #f6f6f6;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

/**
 * Fade-in animation for smooth component appearance
 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/**
 * Button hover effect
 * Adds subtle visual feedback on hover
 */
.n-button {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.n-button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.n-button:not(:disabled):active {
  transform: translateY(0);
}
</style>
