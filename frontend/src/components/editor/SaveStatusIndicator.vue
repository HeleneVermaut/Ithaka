<template>
  <div class="save-status-indicator">
    <n-tooltip placement="bottom">
      <template #trigger>
        <div class="status-content" :style="{ color: statusColor }">
          <n-spin v-if="status === 'saving'" size="small" class="status-spinner" />
          <n-icon v-else-if="status === 'saved' && isOnline" size="18" class="status-icon">
            <CheckmarkCircleOutline />
          </n-icon>
          <n-icon v-else-if="!isOnline" size="18" class="status-icon">
            <CloudOfflineOutline />
          </n-icon>
          <n-icon v-else-if="status === 'error'" size="18" class="status-icon">
            <AlertCircleOutline />
          </n-icon>

          <span class="status-text">{{ statusText }}</span>
          <span v-if="lastSaveTime" class="last-save">{{ lastSaveText }}</span>
        </div>
      </template>

      <div v-if="error" class="tooltip-content">{{ error }}</div>
      <div v-else-if="lastSaveTime" class="tooltip-content">
        Dernière sauvegarde : {{ lastSaveTime.toLocaleTimeString() }}
      </div>
      <div v-else class="tooltip-content">Aucune sauvegarde effectuée</div>
    </n-tooltip>
  </div>
</template>

<script setup lang="ts">
/**
 * SaveStatusIndicator Component
 *
 * Displays the current auto-save status with visual indicators and tooltips.
 * Shows save progress, success, error states, and offline mode indicator.
 *
 * Props:
 * - status: Current save status (idle, saving, saved, error)
 * - lastSaveTime: Timestamp of last successful save
 * - error: Error message if save failed
 * - isOnline: Whether the connection is online/offline
 *
 * Usage:
 * <SaveStatusIndicator
 *   :status="autoSave.saveStatus.value"
 *   :lastSaveTime="autoSave.lastSaveTime.value"
 *   :error="autoSave.error.value"
 *   :isOnline="isOnline"
 * />
 */

import { computed } from 'vue'
import { NSpin, NIcon, NTooltip } from 'naive-ui'
import { CheckmarkCircleOutline, CloudOfflineOutline, AlertCircleOutline } from '@vicons/ionicons5'
import type { SaveStatus } from '@/composables/useAutoSave'

interface Props {
  status: SaveStatus
  lastSaveTime: Date | null
  error: string | null
  isOnline: boolean
}

const props = defineProps<Props>()

/**
 * Computed: Status text for display
 * Shows localized text based on current save status
 */
const statusText = computed<string>(() => {
  if (!props.isOnline) return 'Hors ligne'

  switch (props.status) {
    case 'saving':
      return 'Sauvegarde...'
    case 'saved':
      return 'Sauvegardé'
    case 'error':
      return 'Erreur'
    case 'idle':
      return props.lastSaveTime ? 'Sauvegardé' : 'En attente'
    default:
      return ''
  }
})

/**
 * Computed: Status color based on state
 * Visual indicator for save state
 */
const statusColor = computed<string>(() => {
  if (!props.isOnline) return '#faad14' // Orange - offline

  switch (props.status) {
    case 'saving':
      return '#1890ff' // Blue - in progress
    case 'saved':
      return '#52c41a' // Green - success
    case 'error':
      return '#ff4d4f' // Red - error
    case 'idle':
      return '#8c8c8c' // Gray - neutral
    default:
      return '#8c8c8c'
  }
})

/**
 * Computed: Relative time since last save
 * Shows human-readable time ago format
 */
const lastSaveText = computed<string>(() => {
  if (!props.lastSaveTime) return ''

  const diff = Math.floor((Date.now() - props.lastSaveTime.getTime()) / 1000)

  if (diff < 60) return `il y a ${diff}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  return `il y a ${Math.floor(diff / 3600)}h`
})
</script>

<style scoped>
/**
 * SaveStatusIndicator Styles
 */

.save-status-indicator {
  display: inline-flex;
  align-items: center;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: color 0.3s ease;
  cursor: pointer;
  user-select: none;
}

.status-spinner {
  flex-shrink: 0;
}

.status-icon {
  flex-shrink: 0;
}

.status-text {
  white-space: nowrap;
}

.last-save {
  font-size: 11px;
  opacity: 0.7;
  margin-left: 4px;
}

.tooltip-content {
  font-size: 12px;
  max-width: 200px;
  word-wrap: break-word;
}

/* Responsive styles */
@media (max-width: 640px) {
  .status-content {
    font-size: 12px;
  }

  .last-save {
    display: none;
  }
}
</style>
