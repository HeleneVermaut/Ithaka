<script setup lang="ts">
/**
 * Composant MediaUpload - Upload de médias (images) pour les pages
 *
 * Ce composant permet aux utilisateurs d'uploader des images sur une page
 * via drag-and-drop ou sélection de fichier. Il valide les fichiers,
 * affiche une prévisualisation, suit la progression de l'upload, et gère
 * les erreurs de manière utilisateur-friendly.
 *
 * Fonctionnalités :
 * - Drag & drop de fichiers images
 * - Click pour sélectionner un fichier
 * - Preview de l'image avant upload
 * - Barre de progression pendant l'upload
 * - Validation format (JPEG, PNG, SVG) et taille (max 10MB)
 * - Messages d'erreur explicites
 * - Support annulation
 *
 * Émissions :
 * - uploaded(element: IPageElement) - Émis quand l'upload est complété avec succès
 * - error(message: string) - Émis en cas d'erreur de validation ou d'upload
 * - cancel() - Émis quand l'utilisateur annule l'opération
 */

import { ref, computed } from 'vue'
import { NButton, NProgress, NAlert, NSpace, NImage } from 'naive-ui'
import mediaService from '@/services/mediaService'
import type { IPageElement } from '@/types/models'

// ========================================
// PROPS & EMITS
// ========================================

interface Props {
  /** UUID de la page où l'élément sera créé */
  pageId: string
  /** Désactive le composant (optionnel) */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  /** Émis quand l'upload est complété avec succès */
  (e: 'uploaded', element: IPageElement): void
  /** Émis en cas d'erreur de validation ou d'upload */
  (e: 'error', message: string): void
  /** Émis quand l'utilisateur annule l'opération */
  (e: 'cancel'): void
}>()

// ========================================
// CONSTANTS
// ========================================

/** Taille maximale des fichiers en octets (10 MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Types MIME acceptés pour les images */
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']

/** Extensions de fichiers acceptées (pour affichage utilisateur) */
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.svg'

// ========================================
// STATE
// ========================================

/** Fichier sélectionné par l'utilisateur */
const selectedFile = ref<File | null>(null)

/** Preview de l'image en base64 */
const imagePreview = ref<string>('')

/** Indicateur de drag over */
const isDragging = ref<boolean>(false)

/** Indicateur d'upload en cours */
const isUploading = ref<boolean>(false)

/** Pourcentage de progression de l'upload (0-100) */
const uploadProgress = ref<number>(0)

/** Message d'erreur courant */
const errorMessage = ref<string>('')

// ========================================
// COMPUTED
// ========================================

/** Indique si un fichier a été sélectionné */
const hasFile = computed(() => !!selectedFile.value)

/** Indique si le bouton upload doit être désactivé */
const isUploadDisabled = computed(() => {
  return props.disabled || !hasFile.value || isUploading.value
})

/** Indique si le bouton cancel doit être désactivé */
const isCancelDisabled = computed(() => {
  return props.disabled || isUploading.value
})

/** Texte du bouton d'upload selon l'état */
const uploadButtonText = computed(() => {
  if (isUploading.value) {
    return 'Upload en cours...'
  }
  return 'Uploader'
})

// ========================================
// VALIDATION METHODS
// ========================================

/**
 * Valide le type MIME du fichier
 *
 * Vérifie que le fichier est bien une image dans les formats acceptés.
 *
 * @param file - Fichier à valider
 * @returns true si le type est valide, false sinon
 */
const validateFileType = (file: File): boolean => {
  return ACCEPTED_MIME_TYPES.includes(file.type)
}

/**
 * Valide la taille du fichier
 *
 * Vérifie que le fichier ne dépasse pas la taille maximale autorisée.
 *
 * @param file - Fichier à valider
 * @returns true si la taille est valide, false sinon
 */
const validateFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE
}

/**
 * Valide un fichier (type et taille)
 *
 * Effectue toutes les validations nécessaires sur le fichier.
 * Met à jour errorMessage en cas d'échec.
 *
 * @param file - Fichier à valider
 * @returns true si le fichier est valide, false sinon
 */
const validateFile = (file: File): boolean => {
  // Réinitialiser le message d'erreur
  errorMessage.value = ''

  // Validation du type de fichier
  if (!validateFileType(file)) {
    errorMessage.value = `Format de fichier non accepté. Veuillez sélectionner une image (JPEG, PNG ou SVG).`
    emit('error', errorMessage.value)
    return false
  }

  // Validation de la taille de fichier
  if (!validateFileSize(file)) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    errorMessage.value = `Le fichier est trop volumineux (${sizeMB} MB). La taille maximale autorisée est de 10 MB.`
    emit('error', errorMessage.value)
    return false
  }

  return true
}

// ========================================
// FILE HANDLING METHODS
// ========================================

/**
 * Convertit un fichier en URL data (base64)
 *
 * Utilise FileReader pour lire le fichier et le convertir en base64
 * afin d'afficher une prévisualisation.
 *
 * @param file - Fichier à convertir
 * @returns Promise résolvant avec la chaîne base64
 */
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Gestion de la sélection d'un fichier
 *
 * Valide le fichier, crée une prévisualisation, et met à jour l'état.
 *
 * @param file - Fichier sélectionné par l'utilisateur
 */
const handleFileSelect = async (file: File): Promise<void> => {
  // Validation
  if (!validateFile(file)) {
    return
  }

  try {
    // Conversion en base64 pour la prévisualisation
    const base64 = await convertFileToBase64(file)

    // Mise à jour de l'état
    selectedFile.value = file
    imagePreview.value = base64
    errorMessage.value = ''
  } catch (error) {
    const message = 'Erreur lors de la lecture du fichier. Veuillez réessayer.'
    errorMessage.value = message
    emit('error', message)
    console.error('File conversion error:', error)
  }
}

// ========================================
// DRAG & DROP HANDLERS
// ========================================

/**
 * Gestion du drag over
 *
 * Empêche le comportement par défaut du navigateur et active
 * l'indicateur visuel de drag.
 */
const handleDragOver = (event: DragEvent): void => {
  event.preventDefault()
  if (!props.disabled && !isUploading.value) {
    isDragging.value = true
  }
}

/**
 * Gestion du drag leave
 *
 * Désactive l'indicateur visuel de drag.
 */
const handleDragLeave = (): void => {
  isDragging.value = false
}

/**
 * Gestion du drop
 *
 * Récupère le fichier droppé et le traite.
 */
const handleDrop = async (event: DragEvent): Promise<void> => {
  event.preventDefault()
  isDragging.value = false

  if (props.disabled || isUploading.value) {
    return
  }

  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    await handleFileSelect(files[0])
  }
}

/**
 * Gestion du changement de l'input file
 *
 * Récupère le fichier sélectionné via l'input et le traite.
 */
const handleInputChange = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    await handleFileSelect(target.files[0])
  }
}

// ========================================
// UPLOAD METHODS
// ========================================

/**
 * Lance l'upload du fichier vers le backend
 *
 * Utilise mediaService pour uploader le fichier avec suivi de progression.
 * Émet l'événement 'uploaded' en cas de succès ou 'error' en cas d'échec.
 */
const handleUpload = async (): Promise<void> => {
  if (!selectedFile.value || isUploading.value) {
    return
  }

  isUploading.value = true
  uploadProgress.value = 0
  errorMessage.value = ''

  try {
    // Upload avec suivi de progression
    const element = await mediaService.uploadMedia(
      selectedFile.value,
      props.pageId,
      (percent: number) => {
        uploadProgress.value = percent
      }
    )

    // Succès : émettre l'élément créé et réinitialiser
    emit('uploaded', element)
    resetState()
  } catch (error: any) {
    // Erreur : afficher un message explicite
    const message = error.message || 'Erreur lors de l\'upload du média. Veuillez réessayer.'
    errorMessage.value = message
    emit('error', message)
    console.error('Upload error:', error)
  } finally {
    isUploading.value = false
  }
}

/**
 * Annule l'opération en cours
 *
 * Réinitialise l'état et émet l'événement 'cancel'.
 */
const handleCancel = (): void => {
  resetState()
  emit('cancel')
}

/**
 * Réinitialise l'état du composant
 *
 * Efface le fichier sélectionné, la prévisualisation, la progression
 * et les erreurs.
 */
const resetState = (): void => {
  selectedFile.value = null
  imagePreview.value = ''
  uploadProgress.value = 0
  errorMessage.value = ''
  isDragging.value = false
  isUploading.value = false
}
</script>

<template>
  <div class="media-upload">
    <!-- Zone de drag-and-drop ou preview -->
    <div
      v-if="!hasFile"
      class="media-upload__dropzone"
      :class="{
        'media-upload__dropzone--dragging': isDragging,
        'media-upload__dropzone--disabled': disabled
      }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <!-- Input file caché -->
      <input
        type="file"
        :accept="ACCEPTED_EXTENSIONS"
        class="media-upload__input"
        :disabled="disabled"
        @change="handleInputChange"
      />

      <!-- Contenu de la dropzone -->
      <div class="media-upload__content">
        <div class="media-upload__icon">📤</div>
        <div class="media-upload__text">
          Glissez une image ici ou cliquez pour sélectionner
        </div>
        <div class="media-upload__hint">JPEG, PNG ou SVG - Max 10 MB</div>
      </div>
    </div>

    <!-- Preview de l'image sélectionnée -->
    <div v-else class="media-upload__preview">
      <n-image
        :src="imagePreview"
        alt="Preview"
        class="media-upload__preview-image"
        :preview-disabled="false"
      />
      <div class="media-upload__filename">
        {{ selectedFile?.name }}
      </div>
    </div>

    <!-- Barre de progression pendant l'upload -->
    <div v-if="isUploading" class="media-upload__progress">
      <n-progress
        type="line"
        :percentage="uploadProgress"
        :show-indicator="true"
        status="success"
        processing
      />
      <div class="media-upload__progress-text">
        Upload en cours... {{ uploadProgress }}%
      </div>
    </div>

    <!-- Message d'erreur -->
    <n-alert
      v-if="errorMessage"
      type="error"
      :title="'Erreur'"
      closable
      class="media-upload__alert"
      @close="errorMessage = ''"
    >
      {{ errorMessage }}
    </n-alert>

    <!-- Boutons d'action -->
    <n-space class="media-upload__actions" justify="end">
      <n-button
        secondary
        :disabled="isCancelDisabled"
        @click="handleCancel"
      >
        Annuler
      </n-button>
      <n-button
        type="primary"
        :disabled="isUploadDisabled"
        :loading="isUploading"
        @click="handleUpload"
      >
        {{ uploadButtonText }}
      </n-button>
    </n-space>
  </div>
</template>

<style scoped>
/* ========================================
   CONTAINER
   ======================================== */
.media-upload {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

/* ========================================
   DROPZONE
   ======================================== */
.media-upload__dropzone {
  position: relative;
  width: 100%;
  min-height: 200px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #fafafa;
}

.media-upload__dropzone:hover:not(.media-upload__dropzone--disabled) {
  border-color: #18a058;
  background-color: #f0f9ff;
}

.media-upload__dropzone--dragging {
  border-color: #18a058;
  background-color: #e6f7ff;
  border-style: solid;
}

.media-upload__dropzone--disabled {
  cursor: not-allowed;
  opacity: 0.5;
  background-color: #f5f5f5;
}

/* ========================================
   INPUT FILE
   ======================================== */
.media-upload__input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.media-upload__input:disabled {
  cursor: not-allowed;
}

/* ========================================
   DROPZONE CONTENT
   ======================================== */
.media-upload__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  padding: 20px;
  text-align: center;
}

.media-upload__icon {
  font-size: 48px;
  color: #18a058;
}

.media-upload__text {
  font-size: 14px;
  color: #333333;
  font-weight: 500;
}

.media-upload__hint {
  font-size: 12px;
  color: #999999;
}

/* ========================================
   PREVIEW
   ======================================== */
.media-upload__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
}

.media-upload__preview-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
  object-fit: contain;
}

.media-upload__filename {
  font-size: 14px;
  color: #666666;
  word-break: break-all;
  text-align: center;
}

/* ========================================
   PROGRESS
   ======================================== */
.media-upload__progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.media-upload__progress-text {
  font-size: 14px;
  color: #666666;
  text-align: center;
}

/* ========================================
   ALERT
   ======================================== */
.media-upload__alert {
  margin-bottom: 0;
}

/* ========================================
   ACTIONS
   ======================================== */
.media-upload__actions {
  width: 100%;
}

/* ========================================
   RESPONSIVE
   ======================================== */
@media (max-width: 768px) {
  .media-upload__dropzone {
    min-height: 180px;
  }

  .media-upload__icon {
    font-size: 36px;
  }

  .media-upload__text {
    font-size: 13px;
  }

  .media-upload__hint {
    font-size: 11px;
  }

  .media-upload__preview-image {
    max-height: 200px;
  }
}
</style>
