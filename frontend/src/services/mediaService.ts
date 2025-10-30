/**
 * Frontend API service for media operations (US04)
 *
 * Provides typed functions for:
 * - Media file uploads to Cloudinary via backend
 * - Image transformations (crop, brightness, contrast, saturation, rotation, flip)
 *
 * All uploads support progress tracking callbacks for UI feedback.
 *
 * @module services/mediaService
 */

import api from './api'
import type {
  IMediaUploadResponse,
  IImageTransformations,
  IImageTransformationResponse,
  ImageTransformationApiResponse,
} from '@/types/media'

/**
 * API response wrapper for media upload
 */
interface MediaUploadApiResponse {
  /** Indicates success of the operation */
  success: boolean

  /** The uploaded media element data */
  data: IMediaUploadResponse
}

/**
 * Callback function signature for upload progress tracking
 *
 * Called periodically during file upload with percentage completed (0-100).
 *
 * @param percent - Upload progress from 0 to 100
 *
 * @example
 * (percent) => console.log(`Uploaded: ${percent}%`)
 */
export type UploadProgressCallback = (percent: number) => void

/**
 * Upload media file to Cloudinary and create a page element
 *
 * Uploads the file as multipart FormData to the server, which uploads it to
 * Cloudinary and creates an associated PageElement record in the database.
 * The element is created at position (0, 0) by default.
 *
 * Supports upload progress tracking for display UI feedback.
 *
 * @async
 * @param {File} file - Image file to upload (JPEG, PNG, WebP, etc.)
 * @param {string} pageId - ID of the page where element will be created
 * @param {UploadProgressCallback} [onProgress] - Optional callback to track upload progress (0-100)
 * @returns {Promise<IMediaUploadResponse>} Uploaded media element with Cloudinary metadata
 * @throws {AxiosError} If file validation fails, page not found, or upload fails
 *
 * @example
 * const file = new File([...], 'photo.jpg', { type: 'image/jpeg' });
 * const element = await uploadMedia(file, pageId, (percent) => {
 *   console.log(`Upload progress: ${percent}%`);
 * });
 * console.log(`Media element created: ${element.id}`);
 *
 * @route POST /api/media/upload
 * @auth Required (JWT via cookie)
 * @status 201 Created
 * @status 400 Bad Request - Invalid file format or size
 * @status 403 Forbidden - User doesn't own the page
 * @status 404 Not Found - Page doesn't exist
 * @status 413 Payload Too Large - File exceeds 10 MB
 */
export async function uploadMedia(
  file: File,
  pageId: string,
  onProgress?: UploadProgressCallback
): Promise<IMediaUploadResponse> {
  try {
    // Create FormData for multipart upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('pageId', pageId)

    // Upload with progress tracking
    const response = await api.post<MediaUploadApiResponse>(
      '/media/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            // Calculate percentage completed
            const percentCompleted = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            )
            // Call callback if provided
            onProgress?.(percentCompleted)
          }
        },
      }
    )

    return response.data.data
  } catch (error) {
    console.error('Failed to upload media:', error)
    throw error
  }
}

/**
 * Apply transformations to an image element
 *
 * Applies Cloudinary transformations to an existing image element without
 * persisting changes. The transformed URL is returned for preview or saving.
 *
 * Transformations are applied server-side via Cloudinary and include:
 * - Crop: Extract a region of the image
 * - Brightness: Adjust brightness (-100 to 100)
 * - Contrast: Adjust contrast (-100 to 100)
 * - Saturation: Adjust color saturation (-100 to 100)
 * - Rotation: Rotate image (0, 90, 180, or 270 degrees)
 * - Flip: Flip horizontally or vertically
 *
 * @async
 * @param {string} elementId - ID of the media element to transform
 * @param {IImageTransformations} transformations - Transformation parameters
 * @returns {Promise<IImageTransformationResponse>} Transformed URL and metadata
 * @throws {AxiosError} If element not found, element is not an image, or transformation fails
 *
 * @example
 * const result = await transformImage(elementId, {
 *   crop: {
 *     x: 100,
 *     y: 100,
 *     width: 300,
 *     height: 300
 *   },
 *   brightness: 20,
 *   contrast: 10,
 *   saturation: -15
 * });
 * // Use result.cloudinaryUrl to display preview
 *
 * @route POST /api/media/:id/transform
 * @auth Required (JWT via cookie)
 * @status 200 Success
 * @status 400 Bad Request - Invalid transformation parameters
 * @status 404 Not Found - Element doesn't exist or is not an image
 */
export async function transformImage(
  elementId: string,
  transformations: IImageTransformations
): Promise<IImageTransformationResponse> {
  try {
    const response = await api.post<ImageTransformationApiResponse>(
      `/media/${elementId}/transform`,
      transformations
    )
    return response.data.data
  } catch (error) {
    console.error(
      `Failed to apply transformation to media element ${elementId}:`,
      error
    )
    throw error
  }
}

/**
 * Export all media service functions as a namespace
 * Provides an alternative import pattern: `import mediaService from '...'`
 */
export default {
  uploadMedia,
  transformImage,
}
