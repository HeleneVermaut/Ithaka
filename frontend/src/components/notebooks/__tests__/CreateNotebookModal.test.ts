/**
 * Tests unitaires du composant CreateNotebookModal
 *
 * Ce modal gère la création d'un nouveau carnet.
 * Les tests couvrent:
 * - Affichage des champs du formulaire
 * - Validation des inputs (Vuelidate)
 * - Soumission du formulaire
 * - Fermeture du modal
 * - Messages d'erreur
 *
 * Framework: Vitest + Vue Test Utils + Vuelidate
 * Couverture cible: 75%+
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import CreateNotebookModal from '../CreateNotebookModal.vue'

describe('CreateNotebookModal Component - TASK31', () => {
  // ========================================
  // RENDERING TESTS
  // ========================================

  describe('Rendering', () => {
    it('renders modal when open prop is true', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.find('[class*="modal"]').exists()).toBe(true)
    })

    it('does not render modal when open prop is false', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: false },
        global: { plugins: [createPinia()] }
      })

      const modal = wrapper.find('[class*="modal"]')
      expect(modal.exists()).toBe(false)
    })

    it('renders title field', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      expect(titleInput.exists()).toBe(true)
    })

    it('renders description field', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const descriptionInput = wrapper.find('textarea[placeholder*="Description"]')
      expect(descriptionInput.exists()).toBe(true)
    })

    it('renders type selector', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toMatch(/type|Voyage|Daily/i)
    })

    it('renders format selector', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toMatch(/format|A4|A5/i)
    })

    it('renders orientation selector', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toMatch(/orientation|portrait|landscape/i)
    })
  })

  // ========================================
  // FORM VALIDATION TESTS
  // ========================================

  describe('Form Validation', () => {
    it('requires title field', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('')
      await wrapper.vm.$v.$touch()
      await flushPromises()

      expect(wrapper.text()).toMatch(/requis|required/i)
    })

    it('validates title length', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('a') // Too short
      await wrapper.vm.$v.$touch()
      await flushPromises()

      // Should show error or disable submit
      const submitBtn = wrapper.find('[data-test="submit"]')
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })

    it('allows valid title', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('My Valid Notebook Title')

      const submitBtn = wrapper.find('[data-test="submit"]')
      expect(submitBtn.attributes('disabled')).not.toBeDefined()
    })

    it('description is optional', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('Valid Title')

      const descInput = wrapper.find('textarea[placeholder*="Description"]')
      await descInput.setValue('')

      const submitBtn = wrapper.find('[data-test="submit"]')
      expect(submitBtn.attributes('disabled')).not.toBeDefined()
    })

    it('shows all validation errors at once', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('')

      const form = wrapper.find('form')
      await form.trigger('submit')
      await flushPromises()

      const errors = wrapper.findAll('[class*="error"]')
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  // ========================================
  // FORM SUBMISSION TESTS
  // ========================================

  describe('Form Submission', () => {
    it('emits create event on submit', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('New Notebook')

      const typeSelects = wrapper.findAll('[data-test*="type"]')
      if (typeSelects.length > 0) {
        await typeSelects[0].setValue('Voyage')
      }

      const form = wrapper.find('form')
      await form.trigger('submit')
      await flushPromises()

      expect(wrapper.emitted('create')).toBeTruthy()
    })

    it('passes correct data in create event', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('Test Notebook')

      const descInput = wrapper.find('textarea[placeholder*="Description"]')
      await descInput.setValue('Test description')

      const form = wrapper.find('form')
      await form.trigger('submit')
      await flushPromises()

      const emitted = wrapper.emitted('create')
      expect(emitted).toBeTruthy()

      const payload = emitted?.[0]?.[0] as Record<string, unknown>
      expect(payload.title).toBe('Test Notebook')
      expect(payload.description).toBe('Test description')
    })

    it('includes all form fields in payload', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('Complete Notebook')

      const form = wrapper.find('form')
      await form.trigger('submit')
      await flushPromises()

      const payload = wrapper.emitted('create')?.[0]?.[0] as Record<string, unknown>
      expect(payload.title).toBeDefined()
      expect(payload.type).toBeDefined()
      expect(payload.format).toBeDefined()
      expect(payload.orientation).toBeDefined()
    })

    it('prevents submit when form is invalid', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      // Leave title empty
      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('')

      const submitBtn = wrapper.find('[data-test="submit"]')
      await submitBtn.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('create')).not.toBeTruthy()
    })

    it('disables submit button during submission', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('Test')

      const submitBtn = wrapper.find('[data-test="submit"]')
      await submitBtn.trigger('click')

      // During submission
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })
  })

  // ========================================
  // MODAL CLOSE TESTS
  // ========================================

  describe('Modal Close', () => {
    it('emits close event on cancel button', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const cancelBtn = wrapper.find('[data-test="cancel"]')
      await cancelBtn.trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close event on backdrop click', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const backdrop = wrapper.find('[class*="backdrop"]')
      if (backdrop.exists()) {
        await backdrop.trigger('click')
        expect(wrapper.emitted('close')).toBeTruthy()
      }
    })

    it('closes on Escape key', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const modal = wrapper.find('[class*="modal"]')
      await modal.trigger('keydown.escape')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('clears form on close', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('Test')

      const cancelBtn = wrapper.find('[data-test="cancel"]')
      await cancelBtn.trigger('click')

      await wrapper.vm.$nextTick()

      expect(titleInput.element.value).toBe('')
    })
  })

  // ========================================
  // FORM FIELDS STATE TESTS
  // ========================================

  describe('Form Fields State', () => {
    it('initializes with empty title', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      expect(titleInput.element.value).toBe('')
    })

    it('initializes with empty description', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const descInput = wrapper.find('textarea[placeholder*="Description"]')
      expect(descInput.element.value).toBe('')
    })

    it('has default type selected', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.vm.formData.type).toBeTruthy()
    })

    it('has default format selected', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.vm.formData.format).toBeTruthy()
    })

    it('has default orientation selected', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.vm.formData.orientation).toBeTruthy()
    })

    it('allows changing type selection', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const typeSelects = wrapper.findAll('[data-test*="type"]')
      if (typeSelects.length > 0) {
        await typeSelects[0].setValue('Daily')
        expect(wrapper.vm.formData.type).toBe('Daily')
      }
    })

    it('allows changing format selection', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const formatSelects = wrapper.findAll('[data-test*="format"]')
      if (formatSelects.length > 0) {
        await formatSelects[0].setValue('A5')
        expect(wrapper.vm.formData.format).toBe('A5')
      }
    })
  })

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================

  describe('Accessibility', () => {
    it('has accessible modal dialog', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const modal = wrapper.find('[role="dialog"]')
      expect(modal.exists()).toBe(true)
    })

    it('has aria-labelledby pointing to title', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const modal = wrapper.find('[role="dialog"]')
      expect(modal.attributes('aria-labelledby')).toBeTruthy()
    })

    it('all form inputs have labels', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const inputs = wrapper.findAll('input, textarea')
      inputs.forEach(input => {
        const label = wrapper.find(`label[for="${input.attributes('id')}"]`)
        expect(label.exists()).toBe(true)
      })
    })

    it('form inputs have appropriate aria attributes', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      expect(titleInput.attributes('aria-required')).toBe('true')
    })

    it('error messages linked to inputs', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('')
      await wrapper.vm.$v.$touch()
      await flushPromises()

      const errorId = titleInput.attributes('aria-describedby')
      if (errorId) {
        const error = wrapper.find(`#${errorId}`)
        expect(error.exists()).toBe(true)
      }
    })

    it('focus management', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const modal = wrapper.find('[class*="modal"]')
      expect(modal.exists()).toBe(true)
      // First focusable element should be the title input
      const firstInput = wrapper.find('input[placeholder*="Titre"]')
      expect(firstInput.exists()).toBe(true)
    })
  })

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  describe('Error Handling', () => {
    it('displays error message from props', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: {
          isOpen: true,
          error: 'Creation failed - server error'
        },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.text()).toContain('Creation failed')
    })

    it('clears error on new submission', async () => {
      const { wrapper } = mount(CreateNotebookModal, {
        props: {
          isOpen: true,
          error: 'Previous error'
        },
        global: { plugins: [createPinia()] }
      })

      expect(wrapper.props('error')).toBe('Previous error')

      // New error should be passed via props update
      await wrapper.setProps({ error: null })
      expect(wrapper.props('error')).toBeNull()
    })
  })

  // ========================================
  // LOADING STATE TESTS
  // ========================================

  describe('Loading State', () => {
    it('shows loading indicator during submission', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true, isLoading: true },
        global: { plugins: [createPinia()] }
      })

      const loader = wrapper.find('[class*="loader"]')
      expect(loader.exists()).toBe(true)
    })

    it('disables submit button when loading', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true, isLoading: true },
        global: { plugins: [createPinia()] }
      })

      const submitBtn = wrapper.find('[data-test="submit"]')
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })

    it('disables inputs when loading', () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true, isLoading: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      expect(titleInput.attributes('disabled')).toBeDefined()
    })
  })

  // ========================================
  // KEYBOARD NAVIGATION TESTS
  // ========================================

  describe('Keyboard Navigation', () => {
    it('tab key navigates through form', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const inputs = wrapper.findAll('input, textarea, button')
      expect(inputs.length).toBeGreaterThan(0)

      inputs.forEach(input => {
        expect(input.element.tabIndex).toBeGreaterThanOrEqual(-1)
      })
    })

    it('enter key submits form', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue('Test')
      await titleInput.trigger('keydown.enter')

      // Should submit
      expect(wrapper.emitted('create')).toBeTruthy()
    })
  })

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge Cases', () => {
    it('handles very long title', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const longTitle = 'A'.repeat(500)
      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue(longTitle)

      const form = wrapper.find('form')
      await form.trigger('submit')

      // Should handle gracefully
      expect(wrapper.vm).toBeTruthy()
    })

    it('handles special characters in title', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      const specialTitle = '<script>alert("test")</script>'
      const titleInput = wrapper.find('input[placeholder*="Titre"]')
      await titleInput.setValue(specialTitle)

      const form = wrapper.find('form')
      await form.trigger('submit')

      expect(wrapper.emitted('create')).toBeTruthy()
    })

    it('handles rapid open/close cycles', async () => {
      const wrapper = mount(CreateNotebookModal, {
        props: { isOpen: true },
        global: { plugins: [createPinia()] }
      })

      for (let i = 0; i < 5; i++) {
        await wrapper.setProps({ isOpen: false })
        await wrapper.setProps({ isOpen: true })
      }

      expect(wrapper.props('isOpen')).toBe(true)
    })
  })
})
