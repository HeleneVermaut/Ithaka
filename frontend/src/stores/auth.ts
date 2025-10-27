/**
 * Store Pinia pour la gestion de l'authentification
 *
 * Ce store centralise toute la logique d'authentification de l'application Ithaka :
 * - État de connexion de l'utilisateur (isAuthenticated)
 * - Informations de l'utilisateur connecté (user)
 * - Actions de connexion, déconnexion, inscription
 * - Gestion du profil utilisateur (récupération, mise à jour)
 * - Changement de mot de passe et réinitialisation
 *
 * Architecture:
 * - State : Données réactives (user, loading, error)
 * - Getters : État dérivé (isAuthenticated)
 * - Actions : Méthodes asynchrones appelant authService
 *
 * Important: Les tokens JWT sont gérés par des cookies httpOnly côté backend.
 * Le frontend ne stocke PAS les tokens. L'authentification est vérifiée
 * en appelant l'endpoint GET /api/users/profile avec les cookies.
 *
 * Convention de nommage :
 * - State : camelCase (user, isLoading, error)
 * - Getters : camelCase (isAuthenticated)
 * - Actions : verbe + nom (login, updateProfile, fetchProfile)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import authService from '@/services/authService'
import type {
  User,
  LoginData,
  RegisterData,
  UpdateProfileData,
  UpdatePasswordData,
  ForgotPasswordData,
  ResetPasswordData
} from '@/types/models'

/**
 * Store d'authentification
 *
 * Utilisation dans les composants :
 * ```typescript
 * import { useAuthStore } from '@/stores/auth'
 *
 * const authStore = useAuthStore()
 * await authStore.login({ email: '...', password: '...' })
 * ```
 */
export const useAuthStore = defineStore('auth', () => {
  // ========================================
  // STATE (État réactif)
  // ========================================

  /**
   * Utilisateur actuellement connecté
   * null si aucun utilisateur n'est connecté
   *
   * Contient toutes les informations du profil :
   * - id, email, firstName, lastName, pseudo, bio, avatarBase64
   * - lastLoginAt, createdAt, updatedAt
   */
  const user = ref<User | null>(null)

  /**
   * Indicateur de chargement pour les opérations d'authentification
   * true pendant les requêtes de login/register/logout/profile
   *
   * Permet d'afficher un spinner et de désactiver les boutons de soumission
   */
  const loading = ref<boolean>(false)

  /**
   * Message d'erreur en cas d'échec d'authentification
   * null si aucune erreur
   *
   * Contient le message d'erreur retourné par le backend ou
   * un message générique en cas d'erreur réseau
   */
  const error = ref<string | null>(null)

  // ========================================
  // GETTERS (État dérivé)
  // ========================================

  /**
   * Indique si un utilisateur est actuellement connecté
   * true si l'objet user n'est pas null
   *
   * Utilisé par les router guards et les composants pour
   * afficher/masquer du contenu selon l'état de connexion
   */
  const isAuthenticated = computed<boolean>(() => user.value !== null)

  // ========================================
  // ACTIONS (Méthodes)
  // ========================================

  /**
   * Inscription d'un nouvel utilisateur
   *
   * Appelle authService.register avec les données du formulaire d'inscription.
   * En cas de succès, stocke l'utilisateur dans le state (les tokens sont en cookies).
   *
   * @param userData - Données d'inscription (email, password, firstName, etc.)
   * @throws Error si l'inscription échoue (email déjà utilisé, validation, etc.)
   *
   * @example
   * ```typescript
   * try {
   *   await authStore.register({
   *     email: 'user@example.com',
   *     password: 'SecurePass123!',
   *     confirmPassword: 'SecurePass123!',
   *     firstName: 'John',
   *     lastName: 'Doe'
   *   })
   *   router.push('/dashboard')
   * } catch (err) {
   *   // L'erreur est déjà stockée dans authStore.error
   *   console.error('Inscription échouée:', authStore.error)
   * }
   * ```
   */
  const register = async (userData: RegisterData): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour créer le compte utilisateur
      const response = await authService.register(userData)

      // Mise à jour du state avec les données utilisateur
      user.value = response.user

      console.log('Registration successful:', user.value.email)
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = "Erreur lors de l'inscription"
      }
      console.error('Registration failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Connexion d'un utilisateur existant
   *
   * Appelle authService.login avec email et password.
   * En cas de succès, stocke l'utilisateur dans le state.
   * Les tokens JWT sont automatiquement stockés en cookies httpOnly par le backend.
   *
   * @param credentials - Email et mot de passe de l'utilisateur
   * @throws Error si la connexion échoue (mauvais identifiants, erreur réseau, etc.)
   *
   * @example
   * ```typescript
   * try {
   *   await authStore.login({
   *     email: 'user@example.com',
   *     password: 'SecurePass123!'
   *   })
   *   router.push('/dashboard')
   * } catch (err) {
   *   console.error('Connexion échouée:', authStore.error)
   * }
   * ```
   */
  const login = async (credentials: LoginData): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour authentification
      const response = await authService.login(credentials)

      // Mise à jour du state avec les données utilisateur
      user.value = response.user

      console.log('Login successful:', user.value.email)
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur de connexion'
      }
      console.error('Login failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Déconnexion de l'utilisateur
   *
   * Appelle authService.logout pour supprimer les cookies httpOnly côté backend.
   * Réinitialise ensuite l'état du store côté frontend.
   *
   * Cette méthode ne devrait jamais échouer, mais on gère les erreurs par précaution.
   *
   * @example
   * ```typescript
   * try {
   *   await authStore.logout()
   *   router.push('/login')
   * } catch (err) {
   *   console.error('Erreur déconnexion:', err)
   * }
   * ```
   */
  const logout = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour supprimer les cookies
      await authService.logout()

      // Réinitialisation de l'état du store
      user.value = null

      console.log('User logged out successfully')
    } catch (err: unknown) {
      // Même en cas d'erreur API, on déconnecte localement
      user.value = null
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la déconnexion'
      }
      console.error('Logout failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Récupération du profil utilisateur depuis le backend
   *
   * Appelle GET /api/users/profile pour récupérer les informations complètes
   * de l'utilisateur authentifié (vérifié via les cookies httpOnly).
   *
   * Cette méthode est appelée :
   * - Au démarrage de l'application (restoreSession)
   * - Après une mise à jour de profil pour rafraîchir les données
   *
   * @throws Error si le token est invalide/expiré (401) ou utilisateur introuvable (404)
   *
   * @example
   * ```typescript
   * try {
   *   await authStore.fetchProfile()
   *   console.log('Profil récupéré:', authStore.user)
   * } catch (err) {
   *   console.error('Token invalide, déconnexion:', err)
   * }
   * ```
   */
  const fetchProfile = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour récupérer le profil
      const userData = await authService.getProfile()

      // Mise à jour du state avec les données utilisateur
      user.value = userData

      console.log('Profile fetched successfully:', user.value.email)
    } catch (err: unknown) {
      // En cas d'erreur (token invalide, expiré), on déconnecte
      user.value = null
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la récupération du profil'
      }
      console.error('Fetch profile failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Mise à jour du profil utilisateur
   *
   * Appelle authService.updateProfile avec les champs modifiés du formulaire de profil.
   * En cas de succès, met à jour le state avec les nouvelles données.
   *
   * Seuls les champs fournis sont envoyés au backend (PATCH-like behavior).
   * Le backend vérifie l'unicité de l'email et du pseudo si modifiés.
   *
   * @param profileData - Champs du profil à modifier (firstName, lastName, email, pseudo, bio, avatarBase64)
   * @throws Error si email/pseudo déjà utilisé (409), validation échoue (400), ou erreur serveur (500)
   *
   * @example
   * ```typescript
   * try {
   *   await authStore.updateProfile({
   *     firstName: 'Jane',
   *     bio: 'Nouvelle biographie',
   *     avatarBase64: 'data:image/jpeg;base64,...'
   *   })
   *   console.log('Profil mis à jour:', authStore.user)
   * } catch (err) {
   *   console.error('Erreur mise à jour profil:', authStore.error)
   * }
   * ```
   */
  const updateProfile = async (profileData: UpdateProfileData): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour mettre à jour le profil
      const response = await authService.updateProfile(profileData)

      // Mise à jour du state avec les nouvelles données
      user.value = response.user

      console.log('Profile updated successfully:', user.value.email)
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la mise à jour du profil'
      }
      console.error('Update profile failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Changement du mot de passe utilisateur
   *
   * Appelle authService.updatePassword avec l'ancien et le nouveau mot de passe.
   * Le backend vérifie l'ancien mot de passe avec bcrypt, hash le nouveau,
   * et invalide toutes les autres sessions (refresh tokens).
   *
   * La session actuelle reste valide.
   *
   * @param passwordData - Ancien mot de passe, nouveau mot de passe, et confirmation
   * @throws Error si ancien mot de passe incorrect (401), validation échoue (400), ou erreur serveur (500)
   *
   * @example
   * ```typescript
   * try {
   *   await authStore.updatePassword({
   *     oldPassword: 'OldPass123!',
   *     newPassword: 'NewPass456!',
   *     confirmPassword: 'NewPass456!'
   *   })
   *   console.log('Mot de passe changé avec succès')
   * } catch (err) {
   *   console.error('Erreur changement mot de passe:', authStore.error)
   * }
   * ```
   */
  const updatePassword = async (passwordData: UpdatePasswordData): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour changer le mot de passe
      await authService.updatePassword(passwordData)

      console.log('Password updated successfully')
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors du changement de mot de passe'
      }
      console.error('Update password failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Demande de réinitialisation de mot de passe (mot de passe oublié)
   *
   * Appelle authService.forgotPassword avec l'email.
   * Le backend génère un token de réinitialisation (valide 1h), le stocke en BDD,
   * et envoie un email via SendGrid avec un lien contenant le token.
   *
   * Pour des raisons de sécurité, le message de succès ne confirme jamais
   * si l'email existe ou non (évite l'énumération de comptes).
   *
   * @param forgotData - Email de l'utilisateur
   * @throws Error si rate limit atteint (429) ou erreur serveur (500)
   *
   * @example
   * ```typescript
   * try {
   *   await authStore.forgotPassword({ email: 'user@example.com' })
   *   console.log('Email de réinitialisation envoyé')
   * } catch (err) {
   *   console.error('Erreur forgot password:', authStore.error)
   * }
   * ```
   */
  const forgotPassword = async (forgotData: ForgotPasswordData): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour demander la réinitialisation
      await authService.forgotPassword(forgotData)

      console.log('Forgot password email sent')
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = "Erreur lors de l'envoi de l'email de réinitialisation"
      }
      console.error('Forgot password failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Réinitialisation du mot de passe avec token
   *
   * Appelle authService.resetPassword avec token, email et nouveau mot de passe.
   * Le backend vérifie la validité du token, hash le nouveau mot de passe,
   * met à jour l'utilisateur, efface le token, et invalide toutes les sessions.
   *
   * L'utilisateur doit ensuite se reconnecter avec le nouveau mot de passe.
   *
   * @param resetData - Token, email, nouveau mot de passe, et confirmation
   * @throws Error si token invalide/expiré (400), validation échoue (400), ou erreur serveur (500)
   *
   * @example
   * ```typescript
   * try {
   *   await authStore.resetPassword({
   *     token: 'abc123',
   *     email: 'user@example.com',
   *     newPassword: 'NewSecurePass789!',
   *     confirmPassword: 'NewSecurePass789!'
   *   })
   *   console.log('Mot de passe réinitialisé')
   *   router.push('/login')
   * } catch (err) {
   *   console.error('Erreur réinitialisation:', authStore.error)
   * }
   * ```
   */
  const resetPassword = async (resetData: ResetPasswordData): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      // Appel API pour réinitialiser le mot de passe
      await authService.resetPassword(resetData)

      console.log('Password reset successfully')
    } catch (err: unknown) {
      // Gestion des erreurs
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = 'Erreur lors de la réinitialisation du mot de passe'
      }
      console.error('Reset password failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Vérification asynchrone de l'unicité de l'email
   *
   * Appelle authService.checkEmailUnique pour vérifier si un email
   * est disponible (non utilisé par un autre utilisateur).
   *
   * Cette méthode est utilisée par Vuelidate pour la validation asynchrone
   * pendant la saisie du formulaire d'inscription ou de modification d'email.
   *
   * Important: Cette requête doit être debouncée (500ms) pour éviter
   * trop d'appels API pendant la frappe.
   *
   * @param email - Email à vérifier
   * @returns Promise<boolean> - true si l'email est unique (disponible)
   *
   * @example
   * ```typescript
   * const isUnique = await authStore.checkEmailUnique('test@example.com')
   * if (isUnique) {
   *   console.log('Email disponible')
   * } else {
   *   console.log('Email déjà utilisé')
   * }
   * ```
   */
  const checkEmailUnique = async (email: string): Promise<boolean> => {
    try {
      const response = await authService.checkEmailUnique(email)
      return response.isUnique
    } catch (err: unknown) {
      console.error('Check email unique failed:', err)
      // En cas d'erreur réseau, on retourne true pour ne pas bloquer l'utilisateur
      // La validation finale sera faite côté backend de toute façon
      return true
    }
  }

  /**
   * Vérification asynchrone de l'unicité du pseudo
   *
   * Appelle authService.checkPseudoUnique pour vérifier si un pseudo
   * est disponible (non utilisé par un autre utilisateur).
   *
   * Cette méthode est utilisée par Vuelidate pour la validation asynchrone
   * pendant la saisie du formulaire d'inscription ou de modification de pseudo.
   *
   * Important: Cette requête doit être debouncée (500ms) pour éviter
   * trop d'appels API pendant la frappe.
   *
   * @param pseudo - Pseudo à vérifier
   * @returns Promise<boolean> - true si le pseudo est unique (disponible)
   *
   * @example
   * ```typescript
   * const isUnique = await authStore.checkPseudoUnique('johndoe')
   * if (isUnique) {
   *   console.log('Pseudo disponible')
   * } else {
   *   console.log('Pseudo déjà utilisé')
   * }
   * ```
   */
  const checkPseudoUnique = async (pseudo: string): Promise<boolean> => {
    try {
      const response = await authService.checkPseudoUnique(pseudo)
      return response.isUnique
    } catch (err: unknown) {
      console.error('Check pseudo unique failed:', err)
      // En cas d'erreur réseau, on retourne true pour ne pas bloquer l'utilisateur
      return true
    }
  }

  // ========================================
  // EXPORT DU STORE
  // ========================================

  return {
    // State
    user,
    loading,
    error,

    // Getters
    isAuthenticated,

    // Actions
    register,
    login,
    logout,
    fetchProfile,
    updateProfile,
    updatePassword,
    forgotPassword,
    resetPassword,
    checkEmailUnique,
    checkPseudoUnique
  }
})
