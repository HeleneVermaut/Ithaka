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
 * Intercepteur de réponse : Gère les erreurs HTTP globalement
 *
 * Cet intercepteur s'exécute APRÈS chaque réponse HTTP.
 * Il permet de centraliser la gestion des erreurs :
 * - 401 Unauthorized : Déconnexion automatique
 * - 403 Forbidden : Accès refusé
 * - 404 Not Found : Ressource introuvable
 * - 500 Server Error : Erreur serveur
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
  (error: AxiosError<ApiError>): Promise<AxiosError<ApiError>> => {
    // Gestion des erreurs HTTP
    if (error.response) {
      const status = error.response.status
      const errorData = error.response.data

      // 401 Unauthorized : Token expiré ou invalide
      if (status === 401) {
        console.warn('Authentication error - Token expired or invalid')
        // Note: Les tokens httpOnly sont automatiquement supprimés par le backend
        // La redirection sera gérée par le router avec les guards
        // Le store Pinia sera également nettoyé par le guard de navigation
      }

      // 403 Forbidden : L'utilisateur n'a pas les permissions
      if (status === 403) {
        console.warn('Access forbidden - Insufficient permissions')
      }

      // 404 Not Found : La ressource demandée n'existe pas
      if (status === 404) {
        console.warn('Resource not found:', error.response.config.url)
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
