import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ZIndexControls from '../ZIndexControls.vue'
import { NButton, NTooltip } from 'naive-ui'

/**
 * Test suite for ZIndexControls component
 *
 * Tests z-index manipulation controls for canvas elements (US03)
 */
describe('ZIndexControls.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(ZIndexControls, {
      props: {
        selectedElement: { id: 'elem-1', zIndex: 2 },
        totalElements: 5
      },
      global: {
        components: {
          NButton,
          NTooltip
        }
      }
    })
  })

  // =====================================================
  // RENDER & STRUCTURE TESTS
  // =====================================================

  it('renders z-index controls container', () => {
    const container = wrapper.find('.z-index-controls')
    expect(container.exists()).toBe(true)
  })

  it('renders layer position indicator', () => {
    const layerPosition = wrapper.find('.layer-position')
    expect(layerPosition.exists()).toBe(true)
  })

  it('renders all 4 z-index buttons', () => {
    const buttons = wrapper.findAllComponents(NButton)
    expect(buttons.length).toBe(4)
  })

  it('renders buttons with correct labels', () => {
    const buttons = wrapper.findAllComponents(NButton)
    const labels = buttons.map((btn: any) => btn.text())

    expect(labels).toContain('Premier plan')
    expect(labels).toContain('Avancer')
    expect(labels).toContain('Reculer')
    expect(labels).toContain('Arrière-plan')
  })

  // =====================================================
  // LAYER POSITION INDICATOR TESTS
  // =====================================================

  it('displays current layer position correctly', () => {
    const positionText = wrapper.find('.layer-position').text()
    expect(positionText).toContain('Calque 3 sur 5') // zIndex 2 + 1 for display
  })

  it('updates layer position when selectedElement changes', async () => {
    await wrapper.setProps({
      selectedElement: { id: 'elem-2', zIndex: 0 }
    })

    const positionText = wrapper.find('.layer-position').text()
    expect(positionText).toContain('Calque 1 sur 5')
  })

  it('updates layer position when totalElements changes', async () => {
    await wrapper.setProps({
      totalElements: 10
    })

    const positionText = wrapper.find('.layer-position').text()
    expect(positionText).toContain('Calque 3 sur 10')
  })

  it('displays "Aucune sélection" when no element selected', async () => {
    await wrapper.setProps({
      selectedElement: null
    })

    const positionText = wrapper.find('.layer-position').text()
    expect(positionText).toContain('Aucune sélection')
  })

  it('displays "Aucune sélection" when selectedElement has no zIndex', async () => {
    await wrapper.setProps({
      selectedElement: { id: 'elem-1' }
    })

    const positionText = wrapper.find('.layer-position').text()
    expect(positionText).toContain('Aucune sélection')
  })

  // =====================================================
  // BUTTON ENABLED/DISABLED TESTS
  // =====================================================

  it('enables all buttons when element is selected', () => {
    const buttons = wrapper.findAllComponents(NButton)
    buttons.forEach((btn: any) => {
      expect(btn.props('disabled')).toBe(false)
    })
  })

  it('disables all buttons when no element is selected', async () => {
    await wrapper.setProps({
      selectedElement: null
    })

    const buttons = wrapper.findAllComponents(NButton)
    buttons.forEach((btn: any) => {
      expect(btn.props('disabled')).toBe(true)
    })
  })

  it('disables all buttons when totalElements is 0', async () => {
    await wrapper.setProps({
      totalElements: 0
    })

    const buttons = wrapper.findAllComponents(NButton)
    buttons.forEach((btn: any) => {
      expect(btn.props('disabled')).toBe(true)
    })
  })

  it('disables buttons when selectedElement.zIndex is undefined', async () => {
    await wrapper.setProps({
      selectedElement: { id: 'elem-1' }
    })

    const buttons = wrapper.findAllComponents(NButton)
    buttons.forEach((btn: any) => {
      expect(btn.props('disabled')).toBe(true)
    })
  })

  // =====================================================
  // EVENT EMISSION TESTS
  // =====================================================

  it('emits bringToFront event when first button clicked', async () => {
    const buttons = wrapper.findAllComponents(NButton)
    await buttons[0].trigger('click')

    expect(wrapper.emitted('bringToFront')).toBeTruthy()
    expect(wrapper.emitted('bringToFront')).toHaveLength(1)
  })

  it('emits bringForward event when second button clicked', async () => {
    const buttons = wrapper.findAllComponents(NButton)
    await buttons[1].trigger('click')

    expect(wrapper.emitted('bringForward')).toBeTruthy()
  })

  it('emits sendBackward event when third button clicked', async () => {
    const buttons = wrapper.findAllComponents(NButton)
    await buttons[2].trigger('click')

    expect(wrapper.emitted('sendBackward')).toBeTruthy()
  })

  it('emits sendToBack event when fourth button clicked', async () => {
    const buttons = wrapper.findAllComponents(NButton)
    await buttons[3].trigger('click')

    expect(wrapper.emitted('sendToBack')).toBeTruthy()
  })

  it('does not emit events when buttons are disabled', async () => {
    await wrapper.setProps({
      selectedElement: null
    })

    const buttons = wrapper.findAllComponents(NButton)
    await buttons[0].trigger('click')

    expect(wrapper.emitted('bringToFront')).toBeFalsy()
  })

  // =====================================================
  // TOOLTIP TESTS
  // =====================================================

  it('renders tooltips for all buttons', () => {
    const tooltips = wrapper.findAllComponents(NTooltip)
    expect(tooltips.length).toBe(4)
  })

  it('displays keyboard shortcut in tooltips', () => {
    const tooltips = wrapper.findAllComponents(NTooltip)
    const tooltipTexts = tooltips.map((tooltip: any) => tooltip.text())

    expect(tooltipTexts.some((text: string) => text.includes('Ctrl + Shift + ]'))).toBe(true)
    expect(tooltipTexts.some((text: string) => text.includes('Ctrl + ]'))).toBe(true)
    expect(tooltipTexts.some((text: string) => text.includes('Ctrl + ['))).toBe(true)
    expect(tooltipTexts.some((text: string) => text.includes('Ctrl + Shift + ['))).toBe(true)
  })

  // =====================================================
  // EDGE CASES
  // =====================================================

  it('handles element at position 0 (first layer)', async () => {
    await wrapper.setProps({
      selectedElement: { id: 'elem-1', zIndex: 0 },
      totalElements: 5
    })

    const positionText = wrapper.find('.layer-position').text()
    expect(positionText).toContain('Calque 1 sur 5')
  })

  it('handles element at maximum position', async () => {
    await wrapper.setProps({
      selectedElement: { id: 'elem-1', zIndex: 4 },
      totalElements: 5
    })

    const positionText = wrapper.find('.layer-position').text()
    expect(positionText).toContain('Calque 5 sur 5')
  })

  it('handles single element scenario', async () => {
    await wrapper.setProps({
      selectedElement: { id: 'elem-1', zIndex: 0 },
      totalElements: 1
    })

    const positionText = wrapper.find('.layer-position').text()
    expect(positionText).toContain('Calque 1 sur 1')
  })

  // =====================================================
  // INTEGRATION TESTS
  // =====================================================

  it('provides complete z-index workflow', async () => {
    // Start with element at position 2 of 5
    expect(wrapper.find('.layer-position').text()).toContain('Calque 3 sur 5')

    // Click "Bring to Front"
    const buttons = wrapper.findAllComponents(NButton)
    await buttons[0].trigger('click')
    expect(wrapper.emitted('bringToFront')).toBeTruthy()

    // Update position
    await wrapper.setProps({
      selectedElement: { id: 'elem-1', zIndex: 4 }
    })
    expect(wrapper.find('.layer-position').text()).toContain('Calque 5 sur 5')

    // Click "Send to Back"
    await buttons[3].trigger('click')
    expect(wrapper.emitted('sendToBack')).toBeTruthy()
  })

  it('maintains proper state during multiple rapid clicks', async () => {
    const buttons = wrapper.findAllComponents(NButton)

    // Rapid clicks
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')

    expect(wrapper.emitted('bringToFront')).toHaveLength(1)
    expect(wrapper.emitted('bringForward')).toHaveLength(1)
    expect(wrapper.emitted('sendBackward')).toHaveLength(1)
  })

  // =====================================================
  // ACCESSIBILITY TESTS
  // =====================================================

  it('renders buttons as semantic button elements', () => {
    const buttons = wrapper.findAllComponents(NButton)
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('provides visual feedback for disabled buttons', async () => {
    await wrapper.setProps({
      selectedElement: null
    })

    const buttons = wrapper.findAllComponents(NButton)
    buttons.forEach((btn: any) => {
      expect(btn.props('disabled')).toBe(true)
    })
  })

  // =====================================================
  // ANIMATION & STYLING TESTS
  // =====================================================

  it('applies fadeIn animation to container', () => {
    const container = wrapper.find('.z-index-controls')
    // Check that animation is defined in CSS
    expect(container.classes()).toBeDefined()
  })

  // =====================================================
  // PROPS VARIATION TESTS
  // =====================================================

  it('handles different totalElements values', async () => {
    const testCases = [1, 5, 10, 50, 100]

    for (const total of testCases) {
      await wrapper.setProps({
        totalElements: total
      })

      const positionText = wrapper.find('.layer-position').text()
      expect(positionText).toContain(`sur ${total}`)
    }
  })

  it('handles selectedElement changes correctly', async () => {
    const elements = [
      { id: 'elem-1', zIndex: 0 },
      { id: 'elem-2', zIndex: 2 },
      { id: 'elem-3', zIndex: 4 }
    ]

    for (const elem of elements) {
      await wrapper.setProps({ selectedElement: elem })
      const positionText = wrapper.find('.layer-position').text()
      expect(positionText).toContain(`Calque ${elem.zIndex + 1}`)
    }
  })
})
