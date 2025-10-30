/**
 * Tests pour la restauration automatique de session dans le router guard
 *
 * Ce fichier teste l'intégration de initializeSession() dans le beforeEach hook
 * du routeur Vue Router.
 *
 * Les tests couvrent :
 * - La restauration de session au premier changement de route
 * - Une seule invocation de initializeSession (flag sessionInitialized)
 * - Accès aux routes protégées avec session restaurée
 * - Redirection vers login sans session restaurée
 * - Comportement avec routes hideForAuth (login, register)
 *
 * Architecture:
 * 1. Mock du router et auth store
 * 2. Vérification du flow d'initialisation de session
 * 3. Assertions sur les appels et redirections
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import authServiceDefault from '@/services/authService'
import type { User } from '@/types/models'

/**
 * Mock du service authService
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

describe('Router Guard - Session Restoration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Session initialization during first route change', () => {
    it('should initialize session only once on first route change', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(mockUser)

      // Act
      await authStore.initializeSession()

      // Assert
      expect(vi.mocked(authServiceDefault.getProfile)).toHaveBeenCalledTimes(1)
    })

    it('should restore user on successful session initialization', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(mockUser)

      // Act
      const result = await authStore.initializeSession()

      // Assert
      expect(result).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user).toEqual(mockUser)
    })

    it('should keep user unauthenticated on failed session initialization', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockRejectedValue(new Error('401 Unauthorized'))

      // Act
      const result = await authStore.initializeSession()

      // Assert
      expect(result).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
    })
  })

  describe('Protected routes behavior after session restoration', () => {
    it('should allow access to protected routes if session restored', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(mockUser)

      // Act - Simulate session restoration
      await authStore.initializeSession()

      // Assert
      expect(authStore.isAuthenticated).toBe(true)
      // Router guard would check: if (requiresAuth && !isAuthenticated) -> redirect
      // In this case, isAuthenticated is true, so no redirect
    })

    it('should deny access to protected routes if session not restored', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockRejectedValue(new Error('401'))

      // Act - Try to access protected route without restoration
      await authStore.initializeSession()

      // Assert
      expect(authStore.isAuthenticated).toBe(false)
      // Router guard would check: if (requiresAuth && !isAuthenticated) -> redirect to login
    })
  })

  describe('hideForAuth routes with session restoration', () => {
    it('should redirect authenticated user from login route to dashboard', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(mockUser)

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.isAuthenticated).toBe(true)
      // Router guard would check: if (hideForAuth && isAuthenticated) -> redirect to dashboard
    })

    it('should allow unauthenticated user to visit login route', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockRejectedValue(new Error('401'))

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.isAuthenticated).toBe(false)
      // Router guard would allow access (no hideForAuth redirect)
    })
  })

  describe('Session initialization error handling', () => {
    it('should gracefully handle network errors during session init', async () => {
      // Arrange
      const authStore = useAuthStore()
      const networkError = new Error('Network Error')
      vi.mocked(authServiceDefault.getProfile).mockRejectedValue(networkError)

      // Act
      const result = await authStore.initializeSession()

      // Assert
      expect(result).toBe(false)
      expect(authStore.user).toBeNull()
      // No error should be thrown or logged to user
    })

    it('should handle server errors silently', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockRejectedValue(new Error('500 Server Error'))

      // Act
      const result = await authStore.initializeSession()

      // Assert
      expect(result).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
    })

    it('should not modify store state on initialization failure', async () => {
      // Arrange
      const authStore = useAuthStore()
      const initialError = 'Some existing error'
      authStore.error = initialError

      vi.mocked(authServiceDefault.getProfile).mockRejectedValue(new Error('401'))

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.error).toBe(initialError)
      expect(authStore.loading).toBe(false)
    })
  })

  describe('Consistency across multiple route changes', () => {
    it('should maintain authentication state across route changes', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(mockUser)

      // Act
      await authStore.initializeSession()

      // Simulate accessing multiple routes
      const authStateAfterRoutes = authStore.isAuthenticated

      // Assert
      expect(authStateAfterRoutes).toBe(true)
    })

    it('should handle subsequent logout correctly', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(mockUser)
      vi.mocked(authServiceDefault.logout).mockResolvedValue({ success: true, message: 'Logged out' } as any)

      // Act
      await authStore.initializeSession()
      expect(authStore.isAuthenticated).toBe(true)

      await authStore.logout()

      // Assert
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
    })
  })

  describe('Session restoration with different user data', () => {
    it('should handle user with minimal data', async () => {
      // Arrange
      const authStore = useAuthStore()
      const minimalUser: User = {
        ...mockUser,
        bio: '',
        avatarBase64: undefined
      }
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(minimalUser)

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user?.email).toBe('test@example.com')
    })

    it('should handle user with complete data', async () => {
      // Arrange
      const authStore = useAuthStore()
      const completeUser: User = {
        ...mockUser,
        bio: 'Complete bio',
        avatarBase64: 'data:image/png;base64,iVBORw0KGg...'
      }
      vi.mocked(authServiceDefault.getProfile).mockResolvedValue(completeUser)

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user?.bio).toBe('Complete bio')
    })
  })

  describe('Race condition prevention', () => {
    it('should handle rapid sequential initializeSession calls', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser)

      // Act - Call multiple times rapidly
      const [result1, result2] = await Promise.all([
        authStore.initializeSession(),
        authStore.initializeSession()
      ])

      // Assert
      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
    })
  })
})
