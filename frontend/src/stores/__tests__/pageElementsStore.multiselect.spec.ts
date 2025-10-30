/**
 * Unit tests for multi-select functionality (TASK29)
 *
 * Tests the new multi-selection system that allows users to select multiple elements
 * via Ctrl+Click and perform bulk operations on selected elements.
 *
 * Coverage:
 * - Multi-select toggle (Ctrl+Click)
 * - Select multiple elements
 * - Select all elements on page
 * - Deselect all elements
 * - Check if element is selected
 * - Get selected count
 * - Get selected elements
 * - Delete all selected elements
 *
 * @module stores/__tests__/pageElementsStore.multiselect.spec
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePageElementsStore } from '@/stores/pageElementsStore'
import type { IPageElement } from '@/types/models'

/**
 * Mock page element for testing
 */
const createMockElement = (id: string, type: string = 'text'): IPageElement => ({
  id,
  pageId: 'page-123',
  type: type as any,
  x: Math.random() * 200,
  y: Math.random() * 200,
  width: 100,
  height: 100,
  rotation: 0,
  zIndex: 1,
  content: { text: `Element ${id}` },
  style: {},
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

describe('PageElementsStore - Multi-Selection (TASK29)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========================================
  // TOGGLE ELEMENT SELECTION
  // ========================================

  describe('toggleElementSelection (Ctrl+Click)', () => {
    it('should add element to selection when not selected', () => {
      const store = usePageElementsStore()
      const element = createMockElement('element-1')

      // Add element to store first
      store.elements = [element]

      // Toggle selection (add)
      store.toggleElementSelection(element.id)

      expect(store.selectedElementIds).toContain(element.id)
      expect(store.getSelectedCount()).toBe(1)
    })

    it('should remove element from selection when already selected', () => {
      const store = usePageElementsStore()
      const element = createMockElement('element-1')

      store.elements = [element]
      store.selectedElementIds = [element.id]

      // Toggle selection (remove)
      store.toggleElementSelection(element.id)

      expect(store.selectedElementIds).not.toContain(element.id)
      expect(store.getSelectedCount()).toBe(0)
    })

    it('should preserve other selections when adding', () => {
      const store = usePageElementsStore()
      const element1 = createMockElement('element-1')
      const element2 = createMockElement('element-2')

      store.elements = [element1, element2]
      store.selectedElementIds = [element1.id]

      // Add element2 to selection
      store.toggleElementSelection(element2.id)

      expect(store.selectedElementIds).toContain(element1.id)
      expect(store.selectedElementIds).toContain(element2.id)
      expect(store.getSelectedCount()).toBe(2)
    })

    it('should preserve other selections when removing', () => {
      const store = usePageElementsStore()
      const element1 = createMockElement('element-1')
      const element2 = createMockElement('element-2')
      const element3 = createMockElement('element-3')

      store.elements = [element1, element2, element3]
      store.selectedElementIds = [element1.id, element2.id, element3.id]

      // Remove element2 from selection
      store.toggleElementSelection(element2.id)

      expect(store.selectedElementIds).toContain(element1.id)
      expect(store.selectedElementIds).not.toContain(element2.id)
      expect(store.selectedElementIds).toContain(element3.id)
      expect(store.getSelectedCount()).toBe(2)
    })
  })

  // ========================================
  // SELECT MULTIPLE
  // ========================================

  describe('selectMultiple', () => {
    it('should set selection to provided array', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.elements = elements

      store.selectMultiple([elements[0].id, elements[1].id])

      expect(store.selectedElementIds).toEqual([elements[0].id, elements[1].id])
      expect(store.getSelectedCount()).toBe(2)
    })

    it('should replace existing selection', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.elements = elements
      store.selectedElementIds = [elements[0].id]

      store.selectMultiple([elements[1].id, elements[2].id])

      expect(store.selectedElementIds).toEqual([elements[1].id, elements[2].id])
      expect(store.getSelectedCount()).toBe(2)
    })

    it('should handle empty array', () => {
      const store = usePageElementsStore()
      const elements = [createMockElement('element-1')]

      store.elements = elements
      store.selectedElementIds = [elements[0].id]

      store.selectMultiple([])

      expect(store.selectedElementIds).toEqual([])
      expect(store.getSelectedCount()).toBe(0)
    })
  })

  // ========================================
  // SELECT ALL
  // ========================================

  describe('selectAll', () => {
    it('should select all elements on page', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.elements = elements

      store.selectAll()

      expect(store.getSelectedCount()).toBe(3)
      expect(store.selectedElementIds).toContain(elements[0].id)
      expect(store.selectedElementIds).toContain(elements[1].id)
      expect(store.selectedElementIds).toContain(elements[2].id)
    })

    it('should replace previous selection', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.elements = elements
      store.selectedElementIds = [elements[0].id]

      store.selectAll()

      expect(store.getSelectedCount()).toBe(3)
    })

    it('should handle empty page', () => {
      const store = usePageElementsStore()

      store.elements = []

      store.selectAll()

      expect(store.getSelectedCount()).toBe(0)
      expect(store.selectedElementIds).toEqual([])
    })
  })

  // ========================================
  // DESELECT ALL
  // ========================================

  describe('deselectAll', () => {
    it('should clear all selections', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.elements = elements
      store.selectedElementIds = [elements[0].id, elements[1].id, elements[2].id]

      store.deselectAll()

      expect(store.selectedElementIds).toEqual([])
      expect(store.getSelectedCount()).toBe(0)
    })

    it('should handle already empty selection', () => {
      const store = usePageElementsStore()

      store.selectedElementIds = []

      store.deselectAll()

      expect(store.selectedElementIds).toEqual([])
    })
  })

  // ========================================
  // IS SELECTED
  // ========================================

  describe('isSelected', () => {
    it('should return true for selected element', () => {
      const store = usePageElementsStore()
      const element = createMockElement('element-1')

      store.selectedElementIds = [element.id]

      expect(store.isSelected(element.id)).toBe(true)
    })

    it('should return false for unselected element', () => {
      const store = usePageElementsStore()
      const element = createMockElement('element-1')

      store.selectedElementIds = []

      expect(store.isSelected(element.id)).toBe(false)
    })

    it('should handle multiple selections', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.selectedElementIds = [elements[0].id, elements[2].id]

      expect(store.isSelected(elements[0].id)).toBe(true)
      expect(store.isSelected(elements[1].id)).toBe(false)
      expect(store.isSelected(elements[2].id)).toBe(true)
    })
  })

  // ========================================
  // GET SELECTED COUNT
  // ========================================

  describe('getSelectedCount', () => {
    it('should return number of selected elements', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.elements = elements

      store.selectMultiple([elements[0].id, elements[1].id])

      expect(store.getSelectedCount()).toBe(2)
    })

    it('should return 0 when no elements selected', () => {
      const store = usePageElementsStore()

      store.selectedElementIds = []

      expect(store.getSelectedCount()).toBe(0)
    })

    it('should return correct count after operations', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.elements = elements

      // Start with empty
      expect(store.getSelectedCount()).toBe(0)

      // Add one
      store.toggleElementSelection(elements[0].id)
      expect(store.getSelectedCount()).toBe(1)

      // Add another
      store.toggleElementSelection(elements[1].id)
      expect(store.getSelectedCount()).toBe(2)

      // Remove one
      store.toggleElementSelection(elements[0].id)
      expect(store.getSelectedCount()).toBe(1)
    })
  })

  // ========================================
  // GET SELECTED ELEMENTS
  // ========================================

  describe('getSelectedElements', () => {
    it('should return array of selected elements', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.elements = elements
      store.selectMultiple([elements[0].id, elements[2].id])

      const selected = store.getSelectedElements

      expect(selected.length).toBe(2)
      expect(selected[0].id).toBe(elements[0].id)
      expect(selected[1].id).toBe(elements[2].id)
    })

    it('should return empty array when no elements selected', () => {
      const store = usePageElementsStore()

      store.elements = []
      store.selectedElementIds = []

      const selected = store.getSelectedElements

      expect(selected).toEqual([])
    })

    it('should preserve order of selection', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.elements = elements
      store.selectMultiple([elements[2].id, elements[0].id, elements[1].id])

      const selected = store.getSelectedElements

      expect(selected[0].id).toBe(elements[2].id)
      expect(selected[1].id).toBe(elements[0].id)
      expect(selected[2].id).toBe(elements[1].id)
    })

    it('should handle invalid IDs gracefully', () => {
      const store = usePageElementsStore()
      const elements = [createMockElement('element-1')]

      store.elements = elements
      store.selectedElementIds = ['element-1', 'invalid-id']

      const selected = store.getSelectedElements

      // Should only return valid elements
      expect(selected.length).toBe(1)
      expect(selected[0].id).toBe('element-1')
    })
  })

  // ========================================
  // MULTI-SELECT WITH SINGLE SELECT
  // ========================================

  describe('selectElement with multi-select context', () => {
    it('should replace multi-selection with single element', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2'),
        createMockElement('element-3')
      ]

      store.elements = elements
      store.selectMultiple([elements[0].id, elements[1].id, elements[2].id])

      // Single select should replace
      store.selectElement(elements[1].id)

      expect(store.selectedElementIds).toEqual([elements[1].id])
      expect(store.getSelectedCount()).toBe(1)
    })

    it('should work with getSelectedElement getter', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2')
      ]

      store.elements = elements
      store.selectMultiple([elements[0].id, elements[1].id])

      // First element is considered the "primary" selection
      const primary = store.getSelectedElement

      expect(primary?.id).toBe(elements[0].id)
    })
  })

  // ========================================
  // SELECTION EDGE CASES
  // ========================================

  describe('edge cases', () => {
    it('should handle selecting non-existent element', () => {
      const store = usePageElementsStore()
      const element = createMockElement('element-1')

      store.elements = [element]

      store.selectElement('non-existent')

      expect(store.selectedElementIds).toEqual(['non-existent'])
    })

    it('should handle duplicate IDs in selectedElementIds', () => {
      const store = usePageElementsStore()
      const element = createMockElement('element-1')

      store.elements = [element]
      store.selectedElementIds = [element.id, element.id]

      // Toggle should only remove one instance
      store.toggleElementSelection(element.id)

      expect(store.selectedElementIds).toContain(element.id)
    })

    it('should maintain reactivity across operations', () => {
      const store = usePageElementsStore()
      const elements = [
        createMockElement('element-1'),
        createMockElement('element-2')
      ]

      store.elements = elements

      const count1 = store.getSelectedCount()
      store.toggleElementSelection(elements[0].id)
      const count2 = store.getSelectedCount()
      store.toggleElementSelection(elements[1].id)
      const count3 = store.getSelectedCount()

      expect(count1).toBe(0)
      expect(count2).toBe(1)
      expect(count3).toBe(2)
    })
  })
})
