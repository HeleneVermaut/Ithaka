/**
 * TypeScript interfaces and types for sticker library operations (US04)
 *
 * Defines types for user sticker management, including CRUD operations
 * for personal sticker collections.
 *
 * @module types/sticker
 */

/**
 * Represents a single sticker in user's personal library
 *
 * Stickers are reusable graphics that users can save and apply to pages.
 * They are stored in Cloudinary and managed in the UserSticker database table.
 */
export interface IUserSticker {
  /** Unique identifier for the sticker (UUID) */
  id: string

  /** ID of the user who owns this sticker */
  userId: string

  /** User-friendly name for the sticker (1-100 characters) */
  name: string

  /** Full URL to the sticker image on Cloudinary */
  cloudinaryUrl: string

  /** Cloudinary public ID used for transformations and deletions */
  cloudinaryPublicId: string

  /** URL to a thumbnail version of the sticker */
  thumbnailUrl: string

  /** Tags for organizing and searching stickers */
  tags: string[]

  /** Whether this sticker is public or private */
  isPublic: boolean

  /** Number of times this sticker has been used in journals */
  usageCount: number

  /** ISO 8601 timestamp of sticker creation */
  createdAt: string

  /** ISO 8601 timestamp of last modification */
  updatedAt: string

  /** ISO 8601 timestamp when soft-deleted (null if not deleted) */
  deletedAt?: string | null
}

/**
 * Data required to upload a sticker to the library
 *
 * Used when adding a new sticker via multipart form upload.
 */
export interface IUserStickerUploadRequest {
  /** The sticker image file to upload (JPEG, PNG, or SVG) */
  file: File

  /** User-friendly name for the sticker (1-100 characters) */
  name: string

  /** Optional tags for organizing stickers (max 10 tags, 1-30 chars each) */
  tags?: string[]
}

/**
 * Data for updating an existing sticker's metadata
 *
 * Used to rename stickers and update their tags.
 */
export interface IUserStickerUpdateRequest {
  /** New name for the sticker (optional, 1-100 characters) */
  newName?: string

  /** New tags for the sticker (optional, max 10 tags, 1-30 chars each) */
  newTags?: string[]
}

/**
 * Pagination metadata for list responses
 *
 * Used to track position in paginated result sets.
 */
export interface IPaginationMetadata {
  /** Current page number in the result set */
  currentPage: number

  /** Number of results per page */
  limit: number

  /** Total number of stickers matching the query */
  total: number

  /** Total number of pages available */
  totalPages: number
}

/**
 * Response from sticker library list endpoint
 *
 * Returns a paginated list of stickers with filtering and sorting applied.
 */
export interface IStickerLibraryListResponse {
  /** Array of sticker records */
  stickers: IUserSticker[]

  /** Pagination metadata for this response */
  pagination: IPaginationMetadata
}

/**
 * Query parameters for filtering sticker library
 *
 * Optional filters and sorting options for listing stickers.
 */
export interface IStickerLibraryFilters {
  /** Comma-separated tags to filter by */
  tags?: string

  /** Filter by public/private status (true or false) */
  isPublic?: boolean

  /** Field to sort by (name, createdAt, usageCount) */
  sortBy?: 'name' | 'createdAt' | 'usageCount'

  /** Sort order (ASC or DESC) */
  order?: 'ASC' | 'DESC'

  /** Page number for pagination (default: 1) */
  page?: number

  /** Results per page (default: 20, max: 100) */
  limit?: number
}

/**
 * Response wrapper for sticker operations
 */
export interface StickerApiResponse {
  /** Indicates success of the operation */
  success: boolean

  /** The sticker data (created, updated, or fetched) */
  data: IUserSticker
}

/**
 * Response wrapper for sticker list operations
 */
export interface StickerLibraryApiResponse {
  /** Indicates success of the operation */
  success: boolean

  /** The sticker library data with pagination */
  data: IStickerLibraryListResponse
}
