/**
 * Configuration et instance Axios pour la communication avec le backend
 *
 * Ce fichier centralise toute la configuration HTTP de l'application :
 * - Instance Axios configurée avec l'URL de base
 * - Intercepteurs de requête pour ajouter le token d'authentification
 * - Intercepteurs de réponse pour gérer les erreurs globalement
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import type { ApiError } from '@/types/models'
import { getErrorMessageFromStatus, ERROR_MESSAGES } from '@/constants/errorMessages'
import { debugLog, DebugCategory, DEBUG } from '@/utils/debug'

/**
 * Environment variable validation
 *
 * Ensures that VITE_API_BASE_URL is properly configured before creating the API client.
 * This prevents runtime errors and provides clear feedback during development.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL

if (!baseURL) {
  throw new Error(
    'VITE_API_BASE_URL environment variable is not defined. ' +
    'Please check your .env file and ensure VITE_API_BASE_URL is set correctly. ' +
    'Example: VITE_API_BASE_URL=http://localhost:3000/api'
  )
}

/**
 * Instance Axios configurée pour communiquer avec le backend
 *
 * Toutes les requêtes HTTP doivent utiliser cette instance plutôt
 * que d'appeler axios directement
 */
const apiClient: AxiosInstance = axios.create({
  // URL de base du backend (définie dans .env et validée ci-dessus)
  baseURL: baseURL,

  // Timeout après 30 secondes (30000 ms)
  timeout: 30000,

  // Headers par défaut pour toutes les requêtes
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },

  // IMPORTANT: Permet l'envoi automatique des cookies httpOnly
  // Les JWT tokens sont stockés dans des cookies httpOnly côté backend
  // Cette option permet à Axios d'inclure ces cookies dans chaque requête
  withCredentials: true
})

/**
 * Intercepteur de requête : Log des requêtes en mode debug
 *
 * Cet intercepteur s'exécute AVANT chaque requête HTTP.
 * Il affiche les détails de la requête dans la console si le mode debug est activé.
 *
 * Note: Nous n'ajoutons PAS de header Authorization ici car les tokens JWT
 * sont gérés automatiquement via des cookies httpOnly (withCredentials: true).
 * Le backend lit les tokens directement depuis les cookies.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Debug mode: log request details
    if (DEBUG) {
      debugLog(DebugCategory.API, `Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params
      })
    }

    return config
  },
  (error: AxiosError): Promise<AxiosError> => {
    // En cas d'erreur lors de la préparation de la requête
    if (DEBUG) {
      debugLog(DebugCategory.API, 'Request interceptor error', { error })
    }
    return Promise.reject(error)
  }
)

/**
 * État de gestion du refresh token
 * Permet d'éviter les boucles infinies et de gérer la queue de requêtes
 */
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

/**
 * Traite la queue de requêtes en attente après un refresh réussi ou échoué
 */
const processQueue = (error: Error | null, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

/**
 * Intercepteur de réponse : Gère les erreurs HTTP et l'auto-refresh des tokens
 *
 * Cet intercepteur s'exécute APRÈS chaque réponse HTTP.
 * Il permet de centraliser la gestion des erreurs :
 * - 401 Unauthorized : Auto-refresh du token ou déconnexion
 * - 403 Forbidden : Accès refusé
 * - 404 Not Found : Ressource introuvable
 * - 408/TIMEOUT : Délai d'attente dépassé
 * - 500 Server Error : Erreur serveur
 *
 * AUTO-REFRESH FLOW:
 * 1. Requête échoue avec 401
 * 2. Interceptor appelle automatiquement /api/auth/refresh
 * 3. Si refresh réussit : réessayer la requête originale
 * 4. Si refresh échoue : déconnecter l'utilisateur
 * 5. Gestion d'une queue pour éviter plusieurs appels refresh simultanés
 *
 * TIMEOUT HANDLING:
 * - Requests timeout after 30 seconds (30000ms)
 * - ECONNABORTED indicates request was aborted due to timeout
 * - Network errors show appropriate user-friendly messages
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Debug mode: log response details
    if (DEBUG) {
      debugLog(DebugCategory.API, `Response: ${response.status} ${response.config.url}`, {
        data: response.data
      })
    }

    // Retourne la réponse sans modification si tout va bien
    return response
  },
  async (error: AxiosError<ApiError>): Promise<any> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // ========================================
    // TIMEOUT ERROR HANDLING
    // ========================================

    if (error.code === 'ECONNABORTED') {
      debugLog(DebugCategory.API, 'Request timeout - exceeded 30 second limit')

      // Show user-friendly timeout message
      if (typeof window !== 'undefined' && (window as any).$message) {
        (window as any).$message.error(ERROR_MESSAGES.NETWORK_ERROR)
      }

      return Promise.reject(error)
    }

    // ========================================
    // NETWORK ERROR HANDLING
    // ========================================

    if (error.message === 'Network Error' && !error.response) {
      debugLog(DebugCategory.API, 'Network error - No response from server')

      // Show network error
      if (typeof window !== 'undefined' && (window as any).$message) {
        (window as any).$message.error(ERROR_MESSAGES.NETWORK_ERROR)
      }

      return Promise.reject(error)
    }

    // ========================================
    // HTTP ERROR HANDLING
    // ========================================

    // Gestion des erreurs HTTP
    if (error.response) {
      const status = error.response.status
      const errorData = error.response.data
      const userMessage = getErrorMessageFromStatus(status)

      // Log API error in debug mode
      if (DEBUG) {
        debugLog(DebugCategory.API, `Error: ${status} ${originalRequest?.url}`, {
          status,
          data: errorData
        })
      }

      // Show user-friendly error message
      if (typeof window !== 'undefined' && (window as any).$message && status !== 401) {
        (window as any).$message.error(userMessage)
      }

      // 401 Unauthorized : Tentative d'auto-refresh du token
      if (status === 401 && originalRequest && !originalRequest._retry) {
        // Éviter l'auto-refresh sur l'endpoint /auth/refresh lui-même
        if (originalRequest.url?.includes('/auth/refresh')) {
          if (DEBUG) {
            debugLog(DebugCategory.API, 'Refresh token expired - User will be logged out')
          }
          return Promise.reject(error)
        }

        // Si un refresh est déjà en cours, mettre cette requête en queue
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then(() => {
              // Marquer la requête comme déjà réessayée pour éviter les boucles infinies
              originalRequest._retry = true
              // Réessayer la requête originale après le refresh
              return apiClient(originalRequest)
            })
            .catch((err) => {
              return Promise.reject(err)
            })
        }

        // Marquer que cette requête a déjà été réessayée
        originalRequest._retry = true
        isRefreshing = true

        try {
          if (DEBUG) {
            debugLog(DebugCategory.API, 'Access token expired - Attempting auto-refresh')
          }

          // Appeler l'endpoint de refresh
          await apiClient.post('/auth/refresh')

          if (DEBUG) {
            debugLog(DebugCategory.API, 'Token refresh successful - Retrying original request')
          }

          // Refresh réussi, traiter la queue
          processQueue(null, null)
          isRefreshing = false

          // Réessayer la requête originale avec le nouveau token
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh échoué (refresh token expiré ou invalide)
          if (DEBUG) {
            debugLog(DebugCategory.API, 'Token refresh failed', { error: refreshError })
          }
          processQueue(refreshError as Error, null)
          isRefreshing = false

          // Déconnecter l'utilisateur
          // Note: L'import dynamique évite les dépendances circulaires
          const { useAuthStore } = await import('@/stores/auth')
          const authStore = useAuthStore()
          await authStore.logout()

          // Rediriger vers login
          const { default: router } = await import('@/router')
          router.push('/login')

          return Promise.reject(refreshError)
        }
      }

      // 403 Forbidden : L'utilisateur n'a pas les permissions
      if (status === 403) {
        if (DEBUG) {
          debugLog(DebugCategory.API, 'Access forbidden - Insufficient permissions')
        }
      }

      // 404 Not Found : La ressource demandée n'existe pas
      if (status === 404) {
        if (DEBUG) {
          debugLog(DebugCategory.API, 'Resource not found', { url: error.response.config?.url })
        }
      }

      // 408 Request Timeout
      if (status === 408) {
        if (DEBUG) {
          debugLog(DebugCategory.API, 'Server request timeout')
        }
        if (typeof window !== 'undefined' && (window as any).$message) {
          (window as any).$message.error('Délai d\'attente du serveur dépassé')
        }
      }

      // 500 Server Error : Erreur interne du serveur
      if (status >= 500) {
        if (DEBUG) {
          debugLog(DebugCategory.API, 'Server error', { status, data: errorData })
        }
        if (typeof window !== 'undefined' && (window as any).$message) {
          (window as any).$message.error('Erreur serveur - Veuillez réessayer plus tard')
        }
      }
    } else if (error.request) {
      // La requête a été envoyée mais aucune réponse n'a été reçue
      // Cela peut arriver si le serveur est down ou si il y a un problème réseau
      if (DEBUG) {
        debugLog(DebugCategory.API, 'No response from server - Network error or server down')
      }

      if (typeof window !== 'undefined' && (window as any).$message) {
        (window as any).$message.error('Aucune réponse du serveur')
      }
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      if (DEBUG) {
        debugLog(DebugCategory.API, 'Request setup error', { message: error.message })
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Export de l'instance Axios configurée
 *
 * Utilisation dans les autres fichiers :
 * import apiClient from '@/services/api'
 * const response = await apiClient.get('/users')
 */
export default apiClient
