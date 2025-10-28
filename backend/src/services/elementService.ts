/**
 * PageElement Service Layer - PLACEHOLDER FOR PHASE 1
 * Full implementation will follow design patterns from US01 services
 */

import { v4 as uuid } from 'uuid';
import { PageElement, Page, Notebook } from '../models';

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

export async function createBatchElements(
  pageId: string,
  elementsArray: Partial<PageElement>[],
  userId: string,
): Promise<{ created: number; updated: number }> {
  const page = await Page.findByPk(pageId);
  if (!page) throw new Error('Not found');
  const notebook = await Notebook.findByPk(page.notebookId);
  if (!notebook || notebook.userId !== userId) throw new Error('Not found');

  let created = 0;
  let updated = 0;

  for (const elem of elementsArray) {
    if (elem.id) {
      await PageElement.update(elem, { where: { id: elem.id } });
      updated++;
    } else {
      await PageElement.create({
        id: uuid(),
        pageId,
        ...elem,
      } as any);
      created++;
    }
  }

  return { created, updated };
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
