<!--
  CreateNotebookModal.vue - Modal for creating a new notebook

  This component provides a form for users to create a new notebook with:
  - Title (required, max 100 chars)
  - Description (optional, max 300 chars)
  - Type selection (Voyage, Daily, Reportage)
  - Format selection (A4, A5)
  - Orientation selection (portrait, landscape)

  Features:
  - Form validation with Vuelidate
  - Loading state during submission
  - Toast notifications for success/error
  - Integration with notebooks store
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, minLength, maxLength } from '@vuelidate/validators'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NGrid,
  NGridItem,
  useMessage
} from 'naive-ui'
import { useNotebooksStore } from '@/stores/notebooks'
import type { CreateNotebookDto } from '@/types/notebook'

// Props and emits
interface Props {
  show: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  'created': []
}>()

// Instances
const notebooksStore = useNotebooksStore()
const message = useMessage()

// Form state
const formData = reactive<CreateNotebookDto>({
  title: '',
  description: '',
  type: 'Voyage',
  format: 'A4',
  orientation: 'portrait'
})

// UI state
const isSubmitting = ref<boolean>(false)

// Select options
const typeOptions = [
  { label: 'Voyage', value: 'Voyage' },
  { label: 'Daily Journal', value: 'Daily' },
  { label: 'Reportage', value: 'Reportage' }
]

const formatOptions = [
  { label: 'A4', value: 'A4' },
  { label: 'A5', value: 'A5' }
]

const orientationOptions = [
  { label: 'Portrait', value: 'portrait' },
  { label: 'Landscape', value: 'landscape' }
]

// Validation rules (typed as any to avoid strict type inference issues with reactive)
const rules = {
  title: {
    required,
    minLength: minLength(1),
    maxLength: maxLength(100)
  },
  description: {
    maxLength: maxLength(300)
  },
  type: {
    required
  },
  format: {
    required
  },
  orientation: {
    required
  }
}

const v$ = useVuelidate(rules, formData as any)

// Computed properties
const isFormValid = computed<boolean>(() => !v$.value.$invalid)
const showModal = computed({
  get: (): boolean => props.show,
  set: (value: boolean): void => {
    emit('update:show', value)
  }
})

// Methods
const resetForm = (): void => {
  formData.title = ''
  formData.description = ''
  formData.type = 'Voyage'
  formData.format = 'A4'
  formData.orientation = 'portrait'
  v$.value.$reset()
}

const handleCancel = (): void => {
  resetForm()
  showModal.value = false
}

const handleSubmit = async (): Promise<void> => {
  // Validate form
  const isValid = await v$.value.$validate()
  if (!isValid) {
    message.error('Veuillez corriger les erreurs dans le formulaire')
    return
  }

  isSubmitting.value = true

  try {
    // Create notebook in store
    await notebooksStore.createNotebook(formData)

    message.success(`Carnet "${formData.title}" créé avec succès`)

    // Reset form and close modal
    resetForm()
    showModal.value = false

    // Emit created event for parent component
    emit('created')
  } catch (error) {
    console.error('Error creating notebook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du carnet'
    message.error(errorMessage)
  } finally {
    isSubmitting.value = false
  }
}

// Handle modal close (Escape key, click outside)
const handleModalClose = (): void => {
  handleCancel()
}
</script>

<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="Créer un nouveau carnet"
    positive-text="Créer"
    negative-text="Annuler"
    :positive-button-props="{ disabled: !isFormValid || isSubmitting, loading: isSubmitting }"
    @positive-click="handleSubmit"
    @negative-click="handleCancel"
    @close="handleModalClose"
  >
    <n-form label-placement="top">
      <!-- Title field -->
      <n-form-item
        label="Titre"
        :feedback="v$.title.$error ? 'Le titre est requis (1-100 caractères)' : ''"
        :validation-status="v$.title.$error ? 'error' : undefined"
      >
        <n-input
          v-model:value="formData.title"
          placeholder="Entrez le titre du carnet"
          :maxlength="100"
          clearable
          @blur="v$.title.$touch"
        />
      </n-form-item>

      <!-- Description field -->
      <n-form-item
        label="Description (optionnelle)"
        :feedback="v$.description.$error ? 'La description ne peut pas dépasser 300 caractères' : ''"
        :validation-status="v$.description.$error ? 'error' : undefined"
      >
        <n-input
          v-model:value="formData.description"
          placeholder="Décrivez votre carnet..."
          type="textarea"
          :maxlength="300"
          :rows="3"
          clearable
          @blur="v$.description.$touch"
        />
      </n-form-item>

      <!-- Type, Format, and Orientation in grid -->
      <n-grid :cols="3" :x-gap="16">
        <!-- Type selection -->
        <n-grid-item>
          <n-form-item
            label="Type"
            :validation-status="v$.type.$error ? 'error' : undefined"
          >
            <n-select
              v-model:value="formData.type"
              :options="typeOptions"
              @blur="v$.type.$touch"
            />
          </n-form-item>
        </n-grid-item>

        <!-- Format selection -->
        <n-grid-item>
          <n-form-item
            label="Format"
            :validation-status="v$.format.$error ? 'error' : undefined"
          >
            <n-select
              v-model:value="formData.format"
              :options="formatOptions"
              @blur="v$.format.$touch"
            />
          </n-form-item>
        </n-grid-item>

        <!-- Orientation selection -->
        <n-grid-item>
          <n-form-item
            label="Orientation"
            :validation-status="v$.orientation.$error ? 'error' : undefined"
          >
            <n-select
              v-model:value="formData.orientation"
              :options="orientationOptions"
              @blur="v$.orientation.$touch"
            />
          </n-form-item>
        </n-grid-item>
      </n-grid>
    </n-form>
  </n-modal>
</template>

<style scoped>
:deep(.n-form-item) {
  margin-bottom: 16px;
}

:deep(.n-form-item:last-child) {
  margin-bottom: 0;
}
</style>
