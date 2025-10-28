<!--
  CreateNotebookModal - Modal de création d'un nouveau carnet

  Ce modal permet à l'utilisateur de créer un nouveau carnet en remplissant
  un formulaire avec titre, description, type, format et orientation.

  Props:
  - show: boolean (requis) - Contrôle la visibilité du modal

  Emits:
  - update:show - Ferme le modal (v-model)
  - created - Déclenché après création réussie avec le carnet créé en paramètre

  Validation:
  - Titre: requis, max 100 caractères
  - Description: optionnelle, max 300 caractères
  - Type: requis (Voyage, Daily, Reportage)
  - Format: requis (A4, A5)
  - Orientation: requis (portrait, landscape)
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
  NSelect,
  NRadioGroup,
  NRadio,
  NButton,
  NSpace,
  useMessage
} from 'naive-ui'
import { useNotebooksStore } from '@/stores/notebooks'

// Props
interface Props {
  show: boolean
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'created', notebook: any): void
}

const emit = defineEmits<Emits>()

// Instances
const notebooksStore = useNotebooksStore()
const message = useMessage()

// État du formulaire
const formData = ref({
  title: '',
  description: '',
  type: 'Voyage' as const,
  format: 'A4' as const,
  orientation: 'portrait' as const
})

// État de chargement
const loading = ref<boolean>(false)

// Options pour les sélecteurs
const typeOptions = [
  { label: 'Carnet de voyage', value: 'Voyage' },
  { label: 'Journal quotidien', value: 'Daily' },
  { label: 'Reportage', value: 'Reportage' }
]

// Règles de validation
const rules = computed(() => ({
  title: {
    required: helpers.withMessage('Le titre est requis', required),
    maxLength: helpers.withMessage('Le titre ne peut pas dépasser 100 caractères', maxLength(100))
  },
  description: {
    maxLength: helpers.withMessage('La description ne peut pas dépasser 300 caractères', maxLength(300))
  },
  type: {
    required: helpers.withMessage('Le type est requis', required)
  },
  format: {
    required: helpers.withMessage('Le format est requis', required)
  },
  orientation: {
    required: helpers.withMessage("L'orientation est requise", required)
  }
}))

// Vuelidate
const v$ = useVuelidate(rules, formData)

// Réinitialiser le formulaire quand le modal s'ouvre
watch(() => props.show, (newValue) => {
  if (newValue) {
    resetForm()
  }
})

// Réinitialiser le formulaire
const resetForm = (): void => {
  formData.value = {
    title: '',
    description: '',
    type: 'Voyage',
    format: 'A4',
    orientation: 'portrait'
  }
  v$.value.$reset()
}

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

  loading.value = true

  try {
    // Créer le carnet via le store
    const newNotebook = await notebooksStore.createNotebook(formData.value)

    message.success(`Carnet "${newNotebook.title}" créé avec succès`)

    // Émettre l'événement de création
    emit('created', newNotebook)

    // Fermer le modal
    handleClose()
  } catch (error: any) {
    console.error('Error creating notebook:', error)
    message.error(error.message || 'Erreur lors de la création du carnet')
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
      title="Créer un nouveau carnet"
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
            placeholder="Ex: Mon voyage en Italie"
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

        <!-- Type de carnet -->
        <n-form-item
          label="Type de carnet"
          path="type"
          :validation-status="v$.type.$error ? 'error' : undefined"
          :feedback="v$.type.$errors[0]?.$message as string"
        >
          <n-select
            v-model:value="formData.type"
            :options="typeOptions"
            placeholder="Sélectionnez un type"
            @blur="v$.type.$touch()"
          />
        </n-form-item>

        <!-- Format de page -->
        <n-form-item
          label="Format de page"
          path="format"
          :validation-status="v$.format.$error ? 'error' : undefined"
          :feedback="v$.format.$errors[0]?.$message as string"
        >
          <n-radio-group v-model:value="formData.format" name="format">
            <n-space>
              <n-radio value="A4">
                A4 (210 × 297 mm)
              </n-radio>
              <n-radio value="A5">
                A5 (148 × 210 mm)
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>

        <!-- Orientation -->
        <n-form-item
          label="Orientation"
          path="orientation"
          :validation-status="v$.orientation.$error ? 'error' : undefined"
          :feedback="v$.orientation.$errors[0]?.$message as string"
        >
          <n-radio-group v-model:value="formData.orientation" name="orientation">
            <n-space>
              <n-radio value="portrait">
                Portrait (vertical)
              </n-radio>
              <n-radio value="landscape">
                Paysage (horizontal)
              </n-radio>
            </n-space>
          </n-radio-group>
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
            Créer le carnet
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
