/**
 * PageElement Service Layer - Delegation to PageElementService
 *
 * This module wraps the new pageElementService to maintain backward compatibility
 * with existing controllers while providing a cleaner internal interface.
 *
 * All functions validate user authorization by verifying notebook ownership before
 * delegating to the core pageElementService.
 *
 * @module services/elementService
 */

import { PageElement, Page, Notebook } from '../models';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import * as pageElementService from './pageElementService';
import { IPageElementInput, IPageElementUpdate } from '../types/models';

/**
 * Verify user authorization for a page through notebook ownership
 *
 * @async
 * @param {string} pageId - The page ID to check authorization for
 * @param {string} userId - The user ID to verify ownership
 * @throws {AppError} If page or notebook not found, or user is not the owner
 */
async function verifyPageOwnership(pageId: string, userId: string): Promise<void> {
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
 * Get all elements for a specific page with user authorization
 *
 * @async
 * @param {string} pageId - The page ID to fetch elements for
 * @param {string} userId - The user ID for authorization
 * @returns {Promise<PageElement[]>} Array of elements
 * @throws {AppError} If not authorized
 */
export async function getElementsByPage(pageId: string, userId: string): Promise<PageElement[]> {
  await verifyPageOwnership(pageId, userId);
  return pageElementService.getPageElements(pageId);
}

/**
 * Get elements by their IDs (without authorization check - internal use)
 *
 * @async
 * @param {string[]} elementIds - Array of element IDs
 * @param {string} _userId - User ID (not used, for interface compatibility)
 * @returns {Promise<Record<string, PageElement>>} Map of elements by ID
 */
export async function getElementsByIds(
  elementIds: string[],
  _userId: string
): Promise<Record<string, PageElement>> {
  const elements = await PageElement.findAll({ where: { id: elementIds } });
  const result: Record<string, PageElement> = {};
  for (const element of elements) {
    result[element.id] = element;
  }
  return result;
}

/**
 * Create a new page element with user authorization
 *
 * @async
 * @param {string} pageId - The page ID
 * @param {Partial<IPageElementInput>} elementData - Element data
 * @param {string} userId - The user ID for authorization
 * @returns {Promise<PageElement>} The created element
 * @throws {AppError} If not authorized or validation fails
 */
export async function createElement(
  pageId: string,
  elementData: Partial<IPageElementInput>,
  userId: string
): Promise<PageElement> {
  await verifyPageOwnership(pageId, userId);
  return pageElementService.createPageElement(
    {
      pageId,
      ...elementData,
    } as IPageElementInput,
    userId
  );
}

/**
 * Create or update batch of elements within a database transaction
 *
 * This function processes an array of elements:
 * - Elements without 'id' are created as new records
 * - Elements with 'id' are updated in place
 *
 * All operations happen within a single transaction:
 * - If any operation fails, the entire batch is rolled back
 * - This ensures data consistency even if the process is interrupted
 *
 * @async
 * @param {string} pageId - The page ID where elements belong
 * @param {Partial<PageElement>[]} elementsArray - Array of element data to create/update
 * @param {string} userId - User ID for authorization check
 * @returns {Promise<{created: number, updated: number, elements: PageElement[]}>} Operation results
 * @throws {AppError} If not authorized or transaction fails
 */
export async function createBatchElements(
  pageId: string,
  elementsArray: Partial<PageElement>[],
  userId: string
): Promise<{ created: number; updated: number; elements: PageElement[] }> {
  // Verify authorization
  await verifyPageOwnership(pageId, userId);

  // Start transaction
  const transaction = await sequelize.transaction();

  try {
    const results = {
      created: 0,
      updated: 0,
      elements: [] as PageElement[],
    };

    // Process each element within the transaction
    for (const elementData of elementsArray) {
      if (elementData.id) {
        // UPDATE existing element
        const [affectedCount] = await PageElement.update(elementData, {
          where: { id: elementData.id },
          transaction,
        });

        if (affectedCount > 0) {
          results.updated++;
          // Fetch updated element to include in response
          const updated = await PageElement.findByPk(elementData.id, { transaction });
          if (updated) {
            results.elements.push(updated);
          }
        }
      } else {
        // CREATE new element
        const newElement = await PageElement.create(
          {
            pageId,
            ...elementData,
          } as any,
          { transaction }
        );

        results.created++;
        results.elements.push(newElement);
      }
    }

    // Commit transaction if all operations succeed
    await transaction.commit();
    logger.debug(
      `Batch elements saved successfully: created=${results.created}, updated=${results.updated}`
    );

    return results;
  } catch (error) {
    // Rollback transaction on any error
    await transaction.rollback();
    logger.error(`Batch elements save failed, transaction rolled back: ${error}`, error);
    throw error;
  }
}

/**
 * Update a page element with user authorization
 *
 * @async
 * @param {string} elementId - The element ID to update
 * @param {Partial<IPageElementUpdate>} updates - Fields to update
 * @param {string} userId - The user ID for authorization (not used - assumes element exists)
 * @returns {Promise<PageElement>} The updated element
 * @throws {AppError} If not found or validation fails
 */
export async function updateElement(
  elementId: string,
  updates: Partial<IPageElementUpdate>,
  _userId: string
): Promise<PageElement> {
  return pageElementService.updatePageElement(elementId, updates);
}

/**
 * Delete (soft-delete) a page element with user authorization
 *
 * @async
 * @param {string} elementId - The element ID to delete
 * @param {string} userId - The user ID for authorization (not used)
 * @returns {Promise<void>}
 * @throws {AppError} If not found
 */
export async function deleteElement(elementId: string, _userId: string): Promise<void> {
  return pageElementService.deletePageElement(elementId);
}

/**
 * Restore a soft-deleted element with user authorization
 *
 * @async
 * @param {string} elementId - The element ID to restore
 * @param {string} userId - The user ID for authorization (not used)
 * @returns {Promise<PageElement>} The restored element
 * @throws {AppError} If not found or not deleted
 */
export async function restoreElement(
  elementId: string,
  _userId: string
): Promise<PageElement> {
  return pageElementService.restorePageElement(elementId);
}

/**
 * Duplicate a page element with position offset
 *
 * @async
 * @param {string} elementId - The element ID to duplicate
 * @param {string} userId - The user ID for authorization (not used)
 * @param {object} [offset] - Optional position offset
 * @returns {Promise<PageElement>} The duplicated element
 * @throws {AppError} If not found or validation fails
 */
export async function duplicateElement(
  elementId: string,
  _userId: string,
  offset?: { x?: number; y?: number }
): Promise<PageElement> {
  return pageElementService.duplicatePageElement(elementId, offset);
}

/**
 * Update z-index for multiple elements
 *
 * @async
 * @param {string[]} elementIds - Array of element IDs
 * @param {number[]} newOrder - Array of new z-index values (same length as elementIds)
 * @param {string} _userId - User ID (not used)
 * @returns {Promise<void>}
 */
export async function updateZIndex(
  elementIds: string[],
  newOrder: number[],
  _userId: string
): Promise<void> {
  for (let i = 0; i < elementIds.length && i < newOrder.length; i++) {
    const elementId = elementIds[i];
    const zIndex = newOrder[i];
    if (elementId && zIndex !== undefined) {
      await pageElementService.updateZIndex(elementId, zIndex);
    }
  }
}

export default {
  getElementsByPage,
  getElementsByIds,
  createElement,
  createBatchElements,
  updateElement,
  deleteElement,
  updateZIndex,
  restoreElement,
  duplicateElement,
};
