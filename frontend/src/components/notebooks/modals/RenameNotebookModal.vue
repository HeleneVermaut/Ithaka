<!--
  RenameNotebookModal - Modal de renommage d'un carnet

  Ce modal permet à l'utilisateur de renommer rapidement un carnet existant.
  Affiche un formulaire simple avec un seul champ: le nouveau titre.

  Props:
  - show: boolean (requis) - Contrôle la visibilité du modal
  - notebook: Notebook (requis) - Le carnet à renommer

  Emits:
  - update:show - Ferme le modal (v-model)
  - renamed - Déclenché après renommage réussi avec le carnet mis à jour en paramètre

  Validation:
  - Titre: requis, max 100 caractères
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
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
  (e: 'renamed', notebook: Notebook): void
}

const emit = defineEmits<Emits>()

// Instances
const notebooksStore = useNotebooksStore()
const message = useMessage()

// État du formulaire
const formData = ref({
  title: ''
})

// État de chargement
const loading = ref<boolean>(false)

// Règles de validation
const rules = {
  title: {
    required: helpers.withMessage('Le titre est requis', required),
    maxLength: helpers.withMessage('Le titre ne peut pas dépasser 100 caractères', maxLength(100))
  }
}

// Vuelidate
const v$ = useVuelidate(rules, formData)

// Pré-remplir le formulaire quand le modal s'ouvre
watch(() => props.show, (newValue) => {
  if (newValue && props.notebook) {
    formData.value.title = props.notebook.title
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

  // Vérifier si le titre a changé
  if (formData.value.title === props.notebook.title) {
    message.info('Le titre n\'a pas été modifié')
    handleClose()
    return
  }

  loading.value = true

  try {
    // Mettre à jour le carnet via le store
    const updatedNotebook = await notebooksStore.updateNotebook(props.notebook.id, {
      title: formData.value.title
    })

    message.success(`Carnet renommé en "${updatedNotebook.title}"`)

    // Émettre l'événement de renommage
    emit('renamed', updatedNotebook)

    // Fermer le modal
    handleClose()
  } catch (error: any) {
    console.error('Error renaming notebook:', error)
    message.error(error.message || 'Erreur lors du renommage du carnet')
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
      style="max-width: 500px"
      title="Renommer le carnet"
      :bordered="false"
      size="large"
      role="dialog"
      aria-modal="true"
    >
      <n-form ref="formRef" :model="formData" :disabled="loading">
        <!-- Titre -->
        <n-form-item
          label="Nouveau titre"
          path="title"
          :validation-status="v$.title.$error ? 'error' : undefined"
          :feedback="v$.title.$errors[0]?.$message as string"
        >
          <n-input
            v-model:value="formData.title"
            placeholder="Entrez le nouveau titre"
            maxlength="100"
            show-count
            clearable
            autofocus
            @blur="v$.title.$touch()"
            @keyup.enter="handleSubmit"
          />
        </n-form-item>
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
            Renommer
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
