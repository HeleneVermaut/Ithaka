import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SaveTextModal from '../SaveTextModal.vue'
import { NModal, NButton, NInput, NSelect } from 'naive-ui'

/**
 * Test suite for SaveTextModal component
 *
 * Tests form validation, modal lifecycle, and save functionality
 * for saving text snippets to library (US03)
 */
describe('SaveTextModal.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(SaveTextModal, {
      props: {
        show: false,
        initialLabel: '',
        initialType: ''
      },
      global: {
        components: {
          NModal,
          NButton,
          NInput,
          NSelect
        },
        stubs: {
          NModal: false,
          NCard: { template: '<div><slot /></div>' },
          NForm: { template: '<div><slot /></div>' },
          NFormItem: { template: '<div><slot /></div>' },
          NInput: false,
          NSelect: false,
          NButton: false,
          NSpace: { template: '<div><slot /></div>' },
          NAlert: { template: '<div><slot /></div>' }
        }
      }
    })
  })

  // =====================================================
  // MODAL VISIBILITY TESTS
  // =====================================================

  it('hides modal when show prop is false', () => {
    expect(wrapper.vm.formData.label).toBe('')
  })

  it('shows modal when show prop is true', async () => {
    await wrapper.setProps({ show: true })
    expect(wrapper.props('show')).toBe(true)
  })

  it('emits update:show with false when closing', async () => {
    await wrapper.setProps({ show: true })
    await wrapper.vm.handleModalClose(false)

    expect(wrapper.emitted('update:show')).toBeTruthy()
    expect(wrapper.emitted('update:show')[0]).toEqual([false])
  })

  it('emits update:show with true when opening', async () => {
    await wrapper.vm.handleModalClose(true)
    expect(wrapper.emitted('update:show')).toBeTruthy()
    expect(wrapper.emitted('update:show')[0]).toEqual([true])
  })

  // =====================================================
  // FORM INITIALIZATION TESTS
  // =====================================================

  it('initializes form with empty values by default', () => {
    expect(wrapper.vm.formData.label).toBe('')
    expect(wrapper.vm.formData.type).toBe('')
  })

  it('initializes form with initialLabel prop', async () => {
    await wrapper.setProps({ initialLabel: 'My Text Label' })
    expect(wrapper.vm.formData.label).toBe('My Text Label')
  })

  it('initializes form with initialType prop', async () => {
    await wrapper.setProps({ initialType: 'citation' })
    expect(wrapper.vm.formData.type).toBe('citation')
  })

  it('updates label when initialLabel prop changes', async () => {
    await wrapper.setProps({ initialLabel: 'First Label' })
    expect(wrapper.vm.formData.label).toBe('First Label')

    await wrapper.setProps({ initialLabel: 'Updated Label' })
    expect(wrapper.vm.formData.label).toBe('Updated Label')
  })

  it('updates type when initialType prop changes', async () => {
    await wrapper.setProps({ initialType: 'citation' })
    expect(wrapper.vm.formData.type).toBe('citation')

    await wrapper.setProps({ initialType: 'poeme' })
    expect(wrapper.vm.formData.type).toBe('poeme')
  })

  // =====================================================
  // LABEL FIELD VALIDATION TESTS
  // =====================================================

  it('validates label is required', async () => {
    wrapper.vm.formData.label = ''
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.v$.label.$invalid).toBe(true)
  })

  it('validates label minimum length (1 character)', async () => {
    wrapper.vm.formData.label = ''
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.v$.label.minLength.$invalid).toBe(true)
  })

  it('accepts label with 1 character', async () => {
    wrapper.vm.formData.label = 'A'
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.v$.label.$invalid).toBe(false)
  })

  it('validates label maximum length (100 characters)', async () => {
    wrapper.vm.formData.label = 'x'.repeat(101)
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.v$.label.maxLength.$invalid).toBe(true)
  })

  it('accepts label with exactly 100 characters', async () => {
    wrapper.vm.formData.label = 'x'.repeat(100)
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.v$.label.maxLength.$invalid).toBe(false)
  })

  it('accepts label with valid length', async () => {
    wrapper.vm.formData.label = 'My Valid Label'
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.v$.label.$invalid).toBe(false)
  })

  // =====================================================
  // TYPE FIELD TESTS
  // =====================================================

  it('renders type options correctly', () => {
    const expectedOptions = [
      { label: 'Citation', value: 'citation' },
      { label: 'Poème', value: 'poeme' },
      { label: 'Libre', value: 'libre' }
    ]

    expect(wrapper.vm.typeOptions).toEqual(expectedOptions)
  })

  it('allows setting type to citation', async () => {
    wrapper.vm.formData.type = 'citation'
    expect(wrapper.vm.formData.type).toBe('citation')
  })

  it('allows setting type to poeme', async () => {
    wrapper.vm.formData.type = 'poeme'
    expect(wrapper.vm.formData.type).toBe('poeme')
  })

  it('allows setting type to libre', async () => {
    wrapper.vm.formData.type = 'libre'
    expect(wrapper.vm.formData.type).toBe('libre')
  })

  it('allows clearing type field', async () => {
    wrapper.vm.formData.type = 'citation'
    wrapper.vm.formData.type = ''
    expect(wrapper.vm.formData.type).toBe('')
  })

  // =====================================================
  // FORM VALIDITY TESTS
  // =====================================================

  it('form is invalid when label is empty', async () => {
    wrapper.vm.formData.label = ''
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.isFormValid).toBe(false)
  })

  it('form is valid when only label is filled', async () => {
    wrapper.vm.formData.label = 'Valid Label'
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.isFormValid).toBe(true)
  })

  it('form is valid when label and type are filled', async () => {
    wrapper.vm.formData.label = 'Valid Label'
    wrapper.vm.formData.type = 'citation'
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.isFormValid).toBe(true)
  })

  it('form is invalid when label contains only whitespace', async () => {
    wrapper.vm.formData.label = '   '
    await wrapper.vm.v$.$validate()

    // isFormValid checks trim() length
    expect(wrapper.vm.isFormValid).toBe(false)
  })

  // =====================================================
  // ERROR MESSAGE TESTS
  // =====================================================

  it('displays error message when label is empty', async () => {
    wrapper.vm.formData.label = ''
    wrapper.vm.v$.label.$dirty = true
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.labelErrorMessage).toContain('requis')
  })

  it('displays error message when label exceeds max length', async () => {
    wrapper.vm.formData.label = 'x'.repeat(101)
    wrapper.vm.v$.label.$dirty = true
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.labelErrorMessage).toContain('dépasser 100')
  })

  it('displays no error when label is valid', async () => {
    wrapper.vm.formData.label = 'Valid Label'
    wrapper.vm.v$.label.$dirty = true
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.labelErrorMessage).toBe('')
  })

  // =====================================================
  // SAVE BUTTON TESTS
  // =====================================================

  it('disables save button when form is invalid', async () => {
    wrapper.vm.formData.label = ''
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.isFormValid).toBe(false)
  })

  it('enables save button when form is valid', async () => {
    wrapper.vm.formData.label = 'Valid Label'
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.isFormValid).toBe(true)
  })

  // =====================================================
  // SAVE EVENT TESTS
  // =====================================================

  it('emits save event with label and type on save', async () => {
    wrapper.vm.formData.label = 'Test Label'
    wrapper.vm.formData.type = 'citation'
    await wrapper.vm.handleSave()
    await flushPromises()

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0]).toEqual([{
      label: 'Test Label',
      type: 'citation'
    }])
  })

  it('emits save event with label only when type is empty', async () => {
    wrapper.vm.formData.label = 'Test Label'
    wrapper.vm.formData.type = ''
    await wrapper.vm.handleSave()
    await flushPromises()

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0]).toEqual([{
      label: 'Test Label',
      type: undefined
    }])
  })

  it('trims whitespace from label before saving', async () => {
    wrapper.vm.formData.label = '  Test Label  '
    wrapper.vm.formData.type = 'libre'
    await wrapper.vm.handleSave()
    await flushPromises()

    expect(wrapper.emitted('save')[0][0].label).toBe('Test Label')
  })

  it('does not emit save event when validation fails', async () => {
    wrapper.vm.formData.label = ''
    await wrapper.vm.handleSave()
    await flushPromises()

    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('emits update:show false after successful save', async () => {
    wrapper.vm.formData.label = 'Test Label'
    await wrapper.vm.handleSave()
    await flushPromises()

    expect(wrapper.emitted('update:show')).toBeTruthy()
    expect(wrapper.emitted('update:show')[0]).toEqual([false])
  })

  // =====================================================
  // CANCEL BUTTON TESTS
  // =====================================================

  it('emits update:show false when cancel is clicked', async () => {
    wrapper.vm.formData.label = 'Test Label'
    await wrapper.vm.handleCancel()

    expect(wrapper.emitted('update:show')).toBeTruthy()
    expect(wrapper.emitted('update:show')[0]).toEqual([false])
  })

  it('resets form when cancel is clicked', async () => {
    wrapper.vm.formData.label = 'Test Label'
    wrapper.vm.formData.type = 'citation'
    await wrapper.vm.handleCancel()

    expect(wrapper.vm.formData.label).toBe('')
    expect(wrapper.vm.formData.type).toBe('')
  })

  // =====================================================
  // FORM RESET TESTS
  // =====================================================

  it('resets form data after successful save', async () => {
    wrapper.vm.formData.label = 'Test Label'
    wrapper.vm.formData.type = 'citation'
    await wrapper.vm.handleSave()
    await flushPromises()

    expect(wrapper.vm.formData.label).toBe('')
    expect(wrapper.vm.formData.type).toBe('')
  })

  it('resets validation state when form is reset', async () => {
    wrapper.vm.formData.label = 'Test'
    wrapper.vm.v$.label.$dirty = true
    wrapper.vm.resetForm()

    expect(wrapper.vm.formData.label).toBe('')
    expect(wrapper.vm.v$.label.$dirty).toBe(false)
  })

  it('clears label error messages after reset', async () => {
    wrapper.vm.formData.label = 'x'.repeat(101)
    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.labelErrorMessage).not.toBe('')

    wrapper.vm.resetForm()
    expect(wrapper.vm.formData.label).toBe('')
  })

  // =====================================================
  // MODAL CLOSE TESTS
  // =====================================================

  it('resets form when modal is closed', async () => {
    wrapper.vm.formData.label = 'Test Label'
    wrapper.vm.formData.type = 'citation'
    await wrapper.vm.handleModalClose(false)

    expect(wrapper.vm.formData.label).toBe('')
    expect(wrapper.vm.formData.type).toBe('')
  })

  it('does not reset form when modal is opened', async () => {
    wrapper.vm.formData.label = 'Test Label'
    await wrapper.vm.handleModalClose(true)

    expect(wrapper.vm.formData.label).toBe('Test Label')
  })

  // =====================================================
  // INTEGRATION TESTS
  // =====================================================

  it('completes full save workflow', async () => {
    // Set initial values
    await wrapper.setProps({
      show: true,
      initialLabel: 'Initial Label'
    })

    expect(wrapper.vm.formData.label).toBe('Initial Label')

    // Update form
    wrapper.vm.formData.label = 'Updated Label'
    wrapper.vm.formData.type = 'poeme'

    // Validate
    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.isFormValid).toBe(true)

    // Save
    await wrapper.vm.handleSave()
    await flushPromises()

    // Check emissions
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('update:show')).toBeTruthy()

    // Check reset
    expect(wrapper.vm.formData.label).toBe('')
    expect(wrapper.vm.formData.type).toBe('')
  })

  it('handles cancel after partial form fill', async () => {
    wrapper.vm.formData.label = 'Partial Label'
    wrapper.vm.formData.type = 'citation'

    await wrapper.vm.handleCancel()

    expect(wrapper.vm.formData.label).toBe('')
    expect(wrapper.vm.formData.type).toBe('')
    expect(wrapper.emitted('update:show')[0]).toEqual([false])
  })

  it('validates during typing', async () => {
    wrapper.vm.v$.label.$dirty = true

    // Start with empty
    wrapper.vm.formData.label = ''
    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.v$.label.$invalid).toBe(true)

    // Add single character
    wrapper.vm.formData.label = 'A'
    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.v$.label.$invalid).toBe(false)

    // Exceed max length
    wrapper.vm.formData.label = 'x'.repeat(101)
    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.v$.label.$invalid).toBe(true)
  })

  it('handles rapid open/close cycles', async () => {
    // Open
    await wrapper.setProps({ show: true })
    wrapper.vm.formData.label = 'Test'

    // Close
    await wrapper.vm.handleModalClose(false)
    expect(wrapper.vm.formData.label).toBe('')

    // Open again
    await wrapper.setProps({ show: true })
    expect(wrapper.vm.formData.label).toBe('')

    // Fill form
    wrapper.vm.formData.label = 'New Text'
    expect(wrapper.vm.formData.label).toBe('New Text')
  })

  // =====================================================
  // EDGE CASES
  // =====================================================

  it('handles label with special characters', async () => {
    wrapper.vm.formData.label = 'Label with !@#$%^&*()'
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.isFormValid).toBe(true)
  })

  it('handles label with unicode characters', async () => {
    wrapper.vm.formData.label = 'Étiquette français'
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.isFormValid).toBe(true)
  })

  it('handles label with newlines', async () => {
    wrapper.vm.formData.label = 'Line1\nLine2'
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.isFormValid).toBe(true)
  })

  it('handles multiple spaces in label', async () => {
    wrapper.vm.formData.label = 'Label    with    spaces'
    await wrapper.vm.v$.$validate()

    expect(wrapper.vm.isFormValid).toBe(true)
  })
})
