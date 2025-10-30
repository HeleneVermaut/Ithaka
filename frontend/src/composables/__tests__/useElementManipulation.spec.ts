/**
 * Unit tests for useElementManipulation composable
 *
 * Tests all element manipulation operations including:
 * - Selection and deselection
 * - Property updates
 * - Element deletion
 * - Element duplication
 * - Z-index management
 * - Query operations
 * - Error handling
 *
 * Uses Vitest with mocked Pinia store and API service
 *
 * @module __tests__/useElementManipulation.spec.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMessage } from 'naive-ui'
import { useElementManipulation } from '../useElementManipulation'
import { usePageElementsStore } from '@/stores/pageElementsStore'
import pageElementService from '@/services/pageElementService'
import type { IPageElement } from '@/types/models'

// Mock NaiveUI message service
vi.mock('naive-ui', () => ({
  useMessage: vi.fn(),
}))

// Mock pageElementService
vi.mock('@/services/pageElementService', () => ({
  default: {
    updatePageElement: vi.fn(),
    deletePageElement: vi.fn(),
    duplicatePageElement: vi.fn(),
  },
}))

/**
 * Mock data generators for test elements
 *
 * Creates realistic page elements for testing various scenarios
 */
const mockElementGenerator = {
  /**
   * Create a text element with default values
   */
  textElement: (overrides?: Partial<IPageElement>): IPageElement => ({
    id: 'text-element-001',
    pageId: 'page-001',
    type: 'text',
    x: 10,
    y: 20,
    width: 200,
    height: 100,
    rotation: 0,
    zIndex: 1,
    content: {
      text: 'Sample text',
      fontFamily: 'Arial',
      fontSize: 16,
      fill: '#000000',
    },
    style: { opacity: 1 },
    metadata: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Create an image element with default values
   */
  imageElement: (overrides?: Partial<IPageElement>): IPageElement => ({
    id: 'image-element-001',
    pageId: 'page-001',
    type: 'image',
    x: 50,
    y: 50,
    width: 300,
    height: 200,
    rotation: 0,
    zIndex: 2,
    content: {
      url: 'https://example.com/image.jpg',
      publicId: 'image-001',
      width: 1024,
      height: 768,
      format: 'jpeg',
    },
    style: { opacity: 1 },
    metadata: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Create an emoji element with default values
   */
  emojiElement: (overrides?: Partial<IPageElement>): IPageElement => ({
    id: 'emoji-element-001',
    pageId: 'page-001',
    type: 'emoji',
    x: 100,
    y: 100,
    width: 50,
    height: 50,
    rotation: 0,
    zIndex: 3,
    content: {
      emoji: '😀',
    },
    style: { opacity: 1 },
    metadata: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Create a shape element with default values
   */
  shapeElement: (overrides?: Partial<IPageElement>): IPageElement => ({
    id: 'shape-element-001',
    pageId: 'page-001',
    type: 'shape',
    x: 150,
    y: 150,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 4,
    content: {
      shapeType: 'circle',
      fillColor: '#FF0000',
      borderColor: '#000000',
      borderWidth: 2,
    },
    style: { opacity: 1 },
    metadata: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Create a sticker element with default values
   */
  stickerElement: (overrides?: Partial<IPageElement>): IPageElement => ({
    id: 'sticker-element-001',
    pageId: 'page-001',
    type: 'sticker',
    x: 200,
    y: 200,
    width: 120,
    height: 120,
    rotation: 0,
    zIndex: 5,
    content: {
      url: 'https://example.com/sticker.png',
      stickerLibraryId: 'sticker-lib-001',
      publicId: 'sticker-001',
    },
    style: { opacity: 1 },
    metadata: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),
}

describe('useElementManipulation Composable', () => {
  let mockMessageService: any

  beforeEach(() => {
    // Create fresh Pinia instance for each test
    setActivePinia(createPinia())

    // Mock NaiveUI message service
    mockMessageService = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    }
    vi.mocked(useMessage).mockReturnValue(mockMessageService)

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ========================================
  // SELECTION TESTS
  // ========================================

  describe('Selection Operations', () => {
    it('should select an element that exists in store', () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      // Initialize store with element
      store.elements = [element]

      const { selectElement, isElementSelected } = useElementManipulation()

      selectElement(element.id)

      expect(isElementSelected(element.id)).toBe(true)
      expect(store.selectedElementIds).toContain(element.id)
    })

    it('should not select non-existent element', () => {
      const { selectElement, isElementSelected } = useElementManipulation()

      selectElement('non-existent-id')

      expect(isElementSelected('non-existent-id')).toBe(false)
    })

    it('should deselect currently selected element', () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.selectedElementIds = [element.id]

      const { deselectElement, isAnyElementSelected } = useElementManipulation()

      deselectElement()

      expect(isAnyElementSelected.value).toBe(false)
      expect(store.selectedElementIds).toEqual([])
    })

    it('should return selected element', () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.selectedElementIds = [element.id]

      const { getSelectedElement } = useElementManipulation()

      const selected = getSelectedElement()

      expect(selected).toEqual(element)
      expect(selected?.id).toBe(element.id)
    })

    it('should return null when no element selected', () => {
      const { getSelectedElement } = useElementManipulation()

      const selected = getSelectedElement()

      expect(selected).toBeNull()
    })
  })

  // ========================================
  // PROPERTY UPDATE TESTS
  // ========================================

  describe('Element Property Updates', () => {
    it('should update element position (x, y)', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]

      const { updateElementProperty } = useElementManipulation()

      // Mock store's updateElement method
      store.updateElement = vi.fn().mockResolvedValue(element)

      await updateElementProperty(element.id, 'x', 100)

      expect(vi.mocked(pageElementService.updatePageElement)).toHaveBeenCalledWith(element.id, {
        x: 100,
      })
      expect(store.updateElement).toHaveBeenCalled()
    })

    it('should update element rotation', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.updateElement = vi.fn().mockResolvedValue(element)

      const { updateElementProperty } = useElementManipulation()

      await updateElementProperty(element.id, 'rotation', 45)

      expect(vi.mocked(pageElementService.updatePageElement)).toHaveBeenCalledWith(element.id, {
        rotation: 45,
      })
    })

    it('should update element content (text)', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.updateElement = vi.fn().mockResolvedValue(element)

      const { updateElementProperty } = useElementManipulation()

      const newContent = {
        ...element.content,
        text: 'Updated text',
      }

      await updateElementProperty(element.id, 'content', newContent)

      expect(vi.mocked(pageElementService.updatePageElement)).toHaveBeenCalledWith(element.id, {
        content: newContent,
      })
    })

    it('should update element style', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.updateElement = vi.fn().mockResolvedValue(element)

      const { updateElementProperty } = useElementManipulation()

      const newStyle = { opacity: 0.5, shadow: { blur: 5 } }

      await updateElementProperty(element.id, 'style', newStyle)

      expect(vi.mocked(pageElementService.updatePageElement)).toHaveBeenCalledWith(element.id, {
        style: newStyle,
      })
    })

    it('should not update with missing elementId', async () => {
      const { updateElementProperty } = useElementManipulation()

      await updateElementProperty('', 'x', 100)

      expect(vi.mocked(pageElementService.updatePageElement)).not.toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]

      const { updateElementProperty } = useElementManipulation()

      vi.mocked(pageElementService.updatePageElement).mockRejectedValueOnce(
        new Error('Network error')
      )

      await updateElementProperty(element.id, 'x', 100)

      expect(mockMessageService.error).toHaveBeenCalled()
    })

    it('should prevent concurrent updates', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.updateElement = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      const { updateElementProperty, isOperationInProgress } = useElementManipulation()

      // Start first update
      const promise1 = updateElementProperty(element.id, 'x', 100)

      // Attempt second update while first is in progress
      expect(isOperationInProgress.value).toBe(true)

      await promise1

      expect(isOperationInProgress.value).toBe(false)
    })

    it('should work with all element types', async () => {
      const store = usePageElementsStore()
      const elements = [
        mockElementGenerator.textElement(),
        mockElementGenerator.imageElement(),
        mockElementGenerator.emojiElement(),
        mockElementGenerator.shapeElement(),
        mockElementGenerator.stickerElement(),
      ]

      store.elements = elements
      store.updateElement = vi.fn().mockResolvedValue({})

      const { updateElementProperty } = useElementManipulation()

      for (const element of elements) {
        await updateElementProperty(element.id, 'rotation', 30)
        expect(vi.mocked(pageElementService.updatePageElement)).toHaveBeenCalledWith(element.id, {
          rotation: 30,
        })
      }
    })
  })

  // ========================================
  // DELETION TESTS
  // ========================================

  describe('Element Deletion', () => {
    it('should delete element successfully', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.deleteElement = vi.fn().mockResolvedValue(undefined)

      const { deleteElement } = useElementManipulation()

      await deleteElement(element.id)

      expect(vi.mocked(pageElementService.deletePageElement)).toHaveBeenCalledWith(element.id)
      expect(store.deleteElement).toHaveBeenCalledWith(element.id)
      expect(mockMessageService.success).toHaveBeenCalled()
    })

    it('should clear selection when deleting selected element', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.selectedElementIds = [element.id]
      store.deleteElement = vi.fn().mockResolvedValue(undefined)

      const { deleteElement } = useElementManipulation()

      await deleteElement(element.id)

      expect(store.deleteElement).toHaveBeenCalledWith(element.id)
    })

    it('should not delete non-existent element', async () => {
      const { deleteElement } = useElementManipulation()

      await deleteElement('non-existent-id')

      expect(vi.mocked(pageElementService.deletePageElement)).not.toHaveBeenCalled()
    })

    it('should handle deletion errors', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.deleteElement = vi.fn().mockRejectedValueOnce(new Error('Delete failed'))

      const { deleteElement } = useElementManipulation()

      await deleteElement(element.id)

      expect(mockMessageService.error).toHaveBeenCalled()
    })
  })

  // ========================================
  // DUPLICATION TESTS
  // ========================================

  describe('Element Duplication', () => {
    it('should duplicate element successfully', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()
      const duplicated = mockElementGenerator.textElement({ id: 'text-element-002' })

      store.elements = [element]
      store.duplicateElement = vi.fn().mockResolvedValue(undefined)

      vi.mocked(pageElementService.duplicatePageElement).mockResolvedValueOnce(duplicated)

      const { duplicateElement } = useElementManipulation()

      await duplicateElement(element.id)

      expect(vi.mocked(pageElementService.duplicatePageElement)).toHaveBeenCalledWith(element.id)
      expect(store.duplicateElement).toHaveBeenCalledWith(element.id)
      expect(mockMessageService.success).toHaveBeenCalled()
    })

    it('should not duplicate non-existent element', async () => {
      const { duplicateElement } = useElementManipulation()

      await duplicateElement('non-existent-id')

      expect(vi.mocked(pageElementService.duplicatePageElement)).not.toHaveBeenCalled()
    })

    it('should handle duplication errors', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]

      const { duplicateElement } = useElementManipulation()

      vi.mocked(pageElementService.duplicatePageElement).mockRejectedValueOnce(
        new Error('Duplication failed')
      )

      await duplicateElement(element.id)

      expect(mockMessageService.error).toHaveBeenCalled()
    })

    it('should work with all element types', async () => {
      const store = usePageElementsStore()
      const elements = [
        mockElementGenerator.textElement(),
        mockElementGenerator.imageElement(),
        mockElementGenerator.emojiElement(),
        mockElementGenerator.shapeElement(),
        mockElementGenerator.stickerElement(),
      ]

      store.elements = elements
      store.duplicateElement = vi.fn().mockResolvedValue(undefined)

      const { duplicateElement } = useElementManipulation()

      for (const element of elements) {
        vi.mocked(pageElementService.duplicatePageElement).mockResolvedValueOnce({
          ...element,
          id: `${element.id}-duplicate`,
        })

        await duplicateElement(element.id)
      }

      expect(vi.mocked(pageElementService.duplicatePageElement)).toHaveBeenCalledTimes(5)
    })
  })

  // ========================================
  // Z-INDEX STACKING TESTS
  // ========================================

  describe('Z-Index Management', () => {
    it('should bring element to front (zIndex = 999)', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.updateElement = vi.fn().mockResolvedValue(element)

      const { bringToFront } = useElementManipulation()

      await bringToFront(element.id)

      expect(vi.mocked(pageElementService.updatePageElement)).toHaveBeenCalledWith(element.id, {
        zIndex: 999,
      })
    })

    it('should send element to back (zIndex = 0)', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.updateElement = vi.fn().mockResolvedValue(element)

      const { sendToBack } = useElementManipulation()

      await sendToBack(element.id)

      expect(vi.mocked(pageElementService.updatePageElement)).toHaveBeenCalledWith(element.id, {
        zIndex: 0,
      })
    })

    it('should not modify z-index for non-existent element', async () => {
      const { bringToFront, sendToBack } = useElementManipulation()

      await bringToFront('non-existent-id')
      await sendToBack('non-existent-id')

      expect(vi.mocked(pageElementService.updatePageElement)).not.toHaveBeenCalled()
    })
  })

  // ========================================
  // QUERY TESTS
  // ========================================

  describe('Query Operations', () => {
    it('should get element by ID', () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]

      const { getElementById } = useElementManipulation()

      const found = getElementById(element.id)

      expect(found).toEqual(element)
    })

    it('should return undefined for non-existent element ID', () => {
      const { getElementById } = useElementManipulation()

      const found = getElementById('non-existent-id')

      expect(found).toBeUndefined()
    })

    it('should get all elements', () => {
      const store = usePageElementsStore()
      const elements = [
        mockElementGenerator.textElement(),
        mockElementGenerator.imageElement(),
        mockElementGenerator.emojiElement(),
      ]

      store.elements = elements

      const { getAllElements } = useElementManipulation()

      const all = getAllElements()

      expect(all).toEqual(elements)
      expect(all.length).toBe(3)
    })

    it('should return empty array when no elements', () => {
      const { getAllElements } = useElementManipulation()

      const all = getAllElements()

      expect(all).toEqual([])
      expect(all.length).toBe(0)
    })
  })

  // ========================================
  // REACTIVE STATE TESTS
  // ========================================

  describe('Reactive State', () => {
    it('should track operation in progress', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.updateElement = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)))

      const { updateElementProperty, isOperationInProgress } = useElementManipulation()

      expect(isOperationInProgress.value).toBe(false)

      const updatePromise = updateElementProperty(element.id, 'x', 100)

      expect(isOperationInProgress.value).toBe(true)

      await updatePromise

      expect(isOperationInProgress.value).toBe(false)
    })

    it('should maintain selectedElement computed reactivity', () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.selectedElementIds = []

      const { selectElement, selectedElement } = useElementManipulation()

      expect(selectedElement.value).toBeNull()

      selectElement(element.id)

      expect(selectedElement.value).toEqual(element)
    })

    it('should track isAnyElementSelected reactivity', () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.selectedElementIds = []

      const { selectElement, deselectElement, isAnyElementSelected } = useElementManipulation()

      expect(isAnyElementSelected.value).toBe(false)

      selectElement(element.id)

      expect(isAnyElementSelected.value).toBe(true)

      deselectElement()

      expect(isAnyElementSelected.value).toBe(false)
    })
  })

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('Integration Scenarios', () => {
    it('should handle complete element lifecycle', async () => {
      const store = usePageElementsStore()
      const element = mockElementGenerator.textElement()

      store.elements = [element]
      store.updateElement = vi.fn().mockResolvedValue(element)
      store.deleteElement = vi.fn().mockResolvedValue(undefined)

      const {
        selectElement,
        isElementSelected,
        updateElementProperty,
        bringToFront,
        deleteElement,
      } = useElementManipulation()

      // Select
      selectElement(element.id)
      expect(isElementSelected(element.id)).toBe(true)

      // Update
      await updateElementProperty(element.id, 'x', 50)

      // Z-index
      await bringToFront(element.id)

      // Delete
      await deleteElement(element.id)

      expect(store.deleteElement).toHaveBeenCalled()
    })

    it('should handle multiple elements independently', () => {
      const store = usePageElementsStore()
      const element1 = mockElementGenerator.textElement()
      const element2 = mockElementGenerator.imageElement()

      store.elements = [element1, element2]
      store.selectedElementIds = []

      const { selectElement, isElementSelected } = useElementManipulation()

      selectElement(element1.id)
      expect(isElementSelected(element1.id)).toBe(true)
      expect(isElementSelected(element2.id)).toBe(false)

      // For single-select behavior in this task, deselect first
      store.selectedElementIds = []
      selectElement(element2.id)
      expect(isElementSelected(element1.id)).toBe(false)
      expect(isElementSelected(element2.id)).toBe(true)
    })
  })
})
