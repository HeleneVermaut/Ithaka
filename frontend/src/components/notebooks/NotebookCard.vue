<!--
  Composant NotebookCard - Carte d'affichage d'un carnet

  Affiche un carnet sous forme de carte visuelle dans la galerie.
  Comprend une miniature, le titre, le type, le statut et des actions au survol.

  Props:
  - notebook: Notebook (requis) - Les données du carnet à afficher

  Emits:
  - click - Déclenché lors du clic sur la carte
  - duplicate - Déclenché lors de la duplication
  - archive - Déclenché lors de l'archivage
  - rename - Déclenché lors du renommage
-->

<script setup lang="ts">
import { computed } from 'vue'
import {
  NCard,
  NBadge,
  NButton,
  NSpace,
  NIcon,
  NTime
} from 'naive-ui'
import {
  LockClosedOutline as LockIcon,
  BookOutline as BookIcon
} from '@vicons/ionicons5'
import type { Notebook } from '@/types/notebook'

// Props
interface Props {
  /** Données du carnet à afficher */
  notebook: Notebook
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'click', notebook: Notebook): void
  (e: 'duplicate', notebook: Notebook): void
  (e: 'archive', notebook: Notebook): void
  (e: 'rename', notebook: Notebook): void
  (e: 'contextmenu', event: MouseEvent, notebook: Notebook): void
}

const emit = defineEmits<Emits>()

// Couleur du badge de type
const typeBadgeColor = computed(() => {
  switch (props.notebook.type) {
    case 'Voyage':
      return '#3B82F6' // Bleu
    case 'Daily':
      return '#10B981' // Vert
    case 'Reportage':
      return '#8B5CF6' // Violet
    default:
      return '#6B7280' // Gris
  }
})

// Icône et texte du statut de partage
const permissionInfo = computed(() => {
  // TODO: Accéder aux permissions depuis notebook.permissions quand disponible
  // Pour l'instant, on considère tous les carnets comme privés
  return {
    icon: LockIcon,
    text: 'Privé',
    color: '#6B7280'
  }
})

// URL de l'image de couverture ou placeholder
const coverImage = computed(() => {
  return props.notebook.coverImageUrl || 'https://via.placeholder.com/300x400?text=Aucune+couverture'
})

// Gestionnaires d'événements
const handleCardClick = (): void => {
  emit('click', props.notebook)
}

const handleDuplicate = (event: Event): void => {
  event.stopPropagation() // Empêcher le clic sur la carte
  emit('duplicate', props.notebook)
}

const handleArchive = (event: Event): void => {
  event.stopPropagation()
  emit('archive', props.notebook)
}

const handleRename = (event: Event): void => {
  event.stopPropagation()
  emit('rename', props.notebook)
}

const handleContextMenu = (event: MouseEvent): void => {
  event.preventDefault()
  event.stopPropagation()
  emit('contextmenu', event, props.notebook)
}
</script>

<template>
  <n-card
    class="notebook-card"
    :bordered="true"
    hoverable
    @click="handleCardClick"
    @contextmenu="handleContextMenu"
  >
    <!-- Image de couverture -->
    <div class="notebook-card__cover">
      <img
        :src="coverImage"
        :alt="`Couverture du carnet ${notebook.title}`"
        class="notebook-card__cover-image"
      />

      <!-- Overlay avec actions au survol -->
      <div class="notebook-card__overlay">
        <n-space vertical :size="8">
          <n-button
            type="primary"
            size="small"
            @click="handleCardClick"
          >
            Ouvrir
          </n-button>
          <n-button
            size="small"
            @click="handleDuplicate"
          >
            Dupliquer
          </n-button>
          <n-button
            size="small"
            @click="handleRename"
          >
            Renommer
          </n-button>
          <n-button
            size="small"
            @click="handleArchive"
          >
            {{ notebook.status === 'archived' ? 'Restaurer' : 'Archiver' }}
          </n-button>
        </n-space>
      </div>

      <!-- Badges en haut de la carte -->
      <div class="notebook-card__badges">
        <!-- Badge de type -->
        <n-badge
          :value="notebook.type"
          :color="typeBadgeColor"
          class="notebook-card__type-badge"
        />

        <!-- Badge de statut de partage -->
        <n-badge
          :color="permissionInfo.color"
          class="notebook-card__permission-badge"
        >
          <template #value>
            <n-space :size="4" align="center">
              <n-icon :component="permissionInfo.icon" :size="14" />
              <span>{{ permissionInfo.text }}</span>
            </n-space>
          </template>
        </n-badge>
      </div>
    </div>

    <!-- Contenu de la carte -->
    <template #header>
      <div class="notebook-card__header">
        <h3 class="notebook-card__title">{{ notebook.title }}</h3>
      </div>
    </template>

    <template #header-extra>
      <n-icon :component="BookIcon" :size="20" :color="typeBadgeColor" />
    </template>

    <!-- Description et métadonnées -->
    <div class="notebook-card__content">
      <p v-if="notebook.description" class="notebook-card__description">
        {{ notebook.description }}
      </p>
      <p v-else class="notebook-card__description notebook-card__description--empty">
        Aucune description
      </p>

      <div class="notebook-card__meta">
        <n-space :size="8" align="center">
          <span class="notebook-card__meta-item">
            📄 {{ notebook.pageCount }} page{{ notebook.pageCount > 1 ? 's' : '' }}
          </span>
          <span class="notebook-card__meta-separator">•</span>
          <span class="notebook-card__meta-item">
            {{ notebook.format }} {{ notebook.orientation === 'portrait' ? '📱' : '🖥️' }}
          </span>
        </n-space>
      </div>

      <div class="notebook-card__dates">
        <n-space vertical :size="4">
          <span class="notebook-card__date">
            Créé: <n-time :time="new Date(notebook.createdAt)" format="dd/MM/yyyy" />
          </span>
          <span class="notebook-card__date">
            Modifié: <n-time :time="new Date(notebook.updatedAt)" type="relative" />
          </span>
        </n-space>
      </div>
    </div>
  </n-card>
</template>

<style scoped>
/**
 * Styles de la carte de carnet
 * Utilise une structure BEM (Block Element Modifier)
 */

.notebook-card {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.notebook-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

/* Image de couverture */
.notebook-card__cover {
  position: relative;
  width: 100%;
  padding-top: 133.33%; /* Ratio 3:4 */
  overflow: hidden;
  border-radius: 8px 8px 0 0;
  background-color: var(--color-bg-secondary, #f3f4f6);
}

.notebook-card__cover-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Overlay avec actions (visible au survol) */
.notebook-card__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.notebook-card:hover .notebook-card__overlay {
  opacity: 1;
}

/* Badges */
.notebook-card__badges {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  z-index: 1;
}

.notebook-card__type-badge,
.notebook-card__permission-badge {
  font-size: 0.75rem;
  font-weight: 600;
}

/* En-tête */
.notebook-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notebook-card__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Contenu */
.notebook-card__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notebook-card__description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
}

.notebook-card__description--empty {
  font-style: italic;
  opacity: 0.6;
}

.notebook-card__meta {
  font-size: 0.875rem;
  color: var(--color-text-tertiary, #9ca3af);
}

.notebook-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.notebook-card__meta-separator {
  color: var(--color-text-tertiary, #9ca3af);
}

.notebook-card__dates {
  padding-top: 8px;
  border-top: 1px solid var(--color-border, #e5e7eb);
  font-size: 0.75rem;
  color: var(--color-text-tertiary, #9ca3af);
}

.notebook-card__date {
  display: block;
}

/* Responsive */
@media (max-width: 768px) {
  .notebook-card__title {
    font-size: 1rem;
  }

  .notebook-card__description {
    font-size: 0.8125rem;
  }
}
</style>
