<!--
  EditNotebookModal.vue - Modal for editing notebook metadata

  This component allows editing a notebook's title and description.
  Type, format, and orientation are displayed as read-only (immutable).

  Features:
  - Pre-filled with current title and description
  - Read-only fields for type, format, orientation
  - Form validation with Vuelidate
  - Integration with notebooks store
  - Toast notifications for success/error
-->

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, minLength, maxLength } from '@vuelidate/validators'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NGrid,
  NGridItem,
  useMessage,
  NAlert
} from 'naive-ui'
import { useNotebooksStore } from '@/stores/notebooks'
import type { Notebook } from '@/types/notebook'

// Props and emits
interface Props {
  show: boolean
  notebook: Notebook
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  'updated': []
}>()

// Instances
const notebooksStore = useNotebooksStore()
const message = useMessage()

// Form state
const formData = reactive({
  title: '',
  description: ''
})

const isSubmitting = ref<boolean>(false)

// Validation rules
const rules = {
  title: {
    required,
    minLength: minLength(1),
    maxLength: maxLength(100)
  },
  description: {
    maxLength: maxLength(300)
  }
}

const v$ = useVuelidate(rules, formData)

// Computed properties
const isFormValid = computed<boolean>(() => !v$.value.$invalid)
const showModal = computed({
  get: (): boolean => props.show,
  set: (value: boolean): void => {
    emit('update:show', value)
  }
})

const hasChanges = computed<boolean>(() => {
  return formData.title !== props.notebook.title ||
    formData.description !== (props.notebook.description || '')
})

// Watch for notebook changes
watch(
  () => props.notebook,
  (newNotebook) => {
    formData.title = newNotebook.title
    formData.description = newNotebook.description || ''
    v$.value.$reset()
  },
  { immediate: true }
)

// Import reactive from vue
import { reactive } from 'vue'

// Methods
const handleCancel = (): void => {
  formData.title = props.notebook.title
  formData.description = props.notebook.description || ''
  v$.value.$reset()
  showModal.value = false
}

const handleSubmit = async (): Promise<void> => {
  // Validate form
  const isValid = await v$.value.$validate()
  if (!isValid) {
    message.error('Veuillez corriger les erreurs dans le formulaire')
    return
  }

  // Don't update if nothing has changed
  if (!hasChanges.value) {
    showModal.value = false
    return
  }

  isSubmitting.value = true

  try {
    // Update notebook in store
    await notebooksStore.updateNotebook(props.notebook.id, {
      title: formData.title,
      description: formData.description
    })

    message.success('Carnet mis à jour avec succès')

    // Close modal
    showModal.value = false

    // Emit updated event
    emit('updated')
  } catch (error) {
    console.error('Error updating notebook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du carnet'
    message.error(errorMessage)
  } finally {
    isSubmitting.value = false
  }
}

// Handle modal close
const handleModalClose = (): void => {
  handleCancel()
}
</script>

<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="Éditer le carnet"
    positive-text="Mettre à jour"
    negative-text="Annuler"
    :positive-button-props="{ disabled: !isFormValid || !hasChanges || isSubmitting, loading: isSubmitting }"
    @positive-click="handleSubmit"
    @negative-click="handleCancel"
    @close="handleModalClose"
  >
    <n-form label-placement="top">
      <!-- Alert about immutable fields -->
      <n-alert
        title="Note"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      >
        Le type, format et orientation ne peuvent pas être modifiés après création.
      </n-alert>

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
        label="Description"
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

      <!-- Read-only fields grid -->
      <n-grid :cols="3" :x-gap="16">
        <!-- Type (read-only) -->
        <n-grid-item>
          <n-form-item label="Type">
            <n-input
              :value="notebook.type"
              disabled
            />
          </n-form-item>
        </n-grid-item>

        <!-- Format (read-only) -->
        <n-grid-item>
          <n-form-item label="Format">
            <n-input
              :value="notebook.format"
              disabled
            />
          </n-form-item>
        </n-grid-item>

        <!-- Orientation (read-only) -->
        <n-grid-item>
          <n-form-item label="Orientation">
            <n-input
              :value="notebook.orientation"
              disabled
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
