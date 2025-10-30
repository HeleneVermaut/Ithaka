<template>
  <div class="properties-panel">
    <div class="properties-panel__header">
      <h3 class="properties-panel__title">
        Propriétés
        <span v-if="selectedCount > 1" class="properties-panel__multi-select-badge">
          {{ selectedCount }} sélectionnés
        </span>
      </h3>
    </div>

    <!-- Empty State: No Element Selected -->
    <div v-if="!selectedElement" class="properties-panel__empty-state">
      <svg
        class="properties-panel__empty-icon"
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="2" fill="none" />
        <path d="M32 20V44M20 32H44" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <p class="properties-panel__empty-text">Sélectionnez un élément pour modifier ses propriétés</p>
    </div>

    <!-- Properties Editor: Element Selected -->
    <div v-else class="properties-panel__content">
      <!-- Element Type Badge -->
      <div class="properties-panel__section">
        <div class="element-type-badge" :class="`element-type-badge--${selectedElement.type}`">
          <span class="element-type-badge__icon">{{ getElementIcon(selectedElement.type) }}</span>
          <span class="element-type-badge__label">{{ getElementLabel(selectedElement.type) }}</span>
        </div>
      </div>

      <!-- Position Properties -->
      <div class="properties-panel__section">
        <h4 class="section-title">Position</h4>
        <n-space vertical :size="12">
          <div class="input-group">
            <label class="input-label" for="prop-x">X (mm)</label>
            <n-input-number
              id="prop-x"
              v-model:value="localProperties.x"
              :min="0"
              :max="210"
              :step="1"
              :precision="2"
              size="small"
              @update:value="debouncedUpdate"
            />
          </div>
          <div class="input-group">
            <label class="input-label" for="prop-y">Y (mm)</label>
            <n-input-number
              id="prop-y"
              v-model:value="localProperties.y"
              :min="0"
              :max="297"
              :step="1"
              :precision="2"
              size="small"
              @update:value="debouncedUpdate"
            />
          </div>
        </n-space>
      </div>

      <!-- Dimensions Properties -->
      <div class="properties-panel__section">
        <h4 class="section-title">Dimensions</h4>
        <n-space vertical :size="12">
          <div class="input-group">
            <label class="input-label" for="prop-width">Largeur (mm)</label>
            <n-input-number
              id="prop-width"
              v-model:value="localProperties.width"
              :min="20"
              :max="210"
              :step="1"
              :precision="2"
              size="small"
              @update:value="debouncedUpdate"
            />
          </div>
          <div class="input-group">
            <label class="input-label" for="prop-height">Hauteur (mm)</label>
            <n-input-number
              id="prop-height"
              v-model:value="localProperties.height"
              :min="20"
              :max="297"
              :step="1"
              :precision="2"
              size="small"
              @update:value="debouncedUpdate"
            />
          </div>
        </n-space>
      </div>

      <!-- Rotation & Z-Index Properties -->
      <div class="properties-panel__section">
        <h4 class="section-title">Transformation</h4>
        <n-space vertical :size="12">
          <div class="input-group">
            <label class="input-label" for="prop-rotation">Rotation (degrés)</label>
            <n-slider
              id="prop-rotation"
              v-model:value="localProperties.rotation"
              :min="0"
              :max="360"
              :step="1"
              :tooltip="true"
              @update:value="debouncedUpdate"
            />
            <n-input-number
              v-model:value="localProperties.rotation"
              :min="0"
              :max="360"
              :step="1"
              size="small"
              style="margin-top: 8px"
              @update:value="debouncedUpdate"
            />
          </div>
          <div class="input-group">
            <label class="input-label" for="prop-zindex">Ordre d'affichage (Z-Index)</label>
            <n-input-number
              id="prop-zindex"
              v-model:value="localProperties.zIndex"
              :min="0"
              :max="9999"
              :step="1"
              size="small"
              @update:value="debouncedUpdate"
            />
          </div>
        </n-space>
      </div>

      <!-- Image/Sticker Specific Properties -->
      <div
        v-if="selectedElement.type === 'image' || selectedElement.type === 'sticker'"
        class="properties-panel__section"
      >
        <h4 class="section-title">Image</h4>
        <n-space vertical :size="12">
          <div class="input-group">
            <label class="input-label">URL Cloudinary</label>
            <n-input
              :value="getCloudinaryUrl(selectedElement)"
              readonly
              size="small"
              placeholder="Non disponible"
            />
          </div>
          <n-button
            type="primary"
            size="small"
            block
            :disabled="!getCloudinaryUrl(selectedElement)"
            @click="handleTransform"
          >
            Transformer l'image
          </n-button>
        </n-space>
      </div>

      <!-- Shape Specific Properties -->
      <div v-if="selectedElement.type === 'shape'" class="properties-panel__section">
        <h4 class="section-title">Apparence</h4>
        <n-space vertical :size="12">
          <div class="input-group">
            <label class="input-label" for="prop-fill-color">Couleur de remplissage</label>
            <div class="color-picker-group">
              <n-color-picker
                id="prop-fill-color"
                v-model:value="localProperties.fillColor"
                :modes="['hex']"
                size="small"
                @update:value="debouncedUpdate"
              />
              <n-input
                v-model:value="localProperties.fillColor"
                size="small"
                placeholder="#000000"
                @update:value="debouncedUpdate"
              />
            </div>
          </div>
          <div class="input-group">
            <label class="input-label" for="prop-opacity">Opacité (%)</label>
            <n-slider
              id="prop-opacity"
              v-model:value="localProperties.opacity"
              :min="0"
              :max="100"
              :step="1"
              :tooltip="true"
              @update:value="debouncedUpdate"
            />
            <n-input-number
              v-model:value="localProperties.opacity"
              :min="0"
              :max="100"
              :step="1"
              size="small"
              style="margin-top: 8px"
              @update:value="debouncedUpdate"
            />
          </div>
        </n-space>
      </div>

      <!-- Emoji Specific Properties -->
      <div v-if="selectedElement.type === 'emoji'" class="properties-panel__section">
        <h4 class="section-title">Emoji</h4>
        <n-space vertical :size="12">
          <div class="input-group">
            <label class="input-label">Contenu Emoji</label>
            <div class="emoji-display">
              <span class="emoji-display__icon">{{ getEmojiContent(selectedElement) }}</span>
            </div>
          </div>
          <n-button type="primary" size="small" block @click="handlePickEmoji">
            Changer l'emoji
          </n-button>
        </n-space>
      </div>

      <!-- Text Specific Properties -->
      <div v-if="selectedElement.type === 'text'" class="properties-panel__section">
        <h4 class="section-title">Texte</h4>
        <n-space vertical :size="12">
          <div class="input-group">
            <label class="input-label" for="prop-text-content">Contenu</label>
            <n-input
              id="prop-text-content"
              v-model:value="localProperties.textContent"
              type="textarea"
              :rows="3"
              size="small"
              placeholder="Entrez votre texte"
              @update:value="debouncedUpdate"
            />
          </div>
          <div class="input-group">
            <label class="input-label" for="prop-font-size">Taille de police (px)</label>
            <n-input-number
              id="prop-font-size"
              v-model:value="localProperties.fontSize"
              :min="8"
              :max="200"
              :step="1"
              size="small"
              @update:value="debouncedUpdate"
            />
          </div>
          <div class="input-group">
            <label class="input-label" for="prop-font-family">Police</label>
            <n-select
              id="prop-font-family"
              v-model:value="localProperties.fontFamily"
              :options="fontFamilyOptions"
              size="small"
              @update:value="debouncedUpdate"
            />
          </div>
          <div class="input-group">
            <label class="input-label" for="prop-text-color">Couleur</label>
            <div class="color-picker-group">
              <n-color-picker
                id="prop-text-color"
                v-model:value="localProperties.color"
                :modes="['hex']"
                size="small"
                @update:value="debouncedUpdate"
              />
              <n-input
                v-model:value="localProperties.color"
                size="small"
                placeholder="#000000"
                @update:value="debouncedUpdate"
              />
            </div>
          </div>
        </n-space>
      </div>

      <n-divider />

      <!-- Action Buttons -->
      <div class="properties-panel__actions">
        <n-space vertical :size="8">
          <n-button type="info" size="small" block :loading="loading" @click="handleDuplicate">
            <template #icon>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1.5" />
                <rect
                  x="6"
                  y="6"
                  width="8"
                  height="8"
                  fill="white"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
            </template>
            Dupliquer
          </n-button>

          <n-button
            v-if="!selectedElement.deletedAt"
            type="error"
            size="small"
            block
            :loading="loading"
            @click="handleDelete"
          >
            <template #icon>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 4H13M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M6 7V12M10 7V12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </template>
            Supprimer
          </n-button>

          <n-button
            v-if="selectedElement.deletedAt"
            type="success"
            size="small"
            block
            :loading="loading"
            @click="handleRestore"
          >
            <template #icon>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 3V8L11 11M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </template>
            Restaurer
          </n-button>

          <n-button type="default" size="small" block :disabled="!hasChanges" @click="handleResetToDefault">
            Réinitialiser
          </n-button>
        </n-space>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * PropertiesPanel Component
 *
 * Displays and manages editable properties for the currently selected page element.
 * Provides real-time editing with debounced API updates to prevent spamming.
 *
 * Features:
 * - Common properties: position (x, y), dimensions (width, height), rotation, zIndex
 * - Type-specific properties:
 *   - Images/Stickers: cloudinaryUrl (read-only), transform button
 *   - Shapes: fillColor, opacity
 *   - Emojis: emojiContent (read-only), change emoji button
 *   - Text: textContent, fontSize, fontFamily, color
 * - Action buttons: Duplicate, Delete, Restore (if soft-deleted), Reset to Default
 * - Real-time validation with user feedback
 * - Automatic refresh when element changes in the store
 *
 * Props:
 * - element: IPageElement | null - Currently selected element
 *
 * Emits:
 * - update: (id: string, data: IPageElementUpdateRequest) - When properties are modified
 * - duplicate: () - When user clicks duplicate button
 * - delete: () - When user clicks delete button
 * - restore: () - When user clicks restore button
 * - transform: () - When user clicks transform image button
 * - pickEmoji: () - When user clicks change emoji button
 *
 * Usage:
 * ```vue
 * <PropertiesPanel
 *   :element="selectedElement"
 *   @update="handleUpdate"
 *   @duplicate="handleDuplicate"
 *   @delete="handleDelete"
 * />
 * ```
 */

import { ref, computed, watch, onMounted, inject } from 'vue'
import {
  NSpace,
  NInput,
  NInputNumber,
  NSlider,
  NButton,
  NColorPicker,
  NSelect,
  NDivider
} from 'naive-ui'
import type { MessageApi } from 'naive-ui'
import debounce from 'lodash.debounce'
import { usePageElementsStore } from '@/stores/pageElementsStore'
import type { IPageElement, IPageElementUpdateRequest, ElementType } from '@/types/models'

// ========================================
// PROPS & EMITS
// ========================================

interface PropertiesPanelProps {
  /** Currently selected element to display properties for */
  element?: IPageElement | null
  /** Number of currently selected elements (for multi-select display) */
  selectedCount?: number
}

const props = withDefaults(defineProps<PropertiesPanelProps>(), {
  element: null,
  selectedCount: 0
})

const emit = defineEmits<{
  update: [id: string, data: IPageElementUpdateRequest]
  duplicate: []
  delete: []
  restore: []
  transform: []
  pickEmoji: []
}>()

// ========================================
// COMPOSABLES & STORES
// ========================================

const pageElementsStore = usePageElementsStore()
// Use inject to get message API (safer for testing)
const message = inject<MessageApi>('message', {
  success: (msg: string) => console.log('[SUCCESS]', msg),
  error: (msg: string) => console.error('[ERROR]', msg),
  warning: (msg: string) => console.warn('[WARNING]', msg),
  info: (msg: string) => console.info('[INFO]', msg)
} as any)

// ========================================
// REACTIVE STATE
// ========================================

/**
 * Loading state for async operations (duplicate, delete, restore)
 */
const loading = ref<boolean>(false)

/**
 * Local copy of element properties for editing
 *
 * This allows immediate UI feedback while API calls are debounced.
 * We store only the editable properties to make updates cleaner.
 */
const localProperties = ref<{
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  fillColor?: string
  opacity?: number
  textContent?: string
  fontSize?: number
  fontFamily?: string
  color?: string
}>({
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  zIndex: 0
})

/**
 * Original properties snapshot for reset functionality
 *
 * Captures the initial state when element is selected so user can revert changes.
 */
const originalProperties = ref<typeof localProperties.value | null>(null)

/**
 * Font family options for text elements
 *
 * Provides a curated list of Google Fonts available in the application.
 */
const fontFamilyOptions = [
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Merriweather', value: 'Merriweather' },
  { label: 'Dancing Script', value: 'Dancing Script' },
  { label: 'Pacifico', value: 'Pacifico' }
]

// ========================================
// COMPUTED PROPERTIES
// ========================================

/**
 * Selected element from store or props
 *
 * Prioritizes store selection for consistency with the rest of the application.
 */
const selectedElement = computed((): IPageElement | null => {
  return props.element || pageElementsStore.getSelectedElement
})

/**
 * Checks if local properties have changed from original
 *
 * Used to enable/disable the "Reset to Default" button.
 */
const hasChanges = computed((): boolean => {
  if (!originalProperties.value) return false

  return JSON.stringify(localProperties.value) !== JSON.stringify(originalProperties.value)
})

// ========================================
// METHODS
// ========================================

/**
 * Initializes local properties from selected element
 *
 * Called when a new element is selected or when component mounts.
 * Extracts editable properties based on element type.
 *
 * @param element - Element to initialize properties from
 */
const initializeProperties = (element: IPageElement): void => {
  const baseProperties = {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    zIndex: element.zIndex
  }

  // Add type-specific properties
  if (element.type === 'shape') {
    localProperties.value = {
      ...baseProperties,
      fillColor: element.content?.fillColor || element.style?.fill || '#000000',
      opacity: element.content?.opacity ?? element.style?.opacity ?? 100
    }
  } else if (element.type === 'text') {
    localProperties.value = {
      ...baseProperties,
      textContent: element.content?.text || '',
      fontSize: element.content?.fontSize || 16,
      fontFamily: element.content?.fontFamily || 'Roboto',
      color: element.content?.fill || element.style?.fill || '#000000'
    }
  } else {
    localProperties.value = baseProperties
  }

  // Save snapshot for reset functionality
  originalProperties.value = { ...localProperties.value }
}

/**
 * Updates element via API with current local properties
 *
 * Validates properties before sending to backend.
 * Only sends properties that are defined and valid.
 */
const updateElement = async (): Promise<void> => {
  if (!selectedElement.value) return

  // Validate dimensions
  if (localProperties.value.width < 20 || localProperties.value.height < 20) {
    message.error('Les dimensions minimales sont 20mm x 20mm')
    return
  }

  // Validate position (within A4 bounds)
  if (localProperties.value.x < 0 || localProperties.value.x > 210) {
    message.error('La position X doit être entre 0 et 210mm')
    return
  }

  if (localProperties.value.y < 0 || localProperties.value.y > 297) {
    message.error('La position Y doit être entre 0 et 297mm')
    return
  }

  try {
    // Build update payload based on element type
    const updateData: IPageElementUpdateRequest = {
      x: localProperties.value.x,
      y: localProperties.value.y,
      width: localProperties.value.width,
      height: localProperties.value.height,
      rotation: localProperties.value.rotation,
      zIndex: localProperties.value.zIndex
    }

    // Add type-specific properties via style and content objects
    if (selectedElement.value.type === 'shape') {
      updateData.style = {
        ...selectedElement.value.style,
        fill: localProperties.value.fillColor,
        opacity: localProperties.value.opacity
      }
    } else if (selectedElement.value.type === 'text') {
      // For text elements, content is stored as a structured object
      // We need to pass it as a full update
      const textContentUpdate: Record<string, any> = {
        text: localProperties.value.textContent,
        fontSize: localProperties.value.fontSize,
        fontFamily: localProperties.value.fontFamily,
        fill: localProperties.value.color
      }
      // Cast to any to bypass strict typing for Record<string, any>
      ;(updateData as any).content = textContentUpdate
    }

    // Call API via store or emit event for parent to handle
    emit('update', selectedElement.value.id, updateData)
  } catch (error) {
    console.error('Failed to update element:', error)
    message.error('Erreur lors de la mise à jour des propriétés')
  }
}

/**
 * Debounced version of updateElement
 *
 * Prevents excessive API calls while user is actively editing.
 * Wait time: 500ms after last change.
 */
const debouncedUpdate = debounce(updateElement, 500)

/**
 * Gets human-readable label for element type
 *
 * @param type - Element type
 * @returns Display label
 */
const getElementLabel = (type: ElementType): string => {
  const labels: Record<ElementType, string> = {
    text: 'Texte',
    image: 'Image',
    shape: 'Forme',
    emoji: 'Emoji',
    sticker: 'Sticker',
    moodTracker: 'Mood Tracker'
  }
  return labels[type] || type
}

/**
 * Gets icon for element type
 *
 * @param type - Element type
 * @returns Icon character/emoji
 */
const getElementIcon = (type: ElementType): string => {
  const icons: Record<ElementType, string> = {
    text: 'T',
    image: '🖼️',
    shape: '▢',
    emoji: '😀',
    sticker: '⭐',
    moodTracker: '😊'
  }
  return icons[type] || '?'
}

/**
 * Gets Cloudinary URL from element content
 *
 * @param element - Page element
 * @returns Cloudinary URL or empty string
 */
const getCloudinaryUrl = (element: IPageElement): string => {
  // TypeScript needs explicit type assertion for dynamic content access
  const content = element.content as any
  return content?.cloudinaryUrl || (element as any).cloudinaryUrl || ''
}

/**
 * Gets emoji content from element
 *
 * @param element - Page element
 * @returns Emoji character or placeholder
 */
const getEmojiContent = (element: IPageElement): string => {
  // TypeScript needs explicit type assertion for dynamic content access
  const content = element.content as any
  return content?.emojiContent || (element as any).emojiContent || '❓'
}

/**
 * Handles duplicate button click
 *
 * Emits duplicate event for parent component to handle via store.
 */
const handleDuplicate = async (): Promise<void> => {
  if (!selectedElement.value) return

  loading.value = true
  try {
    emit('duplicate')
    message.success('Élément dupliqué avec succès')
  } catch (error) {
    console.error('Failed to duplicate element:', error)
    message.error('Erreur lors de la duplication')
  } finally {
    loading.value = false
  }
}

/**
 * Handles delete button click
 *
 * Emits delete event for parent component to handle via store.
 */
const handleDelete = async (): Promise<void> => {
  if (!selectedElement.value) return

  loading.value = true
  try {
    emit('delete')
    message.success('Élément supprimé avec succès')
  } catch (error) {
    console.error('Failed to delete element:', error)
    message.error('Erreur lors de la suppression')
  } finally {
    loading.value = false
  }
}

/**
 * Handles restore button click
 *
 * Emits restore event for parent component to handle via store.
 */
const handleRestore = async (): Promise<void> => {
  if (!selectedElement.value) return

  loading.value = true
  try {
    emit('restore')
    message.success('Élément restauré avec succès')
  } catch (error) {
    console.error('Failed to restore element:', error)
    message.error('Erreur lors de la restauration')
  } finally {
    loading.value = false
  }
}

/**
 * Handles transform image button click
 *
 * Emits transform event for parent component to open transform modal.
 */
const handleTransform = (): void => {
  emit('transform')
}

/**
 * Handles pick emoji button click
 *
 * Emits pickEmoji event for parent component to open emoji picker.
 */
const handlePickEmoji = (): void => {
  emit('pickEmoji')
}

/**
 * Resets properties to original values
 *
 * Reverts all local changes to the state when element was first selected.
 */
const handleResetToDefault = (): void => {
  if (originalProperties.value) {
    localProperties.value = { ...originalProperties.value }
    message.info('Propriétés réinitialisées')
  }
}

// ========================================
// LIFECYCLE HOOKS & WATCHERS
// ========================================

/**
 * Watch for element selection changes
 *
 * Re-initializes local properties when a new element is selected.
 */
watch(
  selectedElement,
  (newElement) => {
    if (newElement) {
      initializeProperties(newElement)
    }
  },
  { immediate: true }
)

/**
 * Watch for store updates to selected element
 *
 * Refreshes local properties if the selected element is updated externally
 * (e.g., by another component or real-time sync).
 */
watch(
  () => pageElementsStore.elements,
  () => {
    if (selectedElement.value) {
      const updatedElement = pageElementsStore.getElementById(selectedElement.value.id)
      if (updatedElement) {
        initializeProperties(updatedElement)
      }
    }
  },
  { deep: true }
)

/**
 * Initialize on mount
 */
onMounted(() => {
  if (selectedElement.value) {
    initializeProperties(selectedElement.value)
  }
})
</script>

<style scoped>
/**
 * PropertiesPanel Styles
 *
 * BEM methodology:
 * - Block: properties-panel
 * - Elements: __header, __title, __content, __section, etc.
 * - Modifiers: --active, --error, --disabled, etc.
 */

.properties-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  border-left: 1px solid #e0e0e0;
  overflow: hidden;
}

/* Header */
.properties-panel__header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f9fafb;
}

.properties-panel__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 12px;
}

.properties-panel__multi-select-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #FFD700;
  color: #1f2937;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 12px;
  white-space: nowrap;
  margin-left: auto;
}

/* Empty State */
.properties-panel__empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.properties-panel__empty-icon {
  margin-bottom: 16px;
  color: #9ca3af;
}

.properties-panel__empty-text {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

/* Content */
.properties-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Section */
.properties-panel__section {
  margin-bottom: 24px;
}

.properties-panel__section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Element Type Badge */
.element-type-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.element-type-badge--text {
  background-color: #dbeafe;
  border-color: #93c5fd;
}

.element-type-badge--image,
.element-type-badge--sticker {
  background-color: #fce7f3;
  border-color: #f9a8d4;
}

.element-type-badge--shape {
  background-color: #d1fae5;
  border-color: #6ee7b7;
}

.element-type-badge--emoji {
  background-color: #fef3c7;
  border-color: #fcd34d;
}

.element-type-badge__icon {
  font-size: 20px;
  line-height: 1;
}

.element-type-badge__label {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

/* Input Groups */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 13px;
  font-weight: 500;
  color: #4b5563;
}

/* Color Picker Group */
.color-picker-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Emoji Display */
.emoji-display {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 8px;
  background-color: #f9fafb;
  border: 2px dashed #d1d5db;
}

.emoji-display__icon {
  font-size: 48px;
  line-height: 1;
}

/* Actions */
.properties-panel__actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

/* Scrollbar Styling */
.properties-panel__content::-webkit-scrollbar {
  width: 8px;
}

.properties-panel__content::-webkit-scrollbar-track {
  background-color: #f3f4f6;
}

.properties-panel__content::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 4px;
}

.properties-panel__content::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}

/* Responsive Design */
@media (max-width: 768px) {
  .properties-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 320px;
    z-index: 1000;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .properties-panel__header {
    padding: 12px 16px;
  }

  .properties-panel__content {
    padding: 12px;
  }

  .properties-panel__section {
    margin-bottom: 20px;
  }
}
</style>
