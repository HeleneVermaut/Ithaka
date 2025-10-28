<!--
  ConfirmationModal.vue - Reusable confirmation dialog

  This component provides a flexible confirmation modal for destructive actions.

  Props:
  - show: boolean - Modal visibility
  - title: string - Modal title
  - message: string - Confirmation message (supports multiline with \n)
  - confirmText: string - Confirm button text (default: "Confirmer")
  - type: 'warning' | 'error' | 'info' - Alert type (default: 'warning')

  Events:
  - update:show: Modal visibility toggle
  - confirm: User confirmed action
  - cancel: User cancelled action

  Usage:
  ```vue
  <confirmation-modal
    v-model:show="showModal"
    title="Supprimer?"
    message="Êtes-vous sûr?"
    confirm-text="Supprimer"
    type="error"
    @confirm="handleDelete"
  />
  ```
-->

<script setup lang="ts">
import { computed } from 'vue'
import {
  NModal,
  NAlert
} from 'naive-ui'

// Props and emits
interface Props {
  show: boolean
  title: string
  message: string
  confirmText?: string
  type?: 'warning' | 'error' | 'info'
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: 'Confirmation',
  message: 'Êtes-vous sûr?',
  confirmText: 'Confirmer',
  type: 'warning'
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  'confirm': []
  'cancel': []
}>()

// Computed properties
const showModal = computed({
  get: (): boolean => props.show,
  set: (value: boolean): void => {
    emit('update:show', value)
  }
})

const alertType = computed<'warning' | 'error' | 'info'>(() => {
  if (props.type === 'error') return 'error'
  if (props.type === 'info') return 'info'
  return 'warning'
})

const negativeButtonText = computed<string>(() => {
  return props.type === 'error' ? 'Annuler' : 'Non'
})

// Format message to handle \n as line breaks
const formattedMessage = computed<string>(() => {
  return props.message
})

// Methods
const handleConfirm = (): void => {
  emit('confirm')
  showModal.value = false
}

const handleCancel = (): void => {
  emit('cancel')
  showModal.value = false
}

const handleModalClose = (): void => {
  emit('cancel')
  showModal.value = false
}
</script>

<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    :title="title"
    :positive-text="confirmText"
    :negative-text="negativeButtonText"
    :positive-button-props="{ type: type === 'error' ? 'error' : 'warning' }"
    @positive-click="handleConfirm"
    @negative-click="handleCancel"
    @close="handleModalClose"
  >
    <!-- Alert section -->
    <n-alert
      :title="title"
      :type="alertType"
      :closable="false"
      style="margin-bottom: 16px"
    />

    <!-- Message section with proper formatting -->
    <div class="confirmation-message">
      <p v-for="(line, index) in formattedMessage.split('\n')" :key="index">
        {{ line }}
      </p>
    </div>
  </n-modal>
</template>

<style scoped>
.confirmation-message {
  margin-top: 16px;
  line-height: 1.6;
}

.confirmation-message p {
  margin: 0 0 8px 0;
  font-size: 0.9375rem;
  color: var(--color-text-base, rgba(0, 0, 0, 0.88));
}

.confirmation-message p:last-child {
  margin-bottom: 0;
}
</style>
