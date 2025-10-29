<script setup lang="ts">
/**
 * SaveTextModal Component
 *
 * Modal dialog for saving text snippets to the user's library.
 * Provides form validation with Vuelidate and support for organizing texts by type.
 *
 * Features:
 * - Label field validation (required, 1-100 chars)
 * - Type selection (citation, poeme, libre)
 * - Form validation with Vuelidate
 * - Save/Cancel actions
 * - Auto-reset on modal close
 */

import { ref, watch, computed } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, minLength, maxLength } from '@vuelidate/validators'
import {
  NModal,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
  NSpace,
  NAlert
} from 'naive-ui'

// ========================================
// COMPONENT PROPS
// ========================================

interface Props {
  show: boolean
  initialLabel?: string
  initialType?: string
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  initialLabel: '',
  initialType: ''
})

// ========================================
// COMPONENT EMITS
// ========================================

const emit = defineEmits<{
  'update:show': [value: boolean]
  'save': [data: { label: string; type?: string }]
}>()

// ========================================
// COMPONENT STATE
// ========================================

/**
 * Form data with label and type fields
 */
const formData = ref({
  label: props.initialLabel || '',
  type: props.initialType || ''
})

/**
 * Type options for selection
 * Maps to ISavedText SavedTextType ('citation' | 'poeme' | 'libre')
 */
const typeOptions = [
  { label: 'Citation', value: 'citation' },
  { label: 'Poème', value: 'poeme' },
  { label: 'Libre', value: 'libre' }
]

/**
 * Vuelidate validation rules
 */
const rules = {
  label: {
    required,
    minLength: minLength(1),
    maxLength: maxLength(100)
  }
}

/**
 * Create vuelidate instance
 */
const v$ = useVuelidate(rules, formData)

// ========================================
// COMPUTED PROPERTIES
// ========================================

/**
 * Check if form is valid for submission
 */
const isFormValid = computed<boolean>(() => {
  return !v$.value.$invalid && formData.value.label.trim().length > 0
})

/**
 * Get validation error message for label field
 */
const labelErrorMessage = computed<string>(() => {
  if (v$.value.label.$error) {
    if (v$.value.label.required.$invalid) {
      return 'Le label est requis'
    }
    if (v$.value.label.minLength.$invalid) {
      return 'Le label doit contenir au moins 1 caractère'
    }
    if (v$.value.label.maxLength.$invalid) {
      return 'Le label ne peut pas dépasser 100 caractères'
    }
  }
  return ''
})

// ========================================
// METHODS
// ========================================

/**
 * Handle save button click
 * Validate form, emit save event, and reset
 */
const handleSave = async (): Promise<void> => {
  await v$.value.$validate()

  if (!isFormValid.value) {
    window.$message?.error('Veuillez corriger les erreurs du formulaire')
    return
  }

  try {
    emit('save', {
      label: formData.value.label.trim(),
      type: formData.value.type || undefined
    })

    // Reset form after successful save
    resetForm()
    emit('update:show', false)
    window.$message?.success('Texte sauvegardé avec succès')
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
    window.$message?.error(errorMsg)
  }
}

/**
 * Handle cancel button click
 */
const handleCancel = (): void => {
  resetForm()
  emit('update:show', false)
}

/**
 * Reset form to initial state
 */
const resetForm = (): void => {
  formData.value = {
    label: '',
    type: ''
  }
  v$.value.$reset()
}

/**
 * Handle modal close via overlay/keyboard
 */
const handleModalClose = (value: boolean): void => {
  if (!value) {
    resetForm()
  }
  emit('update:show', value)
}

// ========================================
// WATCHERS
// ========================================

/**
 * Watch initial props changes and update form data
 */
watch(
  () => props.initialLabel,
  (newVal) => {
    if (newVal) {
      formData.value.label = newVal
    }
  }
)

watch(
  () => props.initialType,
  (newVal) => {
    if (newVal) {
      formData.value.type = newVal
    }
  }
)

/**
 * Trigger validation on form changes for better UX
 */
watch(
  () => formData.value.label,
  async () => {
    if (v$.value.label.$dirty) {
      await v$.value.label.$validate()
    }
  }
)
</script>

<template>
  <n-modal
    :show="show"
    :mask-closable="false"
    preset="dialog"
    type="default"
    @update:show="handleModalClose"
  >
    <template #default>
      <n-card
        title="Enregistrer dans la bibliothèque"
        style="max-width: 500px; width: 100%"
        :bordered="false"
        size="small"
      >
        <div class="save-text-modal">
          <!-- Info alert -->
          <n-alert
            type="info"
            class="modal-info"
            :show-icon="true"
            closable
          >
            Sauvegardez ce texte pour le retrouver facilement et le réutiliser dans vos carnets.
          </n-alert>

          <!-- Form -->
          <n-form
            class="modal-form"
            :model="formData"
          >
            <!-- Label field -->
            <n-form-item
              label="Nom du texte"
              path="label"
              required
              :show-feedback="v$.label.$dirty"
            >
              <div class="label-input-wrapper">
                <n-input
                  v-model:value="formData.label"
                  type="text"
                  placeholder="Ex: Titre de voyage, Ma citation préférée"
                  clearable
                  maxlength="100"
                  show-count
                  @blur="v$.label.$touch"
                  data-testid="saved-text-label-input"
                />
                <transition name="fade">
                  <span
                    v-if="v$.label.$error && labelErrorMessage"
                    class="error-message"
                  >
                    {{ labelErrorMessage }}
                  </span>
                </transition>
              </div>
            </n-form-item>

            <!-- Type field -->
            <n-form-item
              label="Type de texte"
              path="type"
            >
              <div class="type-select-wrapper">
                <n-select
                  v-model:value="formData.type"
                  :options="typeOptions"
                  placeholder="Sélectionnez un type (optionnel)"
                  clearable
                  filterable
                  data-testid="saved-text-type-select"
                />
                <p class="field-hint">
                  Catégorisez votre texte pour le retrouver plus facilement.
                </p>
              </div>
            </n-form-item>

            <!-- Preview of current form state -->
            <div v-if="formData.label" class="form-preview">
              <p class="preview-label">Aperçu :</p>
              <div class="preview-card">
                <p class="preview-title">{{ formData.label }}</p>
                <p v-if="formData.type" class="preview-type">
                  {{ typeOptions.find(o => o.value === formData.type)?.label }}
                </p>
              </div>
            </div>
          </n-form>
        </div>

        <!-- Footer with actions -->
        <template #footer>
          <n-space justify="end">
            <n-button @click="handleCancel" data-testid="cancel-save-button">
              Annuler
            </n-button>
            <n-button
              type="primary"
              :disabled="!isFormValid"
              :loading="false"
              @click="handleSave"
              data-testid="confirm-save-button"
            >
              Enregistrer
            </n-button>
          </n-space>
        </template>
      </n-card>
    </template>
  </n-modal>
</template>

<style scoped>
.save-text-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.modal-info {
  margin-bottom: 8px;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.label-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.error-message {
  display: block;
  color: #d03050;
  font-size: 12px;
  line-height: 1.5;
}

.type-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.field-hint {
  margin: 0;
  color: #999;
  font-size: 12px;
  line-height: 1.5;
}

.form-preview {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.preview-label {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-card {
  background: white;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.preview-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  word-break: break-word;
}

.preview-type {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #999;
  font-style: italic;
}

/* Fade transition for error messages */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .save-text-modal {
    padding: 0;
    gap: 12px;
  }

  .modal-form {
    gap: 12px;
  }

  .preview-card {
    padding: 6px 10px;
  }

  .preview-title {
    font-size: 13px;
  }
}
</style>
