<script setup lang="ts">
/**
 * Composant PhotoUpload - Upload de photo de profil avec preview
 *
 * Fonctionnalités :
 * - Drag & drop d'image
 * - Click pour sélectionner un fichier
 * - Preview de l'image avant upload
 * - Validation format (JPEG, PNG) et taille (max 2MB)
 * - Conversion automatique en base64
 *
 * Émissions :
 * - update:modelValue - Émet la chaîne base64 de l'image
 * - error - Émet un message d'erreur en cas de validation échouée
 */

import { ref, computed } from 'vue'
import { NUpload, NAvatar, NText, NIcon } from 'naive-ui'
import { CloudUploadOutline } from '@vicons/ionicons5'
import { convertFileToBase64, validateImageFile } from '@/composables/useValidation'

// ========================================
// PROPS & EMITS
// ========================================

interface Props {
  /** Valeur actuelle (base64 ou URL) */
  modelValue?: string
  /** Taille de l'avatar preview (en pixels) */
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  size: 120
})

const emit = defineEmits<{
  /** Émet la chaîne base64 de l'image uploadée */
  (e: 'update:modelValue', value: string): void
  /** Émet un message d'erreur */
  (e: 'error', message: string): void
}>()

// ========================================
// STATE
// ========================================

/** Preview de l'image (base64 ou URL) */
const imagePreview = ref<string>(props.modelValue)

/** Indicateur de drag over */
const isDragging = ref<boolean>(false)

/** Indicateur de chargement */
const isUploading = ref<boolean>(false)

// ========================================
// COMPUTED
// ========================================

/** Indique si une image est présente */
const hasImage = computed(() => !!imagePreview.value)

// ========================================
// METHODS
// ========================================

/**
 * Gestion du changement de fichier
 *
 * Valide le fichier, le convertit en base64, et émet la valeur.
 *
 * @param file - Fichier image sélectionné
 */
const handleFileChange = async (file: File) => {
  isUploading.value = true

  // Validation du fichier
  const validation = validateImageFile(file)
  if (!validation.valid) {
    emit('error', validation.error!)
    isUploading.value = false
    return
  }

  try {
    // Conversion en base64
    const base64 = await convertFileToBase64(file)

    // Mise à jour du preview et émission
    imagePreview.value = base64
    emit('update:modelValue', base64)
  } catch (error) {
    emit('error', 'Erreur lors de la lecture du fichier')
    console.error('File conversion error:', error)
  } finally {
    isUploading.value = false
  }
}

/**
 * Gestion du drag over
 */
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

/**
 * Gestion du drag leave
 */
const handleDragLeave = () => {
  isDragging.value = false
}

/**
 * Gestion du drop
 */
const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false

  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    await handleFileChange(files[0])
  }
}

/**
 * Suppression de l'image
 */
const removeImage = () => {
  imagePreview.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="photo-upload">
    <!-- Preview de l'image actuelle -->
    <div v-if="hasImage" class="photo-upload__preview">
      <n-avatar
        :size="size"
        :src="imagePreview"
        class="photo-upload__avatar"
      />
      <n-text class="photo-upload__actions">
        <span @click="removeImage" class="photo-upload__action-link">
          Supprimer
        </span>
      </n-text>
    </div>

    <!-- Zone de drop -->
    <div
      v-else
      class="photo-upload__dropzone"
      :class="{ 'photo-upload__dropzone--dragging': isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        class="photo-upload__input"
        @change="(e) => {
          const target = e.target as HTMLInputElement
          if (target.files && target.files.length > 0) {
            handleFileChange(target.files[0])
          }
        }"
      />

      <div class="photo-upload__content">
        <n-icon
          :size="48"
          :component="CloudUploadOutline"
          class="photo-upload__icon"
        />
        <n-text class="photo-upload__text">
          Glissez une photo ici ou cliquez pour sélectionner
        </n-text>
        <n-text depth="3" class="photo-upload__hint">
          JPEG ou PNG, max 2MB
        </n-text>
      </div>
    </div>

    <!-- Indicateur de chargement -->
    <div v-if="isUploading" class="photo-upload__loading">
      Chargement...
    </div>
  </div>
</template>

<style scoped>
.photo-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.photo-upload__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.photo-upload__avatar {
  border: 2px solid #e0e0e0;
}

.photo-upload__actions {
  font-size: 14px;
}

.photo-upload__action-link {
  color: #d32f2f;
  cursor: pointer;
  text-decoration: underline;
}

.photo-upload__action-link:hover {
  color: #b71c1c;
}

.photo-upload__dropzone {
  position: relative;
  width: 300px;
  height: 200px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.photo-upload__dropzone:hover {
  border-color: #18a058;
  background-color: #f0f9ff;
}

.photo-upload__dropzone--dragging {
  border-color: #18a058;
  background-color: #e6f7ff;
}

.photo-upload__input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.photo-upload__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.photo-upload__icon {
  color: #18a058;
}

.photo-upload__text {
  font-size: 14px;
  text-align: center;
}

.photo-upload__hint {
  font-size: 12px;
  text-align: center;
}

.photo-upload__loading {
  font-size: 14px;
  color: #666;
}

/* Responsive */
@media (max-width: 768px) {
  .photo-upload__dropzone {
    width: 100%;
    max-width: 300px;
  }
}
</style>
