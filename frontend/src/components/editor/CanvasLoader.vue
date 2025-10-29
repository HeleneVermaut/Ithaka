<template>
  <transition name="fade">
    <div v-if="loading" class="canvas-loader">
      <div class="loader-content">
        <!-- Spinner Animation -->
        <div class="loader-spinner"></div>

        <!-- Loading Text -->
        <p class="loader-text">{{ text }}</p>

        <!-- Progress Bar (if progress provided) -->
        <div v-if="progress > 0" class="loader-progress">
          <div class="loader-progress-bar" :style="{ width: `${progress}%` }"></div>
          <span class="loader-progress-text">{{ progress }}%</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
/**
 * CanvasLoader Component
 *
 * Displays loading overlay for canvas operations.
 * Shows spinner, text, and optional progress bar.
 *
 * Props:
 * - loading: boolean - Show/hide loader
 * - text: string - Loading message (default: "Loading canvas...")
 * - progress: number - Optional progress percentage (0-100)
 *
 * Usage:
 * ```vue
 * <CanvasLoader :loading="isLoading" text="Loading elements..." :progress="50" />
 * ```
 */

interface Props {
  /** Show/hide loader */
  loading?: boolean
  /** Loading message text */
  text?: string
  /** Progress percentage (0-100) */
  progress?: number
}

withDefaults(defineProps<Props>(), {
  loading: false,
  text: 'Loading canvas...',
  progress: 0
})
</script>

<style scoped>
/**
 * Canvas Loader Styles
 *
 * Centered overlay with backdrop blur
 * Smooth fade transitions
 * Animated spinner and progress bar
 */

.canvas-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  z-index: 1000;
  border-radius: 4px;
}

.loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  text-align: center;
}

/* Spinner Animation */
.loader-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #18a058;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Loading Text */
.loader-text {
  margin: 20px 0 0 0;
  color: #666;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

/* Progress Bar Container */
.loader-progress {
  margin-top: 16px;
  width: 240px;
  position: relative;
}

.loader-progress-bar {
  height: 6px;
  background: linear-gradient(90deg, #18a058, #22c55e);
  border-radius: 3px;
  transition: width 0.3s ease;
  box-shadow: 0 2px 4px rgba(24, 160, 88, 0.2);
}

.loader-progress-text {
  position: absolute;
  top: -24px;
  right: 0;
  font-size: 14px;
  color: #18a058;
  font-weight: 600;
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Pulse animation for text */
.loader-text {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
