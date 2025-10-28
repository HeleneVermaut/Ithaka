<template>
  <aside class="editor-sidebar">
    <!-- Sidebar header with close button -->
    <div class="sidebar-header">
      <h3 class="sidebar-title">
        <component :is="tabIcons[activeTab]" class="tab-icon" />
        {{ tabLabels[activeTab] }}
      </h3>
      <button class="close-button" @click="$emit('close')" title="Fermer le panneau">
        ×
      </button>
    </div>

    <!-- Tab navigation -->
    <div class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="['tab-button', { active: activeTab === tab }]"
        @click="activeTab = tab"
        :title="tabLabels[tab]"
      >
        <component :is="tabIcons[tab]" class="icon" />
        <span class="label">{{ tabLabels[tab] }}</span>
      </button>
    </div>

    <!-- Tab content -->
    <div class="tab-content">
      <!-- Add Text Tab -->
      <div v-if="activeTab === 'add-text'" class="tab-pane">
        <TextPanel
          :is-adding="true"
          @text-added="handleTextAdded"
          @close="$emit('close')"
        />
      </div>

      <!-- Edit Element Tab -->
      <div v-if="activeTab === 'edit'" class="tab-pane">
        <div v-if="selectedElement" class="edit-panel">
          <TextPanel
            :selected-element="selectedElement"
            :is-adding="false"
            @text-updated="handleTextUpdated"
            @saved-to-library="handleSaveToLibrary"
            @delete-requested="handleDeleteRequested"
            @cancel="selectedElement = null"
          />
        </div>
        <div v-else class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <pointer-events points="20 17 22 19 20 21 18 19 20 17"></pointer-events>
          </svg>
          <p>Sélectionnez un élément texte sur le canvas pour l'éditer</p>
        </div>
      </div>

      <!-- Library Tab -->
      <div v-if="activeTab === 'library'" class="tab-pane">
        <div class="library-panel">
          <div v-if="savedStyles.length > 0" class="styles-list">
            <div class="list-header">
              <h4>Styles sauvegardés ({{ savedStyles.length }})</h4>
            </div>

            <div
              v-for="(style, index) in savedStyles"
              :key="index"
              :class="['style-item', { 'is-selected': selectedStyleIndex === index }]"
              @click="selectedStyleIndex = index"
            >
              <div class="style-preview" :style="getStylePreview(style)">
                Aa
              </div>
              <div class="style-info">
                <div class="style-font">{{ style.fontFamily }}</div>
                <div class="style-size">{{ style.fontSize }}px</div>
              </div>
              <div class="style-color" :style="{ backgroundColor: style.color }"></div>
              <button
                class="delete-button"
                @click.stop="deleteStyle(index)"
                title="Supprimer ce style"
              >
                ×
              </button>
            </div>

            <!-- Use selected style -->
            <button
              v-if="selectedStyleIndex !== null"
              class="btn btn-primary use-style"
              @click="useSelectedStyle"
            >
              Utiliser ce style
            </button>
          </div>

          <div v-else class="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <p>Aucun style sauvegardé</p>
            <small>Créez des textes et sauvegardez leurs styles</small>
          </div>
        </div>
      </div>

      <!-- Layers Tab (Z-Index Controls) -->
      <div v-if="activeTab === 'layers'" class="tab-pane">
        <ZIndexControls
          :selected-element="editorStore.selectedElement"
          :total-elements="totalElements"
          @bring-to-front="editorStore.bringToFront()"
          @bring-forward="editorStore.bringForward()"
          @send-backward="editorStore.sendBackward()"
          @send-to-back="editorStore.sendToBack()"
        />
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmModal
      :show="showDeleteModal"
      element-type="texte"
      @confirm="handleDeleteConfirmed"
      @cancel="() => showDeleteModal = false"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import TextPanel from './TextPanel.vue'
import ZIndexControls from './ZIndexControls.vue'
import DeleteConfirmModal from './DeleteConfirmModal.vue'
import { useEditorStore } from '@/stores/editor'
import { usePagesStore } from '@/stores/pages'
import type { Font } from '@/services/fontService'

/**
 * Props du composant
 */
interface Props {
  selectedCanvasElement?: { text: string; fontFamily: string; fontSize: number; color: string } | null
}

/**
 * Emits du composant
 */
interface Emits {
  /** Émis quand le panneau doit être fermé */
  'close': []
  /** Émis quand un texte est ajouté au canvas */
  'text-added': [params: TextAddedParams]
  /** Émis quand un texte est modifié */
  'text-updated': [text: string, fontSize: number, color: string]
}

interface TextAddedParams {
  text: string
  fontSize: number
  color: string
  fontFamily: string
  fontCategory: Font['category']
  styles: {
    isBold: boolean
    isItalic: boolean
    isUnderline: boolean
  }
}

interface SavedStyle {
  fontFamily: string
  fontSize: number
  color: string
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedCanvasElement: null
})

const emit = defineEmits<Emits>()

// Stores
const route = useRoute()
const editorStore = useEditorStore()
const pagesStore = usePagesStore()

/**
 * Onglets disponibles
 */
type TabType = 'add-text' | 'edit' | 'library' | 'layers'
const tabs: TabType[] = ['add-text', 'edit', 'library', 'layers']

/**
 * Onglet actif
 */
const activeTab = ref<TabType>('add-text')

/**
 * Élément sélectionné pour édition
 */
const selectedElement = ref<{ text: string; fontFamily: string; fontSize: number; color: string } | null>(
  props.selectedCanvasElement || null
)

/**
 * Styles sauvegardés en localStorage
 */
const savedStyles = ref<SavedStyle[]>(loadSavedStyles())

/**
 * Index du style sélectionné dans la bibliothèque
 */
const selectedStyleIndex = ref<number | null>(null)

/**
 * Nombre total d'éléments sur la page actuelle
 */
const totalElements = computed(() => {
  const pageId = route.params.pageId as string
  return pagesStore.elements[pageId]?.length || 0
})

/**
 * État du modal de confirmation de suppression
 */
const showDeleteModal = ref<boolean>(false)

/**
 * Labels pour les onglets
 */
const tabLabels: Record<TabType, string> = {
  'add-text': 'Ajouter du texte',
  'edit': 'Modifier le texte',
  'library': 'Bibliothèque de styles',
  'layers': 'Calques'
}

/**
 * Icônes pour les onglets (utilise des SVG simples)
 */
const tabIcons: Record<TabType, string> = {
  'add-text': 'AddTextIcon',
  'edit': 'EditIcon',
  'library': 'LibraryIcon',
  'layers': 'LayersIcon'
}

/**
 * Charge les styles sauvegardés depuis localStorage
 */
function loadSavedStyles(): SavedStyle[] {
  try {
    const saved = localStorage.getItem('text_styles')
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Error loading saved styles:', error)
    return []
  }
}

/**
 * Sauvegarde les styles dans localStorage
 */
function saveSylesToLocalStorage(): void {
  try {
    localStorage.setItem('text_styles', JSON.stringify(savedStyles.value))
  } catch (error) {
    console.error('Error saving styles:', error)
  }
}

/**
 * Traite l'ajout de texte
 */
function handleTextAdded(
  text: string,
  fontSize: number,
  color: string,
  fontFamily: string,
  fontCategory: Font['category'],
  styles: any
): void {
  emit('text-added', {
    text,
    fontSize,
    color,
    fontFamily,
    fontCategory,
    styles
  })
}

/**
 * Traite la modification de texte
 */
function handleTextUpdated(text: string, fontSize: number, color: string): void {
  emit('text-updated', text, fontSize, color)
}

/**
 * Traite la sauvegarde d'un style
 */
function handleSaveToLibrary(style: SavedStyle): void {
  savedStyles.value.push(style)
  saveSylesToLocalStorage()
}

/**
 * Supprime un style de la bibliothèque
 */
function deleteStyle(index: number): void {
  savedStyles.value.splice(index, 1)
  saveSylesToLocalStorage()
  if (selectedStyleIndex.value === index) {
    selectedStyleIndex.value = null
  }
}

/**
 * Utilise le style sélectionné
 *
 * TODO: Implémenter la propagation du style sélectionné vers TextPanel
 */
function useSelectedStyle(): void {
  if (selectedStyleIndex.value !== null) {
    // const selectedStyle = savedStyles.value[selectedStyleIndex.value]
    activeTab.value = 'add-text'
    // Le TextPanel se mettra à jour avec les valeurs du style
  }
}

/**
 * Obtient le style de prévisualisation pour un style sauvegardé
 */
function getStylePreview(savedStyle: SavedStyle): Record<string, string> {
  return {
    fontFamily: savedStyle.fontFamily,
    fontSize: `${Math.min(savedStyle.fontSize, 18)}px`,
    color: savedStyle.color,
    fontWeight: savedStyle.isBold ? 'bold' : 'normal',
    fontStyle: savedStyle.isItalic ? 'italic' : 'normal',
    textDecoration: savedStyle.isUnderline ? 'underline' : 'none'
  }
}

/**
 * Handler pour demande de suppression d'élément
 */
function handleDeleteRequested(): void {
  showDeleteModal.value = true
}

/**
 * Handler pour confirmation de suppression
 */
async function handleDeleteConfirmed(): Promise<void> {
  await editorStore.deleteElement()
  showDeleteModal.value = false
}
</script>

<style scoped>
.editor-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-left: 1px solid #e0e0e0;
  overflow: hidden;
}

/* Header */
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 2px solid #f0f0f0;
  gap: 12px;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.tab-icon {
  width: 20px;
  height: 20px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #333;
  }
}

/* Tab navigation */
.tab-navigation {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.tab-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #999;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  border-bottom: 2px solid transparent;

  .icon {
    width: 16px;
    height: 16px;
  }

  &:hover {
    color: #666;
    background: #f0f0f0;
  }

  &.active {
    color: #1976d2;
    background: white;
    border-bottom-color: #1976d2;
  }

  @media (max-width: 768px) {
    .label {
      display: none;
    }
  }
}

/* Tab content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.tab-pane {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 12px;
  color: #999;
  text-align: center;

  svg {
    opacity: 0.5;
  }

  p {
    font-size: 14px;
    font-weight: 500;
    margin: 0;
  }

  small {
    font-size: 12px;
    color: #bbb;
  }
}

/* Edit panel */
.edit-panel {
  animation: fadeIn 0.2s ease-in-out;
}

/* Library panel */
.library-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-header {
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;

  h4 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }
}

.styles-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.style-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    border-color: #1976d2;
    background: #f5f9ff;
  }

  &.is-selected {
    border-color: #1976d2;
    background: #e3f2fd;
  }
}

.style-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  flex-shrink: 0;
}

.style-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.style-font {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.style-size {
  font-size: 11px;
  color: #999;
}

.style-color {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ddd;
  flex-shrink: 0;
}

.delete-button {
  position: absolute;
  top: 2px;
  right: 2px;
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;

  .style-item:hover & {
    opacity: 1;
  }

  &:hover {
    color: #d32f2f;
  }
}

.use-style {
  width: 100%;
  padding: 10px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #1565c0;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .tab-navigation {
    flex-wrap: wrap;
  }

  .style-item {
    padding: 10px;
  }

  .style-info,
  .style-color {
    display: none;
  }
}
</style>
