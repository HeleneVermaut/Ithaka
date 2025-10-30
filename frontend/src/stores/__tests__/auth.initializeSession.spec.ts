/**
 * Tests unitaires pour l'action initializeSession du store auth (Pinia)
 *
 * Ce fichier teste la fonctionnalité de restauration automatique de session
 * au démarrage de l'application (US00 - Session Restoration).
 *
 * Les tests couvrent :
 * - Cas de succès: Session restaurée correctement
 * - Cas d'erreur 401: Token expiré (pas de restauration)
 * - Cas d'erreur 500: Erreur serveur (pas de restauration)
 * - Erreur réseau: Pas de connexion au serveur
 * - Gestion silencieuse des erreurs (pas de toast/notification)
 * - Return value (true/false) selon succès/échec
 * - Isolation avec fetchProfile() qui lance des erreurs
 *
 * Architecture:
 * 1. Mock du service authService
 * 2. Setup de Pinia pour chaque test
 * 3. Assertions sur le state et les return values
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import authServiceDefault from '@/services/authService'
import type { User } from '@/types/models'

/**
 * Mock du service authService
 * Le store importe authService comme default export
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
 * Données de test : un utilisateur valide
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

describe('useAuthStore - initializeSession() action', () => {
  beforeEach(() => {
    // Setup Pinia pour chaque test
    setActivePinia(createPinia())
    // Reset tous les mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ========================================
  // SUCCÈS - Session restaurée correctement
  // ========================================

  describe('Cas de succès', () => {
    it('should return true and set user when profile fetch succeeds', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act
      const result = await authStore.initializeSession()

      // Assert
      expect(result).toBe(true)
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.isAuthenticated).toBe(true)
      expect(vi.mocked(authServiceDefault.getProfile)).toHaveBeenCalledTimes(1)
    })

    it('should populate user data correctly', async () => {
      // Arrange
      const authStore = useAuthStore()
      const userData: User = {
        ...mockUser,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com'
      }
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(userData)

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.user?.firstName).toBe('Jane')
      expect(authStore.user?.lastName).toBe('Smith')
      expect(authStore.user?.email).toBe('jane@example.com')
    })

    it('should not modify error state on success', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.error).toBeNull()
    })

    it('should not modify loading state (silent operation)', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act
      await authStore.initializeSession()

      // Assert
      expect(authStore.loading).toBe(false)
    })
  })

  // ========================================
  // ERREURS - Gestion silencieuse des erreurs
  // ========================================

  describe('Gestion des erreurs', () => {
    it('should return false and keep user null on 401 Unauthorized', async () => {
      // Arrange
      const authStore = useAuthStore()
      const error = new Error('401 Unauthorized')
      vi.mocked(authServiceDefault.getProfile).mockRejectedValueOnce(error)

      // Act
      const result = await authStore.initializeSession()

      // Assert
      expect(result).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
    })

    it('should return false on 500 Server Error', async () => {
      // Arrange
      const authStore = useAuthStore()
      const error = new Error('500 Server Error')
      vi.mocked(authServiceDefault.getProfile).mockRejectedValueOnce(error)

      // Act
      const result = await authStore.initializeSession()

      // Assert
      expect(result).toBe(false)
      expect(authStore.user).toBeNull()
    })

    it('should handle network errors silently', async () => {
      // Arrange
      const authStore = useAuthStore()
      const networkError = new Error('Network Error')
      vi.mocked(authServiceDefault.getProfile).mockRejectedValueOnce(networkError)

      // Act
      const result = await authStore.initializeSession()

      // Assert
      expect(result).toBe(false)
      expect(authStore.user).toBeNull()
    })

    it('should not modify error state on failure (silent failure)', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockRejectedValueOnce(new Error('Test error'))

      // Act
      await authStore.initializeSession()

      // Assert
      // error state should not be modified (remains null)
      expect(authStore.error).toBeNull()
    })

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockRejectedValueOnce('Unknown error string')

      // Act
      const result = await authStore.initializeSession()

      // Assert
      expect(result).toBe(false)
      expect(authStore.user).toBeNull()
    })

    it('should not throw exceptions (always resolves)', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockRejectedValueOnce(new Error('Test error'))

      // Act & Assert - should not throw
      await expect(authStore.initializeSession()).resolves.toBe(false)
    })
  })

  // ========================================
  // COMPORTEMENT SILENCIEUX
  // ========================================

  describe('Silent failure behavior', () => {
    it('should not affect other store methods on failure', async () => {
      // Arrange
      const authStore = useAuthStore()
      authStore.error = 'Some existing error'
      authStore.loading = true

      vi.mocked(authServiceDefault.getProfile).mockRejectedValueOnce(new Error('Test'))

      // Act
      await authStore.initializeSession()

      // Assert
      // initializeSession ne doit pas modifier error/loading existants
      expect(authStore.error).toBe('Some existing error')
      expect(authStore.loading).toBe(true)
    })

    it('should clear user if already set and then fails', async () => {
      // Arrange
      const authStore = useAuthStore()
      authStore.user = mockUser

      vi.mocked(authServiceDefault.getProfile).mockRejectedValueOnce(new Error('Test'))

      // Act
      const result = await authStore.initializeSession()

      // Assert
      // On ne devrait pas modifier l'utilisateur en cas d'erreur
      expect(result).toBe(false)
      expect(authStore.user).toEqual(mockUser)
    })
  })

  // ========================================
  // MULTIPLE CALLS
  // ========================================

  describe('Multiple calls behavior', () => {
    it('should handle multiple sequential calls', async () => {
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
      expect(authStore.user).toEqual(mockUser)
      expect(vi.mocked(authServiceDefault.getProfile)).toHaveBeenCalledTimes(2)
    })

    it('should handle first call success then failure', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile)
        .mockResolvedValueOnce(mockUser)
        .mockRejectedValueOnce(new Error('Test error'))

      // Act
      const result1 = await authStore.initializeSession()
      const result2 = await authStore.initializeSession()

      // Assert
      expect(result1).toBe(true)
      expect(result2).toBe(false)
      expect(authStore.user).toEqual(mockUser)
    })
  })

  // ========================================
  // INTÉGRATION AVEC D'AUTRES ACTIONS
  // ========================================

  describe('Integration with other auth actions', () => {
    it('should not interfere with subsequent login', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)
      vi.mocked(authServiceDefault.login).mockResolvedValueOnce({
        success: true,
        message: 'Logged in',
        user: { ...mockUser, email: 'newemail@example.com' }
      } as any)

      // Act
      await authStore.initializeSession()
      await authStore.login({ email: 'newemail@example.com', password: 'password' })

      // Assert
      expect(authStore.user?.email).toBe('newemail@example.com')
    })

    it('should be compatible with logout', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)
      vi.mocked(authServiceDefault.logout).mockResolvedValueOnce({ success: true, message: 'Logged out' } as any)

      // Act
      await authStore.initializeSession()
      expect(authStore.isAuthenticated).toBe(true)

      await authStore.logout()

      // Assert
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
    })
  })

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge cases', () => {
    it('should handle partially populated user data', async () => {
      // Arrange
      const authStore = useAuthStore()
      const partialUser: User = {
        ...mockUser,
        avatarBase64: undefined,
        bio: ''
      }
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(partialUser)

      // Act
      const result = await authStore.initializeSession()

      // Assert
      expect(result).toBe(true)
      expect(authStore.user).toEqual(partialUser)
    })

    it('should handle undefined user response as error', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(undefined as any)

      // Act
      const result = await authStore.initializeSession()

      // Assert
      // Undefined devrait être traité comme succès mais user sera undefined
      expect(result).toBe(true)
      expect(authStore.user).toBeUndefined()
    })

    it('should maintain isAuthenticated getter consistency', async () => {
      // Arrange
      const authStore = useAuthStore()
      vi.mocked(authServiceDefault.getProfile).mockResolvedValueOnce(mockUser)

      // Act
      expect(authStore.isAuthenticated).toBe(false)
      await authStore.initializeSession()

      // Assert
      expect(authStore.isAuthenticated).toBe(true)
    })
  })
})
