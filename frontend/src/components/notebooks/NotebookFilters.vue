<!--
  Composant NotebookFilters - Filtres de recherche et tri pour les carnets

  Fournit les contrôles de recherche, filtrage par type/statut, et tri.

  Props:
  - filters: NotebookFilters (requis) - État actuel des filtres
  - loading: boolean (défaut: false) - Désactiver les contrôles pendant le chargement

  Emits:
  - update:filters - Déclenché lors de la modification des filtres (émet NotebookFilters)
  - reset - Déclenché lors de la réinitialisation des filtres
-->

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NInput,
  NCheckboxGroup,
  NCheckbox,
  NSelect,
  NButton,
  NSpace,
  NBadge,
  NIcon,
  NCard
} from 'naive-ui'
import {
  SearchOutline as SearchIcon,
  CloseCircleOutline as ClearIcon,
  FunnelOutline as FilterIcon
} from '@vicons/ionicons5'
import type { NotebookFilters, NotebookType, NotebookSortField, SortOrder } from '@/types/notebook'

// Props
interface Props {
  /** État actuel des filtres */
  filters: NotebookFilters

  /** Désactiver les contrôles pendant le chargement */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
interface Emits {
  (e: 'update:filters', filters: NotebookFilters): void
  (e: 'reset'): void
}

const emit = defineEmits<Emits>()

// État local pour le formulaire de filtres
const searchQuery = ref(props.filters.search || '')
const selectedTypes = ref<NotebookType[]>(
  props.filters.type ? props.filters.type.split(',') as NotebookType[] : []
)
const selectedSort = ref(props.filters.sort || 'createdAt')
const selectedOrder = ref(props.filters.order || 'DESC')

// Debounce pour la recherche
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Options pour les checkboxes de type
const typeOptions = [
  { label: '🚗 Voyage', value: 'Voyage' },
  { label: '📔 Daily', value: 'Daily' },
  { label: '📸 Reportage', value: 'Reportage' }
]

// Options pour le tri
const sortOptions = [
  { label: 'Date de création', value: 'createdAt' },
  { label: 'Date de modification', value: 'updatedAt' },
  { label: 'Titre (alphabétique)', value: 'title' },
  { label: 'Nombre de pages', value: 'pageCount' },
  { label: 'Type', value: 'type' }
]

// Options pour l'ordre de tri
const orderOptions = [
  { label: 'Décroissant (Z→A, Récent→Ancien)', value: 'DESC' },
  { label: 'Croissant (A→Z, Ancien→Récent)', value: 'ASC' }
]

// Nombre de filtres actifs
const activeFiltersCount = computed(() => {
  let count = 0
  if (searchQuery.value && searchQuery.value.trim() !== '') count++
  if (selectedTypes.value.length > 0) count++
  if (selectedSort.value !== 'createdAt' || selectedOrder.value !== 'DESC') count++
  return count
})

// Vérifier si les filtres sont appliqués (différents des valeurs par défaut)
const hasActiveFilters = computed(() => {
  return activeFiltersCount.value > 0
})

// Gestionnaires d'événements
const handleSearchInput = (): void => {
  // Débounce de 500ms pour la recherche
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    emitFiltersUpdate()
  }, 500)
}

const handleTypeChange = (): void => {
  emitFiltersUpdate()
}

const handleSortChange = (): void => {
  emitFiltersUpdate()
}

const handleOrderChange = (): void => {
  emitFiltersUpdate()
}

const handleReset = (): void => {
  searchQuery.value = ''
  selectedTypes.value = []
  selectedSort.value = 'createdAt'
  selectedOrder.value = 'DESC'
  emit('reset')
}

const handleClearSearch = (): void => {
  searchQuery.value = ''
  emitFiltersUpdate()
}

// Émettre les filtres mis à jour
const emitFiltersUpdate = (): void => {
  const updatedFilters: NotebookFilters = {
    ...props.filters,
    search: searchQuery.value.trim() || undefined,
    type: selectedTypes.value.length > 0 ? selectedTypes.value.join(',') : undefined,
    sort: selectedSort.value as NotebookSortField,
    order: selectedOrder.value as SortOrder,
    page: 1 // Réinitialiser à la page 1 lors du changement de filtres
  }

  emit('update:filters', updatedFilters)
}

// Surveiller les changements de props pour synchroniser l'état local
watch(
  () => props.filters,
  (newFilters) => {
    searchQuery.value = newFilters.search || ''
    selectedTypes.value = newFilters.type ? newFilters.type.split(',') as NotebookType[] : []
    selectedSort.value = newFilters.sort || 'createdAt'
    selectedOrder.value = newFilters.order || 'DESC'
  },
  { deep: true }
)
</script>

<template>
  <n-card class="notebook-filters" :bordered="true">
    <div class="notebook-filters__container">
      <!-- En-tête avec badge de filtres actifs -->
      <div class="notebook-filters__header">
        <n-space align="center" :size="8">
          <n-icon :component="FilterIcon" :size="20" />
          <h3 class="notebook-filters__title">Filtres et recherche</h3>
          <n-badge
            v-if="hasActiveFilters"
            :value="`${activeFiltersCount} actif${activeFiltersCount > 1 ? 's' : ''}`"
            type="info"
          />
        </n-space>
        <n-button
          v-if="hasActiveFilters"
          text
          type="primary"
          :disabled="loading"
          @click="handleReset"
        >
          <template #icon>
            <n-icon :component="ClearIcon" />
          </template>
          Réinitialiser
        </n-button>
      </div>

      <!-- Barre de recherche -->
      <div class="notebook-filters__search">
        <n-input
          v-model:value="searchQuery"
          placeholder="Rechercher par titre ou description..."
          size="large"
          clearable
          :disabled="loading"
          @input="handleSearchInput"
          @clear="handleClearSearch"
        >
          <template #prefix>
            <n-icon :component="SearchIcon" />
          </template>
        </n-input>
      </div>

      <!-- Filtres par type -->
      <div class="notebook-filters__section">
        <label class="notebook-filters__label">Type de carnet</label>
        <n-checkbox-group
          v-model:value="selectedTypes"
          :disabled="loading"
          @update:value="handleTypeChange"
        >
          <n-space :size="16">
            <n-checkbox
              v-for="option in typeOptions"
              :key="option.value"
              :value="option.value"
              :label="option.label"
            />
          </n-space>
        </n-checkbox-group>
      </div>

      <!-- Tri -->
      <div class="notebook-filters__section notebook-filters__section--row">
        <div class="notebook-filters__sort-field">
          <label class="notebook-filters__label">Trier par</label>
          <n-select
            v-model:value="selectedSort"
            :options="sortOptions"
            :disabled="loading"
            @update:value="handleSortChange"
          />
        </div>

        <div class="notebook-filters__sort-order">
          <label class="notebook-filters__label">Ordre</label>
          <n-select
            v-model:value="selectedOrder"
            :options="orderOptions"
            :disabled="loading"
            @update:value="handleOrderChange"
          />
        </div>
      </div>
    </div>
  </n-card>
</template>

<style scoped>
/**
 * Styles du composant de filtres
 * Layout responsive avec disposition verticale sur mobile
 */

.notebook-filters {
  margin-bottom: var(--spacing-xl, 32px);
}

.notebook-filters__container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 24px);
}

/* En-tête */
.notebook-filters__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-md, 16px);
}

.notebook-filters__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

/* Barre de recherche */
.notebook-filters__search {
  width: 100%;
}

/* Sections de filtres */
.notebook-filters__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 12px);
}

.notebook-filters__section--row {
  flex-direction: row;
  gap: var(--spacing-md, 16px);
}

.notebook-filters__sort-field,
.notebook-filters__sort-order {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 12px);
}

.notebook-filters__label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: var(--spacing-xs, 4px);
}

/* Responsive */
@media (max-width: 768px) {
  .notebook-filters__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .notebook-filters__section--row {
    flex-direction: column;
  }

  .notebook-filters__sort-field,
  .notebook-filters__sort-order {
    min-width: 100%;
  }

  /* Checkboxes en colonne sur mobile */
  :deep(.n-checkbox-group .n-space) {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Animations */
.notebook-filters__container {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
