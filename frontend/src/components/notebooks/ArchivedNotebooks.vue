<!--
  ArchivedNotebooks.vue - Component to display archived notebooks

  This component displays archived notebooks with a countdown timer showing
  how many days remain before permanent deletion (30-day retention).

  Features:
  - Grid layout similar to main gallery
  - Countdown timer for each notebook (30-day retention)
  - Actions: Restore, Delete permanently
  - Pagination support
  - Empty state when no archived notebooks
  - Loading state

  Props:
  - notebooks: Notebook[] - List of archived notebooks to display
  - loading: boolean - Loading state
  - pagination: PaginationMetadata - Pagination info

  Emits:
  - page-change - When user changes pagination page
  - restore - When user restores a notebook
  - delete - When user deletes a notebook
-->

<script setup lang="ts">
import {
  NCard,
  NBadge,
  NButton,
  NSpace,
  NGrid,
  NGridItem,
  NPagination,
  NSkeleton,
  NEmpty,
  NIcon,
  NProgress
} from 'naive-ui'
import {
  RefreshOutline as RestoreIcon,
  TrashBinOutline as DeleteIcon,
  BookOutline as BookIcon,
  TimeOutline as TimeIcon
} from '@vicons/ionicons5'
import type { Notebook, PaginationMetadata } from '@/types/notebook'

// Props
interface Props {
  /** List of archived notebooks to display */
  notebooks: Notebook[]

  /** Loading state indicator */
  loading?: boolean

  /** Pagination metadata */
  pagination: PaginationMetadata
}

withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
interface Emits {
  (e: 'page-change', page: number): void
  (e: 'restore', notebook: Notebook): void
  (e: 'delete', notebook: Notebook): void
}

const emit = defineEmits<Emits>()

// Constants
const ARCHIVE_RETENTION_DAYS = 30

// Compute days remaining for each notebook
const getDaysRemaining = (notebook: Notebook): number => {
  if (!notebook.archivedAt) return ARCHIVE_RETENTION_DAYS

  const archivedDate = new Date(notebook.archivedAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - archivedDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const daysRemaining = ARCHIVE_RETENTION_DAYS - diffDays

  return Math.max(0, daysRemaining)
}

// Compute progress percentage for retention countdown
const getRetentionProgress = (notebook: Notebook): number => {
  const daysRemaining = getDaysRemaining(notebook)
  return (daysRemaining / ARCHIVE_RETENTION_DAYS) * 100
}

// Format date for display
const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Methods
const handlePageChange = (page: number): void => {
  emit('page-change', page)
}

const handleRestore = (notebook: Notebook): void => {
  emit('restore', notebook)
}

const handleDelete = (notebook: Notebook): void => {
  emit('delete', notebook)
}

// Skeleton count for loading state
const skeletonCount = 12
</script>

<template>
  <div class="archived-notebooks">
    <!-- Loading state with skeleton loaders -->
    <div v-if="loading" class="archived-notebooks__loading">
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
        >
          <div class="archived-notebooks__skeleton">
            <n-skeleton height="300px" :sharp="false" />
            <n-space vertical :size="12" style="margin-top: 16px;">
              <n-skeleton text :repeat="1" width="80%" />
              <n-skeleton text :repeat="2" width="100%" />
            </n-space>
          </div>
        </n-grid-item>
      </n-grid>
    </div>

    <!-- Empty state (no archived notebooks) -->
    <div v-else-if="!notebooks || notebooks.length === 0" class="archived-notebooks__empty">
      <n-empty
        description="Aucun carnet archivé"
        size="large"
      >
        <template #icon>
          <n-icon :component="BookIcon" :size="64" color="#9ca3af" />
        </template>
        <template #extra>
          <p class="archived-notebooks__empty-text">
            Vos carnets archivés apparaîtront ici. Ils seront conservés pendant 30 jours avant suppression automatique.
          </p>
        </template>
      </n-empty>
    </div>

    <!-- Grid of archived notebooks -->
    <div v-else class="archived-notebooks__grid">
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
          <n-card
            class="archived-notebook-card"
            hoverable
            segmented
          >
            <!-- Card header with title and type badge -->
            <template #header>
              <div class="archived-notebook-card__header">
                <div class="archived-notebook-card__title-section">
                  <h3 class="archived-notebook-card__title">
                    {{ notebook.title }}
                  </h3>
                  <n-badge
                    :value="notebook.type"
                    processing
                    size="small"
                    :color="
                      notebook.type === 'Voyage' ? '#3B82F6' :
                      notebook.type === 'Daily' ? '#10B981' :
                      '#8B5CF6'
                    "
                  />
                </div>
              </div>
            </template>

            <!-- Card content -->
            <div class="archived-notebook-card__content">
              <!-- Description -->
              <p v-if="notebook.description" class="archived-notebook-card__description">
                {{ notebook.description }}
              </p>

              <!-- Metadata -->
              <div class="archived-notebook-card__metadata">
                <div class="archived-notebook-card__meta-item">
                  <span class="archived-notebook-card__meta-label">Format:</span>
                  <span class="archived-notebook-card__meta-value">
                    {{ notebook.format }} - {{ notebook.orientation === 'portrait' ? 'Portrait' : 'Landscape' }}
                  </span>
                </div>
                <div class="archived-notebook-card__meta-item">
                  <span class="archived-notebook-card__meta-label">Pages:</span>
                  <span class="archived-notebook-card__meta-value">{{ notebook.pageCount }}</span>
                </div>
                <div class="archived-notebook-card__meta-item">
                  <span class="archived-notebook-card__meta-label">Archivé le:</span>
                  <span class="archived-notebook-card__meta-value">
                    {{ formatDate(notebook.archivedAt || notebook.updatedAt) }}
                  </span>
                </div>
              </div>

              <!-- Retention countdown -->
              <div class="archived-notebook-card__countdown">
                <div class="archived-notebook-card__countdown-header">
                  <n-icon :component="TimeIcon" :size="16" />
                  <span>Suppression dans {{ getDaysRemaining(notebook) }} jours</span>
                </div>
                <n-progress
                  :percentage="getRetentionProgress(notebook)"
                  :show-percentage="false"
                  :status="getRetentionProgress(notebook) < 20 ? 'error' : 'success'"
                />
                <p class="archived-notebook-card__countdown-text">
                  Conservation automatique pendant {{ ARCHIVE_RETENTION_DAYS }} jours
                </p>
              </div>
            </div>

            <!-- Card actions -->
            <template #footer>
              <n-space justify="space-between" align="center">
                <div class="archived-notebook-card__info">
                  <small>ID: {{ notebook.id.substring(0, 8) }}...</small>
                </div>
                <n-space>
                  <n-button
                    type="primary"
                    size="small"
                    @click="handleRestore(notebook)"
                  >
                    <template #icon>
                      <n-icon :component="RestoreIcon" />
                    </template>
                    Restaurer
                  </n-button>
                  <n-button
                    type="error"
                    size="small"
                    @click="handleDelete(notebook)"
                  >
                    <template #icon>
                      <n-icon :component="DeleteIcon" />
                    </template>
                    Supprimer
                  </n-button>
                </n-space>
              </n-space>
            </template>
          </n-card>
        </n-grid-item>
      </n-grid>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="archived-notebooks__pagination">
        <n-pagination
          :page="pagination.currentPage"
          :page-count="pagination.totalPages"
          @update:page="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.archived-notebooks {
  width: 100%;
}

/* Loading state */
.archived-notebooks__loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.archived-notebooks__skeleton {
  padding: 16px;
  border-radius: 8px;
}

/* Empty state */
.archived-notebooks__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 48px 24px;
  text-align: center;
}

.archived-notebooks__empty-text {
  margin-top: 16px;
  font-size: 0.9375rem;
  color: #6b7280;
  max-width: 400px;
}

/* Grid layout */
.archived-notebooks__grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

:deep(.n-grid) {
  width: 100%;
}

:deep(.n-grid-item) {
  width: 100%;
}

/* Archived notebook card */
.archived-notebook-card {
  border-left: 4px solid #9ca3af;
  background-color: #f9fafb;
}

.archived-notebook-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.archived-notebook-card__title-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.archived-notebook-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  word-break: break-word;
  flex: 1;
}

/* Card content */
.archived-notebook-card__content {
  padding: 12px 0;
}

.archived-notebook-card__description {
  margin: 0 0 12px 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

/* Metadata */
.archived-notebook-card__metadata {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background-color: white;
  border-radius: 4px;
}

.archived-notebook-card__meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.archived-notebook-card__meta-label {
  font-weight: 600;
  color: #6b7280;
}

.archived-notebook-card__meta-value {
  color: #1f2937;
}

/* Countdown timer */
.archived-notebook-card__countdown {
  padding: 12px;
  background-color: #fef3c7;
  border-radius: 4px;
  border-left: 3px solid #f59e0b;
}

.archived-notebook-card__countdown-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
}

:deep(.n-progress) {
  margin-bottom: 8px;
}

.archived-notebook-card__countdown-text {
  margin: 0;
  font-size: 0.75rem;
  color: #92400e;
  opacity: 0.8;
}

/* Card footer */
.archived-notebook-card__info {
  color: #9ca3af;
  font-size: 0.75rem;
}

/* Pagination */
.archived-notebooks__pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

:deep(.n-pagination) {
  justify-content: center;
}

/* Responsive */
@media (max-width: 768px) {
  .archived-notebook-card__metadata {
    grid-template-columns: 1fr;
  }

  .archived-notebook-card__title {
    font-size: 0.9375rem;
  }
}
</style>
