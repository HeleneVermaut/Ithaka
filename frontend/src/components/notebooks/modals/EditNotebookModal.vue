<!--
  EditNotebookModal - Modal d'édition des métadonnées d'un carnet

  Ce modal permet à l'utilisateur d'éditer le titre et la description d'un carnet.
  Les champs type, format et orientation sont IMMUABLES et affichés en lecture seule.

  Props:
  - show: boolean (requis) - Contrôle la visibilité du modal
  - notebook: Notebook (requis) - Le carnet à éditer

  Emits:
  - update:show - Ferme le modal (v-model)
  - updated - Déclenché après modification réussie avec le carnet mis à jour en paramètre

  Validation:
  - Titre: requis, max 100 caractères
  - Description: optionnelle, max 300 caractères
-->

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, maxLength, helpers } from '@vuelidate/validators'
import {
  NModal,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NSpace,
  NDivider,
  NTag,
  useMessage
} from 'naive-ui'
import { useNotebooksStore } from '@/stores/notebooks'
import type { Notebook } from '@/types/notebook'

// Props
interface Props {
  show: boolean
  notebook: Notebook
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'updated', notebook: Notebook): void
}

const emit = defineEmits<Emits>()

// Instances
const notebooksStore = useNotebooksStore()
const message = useMessage()

// État du formulaire
const formData = ref({
  title: '',
  description: ''
})

// État de chargement
const loading = ref<boolean>(false)

// Règles de validation
const rules = {
  title: {
    required: helpers.withMessage('Le titre est requis', required),
    maxLength: helpers.withMessage('Le titre ne peut pas dépasser 100 caractères', maxLength(100))
  },
  description: {
    maxLength: helpers.withMessage('La description ne peut pas dépasser 300 caractères', maxLength(300))
  }
}

// Vuelidate
const v$ = useVuelidate(rules, formData)

// Labels pour l'affichage
const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    'Voyage': 'Carnet de voyage',
    'Daily': 'Journal quotidien',
    'Reportage': 'Reportage'
  }
  return labels[props.notebook?.type] || props.notebook?.type
})

const formatLabel = computed(() => {
  if (!props.notebook) return ''
  return `${props.notebook.format} - ${props.notebook.orientation === 'portrait' ? 'Portrait' : 'Paysage'}`
})

// Pré-remplir le formulaire quand le modal s'ouvre
watch(() => props.show, (newValue) => {
  if (newValue && props.notebook) {
    formData.value.title = props.notebook.title
    formData.value.description = props.notebook.description || ''
    v$.value.$reset()
  }
})

// Fermer le modal
const handleClose = (): void => {
  emit('update:show', false)
}

// Soumettre le formulaire
const handleSubmit = async (): Promise<void> => {
  // Valider le formulaire
  const isValid = await v$.value.$validate()
  if (!isValid) {
    message.warning('Veuillez corriger les erreurs dans le formulaire')
    return
  }

  // Vérifier si quelque chose a changé
  const titleChanged = formData.value.title !== props.notebook.title
  const descriptionChanged = formData.value.description !== (props.notebook.description || '')

  if (!titleChanged && !descriptionChanged) {
    message.info('Aucune modification détectée')
    handleClose()
    return
  }

  loading.value = true

  try {
    // Mettre à jour le carnet via le store
    const updatedNotebook = await notebooksStore.updateNotebook(props.notebook.id, {
      title: formData.value.title,
      description: formData.value.description || undefined
    })

    message.success(`Carnet "${updatedNotebook.title}" mis à jour avec succès`)

    // Émettre l'événement de mise à jour
    emit('updated', updatedNotebook)

    // Fermer le modal
    handleClose()
  } catch (error: any) {
    console.error('Error updating notebook:', error)
    message.error(error.message || 'Erreur lors de la mise à jour du carnet')
  } finally {
    loading.value = false
  }
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
      style="max-width: 600px"
      title="Éditer le carnet"
      :bordered="false"
      size="large"
      role="dialog"
      aria-modal="true"
    >
      <n-form ref="formRef" :model="formData" :disabled="loading">
        <!-- Titre -->
        <n-form-item
          label="Titre"
          path="title"
          :validation-status="v$.title.$error ? 'error' : undefined"
          :feedback="v$.title.$errors[0]?.$message as string"
        >
          <n-input
            v-model:value="formData.title"
            placeholder="Entrez le titre du carnet"
            maxlength="100"
            show-count
            clearable
            @blur="v$.title.$touch()"
          />
        </n-form-item>

        <!-- Description -->
        <n-form-item
          label="Description (optionnelle)"
          path="description"
          :validation-status="v$.description.$error ? 'error' : undefined"
          :feedback="v$.description.$errors[0]?.$message as string"
        >
          <n-input
            v-model:value="formData.description"
            type="textarea"
            placeholder="Décrivez votre carnet..."
            :rows="3"
            maxlength="300"
            show-count
            clearable
            @blur="v$.description.$touch()"
          />
        </n-form-item>

        <n-divider />

        <!-- Informations en lecture seule -->
        <div style="margin-bottom: 16px">
          <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; font-weight: 500">
            Informations immuables (non modifiables)
          </p>

          <n-space vertical :size="8">
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span style="color: #6b7280">Type de carnet:</span>
              <n-tag :bordered="false" type="info">{{ typeLabel }}</n-tag>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center">
              <span style="color: #6b7280">Format et orientation:</span>
              <n-tag :bordered="false" type="info">{{ formatLabel }}</n-tag>
            </div>
          </n-space>

          <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 12px; font-style: italic">
            Le type, le format et l'orientation ne peuvent pas être modifiés après la création du carnet.
          </p>
        </div>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button
            :disabled="loading"
            @click="handleClose"
          >
            Annuler
          </n-button>
          <n-button
            type="primary"
            :loading="loading"
            @click="handleSubmit"
          >
            Enregistrer
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
