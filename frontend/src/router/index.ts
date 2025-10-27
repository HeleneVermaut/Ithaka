/**
 * Configuration du routeur Vue Router
 *
 * Vue Router est le routeur officiel pour Vue.js.
 * Il permet de gérer la navigation entre les différentes pages de l'application
 * (SPA - Single Page Application).
 *
 * Fonctionnalités :
 * - Définition des routes (URL -> Composant)
 * - Navigation guards (protéger les routes authentifiées)
 * - Lazy loading des composants (chargement à la demande)
 * - Gestion de l'historique du navigateur
 */

import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * Définition des routes de l'application
 *
 * Chaque route associe un chemin (path) à un composant Vue.
 * Les composants sont chargés en lazy loading avec import() pour optimiser
 * les performances (seules les pages visitées sont téléchargées).
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Accueil'
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Connexion',
      hideForAuth: true // Cache cette route si l'utilisateur est connecté
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Inscription',
      hideForAuth: true
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: {
      requiresAuth: true, // Cette route nécessite une authentification
      title: 'Tableau de bord'
    }
  },
  // Route 404 - Doit être en dernière position
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: 'Page non trouvée'
    }
  }
]

/**
 * Instance du routeur Vue Router
 *
 * createWebHistory : Utilise l'API History du navigateur (URLs propres sans #)
 * base : Chemin de base de l'application (par défaut '/')
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Comportement du scroll lors de la navigation
  scrollBehavior() {
    // Scroll en haut de la page à chaque changement de route
    return { top: 0 }
  }
})

/**
 * Navigation Guard Globale
 *
 * S'exécute AVANT chaque changement de route pour vérifier :
 * - Si la route nécessite une authentification (requiresAuth)
 * - Si l'utilisateur est connecté
 * - Si la route doit être cachée pour les utilisateurs connectés (hideForAuth)
 *
 * @param to - Route de destination
 * @param from - Route actuelle
 * @param next - Fonction pour continuer/bloquer la navigation
 */
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // Mise à jour du titre de la page
  const defaultTitle = import.meta.env.VITE_APP_TITLE
  document.title = to.meta.title ? `${to.meta.title} - ${defaultTitle}` : defaultTitle

  // Vérification de l'authentification
  const requiresAuth = to.meta.requiresAuth as boolean
  const hideForAuth = to.meta.hideForAuth as boolean
  const isAuthenticated = authStore.isAuthenticated

  // Si la route nécessite une authentification et que l'utilisateur n'est pas connecté
  if (requiresAuth && !isAuthenticated) {
    console.warn('Access denied - Authentication required')
    // Redirection vers la page de connexion avec redirection de retour
    next({
      name: 'Login',
      query: { redirect: to.fullPath } // Permet de revenir après connexion
    })
    return
  }

  // Si la route doit être cachée pour les utilisateurs connectés (ex: login, register)
  if (hideForAuth && isAuthenticated) {
    console.log('User already authenticated, redirecting to dashboard')
    next({ name: 'Dashboard' })
    return
  }

  // Autoriser la navigation
  next()
})

/**
 * Export de l'instance du routeur
 *
 * Cette instance est ensuite utilisée dans main.ts :
 * app.use(router)
 */
export default router
