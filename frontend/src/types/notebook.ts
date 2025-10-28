/**
 * Types et interfaces pour les carnets de voyage (Notebooks)
 *
 * Ce fichier centralise toutes les définitions TypeScript pour les carnets :
 * - Notebook : Carnet de voyage complet
 * - NotebookPermissions : Paramètres de partage et visibilité
 * - DTOs : Objets de transfert pour création et mise à jour
 * - Filtres et pagination pour les listes de carnets
 *
 * Convention de nommage :
 * - Interfaces : PascalCase (ex: Notebook, NotebookPermissions)
 * - Propriétés : camelCase (ex: userId, createdAt)
 * - Enums : Union types pour cohérence avec backend
 */

// ========================================
// ENUMS AND TYPES
// ========================================

/**
 * Type de carnet
 *
 * - Voyage : Carnet de voyage (récit de voyage, itinéraire)
 * - Daily : Journal quotidien (journal intime, diary)
 * - Reportage : Reportage (article, documentation)
 */
export type NotebookType = 'Voyage' | 'Daily' | 'Reportage'

/**
 * Format de page pour l'export PDF
 *
 * - A4 : Format standard (210x297mm)
 * - A5 : Format compact (148x210mm)
 */
export type NotebookFormat = 'A4' | 'A5'

/**
 * Orientation de la page pour l'export PDF
 *
 * - portrait : Orientation verticale (hauteur > largeur)
 * - landscape : Orientation horizontale (largeur > hauteur)
 */
export type NotebookOrientation = 'portrait' | 'landscape'

/**
 * Statut du carnet
 *
 * - active : Carnet actif (éditable, visible dans la liste principale)
 * - archived : Carnet archivé (non éditable, visible uniquement dans les archives)
 */
export type NotebookStatus = 'active' | 'archived'

/**
 * Type de permissions de partage
 *
 * - private : Privé (visible uniquement par le propriétaire)
 * - public : Public (accessible via un lien public unique)
 * - restricted : Restreint (accessible uniquement aux emails/utilisateurs autorisés)
 */
export type PermissionType = 'private' | 'public' | 'restricted'

/**
 * Ordre de tri pour les requêtes
 *
 * - ASC : Ordre croissant (A->Z, 1->10, ancien->récent)
 * - DESC : Ordre décroissant (Z->A, 10->1, récent->ancien)
 */
export type SortOrder = 'ASC' | 'DESC'

/**
 * Champs disponibles pour le tri des carnets
 *
 * Ces champs correspondent aux colonnes de la table notebooks
 * et permettent de trier les résultats de recherche
 */
export type NotebookSortField = 'createdAt' | 'updatedAt' | 'title' | 'pageCount' | 'type'

// ========================================
// NOTEBOOK MODEL
// ========================================

/**
 * Représente un carnet complet (Notebook)
 *
 * Un carnet est un conteneur pour des pages organisées.
 * Il définit le format, l'orientation, et les métadonnées pour l'export PDF.
 *
 * Cette interface correspond exactement à la structure retournée par le backend.
 */
export interface Notebook {
  /** Identifiant unique du carnet (UUID) */
  id: string

  /** Identifiant de l'utilisateur propriétaire (UUID) */
  userId: string

  /** Titre du carnet (max 100 caractères) */
  title: string

  /** Description optionnelle du carnet (max 300 caractères) */
  description?: string

  /** Type de carnet (Voyage, Daily, Reportage) */
  type: NotebookType

  /** Format de page pour l'export PDF (A4 ou A5) */
  format: NotebookFormat

  /** Orientation de la page pour l'export PDF (portrait ou landscape) */
  orientation: NotebookOrientation

  /** DPI pour l'export PDF (fixé à 300 pour haute qualité) */
  dpi: number

  /** Nombre de pages dans le carnet (auto-incrémenté par US03) */
  pageCount: number

  /** URL ou base64 de l'image de couverture (optionnelle) */
  coverImageUrl?: string

  /** Statut du carnet (active ou archived) */
  status: NotebookStatus

  /** Date d'archivage (null si carnet actif) */
  archivedAt?: Date | null

  /** Date de création du carnet (ISO 8601) */
  createdAt: Date

  /** Date de dernière modification (ISO 8601) */
  updatedAt: Date
}

// ========================================
// NOTEBOOK PERMISSIONS MODEL
// ========================================

/**
 * Représente les permissions de partage d'un carnet
 *
 * Chaque carnet a exactement un enregistrement de permissions
 * qui définit qui peut voir et accéder au carnet.
 *
 * Cette interface correspond exactement à la structure retournée par le backend.
 */
export interface NotebookPermissions {
  /** Identifiant unique des permissions (UUID) */
  id: string

  /** Identifiant du carnet auquel ces permissions s'appliquent (UUID) */
  notebookId: string

  /** Type de permissions (private, public, restricted) */
  type: PermissionType

  /** Lien public unique pour le partage (null si privé/restreint) */
  publicLink?: string | null

  /** Liste des emails autorisés (null si non restreint) */
  allowedEmails?: string[] | null

  /** Liste des IDs utilisateurs autorisés (null si non restreint) */
  allowedUserIds?: string[] | null

  /** Date de création des permissions (ISO 8601) */
  createdAt: Date

  /** Date de dernière modification (ISO 8601) */
  updatedAt: Date
}

// ========================================
// DATA TRANSFER OBJECTS (DTOs)
// ========================================

/**
 * Données requises pour créer un nouveau carnet
 *
 * Utilisé par le formulaire de création de carnet et l'endpoint POST /api/notebooks
 *
 * Les champs omis (id, userId, dpi, pageCount, status, timestamps) sont générés
 * automatiquement par le backend lors de la création.
 */
export interface CreateNotebookDto {
  /** Titre du carnet (requis, max 100 caractères) */
  title: string

  /** Description optionnelle (max 300 caractères) */
  description?: string

  /** Type de carnet (Voyage, Daily, Reportage) */
  type: NotebookType

  /** Format de page pour l'export PDF (A4 ou A5) */
  format: NotebookFormat

  /** Orientation de la page (portrait ou landscape) */
  orientation: NotebookOrientation
}

/**
 * Données pour mettre à jour un carnet existant
 *
 * Utilisé par le formulaire d'édition de carnet et l'endpoint PUT /api/notebooks/:id
 *
 * Seuls le titre et la description peuvent être modifiés après création.
 * Le type, format, et orientation sont immuables pour préserver la cohérence
 * des pages existantes.
 */
export interface UpdateNotebookDto {
  /** Nouveau titre du carnet (optionnel, max 100 caractères) */
  title?: string

  /** Nouvelle description (optionnelle, max 300 caractères) */
  description?: string
}

// ========================================
// PAGINATION AND FILTERING
// ========================================

/**
 * Métadonnées de pagination pour les listes de carnets
 *
 * Retournées par tous les endpoints qui retournent des listes paginées
 * (GET /api/notebooks, GET /api/notebooks/archived)
 */
export interface PaginationMetadata {
  /** Numéro de la page actuelle (commence à 1) */
  currentPage: number

  /** Nombre d'éléments par page (limite) */
  limit: number

  /** Nombre total d'éléments disponibles */
  total: number

  /** Nombre total de pages disponibles */
  totalPages: number
}

/**
 * Paramètres de filtrage pour la liste des carnets
 *
 * Utilisé pour construire les query params de GET /api/notebooks
 *
 * Tous les champs sont optionnels. Si aucun filtre n'est fourni,
 * tous les carnets actifs sont retournés (avec pagination par défaut).
 */
export interface NotebookFilters {
  /** Filtrer par type(s) (ex: 'Voyage,Daily' pour plusieurs types) */
  type?: string

  /** Filtrer par statut (active ou archived) */
  status?: NotebookStatus

  /** Recherche textuelle dans titre et description */
  search?: string

  /** Champ pour trier les résultats (défaut: createdAt) */
  sort?: NotebookSortField

  /** Ordre de tri (défaut: DESC) */
  order?: SortOrder

  /** Numéro de page (défaut: 1) */
  page?: number

  /** Nombre d'éléments par page (défaut: 10, max: 50) */
  limit?: number
}

// ========================================
// API RESPONSE TYPES
// ========================================

/**
 * Réponse paginée pour la liste des carnets
 *
 * Retournée par GET /api/notebooks et GET /api/notebooks/archived
 *
 * Combine la liste des carnets avec les métadonnées de pagination
 * pour permettre la navigation entre les pages.
 */
export interface PaginatedNotebooksResponse {
  /** Liste des carnets pour la page actuelle */
  notebooks: Notebook[]

  /** Métadonnées de pagination */
  pagination: PaginationMetadata
}

/**
 * Réponse pour un carnet individuel avec ses permissions
 *
 * Retournée par GET /api/notebooks/:id
 *
 * Combine les données du carnet avec ses paramètres de partage
 * pour afficher toutes les informations pertinentes.
 */
export interface NotebookWithPermissionsResponse {
  /** Données complètes du carnet */
  notebook: Notebook

  /** Paramètres de partage et visibilité */
  permissions: NotebookPermissions
}

/**
 * Réponse pour la création d'un carnet
 *
 * Retournée par POST /api/notebooks
 */
export interface CreateNotebookResponse {
  /** Indique le succès de l'opération */
  success: boolean

  /** Message de confirmation */
  message: string

  /** Carnet créé avec toutes ses propriétés */
  notebook: Notebook
}

/**
 * Réponse pour la mise à jour d'un carnet
 *
 * Retournée par PUT /api/notebooks/:id, PUT /api/notebooks/:id/archive,
 * PUT /api/notebooks/:id/restore
 */
export interface UpdateNotebookResponse {
  /** Indique le succès de l'opération */
  success: boolean

  /** Message de confirmation */
  message: string

  /** Carnet mis à jour avec toutes ses propriétés */
  notebook: Notebook
}

/**
 * Réponse pour la duplication d'un carnet
 *
 * Retournée par POST /api/notebooks/:id/duplicate
 */
export interface DuplicateNotebookResponse {
  /** Indique le succès de l'opération */
  success: boolean

  /** Message de confirmation */
  message: string

  /** Nouveau carnet dupliqué avec son propre ID */
  notebook: Notebook
}

/**
 * Réponse pour la suppression d'un carnet
 *
 * Retournée par DELETE /api/notebooks/:id (204 No Content)
 *
 * Note: Cette interface est définie pour cohérence, mais la réponse
 * réelle est vide (204 No Content). Le frontend peut l'utiliser pour
 * typer les opérations de suppression.
 */
export interface DeleteNotebookResponse {
  /** Indique le succès de l'opération */
  success: boolean

  /** Message de confirmation */
  message: string
}
