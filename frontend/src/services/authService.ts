/**
 * Service d'authentification pour communiquer avec le backend
 *
 * Ce service centralise tous les appels API liés à l'authentification :
 * - Inscription (register)
 * - Connexion (login)
 * - Déconnexion (logout)
 * - Récupération du profil utilisateur (getProfile)
 * - Mise à jour du profil (updateProfile)
 * - Changement de mot de passe (updatePassword)
 * - Réinitialisation de mot de passe (forgotPassword, resetPassword)
 * - Vérifications asynchrones (checkEmailUnique, checkPseudoUnique)
 *
 * Tous les endpoints utilisent l'instance Axios configurée avec :
 * - Base URL du backend (VITE_API_BASE_URL)
 * - Cookies httpOnly pour les JWT tokens
 * - Interceptors pour la gestion des erreurs
 *
 * Convention de nommage :
 * - Fonctions : verbe + nom (ex: register, updateProfile)
 * - Paramètres : camelCase (ex: userData, oldPassword)
 */

import apiClient from './api'
import type {
  RegisterData,
  LoginData,
  UpdateProfileData,
  UpdatePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthResponse,
  User,
  ApiSuccessResponse,
  UpdateProfileResponse,
  VerifyResetTokenResponse,
  CheckEmailUniqueResponse,
  CheckPseudoUniqueResponse
} from '@/types/models'

/**
 * Service d'authentification
 *
 * Toutes les méthodes sont asynchrones et retournent des Promises.
 * Les erreurs sont propagées et doivent être gérées par le composant appelant.
 */
const authService = {
  /**
   * Inscription d'un nouvel utilisateur
   *
   * Envoie une requête POST /auth/register avec les données d'inscription.
   * Le backend crée l'utilisateur, hash le mot de passe avec bcrypt,
   * génère les tokens JWT et les stocke dans des cookies httpOnly.
   *
   * @param userData - Données d'inscription (email, password, firstName, etc.)
   * @returns Promise contenant les informations de l'utilisateur créé
   *
   * @throws ApiError si l'email existe déjà (409), validation échoue (400), ou erreur serveur (500)
   *
   * @example
   * try {
   *   const response = await authService.register({
   *     email: 'user@example.com',
   *     password: 'SecurePass123!',
   *     confirmPassword: 'SecurePass123!',
   *     firstName: 'John',
   *     lastName: 'Doe',
   *     pseudo: 'johndoe',
   *     bio: 'Travel enthusiast'
   *   })
   *   console.log('Utilisateur créé:', response.user)
   * } catch (error) {
   *   console.error('Erreur inscription:', error)
   * }
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData, {
      withCredentials: true // Important: Inclure les cookies dans la requête
    })
    return response.data
  },

  /**
   * Connexion d'un utilisateur existant
   *
   * Envoie une requête POST /auth/login avec email et password.
   * Le backend vérifie les credentials avec bcrypt, génère les tokens JWT
   * et les stocke dans des cookies httpOnly (access token 15 min, refresh token 7 jours).
   *
   * @param credentials - Email et mot de passe de l'utilisateur
   * @returns Promise contenant les informations de l'utilisateur connecté
   *
   * @throws ApiError si credentials invalides (401), rate limit atteint (429), ou erreur serveur (500)
   *
   * @example
   * try {
   *   const response = await authService.login({
   *     email: 'user@example.com',
   *     password: 'SecurePass123!'
   *   })
   *   console.log('Connexion réussie:', response.user)
   * } catch (error) {
   *   console.error('Erreur connexion:', error)
   * }
   */
  async login(credentials: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials, {
      withCredentials: true // Important: Inclure les cookies dans la requête
    })
    return response.data
  },

  /**
   * Déconnexion de l'utilisateur
   *
   * Envoie une requête POST /auth/logout.
   * Le backend supprime les cookies httpOnly (Set-Cookie avec Expires=now).
   * Le store Pinia côté client est également nettoyé.
   *
   * @returns Promise contenant un message de confirmation
   *
   * @throws ApiError en cas d'erreur serveur (rare)
   *
   * @example
   * try {
   *   await authService.logout()
   *   console.log('Déconnexion réussie')
   * } catch (error) {
   *   console.error('Erreur déconnexion:', error)
   * }
   */
  async logout(): Promise<ApiSuccessResponse> {
    const response = await apiClient.post<ApiSuccessResponse>('/auth/logout', {}, {
      withCredentials: true // Important: Inclure les cookies pour invalidation
    })
    return response.data
  },

  /**
   * Récupération du profil utilisateur actuel
   *
   * Envoie une requête GET /users/profile.
   * Le backend vérifie le JWT token depuis les cookies et retourne
   * les informations complètes de l'utilisateur (y compris photo de profil).
   *
   * Cette méthode est appelée :
   * - Au démarrage de l'application (restoreSession)
   * - Après une mise à jour de profil pour rafraîchir les données
   *
   * @returns Promise contenant les informations complètes de l'utilisateur
   *
   * @throws ApiError si le token est invalide/expiré (401) ou utilisateur introuvable (404)
   *
   * @example
   * try {
   *   const user = await authService.getProfile()
   *   console.log('Profil récupéré:', user)
   * } catch (error) {
   *   console.error('Erreur récupération profil:', error)
   * }
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<{ success: boolean; user: User }>('/users/profile', {
      withCredentials: true
    })
    return response.data.user
  },

  /**
   * Mise à jour du profil utilisateur
   *
   * Envoie une requête PUT /users/profile avec les champs modifiés.
   * Le backend vérifie l'unicité de l'email et du pseudo si modifiés,
   * redimensionne la photo si nécessaire, et met à jour l'utilisateur.
   *
   * Seuls les champs fournis sont mis à jour (PATCH-like behavior).
   *
   * @param profileData - Champs du profil à modifier (firstName, lastName, email, pseudo, bio, avatarBase64)
   * @returns Promise contenant les informations mises à jour de l'utilisateur
   *
   * @throws ApiError si email/pseudo déjà utilisé (409), validation échoue (400), ou erreur serveur (500)
   *
   * @example
   * try {
   *   const response = await authService.updateProfile({
   *     firstName: 'Jane',
   *     bio: 'Nouvelle bio',
   *     avatarBase64: 'data:image/jpeg;base64,...'
   *   })
   *   console.log('Profil mis à jour:', response.user)
   * } catch (error) {
   *   console.error('Erreur mise à jour profil:', error)
   * }
   */
  async updateProfile(profileData: UpdateProfileData): Promise<UpdateProfileResponse> {
    const response = await apiClient.put<UpdateProfileResponse>(
      '/users/profile',
      profileData,
      {
        withCredentials: true
      }
    )
    return response.data
  },

  /**
   * Changement du mot de passe utilisateur
   *
   * Envoie une requête PUT /users/password avec l'ancien et le nouveau mot de passe.
   * Le backend vérifie l'ancien mot de passe avec bcrypt, hash le nouveau,
   * et invalide toutes les autres sessions (refresh tokens) pour forcer la déconnexion.
   *
   * La session actuelle reste valide.
   *
   * @param passwordData - Ancien mot de passe, nouveau mot de passe, et confirmation
   * @returns Promise contenant un message de confirmation
   *
   * @throws ApiError si ancien mot de passe incorrect (401), validation échoue (400), ou erreur serveur (500)
   *
   * @example
   * try {
   *   await authService.updatePassword({
   *     oldPassword: 'OldPass123!',
   *     newPassword: 'NewPass456!',
   *     confirmPassword: 'NewPass456!'
   *   })
   *   console.log('Mot de passe changé avec succès')
   * } catch (error) {
   *   console.error('Erreur changement mot de passe:', error)
   * }
   */
  async updatePassword(passwordData: UpdatePasswordData): Promise<ApiSuccessResponse> {
    const response = await apiClient.put<ApiSuccessResponse>(
      '/users/password',
      passwordData,
      {
        withCredentials: true
      }
    )
    return response.data
  },

  /**
   * Demande de réinitialisation de mot de passe (mot de passe oublié)
   *
   * Envoie une requête POST /auth/forgot-password avec l'email.
   * Le backend génère un token de réinitialisation (valide 1h), le stocke en BDD,
   * et envoie un email via SendGrid avec un lien contenant le token.
   *
   * Pour des raisons de sécurité, le message de succès ne confirme jamais
   * si l'email existe ou non (évite l'énumération de comptes).
   *
   * Rate limit: 2 demandes par email toutes les 5 minutes.
   *
   * @param forgotData - Email de l'utilisateur
   * @returns Promise contenant un message générique
   *
   * @throws ApiError si rate limit atteint (429) ou erreur serveur (500)
   *
   * @example
   * try {
   *   await authService.forgotPassword({
   *     email: 'user@example.com'
   *   })
   *   console.log('Email de réinitialisation envoyé')
   * } catch (error) {
   *   console.error('Erreur forgot password:', error)
   * }
   */
  async forgotPassword(forgotData: ForgotPasswordData): Promise<ApiSuccessResponse> {
    const response = await apiClient.post<ApiSuccessResponse>(
      '/auth/forgot-password',
      forgotData
    )
    return response.data
  },

  /**
   * Vérification de la validité du token de réinitialisation
   *
   * Envoie une requête GET /auth/verify-reset-token?token=X&email=Y
   * Le backend vérifie que le token existe en BDD, correspond à l'email,
   * et n'est pas expiré (< 1h depuis génération).
   *
   * Cette méthode est appelée au chargement de la page /reset-password
   * pour afficher le formulaire seulement si le token est valide.
   *
   * @param token - Token de réinitialisation (depuis l'URL email)
   * @param email - Email de l'utilisateur (depuis l'URL email)
   * @returns Promise indiquant si le token est valide
   *
   * @throws ApiError si token invalide/expiré (400) ou erreur serveur (500)
   *
   * @example
   * try {
   *   const result = await authService.verifyResetToken('abc123', 'user@example.com')
   *   if (result.canResetPassword) {
   *     console.log('Token valide, afficher le formulaire')
   *   }
   * } catch (error) {
   *   console.error('Token invalide ou expiré')
   * }
   */
  async verifyResetToken(token: string, email: string): Promise<VerifyResetTokenResponse> {
    const response = await apiClient.get<VerifyResetTokenResponse>(
      '/auth/verify-reset-token',
      {
        params: { token, email }
      }
    )
    return response.data
  },

  /**
   * Réinitialisation du mot de passe avec token
   *
   * Envoie une requête POST /auth/reset-password avec token, email et nouveau mot de passe.
   * Le backend vérifie une dernière fois la validité du token, hash le nouveau mot de passe,
   * met à jour l'utilisateur, efface le token, et invalide toutes les sessions.
   *
   * L'utilisateur doit ensuite se reconnecter avec le nouveau mot de passe.
   *
   * @param resetData - Token, email, nouveau mot de passe, et confirmation
   * @returns Promise contenant un message de confirmation
   *
   * @throws ApiError si token invalide/expiré (400), validation échoue (400), ou erreur serveur (500)
   *
   * @example
   * try {
   *   await authService.resetPassword({
   *     token: 'abc123',
   *     email: 'user@example.com',
   *     newPassword: 'NewSecurePass789!',
   *     confirmPassword: 'NewSecurePass789!'
   *   })
   *   console.log('Mot de passe réinitialisé avec succès')
   * } catch (error) {
   *   console.error('Erreur réinitialisation:', error)
   * }
   */
  async resetPassword(resetData: ResetPasswordData): Promise<ApiSuccessResponse> {
    const response = await apiClient.post<ApiSuccessResponse>(
      '/auth/reset-password',
      resetData
    )
    return response.data
  },

  /**
   * Vérification asynchrone de l'unicité de l'email
   *
   * Envoie une requête GET /auth/check-email?email=X
   * Le backend vérifie si un utilisateur avec cet email existe déjà en BDD.
   *
   * Cette méthode est utilisée par Vuelidate pour la validation asynchrone
   * pendant la saisie du formulaire d'inscription ou de modification d'email.
   *
   * Pour optimiser les performances, cette requête devrait être debouncée
   * (attendre 500ms après la dernière saisie avant d'appeler l'API).
   *
   * @param email - Email à vérifier
   * @returns Promise indiquant si l'email est unique (disponible)
   *
   * @example
   * try {
   *   const result = await authService.checkEmailUnique('test@example.com')
   *   if (result.isUnique) {
   *     console.log('Email disponible')
   *   } else {
   *     console.log('Email déjà utilisé')
   *   }
   * } catch (error) {
   *   console.error('Erreur vérification email:', error)
   * }
   */
  async checkEmailUnique(email: string): Promise<CheckEmailUniqueResponse> {
    const response = await apiClient.get<CheckEmailUniqueResponse>('/auth/check-email', {
      params: { email }
    })
    return response.data
  },

  /**
   * Vérification asynchrone de l'unicité du pseudo
   *
   * Envoie une requête GET /auth/check-pseudo?pseudo=X
   * Le backend vérifie si un utilisateur avec ce pseudo existe déjà en BDD.
   *
   * Cette méthode est utilisée par Vuelidate pour la validation asynchrone
   * pendant la saisie du formulaire d'inscription ou de modification de pseudo.
   *
   * Cette requête doit être debouncée pour éviter trop d'appels API.
   *
   * @param pseudo - Pseudo à vérifier
   * @returns Promise indiquant si le pseudo est unique (disponible)
   *
   * @example
   * try {
   *   const result = await authService.checkPseudoUnique('johndoe')
   *   if (result.isUnique) {
   *     console.log('Pseudo disponible')
   *   } else {
   *     console.log('Pseudo déjà utilisé')
   *   }
   * } catch (error) {
   *   console.error('Erreur vérification pseudo:', error)
   * }
   */
  async checkPseudoUnique(pseudo: string): Promise<CheckPseudoUniqueResponse> {
    const response = await apiClient.get<CheckPseudoUniqueResponse>('/auth/check-pseudo', {
      params: { pseudo }
    })
    return response.data
  },

  /**
   * Export user data in JSON format (GDPR Article 20 - Right to data portability)
   *
   * Envoie une requête GET /users/export pour télécharger toutes les données utilisateur
   * dans un format structuré et lisible par machine (JSON).
   *
   * Le backend retourne un fichier JSON avec :
   * - Informations de profil utilisateur
   * - Carnets de voyage créés
   * - Date d'export et conformité GDPR
   *
   * @returns Promise contenant les données utilisateur en Blob (pour téléchargement)
   *
   * @throws ApiError si l'utilisateur n'est pas authentifié (401) ou erreur serveur (500)
   *
   * @example
   * try {
   *   const blob = await authService.exportUserData()
   *   // Créer un lien de téléchargement
   *   const url = window.URL.createObjectURL(blob)
   *   const link = document.createElement('a')
   *   link.href = url
   *   link.download = `ithaka-export-${Date.now()}.json`
   *   link.click()
   *   window.URL.revokeObjectURL(url)
   * } catch (error) {
   *   console.error('Erreur export données:', error)
   * }
   */
  async exportUserData(): Promise<Blob> {
    const response = await apiClient.get('/users/export', {
      responseType: 'blob', // Important: Recevoir les données en Blob pour téléchargement
      withCredentials: true
    })
    return response.data
  }
}

/**
 * Export du service d'authentification
 *
 * Utilisation dans les composants :
 * import authService from '@/services/authService'
 * const response = await authService.login({ email: '...', password: '...' })
 */
export default authService
