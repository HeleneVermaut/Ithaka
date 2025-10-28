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

/**
 * Instance Axios configurée pour communiquer avec le backend
 *
 * Toutes les requêtes HTTP doivent utiliser cette instance plutôt
 * que d'appeler axios directement
 */
const apiClient: AxiosInstance = axios.create({
  // URL de base du backend (définie dans .env)
  baseURL: import.meta.env.VITE_API_BASE_URL,

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
    // Mode debug : affiche les détails de la requête dans la console
    if (import.meta.env.VITE_DEBUG_MODE === 'true') {
      console.log('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data
      })
    }

    return config
  },
  (error: AxiosError): Promise<AxiosError> => {
    // En cas d'erreur lors de la préparation de la requête
    console.error('Request interceptor error:', error)
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
 * - 500 Server Error : Erreur serveur
 *
 * AUTO-REFRESH FLOW:
 * 1. Requête échoue avec 401
 * 2. Interceptor appelle automatiquement /api/auth/refresh
 * 3. Si refresh réussit : réessayer la requête originale
 * 4. Si refresh échoue : déconnecter l'utilisateur
 * 5. Gestion d'une queue pour éviter plusieurs appels refresh simultanés
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Mode debug : affiche les détails de la réponse dans la console
    if (import.meta.env.VITE_DEBUG_MODE === 'true') {
      console.log('API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      })
    }

    // Retourne la réponse sans modification si tout va bien
    return response
  },
  async (error: AxiosError<ApiError>): Promise<any> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Gestion des erreurs HTTP
    if (error.response) {
      const status = error.response.status
      const errorData = error.response.data

      // 401 Unauthorized : Tentative d'auto-refresh du token
      if (status === 401 && originalRequest && !originalRequest._retry) {
        // Éviter l'auto-refresh sur l'endpoint /auth/refresh lui-même
        if (originalRequest.url?.includes('/auth/refresh')) {
          console.warn('Refresh token expired - User will be logged out')
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
          console.log('Access token expired - Attempting auto-refresh')

          // Appeler l'endpoint de refresh
          await apiClient.post('/auth/refresh')

          console.log('Token refresh successful - Retrying original request')

          // Refresh réussi, traiter la queue
          processQueue(null, null)
          isRefreshing = false

          // Réessayer la requête originale avec le nouveau token
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh échoué (refresh token expiré ou invalide)
          console.error('Token refresh failed:', refreshError)
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
        console.warn('Access forbidden - Insufficient permissions')
      }

      // 404 Not Found : La ressource demandée n'existe pas
      if (status === 404) {
        console.warn('Resource not found:', error.response.config?.url)
      }

      // 500 Server Error : Erreur interne du serveur
      if (status >= 500) {
        console.error('Server error:', errorData)
      }
    } else if (error.request) {
      // La requête a été envoyée mais aucune réponse n'a été reçue
      // Cela peut arriver si le serveur est down ou si il y a un problème réseau
      console.error('No response from server - Network error or server down')
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('Request setup error:', error.message)
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
