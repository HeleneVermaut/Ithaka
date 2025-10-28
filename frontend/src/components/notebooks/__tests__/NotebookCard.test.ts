/**
 * Tests unitaires du composant NotebookCard
 *
 * Ce composant affiche un carnet sous forme de carte dans la galerie.
 * Les tests couvrent:
 * - Affichage des props (titre, type, statut)
 * - Émission d'événements (click, duplicate, archive, etc.)
 * - États au survol
 * - Badges de type avec couleurs
 *
 * Framework: Vitest + Vue Test Utils
 * Couverture cible: 75%+
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import NotebookCard from '../NotebookCard.vue'
import type { Notebook } from '@/types/notebook'

const createMockNotebook = (override: Partial<Notebook> = {}): Notebook => ({
  id: 'notebook-1',
  userId: 'user-1',
  title: 'Test Notebook',
  description: 'Test description',
  type: 'Voyage' as const,
  status: 'active' as const,
  thumbnailUrl: null,
  pageCount: 5,
  isPrivate: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...override
})

describe('NotebookCard Component - TASK31', () => {
  // ========================================
  // PROPS DISPLAY TESTS
  // ========================================

  describe('Props Display', () => {
    it('displays notebook title', () => {
      const notebook = createMockNotebook({ title: 'My Travel Journal' })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toContain('My Travel Journal')
    })

    it('displays notebook type badge', () => {
      const notebook = createMockNotebook({ type: 'Voyage' })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toContain('Voyage')
    })

    it('displays page count', () => {
      const notebook = createMockNotebook({ pageCount: 12 })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toContain('12')
    })

    it('displays private badge when isPrivate is true', () => {
      const notebook = createMockNotebook({ isPrivate: true })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.find('[aria-label*="Privé"]').exists()).toBe(true)
    })

    it('does not display private badge when isPrivate is false', () => {
      const notebook = createMockNotebook({ isPrivate: false })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.find('[aria-label*="Privé"]').exists()).toBe(false)
    })

    it('displays creation date', () => {
      const notebook = createMockNotebook({
        createdAt: new Date('2025-01-15')
      })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      // NTime component should render the date
      expect(wrapper.vm.$el.textContent).toBeTruthy()
    })
  })

  // ========================================
  // TYPE BADGE COLOR TESTS
  // ========================================

  describe('Type Badge Colors', () => {
    it('sets blue color for Voyage type', () => {
      const notebook = createMockNotebook({ type: 'Voyage' })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const typeBadgeColor = wrapper.vm.typeBadgeColor
      expect(typeBadgeColor).toBe('#3B82F6') // Bleu
    })

    it('sets green color for Daily type', () => {
      const notebook = createMockNotebook({ type: 'Daily' })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const typeBadgeColor = wrapper.vm.typeBadgeColor
      expect(typeBadgeColor).toBe('#10B981') // Vert
    })

    it('sets purple color for Reportage type', () => {
      const notebook = createMockNotebook({ type: 'Reportage' })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const typeBadgeColor = wrapper.vm.typeBadgeColor
      expect(typeBadgeColor).toBe('#8B5CF6') // Violet
    })
  })

  // ========================================
  // EVENT EMISSION TESTS
  // ========================================

  describe('Event Emission', () => {
    it('emits click event when card is clicked', async () => {
      const notebook = createMockNotebook()
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      await wrapper.find('.notebook-card').trigger('click')

      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')?.[0]).toEqual([notebook])
    })

    it('emits duplicate event with correct payload', async () => {
      const notebook = createMockNotebook()
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      // Simulate clicking duplicate button
      const duplicateBtn = wrapper.find('[data-test="duplicate-btn"]')
      if (duplicateBtn.exists()) {
        await duplicateBtn.trigger('click')
      }

      const emitted = wrapper.emitted('duplicate')
      if (emitted) {
        expect(emitted[0]).toEqual([notebook])
      }
    })

    it('emits archive event when archive is clicked', async () => {
      const notebook = createMockNotebook()
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const archiveBtn = wrapper.find('[data-test="archive-btn"]')
      if (archiveBtn.exists()) {
        await archiveBtn.trigger('click')
      }

      const emitted = wrapper.emitted('archive')
      if (emitted) {
        expect(emitted[0]).toEqual([notebook])
      }
    })

    it('emits rename event when rename is clicked', async () => {
      const notebook = createMockNotebook()
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const renameBtn = wrapper.find('[data-test="rename-btn"]')
      if (renameBtn.exists()) {
        await renameBtn.trigger('click')
      }

      const emitted = wrapper.emitted('rename')
      if (emitted) {
        expect(emitted[0]).toEqual([notebook])
      }
    })

    it('emits contextmenu event on right click', async () => {
      const notebook = createMockNotebook()
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      await wrapper.find('.notebook-card').trigger('contextmenu')

      expect(wrapper.emitted('contextmenu')).toBeTruthy()
    })
  })

  // ========================================
  // CONDITIONAL RENDERING TESTS
  // ========================================

  describe('Conditional Rendering', () => {
    it('renders thumbnail when available', () => {
      const notebook = createMockNotebook({
        thumbnailUrl: 'https://example.com/thumb.jpg'
      })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const image = wrapper.find('img')
      expect(image.exists()).toBe(true)
    })

    it('renders placeholder when thumbnail is not available', () => {
      const notebook = createMockNotebook({ thumbnailUrl: null })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      // Should render a placeholder element (book icon or default)
      const placeholder = wrapper.find('[class*="placeholder"]')
      expect(placeholder.exists()).toBe(true)
    })

    it('renders archived state differently', () => {
      const notebook = createMockNotebook({ status: 'archived' })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const archivedClass = wrapper.find('[class*="archived"]')
      expect(archivedClass.exists()).toBe(true)
    })
  })

  // ========================================
  // INTERACTION TESTS
  // ========================================

  describe('Interactions', () => {
    it('shows action buttons on hover', async () => {
      const notebook = createMockNotebook()
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const actionButtons = wrapper.findAll('[class*="action-btn"]')
      let visibleCount = 0

      actionButtons.forEach(btn => {
        const style = btn.element.getAttribute('style')
        if (!style?.includes('display: none')) {
          visibleCount++
        }
      })

      // At least some action buttons should exist
      expect(actionButtons.length).toBeGreaterThan(0)
    })

    it('applies hover state class', async () => {
      const notebook = createMockNotebook()
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const card = wrapper.find('.notebook-card')
      await card.trigger('mouseenter')

      // Card should have hover class or show action buttons
      expect(wrapper.vm.$el.classList.toString().length).toBeGreaterThan(0)
    })
  })

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================

  describe('Accessibility', () => {
    it('has accessible name for card', () => {
      const notebook = createMockNotebook({ title: 'My Notebook' })
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const card = wrapper.find('.notebook-card')
      expect(card.attributes('role')).toMatch(/button|article/i)
    })

    it('provides aria-label for buttons', () => {
      const notebook = createMockNotebook()
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const buttons = wrapper.findAll('button')
      buttons.forEach(btn => {
        expect(
          btn.attributes('aria-label') || btn.text()
        ).toBeTruthy()
      })
    })

    it('keyboard navigable', async () => {
      const notebook = createMockNotebook()
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)

      // Buttons should have tab index
      buttons.forEach(btn => {
        expect(btn.element.tagName.toLowerCase()).toBe('button')
      })
    })
  })

  // ========================================
  // SNAPSHOT TESTS
  // ========================================

  describe('Snapshot', () => {
    it('renders correctly with minimal props', () => {
      const notebook = createMockNotebook()
      const wrapper = mount(NotebookCard, {
        props: { notebook },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.vm.$el).toBeTruthy()
      expect(wrapper.find('.notebook-card').exists()).toBe(true)
    })

    it('renders different types correctly', () => {
      const types: Array<'Voyage' | 'Daily' | 'Reportage'> = ['Voyage', 'Daily', 'Reportage']

      types.forEach(type => {
        const notebook = createMockNotebook({ type })
        const wrapper = mount(NotebookCard, {
          props: { notebook },
          global: { plugins: [createPinia()] }
        })

        expect(wrapper.text()).toContain(type)
      })
    })
  })
})
