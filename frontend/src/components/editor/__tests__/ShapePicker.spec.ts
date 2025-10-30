import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ShapePicker from '../ShapePicker.vue'
import pageElementService from '@/services/pageElementService'
import type { IPageElement } from '@/types/models'

/**
 * Test suite for ShapePicker component
 *
 * Tests shape selection, color customization, opacity control,
 * API integration, and event emissions for the shape creation picker (US04)
 *
 * Note: Ces tests se concentrent sur la logique métier et les événements
 * plutôt que sur le rendu visuel, car NaiveUI utilise des portals (teleport)
 * qui sont difficiles à tester avec Vue Test Utils.
 */

// Mock du service pageElementService
vi.mock('@/services/pageElementService', () => ({
  default: {
    createPageElement: vi.fn()
  }
}))

// Mock de NaiveUI pour le message service
const mockMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}

describe('ShapePicker.vue', () => {
  let wrapper: any

  /**
   * Props par défaut pour les tests
   * Simule un contexte d'ajout de forme à une page
   */
  const defaultProps = {
    pageId: '123e4567-e89b-12d3-a456-426614174000',
    x: 100,
    y: 50,
    width: 80,
    height: 80
  }

  /**
   * Setup avant chaque test
   * Monte le composant avec les props et mocks nécessaires
   */
  beforeEach(() => {
    // Réinitialiser les mocks
    vi.clearAllMocks()

    // Mock du message service global
    global.window = Object.create(window)
    Object.defineProperty(window, '$message', {
      value: mockMessage,
      writable: true
    })

    wrapper = mount(ShapePicker, {
      props: defaultProps,
      global: {
        plugins: [createPinia()]
      }
    })
  })

  // =====================================================
  // COMPONENT INITIALIZATION TESTS
  // =====================================================

  it('initializes with correct default values', () => {
    const vm = wrapper.vm as any

    // Vérifier les valeurs par défaut
    expect(vm.selectedShape).toBe('circle')
    expect(vm.fillColor).toBe('#3B82F6')
    expect(vm.opacity).toBe(100)
    expect(vm.isLoading).toBe(false)
    expect(vm.showModal).toBe(true)
  })

  it('receives correct props', () => {
    expect(wrapper.props('pageId')).toBe(defaultProps.pageId)
    expect(wrapper.props('x')).toBe(defaultProps.x)
    expect(wrapper.props('y')).toBe(defaultProps.y)
    expect(wrapper.props('width')).toBe(defaultProps.width)
    expect(wrapper.props('height')).toBe(defaultProps.height)
  })

  // =====================================================
  // SHAPE SELECTION TESTS
  // =====================================================

  it('changes selected shape when selectShape is called', async () => {
    const vm = wrapper.vm as any

    // Changer la forme sélectionnée
    vm.selectShape('square')
    await flushPromises()

    expect(vm.selectedShape).toBe('square')
  })

  it('updates currentShape computed when selectedShape changes', async () => {
    const vm = wrapper.vm as any

    // Initialement, c'est un cercle
    expect(vm.currentShape.type).toBe('circle')
    expect(vm.currentShape.label).toBe('Cercle')

    // Changer pour un triangle
    vm.selectedShape = 'triangle'
    await flushPromises()

    expect(vm.currentShape.type).toBe('triangle')
    expect(vm.currentShape.label).toBe('Triangle')
  })

  it('has all 5 shape options available', () => {
    const vm = wrapper.vm as any

    expect(vm.shapeOptions).toHaveLength(5)
    expect(vm.shapeOptions.map((s: any) => s.type)).toEqual([
      'circle',
      'square',
      'rectangle',
      'triangle',
      'heart'
    ])
  })

  // =====================================================
  // COLOR CUSTOMIZATION TESTS
  // =====================================================

  it('updates fillColor when changed', async () => {
    const vm = wrapper.vm as any

    vm.fillColor = '#FF0000'
    await flushPromises()

    expect(vm.fillColor).toBe('#FF0000')
  })

  it('updates previewStyle computed when fillColor changes', async () => {
    const vm = wrapper.vm as any

    vm.fillColor = '#00FF00'
    await flushPromises()

    expect(vm.previewStyle.fill).toBe('#00FF00')
  })

  // =====================================================
  // OPACITY CONTROL TESTS
  // =====================================================

  it('updates opacity when changed', async () => {
    const vm = wrapper.vm as any

    vm.opacity = 50
    await flushPromises()

    expect(vm.opacity).toBe(50)
  })

  it('updates previewStyle computed when opacity changes', async () => {
    const vm = wrapper.vm as any

    vm.opacity = 75
    await flushPromises()

    expect(vm.previewStyle.opacity).toBe(0.75)
  })

  it('handles opacity at minimum value (0)', async () => {
    const vm = wrapper.vm as any

    vm.opacity = 0
    await flushPromises()

    expect(vm.opacity).toBe(0)
    expect(vm.previewStyle.opacity).toBe(0)
  })

  it('handles opacity at maximum value (100)', async () => {
    const vm = wrapper.vm as any

    vm.opacity = 100
    await flushPromises()

    expect(vm.opacity).toBe(100)
    expect(vm.previewStyle.opacity).toBe(1)
  })

  // =====================================================
  // PREVIEW STYLE TESTS
  // =====================================================

  it('calculates previewStyle correctly with all properties', async () => {
    const vm = wrapper.vm as any

    vm.fillColor = '#FF69B4'
    vm.opacity = 60
    await flushPromises()

    const style = vm.previewStyle

    expect(style.fill).toBe('#FF69B4')
    expect(style.opacity).toBe(0.6)
    expect(style.transition).toBe('all 0.3s ease')
  })

  // =====================================================
  // API INTEGRATION TESTS
  // =====================================================

  it('calls createPageElement with correct data when handleAddShape is called', async () => {
    const vm = wrapper.vm as any

    // Mock de la réponse de l'API
    const mockElement: IPageElement = {
      id: 'element-123',
      pageId: defaultProps.pageId,
      type: 'shape',
      x: defaultProps.x,
      y: defaultProps.y,
      width: defaultProps.width,
      height: defaultProps.height,
      rotation: 0,
      zIndex: 0,
      content: {},
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementService.createPageElement).mockResolvedValue(mockElement)

    // Appeler handleAddShape
    await vm.handleAddShape()
    await flushPromises()

    // Vérifier que l'API a été appelée avec les bonnes données
    expect(pageElementService.createPageElement).toHaveBeenCalledWith({
      pageId: defaultProps.pageId,
      type: 'shape',
      x: defaultProps.x,
      y: defaultProps.y,
      width: defaultProps.width,
      height: defaultProps.height,
      rotation: 0,
      shapeType: 'circle',
      fillColor: '#3B82F6',
      opacity: 100
    })
  })

  it('emits added event with created element on API success', async () => {
    const vm = wrapper.vm as any

    const mockElement: IPageElement = {
      id: 'element-123',
      pageId: defaultProps.pageId,
      type: 'shape',
      x: defaultProps.x,
      y: defaultProps.y,
      width: defaultProps.width,
      height: defaultProps.height,
      rotation: 0,
      zIndex: 0,
      content: {},
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementService.createPageElement).mockResolvedValue(mockElement)

    await vm.handleAddShape()
    await flushPromises()

    // Vérifier que l'événement 'added' a été émis
    expect(wrapper.emitted('added')).toBeTruthy()
    expect(wrapper.emitted('added')[0]).toEqual([mockElement])
  })

  it('shows success message after successful shape creation', async () => {
    const vm = wrapper.vm as any

    const mockElement: IPageElement = {
      id: 'element-123',
      pageId: defaultProps.pageId,
      type: 'shape',
      x: defaultProps.x,
      y: defaultProps.y,
      width: defaultProps.width,
      height: defaultProps.height,
      rotation: 0,
      zIndex: 0,
      content: {},
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementService.createPageElement).mockResolvedValue(mockElement)

    await vm.handleAddShape()
    await flushPromises()

    // Vérifier que le message de succès a été affiché
    expect(mockMessage.success).toHaveBeenCalledWith(
      expect.stringContaining('ajoutée avec succès')
    )
  })

  it('shows error message when API call fails', async () => {
    const vm = wrapper.vm as any

    // Mock d'une erreur API
    vi.mocked(pageElementService.createPageElement).mockRejectedValue(
      new Error('Network error')
    )

    await vm.handleAddShape()
    await flushPromises()

    // Vérifier que le message d'erreur a été affiché
    expect(mockMessage.error).toHaveBeenCalledWith(
      expect.stringContaining('erreur')
    )
  })

  it('closes modal after successful shape creation', async () => {
    const vm = wrapper.vm as any

    const mockElement: IPageElement = {
      id: 'element-123',
      pageId: defaultProps.pageId,
      type: 'shape',
      x: defaultProps.x,
      y: defaultProps.y,
      width: defaultProps.width,
      height: defaultProps.height,
      rotation: 0,
      zIndex: 0,
      content: {},
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementService.createPageElement).mockResolvedValue(mockElement)

    expect(vm.showModal).toBe(true)

    await vm.handleAddShape()
    await flushPromises()

    expect(vm.showModal).toBe(false)
  })

  it('sets loading state during API call', async () => {
    const vm = wrapper.vm as any

    // Mock d'une API lente
    let resolvePromise: any
    vi.mocked(pageElementService.createPageElement).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve
      })
    )

    expect(vm.isLoading).toBe(false)

    // Démarrer l'appel API
    const promise = vm.handleAddShape()

    // Attendre un tick pour que isLoading soit mis à jour
    await flushPromises()

    expect(vm.isLoading).toBe(true)

    // Résoudre la promesse
    resolvePromise({
      id: 'element-123',
      pageId: defaultProps.pageId,
      type: 'shape',
      x: defaultProps.x,
      y: defaultProps.y,
      width: defaultProps.width,
      height: defaultProps.height,
      rotation: 0,
      zIndex: 0,
      content: {},
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    await promise
    await flushPromises()

    expect(vm.isLoading).toBe(false)
  })

  it('prevents multiple simultaneous API calls', async () => {
    const vm = wrapper.vm as any

    const mockElement: IPageElement = {
      id: 'element-123',
      pageId: defaultProps.pageId,
      type: 'shape',
      x: defaultProps.x,
      y: defaultProps.y,
      width: defaultProps.width,
      height: defaultProps.height,
      rotation: 0,
      zIndex: 0,
      content: {},
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementService.createPageElement).mockResolvedValue(mockElement)

    // Manuellement mettre isLoading à true
    vm.isLoading = true

    await vm.handleAddShape()
    await flushPromises()

    // L'API ne devrait pas avoir été appelée car isLoading était true
    expect(pageElementService.createPageElement).not.toHaveBeenCalled()
  })

  // =====================================================
  // CANCEL TESTS
  // =====================================================

  it('emits cancel event when handleCancel is called', async () => {
    const vm = wrapper.vm as any

    vm.handleCancel()
    await flushPromises()

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('closes modal when handleCancel is called', async () => {
    const vm = wrapper.vm as any

    expect(vm.showModal).toBe(true)

    vm.handleCancel()
    await flushPromises()

    expect(vm.showModal).toBe(false)
  })

  it('emits cancel when handleModalClose is called', async () => {
    const vm = wrapper.vm as any

    vm.handleModalClose()
    await flushPromises()

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  // =====================================================
  // INTEGRATION TEST: Complete workflow
  // =====================================================

  it('completes full workflow: select shape, customize, and add', async () => {
    const vm = wrapper.vm as any

    // 1. Sélectionner un coeur
    vm.selectShape('heart')
    await flushPromises()

    // 2. Changer la couleur en rose
    vm.fillColor = '#FF69B4'
    await flushPromises()

    // 3. Ajuster l'opacité à 75%
    vm.opacity = 75
    await flushPromises()

    // 4. Mock de la réponse API
    const mockElement: IPageElement = {
      id: 'element-heart',
      pageId: defaultProps.pageId,
      type: 'shape',
      x: defaultProps.x,
      y: defaultProps.y,
      width: defaultProps.width,
      height: defaultProps.height,
      rotation: 0,
      zIndex: 0,
      content: {},
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementService.createPageElement).mockResolvedValue(mockElement)

    // 5. Appeler handleAddShape
    await vm.handleAddShape()
    await flushPromises()

    // 6. Vérifier que l'API a été appelée avec les données correctes
    expect(pageElementService.createPageElement).toHaveBeenCalledWith({
      pageId: defaultProps.pageId,
      type: 'shape',
      x: defaultProps.x,
      y: defaultProps.y,
      width: defaultProps.width,
      height: defaultProps.height,
      rotation: 0,
      shapeType: 'heart',
      fillColor: '#FF69B4',
      opacity: 75
    })

    // 7. Vérifier que l'événement a été émis
    expect(wrapper.emitted('added')).toBeTruthy()

    // 8. Vérifier le message de succès
    expect(mockMessage.success).toHaveBeenCalledWith(
      expect.stringContaining('coeur')
    )

    // 9. Vérifier que le modal est fermé
    expect(vm.showModal).toBe(false)
  })
})
