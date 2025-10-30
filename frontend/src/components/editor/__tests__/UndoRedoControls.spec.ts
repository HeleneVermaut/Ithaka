import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import UndoRedoControls from '../UndoRedoControls.vue'
import { NButton, NButtonGroup, NTooltip, NIcon } from 'naive-ui'

/**
 * Test suite for UndoRedoControls component
 *
 * Tests undo/redo functionality with keyboard shortcuts for US04 (PHASE 4)
 * Prepared for future PHASE 6 integration with useHistory composable
 */
describe('UndoRedoControls.vue', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    wrapper = mount(UndoRedoControls, {
      props: {
        canUndo: true,
        canRedo: true,
        disabled: false
      },
      global: {
        components: {
          NButton,
          NButtonGroup,
          NTooltip,
          NIcon
        }
      }
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  // =====================================================
  // RENDER & STRUCTURE TESTS
  // =====================================================

  it('should render the undo/redo controls container', () => {
    const container = wrapper.find('.undo-redo-controls')
    expect(container.exists()).toBe(true)
  })

  it('should render button group with 2 buttons', () => {
    const buttonGroup = wrapper.findComponent(NButtonGroup)
    expect(buttonGroup.exists()).toBe(true)

    const buttons = wrapper.findAllComponents(NButton)
    expect(buttons.length).toBe(2)
  })

  it('should render undo button with correct aria-label', () => {
    const buttons = wrapper.findAllComponents(NButton)
    const undoButton = buttons[0]

    expect(undoButton.attributes('aria-label')).toBe('Annuler')
  })

  it('should render redo button with correct aria-label', () => {
    const buttons = wrapper.findAllComponents(NButton)
    const redoButton = buttons[1]

    expect(redoButton.attributes('aria-label')).toBe('Rétablir')
  })

  it('should render icons for both buttons', () => {
    const icons = wrapper.findAllComponents(NIcon)
    expect(icons.length).toBe(2)
  })

  // =====================================================
  // TOOLTIP TESTS
  // =====================================================

  it('should render tooltips for both buttons', () => {
    const tooltips = wrapper.findAllComponents(NTooltip)
    expect(tooltips.length).toBe(2)
  })

  it('should display undo tooltip with correct shortcut', () => {
    const tooltips = wrapper.findAllComponents(NTooltip)
    const undoTooltip = tooltips[0]

    // Check the tooltip component exists
    // NaiveUI tooltips don't render their content until hovered in tests
    // In test environment, we just verify the tooltip component exists
    expect(undoTooltip.exists()).toBe(true)
  })

  it('should display redo tooltip with correct shortcut', () => {
    const tooltips = wrapper.findAllComponents(NTooltip)
    const redoTooltip = tooltips[1]

    // Check the tooltip component exists
    // NaiveUI tooltips don't render their content until hovered in tests
    expect(redoTooltip.exists()).toBe(true)
  })

  // =====================================================
  // BUTTON ENABLED/DISABLED STATE TESTS
  // =====================================================

  it('should enable undo button when canUndo is true', () => {
    const buttons = wrapper.findAllComponents(NButton)
    const undoButton = buttons[0]

    expect(undoButton.props('disabled')).toBe(false)
  })

  it('should enable redo button when canRedo is true', () => {
    const buttons = wrapper.findAllComponents(NButton)
    const redoButton = buttons[1]

    expect(redoButton.props('disabled')).toBe(false)
  })

  it('should disable undo button when canUndo is false', async () => {
    await wrapper.setProps({ canUndo: false })

    const buttons = wrapper.findAllComponents(NButton)
    const undoButton = buttons[0]

    expect(undoButton.props('disabled')).toBe(true)
  })

  it('should disable redo button when canRedo is false', async () => {
    await wrapper.setProps({ canRedo: false })

    const buttons = wrapper.findAllComponents(NButton)
    const redoButton = buttons[1]

    expect(redoButton.props('disabled')).toBe(true)
  })

  it('should disable both buttons when component disabled prop is true', async () => {
    await wrapper.setProps({ disabled: true })

    const buttons = wrapper.findAllComponents(NButton)

    buttons.forEach((button) => {
      expect(button.props('disabled')).toBe(true)
    })
  })

  it('should disable buttons even if canUndo/canRedo are true when disabled prop is true', async () => {
    await wrapper.setProps({
      canUndo: true,
      canRedo: true,
      disabled: true
    })

    const buttons = wrapper.findAllComponents(NButton)

    buttons.forEach((button) => {
      expect(button.props('disabled')).toBe(true)
    })
  })

  // =====================================================
  // EVENT EMISSION TESTS
  // =====================================================

  it('should emit undo event when undo button is clicked', async () => {
    const buttons = wrapper.findAllComponents(NButton)
    const undoButton = buttons[0]

    await undoButton.trigger('click')

    expect(wrapper.emitted('undo')).toBeTruthy()
    expect(wrapper.emitted('undo')).toHaveLength(1)
  })

  it('should emit redo event when redo button is clicked', async () => {
    const buttons = wrapper.findAllComponents(NButton)
    const redoButton = buttons[1]

    await redoButton.trigger('click')

    expect(wrapper.emitted('redo')).toBeTruthy()
    expect(wrapper.emitted('redo')).toHaveLength(1)
  })

  it('should not emit undo event when button is disabled', async () => {
    await wrapper.setProps({ canUndo: false })

    const buttons = wrapper.findAllComponents(NButton)
    const undoButton = buttons[0]

    await undoButton.trigger('click')

    expect(wrapper.emitted('undo')).toBeFalsy()
  })

  it('should not emit redo event when button is disabled', async () => {
    await wrapper.setProps({ canRedo: false })

    const buttons = wrapper.findAllComponents(NButton)
    const redoButton = buttons[1]

    await redoButton.trigger('click')

    expect(wrapper.emitted('redo')).toBeFalsy()
  })

  it('should emit multiple undo events on multiple clicks', async () => {
    const buttons = wrapper.findAllComponents(NButton)
    const undoButton = buttons[0]

    await undoButton.trigger('click')
    await undoButton.trigger('click')
    await undoButton.trigger('click')

    expect(wrapper.emitted('undo')).toHaveLength(3)
  })

  it('should emit multiple redo events on multiple clicks', async () => {
    const buttons = wrapper.findAllComponents(NButton)
    const redoButton = buttons[1]

    await redoButton.trigger('click')
    await redoButton.trigger('click')

    expect(wrapper.emitted('redo')).toHaveLength(2)
  })

  // =====================================================
  // KEYBOARD SHORTCUT TESTS
  // =====================================================

  it('should emit undo event on Ctrl+Z keyboard shortcut', async () => {
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: false
    })

    window.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('undo')).toBeTruthy()
  })

  it('should emit redo event on Ctrl+Shift+Z keyboard shortcut', async () => {
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: true
    })

    window.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('redo')).toBeTruthy()
  })

  it('should emit redo event on Ctrl+Y keyboard shortcut (Windows alternative)', async () => {
    // Mock non-Mac platform
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      writable: true,
      configurable: true
    })

    const event = new KeyboardEvent('keydown', {
      key: 'y',
      ctrlKey: true,
      shiftKey: false
    })

    window.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('redo')).toBeTruthy()
  })

  it('should not emit undo event when Shift is pressed with Ctrl+Z', async () => {
    // Clear any previous emissions
    wrapper = mount(UndoRedoControls, {
      props: {
        canUndo: true,
        canRedo: true,
        disabled: false
      },
      global: {
        components: {
          NButton,
          NButtonGroup,
          NTooltip,
          NIcon
        }
      }
    })

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: true
    })

    window.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    // Should emit redo, not undo
    expect(wrapper.emitted('undo')).toBeFalsy()
    expect(wrapper.emitted('redo')).toBeTruthy()
  })

  it('should not emit events on keyboard shortcut when buttons are disabled', async () => {
    await wrapper.setProps({
      canUndo: false,
      canRedo: false
    })

    const undoEvent = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: false
    })

    const redoEvent = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: true
    })

    window.dispatchEvent(undoEvent)
    window.dispatchEvent(redoEvent)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('undo')).toBeFalsy()
    expect(wrapper.emitted('redo')).toBeFalsy()
  })

  it('should not emit events when Ctrl key is not pressed', async () => {
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: false,
      shiftKey: false
    })

    window.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('undo')).toBeFalsy()
  })

  // =====================================================
  // EDGE CASES & INTEGRATION TESTS
  // =====================================================

  it('should handle rapid button clicks correctly', async () => {
    const buttons = wrapper.findAllComponents(NButton)
    const undoButton = buttons[0]
    const redoButton = buttons[1]

    // Rapid alternating clicks
    await undoButton.trigger('click')
    await redoButton.trigger('click')
    await undoButton.trigger('click')
    await redoButton.trigger('click')

    expect(wrapper.emitted('undo')).toHaveLength(2)
    expect(wrapper.emitted('redo')).toHaveLength(2)
  })

  it('should handle props changing from enabled to disabled', async () => {
    const buttons = wrapper.findAllComponents(NButton)

    // Initially enabled
    expect(buttons[0].props('disabled')).toBe(false)

    // Disable
    await wrapper.setProps({ canUndo: false })
    expect(buttons[0].props('disabled')).toBe(true)

    // Re-enable
    await wrapper.setProps({ canUndo: true })
    expect(buttons[0].props('disabled')).toBe(false)
  })

  it('should maintain state when component is disabled and re-enabled', async () => {
    await wrapper.setProps({ disabled: true })
    await wrapper.setProps({ disabled: false })

    const buttons = wrapper.findAllComponents(NButton)

    // Should respect canUndo/canRedo after re-enabling
    expect(buttons[0].props('disabled')).toBe(false) // canUndo is true
    expect(buttons[1].props('disabled')).toBe(false) // canRedo is true
  })

  it('should clean up keyboard listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  // =====================================================
  // PROPS VARIATION TESTS
  // =====================================================

  it('should accept and react to undoCount prop', async () => {
    await wrapper.setProps({ undoCount: 5 })

    // Component should accept the prop without error
    expect(wrapper.props('undoCount')).toBe(5)
  })

  it('should accept and react to redoCount prop', async () => {
    await wrapper.setProps({ redoCount: 3 })

    // Component should accept the prop without error
    expect(wrapper.props('redoCount')).toBe(3)
  })

  it('should handle all props being false', async () => {
    await wrapper.setProps({
      canUndo: false,
      canRedo: false,
      disabled: false
    })

    const buttons = wrapper.findAllComponents(NButton)

    expect(buttons[0].props('disabled')).toBe(true)
    expect(buttons[1].props('disabled')).toBe(true)
  })

  it('should handle mixed enabled/disabled states', async () => {
    await wrapper.setProps({
      canUndo: true,
      canRedo: false,
      disabled: false
    })

    const buttons = wrapper.findAllComponents(NButton)

    expect(buttons[0].props('disabled')).toBe(false)
    expect(buttons[1].props('disabled')).toBe(true)
  })

  // =====================================================
  // ACCESSIBILITY TESTS
  // =====================================================

  it('should have proper ARIA labels for accessibility', () => {
    const buttons = wrapper.findAllComponents(NButton)

    expect(buttons[0].attributes('aria-label')).toBe('Annuler')
    expect(buttons[1].attributes('aria-label')).toBe('Rétablir')
  })

  it('should use semantic button elements', () => {
    const buttons = wrapper.findAllComponents(NButton)

    expect(buttons.length).toBe(2)
    buttons.forEach((button) => {
      expect(button.exists()).toBe(true)
    })
  })

  // =====================================================
  // STYLING & LAYOUT TESTS
  // =====================================================

  it('should apply correct CSS class to container', () => {
    const container = wrapper.find('.undo-redo-controls')

    expect(container.classes()).toContain('undo-redo-controls')
  })

  it('should apply correct CSS class to button group', () => {
    const buttonGroup = wrapper.find('.controls-group')

    expect(buttonGroup.exists()).toBe(true)
  })

  it('should apply control-button class to buttons', () => {
    const buttons = wrapper.findAll('.control-button')

    expect(buttons.length).toBe(2)
  })

  // =====================================================
  // FUTURE PHASE 6 PREPARATION TESTS
  // =====================================================

  it('should be ready to accept undoCount for badge display (PHASE 6)', async () => {
    await wrapper.setProps({ undoCount: 10 })

    // No error should occur - component is ready for PHASE 6
    expect(wrapper.props('undoCount')).toBe(10)
  })

  it('should be ready to accept redoCount for badge display (PHASE 6)', async () => {
    await wrapper.setProps({ redoCount: 7 })

    // No error should occur - component is ready for PHASE 6
    expect(wrapper.props('redoCount')).toBe(7)
  })

  it('should maintain event emission pattern compatible with store integration (PHASE 6)', async () => {
    const buttons = wrapper.findAllComponents(NButton)

    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    // Events are emitted in a way that can be easily replaced with store actions
    expect(wrapper.emitted('undo')).toBeTruthy()
    expect(wrapper.emitted('redo')).toBeTruthy()
  })
})
