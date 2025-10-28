/**
 * PageElement Service Layer - PLACEHOLDER FOR PHASE 1
 * Full implementation will follow design patterns from US01 services
 */

import { v4 as uuid } from 'uuid';
import { PageElement, Page, Notebook } from '../models';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

export async function getElementsByPage(pageId: string, userId: string): Promise<PageElement[]> {
  const page = await Page.findByPk(pageId);
  if (!page) throw new Error('Not found');
  const notebook = await Notebook.findByPk(page.notebookId);
  if (!notebook || notebook.userId !== userId) throw new Error('Not found');
  return PageElement.findAll({ where: { pageId }, order: [['zIndex', 'ASC']] });
}

export async function getElementsByIds(
  elementIds: string[],
  _userId: string,
): Promise<Record<string, PageElement>> {
  const elements = await PageElement.findAll({ where: { id: elementIds } });
  const result: Record<string, PageElement> = {};
  for (const element of elements) {
    result[element.id] = element;
  }
  return result;
}

export async function createElement(
  pageId: string,
  elementData: Partial<PageElement>,
  userId: string,
): Promise<PageElement> {
  const page = await Page.findByPk(pageId);
  if (!page) throw new Error('Not found');
  const notebook = await Notebook.findByPk(page.notebookId);
  if (!notebook || notebook.userId !== userId) throw new Error('Not found');
  return PageElement.create({
    id: uuid(),
    pageId,
    ...elementData,
  } as any);
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
 * @param pageId - The page ID where elements belong
 * @param elementsArray - Array of element data to create/update
 * @param userId - User ID for authorization check
 * @returns Object with counts: { created, updated, elements }
 * @throws Error if page not found or user unauthorized
 */
export async function createBatchElements(
  pageId: string,
  elementsArray: Partial<PageElement>[],
  userId: string,
): Promise<{ created: number; updated: number; elements: PageElement[] }> {
  // Verify authorization
  const page = await Page.findByPk(pageId);
  if (!page) throw new Error('Not found');
  const notebook = await Notebook.findByPk(page.notebookId);
  if (!notebook || notebook.userId !== userId) throw new Error('Not found');

  // Start transaction
  const transaction = await sequelize.transaction();

  try {
    const results = {
      created: 0,
      updated: 0,
      elements: [] as PageElement[]
    };

    // Process each element within the transaction
    for (const elementData of elementsArray) {
      if (elementData.id) {
        // UPDATE existing element
        const [affectedCount] = await PageElement.update(elementData, {
          where: { id: elementData.id },
          transaction
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
        const newElement = await PageElement.create({
          id: uuid(),
          pageId,
          ...elementData,
        } as any, { transaction });

        results.created++;
        results.elements.push(newElement);
      }
    }

    // Commit transaction if all operations succeed
    await transaction.commit();
    logger.debug(`Batch elements saved successfully: created=${results.created}, updated=${results.updated}`);

    return results;
  } catch (error) {
    // Rollback transaction on any error
    await transaction.rollback();
    logger.error(`Batch elements save failed, transaction rolled back: ${error}`, error);
    throw error;
  }
}

export async function updateElement(
  elementId: string,
  updates: Partial<PageElement>,
  _userId: string,
): Promise<PageElement> {
  const element = await PageElement.findByPk(elementId);
  if (!element) throw new Error('Not found');
  await element.update(updates);
  return element;
}

export async function deleteElement(elementId: string, _userId: string): Promise<void> {
  const element = await PageElement.findByPk(elementId);
  if (!element) throw new Error('Not found');
  await element.destroy();
}

export async function updateZIndex(
  elementIds: string[],
  newOrder: number[],
  _userId: string,
): Promise<void> {
  for (let i = 0; i < elementIds.length; i++) {
    await PageElement.update(
      { zIndex: newOrder[i] },
      { where: { id: elementIds[i] } },
    );
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
};
