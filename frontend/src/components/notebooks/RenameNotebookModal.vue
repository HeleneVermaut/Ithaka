<!--
  RenameNotebookModal.vue - Modal for renaming a notebook

  This component provides a simple form to rename a notebook.
  - Pre-filled with current title
  - Validation: title required, max 100 chars
  - Calls notebooksStore.updateNotebook with title only
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
  useMessage
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
  'renamed': []
}>()

// Instances
const notebooksStore = useNotebooksStore()
const message = useMessage()

// Form state
const title = ref<string>('')
const isSubmitting = ref<boolean>(false)

// Validation rules
const rules = {
  title: {
    required,
    minLength: minLength(1),
    maxLength: maxLength(100)
  }
}

const v$ = useVuelidate(rules, { title })

// Computed properties
const isFormValid = computed<boolean>(() => !v$.value.$invalid)
const showModal = computed({
  get: (): boolean => props.show,
  set: (value: boolean): void => {
    emit('update:show', value)
  }
})

// Watch for notebook changes to update form
watch(
  () => props.notebook,
  (newNotebook) => {
    title.value = newNotebook.title
    v$.value.$reset()
  },
  { immediate: true }
)

// Methods
const handleCancel = (): void => {
  title.value = props.notebook.title
  v$.value.$reset()
  showModal.value = false
}

const handleSubmit = async (): Promise<void> => {
  // Validate form
  const isValid = await v$.value.$validate()
  if (!isValid) {
    message.error('Le titre est requis')
    return
  }

  // Don't update if title hasn't changed
  if (title.value === props.notebook.title) {
    showModal.value = false
    return
  }

  isSubmitting.value = true

  try {
    // Update notebook in store
    await notebooksStore.updateNotebook(props.notebook.id, {
      title: title.value
    })

    message.success('Carnet renommé avec succès')

    // Close modal
    showModal.value = false

    // Emit renamed event for parent component
    emit('renamed')
  } catch (error) {
    console.error('Error renaming notebook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors du renommage du carnet'
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
    title="Renommer le carnet"
    positive-text="Renommer"
    negative-text="Annuler"
    :positive-button-props="{ disabled: !isFormValid || isSubmitting, loading: isSubmitting }"
    @positive-click="handleSubmit"
    @negative-click="handleCancel"
    @close="handleModalClose"
  >
    <n-form label-placement="top">
      <n-form-item
        label="Nouveau titre"
        :feedback="v$.title.$error ? 'Le titre est requis (1-100 caractères)' : ''"
        :validation-status="v$.title.$error ? 'error' : undefined"
      >
        <n-input
          v-model:value="title"
          placeholder="Entrez le nouveau titre"
          :maxlength="100"
          clearable
          @blur="v$.title.$touch"
        />
      </n-form-item>
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
