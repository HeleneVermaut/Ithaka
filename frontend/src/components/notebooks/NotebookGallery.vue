<!--
  Composant NotebookGallery - Galerie de carnets avec pagination

  Affiche une grille de carnets avec pagination, gestion du chargement et état vide.

  Props:
  - notebooks: Notebook[] (requis) - Liste des carnets à afficher
  - loading: boolean (défaut: false) - Afficher l'état de chargement
  - pagination: PaginationMetadata (requis) - Métadonnées de pagination

  Emits:
  - page-change - Déclenché lors du changement de page (émet le numéro de page)
  - notebook-click - Déclenché lors du clic sur un carnet
  - notebook-action - Déclenché lors d'une action sur un carnet
-->

<script setup lang="ts">
import { nextTick } from 'vue'
import {
  NGrid,
  NGridItem,
  NPagination,
  NSkeleton,
  NEmpty,
  NSpace,
  NIcon
} from 'naive-ui'
import { BookOutline as BookIcon } from '@vicons/ionicons5'
import NotebookCard from './NotebookCard.vue'
import type { Notebook, PaginationMetadata } from '@/types/notebook'

// Props
interface Props {
  /** Liste des carnets à afficher */
  notebooks: Notebook[]

  /** Indique si les données sont en cours de chargement */
  loading?: boolean

  /** Métadonnées de pagination */
  pagination: PaginationMetadata
}

withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
interface Emits {
  (e: 'page-change', page: number): void
  (e: 'notebook-click', notebook: Notebook): void
  (e: 'notebook-action', action: string, notebook: Notebook): void
  (e: 'notebook-contextmenu', event: MouseEvent, notebook: Notebook): void
}

const emit = defineEmits<Emits>()

// Gestionnaires d'événements
const handlePageChange = (page: number): void => {
  emit('page-change', page)

  // Scroll en haut de la galerie après changement de page
  nextTick(() => {
    const gallery = document.querySelector('.notebook-gallery')
    if (gallery) {
      gallery.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

const handleNotebookClick = (notebook: Notebook): void => {
  emit('notebook-click', notebook)
}

const handleDuplicate = (notebook: Notebook): void => {
  emit('notebook-action', 'duplicate', notebook)
}

const handleArchive = (notebook: Notebook): void => {
  emit('notebook-action', 'archive', notebook)
}

const handleRename = (notebook: Notebook): void => {
  emit('notebook-action', 'rename', notebook)
}

const handleContextMenu = (event: MouseEvent, notebook: Notebook): void => {
  emit('notebook-contextmenu', event, notebook)
}

// Nombre de cartes de skeleton à afficher lors du chargement
const skeletonCount = 12
</script>

<template>
  <div class="notebook-gallery">
    <!-- État de chargement avec skeleton loaders -->
    <div v-if="loading" class="notebook-gallery__loading">
      <n-grid
        :x-gap="24"
        :y-gap="24"
        :cols="1"
        responsive="screen"
      >
        <n-grid-item
          v-for="index in skeletonCount"
          :key="`skeleton-${index}`"
          :span="1"
          :x-gap="24"
        >
          <div class="notebook-gallery__skeleton">
            <n-skeleton height="400px" :sharp="false" />
            <n-space vertical :size="12" style="margin-top: 16px;">
              <n-skeleton text :repeat="1" width="80%" />
              <n-skeleton text :repeat="2" width="100%" />
              <n-skeleton text :repeat="1" width="60%" />
            </n-space>
          </div>
        </n-grid-item>
      </n-grid>
    </div>

    <!-- État vide (aucun carnet) -->
    <div v-else-if="!notebooks || notebooks.length === 0" class="notebook-gallery__empty">
      <n-empty
        description="Aucun carnet trouvé"
        size="large"
      >
        <template #icon>
          <n-icon :component="BookIcon" :size="64" color="#9ca3af" />
        </template>
        <template #extra>
          <p class="notebook-gallery__empty-text">
            Commencez par créer votre premier carnet de voyage ou modifiez vos filtres de recherche.
          </p>
        </template>
      </n-empty>
    </div>

    <!-- Grille de carnets -->
    <div v-else class="notebook-gallery__grid">
      <n-grid
        :x-gap="24"
        :y-gap="24"
        :cols="1"
        responsive="screen"
      >
        <n-grid-item
          v-for="notebook in notebooks"
          :key="notebook.id"
          :span="1"
        >
          <notebook-card
            :notebook="notebook"
            @click="handleNotebookClick"
            @duplicate="handleDuplicate"
            @archive="handleArchive"
            @rename="handleRename"
            @contextmenu="handleContextMenu"
          />
        </n-grid-item>
      </n-grid>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="notebook-gallery__pagination">
        <n-pagination
          v-model:page="pagination.currentPage"
          :page-count="pagination.totalPages"
          :page-size="pagination.limit"
          :item-count="pagination.total"
          show-size-picker
          show-quick-jumper
          :page-sizes="[10, 20, 30, 50]"
          @update:page="handlePageChange"
        >
          <template #prefix="{ itemCount }">
            <span class="notebook-gallery__pagination-info">
              Total: {{ itemCount || 0 }} carnet{{ (itemCount || 0) > 1 ? 's' : '' }}
            </span>
          </template>
        </n-pagination>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * Styles de la galerie de carnets
 * Utilise CSS Grid pour la disposition responsive
 */

.notebook-gallery {
  width: 100%;
  min-height: 400px;
}

/* Grille responsive */
.notebook-gallery__grid {
  width: 100%;
}

/* Configuration du grid responsive via NaiveUI */
:deep(.n-grid) {
  /* Desktop: 3 colonnes */
  grid-template-columns: repeat(3, 1fr);
}

/* Tablet: 2 colonnes */
@media (max-width: 1024px) {
  :deep(.n-grid) {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile: 1 colonne */
@media (max-width: 768px) {
  :deep(.n-grid) {
    grid-template-columns: repeat(1, 1fr);
  }
}

/* État de chargement */
.notebook-gallery__loading {
  width: 100%;
}

.notebook-gallery__skeleton {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

/* État vide */
.notebook-gallery__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: var(--spacing-2xl, 48px);
}

.notebook-gallery__empty-text {
  margin-top: var(--spacing-md, 16px);
  font-size: 0.9375rem;
  color: var(--color-text-secondary, #6b7280);
  text-align: center;
  max-width: 400px;
  line-height: 1.6;
}

/* Pagination */
.notebook-gallery__pagination {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-2xl, 48px);
  padding-top: var(--spacing-xl, 32px);
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.notebook-gallery__pagination-info {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin-right: var(--spacing-md, 16px);
}

/* Transitions */
.notebook-gallery__grid {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .notebook-gallery__empty {
    padding: var(--spacing-xl, 32px) var(--spacing-md, 16px);
  }

  .notebook-gallery__pagination {
    margin-top: var(--spacing-xl, 32px);
    padding-top: var(--spacing-lg, 24px);
  }

  /* Ajuster la pagination sur mobile */
  :deep(.n-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }

  .notebook-gallery__pagination-info {
    width: 100%;
    text-align: center;
    margin-bottom: var(--spacing-sm, 8px);
    margin-right: 0;
  }
}
</style>
