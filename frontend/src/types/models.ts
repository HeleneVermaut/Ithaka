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

// ========================================
// PAGE MODEL (US03 - Page Editing)
// ========================================

/**
 * Représente une page unique dans un notebook
 *
 * Une page est une unité de contenu qui peut contenir
 * plusieurs éléments (texte, images, stickers, etc.)
 */
export interface IPage {
  /** Identifiant unique de la page (UUID) */
  id: string

  /** Identifiant du notebook parent (UUID) */
  notebookId: string

  /** Numéro séquentiel de la page dans le notebook (1, 2, 3...) */
  pageNumber: number

  /** Indique si c'est une couverture personnalisée */
  isCustomCover: boolean

  /** Date de création de la page (ISO 8601) */
  createdAt: string

  /** Date de dernière modification de la page (ISO 8601) */
  updatedAt: string
}

// ========================================
// PAGE ELEMENT MODEL
// ========================================

/**
 * Type énumération pour les types d'éléments de page
 */
export type ElementType = 'text' | 'image' | 'shape' | 'emoji' | 'sticker' | 'moodTracker'

/**
 * Contenu d'un élément texte
 *
 * Propriétés spécifiques pour les éléments de type 'text'
 */
export interface ITextContent {
  /** Texte à afficher (max 1000 caractères) */
  text: string

  /** Police typographique Google Font */
  fontFamily: string

  /** Taille de la police en pixels (8-200) */
  fontSize: number

  /** Couleur du texte en hexadécimal (#RRGGBB) */
  fill: string

  /** Alignement horizontal du texte (optionnel) */
  textAlign?: 'left' | 'center' | 'right'

  /** Poids de la police (optionnel) */
  fontWeight?: 'normal' | 'bold'

  /** Style de la police (optionnel) */
  fontStyle?: 'normal' | 'italic'

  /** Indique si le texte est souligné (optionnel) */
  underline?: boolean

  /** Hauteur de ligne (optionnel) */
  lineHeight?: number
}

/**
 * Style d'un élément de page
 *
 * Propriétés visuelles communes à tous les éléments
 */
export interface ITextStyle {
  /** Opacité de l'élément (0-1) */
  opacity?: number

  /** Ombre de l'élément (optionnel) */
  shadow?: {
    offsetX: number
    offsetY: number
    blur: number
    color: string
  }
}

/**
 * Représente un élément unique sur une page
 *
 * Un élément peut être du texte, une image, un sticker, etc.
 * Tous les éléments partagent les propriétés de positionnement et d'apparence.
 */
export interface IPageElement {
  /** Identifiant unique de l'élément (UUID) */
  id: string

  /** Identifiant de la page parent (UUID) */
  pageId: string

  /** Type d'élément (text, image, shape, emoji, sticker, moodTracker) */
  type: ElementType

  /** Position X du coin supérieur gauche en millimètres */
  x: number

  /** Position Y du coin supérieur gauche en millimètres */
  y: number

  /** Largeur de l'élément en millimètres */
  width: number

  /** Hauteur de l'élément en millimètres */
  height: number

  /** Rotation de l'élément en degrés (-180 à 180) */
  rotation: number

  /** Ordre d'affichage sur la page (0 = arrière, croissant vers l'avant) */
  zIndex: number

  /** Contenu spécifique à l'élément (structure dépend du type) */
  content: Record<string, any>

  /** Style de l'élément (couleur, opacité, ombre, etc.) */
  style: Record<string, any>

  /** Propriétés personnalisées optionnelles */
  metadata?: Record<string, any>

  /** Date de création de l'élément (ISO 8601) */
  createdAt: string

  /** Date de dernière modification de l'élément (ISO 8601) */
  updatedAt: string

  /** Date de suppression douce (soft delete, paranoid mode) */
  deletedAt?: string | null
}

/**
 * Requête pour créer un nouvel élément de page
 *
 * Utilisé pour le formulaire de création d'élément
 */
export interface IPageElementCreateRequest {
  /** Type d'élément */
  type: ElementType

  /** Position X en millimètres */
  x: number

  /** Position Y en millimètres */
  y: number

  /** Largeur en millimètres */
  width: number

  /** Hauteur en millimètres */
  height: number

  /** Rotation en degrés (optionnel) */
  rotation?: number

  /** Ordre d'affichage (optionnel, auto-attribué) */
  zIndex?: number

  /** Contenu de l'élément */
  content: Record<string, any>

  /** Style de l'élément (optionnel) */
  style?: Record<string, any>

  /** Métadonnées personnalisées (optionnel) */
  metadata?: Record<string, any>
}

/**
 * Requête pour mettre à jour un élément existant
 *
 * Tous les champs sont optionnels (mise à jour partielle)
 */
export interface IPageElementUpdateRequest {
  /** Position X (optionnel) */
  x?: number

  /** Position Y (optionnel) */
  y?: number

  /** Largeur (optionnel) */
  width?: number

  /** Hauteur (optionnel) */
  height?: number

  /** Rotation (optionnel) */
  rotation?: number

  /** Ordre d'affichage (optionnel) */
  zIndex?: number

  /** Contenu (optionnel) */
  content?: Record<string, any>

  /** Style (optionnel) */
  style?: Record<string, any>

  /** Métadonnées (optionnel) */
  metadata?: Record<string, any>
}

// ========================================
// SAVED TEXT LIBRARY (US03 Extension)
// ========================================

/**
 * Type d'élément de texte sauvegardé
 */
export type SavedTextType = 'citation' | 'poeme' | 'libre'

/**
 * Représente un texte sauvegardé dans la bibliothèque de l'utilisateur
 *
 * Permet à l'utilisateur de réutiliser du texte pré-formaté
 */
export interface ISavedText {
  /** Identifiant unique du texte sauvegardé (UUID) */
  id: string

  /** Étiquette/titre du texte sauvegardé (max 100 caractères) */
  label: string

  /** Type de texte (citation, poème, libre) */
  type: SavedTextType

  /** Contenu formaté du texte */
  content: ITextContent

  /** Date de création (ISO 8601) */
  createdAt: string

  /** Date de dernière modification (ISO 8601) */
  updatedAt: string
}

// ========================================
// PAGE API RESPONSE TYPES
// ========================================

/**
 * Réponse de la requête de création/mise à jour batch d'éléments
 */
export interface BatchElementsResponse {
  /** Nombre d'éléments créés */
  created: number

  /** Nombre d'éléments mis à jour */
  updated: number
}

// ========================================
// MEDIA & STICKER MODELS (US04)
// ========================================

/**
 * Type énumération pour les types de formes géométriques
 *
 * Utilisé par les éléments de type 'shape'
 */
export type ShapeType = 'circle' | 'square' | 'rectangle' | 'triangle' | 'heart'

/**
 * Réponse de Cloudinary après un upload
 *
 * Contient les métadonnées d'une image uploadée vers Cloudinary
 */
export interface ICloudinaryResponse {
  /** URL complète de l'image sur Cloudinary */
  cloudinaryUrl: string

  /** ID public Cloudinary (utilisé pour les transformations) */
  cloudinaryPublicId: string

  /** Largeur originale de l'image en pixels */
  width: number

  /** Hauteur originale de l'image en pixels */
  height: number

  /** Format de l'image (jpeg, png, webp, etc.) */
  format: string
}

/**
 * Objet de transformations d'image Cloudinary
 *
 * Définit les transformations à appliquer à une image
 * via l'API Cloudinary
 */
export interface ITransformations {
  /** Crop: définit la région de l'image à conserver */
  crop?: {
    /** Coordonnée X du coin supérieur gauche du crop */
    x: number
    /** Coordonnée Y du coin supérieur gauche du crop */
    y: number
    /** Largeur de la région à conserver */
    width: number
    /** Hauteur de la région à conserver */
    height: number
  }

  /** Brighness: ajuste la luminosité (-100 à 100) */
  brightness?: number

  /** Contrast: ajuste le contraste (-100 à 100) */
  contrast?: number

  /** Saturation: ajuste la saturation des couleurs (-100 à 100) */
  saturation?: number

  /** Rotation: tourne l'image (0, 90, 180, ou 270 degrés) */
  rotation?: 0 | 90 | 180 | 270

  /** Flip: retourne l'image horizontalement ou verticalement */
  flip?: 'horizontal' | 'vertical'
}

/**
 * Élément média d'une page étendu avec propriétés spécifiques aux médias
 *
 * Représente un élément de page qui est une image, un sticker ou une forme
 * avec support des transformations et métadonnées Cloudinary
 */
export interface IPageElementMedia extends IPageElement {
  /** URL complète de l'image sur Cloudinary (images uniquement) */
  cloudinaryUrl?: string

  /** ID public Cloudinary pour les transformations (images uniquement) */
  cloudinaryPublicId?: string

  /** Contenu emoji (emojis uniquement, par ex: "😀") */
  emojiContent?: string

  /** Type de forme géométrique (shapes uniquement) */
  shapeType?: ShapeType

  /** Couleur de remplissage de la forme en hexadécimal (shapes uniquement) */
  fillColor?: string

  /** Opacité de l'élément (0-100) */
  opacity?: number
}

/**
 * Entrée pour créer un nouvel élément média
 *
 * Utilisé pour les requêtes POST /api/page-elements
 */
export interface IPageElementInput {
  /** ID de la page parente */
  pageId: string

  /** Type d'élément */
  type: ElementType

  /** Position X en millimètres */
  x: number

  /** Position Y en millimètres */
  y: number

  /** Largeur en millimètres */
  width: number

  /** Hauteur en millimètres */
  height: number

  /** Rotation en degrés (optionnel) */
  rotation?: number

  /** Ordre d'affichage Z (optionnel) */
  zIndex?: number

  /** URL Cloudinary pour les images (optionnel) */
  cloudinaryUrl?: string

  /** ID public Cloudinary (optionnel) */
  cloudinaryPublicId?: string

  /** Contenu emoji (optionnel) */
  emojiContent?: string

  /** Type de forme (optionnel) */
  shapeType?: ShapeType

  /** Couleur de remplissage (optionnel, hex) */
  fillColor?: string

  /** Opacité (optionnel, 0-100) */
  opacity?: number

  /** ID de sticker dans la bibliothèque utilisateur (optionnel) */
  stickerLibraryId?: string | null

  /** Contenu structuré de l'élément (optionnel, peut être construit depuis les champs spécifiques au type) */
  content?: Record<string, any>

  /** Propriétés de style visuel (optionnel) */
  style?: Record<string, any>

  /** Métadonnées personnalisées (optionnel) */
  metadata?: Record<string, any>
}

/**
 * Mise à jour partielle d'un élément média
 *
 * Utilisé pour les requêtes PATCH /api/page-elements/:id
 * Tous les champs sont optionnels
 */
export interface IPageElementUpdate extends Partial<IPageElementInput> {}

/**
 * Sticker utilisateur sauvegardé dans la bibliothèque
 *
 * Représente un sticker créé par l'utilisateur et stocké dans sa bibliothèque
 * pour une réutilisation rapide
 */
export interface IUserSticker {
  /** Identifiant unique du sticker (UUID) */
  id: string

  /** ID de l'utilisateur propriétaire du sticker */
  userId: string

  /** Nom/titre du sticker (max 100 caractères) */
  name: string

  /** URL complète du sticker sur Cloudinary */
  cloudinaryUrl: string

  /** ID public Cloudinary du sticker */
  cloudinaryPublicId: string

  /** URL de la miniature du sticker */
  thumbnailUrl: string

  /** Étiquettes/tags associés au sticker pour la recherche */
  tags: string[]

  /** Indique si le sticker est public ou privé */
  isPublic: boolean

  /** Nombre de fois que ce sticker a été utilisé dans les journaux */
  usageCount: number

  /** Date de création du sticker (ISO 8601) */
  createdAt: string

  /** Date de dernière modification (ISO 8601) */
  updatedAt: string
}

/**
 * Données pour créer un nouveau sticker dans la bibliothèque
 *
 * Utilisé pour le formulaire d'upload de sticker
 */
export interface IUserStickerInput {
  /** Fichier image du sticker */
  file: File

  /** Nom du sticker */
  name: string

  /** Tags associés au sticker (optionnel) */
  tags?: string[]
}

/**
 * Mise à jour d'un sticker existant
 *
 * Utilisé pour les requêtes PATCH /api/user-library/stickers/:id
 */
export interface IUserStickerUpdate {
  /** Nouveau nom du sticker (optionnel) */
  newName?: string

  /** Nouveaux tags (optionnel) */
  newTags?: string[]
}

// ========================================
// RE-EXPORTS: US04 Type Modules
// ========================================

/**
 * Re-export all types from pageElement module for convenience
 *
 * Allows importing US04 page element types from this central models file.
 */
export type {
  PageElementsListResponse,
  PageElementResponse,
  IImageContent,
  IShapeContent,
  IStickerContent,
} from './pageElement'

/**
 * Re-export all types from media module for convenience
 *
 * Allows importing US04 media types from this central models file.
 */
export type {
  IImageTransformations,
  ITransformationMetadata,
  ImageTransformationApiResponse,
} from './media'

/**
 * Re-export all types from sticker module for convenience
 *
 * Allows importing US04 sticker library types from this central models file.
 */
export type {
  IUserStickerUploadRequest,
  IUserStickerUpdateRequest,
} from './sticker'
