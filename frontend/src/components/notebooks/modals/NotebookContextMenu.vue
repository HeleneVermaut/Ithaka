<!--
  NotebookContextMenu - Menu contextuel pour les actions sur un carnet

  Ce composant affiche un menu contextuel au clic droit sur une carte de carnet.
  Il propose plusieurs actions: ouvrir, renommer, éditer, dupliquer, archiver/restaurer, supprimer.

  Props:
  - show: boolean (requis) - Contrôle la visibilité du menu
  - x: number (requis) - Position X du menu (coordonnées de la souris)
  - y: number (requis) - Position Y du menu (coordonnées de la souris)
  - notebook: Notebook (requis) - Le carnet concerné par les actions

  Emits:
  - update:show - Ferme le menu (v-model)
  - action - Déclenché lors de la sélection d'une action (action: string, notebook: Notebook)

  Actions disponibles:
  - open: Ouvrir le carnet dans l'éditeur
  - rename: Renommer le carnet
  - edit: Éditer les métadonnées du carnet
  - duplicate: Dupliquer le carnet
  - archive: Archiver le carnet (ou restaurer si déjà archivé)
  - delete: Supprimer définitivement le carnet
-->

<script setup lang="ts">
import { computed } from 'vue'
import { NDropdown } from 'naive-ui'
import {
  OpenOutline as OpenIcon,
  CreateOutline as RenameIcon,
  SettingsOutline as EditIcon,
  CopyOutline as DuplicateIcon,
  ArchiveOutline as ArchiveIcon,
  RefreshOutline as RestoreIcon,
  TrashOutline as DeleteIcon
} from '@vicons/ionicons5'
import { h } from 'vue'
import { NIcon } from 'naive-ui'
import type { Notebook } from '@/types/notebook'
import type { DropdownOption } from 'naive-ui'

// Props
interface Props {
  show: boolean
  x: number
  y: number
  notebook: Notebook
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'action', action: string, notebook: Notebook): void
}

const emit = defineEmits<Emits>()

// Helper pour créer une icône
const renderIcon = (icon: any) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

// Options du menu contextuel
const menuOptions = computed<DropdownOption[]>(() => {
  const isArchived = props.notebook?.status === 'archived'

  return [
    {
      label: 'Ouvrir',
      key: 'open',
      icon: renderIcon(OpenIcon)
    },
    {
      type: 'divider',
      key: 'divider1'
    },
    {
      label: 'Renommer',
      key: 'rename',
      icon: renderIcon(RenameIcon),
      disabled: isArchived
    },
    {
      label: 'Éditer',
      key: 'edit',
      icon: renderIcon(EditIcon),
      disabled: isArchived
    },
    {
      label: 'Dupliquer',
      key: 'duplicate',
      icon: renderIcon(DuplicateIcon)
    },
    {
      type: 'divider',
      key: 'divider2'
    },
    {
      label: isArchived ? 'Restaurer' : 'Archiver',
      key: isArchived ? 'restore' : 'archive',
      icon: renderIcon(isArchived ? RestoreIcon : ArchiveIcon)
    },
    {
      label: 'Supprimer',
      key: 'delete',
      icon: renderIcon(DeleteIcon),
      props: {
        style: {
          color: isArchived ? '#ef4444' : undefined
        }
      }
    }
  ]
})

// Gestionnaire de sélection d'action
const handleSelect = (key: string): void => {
  // Normaliser la clé (restaurer -> archive pour cohérence)
  const actionKey = key === 'restore' ? 'archive' : key

  emit('action', actionKey, props.notebook)
  emit('update:show', false)
}

// Gestionnaire de fermeture du menu (clic en dehors)
const handleClickOutside = (): void => {
  emit('update:show', false)
}
</script>

<template>
  <n-dropdown
    :show="show"
    :x="x"
    :y="y"
    :options="menuOptions"
    placement="bottom-start"
    trigger="manual"
    @select="handleSelect"
    @clickoutside="handleClickOutside"
  />
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
