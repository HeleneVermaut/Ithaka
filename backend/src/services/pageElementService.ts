/**
 * PageElement Service Layer
 *
 * This service handles all business logic for managing canvas elements on pages.
 * It provides CRUD operations, z-index management, data validation, and supports
 * soft-delete functionality for element recovery.
 *
 * Features:
 * - Create elements with automatic z-index calculation
 * - Read and filter elements by page
 * - Update element properties with validation
 * - Soft-delete with restoration capability
 * - Duplicate elements with position offset
 * - Z-index management and normalization
 *
 * Coordinates and dimensions are in millimeters (mm) to support multiple paper sizes
 * and facilitate high-quality PDF export at 300 DPI.
 *
 * @module services/pageElementService
 */

import { PageElement, Page, Notebook } from '../models';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { IPageElement, IPageElementInput, IPageElementUpdate } from '../types/models';

/**
 * Interface for element filter options
 * Used to customize element queries with optional filtering criteria
 *
 * @interface ElementFilters
 */
export interface ElementFilters {
  /** Filter elements by specific type */
  type?: IPageElement['type'];

  /** Include soft-deleted elements in results */
  includeDeleted?: boolean;
}

/**
 * Validation constraints for page elements
 * These define the bounds for element positioning and dimensions
 *
 * IMPORTANT: All values are in MILLIMETERS (mm) for consistency with PDF export
 * and multi-format support. This allows precise positioning at 300 DPI for print quality.
 *
 * Conversion reference at 96 DPI:
 * - 0.5mm = ~2px (minimum visible element)
 * - 3000mm = ~11339px (maximum practical element size)
 */
const VALIDATION_CONSTRAINTS = {
  /** Minimum and maximum X/Y position in millimeters */
  POSITION: {
    MIN: 0,
    MAX: 2000,
  },

  /** Minimum and maximum element dimensions in millimeters
   * 0.5mm minimum allows for very small elements (lines, thin text)
   * 3000mm maximum covers all practical use cases
   */
  DIMENSIONS: {
    MIN: 0.5,
    MAX: 3000,
  },

  /** Valid rotation range in degrees */
  ROTATION: {
    MIN: -180,
    MAX: 180,
  },

  /** Valid z-index range for layer ordering */
  Z_INDEX: {
    MIN: 0,
    MAX: 999,
  },

  /** Default z-index for new elements */
  DEFAULT_Z_INDEX: 0,
} as const;

/**
 * Validate position coordinates are within canvas bounds
 *
 * Position coordinates in millimeters (mm) are used for precise positioning
 * and PDF export compatibility. This validates both X and Y coordinates.
 *
 * @param {number} x - X coordinate in millimeters
 * @param {number} y - Y coordinate in millimeters
 * @throws {AppError} If coordinates are outside valid bounds
 *
 * @example
 * validatePosition(0, 0);      // Valid
 * validatePosition(500, 750);  // Valid
 * validatePosition(-10, 500);  // Throws error: negative X
 * validatePosition(3000, 500); // Throws error: X exceeds maximum
 */
function validatePosition(x: number, y: number): void {
  if (x < VALIDATION_CONSTRAINTS.POSITION.MIN || x > VALIDATION_CONSTRAINTS.POSITION.MAX) {
    throw new AppError(
      `X coordinate must be between ${VALIDATION_CONSTRAINTS.POSITION.MIN} and ${VALIDATION_CONSTRAINTS.POSITION.MAX}mm`,
      400
    );
  }

  if (y < VALIDATION_CONSTRAINTS.POSITION.MIN || y > VALIDATION_CONSTRAINTS.POSITION.MAX) {
    throw new AppError(
      `Y coordinate must be between ${VALIDATION_CONSTRAINTS.POSITION.MIN} and ${VALIDATION_CONSTRAINTS.POSITION.MAX}mm`,
      400
    );
  }
}

/**
 * Validate element dimensions (width and height)
 *
 * Dimensions must be within reasonable bounds to prevent extremely
 * small or oversized elements on the canvas.
 *
 * @param {number} width - Element width in millimeters
 * @param {number} height - Element height in millimeters
 * @throws {AppError} If dimensions are outside valid bounds
 *
 * @example
 * validateDimensions(100, 80);   // Valid
 * validateDimensions(10, 50);    // Throws error: width < 20mm
 * validateDimensions(100, 15000); // Throws error: height > 10000mm
 */
function validateDimensions(width: number, height: number): void {
  if (width < VALIDATION_CONSTRAINTS.DIMENSIONS.MIN || width > VALIDATION_CONSTRAINTS.DIMENSIONS.MAX) {
    throw new AppError(
      `Width must be between ${VALIDATION_CONSTRAINTS.DIMENSIONS.MIN} and ${VALIDATION_CONSTRAINTS.DIMENSIONS.MAX}mm`,
      400
    );
  }

  if (height < VALIDATION_CONSTRAINTS.DIMENSIONS.MIN || height > VALIDATION_CONSTRAINTS.DIMENSIONS.MAX) {
    throw new AppError(
      `Height must be between ${VALIDATION_CONSTRAINTS.DIMENSIONS.MIN} and ${VALIDATION_CONSTRAINTS.DIMENSIONS.MAX}mm`,
      400
    );
  }
}

/**
 * Validate rotation angle is within acceptable range
 *
 * Rotation values are stored in degrees and should be between -180 and 180
 * to represent all possible rotations efficiently.
 *
 * @param {number} rotation - Rotation angle in degrees
 * @throws {AppError} If rotation is outside valid range
 *
 * @example
 * validateRotation(0);     // Valid
 * validateRotation(45);    // Valid
 * validateRotation(-90);   // Valid
 * validateRotation(270);   // Throws error: exceeds maximum
 */
function validateRotation(rotation: number): void {
  if (rotation < VALIDATION_CONSTRAINTS.ROTATION.MIN || rotation > VALIDATION_CONSTRAINTS.ROTATION.MAX) {
    throw new AppError(
      `Rotation must be between ${VALIDATION_CONSTRAINTS.ROTATION.MIN} and ${VALIDATION_CONSTRAINTS.ROTATION.MAX} degrees`,
      400
    );
  }
}

/**
 * Validate z-index is within acceptable range for stacking
 *
 * Z-index determines the visual stacking order of elements on the canvas.
 * Valid values range from 0 (back) to 999 (front).
 *
 * @param {number} zIndex - Z-index value
 * @throws {AppError} If z-index is outside valid range
 *
 * @example
 * validateZIndex(0);     // Valid - back layer
 * validateZIndex(500);   // Valid - middle layer
 * validateZIndex(999);   // Valid - front layer
 * validateZIndex(1000);  // Throws error: exceeds maximum
 */
function validateZIndex(zIndex: number): void {
  if (zIndex < VALIDATION_CONSTRAINTS.Z_INDEX.MIN || zIndex > VALIDATION_CONSTRAINTS.Z_INDEX.MAX) {
    throw new AppError(
      `Z-index must be between ${VALIDATION_CONSTRAINTS.Z_INDEX.MIN} and ${VALIDATION_CONSTRAINTS.Z_INDEX.MAX}`,
      400
    );
  }
}

/**
 * Calculate the next z-index for a new element on a page
 *
 * This function queries the database to find the highest current z-index
 * for non-deleted elements on the page and returns the next available value.
 * This ensures new elements are placed on top of existing elements.
 *
 * @async
 * @param {string} pageId - The page ID to calculate z-index for
 * @returns {Promise<number>} The next available z-index value
 * @throws {AppError} If the calculated z-index would exceed the maximum
 *
 * @example
 * const nextZIndex = await calculateNextZIndex(pageId);
 * // If page has 3 elements with zIndex [0, 2, 5], returns 6
 */
async function calculateNextZIndex(pageId: string): Promise<number> {
  const maxElement = await PageElement.findOne({
    where: {
      pageId,
      deletedAt: null,
    },
    order: [['zIndex', 'DESC']],
    attributes: ['zIndex'],
    raw: true,
  });

  const nextZIndex = (maxElement?.zIndex ?? -1) + 1;

  if (nextZIndex > VALIDATION_CONSTRAINTS.Z_INDEX.MAX) {
    throw new AppError(
      'Maximum element layer limit reached. Cannot add more elements to this page.',
      400
    );
  }

  logger.debug(`Calculated next z-index for page ${pageId}: ${nextZIndex}`);
  return nextZIndex;
}

/**
 * Verify user authorization for a page through notebook ownership
 *
 * This is an internal helper function that checks whether the user owns
 * the notebook containing the page. Used for authorization checks.
 *
 * @async
 * @param {string} pageId - The page ID to check authorization for
 * @param {string} userId - The user ID to verify ownership
 * @throws {AppError} 404 if page or notebook not found, or user is not the owner
 *
 * @example
 * await verifyPageAuthorization(pageId, userId);
 * // Throws if user doesn't own the notebook
 */
async function verifyPageAuthorization(pageId: string, userId: string): Promise<void> {
  const page = await Page.findByPk(pageId);
  if (!page) {
    throw new AppError('Page not found', 404);
  }

  const notebook = await Notebook.findByPk(page.notebookId);
  if (!notebook || notebook.userId !== userId) {
    throw new AppError('Unauthorized access to this page', 403);
  }
}

/**
 * Create a new page element with validation and auto z-index assignment
 *
 * This method creates a new element on the canvas with comprehensive validation.
 * The z-index is automatically calculated to place the new element on top of
 * existing elements. All input data is validated before database insertion.
 *
 * @async
 * @param {IPageElementInput} data - Element data to create
 * @param {string} [userId] - Optional user ID for authorization checks (future use)
 * @returns {Promise<PageElement>} The created element instance
 * @throws {AppError} If validation fails or database error occurs
 *
 * @example
 * const element = await createPageElement({
 *   pageId: 'page-123',
 *   type: 'text',
 *   x: 100,
 *   y: 150,
 *   width: 200,
 *   height: 100,
 *   content: { text: 'Hello', fontSize: 16 },
 *   style: { opacity: 1 }
 * });
 */
export async function createPageElement(
  data: IPageElementInput,
  userId?: string
): Promise<PageElement> {
  try {
    // Authorize if userId provided
    if (userId) {
      await verifyPageAuthorization(data.pageId, userId);
    }

    // Validate all required and optional fields
    validatePosition(data.x, data.y);
    validateDimensions(data.width, data.height);

    if (data.rotation !== undefined) {
      validateRotation(data.rotation);
    }

    // Calculate automatic z-index for new element
    const zIndex = await calculateNextZIndex(data.pageId);

    // Prepare content object based on element type
    // Type-specific fields (emojiContent, cloudinaryUrl, shapeType, fillColor, opacity)
    // should be moved into the content JSONB column for consistency
    let content = data.content || {};

    // Transform type-specific fields into content object
    if (data.type === 'emoji' && data.emojiContent) {
      content = { ...content, code: data.emojiContent };
    }

    if ((data.type === 'image' || data.type === 'sticker') && data.cloudinaryUrl) {
      content = { ...content, url: data.cloudinaryUrl };
    }

    if (data.type === 'shape') {
      if (data.shapeType) {
        content = { ...content, shapeType: data.shapeType };
      }
      if (data.fillColor) {
        content = { ...content, fillColor: data.fillColor };
      }
    }

    // Opacity can apply to any type, add to style if provided
    let style = data.style || {};
    if (data.opacity !== undefined) {
      style = { ...style, opacity: data.opacity };
    }

    // Create element in database
    const element = await PageElement.create({
      pageId: data.pageId,
      type: data.type,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      rotation: data.rotation ?? VALIDATION_CONSTRAINTS.DEFAULT_Z_INDEX,
      zIndex,
      content,
      style,
      metadata: data.metadata ?? null,
      stickerLibraryId: data.stickerLibraryId || null,
    });

    logger.debug(
      `Created page element: id=${element.id}, type=${element.type}, zIndex=${zIndex}`
    );

    return element;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Failed to create page element', error);
    throw new AppError('Failed to create page element', 500);
  }
}

/**
 * Get all elements for a specific page with optional filtering
 *
 * Retrieves elements from the page, excluding soft-deleted elements by default.
 * Elements are sorted by z-index in ascending order (lowest to highest).
 * Optional filters allow filtering by type or including deleted elements.
 *
 * @async
 * @param {string} pageId - The page ID to fetch elements for
 * @param {ElementFilters} [filters] - Optional filter criteria
 * @returns {Promise<PageElement[]>} Array of elements sorted by z-index
 * @throws {AppError} If page not found
 *
 * @example
 * // Get all non-deleted elements
 * const elements = await getPageElements(pageId);
 *
 * // Get only text elements
 * const textElements = await getPageElements(pageId, { type: 'text' });
 *
 * // Include soft-deleted elements
 * const allElements = await getPageElements(pageId, { includeDeleted: true });
 */
export async function getPageElements(
  pageId: string,
  filters?: ElementFilters
): Promise<PageElement[]> {
  try {
    const page = await Page.findByPk(pageId);
    if (!page) {
      throw new AppError('Page not found', 404);
    }

    const where: any = { pageId };

    // Add type filter if specified
    if (filters?.type) {
      where.type = filters.type;
    }

    // Exclude deleted elements by default
    if (!filters?.includeDeleted) {
      where.deletedAt = null;
    }

    const elements = await PageElement.findAll({
      where,
      order: [['zIndex', 'ASC']],
      paranoid: !filters?.includeDeleted,
    });

    logger.debug(
      `Retrieved ${elements.length} elements for page ${pageId}` +
        (filters?.type ? ` (type: ${filters.type})` : '') +
        (filters?.includeDeleted ? ' (including deleted)' : '')
    );

    return elements;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Failed to retrieve page elements', error);
    throw new AppError('Failed to retrieve page elements', 500);
  }
}

/**
 * Get a single element by ID
 *
 * Retrieves a specific element by its unique identifier. By default, returns
 * only non-deleted elements (paranoid mode). Can optionally include deleted
 * elements for restoration workflows.
 *
 * @async
 * @param {string} elementId - The element ID to fetch
 * @param {boolean} [includeDeleted=false] - Include soft-deleted elements
 * @returns {Promise<PageElement | null>} The element if found, null otherwise
 *
 * @example
 * const element = await getPageElementById(elementId);
 * if (!element) {
 *   console.log('Element not found');
 * }
 *
 * // Fetch including deleted
 * const deletedElement = await getPageElementById(elementId, true);
 */
export async function getPageElementById(
  elementId: string,
  includeDeleted: boolean = false
): Promise<PageElement | null> {
  const element = await PageElement.findByPk(elementId, {
    paranoid: !includeDeleted,
  });

  if (element) {
    logger.debug(`Retrieved element ${elementId}`);
  }

  return element;
}

/**
 * Update a page element with comprehensive validation
 *
 * Updates one or more fields of an element (PATCH semantics). Only provided
 * fields are updated. All updated values are validated before persisting.
 * Position, dimension, and rotation constraints are enforced.
 *
 * @async
 * @param {string} elementId - The element ID to update
 * @param {Partial<IPageElement>} updates - Partial element data to update
 * @returns {Promise<PageElement>} The updated element instance
 * @throws {AppError} If element not found or validation fails
 *
 * @example
 * const updated = await updatePageElement(elementId, {
 *   x: 200,
 *   y: 250,
 *   rotation: 45
 * });
 *
 * // Update only opacity in style
 * const updated = await updatePageElement(elementId, {
 *   style: { ...element.style, opacity: 0.5 }
 * });
 */
export async function updatePageElement(
  elementId: string,
  updates: Partial<IPageElementUpdate>
): Promise<PageElement> {
  try {
    const element = await PageElement.findByPk(elementId);
    if (!element) {
      throw new AppError('Element not found', 404);
    }

    // Validate updated position if provided
    if (updates.x !== undefined || updates.y !== undefined) {
      const x = updates.x ?? element.x;
      const y = updates.y ?? element.y;
      validatePosition(x, y);
    }

    // Validate updated dimensions if provided
    if (updates.width !== undefined || updates.height !== undefined) {
      const width = updates.width ?? element.width;
      const height = updates.height ?? element.height;
      validateDimensions(width, height);
    }

    // Validate updated rotation if provided
    if (updates.rotation !== undefined) {
      validateRotation(updates.rotation);
    }

    // Validate updated z-index if provided
    if (updates.zIndex !== undefined) {
      validateZIndex(updates.zIndex);
    }

    // Apply updates
    await element.update(updates);

    logger.debug(`Updated element ${elementId}: ${JSON.stringify(updates)}`);

    return element;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error(`Failed to update element ${elementId}`, error);
    throw new AppError('Failed to update page element', 500);
  }
}

/**
 * Soft-delete a page element
 *
 * Marks an element as deleted by setting the deletedAt timestamp without
 * removing it from the database. This enables undo functionality and maintains
 * referential integrity. The element becomes invisible in normal queries.
 *
 * @async
 * @param {string} elementId - The element ID to delete
 * @returns {Promise<void>}
 * @throws {AppError} If element not found or already deleted
 *
 * @example
 * await deletePageElement(elementId);
 * // Element is now soft-deleted but still in database
 */
export async function deletePageElement(elementId: string): Promise<void> {
  try {
    const element = await PageElement.findByPk(elementId);
    if (!element) {
      throw new AppError('Element not found', 404);
    }

    if (element.isDeleted()) {
      throw new AppError('Element is already deleted', 400);
    }

    await element.destroy(); // Triggers soft-delete via paranoid mode

    logger.debug(`Deleted element ${elementId}`);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error(`Failed to delete element ${elementId}`, error);
    throw new AppError('Failed to delete page element', 500);
  }
}

/**
 * Restore a soft-deleted page element
 *
 * Restores an element that was previously soft-deleted by clearing the
 * deletedAt timestamp. The element becomes visible again in normal queries
 * and can be edited or deleted again.
 *
 * @async
 * @param {string} elementId - The element ID to restore
 * @returns {Promise<PageElement>} The restored element instance
 * @throws {AppError} If element not found or not deleted
 *
 * @example
 * const restored = await restorePageElement(elementId);
 * // Element is now visible and editable again
 */
export async function restorePageElement(elementId: string): Promise<PageElement> {
  try {
    const element = await PageElement.findByPk(elementId, {
      paranoid: false, // Must include deleted records
    });

    if (!element) {
      throw new AppError('Element not found', 404);
    }

    if (!element.isDeleted()) {
      throw new AppError('Element is not deleted', 400);
    }

    await element.restore();

    logger.debug(`Restored element ${elementId}`);

    return element;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error(`Failed to restore element ${elementId}`, error);
    throw new AppError('Failed to restore page element', 500);
  }
}

/**
 * Duplicate a page element with position offset
 *
 * Creates a complete copy of an element with a position offset. The duplicate
 * is positioned 20mm to the right and 20mm below the original by default, and
 * assigned a z-index one level above the original to be immediately visible.
 *
 * This operation is wrapped in a transaction to ensure consistency if the
 * operation is interrupted.
 *
 * @async
 * @param {string} elementId - The element ID to duplicate
 * @param {object} [offset] - Optional position offset in millimeters
 * @param {number} [offset.x=20] - Horizontal offset from original position
 * @param {number} [offset.y=20] - Vertical offset from original position
 * @returns {Promise<PageElement>} The newly created duplicate element
 * @throws {AppError} If element not found, validation fails, or database error
 *
 * @example
 * // Duplicate with default offset (20mm right, 20mm down)
 * const duplicate = await duplicatePageElement(elementId);
 *
 * // Duplicate with custom offset
 * const duplicate = await duplicatePageElement(elementId, { x: 50, y: 30 });
 */
export async function duplicatePageElement(
  elementId: string,
  offset?: { x?: number; y?: number }
): Promise<PageElement> {
  const DEFAULT_OFFSET = 20; // millimeters
  const offsetX = offset?.x ?? DEFAULT_OFFSET;
  const offsetY = offset?.y ?? DEFAULT_OFFSET;

  const transaction = await sequelize.transaction();

  try {
    const original = await PageElement.findByPk(elementId, { transaction });
    if (!original) {
      await transaction.rollback();
      throw new AppError('Element not found', 404);
    }

    // Calculate new position with offset
    const newX = original.x + offsetX;
    const newY = original.y + offsetY;

    // Validate the new position
    validatePosition(newX, newY);

    // Calculate z-index for the duplicate (one level above original)
    const duplicateZIndex = Math.min(
      original.zIndex + 1,
      VALIDATION_CONSTRAINTS.Z_INDEX.MAX
    );

    // Create the duplicate
    const duplicate = await PageElement.create(
      {
        pageId: original.pageId,
        type: original.type,
        x: newX,
        y: newY,
        width: original.width,
        height: original.height,
        rotation: original.rotation,
        zIndex: duplicateZIndex,
        stickerLibraryId: original.stickerLibraryId,
        content: { ...original.content },
        style: { ...original.style },
        metadata: original.metadata ? { ...original.metadata } : null,
      },
      { transaction }
    );

    await transaction.commit();

    logger.debug(
      `Duplicated element ${elementId} to ${duplicate.id} with offset (${offsetX}mm, ${offsetY}mm)`
    );

    return duplicate;
  } catch (error) {
    await transaction.rollback();

    if (error instanceof AppError) {
      throw error;
    }

    logger.error(`Failed to duplicate element ${elementId}`, error);
    throw new AppError('Failed to duplicate page element', 500);
  }
}

/**
 * Update the z-index (stacking order) of a page element
 *
 * Changes the visual stacking order of an element on the canvas. The z-index
 * must be within the valid range (0-999). This operation validates the new
 * z-index before updating.
 *
 * @async
 * @param {string} elementId - The element ID to update
 * @param {number} newZIndex - The new z-index value
 * @returns {Promise<PageElement>} The updated element instance
 * @throws {AppError} If element not found or z-index is invalid
 *
 * @example
 * // Move element to front
 * await updateZIndex(elementId, 999);
 *
 * // Move element to back
 * await updateZIndex(elementId, 0);
 *
 * // Move element to middle
 * await updateZIndex(elementId, 500);
 */
export async function updateZIndex(
  elementId: string,
  newZIndex: number
): Promise<PageElement> {
  try {
    validateZIndex(newZIndex);

    const element = await PageElement.findByPk(elementId);
    if (!element) {
      throw new AppError('Element not found', 404);
    }

    await element.update({ zIndex: newZIndex });

    logger.debug(`Updated z-index for element ${elementId}: ${newZIndex}`);

    return element;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error(`Failed to update z-index for element ${elementId}`, error);
    throw new AppError('Failed to update element z-index', 500);
  }
}

/**
 * Export all service methods as a default object
 * Provides an alternative way to import all functions at once
 *
 * @example
 * import pageElementService from './pageElementService';
 * const element = await pageElementService.createPageElement(data);
 */
export default {
  createPageElement,
  getPageElements,
  getPageElementById,
  updatePageElement,
  deletePageElement,
  restorePageElement,
  duplicatePageElement,
  updateZIndex,
};
