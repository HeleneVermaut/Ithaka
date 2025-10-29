<script setup lang="ts">
/**
 * TextLibrary Component
 *
 * Displays a grid of saved text snippets that users can search, filter, use, or delete.
 * This component is part of the Text Library feature (US03).
 *
 * Features:
 * - Responsive grid layout (2-3 columns)
 * - Search/filter by label or content
 * - Delete confirmation dialog
 * - Click to select, double-click or "Use" button to add to canvas
 * - Preview text with font info
 */

import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { ISavedText } from '@/types/models'
import { NCard, NInput, NButton, NEmpty, NIcon, NGrid, NGridItem, NSpace, NPopconfirm } from 'naive-ui'
import { TrashBinOutline, CopyOutline } from '@vicons/ionicons5'

// ========================================
// COMPONENT STATE
// ========================================

const authStore = useAuthStore()
const searchQuery = ref<string>('')
const showDeleteDialog = ref<boolean>(false)
const textToDelete = ref<ISavedText | null>(null)
const selectedTextId = ref<string | null>(null)
const isLoading = ref<boolean>(false)

// ========================================
// COMPUTED PROPERTIES
// ========================================

/**
 * Filter saved texts based on search query
 * Searches in label and content text fields
 */
const filteredTexts = computed<ISavedText[]>(() => {
  if (!searchQuery.value.trim()) {
    return authStore.savedTexts
  }

  const query = searchQuery.value.toLowerCase().trim()
  return authStore.savedTexts.filter((text: ISavedText) => {
    const labelMatch = text.label.toLowerCase().includes(query)
    const contentMatch = text.content.text.toLowerCase().includes(query)
    return labelMatch || contentMatch
  })
})

/**
 * Get truncated preview of text content (max 100 chars)
 */
const getTextPreview = (text: ISavedText): string => {
  const preview = text.content.text
  return preview.length > 100 ? preview.substring(0, 100) + '...' : preview
}

/**
 * Format type for display (citation, poeme, libre)
 */
const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    citation: 'Citation',
    poeme: 'Poème',
    libre: 'Libre'
  }
  return labels[type] || type
}

// ========================================
// METHODS
// ========================================

/**
 * Handle delete button click - show confirmation
 */
const handleDeleteClick = (text: ISavedText): void => {
  textToDelete.value = text
  showDeleteDialog.value = true
}

/**
 * Confirm and execute deletion of text
 */
const confirmDelete = async (): Promise<void> => {
  if (!textToDelete.value) return

  isLoading.value = true
  try {
    await authStore.deleteSavedText(textToDelete.value.id)
    window.$message?.success('Texte supprimé avec succès')
    showDeleteDialog.value = false
    textToDelete.value = null
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur lors de la suppression'
    window.$message?.error(errorMsg)
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle card click to select text
 */
const handleCardClick = (text: ISavedText): void => {
  selectedTextId.value = text.id
}

/**
 * Handle double-click to use text
 */
const handleDoubleClick = (text: ISavedText): void => {
  emitUseText(text)
}

/**
 * Handle "Use" button click
 */
const handleUseClick = (text: ISavedText): void => {
  emitUseText(text)
}

/**
 * Handle drag start for text cards
 * Stores text data in dataTransfer for dropping on canvas
 */
const handleDragStart = (text: ISavedText, event: DragEvent): void => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/json', JSON.stringify(text))
    // Set a custom drag image for better UX
    const dragImage = document.createElement('div')
    dragImage.textContent = text.label
    dragImage.style.padding = '8px 12px'
    dragImage.style.background = '#1976d2'
    dragImage.style.color = 'white'
    dragImage.style.borderRadius = '4px'
    dragImage.style.fontSize = '12px'
    dragImage.style.position = 'absolute'
    dragImage.style.left = '-1000px'
    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, 0, 0)
    setTimeout(() => dragImage.remove(), 0)
  }
}

/**
 * Emit 'use-text' event with text data
 */
const emitUseText = (text: ISavedText): void => {
  emit('use-text', text)
  window.$message?.success('Texte ajouté au canvas')
}

/**
 * Load saved texts on component mount
 */
const loadSavedTexts = async (): Promise<void> => {
  isLoading.value = true
  try {
    await authStore.fetchSavedTexts()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur lors du chargement'
    window.$message?.error(errorMsg)
  } finally {
    isLoading.value = false
  }
}

// ========================================
// EMITS
// ========================================

const emit = defineEmits<{
  'use-text': [text: ISavedText]
}>()

// ========================================
// LIFECYCLE
// ========================================

onMounted(() => {
  loadSavedTexts()
})
</script>

<template>
  <div class="text-library">
    <!-- Header with search -->
    <div class="text-library-header">
      <h2>Bibliothèque de Textes</h2>
      <p class="subtitle">Recherchez et réutilisez vos textes sauvegardés</p>
    </div>

    <!-- Search input -->
    <div class="search-container">
      <n-input
        v-model:value="searchQuery"
        type="text"
        placeholder="Rechercher par titre ou contenu..."
        clearable
        :loading="isLoading"
        data-testid="library-search-input"
      />
    </div>

    <!-- Text grid or empty state -->
    <div v-if="filteredTexts.length > 0" class="text-grid-wrapper">
      <n-grid
        cols="1 s:2 m:2 l:3 xl:3 xxl:4"
        responsive="screen"
        x-gap="16"
        y-gap="16"
        class="text-grid"
      >
        <n-grid-item v-for="text in filteredTexts" :key="text.id">
          <n-card
            draggable="true"
            :class="{
              'text-card': true,
              'text-card-selected': selectedTextId === text.id
            }"
            @click="handleCardClick(text)"
            @dblclick="handleDoubleClick(text)"
            @dragstart="handleDragStart(text, $event)"
            data-testid="library-text-card"
          >
            <!-- Type badge -->
            <template #header>
              <div class="card-header">
                <span class="text-label">{{ text.label }}</span>
                <span class="text-type">{{ getTypeLabel(text.type) }}</span>
              </div>
            </template>

            <!-- Text preview -->
            <div class="text-preview">
              <p>{{ getTextPreview(text) }}</p>
            </div>

            <!-- Font info -->
            <div class="font-info">
              <span class="font-family">{{ text.content.fontFamily }}</span>
              <span class="font-size">{{ text.content.fontSize }}px</span>
            </div>

            <!-- Actions -->
            <template #footer>
              <n-space justify="space-between" align="center">
                <span class="text-time">
                  {{ new Date(text.createdAt).toLocaleDateString('fr-FR') }}
                </span>
                <n-space>
                  <n-button
                    type="primary"
                    size="small"
                    @click.stop="handleUseClick(text)"
                    data-testid="use-text-button"
                  >
                    <template #icon>
                      <n-icon><CopyOutline /></n-icon>
                    </template>
                    Utiliser
                  </n-button>
                  <n-popconfirm
                    positive-text="Supprimer"
                    negative-text="Annuler"
                    @positive-click="confirmDelete"
                    @negative-click="() => (showDeleteDialog = false)"
                  >
                    <template #trigger>
                      <n-button
                        type="error"
                        quaternary
                        size="small"
                        @click.stop="handleDeleteClick(text)"
                        data-testid="delete-library-text-button"
                      >
                        <template #icon>
                          <n-icon><TrashBinOutline /></n-icon>
                        </template>
                      </n-button>
                    </template>
                    Êtes-vous sûr de vouloir supprimer ce texte ? Cette action est irréversible.
                  </n-popconfirm>
                </n-space>
              </n-space>
            </template>
          </n-card>
        </n-grid-item>
      </n-grid>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state-container">
      <n-empty
        description="Aucun texte sauvegardé"
        size="large"
      />
      <p class="empty-subtitle">Créez et sauvegardez des textes pour les retrouver ici</p>
    </div>
  </div>
</template>

<style scoped>
.text-library {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  min-height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.text-library-header {
  margin-bottom: 16px;
}

.text-library-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.search-container {
  display: flex;
  gap: 12px;
}

.text-grid-wrapper {
  flex: 1;
}

.text-grid {
  width: 100%;
}

.text-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 100%;
}

.text-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.text-card-selected {
  border-color: #3b82f6;
  background: #f0f4ff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.text-label {
  font-weight: 600;
  color: #333;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

.text-type {
  display: inline-block;
  padding: 2px 8px;
  background: #e0e7ff;
  color: #4f46e5;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.text-preview {
  margin: 16px 0;
  padding: 12px;
  background: #f8f9fa;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
  min-height: 60px;
}

.text-preview p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #555;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.font-info {
  display: flex;
  gap: 12px;
  margin: 12px 0;
  font-size: 12px;
  color: #666;
}

.font-family {
  background: #f0f4ff;
  padding: 4px 8px;
  border-radius: 3px;
  font-family: monospace;
}

.font-size {
  background: #f0f4ff;
  padding: 4px 8px;
  border-radius: 3px;
  font-family: monospace;
}

.text-time {
  font-size: 12px;
  color: #999;
}

.empty-state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
}

.empty-subtitle {
  margin: 0;
  color: #999;
  font-size: 14px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .text-library {
    padding: 16px;
    gap: 16px;
  }

  .text-library-header h2 {
    font-size: 24px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .text-type {
    align-self: flex-start;
  }
}

@media (max-width: 480px) {
  .text-library {
    padding: 12px;
  }

  .text-library-header h2 {
    font-size: 20px;
  }

  .text-preview {
    min-height: 50px;
  }
}
</style>
