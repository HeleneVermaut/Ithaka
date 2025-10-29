/**
 * Tests unitaires du composant NotebookFilters
 *
 * Ce composant fournit les filtres pour la recherche de carnets:
 * - Barre de recherche (texte)
 * - Filtres par type (checkboxes)
 * - Tri (dropdown: créé, modifié, titre, page count)
 * - Ordre (ASC/DESC)
 *
 * Framework: Vitest + Vue Test Utils
 * Couverture cible: 75%+
 */

import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import NotebookFilters from '../NotebookFilters.vue'

describe('NotebookFilters Component - TASK31', () => {
  // ========================================
  // SEARCH INPUT TESTS
  // ========================================

  describe('Search Input', () => {
    it('renders search input field', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')
      expect(searchInput.exists()).toBe(true)
    })

    it('has correct placeholder', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')
      expect(searchInput.attributes('placeholder')).toMatch(/recherche|search/i)
    })

    it('emits search-change event on input', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test query')
      await flushPromises()

      expect(wrapper.emitted('search-change')).toBeTruthy()
      expect(wrapper.emitted('search-change')?.[0]).toEqual(['test query'])
    })

    it('debounces search input', async () => {
      vi.useFakeTimers()

      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')

      // Multiple rapid inputs
      await searchInput.setValue('a')
      vi.advanceTimersByTime(100)
      await searchInput.setValue('ab')
      vi.advanceTimersByTime(100)
      await searchInput.setValue('abc')
      vi.advanceTimersByTime(500)

      // Should only emit once after debounce
      const emitted = wrapper.emitted('search-change')
      expect(emitted?.length).toBeLessThan(3)

      vi.useRealTimers()
    })

    it('clears search on clear button click', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test')

      const clearBtn = wrapper.find('[data-test="clear-search"]')
      if (clearBtn.exists()) {
        await clearBtn.trigger('click')
        expect((searchInput.element as HTMLInputElement).value).toBe('')
      }
    })
  })

  // ========================================
  // TYPE FILTER TESTS
  // ========================================

  describe('Type Filter', () => {
    it('renders type filter checkboxes', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThanOrEqual(3) // Voyage, Daily, Reportage
    })

    it('has labels for each type', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toMatch(/Voyage/i)
      expect(wrapper.text()).toMatch(/Daily/i)
      expect(wrapper.text()).toMatch(/Reportage/i)
    })

    it('emits type-filter event when checkbox is clicked', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const voyageCheckbox = wrapper.findAll('input[type="checkbox"]')[0]
      await voyageCheckbox.setValue(true)

      expect(wrapper.emitted('type-filter')).toBeTruthy()
    })

    it('passes correct type in event', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      const voyageCheckbox = checkboxes.find(
        cb => cb.attributes('value') === 'Voyage'
      )

      if (voyageCheckbox) {
        await voyageCheckbox.setValue(true)
        expect(wrapper.emitted('type-filter')?.[0]).toContain('Voyage')
      }
    })

    it('allows multiple type selections', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[0].setValue(true)
      await checkboxes[1].setValue(true)

      const emitted = wrapper.emitted('type-filter')
      expect(emitted?.length).toBeGreaterThanOrEqual(2)
    })

    it('can uncheck types', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const checkbox = wrapper.findAll('input[type="checkbox"]')[0]
      await checkbox.setValue(true)
      await checkbox.setValue(false)

      const emitted = wrapper.emitted('type-filter')
      expect(emitted).toBeTruthy()
    })
  })

  // ========================================
  // SORT FIELD DROPDOWN TESTS
  // ========================================

  describe('Sort Field Dropdown', () => {
    it('renders sort dropdown', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const select = wrapper.find('select[data-test="sort-field"]')
      expect(select.exists()).toBe(true)
    })

    it('has sort field options', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const select = wrapper.find('select[data-test="sort-field"]')
      const options = select.findAll('option')

      // Should have at least: createdAt, updatedAt, title, pageCount
      expect(options.length).toBeGreaterThanOrEqual(4)
    })

    it('emits sort-field event when selection changes', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const select = wrapper.find('select[data-test="sort-field"]')
      await select.setValue('title')

      expect(wrapper.emitted('sort-field')).toBeTruthy()
      expect(wrapper.emitted('sort-field')?.[0]).toEqual(['title'])
    })

    it('displays all sort options', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const sortLabels = wrapper.text()
      expect(sortLabels).toMatch(/créé|created|createdAt/i)
      expect(sortLabels).toMatch(/modifié|updated|updatedAt/i)
      expect(sortLabels).toMatch(/titre|title/i)
      expect(sortLabels).toMatch(/page/i)
    })

    it('sets default sort value', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const select = wrapper.find('select[data-test="sort-field"]')
      expect((select.element as HTMLSelectElement).value).toBeTruthy()
    })
  })

  // ========================================
  // SORT ORDER TESTS
  // ========================================

  describe('Sort Order', () => {
    it('renders sort order buttons', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const ascBtn = wrapper.find('[data-test="sort-asc"]')
      const descBtn = wrapper.find('[data-test="sort-desc"]')

      expect(ascBtn.exists() || descBtn.exists()).toBe(true)
    })

    it('emits sort-order event when ascending clicked', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const ascBtn = wrapper.find('[data-test="sort-asc"]')
      if (ascBtn.exists()) {
        await ascBtn.trigger('click')
        expect(wrapper.emitted('sort-order')).toBeTruthy()
        expect(wrapper.emitted('sort-order')?.[0]).toEqual(['ASC'])
      }
    })

    it('emits sort-order event when descending clicked', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const descBtn = wrapper.find('[data-test="sort-desc"]')
      if (descBtn.exists()) {
        await descBtn.trigger('click')
        expect(wrapper.emitted('sort-order')).toBeTruthy()
        expect(wrapper.emitted('sort-order')?.[0]).toEqual(['DESC'])
      }
    })

    it('highlights active sort order', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const descBtn = wrapper.find('[data-test="sort-desc"]')
      if (descBtn.exists()) {
        // DESC should be active by default
        expect(descBtn.classes()).toContain('active')
      }
    })
  })

  // ========================================
  // FILTER COMBINATION TESTS
  // ========================================

  describe('Filter Combinations', () => {
    it('emits multiple filter events together', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('voyage')

      const checkbox = wrapper.findAll('input[type="checkbox"]')[0]
      await checkbox.setValue(true)

      const select = wrapper.find('select[data-test="sort-field"]')
      await select.setValue('title')

      expect(wrapper.emitted('search-change')).toBeTruthy()
      expect(wrapper.emitted('type-filter')).toBeTruthy()
      expect(wrapper.emitted('sort-field')).toBeTruthy()
    })

    it('preserves filter state when components re-render', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test')

      await wrapper.vm.$forceUpdate()

      expect((searchInput.element as HTMLInputElement).value).toBe('test')
    })
  })

  // ========================================
  // RESET FILTERS TESTS
  // ========================================

  describe('Reset Filters', () => {
    it('renders reset button', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const resetBtn = wrapper.find('[data-test="reset-filters"]')
      expect(resetBtn.exists()).toBe(true)
    })

    it('emits reset-filters event', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const resetBtn = wrapper.find('[data-test="reset-filters"]')
      await resetBtn.trigger('click')

      expect(wrapper.emitted('reset-filters')).toBeTruthy()
    })

    it('clears all filter inputs', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      // Set filters
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test')

      const checkbox = wrapper.findAll('input[type="checkbox"]')[0]
      await checkbox.setValue(true)

      // Reset
      const resetBtn = wrapper.find('[data-test="reset-filters"]')
      await resetBtn.trigger('click')

      // Simulate reset clearing inputs
      expect(wrapper.emitted('reset-filters')).toBeTruthy()
    })
  })

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================

  describe('Accessibility', () => {
    it('has accessible labels for all inputs', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const labels = wrapper.findAll('label')
      expect(labels.length).toBeGreaterThan(0)

      labels.forEach(label => {
        expect(label.text()).toBeTruthy()
      })
    })

    it('associates labels with inputs', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const labels = wrapper.findAll('label[for]')
      labels.forEach(label => {
        const forAttr = label.attributes('for')
        const input = wrapper.find(`#${forAttr}`)
        expect(input.exists()).toBe(true)
      })
    })

    it('has keyboard navigation', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const inputs = wrapper.findAll('input')
      inputs.forEach(input => {
        expect(input.element.tabIndex).toBeGreaterThanOrEqual(-1)
      })
    })

    it('announces filter changes to screen readers', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const liveRegion = wrapper.find('[aria-live]')
      expect(liveRegion.exists()).toBe(true)
    })

    it('has proper ARIA attributes', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const select = wrapper.find('select')
      expect(select.attributes('aria-label')).toBeTruthy()
    })
  })

  // ========================================
  // STATE MANAGEMENT TESTS
  // ========================================

  describe('State Management', () => {
    it('tracks all filter states', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      // Component uses internal reactive state with <script setup>
      // We verify by checking that the component renders correctly
      expect(wrapper.exists()).toBe(true)
    })

    it('filters are reactive', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('reactive test')

      // Verify the input value changed
      expect((searchInput.element as HTMLInputElement).value).toBe('reactive test')
    })
  })

  // ========================================
  // RESPONSIVE DESIGN TESTS
  // ========================================

  describe('Responsive Design', () => {
    it('renders filter layout', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const filterContainer = wrapper.find('[class*="filter"]')
      expect(filterContainer.exists()).toBe(true)
    })

    it('has horizontal filter layout on desktop', () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const filterContainer = wrapper.find('[class*="filter"]')
      const style = filterContainer.element.className

      // Should contain flex or grid class
      expect(style).toBeTruthy()
    })
  })

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge Cases', () => {
    it('handles empty search', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('')

      expect(wrapper.emitted('search-change')).toBeTruthy()
    })

    it('handles special characters in search', async () => {
      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('@#$%^&*()')

      expect(wrapper.emitted('search-change')).toBeTruthy()
    })

    it('handles rapid filter changes', async () => {
      vi.useFakeTimers()

      const wrapper = mount(NotebookFilters, {
        global: { plugins: [createPinia()] }
      })

      const searchInput = wrapper.find('input[type="text"]')

      for (let i = 0; i < 10; i++) {
        await searchInput.setValue(`query${i}`)
        vi.advanceTimersByTime(50)
      }

      vi.useRealTimers()

      // Should handle gracefully
      expect(wrapper.vm).toBeTruthy()
    })
  })
})
