/**
 * Page Service Layer - PLACEHOLDER FOR PHASE 1
 * Full implementation will follow design patterns from US01 services
 */

import { Page, Notebook } from '../models';

export async function getPagesByNotebook(
  notebookId: string,
  userId: string,
): Promise<Page[]> {
  const notebook = await Notebook.findByPk(notebookId);
  if (!notebook || notebook.userId !== userId) throw new Error('Not found');
  return Page.findAll({ where: { notebookId }, order: [['pageNumber', 'ASC']] });
}

export async function getPageById(pageId: string, userId: string): Promise<Page> {
  const page = await Page.findByPk(pageId);
  if (!page) throw new Error('Not found');
  const notebook = await Notebook.findByPk(page.notebookId);
  if (!notebook || notebook.userId !== userId) throw new Error('Not found');
  return page;
}

export async function createPage(
  notebookId: string,
  pageNumber: number,
  isCustomCover: boolean,
  userId: string,
): Promise<Page> {
  const notebook = await Notebook.findByPk(notebookId);
  if (!notebook || notebook.userId !== userId) throw new Error('Not found');
  return Page.create({ notebookId, pageNumber, isCustomCover });
}

export async function updatePage(
  pageId: string,
  updates: Partial<Page>,
  userId: string,
): Promise<Page> {
  const page = await Page.findByPk(pageId);
  if (!page) throw new Error('Not found');
  const notebook = await Notebook.findByPk(page.notebookId);
  if (!notebook || notebook.userId !== userId) throw new Error('Not found');
  await page.update(updates);
  return page;
}

export async function deletePage(pageId: string, userId: string): Promise<void> {
  const page = await Page.findByPk(pageId);
  if (!page) throw new Error('Not found');
  const notebook = await Notebook.findByPk(page.notebookId);
  if (!notebook || notebook.userId !== userId) throw new Error('Not found');
  await page.destroy();
}

export default {
  getPagesByNotebook,
  getPageById,
  createPage,
  updatePage,
  deletePage,
};
