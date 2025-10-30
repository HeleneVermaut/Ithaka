<script setup lang="ts">
/**
 * UndoRedoControls Component
 *
 * Provides undo and redo controls for the editor with keyboard shortcuts support.
 * This component is designed for PHASE 4 (US04) with architecture prepared for PHASE 6 integration.
 *
 * Current Implementation (PHASE 4):
 * - Visual buttons for undo/redo actions
 * - Keyboard shortcuts (Ctrl+Z / Cmd+Z for undo, Ctrl+Shift+Z / Cmd+Shift+Z for redo)
 * - Tooltips with shortcut hints
 * - Disabled state support based on action availability
 * - Event emission for parent component handling
 *
 * Future Integration (PHASE 6):
 * - Connect to useHistory composable for state management
 * - Integrate with historyStore (Pinia) for centralized history tracking
 * - Automatic canUndo/canRedo detection from store
 * - Undo/redo queue with action descriptions
 * - Display count of available undo/redo actions
 *
 * @component
 * @example
 * <UndoRedoControls
 *   :can-undo="hasUndoActions"
 *   :can-redo="hasRedoActions"
 *   :disabled="isLoading"
 *   @undo="handleUndo"
 *   @redo="handleRedo"
 * />
 */

import { onMounted, onUnmounted, computed } from 'vue'
import { NButtonGroup, NButton, NTooltip, NIcon } from 'naive-ui'
import { ArrowUndoOutline, ArrowRedoOutline } from '@vicons/ionicons5'

/**
 * Props interface for UndoRedoControls component
 */
interface Props {
  /**
   * Whether undo action is available
   * In PHASE 6, this will be computed from historyStore
   */
  canUndo?: boolean

  /**
   * Whether redo action is available
   * In PHASE 6, this will be computed from historyStore
   */
  canRedo?: boolean

  /**
   * Force disable all controls (e.g., during loading or save operations)
   */
  disabled?: boolean

  /**
   * Number of undo actions available (optional, for display)
   * TODO PHASE 6: Connect to historyStore.undoStack.length
   */
  undoCount?: number

  /**
   * Number of redo actions available (optional, for display)
   * TODO PHASE 6: Connect to historyStore.redoStack.length
   */
  redoCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  canUndo: false,
  canRedo: false,
  disabled: false,
  undoCount: 0,
  redoCount: 0
})

/**
 * Emits interface for UndoRedoControls component
 */
const emit = defineEmits<{
  /**
   * Emitted when user triggers undo action (button click or keyboard shortcut)
   * TODO PHASE 6: This will trigger historyStore.undo()
   */
  undo: []

  /**
   * Emitted when user triggers redo action (button click or keyboard shortcut)
   * TODO PHASE 6: This will trigger historyStore.redo()
   */
  redo: []
}>()

/**
 * Computed: Whether undo button should be disabled
 * Disabled when no undo actions available or component is disabled
 */
const isUndoDisabled = computed(() => {
  return props.disabled || !props.canUndo
})

/**
 * Computed: Whether redo button should be disabled
 * Disabled when no redo actions available or component is disabled
 */
const isRedoDisabled = computed(() => {
  return props.disabled || !props.canRedo
})

/**
 * Computed: Detect if running on macOS for correct keyboard shortcut display
 * Mac uses Cmd key, other platforms use Ctrl
 */
const isMac = computed(() => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
})

/**
 * Computed: Undo tooltip text with platform-specific keyboard shortcut
 */
const undoTooltip = computed(() => {
  const shortcut = isMac.value ? 'Cmd+Z' : 'Ctrl+Z'
  return `Annuler (${shortcut})`
})

/**
 * Computed: Redo tooltip text with platform-specific keyboard shortcuts
 * Supports both Ctrl+Shift+Z and Ctrl+Y (Windows convention)
 */
const redoTooltip = computed(() => {
  const shortcut = isMac.value ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z ou Ctrl+Y'
  return `Rétablir (${shortcut})`
})

/**
 * Handler for undo button click
 * Emits undo event to parent component
 */
function handleUndo(): void {
  if (!isUndoDisabled.value) {
    emit('undo')
  }
}

/**
 * Handler for redo button click
 * Emits redo event to parent component
 */
function handleRedo(): void {
  if (!isRedoDisabled.value) {
    emit('redo')
  }
}

/**
 * Keyboard event handler for undo/redo shortcuts
 * Handles multiple key combinations:
 * - Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
 * - Redo: Ctrl+Shift+Z, Cmd+Shift+Z (Mac), or Ctrl+Y (Windows)
 *
 * @param event - Keyboard event
 */
function handleKeyboardShortcut(event: KeyboardEvent): void {
  // Check for meta key (Cmd on Mac) or control key
  const isModifierPressed = isMac.value ? event.metaKey : event.ctrlKey

  if (!isModifierPressed) return

  // Undo: Ctrl+Z or Cmd+Z
  if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
    if (!isUndoDisabled.value) {
      event.preventDefault()
      handleUndo()
    }
    return
  }

  // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
  if (event.key.toLowerCase() === 'z' && event.shiftKey) {
    if (!isRedoDisabled.value) {
      event.preventDefault()
      handleRedo()
    }
    return
  }

  // Redo alternative: Ctrl+Y (common on Windows)
  if (event.key.toLowerCase() === 'y' && !event.shiftKey && !isMac.value) {
    if (!isRedoDisabled.value) {
      event.preventDefault()
      handleRedo()
    }
  }
}

/**
 * Lifecycle: Register keyboard event listeners on mount
 * Listens to keydown events for undo/redo shortcuts
 */
onMounted(() => {
  window.addEventListener('keydown', handleKeyboardShortcut)
})

/**
 * Lifecycle: Clean up keyboard event listeners on unmount
 * Prevents memory leaks and duplicate event handlers
 */
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardShortcut)
})

/**
 * TODO PHASE 6: Integration Points
 *
 * 1. Import useHistory composable:
 *    import { useHistory } from '@/composables/useHistory'
 *    const history = useHistory()
 *
 * 2. Replace props with store state:
 *    const canUndo = computed(() => history.canUndo.value)
 *    const canRedo = computed(() => history.canRedo.value)
 *    const undoCount = computed(() => history.undoStack.value.length)
 *    const redoCount = computed(() => history.redoStack.value.length)
 *
 * 3. Replace event emissions with direct store actions:
 *    function handleUndo() {
 *      history.undo()
 *    }
 *    function handleRedo() {
 *      history.redo()
 *    }
 *
 * 4. Add action description display:
 *    const nextUndoAction = computed(() => history.getNextUndoAction())
 *    const nextRedoAction = computed(() => history.getNextRedoAction())
 *    Update tooltips to show: "Annuler: [action description]"
 *
 * 5. Optional: Add action count badges to buttons
 *    Display undoCount and redoCount as visual indicators
 */
</script>

<template>
  <div class="undo-redo-controls">
    <!-- Undo/Redo button group -->
    <n-button-group class="controls-group">
      <!-- Undo button -->
      <n-tooltip placement="bottom" :delay="500">
        <template #trigger>
          <n-button
            class="control-button"
            :disabled="isUndoDisabled"
            size="small"
            @click="handleUndo"
            aria-label="Annuler"
          >
            <template #icon>
              <n-icon>
                <ArrowUndoOutline />
              </n-icon>
            </template>
          </n-button>
        </template>
        <span>{{ undoTooltip }}</span>
      </n-tooltip>

      <!-- Redo button -->
      <n-tooltip placement="bottom" :delay="500">
        <template #trigger>
          <n-button
            class="control-button"
            :disabled="isRedoDisabled"
            size="small"
            @click="handleRedo"
            aria-label="Rétablir"
          >
            <template #icon>
              <n-icon>
                <ArrowRedoOutline />
              </n-icon>
            </template>
          </n-button>
        </template>
        <span>{{ redoTooltip }}</span>
      </n-tooltip>
    </n-button-group>

    <!-- TODO PHASE 6: Optional action count display -->
    <!--
    <div v-if="undoCount > 0 || redoCount > 0" class="action-count">
      <span v-if="undoCount > 0" class="count-badge">{{ undoCount }}</span>
      <span v-if="redoCount > 0" class="count-badge">{{ redoCount }}</span>
    </div>
    -->
  </div>
</template>

<style scoped>
/**
 * Main container for undo/redo controls
 * Designed to be compact for toolbar integration
 */
.undo-redo-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/**
 * Button group styling
 * Groups undo and redo buttons together
 */
.controls-group {
  display: inline-flex;
}

/**
 * Individual control button styling
 * Ensures icons are properly sized and visible
 */
.control-button {
  min-width: 36px;
  height: 32px;
  padding: 0 8px;
  transition: all 0.2s ease;
}

/**
 * Button hover effect for enabled buttons
 * Provides visual feedback on interaction
 */
.control-button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/**
 * Button active effect
 * Resets transform on click
 */
.control-button:not(:disabled):active {
  transform: translateY(0);
}

/**
 * Disabled button styling
 * Shows non-allowed cursor to indicate unavailable action
 */
.control-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/**
 * Icon sizing within buttons
 * Ensures consistent icon appearance
 */
.control-button :deep(.n-icon) {
  font-size: 18px;
}

/**
 * TODO PHASE 6: Action count badges
 * Display number of available undo/redo actions
 */
/*
.action-count {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-left: 8px;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background-color: #1890ff;
  border-radius: 10px;
}
*/

/**
 * Responsive adjustments for smaller screens
 */
@media (max-width: 640px) {
  .control-button {
    min-width: 32px;
    height: 28px;
    padding: 0 6px;
  }

  .control-button :deep(.n-icon) {
    font-size: 16px;
  }
}
</style>
