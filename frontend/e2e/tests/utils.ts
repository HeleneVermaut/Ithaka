import { Page, expect } from '@playwright/test'

/**
 * E2E Test Utilities
 *
 * Reusable helper functions for common E2E test operations
 * to reduce code duplication and improve test maintainability.
 */

/**
 * Navigate to notebooks page and wait for page load
 */
export async function navigateToNotebooks(page: Page): Promise<void> {
  await page.goto('/notebooks')
  await expect(page.locator('text=Mes Carnets')).toBeVisible({ timeout: 10000 })
  // Wait for gallery to load
  await page.waitForLoadState('networkidle')
}

/**
 * Click the "Nouveau carnet" button to open create modal
 */
export async function openCreateNotebookModal(page: Page): Promise<void> {
  const createButton = page.locator('button:has-text("Nouveau carnet")')
  await expect(createButton).toBeVisible()
  await createButton.click()

  // Wait for modal to appear
  await expect(page.locator('text=Créer un nouveau carnet')).toBeVisible({ timeout: 5000 })
}

/**
 * Create a notebook with provided details
 *
 * @param page - Playwright page object
 * @param title - Notebook title
 * @param type - Notebook type (Voyage, Daily, Reportage)
 * @param format - Paper format (A4, A5, Letter)
 * @param orientation - Page orientation (portrait, landscape)
 * @param description - Optional notebook description
 */
export async function createNotebook(
  page: Page,
  title: string = 'Test Carnet',
  type: 'Voyage' | 'Daily' | 'Reportage' = 'Voyage',
  format: 'A4' | 'A5' | 'Letter' = 'A4',
  orientation: 'portrait' | 'landscape' = 'portrait',
  description: string = ''
): Promise<void> {
  await openCreateNotebookModal(page)

  // Fill in title
  await page.fill('input[name="title"]', title)

  // Select type
  const typeButton = page.locator(`button:has-text("${type}")`)
  await typeButton.click()

  // Select format
  const formatButton = page.locator(`button:has-text("${format}")`)
  await formatButton.click()

  // Select orientation
  const orientationButton = page.locator(`button:has-text("${orientation === 'portrait' ? 'Portrait' : 'Paysage'}")`)
  await orientationButton.click()

  // Fill description if provided
  if (description) {
    await page.fill('textarea[name="description"]', description)
  }

  // Submit form
  const submitButton = page.locator('button:has-text("Créer")')
  await submitButton.click()

  // Wait for success toast notification
  await expect(page.locator('text=Carnet créé avec succès')).toBeVisible({ timeout: 10000 })

  // Wait for modal to close and notebook to appear in gallery
  await page.waitForSelector(`text=${title}`, { timeout: 10000 })
}

/**
 * Find and click a notebook card by title
 */
export async function clickNotebookCard(page: Page, title: string): Promise<void> {
  const card = page.locator(`text=${title}`).first()
  await expect(card).toBeVisible()
  await card.click()
}

/**
 * Right-click (context menu) on a notebook card to get options
 */
export async function openNotebookContextMenu(page: Page, title: string): Promise<void> {
  const card = page.locator(`text=${title}`).first()
  await card.click({ button: 'right' })

  // Wait for context menu to appear
  await expect(page.locator('.n-dropdown')).toBeVisible({ timeout: 5000 })
}

/**
 * Edit a notebook's title via context menu
 */
export async function editNotebookTitle(page: Page, currentTitle: string, newTitle: string): Promise<void> {
  await openNotebookContextMenu(page, currentTitle)
  await page.click('text=Éditer')

  // Wait for edit modal
  await expect(page.locator('text=Éditer le carnet')).toBeVisible({ timeout: 5000 })

  // Clear and fill new title
  const titleInput = page.locator('input[name="title"]')
  await titleInput.clear()
  await titleInput.fill(newTitle)

  // Submit
  await page.click('button:has-text("Sauvegarder")')

  // Wait for success notification
  await expect(page.locator('text=Carnet mis à jour')).toBeVisible({ timeout: 10000 })
}

/**
 * Archive a notebook via context menu
 */
export async function archiveNotebook(page: Page, title: string): Promise<void> {
  await openNotebookContextMenu(page, title)
  await page.click('text=Archiver')

  // Confirmation modal appears
  await expect(page.locator('text=Êtes-vous sûr')).toBeVisible({ timeout: 5000 })
  await page.click('button:has-text("Confirmer")')

  // Wait for success notification
  await expect(page.locator('text=Carnet archivé')).toBeVisible({ timeout: 10000 })
}

/**
 * Restore an archived notebook
 */
export async function restoreArchivedNotebook(page: Page, title: string): Promise<void> {
  // Switch to archived tab
  await page.click('text=Carnets archivés')
  await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 10000 })

  // Find and click restore button
  const card = page.locator(`text=${title}`).first()
  const restoreButton = card.locator('button:has-text("Restaurer")')
  await restoreButton.click()

  // Wait for success notification
  await expect(page.locator('text=Carnet restauré')).toBeVisible({ timeout: 10000 })
}

/**
 * Permanently delete an archived notebook
 */
export async function deleteArchivedNotebook(page: Page, title: string): Promise<void> {
  // Switch to archived tab
  await page.click('text=Carnets archivés')
  await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 10000 })

  // Find and click delete button
  const card = page.locator(`text=${title}`).first()
  const deleteButton = card.locator('button:has-text("Supprimer")')
  await deleteButton.click()

  // Confirmation modal
  await expect(page.locator('text=supprimer définitivement')).toBeVisible({ timeout: 5000 })
  await page.click('button:has-text("Confirmer")')

  // Wait for success notification
  await expect(page.locator('text=Carnet supprimé')).toBeVisible({ timeout: 10000 })
}

/**
 * Duplicate a notebook
 */
export async function duplicateNotebook(page: Page, title: string): Promise<void> {
  await openNotebookContextMenu(page, title)
  await page.click('text=Dupliquer')

  // Wait for success notification
  await expect(page.locator('text=Carnet dupliqué')).toBeVisible({ timeout: 10000 })

  // Verify duplicate appears in gallery
  const expectedCopyTitle = `${title} (copie)`
  await expect(page.locator(`text=${expectedCopyTitle}`)).toBeVisible({ timeout: 10000 })
}

/**
 * Get the count of notebooks in the gallery
 */
export async function getNotebookCount(page: Page): Promise<number> {
  const cards = await page.locator('.notebook-card').count()
  return cards
}

/**
 * Apply search filter
 */
export async function searchNotebooks(page: Page, searchTerm: string): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Rechercher"]')
  await searchInput.fill(searchTerm)
  await page.waitForLoadState('networkidle')
}

/**
 * Filter by notebook type
 */
export async function filterByType(page: Page, type: 'Voyage' | 'Daily' | 'Reportage'): Promise<void> {
  const checkbox = page.locator(`label:has-text("${type}") input`)
  await checkbox.click()
  await page.waitForLoadState('networkidle')
}

/**
 * Clear all filters
 */
export async function clearFilters(page: Page): Promise<void> {
  const clearButton = page.locator('button:has-text("Réinitialiser")')
  if (await clearButton.isVisible()) {
    await clearButton.click()
    await page.waitForLoadState('networkidle')
  }
}

/**
 * Go to next page in pagination
 */
export async function goToNextPage(page: Page): Promise<void> {
  const nextButton = page.locator('button:has-text("Suivant")')
  if (await nextButton.isEnabled()) {
    await nextButton.click()
    await page.waitForLoadState('networkidle')
  }
}

/**
 * Go to specific page number
 */
export async function goToPage(page: Page, pageNumber: number): Promise<void> {
  const pageButtons = page.locator('[data-testid="pagination-button"]')
  await pageButtons.nth(pageNumber - 1).click()
  await page.waitForLoadState('networkidle')
}

/**
 * Change items per page
 */
export async function setItemsPerPage(page: Page, count: number): Promise<void> {
  const select = page.locator('select[name="itemsPerPage"]')
  await select.selectOption(count.toString())
  await page.waitForLoadState('networkidle')
}

/**
 * Get toast notification text
 */
export async function getToastMessage(page: Page, timeout: number = 5000): Promise<string> {
  const toast = page.locator('.n-message')
  await expect(toast).toBeVisible({ timeout })
  return await toast.textContent() || ''
}

/**
 * Wait for and dismiss toast notification
 */
export async function dismissToast(page: Page): Promise<void> {
  const toast = page.locator('.n-message')
  await expect(toast).toBeVisible({ timeout: 5000 })
  await toast.waitFor({ state: 'hidden', timeout: 5000 })
}

/**
 * Check if element is keyboard focusable
 */
export async function isKeyboardFocusable(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel) as HTMLElement
    if (!element) return false

    const tabindex = element.getAttribute('tabindex')
    const isFormElement = ['INPUT', 'BUTTON', 'A', 'TEXTAREA', 'SELECT'].includes(element.tagName)
    const isNotDisabled = !element.hasAttribute('disabled')

    return isFormElement && isNotDisabled && (tabindex ? parseInt(tabindex) >= 0 : true)
  }, selector)
}

/**
 * Press Tab key and get focused element
 */
export async function pressTabAndGetFocus(page: Page): Promise<string> {
  await page.keyboard.press('Tab')
  return await page.evaluate(() => {
    const focused = document.activeElement as HTMLElement
    return focused ? focused.tagName + (focused.id ? `#${focused.id}` : '') : 'none'
  })
}

/**
 * Clean up test data - delete all test notebooks
 */
export async function cleanupNotebooks(page: Page): Promise<void> {
  await navigateToNotebooks(page)

  // Archive all active notebooks
  let cardCount = await getNotebookCount(page)
  while (cardCount > 0) {
    const firstCard = page.locator('.notebook-card').first()
    const title = await firstCard.locator('.notebook-title').textContent()

    if (title) {
      try {
        await archiveNotebook(page, title)
      } catch {
        // Card might have been removed, continue
      }
    }

    // Refresh count
    await page.reload()
    cardCount = await getNotebookCount(page)
  }

  // Switch to archived and delete all
  await page.click('text=Carnets archivés')
  await page.waitForLoadState('networkidle')

  const archivedCards = page.locator('.archived-card')
  let archivedCount = await archivedCards.count()

  while (archivedCount > 0) {
    const deleteBtn = page.locator('button:has-text("Supprimer")').first()
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click()

      // Confirm deletion
      const confirmBtn = page.locator('button:has-text("Confirmer")')
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await page.waitForLoadState('networkidle')
      }
    }

    archivedCount = await archivedCards.count()
  }
}
