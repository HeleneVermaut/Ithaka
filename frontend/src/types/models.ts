/**
 * Types et interfaces pour les modèles de données de l'application Ithaka
 *
 * Ce fichier centralise toutes les définitions TypeScript pour les entités métier :
 * - Utilisateurs (User)
 * - Authentification (AuthState, AuthResponse)
 * - Types d'API (requêtes et réponses)
 *
 * Convention de nommage :
 * - Interfaces : PascalCase (ex: User, AuthResponse)
 * - Propriétés : camelCase (ex: firstName, avatarBase64)
 */

// ========================================
// USER MODEL
// ========================================

/**
 * Représente un utilisateur complet de l'application Ithaka
 *
 * Ce type correspond à la structure retournée par le backend
 * après authentification ou récupération du profil.
 */
export interface User {
  /** Identifiant unique de l'utilisateur (UUID) */
  id: string

  /** Adresse email (utilisée pour la connexion, unique) */
  email: string

  /** Prénom de l'utilisateur */
  firstName: string

  /** Nom de famille de l'utilisateur */
  lastName: string

  /** Pseudo optionnel (unique si fourni, alphanumérique 3-20 chars) */
  pseudo?: string

  /** Biographie optionnelle (max 160 caractères) */
  bio?: string

  /** Photo de profil en base64 (format: data:image/jpeg;base64,...) */
  avatarBase64?: string

  /** Indique si l'email a été vérifié (optionnel, future feature) */
  isEmailVerified?: boolean

  /** Date de dernière connexion (ISO 8601) */
  lastLoginAt?: string

  /** Date de création du compte (ISO 8601) */
  createdAt: string

  /** Date de dernière mise à jour du profil (ISO 8601) */
  updatedAt: string
}

// ========================================
// AUTHENTICATION TYPES
// ========================================

/**
 * État de l'authentification dans le store Pinia
 *
 * Gère l'état global de l'authentification dans l'application.
 */
export interface AuthState {
  /** Utilisateur actuellement connecté (null si déconnecté) */
  user: User | null

  /** Indique si l'utilisateur est authentifié */
  isAuthenticated: boolean

  /** Indicateur de chargement pour les opérations d'authentification */
  loading: boolean

  /** Message d'erreur en cas d'échec d'authentification */
  error: string | null
}

/**
 * Données nécessaires pour la connexion d'un utilisateur
 *
 * Utilisé par le formulaire de connexion et l'endpoint POST /api/auth/login
 */
export interface LoginData {
  /** Adresse email de l'utilisateur */
  email: string

  /** Mot de passe de l'utilisateur (envoyé en clair via HTTPS) */
  password: string
}

/**
 * Données nécessaires pour l'inscription d'un nouvel utilisateur
 *
 * Utilisé par le formulaire d'inscription et l'endpoint POST /api/auth/register
 */
export interface RegisterData {
  /** Adresse email (unique, format valide) */
  email: string

  /** Mot de passe (min 8 chars, majuscule, chiffre, caractère spécial) */
  password: string

  /** Confirmation du mot de passe (doit être identique à password) */
  confirmPassword: string

  /** Prénom de l'utilisateur (requis) */
  firstName: string

  /** Nom de famille de l'utilisateur (requis) */
  lastName: string

  /** Pseudo optionnel (unique, 3-20 chars alphanumérique) */
  pseudo?: string

  /** Biographie optionnelle (max 160 chars) */
  bio?: string

  /** Photo de profil en base64 (optionnelle, max 2MB) */
  avatarBase64?: string
}

/**
 * Données nécessaires pour la mise à jour du profil utilisateur
 *
 * Utilisé par le formulaire de modification de profil
 * et l'endpoint PUT /api/users/profile
 */
export interface UpdateProfileData {
  /** Prénom de l'utilisateur (optionnel) */
  firstName?: string

  /** Nom de famille de l'utilisateur (optionnel) */
  lastName?: string

  /** Email modifié (optionnel, vérifié unicité) */
  email?: string

  /** Pseudo modifié (optionnel, vérifié unicité) */
  pseudo?: string

  /** Biographie modifiée (optionnelle, max 160 chars) */
  bio?: string

  /** Nouvelle photo de profil en base64 (optionnelle, max 2MB) */
  avatarBase64?: string
}

/**
 * Données nécessaires pour le changement de mot de passe
 *
 * Utilisé par le formulaire de sécurité et l'endpoint PUT /api/users/password
 */
export interface UpdatePasswordData {
  /** Ancien mot de passe (pour vérification) */
  oldPassword: string

  /** Nouveau mot de passe (min 8 chars, majuscule, chiffre, spécial) */
  newPassword: string

  /** Confirmation du nouveau mot de passe */
  confirmPassword: string
}

/**
 * Données nécessaires pour la demande de réinitialisation de mot de passe
 *
 * Utilisé par le formulaire "Mot de passe oublié"
 * et l'endpoint POST /api/auth/forgot-password
 */
export interface ForgotPasswordData {
  /** Adresse email de l'utilisateur */
  email: string
}

/**
 * Données nécessaires pour la réinitialisation du mot de passe
 *
 * Utilisé par le formulaire de réinitialisation
 * et l'endpoint POST /api/auth/reset-password
 */
export interface ResetPasswordData {
  /** Token de réinitialisation (depuis l'URL email) */
  token: string

  /** Email de l'utilisateur (depuis l'URL email) */
  email: string

  /** Nouveau mot de passe */
  newPassword: string

  /** Confirmation du nouveau mot de passe */
  confirmPassword: string
}

// ========================================
// API RESPONSE TYPES
// ========================================

/**
 * Réponse du backend après une authentification réussie
 *
 * Retournée par POST /api/auth/login et POST /api/auth/register
 *
 * Note: Les tokens JWT sont stockés en httpOnly cookies côté backend,
 * donc ils n'apparaissent pas dans cette réponse. Ils sont automatiquement
 * inclus dans les futures requêtes HTTP.
 */
export interface AuthResponse {
  /** Indique le succès de l'opération */
  success: boolean

  /** Message de confirmation */
  message: string

  /** Informations de l'utilisateur connecté */
  user: User
}

/**
 * Réponse générique de succès de l'API
 *
 * Utilisée pour les opérations qui ne retournent pas de données spécifiques
 * (ex: logout, update password)
 */
export interface ApiSuccessResponse {
  /** Indique le succès de l'opération */
  success: boolean

  /** Message de confirmation */
  message: string
}

/**
 * Réponse de mise à jour du profil
 *
 * Retournée par PUT /api/users/profile
 */
export interface UpdateProfileResponse {
  /** Indique le succès de l'opération */
  success: boolean

  /** Message de confirmation */
  message: string

  /** Profil utilisateur mis à jour */
  user: User
}

/**
 * Réponse de vérification de token de réinitialisation
 *
 * Retournée par GET /api/auth/verify-reset-token
 */
export interface VerifyResetTokenResponse {
  /** Indique le succès de l'opération */
  success: boolean

  /** Message de confirmation */
  message: string

  /** Indique si le token est valide et permet la réinitialisation */
  canResetPassword: boolean
}

/**
 * Réponse générique de l'API en cas d'erreur
 *
 * Structure standardisée pour toutes les erreurs backend
 */
export interface ApiError {
  /** Message d'erreur lisible par l'utilisateur */
  message: string

  /** Code d'erreur HTTP (400, 401, 404, 500, etc.) */
  statusCode: number

  /** Détails techniques supplémentaires (optionnel, mode dev) */
  details?: unknown

  /** Champs qui ont échoué la validation (optionnel) */
  errors?: ValidationError[]
}

/**
 * Détails d'erreur de validation de champ
 *
 * Utilisé pour afficher les erreurs de validation côté client
 */
export interface ValidationError {
  /** Nom du champ en erreur */
  field: string

  /** Message d'erreur spécifique */
  message: string
}

// ========================================
// VALIDATION HELPERS
// ========================================

/**
 * Type pour la vérification d'unicité de l'email
 *
 * Utilisé par la validation asynchrone Vuelidate
 */
export interface CheckEmailUniqueResponse {
  /** Indique si l'email est disponible (unique) */
  isUnique: boolean
}

/**
 * Type pour la vérification d'unicité du pseudo
 *
 * Utilisé par la validation asynchrone Vuelidate
 */
export interface CheckPseudoUniqueResponse {
  /** Indique si le pseudo est disponible (unique) */
  isUnique: boolean
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Type pour les notifications toast NaiveUI
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/**
 * Configuration d'une notification toast
 */
export interface ToastNotification {
  /** Type de notification */
  type: NotificationType

  /** Titre de la notification */
  title?: string

  /** Message de la notification */
  message: string

  /** Durée d'affichage en millisecondes (défaut: 3000) */
  duration?: number
}

/**
 * Robustesse du mot de passe (indicateur visuel)
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong'

/**
 * Résultat de l'analyse de robustesse du mot de passe
 */
export interface PasswordStrengthResult {
  /** Niveau de robustesse */
  strength: PasswordStrength

  /** Score de 0 à 100 */
  score: number

  /** Suggestions pour améliorer le mot de passe */
  suggestions: string[]
}
