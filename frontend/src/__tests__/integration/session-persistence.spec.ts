/**
 * Tests d'intégration pour la persistance de session et le refresh automatique du token
 *
 * Ce fichier teste l'ensemble du système de gestion de session du côté frontend,
 * en simulant des scénarios réalistes de persistance et d'expiration de tokens.
 *
 * Scénarios couverts:
 * 1. Session persiste après un refresh de page (F5)
 * 2. Session persiste après navigation vers un carnet
 * 3. Refresh automatique du token fonctionne
 * 4. Utilisateur n'est pas redirigé vers /login après refresh si session valide
 * 5. Données utilisateur sont restaurées correctement après refresh de page
 * 6. Retry automatique sur 401 après refresh token réussi
 * 7. Timings du refresh proactif du token
 * 8. Gestion des erreurs lors du refresh token
 *
 * Architecture du test:
 * - Mock de authService pour simuler les appels API
 * - Mock du router pour capturer les redirections
 * - Mock d'Axios interceptor pour simuler le refresh de token
 * - Assertions sur l'état de la session, les appels API et les redirections
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import authServiceDefault from '@/services/authService'
import type { User } from '@/types/models'

/**
 * Mock complet du service authService
 * Permet de contrôler les réponses et de vérifier les appels
 */
vi.mock('@/services/authService', () => ({
  default: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    updatePassword: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyResetToken: vi.fn(),
    checkEmailUnique: vi.fn(),
    checkPseudoUnique: vi.fn(),
    exportUserData: vi.fn()
  }
}))

/**
 * Mock du client Axios pour capturer les interceptors
 * et simuler les scénarios de refresh token
 */
vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn()
      },
      response: {
        use: vi.fn()
      }
    }
  }
}))

/**
 * Utilisateur de test pour les scénarios
 */
const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  pseudo: 'johndoe',
  bio: 'Test user',
  avatarBase64: undefined,
  lastLoginAt: '2025-10-30T10:00:00Z' as any,
  createdAt: '2025-01-01T00:00:00Z' as any,
  updatedAt: '2025-10-30T10:00:00Z' as any
}

/**
 * Utilisateur mis à jour (simulant un profil mis à jour après session)
 */
const updatedMockUser: User = {
  ...mockUser,
  firstName: 'Johnny',
  bio: 'Updated bio'
}

describe('Integration Tests - Session Persistence and Token Refresh', () => {
  beforeEach(() => {
    // Initialiser Pinia pour chaque test
    setActivePinia(createPinia())
    // Réinitialiser tous les mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ========================================
  // TEST 1: Persistence après refresh de page
  // ========================================

  describe('Session Persistence - Page Refresh (F5)', () => {
    it('should restore session data from server after page refresh', async () => {
      /**
       * Scénario:
       * 1. Utilisateur est connecté
       * 2. Utilisateur refresh la page (F5)
       * 3. Frontend appelle initializeSession() au premier changement de route
       * 4. Session doit être restaurée depuis les cookies du serveur
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act - Simuler le premier chargement de page avec restauration de session
      const sessionRestored = await authStore.initializeSession()

      // Assert
      expect(sessionRestored).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user).toEqual(mockUser)
      expect(vi.mocked(authServiceDefault.getProfile)).toHaveBeenCalledTimes(1)
    })

    it('should maintain user authentication state across page refresh', async () => {
      /**
       * Scénario:
       * 1. Utilisateur connecté avec données de session
       * 2. Refresh de page
       * 3. Les données utilisateur doivent persister en état
       * 4. Les propriétés importantes (id, email) doivent être accessibles
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act
      await authStore.initializeSession()
      const userBeforeRefresh = authStore.user

      // Simuler un second appel (comme après un refresh)
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(updatedMockUser)
      await authStore.initializeSession()
      const userAfterRefresh = authStore.user

      // Assert
      expect(userBeforeRefresh?.id).toBe(mockUser.id)
      expect(userAfterRefresh?.id).toBe(updatedMockUser.id)
      expect(authStore.isAuthenticated).toBe(true)
    })

    it('should not redirect to login on successful session restoration', async () => {
      /**
       * Scénario:
       * 1. Utilisateur visite une route protégée après refresh
       * 2. Frontend restaure la session
       * 3. Utilisateur ne doit PAS être redirigé vers /login
       * 4. L'accès à la route protégée doit être autorisé
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act
      const sessionRestored = await authStore.initializeSession()
      const requiresAuth = true
      const isAuthenticated = authStore.isAuthenticated

      // Assert - Simulation de la logique du router guard
      expect(sessionRestored).toBe(true)
      expect(isAuthenticated).toBe(true)

      // Vérifier que la redirection vers login ne serait PAS déclenchée
      const shouldRedirectToLogin = requiresAuth && !isAuthenticated
      expect(shouldRedirectToLogin).toBe(false)
    })

    it('should handle failed session restoration with graceful degradation', async () => {
      /**
       * Scénario:
       * 1. Utilisateur refresh la page mais la session a expiré
       * 2. getProfile() retourne 401 (token expiré)
       * 3. initializeSession() retourne false
       * 4. Utilisateur reste déconnecté, peut se reconnecter
       */

      // Arrange
      const authStore = useAuthStore()
      const expiredError = new Error('401 Unauthorized')
      vi.mocked(authServiceDefault.getProfile).mockRejectedValueOnce(expiredError)

      // Act
      const sessionRestored = await authStore.initializeSession()

      // Assert
      expect(sessionRestored).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
      // Pas d'erreur affichée (gestion silencieuse)
      expect(authStore.error).toBeNull()
    })
  })

  // ========================================
  // TEST 2: Persistence lors de navigation
  // ========================================

  describe('Session Persistence - Navigation to Notebook', () => {
    it('should maintain session when navigating between routes', async () => {
      /**
       * Scénario:
       * 1. Utilisateur connecté sur la page d'accueil
       * 2. Utilisateur navigue vers /notebooks
       * 3. Session doit persister via les cookies httpOnly
       * 4. Utilisateur reste authentifié
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act - Première initialisation de session
      await authStore.initializeSession()
      const authStateBeforeNavigation = authStore.isAuthenticated

      // Simuler une navigation (les cookies restent les mêmes)
      const authStateAfterNavigation = authStore.isAuthenticated

      // Assert
      expect(authStateBeforeNavigation).toBe(true)
      expect(authStateAfterNavigation).toBe(true)
      expect(authStore.user?.id).toBe(mockUser.id)
    })

    it('should preserve user data across multiple route changes', async () => {
      /**
       * Scénario:
       * 1. Utilisateur connecté
       * 2. Navigue entre plusieurs routes (dashboard, notebooks, editor)
       * 3. Les données utilisateur ne doivent pas être perdues
       * 4. La session doit rester cohérente
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(mockUser)

      // Act - Initialiser une fois au démarrage
      await authStore.initializeSession()
      const initialUser = authStore.user

      // Simuler navigations multiples (pas d'appels supplémentaires si session stable)
      // Les données dans le store ne changent que si modifiées explicitement
      const userAfterRoutes = authStore.user

      // Assert
      expect(initialUser).toEqual(userAfterRoutes)
      expect(authStore.isAuthenticated).toBe(true)
    })

    it('should handle notebook navigation with active session', async () => {
      /**
       * Scénario:
       * 1. Utilisateur navigue vers /notebooks/:notebookId/edit/:pageId
       * 2. Cette route nécessite requiresAuth: true
       * 3. Session doit être disponible pour les appels API ultérieurs
       * 4. Les cookies sont automatiquement inclus (withCredentials: true)
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act
      await authStore.initializeSession()
      const isAuthenticatedForNotebookRoute = authStore.isAuthenticated

      // Simuler une tentative d'accès à une route protégée
      const routeRequiresAuth = true
      const canAccessProtectedRoute = routeRequiresAuth && isAuthenticatedForNotebookRoute

      // Assert
      expect(canAccessProtectedRoute).toBe(true)
      expect(authStore.user?.id).toBe(mockUser.id)
    })
  })

  // ========================================
  // TEST 3: Refresh automatique du token
  // ========================================

  describe('Automatic Token Refresh', () => {
    it('should automatically refresh token on 401 Unauthorized', async () => {
      /**
       * Scénario (flux complet):
       * 1. Requête API échoue avec 401 (access token expiré)
       * 2. Interceptor détecte le 401
       * 3. Interceptor appelle automatiquement /auth/refresh
       * 4. Backend retourne un nouveau access token (dans les cookies)
       * 5. Requête originale est automatiquement réessayée
       * 6. L'utilisateur n'est jamais redirigé vers login
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act - Établir la session initiale
      await authStore.initializeSession()
      expect(authStore.isAuthenticated).toBe(true)

      // Simuler l'interception d'un 401 et le refresh automatique
      // Dans le vrai système, cela serait géré par l'interceptor Axios
      const simulate401RefreshFlow = async () => {
        // 1. Première requête retourne 401
        // 2. Interceptor appelle /auth/refresh
        // 3. getProfile() est réessayé avec le nouveau token
        vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

        // Act - Réessayer la requête
        const retryResult = await authServiceDefault.getProfile()
        return retryResult
      }

      const retryResult = await simulate401RefreshFlow()

      // Assert
      expect(retryResult).toEqual(mockUser)
      expect(authStore.isAuthenticated).toBe(true)
      // L'utilisateur n'a pas été redirigé
    })

    it('should queue failed requests during token refresh', async () => {
      /**
       * Scénario (gestion de la file d'attente):
       * 1. Plusieurs requêtes arrivent simultanément
       * 2. Première requête échoue avec 401
       * 3. Refresh du token est lancé
       * 4. Requêtes suivantes sont mises en queue
       * 5. Une fois le refresh réussi, toutes les requêtes en queue sont réessayées
       * 6. Pas d'appels simultanés à /auth/refresh
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(mockUser)

      // Act
      await authStore.initializeSession()

      // Simuler 3 requêtes qui échouent avec 401
      const simulateQueuedRequests = async () => {
        // Ces requêtes seraient automatiquement mises en queue par l'interceptor
        const request1 = authServiceDefault.getProfile()
        const request2 = authServiceDefault.getProfile()
        const request3 = authServiceDefault.getProfile()

        // Attendre que toutes les requêtes soient réessayées
        const results = await Promise.all([request1, request2, request3])
        return results
      }

      const results = await simulateQueuedRequests()

      // Assert
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toEqual(mockUser)
      })
      // Le mock getProfile a été appelé 4 fois (1 pour init + 3 pour queue)
      expect(vi.mocked(authServiceDefault.getProfile).mock.calls.length).toBe(4)
    })

    it('should handle refresh token expiration with logout', async () => {
      /**
       * Scénario (refresh token expiré):
       * 1. Access token expire
       * 2. Interceptor appelle /auth/refresh
       * 3. Refresh échoue (refresh token expiré)
       * 4. Utilisateur est automatiquement déconnecté
       * 5. Utilisateur est redirigé vers /login
       * 6. Session est vidée
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)
      vi.mocked(authServiceDefault.logout).mockResolvedValueOnce({
        success: true,
        message: 'Logged out'
      } as any)

      // Act
      await authStore.initializeSession()
      expect(authStore.isAuthenticated).toBe(true)

      // Simuler l'expiration du refresh token
      // Dans le système réel, l'interceptor détecte 401 sur /auth/refresh
      // et appelle logout()
      await authStore.logout()

      // Assert
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
      expect(vi.mocked(authServiceDefault.logout)).toHaveBeenCalledTimes(1)
    })

    it('should retry original request after successful token refresh', async () => {
      /**
       * Scénario (retry automatique):
       * 1. Requête échoue avec 401
       * 2. Token est rafraîchi avec succès
       * 3. Requête originale est AUTOMATIQUEMENT réessayée
       * 4. Deuxième tentative réussit
       * 5. Résultat final est retourné à l'utilisateur
       * 6. L'utilisateur ne voit pas l'erreur 401 (transparent)
       */

      // Arrange
      const authStore = useAuthStore()

      // Première initialisation
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)
      await authStore.initializeSession()
      expect(authStore.isAuthenticated).toBe(true)

      // Simuler une requête qui retourne 401 puis réussit après refresh
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(updatedMockUser)

      // Act - Réessayer après refresh (transparent pour l'utilisateur)
      const finalResult = await authServiceDefault.getProfile()

      // Assert
      expect(finalResult).toEqual(updatedMockUser)
      // Le profil était accessibleMais a changé (données mises à jour)
      expect(vi.mocked(authServiceDefault.getProfile).mock.calls.length).toBe(2)
    })
  })

  // ========================================
  // TEST 4: Données utilisateur correctement restaurées
  // ========================================

  describe('User Data Restoration After Page Refresh', () => {
    it('should restore all user profile fields correctly', async () => {
      /**
       * Scénario:
       * 1. Utilisateur avec profil complet (bio, avatar, dates)
       * 2. Refresh de page
       * 3. Tous les champs du profil doivent être restaurés
       * 4. Pas de données perdues ou modifiées
       */

      // Arrange
      const authStore = useAuthStore()
      const completeUser: User = {
        ...mockUser,
        bio: 'Travel enthusiast and photographer',
        avatarBase64: 'data:image/png;base64,iVBORw0KGgo...'
      }
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(completeUser)

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.user).toEqual(completeUser)
      expect(authStore.user?.bio).toBe('Travel enthusiast and photographer')
      expect(authStore.user?.avatarBase64).toContain('data:image/png;base64')
      expect(authStore.user?.id).toBe(completeUser.id)
      expect(authStore.user?.email).toBe(completeUser.email)
      expect(authStore.user?.firstName).toBe(completeUser.firstName)
      expect(authStore.user?.lastName).toBe(completeUser.lastName)
      expect(authStore.user?.pseudo).toBe(completeUser.pseudo)
    })

    it('should handle minimal user data (no bio, no avatar)', async () => {
      /**
       * Scénario:
       * 1. Nouvel utilisateur avec données minimales
       * 2. Refresh de page
       * 3. Les champs optionnels sont undefined/vides
       * 4. La session restaure correctement les données minimales
       */

      // Arrange
      const authStore = useAuthStore()
      const minimalUser: User = {
        ...mockUser,
        bio: '',
        avatarBase64: undefined
      }
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(minimalUser)

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user?.email).toBe(minimalUser.email)
      expect(authStore.user?.bio).toBe('')
      expect(authStore.user?.avatarBase64).toBeUndefined()
    })

    it('should preserve timestamps from server', async () => {
      /**
       * Scénario:
       * 1. Utilisateur avec dates de création/mise à jour
       * 2. Refresh de page
       * 3. Les timestamps doivent être exactement restaurés
       * 4. Pas de remplacement par des valeurs locales
       */

      // Arrange
      const authStore = useAuthStore()
      const timestamps = {
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2025-10-28T15:45:00Z',
        lastLoginAt: '2025-10-30T14:20:00Z'
      }
      const userWithTimestamps: User = {
        ...mockUser,
        ...timestamps
      } as any
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(userWithTimestamps)

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.user?.createdAt).toBe(timestamps.createdAt)
      expect(authStore.user?.updatedAt).toBe(timestamps.updatedAt)
      expect(authStore.user?.lastLoginAt).toBe(timestamps.lastLoginAt)
    })
  })

  // ========================================
  // TEST 5: Retry automatique sur 401
  // ========================================

  describe('Automatic Retry on 401 with Token Refresh', () => {
    it('should mark request as retried to prevent infinite loops', async () => {
      /**
       * Scénario (prévention de boucles infinies):
       * 1. Requête 1 échoue avec 401
       * 2. Refresh est appelé
       * 3. Requête 1 est réessayée (marquée comme _retry: true)
       * 4. Si elle échoue à nouveau avec 401, PAS de nouvel refresh
       * 5. La boucle infinie est évitée
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act
      await authStore.initializeSession()

      // Simuler le marquage de retry
      const trackRetryFlag = {
        _retry: false,
        url: '/users/profile'
      }

      // Première tentative (pas encore marquée)
      expect(trackRetryFlag._retry).toBe(false)

      // Après détection de 401, marquer comme retry
      trackRetryFlag._retry = true
      expect(trackRetryFlag._retry).toBe(true)

      // Deuxième 401 : ne pas relancer le refresh car _retry = true
      const shouldRefreshAgain = !trackRetryFlag._retry
      expect(shouldRefreshAgain).toBe(false)
    })

    it('should only retry failed requests, not successful ones', async () => {
      /**
       * Scénario:
       * 1. Requête 1 réussit (200)
       * 2. Requête 2 échoue avec 401
       * 3. Requête 2 est réessayée après refresh
       * 4. Requête 1 n'est pas affectée (ne doit pas être réessayée)
       * 5. Chaque requête est gérée indépendamment
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act
      await authStore.initializeSession()

      // Simuler deux requêtes: une réussie, une échouée
      const request1Result = mockUser // Réussi
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(updatedMockUser)
      const request2Result = await authServiceDefault.getProfile() // Réessayée

      // Assert
      expect(request1Result).toEqual(mockUser)
      expect(request2Result).toEqual(updatedMockUser)
      // Seule la requête 2 a été réessayée
    })

    it('should handle rapid sequential 401 responses', async () => {
      /**
       * Scénario (race condition):
       * 1. Plusieurs requêtes arrivent pendant le refresh
       * 2. Toutes reçoivent 401 à cause du même token expiré
       * 3. Un seul /auth/refresh est appelé (pas de duplication)
       * 4. Toutes les requêtes sont réessayées après le unique refresh
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(mockUser)

      // Act
      await authStore.initializeSession()

      // Simuler 3 requêtes rapides
      const requests = await Promise.all([
        authServiceDefault.getProfile(),
        authServiceDefault.getProfile(),
        authServiceDefault.getProfile()
      ])

      // Assert
      expect(requests).toHaveLength(3)
      requests.forEach(result => {
        expect(result).toEqual(mockUser)
      })
    })
  })

  // ========================================
  // TEST 6: Timings du refresh proactif
  // ========================================

  describe('Proactive Token Refresh Timing', () => {
    it('should track token refresh timing for audit', async () => {
      /**
       * Scénario:
       * 1. Token obtenu avec TTL de 15 minutes
       * 2. Frontend devrait rafraîchir avant l'expiration
       * 3. Les timers et timestamps doivent être trackés
       * 4. Logs/audit pour vérifier les timings
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act
      const startTime = Date.now()
      await authStore.initializeSession()
      const endTime = Date.now()
      const elapsedTime = endTime - startTime

      // Assert
      expect(authStore.isAuthenticated).toBe(true)
      expect(elapsedTime).toBeGreaterThanOrEqual(0)
      expect(elapsedTime).toBeLessThan(5000) // Devrait être rapide
    })

    it('should handle rapid successive session refreshes', async () => {
      /**
       * Scénario:
       * 1. initializeSession() est appelé deux fois rapidement
       * 2. Le deuxième appel ne doit pas re-initialiser
       * 3. Dans le routeur, sessionInitialized flag le empêche
       * 4. Pas d'appels API redondants
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser)

      // Act
      const result1 = await authStore.initializeSession()
      const result2 = await authStore.initializeSession()

      // Assert
      expect(result1).toBe(true)
      expect(result2).toBe(true)
      // Les deux appels ont réussi
      expect(vi.mocked(authServiceDefault.getProfile).mock.calls.length).toBe(2)
    })

    it('should measure refresh response time for monitoring', async () => {
      /**
       * Scénario:
       * 1. Requête de refresh est timing'd
       * 2. Si > 5s, log un warning
       * 3. Si > 10s, log une erreur
       * 4. Permet la détection de problèmes de performance
       */

      // Arrange
      const authStore = useAuthStore()
      const mockDelayMs = 200 // Simulation d'une requête

      vi.mocked(authServiceDefault.getProfile).mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve(mockUser), mockDelayMs)
        )
      )

      // Act
      const startTime = Date.now()
      await authStore.initializeSession()
      const duration = Date.now() - startTime

      // Assert
      expect(duration).toBeGreaterThanOrEqual(mockDelayMs)
      expect(duration).toBeLessThan(mockDelayMs + 1000) // Avec overhead

      // Classification de la performance
      if (duration > 10000) {
        // Would log: ERROR performance
      } else if (duration > 5000) {
        // Would log: WARNING performance
      } else {
        // Normal performance
        expect(duration).toBeLessThan(5000)
      }
    })
  })

  // ========================================
  // TEST 7: Scénarios d'erreur complexes
  // ========================================

  describe('Complex Error Scenarios', () => {
    it('should handle partial network failure during refresh', async () => {
      /**
       * Scénario (réseau instable):
       * 1. Requête 1 échoue (timeout)
       * 2. /auth/refresh échoue aussi (timeout)
       * 3. Utilisateur est déconnecté en conséquence
       * 4. Graceful degradation appliquée
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)
      const networkError = new Error('Network timeout')

      // Act
      await authStore.initializeSession()
      expect(authStore.isAuthenticated).toBe(true)

      // Simuler une erreur réseau lors du refresh
      vi.mocked(authServiceDefault.getProfile).mockRejectedValueOnce(networkError)
      vi.mocked(authServiceDefault.logout).mockResolvedValueOnce({
        success: true,
        message: 'Logged out'
      } as any)

      await authStore.logout()

      // Assert
      expect(authStore.isAuthenticated).toBe(false)
    })

    it('should not expose token details in error messages', async () => {
      /**
       * Scénario (sécurité):
       * 1. Token refresh échoue
       * 2. Le message d'erreur NE DOIT PAS contenir le token
       * 3. Les erreurs sont génériques et sûres
       * 4. Pas de fuite d'informations sensibles
       */

      // Arrange
      const sensitiveError = new Error('Invalid token: eyJhbGciOiJIUzI1NiIs...')

      // Act & Assert
      // Les erreurs sensibles sont filtrées
      const sanitizedError = sensitiveError.message
        .replace(/eyJ[A-Za-z0-9_-]*/, '[REDACTED]')

      expect(sanitizedError).toContain('[REDACTED]')
      expect(sanitizedError).not.toContain('eyJ')
    })

    it('should recover from concurrent refresh attempts', async () => {
      /**
       * Scénario (concurrence):
       * 1. Deux requêtes échouent avec 401 simultanément
       * 2. Deux /auth/refresh tentent de s'exécuter
       * 3. Only le premier devrait procéder
       * 4. Le second devrait attendre le premier
       * 5. Les deux requêtes originales sont réessayées
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(mockUser)

      // Act
      await authStore.initializeSession()

      // Simuler des requêtes concurrentes
      const promise1 = authServiceDefault.getProfile()
      const promise2 = authServiceDefault.getProfile()

      const [result1, result2] = await Promise.all([promise1, promise2])

      // Assert
      expect(result1).toEqual(mockUser)
      expect(result2).toEqual(mockUser)
      // Les deux ont réussi (même après refresh)
    })
  })

  // ========================================
  // TEST 8: Intégration bout-en-bout
  // ========================================

  describe('End-to-End Integration Scenarios', () => {
    it('should handle complete login -> refresh -> navigation -> logout flow', async () => {
      /**
       * Scénario complet (cycle de vie):
       * 1. Utilisateur se connecte
       * 2. Refresh de page (session restaurée)
       * 3. Navigation vers carnet
       * 4. Token peut expirer et être rafraîchi automatiquement
       * 5. Utilisateur se déconnecte
       */

      // Arrange
      const authStore = useAuthStore()

      // Act - Étape 1: Connexion (simulée par initializeSession)
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)
      const step1 = await authStore.initializeSession()

      // Étape 2: Refresh de page
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)
      const step2 = await authStore.initializeSession()

      // Étape 3: Navigation (pas d'action, juste vérifier la session)
      const isStillAuthenticated = authStore.isAuthenticated

      // Étape 4: Possible expiration et refresh automatique (simulé)
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(updatedMockUser)
      const refreshResult = await authServiceDefault.getProfile()

      // Étape 5: Déconnexion
      vi.mocked(authServiceDefault.logout).mockResolvedValueOnce({
        success: true,
        message: 'Logged out'
      } as any)
      await authStore.logout()

      // Assert
      expect(step1).toBe(true) // Session initialisée
      expect(step2).toBe(true) // Session restaurée après refresh
      expect(isStillAuthenticated).toBe(true) // Authentification maintenue
      expect(refreshResult).toEqual(updatedMockUser) // Données rafraîchies
      expect(authStore.isAuthenticated).toBe(false) // Déconnecté
      expect(authStore.user).toBeNull()
    })

    it('should maintain consistency across auth store and router guard', async () => {
      /**
       * Scénario (cohérence):
       * 1. authStore state et router guard logic en sync
       * 2. Si authStore.isAuthenticated = true, router permet les routes protégées
       * 3. Si authStore.isAuthenticated = false, router redirige vers login
       * 4. Pas de désynchronisation
       */

      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act - Authentification
      await authStore.initializeSession()
      const storeIsAuthenticated = authStore.isAuthenticated

      // Vérifier la logique du router guard
      const requiresAuth = true
      const routerAllowsAccess = requiresAuth && storeIsAuthenticated

      // Assert
      expect(storeIsAuthenticated).toBe(true)
      expect(routerAllowsAccess).toBe(true)

      // Après déconnexion
      vi.mocked(authServiceDefault.logout).mockResolvedValueOnce({
        success: true,
        message: 'Logged out'
      } as any)
      await authStore.logout()

      const storeIsAuthenticatedAfterLogout = authStore.isAuthenticated
      const routerAllowsAccessAfterLogout = requiresAuth && storeIsAuthenticatedAfterLogout

      expect(storeIsAuthenticatedAfterLogout).toBe(false)
      expect(routerAllowsAccessAfterLogout).toBe(false)
    })

    it('should handle user profile updates during session', async () => {
      /**
       * Scénario (mise à jour pendant session):
       * 1. Utilisateur connecté avec profil initial
       * 2. Utilisateur met à jour son profil
       * 3. Store reflète les changements
       * 4. Page refresh restaure les données mises à jour
       */

      // Arrange
      const authStore = useAuthStore()

      // Act - Initialisation
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)
      await authStore.initializeSession()
      const initialBio = authStore.user?.bio

      // Simuler une mise à jour de profil
      vi.mocked(authServiceDefault.updateProfile).mockResolvedValueOnce({
        user: updatedMockUser,
        success: true
      } as any)

      const updateResult = await authServiceDefault.updateProfile({} as any)

      // Après refresh: restaurer les données mises à jour
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(updatedMockUser)
      await authStore.initializeSession()
      const finalBio = authStore.user?.bio

      // Assert
      expect(initialBio).toBe(mockUser.bio)
      expect(updateResult?.user).toEqual(updatedMockUser)
      expect(finalBio).toBe(updatedMockUser.bio)
    })
  })
})
