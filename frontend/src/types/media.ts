/**
 * TypeScript interfaces and types for media operations (US04)
 *
 * Defines types for media uploads, transformations, and Cloudinary responses.
 *
 * @module types/media
 */

/**
 * Response from successful media upload
 *
 * Contains metadata about the uploaded file from Cloudinary.
 */
export interface IMediaUploadResponse {
  /** Unique identifier for the uploaded media element */
  id: string

  /** ID of the page where the media element was created */
  pageId: string

  /** Type of element created (always 'image' for media uploads) */
  type: 'image'

  /** Full URL to the image on Cloudinary */
  cloudinaryUrl: string

  /** Cloudinary public ID used for transformations */
  cloudinaryPublicId: string

  /** Original image width in pixels */
  width: number

  /** Original image height in pixels */
  height: number

  /** Image format (jpeg, png, webp, etc.) */
  format?: string

  /** Horizontal position in millimeters */
  x: number

  /** Vertical position in millimeters */
  y: number

  /** Element width in millimeters */
  width_mm?: number

  /** Element height in millimeters */
  height_mm?: number

  /** Visual stacking order */
  zIndex: number

  /** Rotation angle in degrees */
  rotation: number

  /** Element content with URL */
  content: { url: string }

  /** Element styling properties */
  style: Record<string, any>

  /** ISO 8601 creation timestamp */
  createdAt: string

  /** ISO 8601 update timestamp */
  updatedAt: string
}

/**
 * Image transformation parameters
 *
 * Defines all possible transformations that can be applied to an image.
 * These are sent to Cloudinary via the backend API.
 */
export interface IImageTransformations {
  /** Crop parameters to extract a region of the image */
  crop?: {
    /** Left edge coordinate in pixels */
    x: number

    /** Top edge coordinate in pixels */
    y: number

    /** Width of crop region in pixels */
    width: number

    /** Height of crop region in pixels */
    height: number
  }

  /** Brightness adjustment (-100 to 100) */
  brightness?: number

  /** Contrast adjustment (-100 to 100) */
  contrast?: number

  /** Saturation adjustment (-100 to 100) */
  saturation?: number

  /** Rotation in degrees (0, 90, 180, or 270) */
  rotation?: 0 | 90 | 180 | 270

  /** Flip direction */
  flip?: 'horizontal' | 'vertical'
}

/**
 * Transformation metadata in response
 *
 * Describes the applied transformations and resulting image properties.
 */
export interface ITransformationMetadata {
  /** Width of transformed image in pixels */
  width: number

  /** Height of transformed image in pixels */
  height: number

  /** Crop parameters that were applied */
  crop?: {
    x: number
    y: number
    width: number
    height: number
  }

  /** All applied adjustments */
  adjustments: {
    brightness?: number
    contrast?: number
    saturation?: number
    rotation?: number
    flip?: string
  }
}

/**
 * Response from image transformation endpoint
 *
 * Contains the transformed image URL and metadata about the transformation.
 */
export interface IImageTransformationResponse {
  /** Cloudinary URL with transformation parameters applied */
  cloudinaryUrl: string

  /** Metadata about the transformation and resulting image */
  metadata: ITransformationMetadata
}

/**
 * Response wrapper for transformation operations
 */
export interface ImageTransformationApiResponse {
  /** Indicates success of the operation */
  success: boolean

  /** The transformation result data */
  data: IImageTransformationResponse
}
