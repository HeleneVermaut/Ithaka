<script setup lang="ts">
import { computed } from 'vue';
import type { AppError } from '@/constants/errorMessages';
import { ErrorType } from '@/constants/errorMessages';

/**
 * ErrorDisplay component
 *
 * Displays user-friendly error messages with appropriate icons and colors
 * based on error type. Supports retry actions and dismissal.
 *
 * @example
 * <ErrorDisplay
 *   :error="currentError"
 *   show-retry
 *   @retry="handleRetry"
 *   @dismiss="handleDismiss"
 * />
 */

interface Props {
  error: AppError | null;
  showRetry?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showRetry: false
});

const emit = defineEmits<{
  retry: [];
  dismiss: [];
}>();

/**
 * Get appropriate color theme based on error type
 */
const errorColor = computed(() => {
  switch (props.error?.type) {
    case ErrorType.NETWORK:
      return 'warning';
    case ErrorType.VALIDATION:
      return 'info';
    case ErrorType.OFFLINE:
      return 'warning';
    default:
      return 'error';
  }
});
</script>

<template>
  <n-alert
    v-if="error"
    :type="errorColor"
    :title="error.message"
    closable
    class="error-display"
    @close="emit('dismiss')"
  >
    <template v-if="showRetry && error.retry" #action>
      <n-button size="small" @click="emit('retry')">
        Retry
      </n-button>
    </template>
  </n-alert>
</template>

<style scoped>
.error-display {
  margin-bottom: 16px;
}
</style>
