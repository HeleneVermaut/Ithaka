/**
 * useSessionTimeout Composable
 *
 * Manages session timeout and provides user warnings before session expiration.
 * Features:
 * - Tracks session time based on 15-minute access token expiration
 * - Shows warning notification at 12 minutes
 * - Auto-logout at 14 minutes
 * - Resets timers on user activity
 *
 * Token expiration times:
 * - Access token: 15 minutes
 * - Warning shown at: 12 minutes
 * - Auto-logout at: 14 minutes
 *
 * @module composables/useSessionTimeout
 */

import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotification } from 'naive-ui';
import { useAuthStore } from '../stores/auth';

// const SESSION_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_TIME = 12 * 60 * 1000; // Show warning at 12 minutes
const LOGOUT_TIME = 14 * 60 * 1000; // Auto-logout at 14 minutes

export function useSessionTimeout() {
  const router = useRouter();
  const authStore = useAuthStore();

  /**
   * Get notification instance lazily
   * This prevents calling useNotification() before the provider is mounted
   * Returns null if provider is not available yet
   */
  const getNotification = () => {
    try {
      return useNotification();
    } catch (error) {
      // Provider not available yet - will retry on next call
      console.warn('Notification provider not available yet');
      return null;
    }
  };

  // Track timers
  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  let logoutTimer: ReturnType<typeof setTimeout> | null = null;
  let activityTimeout: ReturnType<typeof setTimeout> | null = null;

  // Track whether warning has been shown
  const warningShown = ref(false);

  /**
   * Start the session timeout tracking
   * Called when user logs in
   */
  const startSessionTimeout = (): void => {
    // Reset warning flag
    warningShown.value = false;

    // Clear any existing timers
    clearAllTimers();

    // Set warning timer
    warningTimer = setTimeout(() => {
      showSessionWarning();
    }, WARNING_TIME);

    // Set logout timer
    logoutTimer = setTimeout(() => {
      performAutoLogout();
    }, LOGOUT_TIME);
  };

  /**
   * Reset session timeout (called on user activity)
   */
  const resetSessionTimeout = (): void => {
    // Clear pending timers
    clearAllTimers();

    // Reset warning flag
    warningShown.value = false;

    // Restart session timeout
    startSessionTimeout();
  };

  /**
   * Show session expiration warning
   */
  const showSessionWarning = (): void => {
    if (warningShown.value) {
      return; // Only show once per session
    }

    warningShown.value = true;

    // Get notification instance (may be null if provider not ready)
    const notification = getNotification();
    if (!notification) {
      console.warn('Cannot show session warning: notification provider not available');
      return;
    }

    // Create a custom notification with action to extend session
    notification.warning({
      title: 'Session Expiring Soon',
      content:
        'Your session will expire in 3 minutes. Click below to extend your session.',
      duration: 0, // Don't auto-close
      action: () => {
        // User clicked to extend session
        extendSession();
      },
      onClose: () => {
        // User dismissed notification but didn't click extend
        // Session will still auto-logout if not extended
      },
    });
  };

  /**
   * Extend session by resetting the timeout
   * Triggered when user clicks "Extend Session" button
   */
  const extendSession = (): void => {
    // Reset the session timeout
    resetSessionTimeout();

    // Get notification instance (may be null if provider not ready)
    const notification = getNotification();
    if (notification) {
      notification.success({
        title: 'Session Extended',
        content: 'Your session has been extended for another 15 minutes.',
        duration: 3,
      });
    }
  };

  /**
   * Perform automatic logout
   */
  const performAutoLogout = (): void => {
    // Get notification instance (may be null if provider not ready)
    const notification = getNotification();
    if (notification) {
      notification.error({
        title: 'Session Expired',
        content: 'Your session has expired due to inactivity. Please log in again.',
        duration: 3,
      });
    }

    // Logout user
    authStore.logout().catch(() => {
      // Error already handled by auth store
    });

    // Redirect to login
    router.push({ name: 'login' });
  };

  /**
   * Clear all active timers
   */
  const clearAllTimers = (): void => {
    if (warningTimer) {
      clearTimeout(warningTimer);
      warningTimer = null;
    }

    if (logoutTimer) {
      clearTimeout(logoutTimer);
      logoutTimer = null;
    }

    if (activityTimeout) {
      clearTimeout(activityTimeout);
      activityTimeout = null;
    }
  };

  /**
   * Handle user activity to reset session timeout
   * Called on mouse, keyboard, or touch events
   */
  const handleUserActivity = (): void => {
    // Debounce activity events - don't reset on every single event
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }

    activityTimeout = setTimeout(() => {
      // Only reset if user is authenticated
      if (authStore.isAuthenticated) {
        resetSessionTimeout();
      }
    }, 1000); // Debounce for 1 second
  };

  /**
   * Setup activity listeners
   */
  const setupActivityListeners = (): void => {
    // Listen to user activity events
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
  };

  /**
   * Remove activity listeners
   */
  const removeActivityListeners = (): void => {
    window.removeEventListener('mousemove', handleUserActivity);
    window.removeEventListener('mousedown', handleUserActivity);
    window.removeEventListener('keypress', handleUserActivity);
    window.removeEventListener('scroll', handleUserActivity);
    window.removeEventListener('touchstart', handleUserActivity);
  };

  /**
   * Stop session timeout tracking
   * Called when user logs out
   */
  const stopSessionTimeout = (): void => {
    clearAllTimers();
    removeActivityListeners();
    warningShown.value = false;
  };

  onMounted(() => {
    // Only initialize if user is authenticated
    if (authStore.isAuthenticated) {
      setupActivityListeners();
      startSessionTimeout();
    }

    // Watch for authentication changes
    // (This would require a proper watcher setup in the component using this composable)
  });

  onUnmounted(() => {
    stopSessionTimeout();
  });

  return {
    startSessionTimeout,
    resetSessionTimeout,
    stopSessionTimeout,
    extendSession,
    warningShown,
  };
}

export default useSessionTimeout;
