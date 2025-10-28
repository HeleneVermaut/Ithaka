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

      <!-- Right Sidebar (Properties) -->
      <aside class="editor-sidebar-right">
        <n-text strong class="sidebar-title">Propriétés</n-text>
        <div v-if="editorStore.selectedElement" class="properties-panel">
          <div class="property-group">
            <n-text depth="3">Position</n-text>
            <n-space vertical>
              <n-input-number
                v-model:value="selectedProps.x"
                placeholder="X (mm)"
                size="small"
                @blur="updateSelectedElement('x')"
              >
                <template #prefix>X:</template>
              </n-input-number>
              <n-input-number
                v-model:value="selectedProps.y"
                placeholder="Y (mm)"
                size="small"
                @blur="updateSelectedElement('y')"
              >
                <template #prefix>Y:</template>
              </n-input-number>
            </n-space>
          </div>

          <n-divider />

          <div class="property-group">
            <n-text depth="3">Dimensions</n-text>
            <n-space vertical>
              <n-input-number
                v-model:value="selectedProps.width"
                placeholder="Largeur (mm)"
                size="small"
                @blur="updateSelectedElement('width')"
              >
                <template #prefix>L:</template>
              </n-input-number>
              <n-input-number
                v-model:value="selectedProps.height"
                placeholder="Hauteur (mm)"
                size="small"
                @blur="updateSelectedElement('height')"
              >
                <template #prefix>H:</template>
              </n-input-number>
            </n-space>
          </div>

          <n-divider />

          <div class="property-group">
            <n-text depth="3">Rotation</n-text>
            <n-slider
              v-model:value="selectedProps.rotation"
              :min="0"
              :max="360"
              :step="1"
              @update:value="updateSelectedElement('rotation')"
            />
            <n-text depth="3" class="mt-2">{{ selectedProps.rotation }}°</n-text>
          </div>

          <n-divider />

          <div class="property-group">
            <n-button
              type="error"
              size="small"
              block
              @click="deleteSelectedElement"
            >
              Supprimer l'élément
            </n-button>
          </div>
        </div>
        <div v-else class="no-selection">
          <n-text depth="3">Aucun élément sélectionné</n-text>
        </div>
      </aside>
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
import {
  NButton,
  NDivider,
  NSelect,
  NText,
  NSpace,
  NInputNumber,
  NSlider,
  NSpin,
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

/** Options de zoom disponibles */
const zoomOptions = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 }
]

/** Propriétés de l'élément sélectionné */
const selectedProps = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0
})

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

    // Update properties panel
    selectedProps.value = {
      x: serialized.x,
      y: serialized.y,
      width: serialized.width,
      height: serialized.height,
      rotation: serialized.rotation
    }
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
 * Update selected element property
 */
function updateSelectedElement(property: keyof typeof selectedProps.value): void {
  if (!editorStore.selectedElement || !editorStore.canvas) return

  const updated = { ...editorStore.selectedElement }

  switch (property) {
    case 'x':
      updated.x = selectedProps.value.x
      break
    case 'y':
      updated.y = selectedProps.value.y
      break
    case 'width':
      updated.width = selectedProps.value.width
      break
    case 'height':
      updated.height = selectedProps.value.height
      break
    case 'rotation':
      updated.rotation = selectedProps.value.rotation
      break
  }

  fabricService.updateCanvasObject(editorStore.canvas, updated.id, updated)
  editorStore.updateSelectedElement(updated)
}

/**
 * Delete selected element
 */
function deleteSelectedElement(): void {
  if (!editorStore.selectedElement || !editorStore.canvas) return

  fabricService.removeCanvasObject(editorStore.canvas, editorStore.selectedElement.id)
  editorStore.selectElement(null)

  // Push to history
  const currentState = fabricService.serializeCanvasElements(editorStore.canvas)
  editorStore.pushHistory(currentState)

  message.success('Élément supprimé')
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

    // Update properties panel
    selectedProps.value = {
      x: serialized.x,
      y: serialized.y,
      width: serialized.width,
      height: serialized.height,
      rotation: serialized.rotation
    }
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

// ========================================
// AUTO-SAVE
// ========================================

/**
 * Callback for auto-save composable
 * Serializes canvas and saves to API
 */
async function handleAutoSaveCallback(elements: any[]): Promise<void> {
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

  // Delete key: Remove selected element
  if (event.key === 'Delete' && editorStore.selectedElement) {
    event.preventDefault()
    deleteSelectedElement()
  }
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

  // TODO: Fetch page data from API
  // const page = await pageService.getPage(notebookId.value, pageId.value)
  // pageFormat.value = page.format || 'A4'
  // pageOrientation.value = page.orientation || 'portrait'
  // pageElements.value = page.elements || []

  // Check for unsaved data on mount
  const unsavedData = autoSave.loadFromLocalStorage(pageId.value)
  if (unsavedData && unsavedData.length > 0) {
    message.warning({
      title: 'Modifications non sauvegardées détectées',
      content: 'Des modifications locales ont été trouvées. Voulez-vous les restaurer ?',
      positiveText: 'Restaurer',
      negativeText: 'Ignorer',
      onPositiveClick: () => {
        // Would load into canvas if we have canvas reference
        autoSave.forceSave(unsavedData).then(() => {
          autoSave.clearLocalStorage(pageId.value)
          message.success('Modifications restaurées et sauvegardées')
        }).catch((err) => {
          message.error('Erreur lors de la restauration')
          console.error(err)
        })
      },
      onNegativeClick: () => {
        autoSave.clearLocalStorage(pageId.value)
      }
    })
  }

  // For now, initialize with empty page
  pageFormat.value = 'A4'
  pageOrientation.value = 'portrait'
  pageElements.value = []

  console.log(`PageEditor loaded for notebook ${notebookId.value}, page ${pageId.value}`)
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
   RESPONSIVE
   ======================================== */

@media (max-width: 1200px) {
  .editor-sidebar-left,
  .editor-sidebar-right {
    width: 240px;
  }
}

@media (max-width: 768px) {
  .editor-sidebar-left {
    display: none;
  }

  .editor-sidebar-right {
    width: 200px;
  }

  .toolbar-group:nth-child(n + 3) {
    display: none;
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
