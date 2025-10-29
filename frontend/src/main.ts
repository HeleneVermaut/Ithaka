/**
 * Point d'entrée de l'application Vue.js 3
 *
 * Ce fichier initialise et configure l'application Vue :
 * - Création de l'instance Vue
 * - Enregistrement des plugins (Pinia, Router, NaiveUI)
 * - Restauration de la session utilisateur
 * - Montage de l'application dans le DOM
 *
 * Ordre d'exécution :
 * 1. Importation des dépendances
 * 2. Création de l'application Vue
 * 3. Configuration des plugins
 * 4. Restauration de la session (si token JWT existe)
 * 5. Montage dans #app (index.html)
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAuthStore } from '@/stores/auth'
import { DEBUG, showDebugIndicator } from './utils/debug'

// Styles globaux de l'application
import './assets/main.css'

/**
 * Fonction asynchrone de bootstrap de l'application
 *
 * On utilise une fonction asynchrone pour pouvoir attendre
 * la restauration de la session avant de monter l'application.
 * Cela évite un "flash" de la page de connexion si l'utilisateur
 * est déjà authentifié.
 */
const bootstrapApp = async (): Promise<void> => {
  // ========================================
  // 1. CRÉATION DE L'APPLICATION VUE
  // ========================================
  const app = createApp(App)

  // ========================================
  // 2. INSTALLATION DES PLUGINS
  // ========================================

  /**
   * Pinia : Gestionnaire d'état (state management)
   * Doit être installé AVANT le routeur car le routeur utilise les stores
   */
  const pinia = createPinia()
  app.use(pinia)

  /**
   * Vue Router : Gestion de la navigation
   * Doit être installé APRÈS Pinia car il utilise le store auth
   */
  app.use(router)

  // ========================================
  // 3. RESTAURATION DE LA SESSION
  // ========================================

  /**
   * Vérifie si un token JWT existe dans les cookies httpOnly
   * et restaure la session de l'utilisateur si possible.
   *
   * Cela permet de rester connecté même après fermeture du navigateur.
   * Si le token est expiré ou invalide, l'utilisateur restera simplement déconnecté.
   */
  const authStore = useAuthStore()
  try {
    await authStore.fetchProfile()
    console.log('Session restored successfully')
  } catch (error) {
    // Token expiré ou invalide - l'utilisateur reste déconnecté (comportement normal)
    console.warn('No active session, user will need to login')
  }

  // ========================================
  // 4. MONTAGE DE L'APPLICATION
  // ========================================

  /**
   * Monte l'application dans l'élément #app du fichier index.html
   * À partir de ce moment, Vue prend le contrôle de la partie UI
   */
  app.mount('#app')

  console.log('Application Ithaka mounted successfully')

  // ========================================
  // 5. ENABLE DEBUG MODE IF REQUESTED
  // ========================================

  /**
   * Show debug indicator if ?debug=true in URL
   * This helps developers understand debug mode is active
   */
  if (DEBUG) {
    showDebugIndicator()
  }
}

// ========================================
// 5. LANCEMENT DE L'APPLICATION
// ========================================

/**
 * Démarrage de l'application avec gestion des erreurs
 * Si une erreur critique se produit au démarrage, on l'affiche dans la console
 */
bootstrapApp().catch((error: unknown) => {
  console.error('Failed to bootstrap application:', error)
})
