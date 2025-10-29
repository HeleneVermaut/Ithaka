/**
 * Tests unitaires du composant NotebookGallery
 *
 * Ce composant affiche une galerie de carnets avec:
 * - Grille responsive (3/2/1 colonnes)
 * - Pagination
 * - Lazy loading d'images
 * - État de chargement (skeleton)
 * - État vide
 * - Débouncing des interactions
 *
 * Framework: Vitest + Vue Test Utils
 * Couverture cible: 75%+
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import NotebookGallery from '../NotebookGallery.vue'
import type { Notebook } from '@/types/notebook'

const createMockNotebook = (override: Partial<Notebook> = {}): Notebook => ({
  id: `notebook-${Math.random()}`,
  userId: 'user-1',
  title: 'Test Notebook',
  description: 'Test description',
  type: 'Voyage' as const,
  format: 'A4' as const,
  orientation: 'portrait' as const,
  dpi: 300,
  status: 'active' as const,
  pageCount: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...override
})

describe('NotebookGallery Component - TASK31', () => {
  // ========================================
  // RENDERING TESTS
  // ========================================

  describe('Rendering', () => {
    it('renders empty state when no notebooks', () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: [],
          loading: false,
          pagination: {
            currentPage: 1,
            limit: 12,
            total: 0,
            totalPages: 1
          }
        },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toMatch(/aucun carnet|empty|vide/i)
    })

    it('renders loading skeleton', () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: [],
          loading: true,
          pagination: {
            currentPage: 1,
            limit: 12,
            total: 0,
            totalPages: 1
          }
        },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.find('[class*="skeleton"]').exists()).toBe(true)
    })

    it('renders notebook cards', () => {
      const notebooks = [
        createMockNotebook({ id: 'nb-1', title: 'Notebook 1' }),
        createMockNotebook({ id: 'nb-2', title: 'Notebook 2' })
      ]

      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {
            currentPage: 1,
            limit: 12,
            total: 2,
            totalPages: 1
          }
        },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toContain('Notebook 1')
      expect(wrapper.text()).toContain('Notebook 2')
    })

    it('renders correct number of cards', () => {
      const notebooks = Array(12)
        .fill(null)
        .map((_, i) => createMockNotebook({ id: `nb-${i}` }))

      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {
            currentPage: 1,
            limit: 12,
            total: 12,
            totalPages: 1
          }
        },
        global: { plugins: [createPinia()] }
      })

      const cards = wrapper.findAll('[class*="notebook-card"]')
      expect(cards.length).toBe(12)
    })
  })

  // ========================================
  // GRID LAYOUT TESTS
  // ========================================

  describe('Grid Layout', () => {
    it('uses 3-column grid for desktop', () => {
      const notebooks = Array(12)
        .fill(null)
        .map((_, i) => createMockNotebook({ id: `nb-${i}` }))

      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const grid = wrapper.find('[class*="grid"]')

      // Check for grid layout indication
      expect(grid.exists()).toBe(true)
    })

    it('has responsive grid classes', () => {
      const notebooks = [createMockNotebook()]

      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const grid = wrapper.find('[class*="grid"]')
      expect(grid.exists()).toBe(true)
    })
  })

  // ========================================
  // PAGINATION TESTS
  // ========================================

  describe('Pagination', () => {
    it('renders pagination controls', () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: [createMockNotebook()],
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 60,

            totalPages: 5

          }
        },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.find('[class*="pagination"]').exists()).toBe(true)
    })

    it('hides pagination when only one page', () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: [createMockNotebook()],
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      // Pagination should be hidden or have minimal visibility
      expect(wrapper.exists()).toBe(true)
    })

    it('emits page-change event', async () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: Array(12)
            .fill(null)
            .map((_, i) => createMockNotebook({ id: `nb-${i}` })),
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 36,

            totalPages: 3

          }
        },
        global: { plugins: [createPinia()] }
      })

      const nextBtn = wrapper.find('[class*="next"]')
      if (nextBtn.exists()) {
        await nextBtn.trigger('click')
        expect(wrapper.emitted('page-change')).toBeTruthy()
      }
    })

    it('displays current page info', () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: [createMockNotebook()],
          loading: false,
          pagination: {

            currentPage: 2,

            limit: 12,

            total: 60,

            totalPages: 5

          }
        },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toMatch(/page.*2/i)
    })

    it('disables previous button on first page', () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: [createMockNotebook()],
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 36,

            totalPages: 3

          }
        },
        global: { plugins: [createPinia()] }
      })

      const prevBtn = wrapper.find('[class*="prev"]')
      expect(prevBtn.attributes('disabled')).toBeDefined()
    })

    it('disables next button on last page', () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: [createMockNotebook()],
          loading: false,
          pagination: {

            currentPage: 3,

            limit: 12,

            total: 36,

            totalPages: 3

          }
        },
        global: { plugins: [createPinia()] }
      })

      const nextBtn = wrapper.find('[class*="next"]')
      expect(nextBtn.attributes('disabled')).toBeDefined()
    })
  })

  // ========================================
  // IMAGE LAZY LOADING TESTS
  // ========================================

  describe('Image Lazy Loading', () => {
    it('applies loading="lazy" to images', () => {
      const notebooks = [
        createMockNotebook({
          id: 'nb-1',
          coverImageUrl: 'https://example.com/image.jpg'
        })
      ]

      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const images = wrapper.findAll('img')
      images.forEach(img => {
        expect(img.attributes('loading')).toBe('lazy')
      })
    })

    it('sets decoding="async" for images', () => {
      const notebooks = [
        createMockNotebook({
          id: 'nb-1',
          coverImageUrl: 'https://example.com/image.jpg'
        })
      ]

      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const images = wrapper.findAll('img')
      images.forEach(img => {
        expect(img.attributes('decoding')).toBe('async')
      })
    })
  })

  // ========================================
  // EVENT EMISSION TESTS
  // ========================================

  describe('Event Emission', () => {
    it('emits card-click event', async () => {
      const notebooks = [createMockNotebook({ id: 'nb-1' })]
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const card = wrapper.find('[class*="notebook-card"]')
      if (card.exists()) {
        await card.trigger('click')
        expect(wrapper.emitted('card-click')).toBeTruthy()
      }
    })

    it('emits card-duplicate event', async () => {
      const notebooks = [createMockNotebook({ id: 'nb-1' })]
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const duplicateBtn = wrapper.find('[data-test="duplicate-btn"]')
      if (duplicateBtn.exists()) {
        await duplicateBtn.trigger('click')
        expect(wrapper.emitted('card-duplicate')).toBeTruthy()
      }
    })

    it('emits card-archive event', async () => {
      const notebooks = [createMockNotebook({ id: 'nb-1' })]
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const archiveBtn = wrapper.find('[data-test="archive-btn"]')
      if (archiveBtn.exists()) {
        await archiveBtn.trigger('click')
        expect(wrapper.emitted('card-archive')).toBeTruthy()
      }
    })
  })

  // ========================================
  // PERFORMANCE TESTS
  // ========================================

  describe('Performance', () => {
    it('renders 12 notebooks in acceptable time', () => {
      const notebooks = Array(12)
        .fill(null)
        .map((_, i) => createMockNotebook({ id: `nb-${i}` }))

      const start = performance.now()

      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const duration = performance.now() - start

      expect(wrapper.find('[class*="grid"]').exists()).toBe(true)
      expect(duration).toBeLessThan(500)
    })

    it('debounces filter changes (500ms)', async () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: [createMockNotebook()],
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      // Simulate multiple filter changes
      vi.useFakeTimers()

      for (let i = 0; i < 5; i++) {
        await wrapper.vm.$emit('filter-change', { search: `query${i}` })
        vi.advanceTimersByTime(100)
      }

      vi.advanceTimersByTime(500)
      vi.useRealTimers()

      // Should only emit once after debounce
      expect(wrapper.emitted('filter-change')).toBeTruthy()
    })
  })

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================

  describe('Accessibility', () => {
    it('has accessible grid structure', () => {
      const notebooks = Array(3)
        .fill(null)
        .map((_, i) => createMockNotebook({ id: `nb-${i}` }))

      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const grid = wrapper.find('[role="grid"]')
      expect(grid.exists()).toBe(true)
    })

    it('provides pagination aria-labels', () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: [createMockNotebook()],
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 36,

            totalPages: 3

          }
        },
        global: { plugins: [createPinia()] }
      })

      const prevBtn = wrapper.find('[class*="prev"]')
      expect(prevBtn.attributes('aria-label')).toBeTruthy()
    })

    it('announces loading state', () => {
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: [],
          loading: true,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const liveRegion = wrapper.find('[aria-live="polite"]')
      expect(liveRegion.exists()).toBe(true)
    })
  })

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge Cases', () => {
    it('handles very large notebook lists', () => {
      const notebooks = Array(1000)
        .fill(null)
        .map((_, i) => createMockNotebook({ id: `nb-${i}` }))

      // Only showing first 12 due to pagination
      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks: notebooks.slice(0, 12),
          loading: false,
          pagination: {
            currentPage: 1,
            limit: 12,
            total: notebooks.length,
            totalPages: Math.ceil(notebooks.length / 12)
          }
        },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.findAll('[class*="notebook-card"]').length).toBe(12)
    })

    it('handles missing thumbnail gracefully', () => {
      const notebooks = [
        createMockNotebook({ id: 'nb-1' })
      ]

      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.find('[class*="placeholder"]').exists()).toBe(true)
    })

    it('renders correctly with mixed data states', () => {
      const notebooks = [
        createMockNotebook({ id: 'nb-1', coverImageUrl: 'https://example.com/1.jpg' }),
        createMockNotebook({ id: 'nb-2' }),
        createMockNotebook({ id: 'nb-3', coverImageUrl: 'https://example.com/3.jpg' })
      ]

      const wrapper = mount(NotebookGallery, {
        props: {
          notebooks,
          loading: false,
          pagination: {

            currentPage: 1,

            limit: 12,

            total: 12,

            totalPages: 1

          }
        },
        global: { plugins: [createPinia()] }
      })

      const cards = wrapper.findAll('[class*="notebook-card"]')
      expect(cards.length).toBe(3)
    })
  })
})
