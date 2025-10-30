/**
 * TypeScript interfaces and types for page elements (US04)
 *
 * This file defines the data structures for all page element operations,
 * including text elements, images, shapes, emojis, and stickers.
 *
 * All coordinates and dimensions are in millimeters (mm) to support
 * multiple paper sizes and facilitate high-quality PDF export at 300 DPI.
 *
 * @module types/pageElement
 */

/**
 * Represents a single element on a page
 *
 * Elements are the building blocks of a page and can be of various types:
 * - text: Text content with font styling
 * - image: Images uploaded from Cloudinary
 * - sticker: Pre-defined or user-created stickers
 * - shape: Geometric shapes (circle, square, etc.)
 * - emoji: Single emoji character
 *
 * All positioning and sizing is done in millimeters (mm) for precision.
 */
export interface IPageElement {
  /** Unique identifier for the element (UUID) */
  id: string

  /** ID of the parent page this element belongs to */
  pageId: string

  /** Type of element (determines how content is interpreted) */
  type: 'text' | 'image' | 'sticker' | 'shape' | 'emoji' | 'moodTracker'

  /** Horizontal position from left edge in millimeters */
  x: number

  /** Vertical position from top edge in millimeters */
  y: number

  /** Width of the element in millimeters */
  width: number

  /** Height of the element in millimeters */
  height: number

  /** Rotation angle in degrees (-180 to 180) */
  rotation: number

  /** Visual stacking order (0 = back, 999 = front) */
  zIndex: number

  /** Type-specific content (structure depends on element type) */
  content: Record<string, any>

  /** Visual styling (opacity, shadow, color, etc.) */
  style: Record<string, any>

  /** Additional custom properties for extensions */
  metadata?: Record<string, any> | null

  /** ISO 8601 timestamp of element creation */
  createdAt: string

  /** ISO 8601 timestamp of last modification */
  updatedAt: string

  /** ISO 8601 timestamp when soft-deleted (null if not deleted) */
  deletedAt?: string | null
}

/**
 * Data required to create a new page element
 *
 * Used when adding a new element to a page via the POST endpoint.
 * The server will auto-calculate zIndex if not provided.
 */
export interface IPageElementCreateRequest {
  /** ID of the page where element will be created */
  pageId: string

  /** Type of element to create */
  type: 'text' | 'image' | 'sticker' | 'shape' | 'emoji' | 'moodTracker'

  /** Horizontal position in millimeters */
  x: number

  /** Vertical position in millimeters */
  y: number

  /** Width in millimeters */
  width: number

  /** Height in millimeters */
  height: number

  /** Rotation angle in degrees (optional, default: 0) */
  rotation?: number

  /** Visual stacking order (optional, auto-calculated by server) */
  zIndex?: number

  /** Type-specific content properties */
  content: Record<string, any>

  /** Style properties (optional) */
  style?: Record<string, any>

  /** Custom metadata (optional) */
  metadata?: Record<string, any>
}

/**
 * Data for partially updating an existing page element
 *
 * Used for PATCH/PUT operations. All fields are optional.
 * Only provided fields will be updated on the server.
 */
export interface IPageElementUpdateRequest {
  /** New horizontal position in millimeters */
  x?: number

  /** New vertical position in millimeters */
  y?: number

  /** New width in millimeters */
  width?: number

  /** New height in millimeters */
  height?: number

  /** New rotation angle in degrees */
  rotation?: number

  /** New z-index value */
  zIndex?: number

  /** Updated content properties */
  content?: Record<string, any>

  /** Updated style properties */
  style?: Record<string, any>

  /** Updated metadata */
  metadata?: Record<string, any>
}

/**
 * API response for listing page elements
 *
 * Returned by GET /api/page-elements?pageId=...
 */
export interface PageElementsListResponse {
  /** Array of page elements for the given page */
  elements: IPageElement[]

  /** Total count of elements on the page */
  total: number
}

/**
 * Text content properties for text elements
 *
 * Defines the structure of the content field for elements with type='text'
 */
export interface ITextContent {
  /** Text to display (max 1000 characters) */
  text: string

  /** Font family name (Google Font or system font) */
  fontFamily: string

  /** Font size in pixels (8-200) */
  fontSize: number

  /** Text color in hexadecimal format (#RRGGBB) */
  fill: string

  /** Horizontal text alignment */
  textAlign?: 'left' | 'center' | 'right'

  /** Font weight */
  fontWeight?: 'normal' | 'bold'

  /** Font style (normal or italic) */
  fontStyle?: 'normal' | 'italic'

  /** Whether text is underlined */
  underline?: boolean

  /** Line height multiplier */
  lineHeight?: number
}

/**
 * Image content properties for image elements
 *
 * Defines the structure of the content field for elements with type='image'
 */
export interface IImageContent {
  /** Full URL of the image on Cloudinary */
  url: string

  /** Cloudinary public ID for transformations */
  publicId?: string

  /** Original image width in pixels */
  width?: number

  /** Original image height in pixels */
  height?: number

  /** Image format (jpeg, png, webp, etc.) */
  format?: string
}

/**
 * Shape content properties for shape elements
 *
 * Defines the structure of the content field for elements with type='shape'
 */
export interface IShapeContent {
  /** Type of geometric shape */
  shapeType: 'circle' | 'square' | 'rectangle' | 'triangle' | 'heart'

  /** Fill color in hexadecimal format (#RRGGBB) */
  fillColor: string

  /** Border color (optional) */
  borderColor?: string

  /** Border width in pixels (optional) */
  borderWidth?: number
}

/**
 * Sticker content properties for sticker elements
 *
 * Defines the structure of the content field for elements with type='sticker'
 */
export interface IStickerContent {
  /** URL of the sticker image on Cloudinary */
  url: string

  /** Reference to UserSticker library item (optional) */
  stickerLibraryId?: string

  /** Cloudinary public ID for the sticker */
  publicId?: string
}

/**
 * Response when successfully creating or updating an element
 */
export interface PageElementResponse {
  /** Indicates success of the operation */
  success: boolean

  /** The element data (created or updated) */
  data: IPageElement
}
