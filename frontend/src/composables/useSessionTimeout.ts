/**
 * useSessionTimeout Composable
 *
 * Gère le timeout de session et affiche des avertissements avant l'expiration.
 *
 * Fonctionnalités:
 * - Suivi du timeout de session basé sur l'expiration du token d'accès (15 min)
 * - Affichage d'un avertissement à 13 minutes (2 min avant expiration)
 * - Refresh proactif du token à 13 minutes pour éviter le timeout utilisateur
 * - Déconnexion automatique à 15 minutes en cas d'échec du refresh
 * - Réinitialisation des timers sur activité utilisateur
 *
 * Expirations des tokens:
 * - Access token (JWT): 15 minutes
 * - Avertissement + refresh proactif: à 13 minutes (2 min avant expiration)
 * - Déconnexion automatique: à 15 minutes (expiration complète)
 *
 * IMPORTANT: Le composable suppose que l'interceptor Axios gère le refresh
 * automatique lors des requêtes 401. Ce composable déclenche un refresh
 * PROACTIF avant que le token n'expire pour une meilleure UX.
 *
 * Flux d'activation:
 * 1. User login → startSessionTimeout() appelé
 * 2. À 13 min → proactiveRefresh() + warning notification
 * 3. À 15 min → performAutoLogout() (fallback si refresh échoue)
 * 4. Toute activité utilisateur → resetSessionTimeout()
 *
 * @module composables/useSessionTimeout
 */

import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotification } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import apiClient from '@/services/api'

// Timeouts basés sur l'expiration du token d'accès JWT (15 minutes)
const REFRESH_TIME = 13 * 60 * 1000 // Refresh proactif à 13 minutes (2 min avant expiration)
const WARNING_TIME = 13 * 60 * 1000 // Avertissement simultané au refresh (13 min)
const LOGOUT_TIME = 15 * 60 * 1000 // Déconnexion automatique à 15 minutes (fallback)

export function useSessionTimeout() {
  const router = useRouter()
  const authStore = useAuthStore()

  /**
   * Récupère l'instance de notification de manière paresseuse
   * Évite d'appeler useNotification() avant que le provider soit monté
   * Retourne null si le provider n'est pas disponible
   */
  const getNotification = () => {
    try {
      return useNotification()
    } catch (error) {
      // Provider non disponible - sera réessayé au prochain appel
      if (import.meta.env.DEV) {
        console.warn('Notification provider not available yet')
      }
      return null
    }
  }

  // Suivi des timers
  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  let warningTimer: ReturnType<typeof setTimeout> | null = null
  let logoutTimer: ReturnType<typeof setTimeout> | null = null
  let activityTimeout: ReturnType<typeof setTimeout> | null = null

  // Suivi de l'état du refresh
  let isRefreshInProgress = ref(false)
  const warningShown = ref(false)

  /**
   * Refresh proactif du token d'accès
   *
   * Appelé à 13 minutes pour rafraîchir le token AVANT son expiration à 15 minutes.
   * Cela permet d'éviter que l'utilisateur se retrouve soudainement déconnecté
   * lors d'une requête API.
   *
   * Le refresh est géré par l'interceptor Axios qui appelle automatiquement
   * POST /api/auth/refresh pour obtenir un nouveau token.
   *
   * En cas d'échec (refresh token expiré, erreur serveur), l'utilisateur
   * sera déconnecté lors de la prochaine requête 401.
   */
  const proactiveRefresh = async (): Promise<void> => {
    if (isRefreshInProgress.value) {
      return // Éviter les appels de refresh multiples
    }

    isRefreshInProgress.value = true

    try {
      // Appel au endpoint de refresh
      await apiClient.post('/auth/refresh')

      if (import.meta.env.DEV) {
        console.log('Proactive token refresh successful')
      }

      // Réinitialiser les timers après un refresh réussi
      resetSessionTimeout()
    } catch (error: unknown) {
      // Échec du refresh - le token restera à l'ancienne valeur
      // La déconnexion aura lieu au logout timer ou lors d'une requête 401
      if (import.meta.env.DEV) {
        console.warn('Proactive token refresh failed', error)
      }
    } finally {
      isRefreshInProgress.value = false
    }
  }

  /**
   * Démarrage du suivi du timeout de session
   *
   * Appelé lors de la connexion de l'utilisateur.
   *
   * Configure trois timers:
   * 1. refreshTimer (13 min): Refresh proactif du token
   * 2. warningTimer (13 min): Affichage du warning notification
   * 3. logoutTimer (15 min): Déconnexion automatique (fallback)
   */
  const startSessionTimeout = (): void => {
    // Réinitialiser les flags
    warningShown.value = false
    isRefreshInProgress.value = false

    // Nettoyer tous les timers existants
    clearAllTimers()

    // Timer de refresh proactif (13 minutes)
    refreshTimer = setTimeout(() => {
      proactiveRefresh()
    }, REFRESH_TIME)

    // Timer d'avertissement (13 minutes)
    warningTimer = setTimeout(() => {
      showSessionWarning()
    }, WARNING_TIME)

    // Timer de déconnexion automatique (15 minutes - fallback)
    logoutTimer = setTimeout(() => {
      performAutoLogout()
    }, LOGOUT_TIME)
  }

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
   * Affiche une notification d'avertissement de session expirant bientôt
   *
   * Notifie l'utilisateur que sa session expire dans 2 minutes et lui propose
   * d'étendre sa session en cliquant sur le bouton d'action.
   *
   * Cette notification ne s'affiche qu'une seule fois par session.
   * Si le refresh proactif s'est bien déroulé, la session sera rafraîchie
   * et l'utilisateur peut continuer sans interruption.
   */
  const showSessionWarning = (): void => {
    if (warningShown.value) {
      return // Afficher une seule fois par session
    }

    warningShown.value = true

    // Récupérer l'instance de notification
    const notification = getNotification()
    if (!notification) {
      if (import.meta.env.DEV) {
        console.warn('Cannot show session warning: notification provider not available')
      }
      return
    }

    // Créer une notification avec action pour étendre la session
    notification.warning({
      title: 'Session expire bientôt',
      content:
        'Votre session va expirer dans 2 minutes. Continuez à utiliser l\'application ou cliquez ci-dessous pour étendre votre session.',
      duration: 0, // Ne pas auto-fermer
      action: () => {
        // Utilisateur a cliqué sur l'action d'extension
        extendSession()
      },
      onClose: () => {
        // Utilisateur a fermé la notification sans cliquer sur l'action
        // La déconnexion automatique se fera si l'utilisateur n'est pas actif
      }
    })
  }

  /**
   * Étend la session en réinitialisant les timers
   *
   * Appelé quand l'utilisateur clique sur le bouton d'extension de session
   * ou quand il effectue une activité (souris, clavier, etc.).
   */
  const extendSession = (): void => {
    // Réinitialiser les timers de session
    resetSessionTimeout()

    // Afficher une notification de succès
    const notification = getNotification()
    if (notification) {
      notification.success({
        title: 'Session prolongée',
        content: 'Votre session a été prolongée pour 15 minutes supplémentaires.',
        duration: 3
      })
    }
  }

  /**
   * Effectue une déconnexion automatique
   *
   * Appelé quand le timeout de session expire complètement (15 minutes).
   * C'est un fallback en cas d'échec du refresh proactif.
   */
  const performAutoLogout = async (): Promise<void> => {
    // Afficher une notification d'erreur
    const notification = getNotification()
    if (notification) {
      notification.error({
        title: 'Session expirée',
        content:
          'Votre session a expiré due à une inactivité. Veuillez vous reconnecter.',
        duration: 3
      })
    }

    // Déconnecter l'utilisateur
    try {
      await authStore.logout()
    } catch (error: unknown) {
      // Erreur déjà gérée par le store
      if (import.meta.env.DEV) {
        console.error('Error during auto logout:', error)
      }
    }

    // Rediriger vers la page de connexion
    router.push({ name: 'Login' })
  }

  /**
   * Nettoie tous les timers actifs
   *
   * Appelé lors de la réinitialisation des timers ou de la déconnexion
   * pour éviter les fuites mémoire.
   */
  const clearAllTimers = (): void => {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }

    if (warningTimer) {
      clearTimeout(warningTimer)
      warningTimer = null
    }

    if (logoutTimer) {
      clearTimeout(logoutTimer)
      logoutTimer = null
    }

    if (activityTimeout) {
      clearTimeout(activityTimeout)
      activityTimeout = null
    }
  }

  /**
   * Gère l'activité utilisateur pour réinitialiser le timeout de session
   *
   * Appelé sur les événements souris, clavier, ou tactile.
   * Utilise un debounce de 1 seconde pour éviter de déclencher
   * trop de réinitialisations sur des événements rapides.
   */
  const handleUserActivity = (): void => {
    // Debounce des événements d'activité - ne pas réinitialiser sur chaque événement
    if (activityTimeout) {
      clearTimeout(activityTimeout)
    }

    activityTimeout = setTimeout(() => {
      // Réinitialiser uniquement si l'utilisateur est authentifié
      if (authStore.isAuthenticated) {
        resetSessionTimeout()
      }
    }, 1000) // Debounce pour 1 seconde
  }

  /**
   * Configure les event listeners pour détecter l'activité utilisateur
   *
   * Écoute les événements suivants:
   * - mousemove, mousedown: Mouvements souris
   * - keypress: Appuis clavier
   * - scroll: Défilement de la page
   * - touchstart: Interaction tactile
   */
  const setupActivityListeners = (): void => {
    // Écouter les événements d'activité utilisateur
    window.addEventListener('mousemove', handleUserActivity)
    window.addEventListener('mousedown', handleUserActivity)
    window.addEventListener('keypress', handleUserActivity)
    window.addEventListener('scroll', handleUserActivity)
    window.addEventListener('touchstart', handleUserActivity)
  }

  /**
   * Supprime les event listeners d'activité utilisateur
   *
   * Appelé lors de la déconnexion pour éviter les fuites mémoire.
   */
  const removeActivityListeners = (): void => {
    window.removeEventListener('mousemove', handleUserActivity)
    window.removeEventListener('mousedown', handleUserActivity)
    window.removeEventListener('keypress', handleUserActivity)
    window.removeEventListener('scroll', handleUserActivity)
    window.removeEventListener('touchstart', handleUserActivity)
  }

  /**
   * Arrête le suivi du timeout de session
   *
   * Appelé lors de la déconnexion de l'utilisateur.
   * Nettoie tous les timers et event listeners.
   */
  const stopSessionTimeout = (): void => {
    clearAllTimers()
    removeActivityListeners()
    warningShown.value = false
    isRefreshInProgress.value = false
  }

  onMounted(() => {
    // Initialiser uniquement si l'utilisateur est authentifié
    if (authStore.isAuthenticated) {
      setupActivityListeners()
      startSessionTimeout()
    }
  })

  onUnmounted(() => {
    stopSessionTimeout()
  })

  return {
    startSessionTimeout,
    resetSessionTimeout,
    stopSessionTimeout,
    extendSession,
    warningShown
  }
}

export default useSessionTimeout
