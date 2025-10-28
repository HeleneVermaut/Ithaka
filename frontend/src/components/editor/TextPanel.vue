<template>
  <div class="text-panel-container">
    <!-- Header -->
    <div class="panel-header">
      <h3 class="panel-title">
        {{ isAdding ? 'Ajouter un texte' : 'Modifier le texte' }}
      </h3>
      <button v-if="!isAdding" class="close-button" @click="$emit('close')" title="Fermer">
        ×
      </button>
    </div>

    <!-- Form container -->
    <form @submit.prevent="handleSubmit" class="text-form">
      <!-- Text content -->
      <div class="form-group">
        <label for="text-content" class="form-label">
          Texte
          <span class="required">*</span>
        </label>
        <textarea
          id="text-content"
          v-model="formData.text"
          placeholder="Entrez votre texte (max 1000 caractères)"
          rows="4"
          class="form-control textarea"
          :class="{ 'is-invalid': $v.text.$invalid && $v.text.$dirty }"
          @blur="$v.text.$touch()"
        ></textarea>
        <div v-if="$v.text.$invalid && $v.text.$dirty" class="error-feedback">
          <p v-for="error of $v.text.$errors" :key="error.$uid">{{ error.$message }}</p>
        </div>
        <div class="char-counter" :class="charCountClass">
          {{ formData.text.length }}/1000
        </div>
      </div>

      <!-- Font selection -->
      <div class="form-group">
        <label for="font-select" class="form-label">
          Police
          <span class="required">*</span>
        </label>
        <FontSelector
          v-model="formData.fontFamily"
          @font-selected="onFontSelected"
          @loading-state="onFontLoadingState"
        />
      </div>

      <!-- Font size -->
      <div class="form-group">
        <label for="font-size" class="form-label">
          Taille
          <span class="required">*</span>
        </label>
        <div class="input-with-unit">
          <input
            id="font-size"
            v-model.number="formData.fontSize"
            type="number"
            min="8"
            max="200"
            placeholder="16"
            class="form-control"
            :class="{ 'is-invalid': $v.fontSize.$invalid && $v.fontSize.$dirty }"
            @blur="$v.fontSize.$touch()"
          />
          <span class="unit">px</span>
        </div>
        <div v-if="$v.fontSize.$invalid && $v.fontSize.$dirty" class="error-feedback">
          <p v-for="error of $v.fontSize.$errors" :key="error.$uid">{{ error.$message }}</p>
        </div>
        <input
          type="range"
          v-model.number="formData.fontSize"
          min="8"
          max="200"
          class="form-range"
        />
      </div>

      <!-- Color picker -->
      <div class="form-group">
        <label for="text-color" class="form-label">
          Couleur
          <span class="required">*</span>
        </label>
        <div class="color-picker-wrapper">
          <input
            id="text-color"
            v-model="formData.color"
            type="color"
            class="color-input"
            @change="$v.color.$touch()"
          />
          <input
            type="text"
            v-model="formData.color"
            placeholder="#000000"
            class="form-control hex-input"
            :class="{ 'is-invalid': $v.color.$invalid && $v.color.$dirty }"
            @blur="$v.color.$touch()"
          />
        </div>
        <div v-if="$v.color.$invalid && $v.color.$dirty" class="error-feedback">
          <p v-for="error of $v.color.$errors" :key="error.$uid">{{ error.$message }}</p>
        </div>
      </div>

      <!-- Text alignment -->
      <div class="form-group">
        <label class="form-label">Alignement</label>
        <div class="alignment-buttons">
          <button
            v-for="align in alignmentOptions"
            :key="align.value"
            type="button"
            :class="['align-button', { active: formData.textAlign === align.value }]"
            @click="formData.textAlign = align.value"
            :title="align.label"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <component :is="align.icon" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Text styles -->
      <div class="form-group">
        <label class="form-label">Styles</label>
        <div class="style-checkboxes">
          <label class="checkbox-label">
            <input
              v-model="formData.isBold"
              type="checkbox"
              class="form-checkbox"
            />
            <strong>Gras</strong>
          </label>
          <label class="checkbox-label">
            <input
              v-model="formData.isItalic"
              type="checkbox"
              class="form-checkbox"
            />
            <em>Italique</em>
          </label>
          <label class="checkbox-label">
            <input
              v-model="formData.isUnderline"
              type="checkbox"
              class="form-checkbox"
            />
            <u>Souligné</u>
          </label>
        </div>
      </div>

      <!-- Preview -->
      <div class="form-group preview-group">
        <TextPreview
          :text="formData.text"
          :font-name="formData.fontFamily"
          :font-category="currentFontCategory"
          :font-size="formData.fontSize"
          :color="formData.color"
          :text-align="formData.textAlign"
          :is-bold="formData.isBold"
          :is-italic="formData.isItalic"
          :is-underline="formData.isUnderline"
        />
      </div>

      <!-- Action buttons -->
      <div class="form-actions">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="$v.$invalid || isFontsLoading"
        >
          {{ isAdding ? 'Ajouter au canvas' : 'Modifier' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          @click="handleSaveToLibrary"
          :disabled="$v.$invalid || isFontsLoading"
          title="Sauvegarder ce style dans votre bibliothèque"
        >
          Sauvegarder le style
        </button>
        <button
          v-if="!isAdding && selectedElement"
          type="button"
          class="btn btn-danger"
          @click="$emit('deleteRequested')"
          title="Supprimer cet élément"
        >
          Supprimer l'élément
        </button>
        <button
          v-if="!isAdding"
          type="button"
          class="btn btn-outline"
          @click="$emit('cancel')"
        >
          Annuler
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import useVuelidate from '@vuelidate/core'
import { required, minValue, maxValue } from '@vuelidate/validators'
import { validateTextContent, validateColorHex } from '@/composables/useValidation'
import TextPreview from './TextPreview.vue'
import FontSelector from './FontSelector.vue'
import type { Font } from '@/services/fontService'

/**
 * Props du composant
 */
interface Props {
  /** Élément sélectionné pour modification (optionnel) */
  selectedElement?: { text: string; fontFamily: string; fontSize: number; color: string }
  /** Mode d'ajout ou modification */
  isAdding?: boolean
}

/**
 * Emits du composant
 */
interface Emits {
  /** Émis quand le texte est ajouté */
  'textAdded': [text: string, fontSize: number, color: string, fontFamily: string, fontCategory: Font['category'], styles: TextStyles]
  /** Émis quand le texte est modifié */
  'textUpdated': [text: string, fontSize: number, color: string]
  /** Émis quand le style est sauvegardé */
  'savedToLibrary': [style: TextStyle]
  /** Émis pour fermer le panel */
  'close': []
  /** Émis pour annuler */
  'cancel': []
  /** Émis quand l'utilisateur demande la suppression de l'élément */
  'deleteRequested': []
}

interface TextStyles {
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
}

interface TextStyle {
  fontFamily: string
  fontSize: number
  color: string
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isAdding: true
})

const emit = defineEmits<Emits>()

/**
 * Options d'alignement disponibles
 */
const alignmentOptions = [
  { value: 'left' as const, label: 'Gauche', icon: 'AlignLeftIcon' },
  { value: 'center' as const, label: 'Centre', icon: 'AlignCenterIcon' },
  { value: 'right' as const, label: 'Droite', icon: 'AlignRightIcon' }
]

/**
 * Données du formulaire
 */
const formData = reactive({
  text: props.selectedElement?.text || '',
  fontFamily: props.selectedElement?.fontFamily || 'Open Sans',
  fontSize: props.selectedElement?.fontSize || 16,
  color: props.selectedElement?.color || '#000000',
  textAlign: 'left' as 'left' | 'center' | 'right',
  isBold: false,
  isItalic: false,
  isUnderline: false
})

const isFontsLoading = ref(false)
const currentFontCategory = ref<Font['category']>('sans-serif')

/**
 * Validateurs personnalisés
 */
const validators = {
  text: {
    required,
    custom: (value: string) => validateTextContent(value).valid
  },
  fontSize: {
    required,
    minValue: minValue(8),
    maxValue: maxValue(200)
  },
  color: {
    required,
    custom: (value: string) => validateColorHex(value).valid
  }
}

const $v = useVuelidate(validators, formData)

/**
 * Classe CSS pour le compteur de caractères
 */
const charCountClass = computed(() => {
  const remaining = 1000 - formData.text.length
  if (remaining < 50) return 'danger'
  if (remaining < 100) return 'warning'
  return 'normal'
})

/**
 * Callback quand une police est sélectionnée
 */
function onFontSelected(font: Font): void {
  currentFontCategory.value = font.category
}

/**
 * Callback pour l'état de chargement des polices
 */
function onFontLoadingState(isLoading: boolean): void {
  isFontsLoading.value = isLoading
}

/**
 * Traite la soumission du formulaire
 */
async function handleSubmit(): Promise<void> {
  // Valider le formulaire
  const isValid = await $v.value.$validate()

  if (!isValid) {
    console.warn('Formulaire invalide')
    return
  }

  if (props.isAdding) {
    emit('textAdded', formData.text, formData.fontSize, formData.color, formData.fontFamily, currentFontCategory.value, {
      isBold: formData.isBold,
      isItalic: formData.isItalic,
      isUnderline: formData.isUnderline
    })
  } else {
    emit('textUpdated', formData.text, formData.fontSize, formData.color)
  }
}

/**
 * Sauvegarde le style dans la bibliothèque
 */
function handleSaveToLibrary(): void {
  const isValid = $v.value.$validate()

  if (!isValid) {
    console.warn('Formulaire invalide')
    return
  }

  emit('savedToLibrary', {
    fontFamily: formData.fontFamily,
    fontSize: formData.fontSize,
    color: formData.color,
    isBold: formData.isBold,
    isItalic: formData.isItalic,
    isUnderline: formData.isUnderline
  })
}
</script>

<style scoped>
.text-panel-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 90vh;
  overflow-y: auto;
  animation: fadeIn 0.4s ease;
}

/* Animation de fondu entrant */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 12px;
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #333;
  }
}

/* Form */
.text-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Form groups */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 4px;
}

.required {
  color: #d32f2f;
}

/* Form controls */
.form-control {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #1976d2;
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
  }

  &.is-invalid {
    border-color: #d32f2f;
    background-color: #ffebee;
  }
}

.textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

/* Character counter */
.char-counter {
  font-size: 12px;
  font-weight: 500;
  text-align: right;
  padding: 4px 0;
  color: #666;
  transition: all 0.2s ease;

  &.warning {
    color: #f57c00;
  }

  &.danger {
    color: #d32f2f;
  }
}

/* Input with unit */
.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.form-range {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #1976d2;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #1976d2;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

/* Color picker */
.color-picker-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.color-input {
  width: 50px;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.hex-input {
  flex: 1;
}

/* Alignment buttons */
.alignment-buttons {
  display: flex;
  gap: 8px;
}

.align-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;

  &:hover {
    border-color: #999;
    color: #333;
  }

  &.active {
    background: #333;
    color: white;
    border-color: #333;
  }

  svg {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* Style checkboxes */
.style-checkboxes {
  display: flex;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #1976d2;
}

/* Preview group */
.preview-group {
  border-top: 2px solid #f0f0f0;
  padding-top: 16px;
}

/* Error feedback */
.error-feedback {
  padding: 8px 12px;
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 4px;
  color: #c62828;
  font-size: 13px;

  p {
    margin: 0;

    &:not(:last-child) {
      margin-bottom: 4px;
    }
  }
}

/* Action buttons */
.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 2px solid #f0f0f0;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: #1976d2;
  color: white;

  &:hover:not(:disabled) {
    background: #1565c0;
  }
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;

  &:hover:not(:disabled) {
    background: #eeeeee;
  }
}

.btn-outline {
  background: transparent;
  color: #666;
  border: 1px solid #ddd;

  &:hover:not(:disabled) {
    background: #f5f5f5;
  }
}

/* Effet cascade pour champs formulaire */
:deep(.form-group) {
  animation: slideIn 0.3s ease;
  animation-fill-mode: backwards;
}

:deep(.form-group:nth-child(1)) { animation-delay: 0.05s; }
:deep(.form-group:nth-child(2)) { animation-delay: 0.1s; }
:deep(.form-group:nth-child(3)) { animation-delay: 0.15s; }
:deep(.form-group:nth-child(4)) { animation-delay: 0.2s; }
:deep(.form-group:nth-child(5)) { animation-delay: 0.25s; }

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Animation boutons */
button {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

button:active {
  transform: scale(0.98);
}

/* Responsive */
@media (max-width: 768px) {
  .text-panel-container {
    max-height: 80vh;
  }

  .form-actions {
    flex-direction: column;
  }

  .alignment-buttons,
  .style-checkboxes {
    flex-wrap: wrap;
  }
}
</style>
