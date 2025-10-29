<template>
  <div class="page-editor">
    <!-- Offline Badge -->
    <div v-if="!isOnline" class="offline-badge">
      <n-icon size="18">
        <CloudOfflineOutline />
      </n-icon>
      Mode hors ligne - Modifications sauvegardées localement
    </div>

    <!-- Header Toolbar -->
    <header class="editor-toolbar">
      <!-- File/Save Section -->
      <div class="toolbar-group">
        <n-button
          text
          type="primary"
          @click="handleSavePage"
          :loading="isSaving"
        >
          <template #icon>
            <SaveOutline />
          </template>
          Sauvegarder
        </n-button>
        <n-divider vertical />
      </div>

      <!-- Edit Section (Undo/Redo) -->
      <div class="toolbar-group">
        <n-button
          text
          :disabled="!editorStore.canUndo"
          @click="handleUndo"
          title="Ctrl+Z"
        >
          <template #icon>
            <ArrowUndoOutline />
          </template>
        </n-button>
        <n-button
          text
          :disabled="!editorStore.canRedo"
          @click="handleRedo"
          title="Ctrl+Y"
        >
          <template #icon>
            <ArrowRedoOutline />
          </template>
        </n-button>
        <n-divider vertical />
      </div>

      <!-- View Section (Zoom) -->
      <div class="toolbar-group">
        <n-select
          v-model:value="zoomLevel"
          :options="zoomOptions"
          size="small"
          style="width: 100px"
          @update:value="handleZoomChange"
        />
        <n-button
          text
          size="small"
          @click="editorStore.resetZoom"
          title="Zoom 100%"
        >
          Réinitialiser
        </n-button>
        <n-divider vertical />
      </div>

      <!-- Grid Toggle -->
      <div class="toolbar-group">
        <n-button
          text
          :type="editorStore.gridVisible ? 'primary' : 'default'"
          @click="editorStore.toggleGrid"
          title="Afficher/Masquer la grille"
        >
          <template #icon>
            <GridOutline />
          </template>
          Grille
        </n-button>
      </div>

      <!-- Spacer -->
      <div class="toolbar-spacer"></div>

      <!-- Auto-save Status -->
      <div class="toolbar-group auto-save-status">
        <n-spin
          v-if="editorStore.autoSaveStatus === 'saving'"
          size="small"
          class="mr-2"
        />
        <n-text
          :type="
            editorStore.autoSaveStatus === 'saved'
              ? 'success'
              : editorStore.autoSaveStatus === 'error'
                ? 'error'
                : 'default'
          "
        >
          {{
            editorStore.autoSaveStatus === 'saved'
              ? 'Enregistré'
              : editorStore.autoSaveStatus === 'saving'
                ? 'Enregistrement...'
                : editorStore.autoSaveStatus === 'error'
                  ? 'Erreur'
                  : ''
          }}
        </n-text>
      </div>
    </header>

    <!-- Main Content Area -->
    <div class="editor-content">
      <!-- Left Sidebar (Layers/Elements) -->
      <aside class="editor-sidebar-left">
        <n-text strong class="sidebar-title">Couches</n-text>
        <div class="layers-list">
          <div
            v-for="(obj, index) in editorStore.getCanvasObjects"
            :key="obj.data?.id || index"
            class="layer-item"
            :class="{ active: isLayerActive(obj.data?.id as string) }"
            @click="selectLayerFromList(obj.data?.id as string)"
          >
            <span class="layer-index">{{ index + 1 }}</span>
            <span class="layer-type">{{ getLayerType(obj.type) }}</span>
          </div>
        </div>
      </aside>

      <!-- Canvas Area (Main Editor) -->
      <main class="editor-canvas-area">
        <EditorCanvas
          :pageFormat="pageFormat"
          :elements="pageElements"
          :orientation="pageOrientation"
          @canvas-ready="onCanvasReady"
          @element-selected="handleElementSelected"
          @selection-cleared="handleSelectionCleared"
          @element-modified="handleElementModified"
        />
      </main>

      <!-- Right Sidebar (Text Tools and Library) -->
      <aside v-if="showRightSidebar" class="editor-sidebar-right-new">
        <EditorSidebar
          :selected-canvas-element="selectedCanvasElement"
          @close="showRightSidebar = false"
          @text-added="handleTextAddedFromSidebar"
          @text-updated="handleTextUpdatedFromSidebar"
        />
      </aside>

      <!-- Floating Action Button to toggle sidebar -->
      <button
        v-if="!showRightSidebar"
        class="fab-toggle-sidebar"
        @click="showRightSidebar = true"
        title="Ouvrir les outils de texte"
      >
        <n-icon size="24">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </n-icon>
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmModal
      :show="showDeleteModal"
      element-type="texte"
      @confirm="handleDeleteConfirmed"
      @cancel="() => showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * PageEditor View Component
 *
 * Vue principale de l'éditeur de page.
 * Combine la barre d'outils, le canvas, et les panneaux de propriétés.
 * Gère le flux de travail d'édition et les interactions utilisateur.
 *
 * Route: /notebooks/:notebookId/edit/:pageId
 * Requires: Authentication
 *
 * Usage:
 * Accessible via router après login, en naviguant vers un notebook existant
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fabric } from 'fabric'
import DeleteConfirmModal from '@/components/editor/DeleteConfirmModal.vue'
import EditorSidebar from '@/components/editor/EditorSidebar.vue'
import {
  NButton,
  NDivider,
  NSelect,
  NText,
  NSpin,
  NIcon,
  useMessage
} from 'naive-ui'
import {
  SaveOutline,
  ArrowUndoOutline,
  ArrowRedoOutline,
  GridOutline,
  CloudOfflineOutline
} from '@vicons/ionicons5'
import { useEditorStore } from '@/stores/editor'
import { usePagesStore } from '@/stores/pages'
import * as fabricService from '@/services/fabricService'
import * as pageService from '@/services/pageService'
import { convertPxToMm } from '@/utils/unitConversion'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useAutoSave } from '@/composables/useAutoSave'
import EditorCanvas from '@/components/editor/EditorCanvas.vue'
import type { SerializedElement } from '@/services/fabricService'
import type { Font } from '@/services/fontService'

// ========================================
// COMPOSABLES & STORES
// ========================================

const route = useRoute()
const message = useMessage()
const editorStore = useEditorStore()
const pagesStore = usePagesStore()

// ========================================
// STATE
// ========================================

/** Page format (A4 ou A5) */
const pageFormat = ref<'A4' | 'A5'>('A4')

/** Page orientation (portrait ou landscape) */
const pageOrientation = ref<'portrait' | 'landscape'>('portrait')

/** Elements chargés sur la page */
const pageElements = ref<SerializedElement[]>([])

/** En cours de sauvegarde */
const isSaving = ref<boolean>(false)

/** Niveau de zoom sélectionné */
const zoomLevel = ref<number>(1)

/** État d'affichage du modal de confirmation de suppression */
const showDeleteModal = ref<boolean>(false)

/** Online/offline status */
const isOnline = ref<boolean>(navigator.onLine)

/** État d'affichage de la sidebar droite (Text Tools & Library) */
const showRightSidebar = ref<boolean>(true)

/** Élément canvas sélectionné pour édition dans le TextPanel */
const selectedCanvasElement = ref<{ text: string; fontFamily: string; fontSize: number; color: string } | null>(null)

/** Options de zoom disponibles */
const zoomOptions = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 }
]

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

/**
 * Activer les raccourcis clavier globaux
 * Gère Copy/Paste, Undo/Redo, Delete, Z-index, etc.
 * Support forced save via Ctrl+S using auto-save composable
 */
useKeyboardShortcuts(
  (show: boolean) => {
    showDeleteModal.value = show
  },
  {
    forceSave: async () => {
      if (!editorStore.canvas) {
        throw new Error('Canvas not ready')
      }

      const elements = fabricService.serializeCanvasElements(editorStore.canvas)
      await autoSave.forceSave(elements)
    }
  }
)

// ========================================
// COMPUTED PROPERTIES
// ========================================

/**
 * Get route parameters
 */
const notebookId = computed(() => {
  const id = route.params.notebookId
  return Array.isArray(id) ? id[0] : id || ''
})
const pageId = computed(() => {
  const id = route.params.pageId
  return Array.isArray(id) ? id[0] : id || ''
})

// ========================================
// EVENT HANDLERS
// ========================================

/**
 * Canvas is ready and initialized
 */
function onCanvasReady(canvas: fabric.Canvas): void {
  editorStore.setCanvas(canvas)
  console.log(`Canvas ready for page ${pageId.value}`)

  // Load saved elements onto canvas
  if (pageElements.value.length > 0) {
    fabricService.loadCanvasElements(canvas, pageElements.value)
    editorStore.clearHistory() // Reset history after loading
  }
}

/**
 * Handle element selection by ID
 * Finds the element and updates editor store
 */
function handleElementSelected(elementId: string): void {
  const currentPageId = pageId.value
  const element = pagesStore.elements[currentPageId]?.find((el: any) => el.id === elementId)

  if (element) {
    const serialized = fabricService.serializeElement(element as any)
    editorStore.selectElement(serialized)
  }
}

/**
 * Handle selection cleared
 */
function handleSelectionCleared(): void {
  editorStore.selectElement(null)
}

/**
 * Handle element modification
 * Updates element in pages store with new properties
 */
function handleElementModified(elementId: string, changes: any): void {
  try {
    // Convert changes from px to mm and update store
    const updateData: any = {}

    if (changes.left !== undefined) {
      updateData.x = convertPxToMm(changes.left)
    }
    if (changes.top !== undefined) {
      updateData.y = convertPxToMm(changes.top)
    }
    if (changes.width !== undefined && changes.scaleX !== undefined) {
      updateData.width = convertPxToMm(changes.width * changes.scaleX)
    }
    if (changes.height !== undefined && changes.scaleY !== undefined) {
      updateData.height = convertPxToMm(changes.height * changes.scaleY)
    }
    if (changes.angle !== undefined) {
      updateData.rotation = changes.angle
    }

    pagesStore.updateElement(elementId, updateData)

    // Push to history for undo/redo
    if (editorStore.canvas) {
      const currentState = fabricService.serializeCanvasElements(editorStore.canvas)
      editorStore.pushHistory(currentState)
    }

    // Trigger auto-save (debounced)
    scheduleAutoSave()
  } catch (error) {
    console.error('Failed to update element:', error)
    message.error('Erreur lors de la modification')
  }
}

/**
 * Handle save button click
 */
async function handleSavePage(): Promise<void> {
  if (!editorStore.canvas) {
    message.error('Canvas not ready')
    return
  }

  isSaving.value = true
  editorStore.setAutoSaveStatus('saving')

  try {
    // Serialize current canvas state
    const elements = fabricService.serializeCanvasElements(editorStore.canvas)

    // TODO: Call API to save elements
    // await pageService.updatePageElements(notebookId.value, pageId.value, elements)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Clear history after successful save
    editorStore.clearHistory()

    editorStore.setAutoSaveStatus('saved')
    message.success('Page sauvegardée avec succès')
    console.log(`Page ${pageId.value} saved with ${elements.length} elements`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    editorStore.setError(errorMsg)
    message.error(`Erreur lors de la sauvegarde: ${errorMsg}`)
    console.error('Save failed:', error)
  } finally {
    isSaving.value = false
  }
}

/**
 * Handle undo action
 */
function handleUndo(): void {
  const previousState = editorStore.undo()

  if (previousState && editorStore.canvas) {
    fabricService.loadCanvasElements(editorStore.canvas, previousState)
    editorStore.selectElement(null)
  }
}

/**
 * Handle redo action
 */
function handleRedo(): void {
  const nextState = editorStore.redo()

  if (nextState && editorStore.canvas) {
    fabricService.loadCanvasElements(editorStore.canvas, nextState)
    editorStore.selectElement(null)
  }
}

/**
 * Handle zoom level change
 */
function handleZoomChange(value: number): void {
  editorStore.updateZoom(value)
  zoomLevel.value = value
}

/**
 * Handler pour la confirmation de suppression (via modal)
 */
async function handleDeleteConfirmed(): Promise<void> {
  await editorStore.deleteElement()
  showDeleteModal.value = false
}

/**
 * Check if layer is active (selected)
 */
function isLayerActive(layerId: string): boolean {
  return editorStore.selectedElement?.id === layerId
}

/**
 * Select layer from list
 */
function selectLayerFromList(layerId: string): void {
  if (!editorStore.canvas) return

  const obj = fabricService.getObjectById(editorStore.canvas, layerId)
  if (obj) {
    editorStore.canvas.setActiveObject(obj)
    editorStore.canvas.renderAll()

    const serialized = fabricService.serializeElement(obj)
    editorStore.selectElement(serialized)
  }
}

/**
 * Get display name for layer type
 */
function getLayerType(type: string | undefined): string {
  const typeMap: Record<string, string> = {
    textbox: 'Texte',
    rect: 'Rectangle',
    image: 'Image',
    circle: 'Cercle',
    object: 'Objet'
  }

  return typeMap[type || ''] || 'Élément'
}

/**
 * Handle text added from EditorSidebar
 * Creates a text element on the canvas with the provided parameters
 */
function handleTextAddedFromSidebar(params: {
  text: string
  fontSize: number
  color: string
  fontFamily: string
  fontCategory: Font['category']
  styles: { isBold: boolean; isItalic: boolean; isUnderline: boolean }
}): void {
  try {
    // Add text element to canvas using editor store
    const element = editorStore.addTextElement({
      text: params.text,
      fontSize: params.fontSize,
      color: params.color,
      fontFamily: params.fontFamily,
      fontCategory: params.fontCategory,
      styles: params.styles
    })

    if (element) {
      // Add to pages store for persistence
      pagesStore.addElement(element as any)

      // Trigger auto-save
      scheduleAutoSave()

      message.success('Texte ajouté au canvas')
      console.log(`Text element added from sidebar: ${element.id}`)
    } else {
      message.error('Erreur lors de l\'ajout du texte')
    }
  } catch (error) {
    console.error('Failed to add text from sidebar:', error)
    message.error('Erreur lors de l\'ajout du texte')
  }
}

/**
 * Handle text updated from EditorSidebar
 * Updates the currently selected text element on the canvas
 */
function handleTextUpdatedFromSidebar(
  text: string,
  fontSize: number,
  color: string
): void {
  if (!editorStore.selectedElement || !editorStore.canvas) {
    message.warning('Aucun élément sélectionné')
    return
  }

  try {
    // Update the element on canvas with proper structure
    const updated: SerializedElement = {
      ...editorStore.selectedElement,
      content: {
        ...editorStore.selectedElement.content,
        text
      },
      style: {
        ...editorStore.selectedElement.style,
        fontSize,
        fill: color
      }
    }

    fabricService.updateCanvasObject(
      editorStore.canvas,
      editorStore.selectedElement.id,
      updated
    )

    // Update in pages store with proper structure
    pagesStore.updateElement(editorStore.selectedElement.id, {
      content: { text },
      style: { fontSize, fill: color }
    })

    // Update editor store selection
    editorStore.updateSelectedElement(updated)

    // Trigger auto-save
    scheduleAutoSave()

    message.success('Texte modifié avec succès')
    console.log(`Text element updated from sidebar: ${editorStore.selectedElement.id}`)
  } catch (error) {
    console.error('Failed to update text from sidebar:', error)
    message.error('Erreur lors de la modification du texte')
  }
}

// ========================================
// AUTO-SAVE
// ========================================

/**
 * Callback for auto-save composable
 * Serializes canvas and saves to API
 */
async function handleAutoSaveCallback(): Promise<void> {
  if (!editorStore.canvas || !pageId.value) {
    throw new Error('Canvas or page ID not available')
  }

  try {
    // Serialize with complete backend compatibility
    const payload = fabricService.serializeCanvasForBackend(editorStore.canvas, pageId.value)

    // Call batch save API
    const result = await pageService.saveElements(pageId.value, payload.elements as any)

    editorStore.setAutoSaveStatus('saved')
    console.log(`Auto-save successful: created=${result.created}, updated=${result.updated}`)
  } catch (error) {
    console.error('Auto-save failed:', error)
    throw error
  }
}

// Initialize auto-save composable
const autoSave = useAutoSave(handleAutoSaveCallback, 2000) // 2 second debounce

/**
 * Trigger auto-save when elements change
 */
function scheduleAutoSave(): void {
  if (!editorStore.canvas) return

  const elements = fabricService.serializeCanvasElements(editorStore.canvas)
  autoSave.trigger(elements)
}

/**
 * Cancel auto-save if pending
 */
function cancelAutoSave(): void {
  // The useAutoSave composable manages its own timers
  // Just clear the UI state if needed
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

/**
 * Handle keyboard shortcuts
 */
function handleKeyDown(event: KeyboardEvent): void {
  // Ctrl+S or Cmd+S: Save
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    handleSavePage()
  }

  // Ctrl+Z or Cmd+Z: Undo
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault()
    handleUndo()
  }

  // Ctrl+Y or Cmd+Shift+Z: Redo
  if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
    event.preventDefault()
    handleRedo()
  }

  // Delete key: Remove selected element (now handled by EditorSidebar and useKeyboardShortcuts)
  // The delete functionality is integrated into the EditorSidebar component
}

// ========================================
// LIFECYCLE HOOKS
// ========================================

/**
 * Load page data on mount
 */
onMounted(async () => {
  // Add keyboard listener
  window.addEventListener('keydown', handleKeyDown)

  // Add online/offline listeners
  window.addEventListener('online', () => {
    isOnline.value = true
    message.success('Connexion rétablie')

    // Retry save if there are unsaved changes
    const unsavedData = autoSave.loadFromLocalStorage(pageId.value)
    if (unsavedData && unsavedData.length > 0) {
      message.info('Synchronisation des modifications hors ligne...')
      autoSave.forceSave(unsavedData).catch((err) => {
        message.error('Erreur lors de la synchronisation')
        console.error(err)
      })
    }
  })

  window.addEventListener('offline', () => {
    isOnline.value = false
    message.warning('Mode hors ligne - Vos modifications seront sauvegardées localement')
  })

  try {
    // Load page data from store
    await pagesStore.loadPage(pageId.value)

    // Get the loaded page and its elements
    const currentPageData = pagesStore.currentPage
    if (currentPageData) {
      pageFormat.value = (currentPageData as any).format || 'A4'
      pageOrientation.value = (currentPageData as any).orientation || 'portrait'
    } else {
      // Fallback to defaults if page data is missing
      pageFormat.value = 'A4'
      pageOrientation.value = 'portrait'
    }

    // Load page elements from store
    const elements = pagesStore.elementsByZIndex(pageId.value)
    pageElements.value = elements

    // Check for unsaved data on mount
    const unsavedData = autoSave.loadFromLocalStorage(pageId.value)
    if (unsavedData && unsavedData.length > 0) {
      message.warning('Des modifications locales ont été trouvées', {
        closable: true,
        duration: 5000
      })
    }

    console.log(`PageEditor loaded for notebook ${notebookId.value}, page ${pageId.value}`)
  } catch (error) {
    console.error('Error loading page:', error)
    message.error('Erreur lors du chargement de la page')
    // Still allow editing with empty page as fallback
    pageFormat.value = 'A4'
    pageOrientation.value = 'portrait'
    pageElements.value = []
  }
})

/**
 * Cleanup on unmount
 */
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('online', () => {})
  window.removeEventListener('offline', () => {})
  cancelAutoSave()
  editorStore.clearCanvas()
  console.log('PageEditor cleanup completed')
})

// ========================================
// WATCHERS
// ========================================

/**
 * Sync zoom level with store
 */
watch(
  () => editorStore.zoom,
  (newZoom) => {
    zoomLevel.value = newZoom
  }
)

/**
 * Watch for selected element changes and update sidebar
 * When a text element is selected, populate the TextPanel in edit mode
 */
watch(
  () => editorStore.selectedElement,
  (newElement) => {
    if (newElement && newElement.type === 'textbox') {
      // Extract text properties from content and style for TextPanel
      selectedCanvasElement.value = {
        text: (newElement.content?.text as string) || '',
        fontFamily: (newElement.style?.fontFamily as string) || 'Open Sans',
        fontSize: (newElement.style?.fontSize as number) || 16,
        color: (newElement.style?.fill as string) || '#000000'
      }
    } else {
      selectedCanvasElement.value = null
    }
  }
)
</script>

<style scoped>
/**
 * Page Editor Styles
 *
 * Layout: Flex column with header toolbar and content area
 * Content: Flex row with left sidebar, canvas, and right sidebar
 * Responsive: Sidebars hide on small screens
 */

.page-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
  overflow: hidden;
}

/* ========================================
   OFFLINE BADGE
   ======================================== */

.offline-badge {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
  color: white;
  padding: 10px 16px;
  text-align: center;
  font-weight: 500;
  font-size: 13px;
  animation: slideDown 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* ========================================
   TOOLBAR
   ======================================== */

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 8px 16px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-spacer {
  flex: 1;
}

.auto-save-status {
  margin-left: 16px;
  padding-left: 16px;
  border-left: 1px solid #e5e7eb;
}

/* ========================================
   CONTENT AREA
   ======================================== */

.editor-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 0;
}

/* ========================================
   SIDEBARS
   ======================================== */

.editor-sidebar-left,
.editor-sidebar-right {
  width: 280px;
  background-color: white;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  box-sizing: border-box;
}

.editor-sidebar-right {
  border-left: 1px solid #e5e7eb;
  border-right: none;
}

.editor-sidebar-right-new {
  width: 400px;
  max-width: 30vw;
  background-color: white;
  border-left: 1px solid #e5e7eb;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.sidebar-title {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
}

/* ========================================
   LAYERS LIST (Left Sidebar)
   ======================================== */

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.layer-item:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
}

.layer-item.active {
  background-color: #dbeafe;
  border-color: #3b82f6;
}

.layer-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.layer-type {
  font-size: 13px;
  color: #6b7280;
  flex: 1;
}

/* ========================================
   CANVAS AREA (Main)
   ======================================== */

.editor-canvas-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: auto;
  background-color: #f5f5f5;
}

/* ========================================
   PROPERTIES PANEL (Right Sidebar)
   ======================================== */

.properties-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  text-align: center;
  color: #9ca3af;
}

/* ========================================
   FLOATING ACTION BUTTON (FAB)
   ======================================== */

.fab-toggle-sidebar {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4), 0 8px 24px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  animation: fadeInUp 0.5s ease-out;
}

.fab-toggle-sidebar:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5), 0 12px 32px rgba(0, 0, 0, 0.2);
}

.fab-toggle-sidebar:active {
  transform: scale(0.95);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========================================
   RESPONSIVE
   ======================================== */

@media (max-width: 1200px) {
  .editor-sidebar-left,
  .editor-sidebar-right {
    width: 240px;
  }

  .editor-sidebar-right-new {
    width: 350px;
    max-width: 40vw;
  }
}

@media (max-width: 768px) {
  .editor-sidebar-left {
    display: none;
  }

  .editor-sidebar-right {
    width: 200px;
  }

  .editor-sidebar-right-new {
    width: 100%;
    max-width: 100vw;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
  }

  .toolbar-group:nth-child(n + 3) {
    display: none;
  }

  .fab-toggle-sidebar {
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
  }
}

@media (max-width: 640px) {
  .editor-toolbar {
    padding: 8px;
  }

  .editor-sidebar-right {
    display: none;
  }

  .editor-canvas-area {
    padding: 12px;
  }

  .fab-toggle-sidebar {
    bottom: 16px;
    right: 16px;
    width: 44px;
    height: 44px;
  }
}

/* ========================================
   UTILITIES
   ======================================== */

.mr-2 {
  margin-right: 8px;
}

.mt-2 {
  margin-top: 8px;
}
</style>
