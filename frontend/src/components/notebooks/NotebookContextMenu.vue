<!--
  NotebookContextMenu.vue - Context menu for notebook actions

  This component displays a right-click context menu with actions:
  - Éditer (Edit)
  - Dupliquer (Duplicate)
  - Renommer (Rename)
  - Archiver/Restaurer (Archive/Restore based on status)
  - Exporter PDF (Export to PDF - placeholder for US09)
  - Supprimer (Delete - only for archived)

  Features:
  - Positioned at right-click coordinates (x, y)
  - Uses NaiveUI n-dropdown
  - Emits action with notebook data
  - Dynamic menu items based on notebook status
-->

<script setup lang="ts">
import { computed } from 'vue'
import {
  NDropdown
} from 'naive-ui'
import type { Notebook } from '@/types/notebook'
import type { DropdownOption } from 'naive-ui'

// Props and emits
interface Props {
  show: boolean
  x: number
  y: number
  notebook: Notebook
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  x: 0,
  y: 0
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  'action': [action: string, notebook: Notebook]
}>()

// Instances
// (message instance removed - not needed for menu actions)

// Computed properties
const showMenu = computed({
  get: (): boolean => props.show,
  set: (value: boolean): void => {
    emit('update:show', value)
  }
})

const menuPosition = computed(() => ({
  top: `${props.y}px`,
  left: `${props.x}px`
}))

const menuOptions = computed<DropdownOption[]>(() => {
  const isArchived = props.notebook.status === 'archived'
  const options: DropdownOption[] = [
    {
      label: 'Éditer',
      key: 'edit',
      props: {
        onClick: () => handleAction('edit')
      }
    },
    {
      label: 'Dupliquer',
      key: 'duplicate',
      props: {
        onClick: () => handleAction('duplicate')
      }
    },
    {
      label: 'Renommer',
      key: 'rename',
      props: {
        onClick: () => handleAction('rename')
      }
    },
    {
      type: 'divider',
      key: 'd1'
    },
    {
      label: isArchived ? 'Restaurer' : 'Archiver',
      key: 'archive',
      props: {
        onClick: () => handleAction('archive')
      }
    }
  ]

  // Add export option (placeholder for US09)
  options.push(
    {
      type: 'divider',
      key: 'd2'
    },
    {
      label: 'Exporter en PDF',
      key: 'export',
      disabled: true,
      props: {
        onClick: () => handleAction('export')
      }
    }
  )

  // Add delete option only for archived notebooks
  if (isArchived) {
    options.push(
      {
        type: 'divider',
        key: 'd3'
      },
      {
        label: 'Supprimer définitivement',
        key: 'delete',
        props: {
          onClick: () => handleAction('delete')
        }
      }
    )
  }

  return options
})

// Methods
const handleAction = (action: string): void => {
  emit('action', action, props.notebook)
  showMenu.value = false
}

const handleClickOutside = (): void => {
  showMenu.value = false
}
</script>

<template>
  <teleport to="body">
    <div
      v-if="showMenu"
      class="notebook-context-menu-overlay"
      @click="handleClickOutside"
    >
      <n-dropdown
        :options="menuOptions"
        :show="showMenu"
        placement="bottom-start"
        :style="menuPosition"
        class="notebook-context-menu"
        trigger="manual"
      />
    </div>
  </teleport>
</template>

<style scoped>
.notebook-context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.notebook-context-menu {
  position: fixed;
  z-index: 1001;
}

:deep(.n-dropdown-menu) {
  min-width: 180px;
}

:deep(.n-dropdown-option) {
  padding: 10px 12px;
  font-size: 0.9375rem;
}
</style>
