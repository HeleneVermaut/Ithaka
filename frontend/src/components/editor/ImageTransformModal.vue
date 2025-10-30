<script setup lang="ts">
/**
 * ImageTransformModal Component - Modal de transformation d'images
 *
 * Ce composant fournit une interface complète pour transformer des images uploadées :
 * - Crop (recadrage) avec sélecteur visuel interactif
 * - Brightness (luminosité) : -100 à +100
 * - Contrast (contraste) : -100 à +100
 * - Saturation : -100 à +100
 * - Rotation : 0-360 degrés
 * - Flip horizontal et vertical
 *
 * Le composant génère une preview en temps réel en construisant des URLs Cloudinary
 * avec les paramètres de transformation. Les transformations sont ensuite appliquées
 * définitivement via l'API backend.
 *
 * Architecture:
 * - Onglets (tabs) pour organiser les différentes transformations
 * - Preview centrale avec l'image transformée et overlay de crop interactif
 * - Sliders et contrôles pour ajuster les valeurs
 * - Sélecteur de ratio d'aspect avec presets (carré, portrait, paysage)
 * - Grille 3x3 (rule of thirds) pour guidance de composition
 * - Boutons Apply/Reset/Cancel pour gérer le workflow
 *
 * Crop Tool Features:
 * - Visualisation interactive de la zone de crop avec overlay
 * - 8 poignées draggables (4 coins + 4 bords) pour redimensionner
 * - Grille 3x3 pour aider à la composition
 * - Presets de ratio d'aspect : carré, portrait, paysage, personnalisé, libre
 * - Snapping à grille (10px) pour précision
 * - Raccourcis clavier (flèches pour ajustements fins)
 * - Affichage en temps réel des dimensions (largeur x hauteur)
 *
 * Workflow:
 * 1. Utilisateur ajuste les transformations via les contrôles
 * 2. Preview mise à jour en temps réel via Cloudinary URL
 * 3. Click sur Apply → Appel API backend → Mise à jour de l'élément
 * 4. Émission de l'événement 'applied' au parent
 *
 * @component
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  NModal,
  NCard,
  NTabs,
  NTabPane,
  NSlider,
  NInputNumber,
  NButton,
  NSpace,
  NImage,
  NGrid,
  NGridItem,
  NText,
  NSelect,
  useMessage
} from 'naive-ui'
import mediaService from '@/services/mediaService'
import pageElementService from '@/services/pageElementService'
import { useCropTool, type AspectRatioPreset } from '@/composables/useCropTool'
import type { ITransformations } from '@/types/models'

// ========================================
// PROPS & EMITS
// ========================================

interface Props {
  /** UUID de l'élément image à transformer */
  elementId: string
  /** URL Cloudinary de l'image originale */
  imageUrl: string
  /** Contrôle l'affichage de la modal */
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Émis pour contrôler l'affichage de la modal */
  'update:show': [value: boolean]
  /** Émis quand les transformations sont appliquées avec succès */
  applied: [transformations: ITransformations]
  /** Émis quand l'utilisateur annule */
  cancel: []
}>()

// ========================================
// COMPOSABLES
// ========================================

/** Instance du message provider NaiveUI pour les notifications */
const message = useMessage()

// ========================================
// STATE - Image Metadata
// ========================================

/**
 * Largeur originale de l'image en pixels
 *
 * Extraite de la réponse de l'image Cloudinary pour initialiser le crop tool.
 */
const imageWidth = ref<number>(800)

/**
 * Hauteur originale de l'image en pixels
 *
 * Extraite de la réponse de l'image Cloudinary pour initialiser le crop tool.
 */
const imageHeight = ref<number>(600)

/**
 * État de chargement des métadonnées de l'image
 *
 * Utilisé pour afficher un loader pendant que l'image se charge.
 */
const imageMetadataLoading = ref<boolean>(true)

/**
 * Référence à l'élément DOM du conteneur de crop
 *
 * Utilisée pour les calculs de position souris relative au crop.
 */
const cropContainerRef = ref<HTMLElement | null>(null)

/**
 * État d'activation du mode crop interactif
 *
 * Lorsque true, le mode crop est activé et la grille/poignées sont visibles.
 */
const cropModeActive = ref<boolean>(false)

// ========================================
// STATE - Transformations
// ========================================

/**
 * Transformations courantes sélectionnées par l'utilisateur
 *
 * Ces valeurs sont mises à jour en temps réel lors de l'interaction
 * avec les contrôles (sliders, inputs, etc.)
 */
const currentTransformations = ref<ITransformations>({
  brightness: 0,
  contrast: 0,
  saturation: 0,
  rotation: 0
})

/**
 * État de flip (retournement)
 *
 * Permet de retourner l'image horizontalement ou verticalement
 */
const flipHorizontal = ref<boolean>(false)
const flipVertical = ref<boolean>(false)

// ========================================
// CROP TOOL COMPOSABLE
// ========================================

/**
 * Utilise le composable useCropTool pour gérer tous les aspects du crop interactif
 *
 * Le composable est réinitialisé chaque fois que imageWidth ou imageHeight change
 * (par exemple quand l'image est chargée).
 */
const cropTool = computed(() => {
  return useCropTool(imageWidth.value, imageHeight.value)
})

// ========================================
// STATE - UI
// ========================================

/** Indicateur de traitement en cours (appel API) */
const isProcessing = ref<boolean>(false)

/** Onglet actif dans les tabs */
const activeTab = ref<string>('brightness')

/**
 * Options de sélection pour les presets de ratio d'aspect
 *
 * Fournit les choix disponibles pour le sélecteur de ratio d'aspect
 * avec descriptions lisibles pour l'utilisateur.
 */
const aspectRatioOptions = computed(() => [
  { label: 'Libre (pas de contrainte)', value: 'free' },
  { label: 'Carré (1:1)', value: 'square' },
  { label: 'Portrait (3:4)', value: 'portrait_3_4' },
  { label: 'Portrait (9:16)', value: 'portrait_9_16' },
  { label: 'Paysage (16:9)', value: 'landscape_16_9' },
  { label: 'Paysage (4:3)', value: 'landscape_4_3' },
  { label: 'Personnalisé', value: 'custom' },
])

// ========================================
// COMPUTED - Preview URL
// ========================================

/**
 * Construit l'URL Cloudinary avec les transformations pour la preview
 *
 * Cette fonction génère une URL Cloudinary en ajoutant les paramètres de transformation
 * dans l'URL. Cloudinary applique ces transformations à la volée pour la preview.
 *
 * Format Cloudinary URL:
 * https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}
 *
 * Transformations supportées:
 * - e_brightness:{value} → Luminosité (-100 à 100)
 * - e_contrast:{value} → Contraste (-100 à 100)
 * - e_saturation:{value} → Saturation (-100 à 100)
 * - a_{angle} → Rotation (0-360)
 * - c_crop,x_{x},y_{y},w_{width},h_{height} → Crop
 * - a_hflip → Flip horizontal
 * - a_vflip → Flip vertical
 *
 * @returns URL complète de l'image avec transformations appliquées
 */
const previewUrl = computed(() => {
  const baseUrl = props.imageUrl

  // Si aucune transformation n'est active, retourner l'URL originale
  if (!hasTransformations.value) {
    return baseUrl
  }

  // Extraire le public_id depuis l'URL Cloudinary
  // Format: https://res.cloudinary.com/{cloud}/image/upload/{public_id}
  const urlParts = baseUrl.split('/upload/')
  if (urlParts.length !== 2) {
    console.warn('Invalid Cloudinary URL format:', baseUrl)
    return baseUrl
  }

  const [baseUrlPart, publicIdPart] = urlParts

  // Construire les paramètres de transformation Cloudinary
  const transformParams: string[] = []

  // Brightness
  if (currentTransformations.value.brightness && currentTransformations.value.brightness !== 0) {
    transformParams.push(`e_brightness:${currentTransformations.value.brightness}`)
  }

  // Contrast
  if (currentTransformations.value.contrast && currentTransformations.value.contrast !== 0) {
    transformParams.push(`e_contrast:${currentTransformations.value.contrast}`)
  }

  // Saturation
  if (currentTransformations.value.saturation && currentTransformations.value.saturation !== 0) {
    transformParams.push(`e_saturation:${currentTransformations.value.saturation}`)
  }

  // Rotation
  if (
    currentTransformations.value.rotation !== undefined &&
    currentTransformations.value.rotation !== 0
  ) {
    transformParams.push(`a_${currentTransformations.value.rotation}`)
  }

  // Crop (depuis le crop tool composable)
  const cropData = cropTool.value.getCropData()
  if (cropModeActive.value && cropData.width > 0 && cropData.height > 0) {
    transformParams.push(`c_crop,x_${cropData.x},y_${cropData.y},w_${cropData.width},h_${cropData.height}`)
  }

  // Flip horizontal
  if (flipHorizontal.value) {
    transformParams.push('a_hflip')
  }

  // Flip vertical
  if (flipVertical.value) {
    transformParams.push('a_vflip')
  }

  // Construire l'URL finale avec les transformations
  const transformString = transformParams.join(',')
  return `${baseUrlPart}/upload/${transformString}/${publicIdPart}`
})

/**
 * Indique si des transformations sont actives
 *
 * Utilisé pour déterminer si le bouton Reset doit être activé
 * et si une preview avec transformations doit être affichée
 */
const hasTransformations = computed(() => {
  const hasBasicTransforms =
    currentTransformations.value.brightness !== 0 ||
    currentTransformations.value.contrast !== 0 ||
    currentTransformations.value.saturation !== 0 ||
    currentTransformations.value.rotation !== 0

  return hasBasicTransforms || cropModeActive.value || flipHorizontal.value || flipVertical.value
})

/**
 * Dimensions actuelles du crop en pixels
 *
 * Affichées en temps réel pour que l'utilisateur voie les dimensions exactes.
 *
 * @returns {string} Format: "1200 x 800 px"
 */
const cropDimensionsDisplay = computed(() => {
  const cropData = cropTool.value.getCropData()
  return `${cropData.width} × ${cropData.height} px`
})

// ========================================
// METHODS - Transformation Actions
// ========================================

/**
 * Applique les transformations via l'API backend
 *
 * Cette fonction envoie les transformations au backend qui les applique
 * définitivement via Cloudinary. L'image transformée remplace l'originale.
 *
 * Workflow:
 * 1. Préparer l'objet transformations avec les valeurs actuelles
 * 2. Appeler mediaService.transformImage() pour appliquer les transformations
 * 3. Mettre à jour l'élément de page avec la nouvelle URL Cloudinary
 * 4. Émettre l'événement 'applied' au parent
 * 5. Fermer la modal
 *
 * En cas d'erreur, afficher une notification à l'utilisateur.
 */
const applyTransformations = async (): Promise<void> => {
  if (!hasTransformations.value) {
    message.warning('Aucune transformation à appliquer')
    return
  }

  isProcessing.value = true

  try {
    // Préparer l'objet transformations
    const transformations: ITransformations = {
      ...currentTransformations.value
    }

    // Ajouter crop si actif
    if (cropModeActive.value) {
      const cropData = cropTool.value.getCropData()
      transformations.crop = { ...cropData }
    }

    // Ajouter flip si actif
    if (flipHorizontal.value) {
      transformations.flip = 'horizontal'
    } else if (flipVertical.value) {
      transformations.flip = 'vertical'
    }

    // Appeler l'API pour transformer l'image
    const result = await mediaService.transformImage(props.elementId, transformations)

    // Mettre à jour l'élément de page avec la nouvelle URL
    await pageElementService.updatePageElement(props.elementId, {
      cloudinaryUrl: result.cloudinaryUrl
    })

    // Succès
    message.success('Transformations appliquées avec succès')
    emit('applied', transformations)
    closeModal()
  } catch (error: any) {
    console.error('Error applying transformations:', error)
    message.error(error.message || 'Erreur lors de l\'application des transformations')
  } finally {
    isProcessing.value = false
  }
}

/**
 * Réinitialise toutes les transformations aux valeurs par défaut
 *
 * Cette fonction remet tous les contrôles à zéro :
 * - Brightness, contrast, saturation → 0
 * - Rotation → 0
 * - Crop → réinitialisation du crop tool
 * - Flip horizontal et vertical → false
 *
 * La preview retourne à l'image originale.
 */
const resetTransformations = (): void => {
  currentTransformations.value = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    rotation: 0
  }
  cropModeActive.value = false
  cropTool.value.resetCrop()
  flipHorizontal.value = false
  flipVertical.value = false

  message.info('Transformations réinitialisées')
}

/**
 * Ferme la modal sans appliquer les transformations
 *
 * Émet l'événement 'cancel' et ferme la modal via 'update:show'
 */
const closeModal = (): void => {
  emit('update:show', false)
  emit('cancel')
}

// ========================================
// METHODS - Crop Handlers
// ========================================

/**
 * Active le mode crop interactif
 *
 * Initialise le crop tool et active le mode crop pour afficher
 * les poignées et la grille de composition.
 */
const enableCropMode = (): void => {
  cropModeActive.value = true
  message.info('Mode recadrage activé - Utilisez les poignées pour ajuster')
}

/**
 * Désactive le mode crop interactif
 *
 * Cache les poignées et la grille, mais conserve les paramètres de crop
 * pour la preview. Le crop peut être réactivé pour des ajustements.
 */
const disableCropMode = (): void => {
  cropModeActive.value = false
  message.info('Mode recadrage désactivé')
}

/**
 * Réinitialise le crop à son état par défaut
 *
 * Réinitialise les paramètres du crop tool (50% de l'image, centré)
 * et affiche un message de confirmation.
 */
const resetCrop = (): void => {
  cropTool.value.resetCrop()
  message.success('Recadrage réinitialisé')
}

/**
 * Change le preset de ratio d'aspect pour le crop
 *
 * @param {AspectRatioPreset} preset - Preset à appliquer
 */
const changeCropAspectRatio = (preset: AspectRatioPreset): void => {
  cropTool.value.setAspectRatio(preset)
}

/**
 * Change le ratio d'aspect personnalisé pour le crop
 *
 * @param {number} ratio - Nouveau ratio (largeur / hauteur)
 */
const changeCropCustomRatio = (ratio: number): void => {
  cropTool.value.setCustomAspectRatio(ratio)
}

/**
 * Gère les événements souris sur la zone de crop
 *
 * Délègue les événements au composable useCropTool pour gérer
 * les interactions de drag/resize des poignées.
 *
 * @param {MouseEvent} event - Événement souris
 */
const handleCropMouseDown = (event: MouseEvent): void => {
  if (cropContainerRef.value) {
    cropTool.value.handleMouseDown(event, cropContainerRef.value)
  }
}

/**
 * Gère le mouvement de la souris pendant le drag de crop
 *
 * @param {MouseEvent} event - Événement mouvement souris
 */
const handleCropMouseMove = (event: MouseEvent): void => {
  if (cropContainerRef.value && cropTool.value.isDragging) {
    cropTool.value.handleMouseMove(event, cropContainerRef.value)
  }
}

/**
 * Gère la fin du drag de crop
 */
const handleCropMouseUp = (): void => {
  cropTool.value.handleMouseUp()
}

// ========================================
// METHODS - Flip Handlers
// ========================================

/**
 * Toggle flip horizontal
 *
 * Si flip horizontal est activé, désactive flip vertical
 * (une seule direction de flip à la fois)
 */
const toggleFlipHorizontal = (): void => {
  flipHorizontal.value = !flipHorizontal.value
  if (flipHorizontal.value) {
    flipVertical.value = false
  }
}

/**
 * Toggle flip vertical
 *
 * Si flip vertical est activé, désactive flip horizontal
 * (une seule direction de flip à la fois)
 */
const toggleFlipVertical = (): void => {
  flipVertical.value = !flipVertical.value
  if (flipVertical.value) {
    flipHorizontal.value = false
  }
}

// ========================================
// WATCHERS
// ========================================

/**
 * Réinitialise les transformations quand la modal s'ouvre
 *
 * Cela garantit que l'utilisateur commence toujours avec
 * une ardoise vierge lors de l'ouverture de la modal.
 */
watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      resetTransformations()
      // Charger les métadonnées de l'image pour initialiser le crop tool
      loadImageMetadata()
    }
  }
)

// ========================================
// METHODS - Image Metadata
// ========================================

/**
 * Charge les métadonnées de l'image depuis l'URL Cloudinary
 *
 * Crée une image temporaire pour obtenir les dimensions réelles
 * qui sont utilisées pour initialiser le crop tool.
 */
const loadImageMetadata = (): void => {
  imageMetadataLoading.value = true
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    imageWidth.value = img.naturalWidth || 800
    imageHeight.value = img.naturalHeight || 600
    imageMetadataLoading.value = false
  }
  img.onerror = () => {
    // En cas d'erreur, utiliser des dimensions par défaut
    imageWidth.value = 800
    imageHeight.value = 600
    imageMetadataLoading.value = false
  }
  img.src = props.imageUrl
}

// ========================================
// LIFECYCLE HOOKS
// ========================================

/**
 * Configuration lors du montage du composant
 *
 * - Attache les gestionnaires d'événements globaux pour le crop tool
 * - Charge les métadonnées de l'image
 */
onMounted(() => {
  // Charger les métadonnées de l'image
  loadImageMetadata()

  // Activer les écouteurs d'événements globaux (clavier, etc.)
  cropTool.value.enableEventListeners()

  // Ajouter les gestionnaires d'événements souris globaux
  document.addEventListener('mousemove', handleCropMouseMove)
  document.addEventListener('mouseup', handleCropMouseUp)
})

/**
 * Nettoyage lors du démontage du composant
 *
 * - Retire les gestionnaires d'événements
 * - Nettoie les ressources
 */
onUnmounted(() => {
  document.removeEventListener('mousemove', handleCropMouseMove)
  document.removeEventListener('mouseup', handleCropMouseUp)
})
</script>

<template>
  <n-modal :show="props.show" @update:show="(value: boolean) => emit('update:show', value)">
    <n-card
      style="width: 90%; max-width: 900px"
      title="Transformations d'image"
      :bordered="false"
      size="huge"
      closable
      @close="closeModal"
    >
      <!-- Preview Section -->
      <div class="image-transform-modal__preview">
        <n-image
          :src="previewUrl"
          alt="Preview"
          class="image-transform-modal__preview-image"
          :preview-disabled="false"
        />
      </div>

      <!-- Tabs Section -->
      <n-tabs v-model:value="activeTab" type="line" animated class="image-transform-modal__tabs">
        <!-- Brightness Tab -->
        <n-tab-pane name="brightness" tab="Luminosité">
          <div class="image-transform-modal__control">
            <n-text>Brightness (-100 à +100)</n-text>
            <n-grid cols="12" x-gap="12">
              <n-grid-item span="10">
                <n-slider
                  v-model:value="currentTransformations.brightness"
                  :min="-100"
                  :max="100"
                  :step="1"
                  :tooltip="true"
                />
              </n-grid-item>
              <n-grid-item span="2">
                <n-input-number
                  v-model:value="currentTransformations.brightness"
                  :min="-100"
                  :max="100"
                  :step="1"
                  size="small"
                />
              </n-grid-item>
            </n-grid>
          </div>
        </n-tab-pane>

        <!-- Contrast Tab -->
        <n-tab-pane name="contrast" tab="Contraste">
          <div class="image-transform-modal__control">
            <n-text>Contrast (-100 à +100)</n-text>
            <n-grid cols="12" x-gap="12">
              <n-grid-item span="10">
                <n-slider
                  v-model:value="currentTransformations.contrast"
                  :min="-100"
                  :max="100"
                  :step="1"
                  :tooltip="true"
                />
              </n-grid-item>
              <n-grid-item span="2">
                <n-input-number
                  v-model:value="currentTransformations.contrast"
                  :min="-100"
                  :max="100"
                  :step="1"
                  size="small"
                />
              </n-grid-item>
            </n-grid>
          </div>
        </n-tab-pane>

        <!-- Saturation Tab -->
        <n-tab-pane name="saturation" tab="Saturation">
          <div class="image-transform-modal__control">
            <n-text>Saturation (-100 à +100)</n-text>
            <n-grid cols="12" x-gap="12">
              <n-grid-item span="10">
                <n-slider
                  v-model:value="currentTransformations.saturation"
                  :min="-100"
                  :max="100"
                  :step="1"
                  :tooltip="true"
                />
              </n-grid-item>
              <n-grid-item span="2">
                <n-input-number
                  v-model:value="currentTransformations.saturation"
                  :min="-100"
                  :max="100"
                  :step="1"
                  size="small"
                />
              </n-grid-item>
            </n-grid>
          </div>
        </n-tab-pane>

        <!-- Rotation Tab -->
        <n-tab-pane name="rotation" tab="Rotation">
          <div class="image-transform-modal__control">
            <n-text>Rotation (0-360 degrés)</n-text>
            <n-grid cols="12" x-gap="12">
              <n-grid-item span="10">
                <n-slider
                  v-model:value="currentTransformations.rotation"
                  :min="0"
                  :max="360"
                  :step="1"
                  :tooltip="true"
                />
              </n-grid-item>
              <n-grid-item span="2">
                <n-input-number
                  v-model:value="currentTransformations.rotation"
                  :min="0"
                  :max="360"
                  :step="1"
                  size="small"
                />
              </n-grid-item>
            </n-grid>
          </div>
        </n-tab-pane>

        <!-- Crop Tab -->
        <n-tab-pane name="crop" tab="Recadrage">
          <div class="image-transform-modal__control">
            <n-space vertical size="large">
              <!-- Crop Mode Toggle Buttons -->
              <n-space>
                <n-button
                  v-if="!cropModeActive"
                  type="primary"
                  @click="enableCropMode"
                >
                  Activer le recadrage interactif
                </n-button>
                <n-button
                  v-else
                  type="warning"
                  @click="disableCropMode"
                >
                  Désactiver le recadrage interactif
                </n-button>
              </n-space>

              <!-- Aspect Ratio Presets -->
              <div v-if="cropModeActive">
                <n-text strong>Ratio d'aspect</n-text>
                <n-select
                  :value="cropTool.aspectRatioPreset.value"
                  :options="aspectRatioOptions"
                  @update:value="(val) => changeCropAspectRatio(val as AspectRatioPreset)"
                  style="margin-top: 8px;"
                />
              </div>

              <!-- Custom Aspect Ratio Input -->
              <div v-if="cropModeActive && cropTool.aspectRatioPreset.value === 'custom'">
                <n-text>Ratio personnalisé (largeur / hauteur)</n-text>
                <n-input-number
                  :value="cropTool.customAspectRatio.value"
                  :min="0.1"
                  :max="10"
                  :step="0.1"
                  @update:value="(val) => changeCropCustomRatio(val || 1)"
                  style="width: 100%; margin-top: 8px;"
                />
              </div>

              <!-- Dimensions Display -->
              <div v-if="cropModeActive" class="image-transform-modal__crop-dimensions">
                <n-text strong>Dimensions actuelles: {{ cropDimensionsDisplay }}</n-text>
              </div>

              <!-- Interactive Crop Canvas -->
              <div
                v-if="cropModeActive"
                ref="cropContainerRef"
                class="image-transform-modal__crop-container"
                @mousedown="handleCropMouseDown"
              >
                <!-- Background image -->
                <img
                  :src="previewUrl"
                  alt="Crop preview"
                  class="image-transform-modal__crop-image"
                />

                <!-- Crop box overlay -->
                <div
                  class="image-transform-modal__crop-box"
                  :style="{
                    left: cropTool.cropBoxPosition.value.left,
                    top: cropTool.cropBoxPosition.value.top,
                    width: cropTool.cropBoxPosition.value.width,
                    height: cropTool.cropBoxPosition.value.height,
                  }"
                >
                  <!-- Rule of thirds grid -->
                  <svg
                    class="image-transform-modal__crop-grid"
                    :viewBox="`0 0 100 100`"
                    preserveAspectRatio="none"
                  >
                    <!-- Vertical lines (rule of thirds) -->
                    <line x1="33.333" y1="0" x2="33.333" y2="100" stroke="white" stroke-width="0.5" opacity="0.5" />
                    <line x1="66.667" y1="0" x2="66.667" y2="100" stroke="white" stroke-width="0.5" opacity="0.5" />
                    <!-- Horizontal lines (rule of thirds) -->
                    <line x1="0" y1="33.333" x2="100" y2="33.333" stroke="white" stroke-width="0.5" opacity="0.5" />
                    <line x1="0" y1="66.667" x2="100" y2="66.667" stroke="white" stroke-width="0.5" opacity="0.5" />
                  </svg>

                  <!-- Corner handles -->
                  <div
                    class="image-transform-modal__crop-handle image-transform-modal__crop-handle--tl"
                    :style="cropTool.cropHandles.value.tl"
                  />
                  <div
                    class="image-transform-modal__crop-handle image-transform-modal__crop-handle--tr"
                    :style="cropTool.cropHandles.value.tr"
                  />
                  <div
                    class="image-transform-modal__crop-handle image-transform-modal__crop-handle--bl"
                    :style="cropTool.cropHandles.value.bl"
                  />
                  <div
                    class="image-transform-modal__crop-handle image-transform-modal__crop-handle--br"
                    :style="cropTool.cropHandles.value.br"
                  />

                  <!-- Edge handles -->
                  <div
                    class="image-transform-modal__crop-handle image-transform-modal__crop-handle--t"
                    :style="cropTool.cropHandles.value.t"
                  />
                  <div
                    class="image-transform-modal__crop-handle image-transform-modal__crop-handle--r"
                    :style="cropTool.cropHandles.value.r"
                  />
                  <div
                    class="image-transform-modal__crop-handle image-transform-modal__crop-handle--b"
                    :style="cropTool.cropHandles.value.b"
                  />
                  <div
                    class="image-transform-modal__crop-handle image-transform-modal__crop-handle--l"
                    :style="cropTool.cropHandles.value.l"
                  />
                </div>

                <!-- Darken outside crop area -->
                <div class="image-transform-modal__crop-overlay" />
              </div>

              <!-- Crop Action Buttons -->
              <n-space v-if="cropModeActive" justify="center">
                <n-button
                  secondary
                  @click="resetCrop"
                >
                  Réinitialiser le recadrage
                </n-button>
              </n-space>

              <!-- Keyboard Help Text -->
              <div v-if="cropModeActive" class="image-transform-modal__crop-help">
                <n-text depth="3" style="font-size: 12px;">
                  Astuce: Utilisez les flèches du clavier pour les ajustements fins (±5px).
                  Shift + Flèches pour déplacer la zone de recadrage.
                </n-text>
              </div>
            </n-space>
          </div>
        </n-tab-pane>

        <!-- Flip Tab -->
        <n-tab-pane name="flip" tab="Retournement">
          <div class="image-transform-modal__control">
            <n-space vertical size="large">
              <n-text>Choisissez le type de retournement</n-text>

              <n-space>
                <n-button
                  :type="flipHorizontal ? 'primary' : 'default'"
                  @click="toggleFlipHorizontal"
                >
                  Flip Horizontal
                </n-button>
                <n-button
                  :type="flipVertical ? 'primary' : 'default'"
                  @click="toggleFlipVertical"
                >
                  Flip Vertical
                </n-button>
              </n-space>

              <n-text v-if="flipHorizontal || flipVertical" depth="3" style="font-size: 12px;">
                {{ flipHorizontal ? 'Retournement horizontal activé' : 'Retournement vertical activé' }}
              </n-text>
            </n-space>
          </div>
        </n-tab-pane>
      </n-tabs>

      <!-- Footer Actions -->
      <template #footer>
        <n-space justify="space-between">
          <!-- Reset Button -->
          <n-button
            secondary
            :disabled="!hasTransformations || isProcessing"
            @click="resetTransformations"
          >
            Réinitialiser
          </n-button>

          <!-- Apply and Cancel Buttons -->
          <n-space>
            <n-button
              @click="closeModal"
              :disabled="isProcessing"
            >
              Annuler
            </n-button>
            <n-button
              type="primary"
              :loading="isProcessing"
              :disabled="!hasTransformations"
              @click="applyTransformations"
            >
              Appliquer
            </n-button>
          </n-space>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
/* ========================================
   PREVIEW SECTION
   ======================================== */
.image-transform-modal__preview {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-height: 400px;
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.image-transform-modal__preview-image {
  max-width: 100%;
  max-height: 350px;
  object-fit: contain;
  border-radius: 4px;
}

/* ========================================
   TABS SECTION
   ======================================== */
.image-transform-modal__tabs {
  margin-bottom: 16px;
}

/* ========================================
   CONTROL SECTION
   ======================================== */
.image-transform-modal__control {
  padding: 16px 0;
}

/* ========================================
   CROP TOOL STYLES
   ======================================== */

/**
 * Interactive crop container with image background
 *
 * Provides a bounded area for the crop tool with position relative
 * so that absolutely positioned handles and overlays are positioned
 * relative to this container.
 */
.image-transform-modal__crop-container {
  position: relative;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 4 / 3;
  background-color: #f5f5f5;
  border: 2px solid #d0d0d0;
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
  cursor: crosshair;
  user-select: none;
}

/**
 * Background image within crop container
 *
 * Fills the container while maintaining aspect ratio and positioning
 * as the base for crop visualization.
 */
.image-transform-modal__crop-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
}

/**
 * Crop box overlay with transparent area outside and visible crop zone
 *
 * Uses absolute positioning to overlay on the crop container and follow
 * the crop tool's dynamically calculated position and size.
 */
.image-transform-modal__crop-box {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.05);
  border: 2px solid #4a90e2;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  z-index: 10;
  will-change: all;
}

/**
 * Rule of thirds grid overlay within crop box
 *
 * Shows a 3x3 grid to help users compose their crop following
 * the rule of thirds composition guideline.
 */
.image-transform-modal__crop-grid {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 5;
}

/**
 * Draggable crop handles (corners and edges)
 *
 * Small squares positioned at crop box corners and edges that enable
 * interactive resizing and moving. Each handle has a specific cursor
 * to indicate the direction of resize.
 *
 * Handles are sized 12x12 pixels with 4px border and blue styling.
 * They have a larger hit area (16x16) for better mobile UX.
 */
.image-transform-modal__crop-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: white;
  border: 2px solid #4a90e2;
  border-radius: 2px;
  z-index: 15;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: background-color 150ms ease-out;
}

/**
 * Hover state for crop handles
 *
 * Provides visual feedback when mouse hovers over handle.
 */
.image-transform-modal__crop-handle:hover {
  background-color: #4a90e2;
}

/**
 * Corner handles - 16x16 clickable area
 *
 * Positioned at the four corners of the crop box.
 */
.image-transform-modal__crop-handle--tl,
.image-transform-modal__crop-handle--tr,
.image-transform-modal__crop-handle--bl,
.image-transform-modal__crop-handle--br {
  width: 16px;
  height: 16px;
}

/**
 * Edge handles - smaller but still interactive
 *
 * Positioned on the four edges (top, right, bottom, left) of the crop box.
 */
.image-transform-modal__crop-handle--t,
.image-transform-modal__crop-handle--r,
.image-transform-modal__crop-handle--b,
.image-transform-modal__crop-handle--l {
  width: 10px;
  height: 10px;
}

/**
 * Semi-transparent overlay darkening area outside crop
 *
 * Creates visual emphasis on the crop area by darkening everything outside.
 * Positioned behind the crop box but in front of the background image.
 */
.image-transform-modal__crop-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: none;
  z-index: 1;
}

/**
 * Display area for current crop dimensions
 *
 * Shows real-time width x height in pixels for precise feedback.
 */
.image-transform-modal__crop-dimensions {
  padding: 12px;
  background-color: #f5f5f5;
  border-left: 4px solid #4a90e2;
  border-radius: 4px;
  margin: 12px 0;
}

/**
 * Keyboard shortcuts help text
 *
 * Provides user guidance for keyboard-based crop adjustments.
 */
.image-transform-modal__crop-help {
  padding: 12px;
  background-color: #e8f4f8;
  border-radius: 4px;
  margin: 12px 0;
  border-left: 4px solid #4a90e2;
}

/* ========================================
   RESPONSIVE
   ======================================== */
@media (max-width: 768px) {
  .image-transform-modal__preview {
    max-height: 300px;
  }

  .image-transform-modal__preview-image {
    max-height: 250px;
  }

  .image-transform-modal__crop-container {
    aspect-ratio: 16 / 9;
  }

  /**
   * Make handles slightly larger on mobile for easier interaction
   */
  .image-transform-modal__crop-handle {
    width: 14px;
    height: 14px;
  }

  .image-transform-modal__crop-handle--tl,
  .image-transform-modal__crop-handle--tr,
  .image-transform-modal__crop-handle--bl,
  .image-transform-modal__crop-handle--br {
    width: 18px;
    height: 18px;
  }
}
</style>
