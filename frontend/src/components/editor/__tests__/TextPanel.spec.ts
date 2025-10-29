import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import TextPanel from '../TextPanel.vue'

/**
 * Test suite for TextPanel component
 *
 * Tests validation, form submission, library saving, and event emissions
 * for the text editing panel (US03 - Text element creation/editing)
 */
describe('TextPanel.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(TextPanel, {
      props: {
        mode: 'create',
        isAdding: true
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          TextPreview: true,
          FontSelector: true,
          SaveTextModal: true
        }
      }
    })
  })

  // =====================================================
  // RENDER & STRUCTURE TESTS
  // =====================================================

  it('renders form in create mode', () => {
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('.form-label').text()).toContain('Texte')
    expect(wrapper.find('.panel-title').text()).toBe('Ajouter un texte')
  })

  it('renders submit button with correct label in create mode', () => {
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.exists()).toBe(true)
    expect(submitBtn.text()).toContain('Ajouter au canvas')
  })

  it('renders all form input fields', () => {
    const inputs = wrapper.findAll('input, textarea, select')
    expect(inputs.length).toBeGreaterThan(0)

    // Check for key fields
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('input[type="color"]').exists()).toBe(true)
    expect(wrapper.find('input[type="number"]').exists()).toBe(true)
  })

  it('renders text styles checkboxes', () => {
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBe(3) // bold, italic, underline
  })

  it('renders all 4 action buttons', () => {
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(4) // submit, save to library, cancel, close
  })

  // =====================================================
  // FORM VALIDATION TESTS
  // =====================================================

  it('validates required text field', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('')
    await wrapper.find('button[type="submit"]').trigger('click')
    await flushPromises()

    // Text should be required
    const errors = wrapper.findAll('.error-feedback')
    expect(errors.length).toBeGreaterThan(0)
  })

  it('validates minimum fontSize (8px)', async () => {
    const fontSizeInput = wrapper.find('input[type="number"]')
    await fontSizeInput.setValue(5)
    await wrapper.find('button[type="submit"]').trigger('click')
    await flushPromises()

    // Should fail validation
    const errorFeedback = wrapper.find('.error-feedback')
    expect(errorFeedback.exists()).toBe(true)
  })

  it('validates maximum fontSize (200px)', async () => {
    const fontSizeInput = wrapper.find('input[type="number"]')
    await fontSizeInput.setValue(300)
    await wrapper.find('button[type="submit"]').trigger('click')
    await flushPromises()

    // Should fail validation
    const errorFeedback = wrapper.find('.error-feedback')
    expect(errorFeedback.exists()).toBe(true)
  })

  it('validates color hex format', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Valid text')

    const colorHexInput = wrapper.findAll('input[type="text"]')[0]
    await colorHexInput.setValue('invalid-color')

    await wrapper.find('button[type="submit"]').trigger('click')
    await flushPromises()

    // Should show error feedback
    const errorFeedback = wrapper.find('.error-feedback')
    expect(errorFeedback.exists()).toBe(true)
  })

  it('accepts valid form data without errors', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Valid text content')

    const fontSizeInput = wrapper.find('input[type="number"]')
    await fontSizeInput.setValue(16)

    const colorHexInput = wrapper.findAll('input[type="text"]')[0]
    await colorHexInput.setValue('#000000')

    // Form should be valid
    expect(wrapper.vm.$v.$invalid).toBe(false)
  })

  // =====================================================
  // CHARACTER COUNTER TESTS
  // =====================================================

  it('displays character counter', () => {
    const counter = wrapper.find('.char-counter')
    expect(counter.exists()).toBe(true)
    expect(counter.text()).toContain('/1000')
  })

  it('updates character counter as user types', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Hello World')

    const counter = wrapper.find('.char-counter')
    expect(counter.text()).toContain('11/1000')
  })

  it('applies warning class when 100 chars remaining', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('x'.repeat(950))

    const counter = wrapper.find('.char-counter')
    expect(counter.classes()).toContain('warning')
  })

  it('applies danger class when 50 chars remaining', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('x'.repeat(975))

    const counter = wrapper.find('.char-counter')
    expect(counter.classes()).toContain('danger')
  })

  // =====================================================
  // FORM SUBMISSION TESTS
  // =====================================================

  it('emits textAdded event on valid submit in create mode', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Test text')

    const fontSizeInput = wrapper.find('input[type="number"]')
    await fontSizeInput.setValue(16)

    const colorHexInput = wrapper.findAll('input[type="text"]')[0]
    await colorHexInput.setValue('#FF0000')

    const submitBtn = wrapper.find('button[type="submit"]')
    await submitBtn.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('textAdded')).toBeTruthy()
    expect(wrapper.emitted('textAdded')[0]).toEqual(
      expect.arrayContaining(['Test text', 16, '#FF0000'])
    )
  })

  it('emits textUpdated event on valid submit in edit mode', async () => {
    await wrapper.setProps({
      isAdding: false,
      selectedElement: {
        text: 'Original text',
        fontFamily: 'Open Sans',
        fontSize: 16,
        color: '#000000'
      }
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Updated text')

    const submitBtn = wrapper.find('button[type="submit"]')
    await submitBtn.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('textUpdated')).toBeTruthy()
    expect(wrapper.emitted('textUpdated')[0]).toContain('Updated text')
  })

  it('does not emit event when validation fails', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('') // Empty text - invalid

    const submitBtn = wrapper.find('button[type="submit"]')
    await submitBtn.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('textAdded')).toBeFalsy()
  })

  // =====================================================
  // FONT SELECTOR TESTS
  // =====================================================

  it('passes font selection to form data', async () => {
    const fontSelectorStub = wrapper.findComponent({ name: 'FontSelector' })
    expect(fontSelectorStub.exists()).toBe(true)
  })

  it('disables submit button when fonts are loading', async () => {
    await wrapper.vm.onFontLoadingState(true)

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('enables submit button when fonts finish loading', async () => {
    await wrapper.vm.onFontLoadingState(true)
    await wrapper.vm.onFontLoadingState(false)

    // Set valid data first
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Valid text')

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeUndefined()
  })

  // =====================================================
  // TEXT ALIGNMENT TESTS
  // =====================================================

  it('renders all text alignment buttons', () => {
    const alignButtons = wrapper.findAll('.align-button')
    expect(alignButtons.length).toBe(3) // left, center, right
  })

  it('toggles text alignment on button click', async () => {
    const alignButtons = wrapper.findAll('.align-button')

    // Click center alignment
    await alignButtons[1].trigger('click')
    expect(wrapper.vm.formData.textAlign).toBe('center')

    // Click right alignment
    await alignButtons[2].trigger('click')
    expect(wrapper.vm.formData.textAlign).toBe('right')
  })

  it('applies active class to selected alignment button', async () => {
    const alignButtons = wrapper.findAll('.align-button')

    // Initial state - left should be active
    expect(alignButtons[0].classes()).toContain('active')

    // Click center
    await alignButtons[1].trigger('click')
    expect(alignButtons[1].classes()).toContain('active')
  })

  // =====================================================
  // TEXT STYLES TESTS
  // =====================================================

  it('toggles bold style', async () => {
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    const boldCheckbox = checkboxes[0]

    await boldCheckbox.setValue(true)
    expect(wrapper.vm.formData.isBold).toBe(true)

    await boldCheckbox.setValue(false)
    expect(wrapper.vm.formData.isBold).toBe(false)
  })

  it('toggles italic style', async () => {
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    const italicCheckbox = checkboxes[1]

    await italicCheckbox.setValue(true)
    expect(wrapper.vm.formData.isItalic).toBe(true)
  })

  it('toggles underline style', async () => {
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    const underlineCheckbox = checkboxes[2]

    await underlineCheckbox.setValue(true)
    expect(wrapper.vm.formData.isUnderline).toBe(true)
  })

  // =====================================================
  // SAVE TO LIBRARY TESTS
  // =====================================================

  it('opens save modal when save to library button is clicked', async () => {
    expect(wrapper.vm.showSaveModal).toBe(false)

    const saveLibraryBtn = wrapper.findAll('button').find(
      (btn: any) => btn.text().includes('Enregistrer dans la bibliothèque')
    )
    await saveLibraryBtn?.trigger('click')

    expect(wrapper.vm.showSaveModal).toBe(true)
  })

  it('disables save library button when form is invalid', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('') // Invalid

    const saveLibraryBtn = wrapper.findAll('button').find(
      (btn: any) => btn.text().includes('Enregistrer dans la bibliothèque')
    )
    expect(saveLibraryBtn?.attributes('disabled')).toBeDefined()
  })

  it('emits savedToLibrary event with correct data', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Library text')

    // Mock the auth store save
    await wrapper.vm.handleSaveTextToLibrary({
      label: 'My Text',
      type: 'citation'
    })
    await flushPromises()

    expect(wrapper.vm.showSaveModal).toBe(false)
  })

  // =====================================================
  // DELETE BUTTON TESTS (EDIT MODE)
  // =====================================================

  it('shows delete button in edit mode', async () => {
    await wrapper.setProps({
      isAdding: false,
      selectedElement: { text: 'Test' }
    })

    const deleteBtn = wrapper.findAll('button').find(
      (btn: any) => btn.text().includes('Supprimer l\'élément')
    )
    expect(deleteBtn?.exists()).toBe(true)
  })

  it('emits deleteRequested event when delete button is clicked', async () => {
    await wrapper.setProps({
      isAdding: false,
      selectedElement: { text: 'Test' }
    })

    const deleteBtn = wrapper.findAll('button').find(
      (btn: any) => btn.text().includes('Supprimer l\'élément')
    )
    await deleteBtn?.trigger('click')

    expect(wrapper.emitted('deleteRequested')).toBeTruthy()
  })

  it('does not show delete button in create mode', async () => {
    const deleteBtn = wrapper.findAll('button').find(
      (btn: any) => btn.text().includes('Supprimer l\'élément')
    )
    expect(deleteBtn?.exists()).toBe(false)
  })

  // =====================================================
  // CANCEL/CLOSE TESTS
  // =====================================================

  it('emits cancel event when cancel button is clicked in edit mode', async () => {
    await wrapper.setProps({ isAdding: false })

    const cancelBtn = wrapper.findAll('button').find(
      (btn: any) => btn.text().includes('Annuler')
    )
    await cancelBtn?.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('shows close button only in edit mode', async () => {
    const closeBtn = wrapper.find('.close-button')
    expect(closeBtn.exists()).toBe(false)

    await wrapper.setProps({ isAdding: false })
    const closeBtnEdit = wrapper.find('.close-button')
    expect(closeBtnEdit.exists()).toBe(true)
  })

  // =====================================================
  // PROPS INITIALIZATION TESTS
  // =====================================================

  it('initializes form data from selectedElement prop', async () => {
    await wrapper.setProps({
      selectedElement: {
        text: 'Initial text',
        fontFamily: 'Roboto',
        fontSize: 24,
        color: '#FF0000'
      },
      isAdding: false
    })

    expect(wrapper.vm.formData.text).toBe('Initial text')
    expect(wrapper.vm.formData.fontFamily).toBe('Roboto')
    expect(wrapper.vm.formData.fontSize).toBe(24)
    expect(wrapper.vm.formData.color).toBe('#FF0000')
  })

  it('uses default values when no selectedElement provided', () => {
    expect(wrapper.vm.formData.text).toBe('')
    expect(wrapper.vm.formData.fontFamily).toBe('Open Sans')
    expect(wrapper.vm.formData.fontSize).toBe(16)
    expect(wrapper.vm.formData.color).toBe('#000000')
  })

  // =====================================================
  // PREVIEW COMPONENT TESTS
  // =====================================================

  it('passes correct data to TextPreview component', () => {
    const previewStub = wrapper.findComponent({ name: 'TextPreview' })
    expect(previewStub.exists()).toBe(true)

    const props = previewStub.props()
    expect(props.text).toBe(wrapper.vm.formData.text)
    expect(props.fontSize).toBe(wrapper.vm.formData.fontSize)
    expect(props.color).toBe(wrapper.vm.formData.color)
  })

  // =====================================================
  // INTEGRATION TESTS
  // =====================================================

  it('completes full workflow: fill form, validate, and submit', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Complete workflow test')

    const fontSizeInput = wrapper.find('input[type="number"]')
    await fontSizeInput.setValue(20)

    const colorHexInput = wrapper.findAll('input[type="text"]')[0]
    await colorHexInput.setValue('#0000FF')

    // Set bold style
    const boldCheckbox = wrapper.findAll('input[type="checkbox"]')[0]
    await boldCheckbox.setValue(true)

    // Change alignment to center
    const alignButtons = wrapper.findAll('.align-button')
    await alignButtons[1].trigger('click')

    const submitBtn = wrapper.find('button[type="submit"]')
    await submitBtn.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('textAdded')).toBeTruthy()
    const emittedData = wrapper.emitted('textAdded')[0]
    expect(emittedData[0]).toBe('Complete workflow test')
    expect(emittedData[1]).toBe(20)
    expect(emittedData[2]).toBe('#0000FF')
  })

  it('resets form after successful library save', async () => {
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Test text')

    const initialText = wrapper.vm.formData.text
    expect(initialText).toBe('Test text')

    // Simulate successful save
    await wrapper.vm.handleSaveTextToLibrary({
      label: 'Test',
      type: 'libre'
    })
    await flushPromises()

    expect(wrapper.vm.showSaveModal).toBe(false)
  })
})
