<script setup lang="ts">
/**
 * DeleteConfirmModal Component
 *
 * Modal de confirmation pour la suppression d'éléments dans l'éditeur.
 * Affiche un avertissement clair et demande confirmation avant suppression.
 *
 * Features:
 * - Message de confirmation personnalisable selon le type d'élément
 * - Boutons Annuler / Confirmer la suppression
 * - Gestion de l'état d'affichage (show prop)
 * - Emits pour confirm et cancel
 *
 * Usage:
 * ```vue
 * <DeleteConfirmModal
 *   :show="showDeleteModal"
 *   element-type="texte"
 *   @confirm="handleDelete"
 *   @cancel="handleCancel"
 * />
 * ```
 *
 * @component
 */

import { NModal, NCard, NButton, NSpace } from 'naive-ui'

/**
 * Props interface
 */
interface Props {
  /** Indique si le modal est visible */
  show: boolean
  /** Type d'élément à supprimer (texte, image, forme, etc.) */
  elementType?: string
}

const props = withDefaults(defineProps<Props>(), {
  elementType: 'texte'
})

/**
 * Emits interface
 */
const emit = defineEmits<{
  /** Émis quand l'utilisateur confirme la suppression */
  confirm: []
  /** Émis quand l'utilisateur annule */
  cancel: []
}>()
</script>

<template>
  <n-modal :show="props.show" @update:show="() => emit('cancel')">
    <n-card
      style="width: 450px"
      title="Confirmer la suppression"
      :bordered="false"
      size="huge"
    >
      <p>
        Êtes-vous sûr de vouloir supprimer cet élément <strong>{{ props.elementType }}</strong> ?
      </p>
      <p style="color: #999; font-size: 14px;">
        Cette action est irréversible.
      </p>

      <template #footer>
        <n-space justify="end">
          <n-button @click="emit('cancel')">Annuler</n-button>
          <n-button type="error" @click="emit('confirm')">
            Supprimer définitivement
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
/**
 * Styles pour le contenu de la modal
 * Assure une bonne lisibilité et espacement
 */
p {
  margin: 0 0 12px 0;
  line-height: 1.6;
  color: #333;
}

p:last-of-type {
  margin-bottom: 0;
}

strong {
  color: #d32f2f;
  font-weight: 600;
}
</style>
