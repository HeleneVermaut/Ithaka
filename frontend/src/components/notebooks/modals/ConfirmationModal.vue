<!--
  ConfirmationModal - Modal de confirmation réutilisable

  Ce modal générique affiche un message de confirmation avec des boutons
  personnalisables. Il est utilisé pour toutes les actions destructives
  (suppression, archivage) ou actions nécessitant une confirmation.

  Props:
  - show: boolean (requis) - Contrôle la visibilité du modal
  - title: string (requis) - Titre du modal
  - message: string (requis) - Message de confirmation
  - confirmText: string (optionnel, défaut: "Confirmer") - Texte du bouton de confirmation
  - cancelText: string (optionnel, défaut: "Annuler") - Texte du bouton d'annulation
  - type: 'warning' | 'error' | 'info' (optionnel, défaut: 'warning') - Type de modal (couleur et icône)
  - loading: boolean (optionnel, défaut: false) - État de chargement du bouton de confirmation

  Emits:
  - update:show - Ferme le modal (v-model)
  - confirm - Déclenché lors de la confirmation
  - cancel - Déclenché lors de l'annulation
-->

<script setup lang="ts">
import { computed } from 'vue'
import {
  NModal,
  NCard,
  NButton,
  NSpace,
  NIcon,
  NAlert
} from 'naive-ui'
import {
  WarningOutline as WarningIcon,
  CloseCircleOutline as ErrorIcon,
  InformationCircleOutline as InfoIcon
} from '@vicons/ionicons5'

// Props
interface Props {
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'error' | 'info'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirmer',
  cancelText: 'Annuler',
  type: 'warning',
  loading: false
})

// Emits
interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// Configuration du type de modal
const alertType = computed(() => {
  switch (props.type) {
    case 'error':
      return 'error'
    case 'info':
      return 'info'
    case 'warning':
    default:
      return 'warning'
  }
})

const confirmButtonType = computed(() => {
  switch (props.type) {
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    case 'info':
    default:
      return 'primary'
  }
})

const icon = computed(() => {
  switch (props.type) {
    case 'error':
      return ErrorIcon
    case 'info':
      return InfoIcon
    case 'warning':
    default:
      return WarningIcon
  }
})

// Fermer le modal
const handleClose = (): void => {
  if (!props.loading) {
    emit('update:show', false)
  }
}

// Confirmer
const handleConfirm = (): void => {
  emit('confirm')
}

// Annuler
const handleCancel = (): void => {
  emit('cancel')
  handleClose()
}
</script>

<template>
  <n-modal
    :show="show"
    :mask-closable="!loading"
    :close-on-esc="!loading"
    @update:show="(value) => emit('update:show', value)"
  >
    <n-card
      style="max-width: 500px"
      :title="title"
      :bordered="false"
      size="large"
      role="alertdialog"
      aria-modal="true"
    >
      <!-- Message avec alerte -->
      <n-alert :type="alertType" :bordered="false">
        <template #icon>
          <n-icon :component="icon" :size="24" />
        </template>
        <div style="white-space: pre-wrap">{{ message }}</div>
      </n-alert>

      <template #footer>
        <n-space justify="end">
          <n-button
            :disabled="loading"
            @click="handleCancel"
          >
            {{ cancelText }}
          </n-button>
          <n-button
            :type="confirmButtonType"
            :loading="loading"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
