<script setup lang="ts">
/**
 * EmojiPicker Component
 *
 * A comprehensive emoji picker dialog for selecting and adding emojis to a page.
 * Provides categorized emoji browsing and search functionality.
 *
 * Features:
 * - 6 emoji categories (Smileys, Nature, Food, Travel, Objects, Symbols)
 * - Search functionality with real-time filtering
 * - 8x6 grid layout for easy browsing
 * - Hover preview for better visibility
 * - Add and Cancel actions
 * - API integration with pageElementService
 *
 * Usage:
 * <EmojiPicker
 *   :show="showPicker"
 *   :page-id="currentPageId"
 *   :x="100"
 *   :y="200"
 *   @added="handleEmojiAdded"
 *   @cancel="handleCancel"
 * />
 */

import { ref, computed, watch } from 'vue'
import {
  NModal,
  NInput,
  NButton,
  NSpace,
  NTabs,
  NTabPane,
  NGrid,
  NGridItem,
  NSpin,
  NEmpty
} from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import pageElementService from '@/services/pageElementService'
import type { IPageElement } from '@/types/models'
import {
  categoryLabels,
  getEmojisByCategory,
  searchEmojis,
  getAllCategories,
  type EmojiCategory,
  type Emoji
} from '@/data/emojis'

// ========================================
// COMPONENT PROPS
// ========================================

interface Props {
  /** Controls modal visibility */
  show: boolean

  /** UUID of the page to add emoji to */
  pageId: string

  /** X position in millimeters (default: 50) */
  x?: number

  /** Y position in millimeters (default: 50) */
  y?: number
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  x: 50,
  y: 50
})

// ========================================
// COMPONENT EMITS
// ========================================

const emit = defineEmits<{
  /** Emitted when emoji is successfully added */
  'added': [element: IPageElement]

  /** Emitted when user cancels selection */
  'cancel': []

  /** Emitted to update show prop (v-model support) */
  'update:show': [value: boolean]
}>()

// ========================================
// COMPONENT STATE
// ========================================

/**
 * Currently selected category tab
 */
const selectedCategory = ref<EmojiCategory>('smileys')

/**
 * Search query for filtering emojis
 */
const searchQuery = ref<string>('')

/**
 * Currently hovered emoji for preview
 */
const hoveredEmoji = ref<string | null>(null)

/**
 * Selected emoji ready to be added
 */
const selectedEmoji = ref<Emoji | null>(null)

/**
 * Loading state during API call
 */
const isLoading = ref<boolean>(false)

/**
 * All available categories
 */
const categories = getAllCategories()

// ========================================
// COMPUTED PROPERTIES
// ========================================

/**
 * Filtered emojis based on search query or selected category
 *
 * If search query is active, returns search results.
 * Otherwise, returns emojis from selected category.
 */
const filteredEmojis = computed<Emoji[]>(() => {
  if (searchQuery.value.trim()) {
    return searchEmojis(searchQuery.value)
  }

  return getEmojisByCategory(selectedCategory.value)
})

/**
 * Check if a valid emoji is selected
 */
const hasSelectedEmoji = computed<boolean>(() => {
  return selectedEmoji.value !== null
})

/**
 * Check if search is active
 */
const isSearchActive = computed<boolean>(() => {
  return searchQuery.value.trim().length > 0
})

/**
 * Empty state message for filtered results
 */
const emptyMessage = computed<string>(() => {
  if (isSearchActive.value) {
    return `Aucun emoji trouvé pour "${searchQuery.value}"`
  }
  return 'Aucun emoji disponible dans cette catégorie'
})

// ========================================
// METHODS
// ========================================

/**
 * Handle emoji click - select emoji for adding
 *
 * @param emoji - The emoji object that was clicked
 */
const handleEmojiClick = (emoji: Emoji): void => {
  selectedEmoji.value = emoji
}

/**
 * Handle add button click - create page element via API
 *
 * Creates an emoji PageElement via pageElementService and emits added event.
 * Shows success/error notifications based on API response.
 */
const handleAddEmoji = async (): Promise<void> => {
  if (!selectedEmoji.value) {
    window.$message?.warning('Veuillez sélectionner un emoji')
    return
  }

  isLoading.value = true

  try {
    // Create page element with type 'emoji' and emojiContent
    const newElement = await pageElementService.createPageElement({
      pageId: props.pageId,
      type: 'emoji',
      x: props.x,
      y: props.y,
      width: 30, // Default emoji size in mm
      height: 30,
      rotation: 0,
      emojiContent: selectedEmoji.value.unicode
    })

    window.$message?.success(`Emoji ${selectedEmoji.value.unicode} ajouté avec succès`)

    // Emit added event with new element
    emit('added', newElement)

    // Close modal
    handleClose()
  } catch (error) {
    console.error('Error adding emoji:', error)
    const errorMsg = error instanceof Error ? error.message : 'Erreur lors de l\'ajout de l\'emoji'
    window.$message?.error(errorMsg)
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle cancel button click
 *
 * Emits cancel event and closes modal without adding emoji
 */
const handleCancel = (): void => {
  emit('cancel')
  handleClose()
}

/**
 * Handle modal close
 *
 * Resets component state and updates show prop
 */
const handleClose = (): void => {
  // Reset state
  selectedEmoji.value = null
  searchQuery.value = ''
  hoveredEmoji.value = null
  selectedCategory.value = 'smileys'

  // Update show prop
  emit('update:show', false)
}

/**
 * Handle search input clear
 *
 * Resets search query when clear button is clicked
 */
const handleClearSearch = (): void => {
  searchQuery.value = ''
}

/**
 * Handle category tab change
 *
 * @param value - The new category key
 */
const handleCategoryChange = (value: string): void => {
  selectedCategory.value = value as EmojiCategory
  // Clear search when changing categories
  if (isSearchActive.value) {
    searchQuery.value = ''
  }
}

// ========================================
// WATCHERS
// ========================================

/**
 * Watch show prop to reset state when modal opens
 */
watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      // Reset state when modal opens
      selectedEmoji.value = null
      searchQuery.value = ''
      hoveredEmoji.value = null
      selectedCategory.value = 'smileys'
    }
  }
)
</script>

<template>
  <n-modal
    :show="show"
    :mask-closable="false"
    preset="card"
    title="Sélectionner un emoji"
    class="emoji-picker-modal"
    style="width: 90%; max-width: 600px"
    @update:show="handleClose"
  >
    <div class="emoji-picker">
      <!-- Search Bar -->
      <div class="emoji-picker__search">
        <n-input
          v-model:value="searchQuery"
          placeholder="Rechercher un emoji..."
          clearable
          size="large"
          @clear="handleClearSearch"
          data-testid="emoji-search-input"
        >
          <template #prefix>
            <n-icon>
              <SearchOutline />
            </n-icon>
          </template>
        </n-input>
      </div>

      <!-- Category Tabs (hidden when searching) -->
      <div v-if="!isSearchActive" class="emoji-picker__tabs">
        <n-tabs
          v-model:value="selectedCategory"
          type="line"
          animated
          @update:value="handleCategoryChange"
          data-testid="emoji-category-tabs"
        >
          <n-tab-pane
            v-for="category in categories"
            :key="category"
            :name="category"
            :tab="categoryLabels[category]"
            :data-testid="`emoji-tab-${category}`"
          >
            <!-- Tab content rendered below -->
          </n-tab-pane>
        </n-tabs>
      </div>

      <!-- Search Results Info -->
      <div v-if="isSearchActive" class="emoji-picker__search-info">
        <p class="search-info__text">
          Résultats de recherche pour "{{ searchQuery }}"
          <span class="search-info__count">({{ filteredEmojis.length }} emojis)</span>
        </p>
      </div>

      <!-- Emoji Grid -->
      <div class="emoji-picker__grid-container">
        <n-spin :show="isLoading" description="Chargement...">
          <!-- Empty state -->
          <n-empty
            v-if="filteredEmojis.length === 0"
            :description="emptyMessage"
            class="emoji-picker__empty"
          />

          <!-- Emoji Grid -->
          <n-grid
            v-else
            :x-gap="8"
            :y-gap="8"
            :cols="8"
            class="emoji-picker__grid"
            data-testid="emoji-grid"
          >
            <n-grid-item
              v-for="emoji in filteredEmojis"
              :key="emoji.unicode"
            >
              <button
                type="button"
                class="emoji-picker__emoji-button"
                :class="{
                  'emoji-picker__emoji-button--selected': selectedEmoji?.unicode === emoji.unicode,
                  'emoji-picker__emoji-button--hovered': hoveredEmoji === emoji.unicode
                }"
                :title="emoji.name"
                :aria-label="emoji.name"
                :data-testid="`emoji-button-${emoji.unicode}`"
                @click="handleEmojiClick(emoji)"
                @mouseenter="hoveredEmoji = emoji.unicode"
                @mouseleave="hoveredEmoji = null"
              >
                <span class="emoji-picker__emoji">{{ emoji.unicode }}</span>
              </button>
            </n-grid-item>
          </n-grid>
        </n-spin>
      </div>

      <!-- Preview Section -->
      <div v-if="selectedEmoji" class="emoji-picker__preview">
        <div class="emoji-preview">
          <span class="emoji-preview__icon">{{ selectedEmoji.unicode }}</span>
          <div class="emoji-preview__info">
            <p class="emoji-preview__name">{{ selectedEmoji.name }}</p>
            <p class="emoji-preview__keywords">{{ selectedEmoji.keywords.join(', ') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <template #footer>
      <n-space justify="end" :size="12">
        <n-button
          @click="handleCancel"
          :disabled="isLoading"
          data-testid="emoji-cancel-button"
        >
          Annuler
        </n-button>
        <n-button
          type="primary"
          :disabled="!hasSelectedEmoji"
          :loading="isLoading"
          @click="handleAddEmoji"
          data-testid="emoji-add-button"
        >
          Ajouter
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped>
/**
 * Emoji Picker Styles
 *
 * BEM structure for maintainability and clarity
 */

.emoji-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
  min-height: 400px;
  max-height: 600px;
}

/* ========================================
   SEARCH BAR
   ======================================== */

.emoji-picker__search {
  width: 100%;
}

/* ========================================
   CATEGORY TABS
   ======================================== */

.emoji-picker__tabs {
  width: 100%;
}

/* ========================================
   SEARCH INFO
   ======================================== */

.emoji-picker__search-info {
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.search-info__text {
  margin: 0;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.search-info__count {
  color: #666;
  font-weight: normal;
  margin-left: 4px;
}

/* ========================================
   EMOJI GRID CONTAINER
   ======================================== */

.emoji-picker__grid-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px;
  min-height: 300px;
  max-height: 400px;
}

.emoji-picker__empty {
  padding: 40px 20px;
}

/* ========================================
   EMOJI GRID
   ======================================== */

.emoji-picker__grid {
  width: 100%;
}

/* ========================================
   EMOJI BUTTON
   ======================================== */

.emoji-picker__emoji-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  padding: 8px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: #f5f7fa;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 28px;
  outline: none;
}

.emoji-picker__emoji-button:hover {
  background: #e3e8ef;
  transform: scale(1.1);
}

.emoji-picker__emoji-button:active {
  transform: scale(1.05);
}

.emoji-picker__emoji-button--hovered {
  background: #e3e8ef;
  border-color: #d0d7de;
}

.emoji-picker__emoji-button--selected {
  background: #3b82f6;
  border-color: #2563eb;
  transform: scale(1.05);
}

.emoji-picker__emoji-button--selected:hover {
  background: #2563eb;
  border-color: #1d4ed8;
}

.emoji-picker__emoji {
  display: block;
  font-size: inherit;
  line-height: 1;
  user-select: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

/* ========================================
   PREVIEW SECTION
   ======================================== */

.emoji-picker__preview {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.emoji-preview {
  display: flex;
  align-items: center;
  gap: 16px;
}

.emoji-preview__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  font-size: 48px;
  background: white;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  flex-shrink: 0;
}

.emoji-preview__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.emoji-preview__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.emoji-preview__keywords {
  margin: 0;
  font-size: 12px;
  color: #666;
  font-style: italic;
  line-height: 1.4;
}

/* ========================================
   SCROLLBAR STYLING
   ======================================== */

.emoji-picker__grid-container::-webkit-scrollbar {
  width: 8px;
}

.emoji-picker__grid-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.emoji-picker__grid-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.emoji-picker__grid-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* ========================================
   RESPONSIVE ADJUSTMENTS
   ======================================== */

@media (max-width: 640px) {
  .emoji-picker {
    min-height: 300px;
    max-height: 500px;
  }

  .emoji-picker__grid-container {
    max-height: 350px;
  }

  .emoji-picker__emoji-button {
    font-size: 24px;
    padding: 6px;
  }

  .emoji-preview {
    gap: 12px;
  }

  .emoji-preview__icon {
    width: 50px;
    height: 50px;
    font-size: 40px;
  }

  .emoji-preview__name {
    font-size: 14px;
  }

  .emoji-preview__keywords {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .emoji-picker__grid {
    gap: 4px;
  }

  .emoji-picker__emoji-button {
    font-size: 20px;
    padding: 4px;
  }

  .emoji-preview__icon {
    width: 40px;
    height: 40px;
    font-size: 32px;
  }
}
</style>
