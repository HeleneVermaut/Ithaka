<script setup lang="ts">
/**
 * ShapePicker Component
 *
 * Composant permettant de créer et personnaliser des formes géométriques
 * pour les ajouter aux pages du journal. Supporte 5 types de formes
 * avec personnalisation de la couleur et de l'opacité.
 *
 * Features:
 * - 5 formes disponibles: cercle, carré, rectangle, triangle, coeur
 * - Sélecteur de couleur (hex format) avec prévisualisation
 * - Slider d'opacité (0-100)
 * - Aperçu en temps réel de la forme stylisée
 * - Validation automatique des entrées
 * - Création d'élément via l'API pageElementService
 *
 * Usage:
 * ```vue
 * <ShapePicker
 *   :page-id="currentPageId"
 *   :x="100"
 *   :y="50"
 *   :width="80"
 *   :height="80"
 *   @added="handleShapeAdded"
 *   @cancel="closeShapePicker"
 * />
 * ```
 *
 * @component
 */

import { ref, computed } from 'vue'
import { NModal, NCard, NSpace, NButton, NSlider } from 'naive-ui'
import pageElementService from '@/services/pageElementService'
import type { IPageElement, ShapeType } from '@/types/models'

/**
 * Props interface
 * Définit toutes les propriétés requises pour créer un élément de forme
 */
interface Props {
  /** UUID de la page où ajouter la forme */
  pageId: string
  /** Position X initiale en millimètres */
  x: number
  /** Position Y initiale en millimètres */
  y: number
  /** Largeur initiale en millimètres */
  width: number
  /** Hauteur initiale en millimètres */
  height: number
}

const props = defineProps<Props>()

/**
 * Emits interface
 * Événements émis par le composant
 */
const emit = defineEmits<{
  /** Émis quand la forme est ajoutée avec succès, retourne l'élément créé */
  added: [element: IPageElement]
  /** Émis quand l'utilisateur annule la création */
  cancel: []
}>()


/**
 * État local du composant
 */

/** Forme sélectionnée par l'utilisateur */
const selectedShape = ref<ShapeType>('circle')

/** Couleur de remplissage en format hexadécimal */
const fillColor = ref<string>('#3B82F6')

/** Opacité de la forme (0-100) */
const opacity = ref<number>(100)

/** Indicateur de chargement pendant l'appel API */
const isLoading = ref<boolean>(false)

/** Contrôle l'affichage du modal */
const showModal = ref<boolean>(true)

/**
 * Configuration des formes disponibles
 * Chaque forme possède un label lisible et un path SVG pour l'affichage
 */
const shapeOptions: Array<{ type: ShapeType; label: string; path: string }> = [
  {
    type: 'circle',
    label: 'Cercle',
    // SVG path pour un cercle centré
    path: 'M50,50 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0'
  },
  {
    type: 'square',
    label: 'Carré',
    // SVG path pour un carré centré
    path: 'M15,15 L85,15 L85,85 L15,85 Z'
  },
  {
    type: 'rectangle',
    label: 'Rectangle',
    // SVG path pour un rectangle centré (horizontal)
    path: 'M10,30 L90,30 L90,70 L10,70 Z'
  },
  {
    type: 'triangle',
    label: 'Triangle',
    // SVG path pour un triangle équilatéral pointant vers le haut
    path: 'M50,15 L85,75 L15,75 Z'
  },
  {
    type: 'heart',
    label: 'Coeur',
    // SVG path pour une forme de coeur
    path: 'M50,85 C50,85 15,60 15,40 C15,25 25,15 35,15 C42,15 47,20 50,25 C53,20 58,15 65,15 C75,15 85,25 85,40 C85,60 50,85 50,85 Z'
  }
]

/**
 * Computed: Style CSS pour l'aperçu de la forme
 * Calcule dynamiquement les propriétés de style en fonction de l'état
 *
 * @returns Objet de styles inline pour l'élément SVG de prévisualisation
 */
const previewStyle = computed(() => ({
  fill: fillColor.value,
  opacity: opacity.value / 100,
  transition: 'all 0.3s ease'
}))

/**
 * Computed: Trouve la configuration de la forme actuellement sélectionnée
 *
 * @returns Configuration de la forme (type, label, path)
 */
const currentShape = computed(() => {
  return shapeOptions.find((shape) => shape.type === selectedShape.value) || shapeOptions[0]
})

/**
 * Handler: Sélectionne une forme
 * Appelé quand l'utilisateur clique sur un bouton de forme
 *
 * @param shapeType - Type de forme à sélectionner
 */
function selectShape(shapeType: ShapeType): void {
  selectedShape.value = shapeType
}

/**
 * Handler: Ajoute la forme à la page
 * Valide les données, appelle l'API pour créer l'élément,
 * puis émet l'événement 'added' avec l'élément créé
 */
async function handleAddShape(): Promise<void> {
  // Empêcher les soumissions multiples
  if (isLoading.value) return

  try {
    isLoading.value = true

    // Préparer les données de l'élément
    // L'API attend les propriétés spécifiques au type 'shape'
    const elementData = {
      pageId: props.pageId,
      type: 'shape' as const,
      x: props.x,
      y: props.y,
      width: props.width,
      height: props.height,
      rotation: 0,
      shapeType: selectedShape.value,
      fillColor: fillColor.value,
      opacity: opacity.value
    }

    // Appeler le service pour créer l'élément
    const createdElement = await pageElementService.createPageElement(elementData)

    // Émettre l'événement de succès avec l'élément créé
    emit('added', createdElement)

    // Afficher un message de succès à l'utilisateur
    window.$message?.success(`Forme ${currentShape.value.label.toLowerCase()} ajoutée avec succès`)

    // Fermer le modal après succès
    showModal.value = false
  } catch (error) {
    // Gérer les erreurs de l'API
    console.error('Error adding shape:', error)

    // Afficher un message d'erreur utilisateur-friendly
    window.$message?.error(
      "Une erreur s'est produite lors de l'ajout de la forme. Veuillez réessayer."
    )
  } finally {
    // Restaurer l'état de chargement
    isLoading.value = false
  }
}

/**
 * Handler: Annule la création de la forme
 * Ferme le modal et émet l'événement 'cancel'
 */
function handleCancel(): void {
  showModal.value = false
  emit('cancel')
}

/**
 * Handler: Gère la fermeture du modal par le backdrop ou la croix
 * Équivalent à l'annulation
 */
function handleModalClose(): void {
  handleCancel()
}
</script>

<template>
  <n-modal
    :show="showModal"
    @update:show="handleModalClose"
    :mask-closable="true"
    preset="card"
    style="width: 600px; max-width: 90vw"
  >
    <n-card title="Ajouter une forme" :bordered="false" size="large">
      <n-space vertical :size="24">
        <!-- Shape selection -->
        <div class="form-section">
          <label class="form-label">
            Forme
            <span class="required">*</span>
          </label>
          <div class="shape-selector">
            <button
              v-for="shape in shapeOptions"
              :key="shape.type"
              type="button"
              :class="['shape-button', { active: selectedShape === shape.type }]"
              @click="selectShape(shape.type)"
              :title="shape.label"
              data-testid="shape-button"
            >
              <svg
                class="shape-icon"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  :d="shape.path"
                  :fill="selectedShape === shape.type ? fillColor : '#999'"
                />
              </svg>
              <span class="shape-label">{{ shape.label }}</span>
            </button>
          </div>
        </div>

        <!-- Color picker -->
        <div class="form-section">
          <label class="form-label" for="fill-color">
            Couleur
            <span class="required">*</span>
          </label>
          <div class="color-picker-wrapper">
            <input
              id="fill-color"
              v-model="fillColor"
              type="color"
              class="color-input"
              data-testid="color-input"
            />
            <input
              v-model="fillColor"
              type="text"
              placeholder="#3B82F6"
              class="hex-input"
              maxlength="7"
              pattern="^#[0-9A-Fa-f]{6}$"
              data-testid="hex-input"
            />
          </div>
        </div>

        <!-- Opacity slider -->
        <div class="form-section">
          <label class="form-label">
            Opacité: {{ opacity }}%
            <span class="required">*</span>
          </label>
          <n-slider
            v-model:value="opacity"
            :min="0"
            :max="100"
            :step="1"
            :tooltip="false"
            data-testid="opacity-slider"
          />
        </div>

        <!-- Preview -->
        <div class="form-section">
          <label class="form-label">Aperçu</label>
          <div class="preview-container" data-testid="preview-container">
            <svg
              class="preview-svg"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path :d="currentShape.path" :style="previewStyle" />
            </svg>
          </div>
        </div>
      </n-space>

      <!-- Action buttons -->
      <template #footer>
        <n-space justify="end">
          <n-button
            @click="handleCancel"
            :disabled="isLoading"
            data-testid="cancel-button"
          >
            Annuler
          </n-button>
          <n-button
            type="primary"
            @click="handleAddShape"
            :loading="isLoading"
            data-testid="add-button"
          >
            Ajouter
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
/**
 * Section de formulaire
 * Groupe visuellement les champs avec espacement cohérent
 */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/**
 * Label de formulaire
 * Style cohérent avec le design system Ithaka
 */
.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 4px;
}

/**
 * Indicateur de champ requis
 */
.required {
  color: #d32f2f;
  font-weight: 700;
}

/**
 * Conteneur des boutons de sélection de forme
 * Grid responsive qui s'adapte à la largeur disponible
 */
.shape-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 12px;
}

/**
 * Bouton de forme individuel
 * État normal, hover, et actif avec transitions fluides
 */
.shape-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    background: #f0f7ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.1);
  }

  &.active {
    border-color: #3b82f6;
    background: #e0f0ff;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:active {
    transform: translateY(0);
  }
}

/**
 * Icône SVG de la forme dans le bouton
 */
.shape-icon {
  width: 40px;
  height: 40px;
  transition: transform 0.2s ease;
}

.shape-button:hover .shape-icon {
  transform: scale(1.1);
}

/**
 * Label textuel de la forme
 */
.shape-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
  text-align: center;
}

.shape-button.active .shape-label {
  color: #3b82f6;
  font-weight: 600;
}

/**
 * Wrapper du sélecteur de couleur
 * Combine le color picker natif et l'input texte hex
 */
.color-picker-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

/**
 * Input natif de type color
 * Stylisé pour s'intégrer au design system
 */
.color-input {
  width: 60px;
  height: 40px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #3b82f6;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

/**
 * Input texte pour la valeur hexadécimale
 * Permet la saisie manuelle du code couleur
 */
.hex-input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Monaco', 'Courier New', monospace;
  text-transform: uppercase;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:invalid {
    border-color: #d32f2f;
    background: #ffebee;
  }
}

/**
 * Conteneur de la prévisualisation
 * Affiche la forme avec ses styles appliqués en temps réel
 */
.preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  min-height: 150px;
}

/**
 * SVG de prévisualisation
 * Taille généreuse pour une bonne visibilité
 */
.preview-svg {
  width: 120px;
  height: 120px;
}

/**
 * Animation d'apparition du modal
 * Effet de fade-in et slide-down subtil
 */
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/**
 * Responsive design pour mobile
 * Adapte les tailles et le layout pour les petits écrans
 */
@media (max-width: 600px) {
  .shape-selector {
    grid-template-columns: repeat(3, 1fr);
  }

  .shape-button {
    padding: 8px;
  }

  .shape-icon {
    width: 32px;
    height: 32px;
  }

  .shape-label {
    font-size: 11px;
  }

  .preview-svg {
    width: 80px;
    height: 80px;
  }
}
</style>
