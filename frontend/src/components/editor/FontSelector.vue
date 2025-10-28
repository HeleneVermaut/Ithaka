<template>
  <div class="font-selector-container">
    <!-- Loading state -->
    <div v-if="isLoadingFonts" class="loading-state">
      <div class="spinner"></div>
      <span>Chargement des polices...</span>
    </div>

    <!-- Font selection dropdown -->
    <div v-else class="font-selector-wrapper">
      <!-- Category tabs -->
      <div class="category-tabs">
        <button
          v-for="category in categories"
          :key="category"
          :class="['tab-button', { active: activeCategory === category }]"
          @click="activeCategory = category"
          :disabled="isLoadingFonts"
        >
          {{ categoryLabel(category) }}
        </button>
      </div>

      <!-- Font list dropdown -->
      <div class="font-list-container">
        <div class="selected-font">
          <span class="font-preview" :style="{ fontFamily: currentFontFamily }">
            {{ selectedFont.name }}
          </span>
          <svg class="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <!-- Font options dropdown -->
        <div v-if="showDropdown" class="font-dropdown">
          <div
            v-for="font in fontsByCategory"
            :key="font.family"
            :class="['font-option', { selected: font.family === selectedFont.family }]"
            @click="selectFont(font)"
            :style="{ fontFamily: getFontFamily(font.family) }"
          >
            {{ font.name }}
          </div>

          <!-- No fonts available message -->
          <div v-if="fontsByCategory.length === 0" class="no-fonts">
            Aucune police disponible
          </div>
        </div>
      </div>

      <!-- Loading info -->
      <div class="loading-info">
        <small class="text-muted">
          Polices chargées: {{ loadedCount }}/{{ totalCount }}
          <span v-if="!allFontsLoaded" class="loading-indicator">...</span>
        </small>
      </div>

      <!-- Error message if fonts failed to load -->
      <div v-if="hasError && showErrorMessage" class="error-message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"></circle>
          <text x="12" y="16" text-anchor="middle" fill="white" font-size="12">!</text>
        </svg>
        <span>Certaines polices n'ont pas pu être chargées. Les polices système sont utilisées.</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  getFonts,
  getFontStyle,
  initializeFonts,
  getFontsLoadingState,
  areFontsLoaded,
  type Font
} from '@/services/fontService'

/**
 * Props du composant FontSelector
 */
interface Props {
  /** Police sélectionnée (family) */
  modelValue?: string
  /** Catégorie initialement sélectionnée */
  initialCategory?: Font['category']
}

/**
 * Emits du composant
 */
interface Emits {
  /** Émis quand une police est sélectionnée */
  'update:modelValue': [value: string]
  /** Émis quand une police est sélectionnée (avec détails) */
  'font-selected': [font: Font]
  /** Émis quand le chargement commence/se termine */
  'loading-state': [isLoading: boolean]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'Open Sans',
  initialCategory: 'sans-serif'
})

const emit = defineEmits<Emits>()

/**
 * État local du composant
 */
const activeCategory = ref<Font['category']>(props.initialCategory)
const showDropdown = ref(false)
const isLoadingFonts = ref(true)
const hasError = ref(false)
const showErrorMessage = ref(false)
const allFonts = ref<Font[]>([])
const loadedCount = ref(0)
const totalCount = ref(0)

/**
 * Catégories disponibles
 */
const categories = ref<Font['category'][]>(['sans-serif', 'serif', 'display', 'handwriting', 'monospace'])

/**
 * Initialise le chargement des polices au montage du composant
 */
onMounted(async () => {
  emit('loading-state', true)
  isLoadingFonts.value = true

  try {
    // Initialiser les polices Google
    await initializeFonts()

    // Récupérer la liste des polices
    allFonts.value = getFonts()
    totalCount.value = allFonts.value.length

    // Mettre à jour l'état de chargement
    updateLoadingState()

    // Si pas complètement chargé, montrer un warning après 10s
    const checkTimeout = setTimeout(() => {
      if (!areFontsLoaded()) {
        hasError.value = true
        showErrorMessage.value = true
      }
      clearTimeout(checkTimeout)
    }, 10000)
  } catch (error) {
    console.error('Error initializing fonts:', error)
    hasError.value = true
    showErrorMessage.value = true
  } finally {
    isLoadingFonts.value = false
    emit('loading-state', false)
  }
})

/**
 * Surveille les changements du modelValue externe
 */
watch(
  () => props.modelValue,
  (newValue: string | undefined) => {
    if (newValue && newValue !== selectedFont.value.family) {
      const font = allFonts.value.find((f) => f.family === newValue)
      if (font) {
        selectedFont.value = font
      }
    }
  }
)

/**
 * Met à jour l'état de chargement des polices
 */
function updateLoadingState(): void {
  const state = getFontsLoadingState()
  loadedCount.value = state.loadedCount
  totalCount.value = state.totalCount
}

/**
 * Police sélectionnée actuellement
 */
const selectedFont = ref<Font>(
  allFonts.value.find((f) => f.family === props.modelValue) || {
    name: 'Open Sans',
    family: 'Open Sans',
    category: 'sans-serif'
  }
)

/**
 * Polices pour la catégorie active
 */
const fontsByCategory = computed(() => {
  return allFonts.value.filter((font) => font.category === activeCategory.value)
})

/**
 * État de chargement complet
 */
const allFontsLoaded = computed(() => {
  return loadedCount.value === totalCount.value
})

/**
 * Sélectionne une police
 */
function selectFont(font: Font): void {
  selectedFont.value = font
  activeCategory.value = font.category
  showDropdown.value = false
  emit('update:modelValue', font.family)
  emit('font-selected', font)
}

/**
 * Obtient la famille de police avec fallback
 */
function getFontFamily(fontFamily: string): string {
  const font = allFonts.value.find((f) => f.family === fontFamily)
  if (!font) return fontFamily
  return getFontStyle(fontFamily, font.category)
}

/**
 * Famille de police courante
 */
const currentFontFamily = computed(() => {
  return getFontFamily(selectedFont.value.family)
})

/**
 * Label lisible pour une catégorie
 */
function categoryLabel(category: Font['category']): string {
  const labels: Record<Font['category'], string> = {
    'sans-serif': 'Sans-serif',
    serif: 'Serif',
    display: 'Display',
    handwriting: 'Manuscrit',
    monospace: 'Monospace'
  }
  return labels[category] || category
}

/**
 * Ferme le dropdown quand on clique en dehors
 */
const handleClickOutside = (event: MouseEvent): void => {
  const target = event.target as HTMLElement
  if (!target.closest('.font-selector-container')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

// Cleanup
import { onUnmounted } from 'vue'
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.font-selector-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Loading state */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background: #f0f0f0;
  border-radius: 6px;
  color: #666;
  font-size: 14px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ddd;
  border-top-color: #666;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Selector wrapper */
.font-selector-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Category tabs */
.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: #999;
    color: #333;
  }

  &.active {
    background: #333;
    color: white;
    border-color: #333;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* Font list container */
.font-list-container {
  position: relative;
}

.selected-font {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #999;
    background: #fafafa;
  }
}

.font-preview {
  font-size: 14px;
  font-weight: 500;
}

.dropdown-icon {
  margin-left: 8px;
  transition: transform 0.2s ease;
}

.selected-font:hover .dropdown-icon {
  transform: translateY(2px);
}

/* Font dropdown */
.font-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 6px 6px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.font-option {
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f5f5f5;
  }

  &.selected {
    background: #e3f2fd;
    font-weight: 600;
    color: #1976d2;
  }
}

.no-fonts {
  padding: 12px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

/* Loading info */
.loading-info {
  display: flex;
  justify-content: flex-end;
  padding: 0 4px;
}

.text-muted {
  color: #999;
  font-size: 12px;
}

.loading-indicator {
  display: inline-block;
  margin-left: 2px;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0.3;
  }
}

/* Error message */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  color: #856404;
  font-size: 13px;

  svg {
    flex-shrink: 0;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .category-tabs {
    gap: 6px;
  }

  .tab-button {
    padding: 5px 10px;
    font-size: 12px;
  }

  .font-dropdown {
    max-height: 200px;
  }
}
</style>
