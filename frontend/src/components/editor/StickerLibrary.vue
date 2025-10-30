<template>
  <div class="sticker-library">
    <!-- Header with search and actions -->
    <div class="sticker-library__header">
      <h2 class="sticker-library__title">Bibliothèque de stickers</h2>
      <n-button
        type="primary"
        @click="handleUploadClick"
        class="sticker-library__upload-button"
      >
        <template #icon>
          <span>+</span>
        </template>
        Upload New Sticker
      </n-button>
      <n-button
        text
        @click="handleClose"
        class="sticker-library__close-button"
      >
        <template #icon>
          <span>×</span>
        </template>
      </n-button>
    </div>

    <!-- Search bar -->
    <div class="sticker-library__search">
      <n-input
        v-model:value="searchQuery"
        placeholder="Rechercher par nom ou tags..."
        clearable
        @update:value="handleSearchUpdate"
      >
        <template #prefix>
          <span>🔍</span>
        </template>
      </n-input>
    </div>

    <!-- Filter tabs -->
    <div class="sticker-library__filters">
      <n-button
        :type="selectedFilter === 'all' ? 'primary' : 'default'"
        @click="handleFilterClick('all')"
        class="sticker-library__filter-button"
      >
        Tous ({{ totalCount }})
      </n-button>
      <n-button
        :type="selectedFilter === 'recent' ? 'primary' : 'default'"
        @click="handleFilterClick('recent')"
        class="sticker-library__filter-button"
      >
        Récents
      </n-button>
      <n-button
        :type="selectedFilter === 'public' ? 'primary' : 'default'"
        @click="handleFilterClick('public')"
        class="sticker-library__filter-button"
      >
        Publics
      </n-button>
    </div>

    <!-- Content area: loading, empty, or grid -->
    <div class="sticker-library__content">
      <!-- Loading state -->
      <div v-if="loading" class="sticker-library__loading">
        <n-grid cols="2 s:3 m:5 l:6" :x-gap="12" :y-gap="12">
          <n-grid-item v-for="i in 12" :key="i">
            <n-skeleton height="120px" />
          </n-grid-item>
        </n-grid>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredStickers.length === 0" class="sticker-library__empty">
        <n-empty
          description="Aucun sticker trouvé"
          size="large"
        >
          <template #extra>
            <n-button type="primary" @click="handleUploadClick">
              Upload Your First Sticker
            </n-button>
          </template>
        </n-empty>
      </div>

      <!-- Stickers grid -->
      <div v-else class="sticker-library__grid">
        <n-grid cols="2 s:3 m:5 l:6" :x-gap="12" :y-gap="12">
          <n-grid-item
            v-for="sticker in filteredStickers"
            :key="sticker.id"
            class="sticker-library__grid-item"
          >
            <div
              class="sticker-card"
              :draggable="canSelect"
              @dragstart="handleDragStart($event, sticker)"
              @click="handleStickerClick(sticker)"
            >
              <!-- Thumbnail image -->
              <div class="sticker-card__image-wrapper">
                <n-image
                  :src="sticker.thumbnailUrl"
                  :alt="sticker.name"
                  object-fit="contain"
                  :preview-disabled="true"
                  class="sticker-card__image"
                />
              </div>

              <!-- Info on hover -->
              <div class="sticker-card__overlay">
                <div class="sticker-card__info">
                  <p class="sticker-card__name">{{ sticker.name }}</p>
                  <div class="sticker-card__tags">
                    <span
                      v-for="tag in sticker.tags"
                      :key="tag"
                      class="sticker-card__tag"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>

                <!-- Actions menu -->
                <div class="sticker-card__actions" @click.stop>
                  <n-button
                    size="small"
                    quaternary
                    @click="handleEditClick(sticker)"
                    title="Edit name"
                  >
                    ✏️
                  </n-button>
                  <n-button
                    size="small"
                    quaternary
                    @click="handleTogglePublicClick(sticker)"
                    :title="sticker.isPublic ? 'Set as private' : 'Set as public'"
                  >
                    {{ sticker.isPublic ? '🔓' : '🔒' }}
                  </n-button>
                  <n-button
                    size="small"
                    quaternary
                    @click="handleDeleteClick(sticker)"
                    title="Delete sticker"
                  >
                    🗑️
                  </n-button>
                </div>
              </div>

              <!-- Usage count badge -->
              <div class="sticker-card__badge">
                {{ sticker.usageCount }}x
              </div>
            </div>
          </n-grid-item>
        </n-grid>
      </div>
    </div>

    <!-- Edit Modal -->
    <n-modal
      v-model:show="showEditModal"
      preset="dialog"
      title="Edit Sticker"
    >
      <n-form>
        <n-form-item label="Name">
          <n-input v-model:value="editForm.name" placeholder="Sticker name" />
        </n-form-item>
        <n-form-item label="Tags (comma-separated)">
          <n-input
            v-model:value="editForm.tagsString"
            placeholder="nature, forest, tree"
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="showEditModal = false">Cancel</n-button>
          <n-button type="primary" @click="handleEditSave">Save</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Error state -->
    <div v-if="error" class="sticker-library__error">
      <n-alert type="error" :title="error" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * StickerLibrary Component
 *
 * Ce composant affiche la bibliothèque de stickers utilisateur avec les fonctionnalités suivantes :
 * - Grille responsive de thumbnails de stickers
 * - Recherche par nom et tags
 * - Filtrage par catégorie (tous, récents, publics)
 * - Drag-and-drop des stickers vers le canvas
 * - Actions CRUD : edit name, delete, set public/private
 * - Upload de nouveaux stickers
 * - Loading states et empty states
 *
 * Architecture :
 * - Utilise le stickerLibraryStore pour la gestion d'état
 * - Intégré avec NaiveUI pour les composants UI
 * - Support du drag-and-drop natif HTML5
 * - Filtrage et recherche côté client pour performances
 *
 * @example
 * <StickerLibrary
 *   :pageId="currentPageId"
 *   :canSelect="true"
 *   @sticker-selected="handleStickerSelected"
 *   @close="handleCloseLibrary"
 * />
 */

import { ref, computed, onMounted } from 'vue'
import {
  NButton,
  NInput,
  NGrid,
  NGridItem,
  NImage,
  NEmpty,
  NSkeleton,
  NModal,
  NForm,
  NFormItem,
  NSpace,
  NAlert
} from 'naive-ui'
import { useStickerLibraryStore } from '@/stores/stickerLibraryStore'
import type { IUserSticker } from '@/types/models'

// ========================================
// PROPS & EMITS
// ========================================

/**
 * Props du composant StickerLibrary
 */
interface Props {
  /** ID de la page courante pour l'insertion de stickers */
  pageId: string

  /** Indique si les stickers peuvent être sélectionnés (drag-drop et click) */
  canSelect?: boolean
}

/**
 * Props avec valeurs par défaut
 */
const props = withDefaults(defineProps<Props>(), {
  canSelect: true
})

/**
 * Événements émis par le composant
 */
interface Emits {
  /** Émis lorsqu'un sticker est sélectionné pour insertion */
  (event: 'sticker-selected', sticker: IUserSticker): void

  /** Émis lorsque l'utilisateur ferme la bibliothèque */
  (event: 'close'): void
}

const emit = defineEmits<Emits>()

// ========================================
// COMPOSABLES & STORES
// ========================================

/**
 * Store Pinia pour la gestion de la bibliothèque de stickers
 */
const stickerLibrary = useStickerLibraryStore()

// ========================================
// REACTIVE STATE
// ========================================

/**
 * Filtre actuellement sélectionné
 * - 'all': Tous les stickers
 * - 'recent': Stickers récents (7 derniers jours)
 * - 'public': Stickers publics uniquement
 */
const selectedFilter = ref<'all' | 'recent' | 'public'>('all')

/**
 * Terme de recherche saisi par l'utilisateur
 * Utilisé pour filtrer les stickers par nom ou tags
 */
const searchQuery = ref<string>('')

/**
 * Indique si la modal d'édition est visible
 */
const showEditModal = ref<boolean>(false)

/**
 * Formulaire d'édition de sticker
 * Stocke temporairement les valeurs pendant l'édition
 */
const editForm = ref<{
  id: string | null
  name: string
  tagsString: string
}>({
  id: null,
  name: '',
  tagsString: ''
})

// ========================================
// COMPUTED PROPERTIES
// ========================================

/**
 * Accès au state du store pour la réactivité
 */
const loading = computed(() => stickerLibrary.loading)
const error = computed(() => stickerLibrary.error)
const allStickers = computed(() => stickerLibrary.stickers)

/**
 * Nombre total de stickers dans la bibliothèque
 */
const totalCount = computed(() => stickerLibrary.getStickerCount)

/**
 * Liste des stickers filtrés par catégorie et recherche
 *
 * Applique d'abord le filtre de catégorie, puis la recherche textuelle.
 * Les stickers récents sont ceux créés dans les 7 derniers jours.
 *
 * @returns Tableau de stickers filtrés
 */
const filteredStickers = computed((): IUserSticker[] => {
  let stickers = allStickers.value

  // Filtrage par catégorie
  if (selectedFilter.value === 'recent') {
    // Filtrer les stickers créés dans les 7 derniers jours
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    stickers = stickers.filter((sticker) => {
      const createdAt = new Date(sticker.createdAt)
      return createdAt >= sevenDaysAgo
    })
  } else if (selectedFilter.value === 'public') {
    // Filtrer uniquement les stickers publics
    stickers = stickers.filter((sticker) => sticker.isPublic)
  }

  // Filtrage par recherche (si query fournie)
  if (searchQuery.value && searchQuery.value.trim() !== '') {
    stickers = stickerLibrary.getFilteredStickers(searchQuery.value)
  }

  return stickers
})

// ========================================
// METHODS
// ========================================

/**
 * Charge les stickers au montage du composant
 *
 * Récupère la bibliothèque complète depuis le backend.
 * Gère automatiquement les états loading et error via le store.
 */
async function loadStickers(): Promise<void> {
  await stickerLibrary.loadStickerLibrary()
}

/**
 * Gère le changement de filtre de catégorie
 *
 * @param filter - Nouveau filtre à appliquer ('all', 'recent', 'public')
 */
function handleFilterClick(filter: 'all' | 'recent' | 'public'): void {
  selectedFilter.value = filter
}

/**
 * Gère la mise à jour de la recherche textuelle
 *
 * @param value - Nouveau terme de recherche
 */
function handleSearchUpdate(value: string): void {
  searchQuery.value = value
}

/**
 * Gère le début du drag d'un sticker
 *
 * Configure le dataTransfer pour le drag-and-drop HTML5.
 * Stocke l'ID du sticker pour l'insertion sur le canvas.
 *
 * @param event - Événement de drag natif
 * @param sticker - Sticker en cours de drag
 */
function handleDragStart(event: DragEvent, sticker: IUserSticker): void {
  if (!props.canSelect) {
    event.preventDefault()
    return
  }

  // Stocker l'ID du sticker dans le dataTransfer
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'sticker',
      stickerId: sticker.id,
      cloudinaryUrl: sticker.cloudinaryUrl,
      cloudinaryPublicId: sticker.cloudinaryPublicId,
      name: sticker.name
    }))
  }
}

/**
 * Gère le clic sur un sticker
 *
 * Émet l'événement 'sticker-selected' avec le sticker et une position par défaut.
 * La position par défaut (100, 100) peut être ajustée par le parent.
 *
 * @param sticker - Sticker sélectionné
 */
function handleStickerClick(sticker: IUserSticker): void {
  if (!props.canSelect) {
    return
  }

  // Émettre l'événement de sélection avec position par défaut
  emit('sticker-selected', sticker)
}

/**
 * Gère le clic sur le bouton "Upload New Sticker"
 *
 * TODO: Implémenter l'ouverture d'une modal ou d'un composant d'upload.
 * Pour l'instant, log un message console.
 */
function handleUploadClick(): void {
  console.log('[StickerLibrary] Upload new sticker (to be implemented)')
  // TODO: Ouvrir une modal d'upload ou naviguer vers la page d'upload
}

/**
 * Gère le clic sur le bouton "Edit" d'un sticker
 *
 * Ouvre la modal d'édition et pré-remplit le formulaire avec les données du sticker.
 *
 * @param sticker - Sticker à éditer
 */
function handleEditClick(sticker: IUserSticker): void {
  editForm.value = {
    id: sticker.id,
    name: sticker.name,
    tagsString: sticker.tags.join(', ')
  }
  showEditModal.value = true
}

/**
 * Sauvegarde les modifications d'un sticker
 *
 * Appelle le store pour mettre à jour le sticker avec le nouveau nom et les nouveaux tags.
 * Ferme la modal après succès.
 */
async function handleEditSave(): Promise<void> {
  if (!editForm.value.id) {
    return
  }

  // Parser les tags (split par virgule, trim, filter empty)
  const newTags = editForm.value.tagsString
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

  // Appeler le store pour mettre à jour
  await stickerLibrary.renameSticker(
    editForm.value.id,
    editForm.value.name,
    newTags
  )

  // Fermer la modal
  showEditModal.value = false
}

/**
 * Gère le clic sur le bouton "Toggle Public/Private"
 *
 * TODO: Implémenter l'API pour changer la visibilité du sticker.
 * Pour l'instant, log un message console.
 *
 * @param sticker - Sticker dont la visibilité doit être changée
 */
function handleTogglePublicClick(sticker: IUserSticker): void {
  console.log('[StickerLibrary] Toggle public:', sticker.id, !sticker.isPublic)
  // TODO: Appeler une API pour mettre à jour isPublic
}

/**
 * Gère le clic sur le bouton "Delete" d'un sticker
 *
 * Demande confirmation puis supprime le sticker de la bibliothèque.
 *
 * @param sticker - Sticker à supprimer
 */
async function handleDeleteClick(sticker: IUserSticker): Promise<void> {
  // Confirmation de suppression
  const confirmed = confirm(`Supprimer le sticker "${sticker.name}" ? Cette action est irréversible.`)

  if (!confirmed) {
    return
  }

  // Appeler le store pour supprimer
  await stickerLibrary.deleteSticker(sticker.id)
}

/**
 * Gère le clic sur le bouton "Close"
 *
 * Émet l'événement 'close' pour permettre au parent de fermer la bibliothèque.
 */
function handleClose(): void {
  emit('close')
}

// ========================================
// LIFECYCLE HOOKS
// ========================================

/**
 * Au montage du composant, charger les stickers depuis le backend
 */
onMounted(() => {
  loadStickers()
})
</script>

<style scoped>
/**
 * Styles du composant StickerLibrary
 *
 * Architecture BEM (Block Element Modifier) pour une organisation claire.
 * Styles responsive avec mobile-first approach.
 */

/* Block: sticker-library */
.sticker-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background-color: #ffffff;
  border-radius: 8px;
  overflow: hidden;
}

/* Element: header */
.sticker-library__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.sticker-library__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.sticker-library__upload-button {
  margin-left: auto;
  margin-right: 8px;
}

.sticker-library__close-button {
  font-size: 24px;
  line-height: 1;
}

/* Element: search */
.sticker-library__search {
  margin-bottom: 16px;
}

/* Element: filters */
.sticker-library__filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.sticker-library__filter-button {
  flex-shrink: 0;
}

/* Element: content */
.sticker-library__content {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.sticker-library__loading {
  width: 100%;
}

.sticker-library__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}

.sticker-library__grid {
  width: 100%;
}

.sticker-library__grid-item {
  height: 140px;
}

/* Block: sticker-card */
.sticker-card {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sticker-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.sticker-card:active {
  transform: translateY(0);
}

/* Element: image-wrapper */
.sticker-card__image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background-color: #fff;
}

.sticker-card__image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Element: overlay */
.sticker-card__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  color: #fff;
}

.sticker-card:hover .sticker-card__overlay {
  opacity: 1;
}

/* Element: info */
.sticker-card__info {
  flex: 1;
}

.sticker-card__name {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sticker-card__tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.sticker-card__tag {
  font-size: 10px;
  padding: 2px 6px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  white-space: nowrap;
}

/* Element: actions */
.sticker-card__actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

/* Element: badge */
.sticker-card__badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 12px;
  pointer-events: none;
}

/* Element: error */
.sticker-library__error {
  margin-top: 16px;
}

/* Responsive: mobile adjustments */
@media (max-width: 640px) {
  .sticker-library__header {
    flex-wrap: wrap;
  }

  .sticker-library__title {
    font-size: 18px;
    width: 100%;
    margin-bottom: 8px;
  }

  .sticker-library__upload-button {
    margin-left: 0;
  }

  .sticker-library__grid-item {
    height: 120px;
  }
}
</style>
