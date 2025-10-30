/**
 * Unit tests for useCanvasSnap composable (US04-TASK26)
 *
 * Tests couvrent :
 * - Détection d'alignement avec différents layouts
 * - Calcul des points de snap
 * - Logique de seuil de snap
 * - Application des corrections de snap
 * - Gestion des guides visuels
 * - Performance avec nombreux éléments
 * - Snaps simultanés (horizontal + vertical)
 * - Cache et invalidation
 *
 * Convention de nommage pour les tests :
 * - should [expected behavior] when [condition]
 * - Exemple: should snap to left edge when element is 5px away
 *
 * @group useCanvasSnap
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCanvasSnap } from '../useCanvasSnap'
import type { IPageElement } from '@/types/pageElement'

// ========================================
// TEST DATA & HELPERS
// ========================================

/**
 * Facteur de conversion mm -> px pour les tests
 */
const MM_TO_PX = 3.7795275591

/**
 * Crée un élément de page fictif pour les tests
 *
 * @param overrides - Propriétés à surcharger
 * @returns IPageElement complet pour les tests
 */
const createTestElement = (overrides?: Partial<IPageElement>): IPageElement => {
  return {
    id: 'elem-' + Math.random().toString(36).substr(2, 9),
    pageId: 'page-1',
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 1,
    content: { text: 'Test' },
    style: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Crée un DOMRect fictif pour simuler un élément en déplacement
 *
 * @param left - Position left en pixels
 * @param top - Position top en pixels
 * @param width - Largeur en pixels
 * @param height - Hauteur en pixels
 * @returns DOMRect simule
 */
const createTestDOMRect = (
  left: number,
  top: number,
  width: number,
  height: number
): DOMRect => {
  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({})
  }
}

// ========================================
// TEST SUITES
// ========================================

describe('useCanvasSnap - Composable', () => {
  let composable: ReturnType<typeof useCanvasSnap>

  beforeEach(() => {
    composable = useCanvasSnap()
  })

  afterEach(() => {
    composable.clearSnapGuides()
    vi.clearAllTimers()
  })

  // ========================================
  // SNAP POINTS CALCULATION
  // ========================================

  describe('calculateSnapPoints', () => {
    it('should return empty array when no elements provided', () => {
      const snapPoints = composable.calculateSnapPoints([])

      expect(snapPoints).toEqual([])
    })

    it('should generate 6 snap points per element', () => {
      const element = createTestElement({
        id: 'test-elem',
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])

      expect(snapPoints).toHaveLength(6)
      expect(snapPoints.every(sp => sp.elementId === 'test-elem')).toBe(true)
    })

    it('should correctly calculate left edge snap point', () => {
      const element = createTestElement({
        x: 50,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const leftPoint = snapPoints.find(sp => sp.type === 'left')

      expect(leftPoint).toBeDefined()
      expect(leftPoint!.value).toBe(50 * MM_TO_PX)
    })

    it('should correctly calculate right edge snap point', () => {
      const element = createTestElement({
        x: 50,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const rightPoint = snapPoints.find(sp => sp.type === 'right')

      expect(rightPoint).toBeDefined()
      expect(rightPoint!.value).toBe((50 + 100) * MM_TO_PX)
    })

    it('should correctly calculate center-x snap point', () => {
      const element = createTestElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const centerXPoint = snapPoints.find(sp => sp.type === 'center-x')

      expect(centerXPoint).toBeDefined()
      expect(centerXPoint!.value).toBe((0 + 100 / 2) * MM_TO_PX)
    })

    it('should correctly calculate top edge snap point', () => {
      const element = createTestElement({
        x: 0,
        y: 50,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const topPoint = snapPoints.find(sp => sp.type === 'top')

      expect(topPoint).toBeDefined()
      expect(topPoint!.value).toBe(50 * MM_TO_PX)
    })

    it('should correctly calculate bottom edge snap point', () => {
      const element = createTestElement({
        x: 0,
        y: 50,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const bottomPoint = snapPoints.find(sp => sp.type === 'bottom')

      expect(bottomPoint).toBeDefined()
      expect(bottomPoint!.value).toBe((50 + 100) * MM_TO_PX)
    })

    it('should correctly calculate center-y snap point', () => {
      const element = createTestElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const centerYPoint = snapPoints.find(sp => sp.type === 'center-y')

      expect(centerYPoint).toBeDefined()
      expect(centerYPoint!.value).toBe((0 + 100 / 2) * MM_TO_PX)
    })

    it('should generate correct number of snap points for multiple elements', () => {
      const elements = [
        createTestElement({ id: 'elem1' }),
        createTestElement({ id: 'elem2' }),
        createTestElement({ id: 'elem3' })
      ]

      const snapPoints = composable.calculateSnapPoints(elements)

      expect(snapPoints).toHaveLength(18) // 6 points * 3 elements
    })

    it('should cache snap points and return cached value on second call', () => {
      const elements = [createTestElement()]

      const snapPoints1 = composable.calculateSnapPoints(elements)
      const snapPoints2 = composable.calculateSnapPoints(elements)

      // Same reference (cached)
      expect(snapPoints1).toStrictEqual(snapPoints2)
    })

    it('should invalidate cache when element list changes', () => {
      const element1 = createTestElement({ id: 'elem1' })
      const element2 = createTestElement({ id: 'elem2' })

      const snapPoints1 = composable.calculateSnapPoints([element1])
      const snapPoints2 = composable.calculateSnapPoints([element1, element2])

      // Devrait être différent car la liste a changé
      expect(snapPoints1).not.toBe(snapPoints2)
      expect(snapPoints2).toHaveLength(12) // 6 points * 2 elements
    })
  })

  // ========================================
  // ALIGNMENT DETECTION
  // ========================================

  describe('detectAlignment', () => {
    it('should return null when no snap points provided', () => {
      const rect = createTestDOMRect(0, 0, 100, 100)

      const result = composable.detectAlignment(rect, [])

      expect(result).toBeNull()
    })

    it('should detect left edge alignment', () => {
      const element = createTestElement({
        x: 100,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const draggingRect = createTestDOMRect(100 * MM_TO_PX + 5, 0, 100, 100)

      const result = composable.detectAlignment(draggingRect, snapPoints)

      expect(result).not.toBeNull()
      expect(result!.horizontal).not.toBeNull()
      expect(result!.horizontal!.type).toBe('left')
      expect(result!.horizontal!.distance).toBe(5)
    })

    it('should detect right edge alignment', () => {
      const element = createTestElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const targetRight = 100 * MM_TO_PX
      const draggingRect = createTestDOMRect(targetRight - 100 - 7, 0, 100, 100)

      const result = composable.detectAlignment(draggingRect, snapPoints)

      expect(result).not.toBeNull()
      expect(result!.horizontal).not.toBeNull()
      expect(result!.horizontal!.type).toBe('right')
      expect(result!.horizontal!.distance).toBe(7)
    })

    it('should detect center-x alignment', () => {
      const element = createTestElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const centerX = (0 + 100 / 2) * MM_TO_PX
      const draggingRect = createTestDOMRect(centerX - 50 + 3, 0, 100, 100)

      const result = composable.detectAlignment(draggingRect, snapPoints)

      expect(result).not.toBeNull()
      expect(result!.horizontal).not.toBeNull()
      expect(result!.horizontal!.type).toBe('center-x')
      expect(result!.horizontal!.distance).toBe(3)
    })

    it('should detect top edge alignment', () => {
      const element = createTestElement({
        x: 0,
        y: 100,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const topY = 100 * MM_TO_PX
      const draggingRect = createTestDOMRect(0, topY + 4, 100, 100)

      const result = composable.detectAlignment(draggingRect, snapPoints)

      expect(result).not.toBeNull()
      expect(result!.vertical).not.toBeNull()
      expect(result!.vertical!.type).toBe('top')
      expect(result!.vertical!.distance).toBe(4)
    })

    it('should detect bottom edge alignment', () => {
      const element = createTestElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const bottomY = 100 * MM_TO_PX
      const draggingRect = createTestDOMRect(0, bottomY - 100 - 8, 100, 100)

      const result = composable.detectAlignment(draggingRect, snapPoints)

      expect(result).not.toBeNull()
      expect(result!.vertical).not.toBeNull()
      expect(result!.vertical!.type).toBe('bottom')
      expect(result!.vertical!.distance).toBe(8)
    })

    it('should detect center-y alignment', () => {
      const element = createTestElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      const centerY = (0 + 100 / 2) * MM_TO_PX
      const draggingRect = createTestDOMRect(0, centerY - 50 + 2, 100, 100)

      const result = composable.detectAlignment(draggingRect, snapPoints)

      expect(result).not.toBeNull()
      expect(result!.vertical).not.toBeNull()
      expect(result!.vertical!.type).toBe('center-y')
      expect(result!.vertical!.distance).toBe(2)
    })

    it('should detect simultaneous horizontal and vertical alignments', () => {
      const element = createTestElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])

      // Draggin element aligned both horizontally and vertically
      const centerX = (0 + 100 / 2) * MM_TO_PX
      const centerY = (0 + 100 / 2) * MM_TO_PX
      const draggingRect = createTestDOMRect(centerX - 50 + 3, centerY - 50 + 2, 100, 100)

      const result = composable.detectAlignment(draggingRect, snapPoints)

      expect(result).not.toBeNull()
      expect(result!.horizontal).not.toBeNull()
      expect(result!.vertical).not.toBeNull()
      expect(result!.horizontal!.type).toBe('center-x')
      expect(result!.vertical!.type).toBe('center-y')
    })

    it('should return null when both alignments exceed threshold', () => {
      const element = createTestElement({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])
      // Element 50px away horizontally AND vertically (beyond 10px threshold)
      const draggingRect = createTestDOMRect(100 * MM_TO_PX + 50, 100 * MM_TO_PX + 50, 100, 100)

      const result = composable.detectAlignment(draggingRect, snapPoints)

      expect(result).toBeNull()
    })

    it('should find closest alignment when multiple options available', () => {
      const elements = [
        createTestElement({ id: 'elem1', x: 0, y: 0, width: 100, height: 100 }),
        createTestElement({ id: 'elem2', x: 200, y: 0, width: 100, height: 100 })
      ]

      const snapPoints = composable.calculateSnapPoints(elements)

      // Dragging element closer to elem2 left edge
      const elem2Left = 200 * MM_TO_PX
      const draggingRect = createTestDOMRect(elem2Left + 3, 0, 100, 100)

      const result = composable.detectAlignment(draggingRect, snapPoints)

      expect(result!.horizontal!.distance).toBe(3)
    })
  })

  // ========================================
  // SNAP THRESHOLD LOGIC
  // ========================================

  describe('shouldSnap', () => {
    it('should return true when distance is at threshold', () => {
      const result = composable.shouldSnap(10)

      expect(result).toBe(true)
    })

    it('should return true when distance is below threshold', () => {
      const result = composable.shouldSnap(5)

      expect(result).toBe(true)
    })

    it('should return true when distance is 1px below threshold', () => {
      const result = composable.shouldSnap(9)

      expect(result).toBe(true)
    })

    it('should return false when distance exceeds threshold', () => {
      const result = composable.shouldSnap(11)

      expect(result).toBe(false)
    })

    it('should return true when distance is 0 (exact match)', () => {
      const result = composable.shouldSnap(0)

      expect(result).toBe(true)
    })
  })

  // ========================================
  // SNAP APPLICATION
  // ========================================

  describe('applySnap', () => {
    it('should apply horizontal correction when alignment provided', () => {
      const position = { x: 100, y: 100 }
      const alignment = {
        horizontal: {
          type: 'left' as const,
          correctedX: 150,
          distance: 5,
          snapValue: 150
        },
        vertical: null
      }

      const result = composable.applySnap(position, alignment)

      expect(result.x).toBe(150)
      expect(result.y).toBeUndefined()
    })

    it('should apply vertical correction when alignment provided', () => {
      const position = { x: 100, y: 100 }
      const alignment = {
        horizontal: null,
        vertical: {
          type: 'top' as const,
          correctedY: 200,
          distance: 8,
          snapValue: 200
        }
      }

      const result = composable.applySnap(position, alignment)

      expect(result.y).toBe(200)
      expect(result.x).toBeUndefined()
    })

    it('should apply both corrections when both alignments provided', () => {
      const position = { x: 100, y: 100 }
      const alignment = {
        horizontal: {
          type: 'left' as const,
          correctedX: 150,
          distance: 5,
          snapValue: 150
        },
        vertical: {
          type: 'top' as const,
          correctedY: 200,
          distance: 8,
          snapValue: 200
        }
      }

      const result = composable.applySnap(position, alignment)

      expect(result.x).toBe(150)
      expect(result.y).toBe(200)
    })

    it('should not apply correction when distance exceeds threshold', () => {
      const position = { x: 100, y: 100 }
      const alignment = {
        horizontal: {
          type: 'left' as const,
          correctedX: 150,
          distance: 15, // Exceeds 10px threshold
          snapValue: 150
        },
        vertical: null
      }

      const result = composable.applySnap(position, alignment)

      expect(result.x).toBeUndefined()
    })
  })

  // ========================================
  // GUIDES MANAGEMENT
  // ========================================

  describe('getSnapGuides and clearSnapGuides', () => {
    it('should return empty guides initially', () => {
      const guides = composable.getSnapGuides()

      expect(guides.value).toEqual([])
    })

    it('should clear guides when clearSnapGuides called', () => {
      // Add a guide by detecting alignment
      const element = createTestElement({ x: 100, y: 0, width: 100, height: 100 })
      const snapPoints = composable.calculateSnapPoints([element])
      const draggingRect = createTestDOMRect(100 * MM_TO_PX + 5, 0, 100, 100)
      composable.generateSnapGuides(composable.detectAlignment(draggingRect, snapPoints), draggingRect)

      let guides = composable.getSnapGuides()
      expect(guides.value.length).toBeGreaterThan(0)

      // Clear and verify
      composable.clearSnapGuides()
      guides = composable.getSnapGuides()

      expect(guides.value).toEqual([])
    })
  })

  describe('generateSnapGuides', () => {
    it('should return empty guides when no alignments detected', () => {
      const rect = createTestDOMRect(0, 0, 100, 100)
      composable.generateSnapGuides(null, rect)

      const guides = composable.getSnapGuides()
      expect(guides.value).toEqual([])
    })

    it('should generate vertical guide for horizontal alignment', () => {
      const element = createTestElement({ x: 100, y: 0, width: 100, height: 100 })
      const snapPoints = composable.calculateSnapPoints([element])
      const draggingRect = createTestDOMRect(100 * MM_TO_PX + 5, 0, 100, 100)
      const alignment = composable.detectAlignment(draggingRect, snapPoints)

      composable.generateSnapGuides(alignment, draggingRect)

      const guides = composable.getSnapGuides()
      const verticalGuides = guides.value.filter(g => g.type === 'vertical')

      expect(verticalGuides.length).toBeGreaterThan(0)
      expect(verticalGuides[0].visible).toBe(true)
    })

    it('should generate horizontal guide for vertical alignment', () => {
      const element = createTestElement({ x: 0, y: 100, width: 100, height: 100 })
      const snapPoints = composable.calculateSnapPoints([element])
      const topY = 100 * MM_TO_PX
      const draggingRect = createTestDOMRect(0, topY + 4, 100, 100)
      const alignment = composable.detectAlignment(draggingRect, snapPoints)

      composable.generateSnapGuides(alignment, draggingRect)

      const guides = composable.getSnapGuides()
      const horizontalGuides = guides.value.filter(g => g.type === 'horizontal')

      expect(horizontalGuides.length).toBeGreaterThan(0)
      expect(horizontalGuides[0].visible).toBe(true)
    })

    it('should generate both guides for simultaneous alignment', () => {
      const element = createTestElement({ x: 0, y: 0, width: 100, height: 100 })
      const snapPoints = composable.calculateSnapPoints([element])
      const centerX = (0 + 100 / 2) * MM_TO_PX
      const centerY = (0 + 100 / 2) * MM_TO_PX
      const draggingRect = createTestDOMRect(centerX - 50 + 3, centerY - 50 + 2, 100, 100)
      const alignment = composable.detectAlignment(draggingRect, snapPoints)

      composable.generateSnapGuides(alignment, draggingRect)

      const guides = composable.getSnapGuides()

      expect(guides.value.length).toBe(2)
      expect(guides.value.some(g => g.type === 'horizontal')).toBe(true)
      expect(guides.value.some(g => g.type === 'vertical')).toBe(true)
    })
  })

  // ========================================
  // PERFORMANCE TESTS
  // ========================================

  describe('Performance', () => {
    it('should handle 50 elements efficiently', () => {
      const elements: IPageElement[] = Array.from({ length: 50 }, (_, i) =>
        createTestElement({
          id: `elem-${i}`,
          x: i * 150,
          y: i * 150,
          width: 100,
          height: 100
        })
      )

      const startTime = performance.now()
      const snapPoints = composable.calculateSnapPoints(elements)
      const endTime = performance.now()

      // Should complete in less than 50ms
      expect(endTime - startTime).toBeLessThan(50)
      expect(snapPoints).toHaveLength(300) // 50 elements * 6 snap points
    })

    it('should use cache for repeated calculations', () => {
      const elements = Array.from({ length: 20 }, (_, i) =>
        createTestElement({
          id: `elem-${i}`,
          x: i * 150,
          y: i * 150
        })
      )

      // First call (cache miss)
      composable.calculateSnapPoints(elements)

      // Second call (cache hit) - should reuse same result
      const snapPoints1 = composable.calculateSnapPoints(elements)
      const snapPoints2 = composable.calculateSnapPoints(elements)

      // Cache returns same values
      expect(snapPoints1).toStrictEqual(snapPoints2)
    })

    it('should handle alignment detection with 50 snap points', () => {
      const elements = Array.from({ length: 8 }, (_, i) =>
        createTestElement({
          id: `elem-${i}`,
          x: i * 150,
          y: i * 150,
          width: 100,
          height: 100
        })
      )

      const snapPoints = composable.calculateSnapPoints(elements)
      const draggingRect = createTestDOMRect(500, 500, 100, 100)

      const startTime = performance.now()
      composable.detectAlignment(draggingRect, snapPoints)
      const endTime = performance.now()

      // Should complete in less than 10ms
      expect(endTime - startTime).toBeLessThan(10)
    })
  })

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('Integration scenarios', () => {
    it('should handle complete snap workflow: detect -> apply -> guide', () => {
      // Setup
      const element = createTestElement({
        id: 'target',
        x: 100,
        y: 100,
        width: 100,
        height: 100
      })

      // Dragging another element close to the left edge
      const draggingRect = createTestDOMRect(100 * MM_TO_PX + 7, 0, 100, 100)

      // Calculate snap points
      const snapPoints = composable.calculateSnapPoints([element])

      // Detect alignment
      const alignment = composable.detectAlignment(draggingRect, snapPoints)

      // Verify alignment detected
      expect(alignment).not.toBeNull()
      expect(alignment!.horizontal).not.toBeNull()

      // Generate guides
      composable.generateSnapGuides(alignment, draggingRect)

      const guides = composable.getSnapGuides()
      expect(guides.value.length).toBeGreaterThan(0)

      // Apply snap
      const snapped = composable.applySnap(
        { x: draggingRect.left, y: draggingRect.top },
        alignment!
      )

      expect(snapped.x).toBeDefined()

      // Cleanup
      composable.clearSnapGuides()
      expect(composable.getSnapGuides().value).toEqual([])
    })

    it('should handle drag over multiple elements and snap to closest', () => {
      // Create a grid of elements
      const elements = [
        createTestElement({ id: 'left', x: 0, y: 0, width: 50, height: 50 }),
        createTestElement({ id: 'center', x: 100, y: 0, width: 50, height: 50 }),
        createTestElement({ id: 'right', x: 200, y: 0, width: 50, height: 50 })
      ]

      // Dragging element near center-right edge
      const centerRightEdge = (100 + 50) * MM_TO_PX
      const draggingRect = createTestDOMRect(centerRightEdge + 3, 0, 50, 50)

      const snapPoints = composable.calculateSnapPoints(elements)
      const alignment = composable.detectAlignment(draggingRect, snapPoints)

      // Should detect alignment
      expect(alignment).not.toBeNull()
      if (alignment?.horizontal) {
        expect(alignment.horizontal.distance).toBeLessThan(10)
      }
    })

    it('should handle rapid movement debouncing', (done: () => void): void => {
      let callCount = 0

      const callback = () => {
        callCount++
      }

      // Simulate rapid movements
      for (let i = 0; i < 10; i++) {
        composable.debounceSnapDetection(callback)
      }

      // Callback should only be called once after debounce delay
      setTimeout(() => {
        expect(callCount).toBe(1)
        done()
      }, 100)
    })
  })

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge cases', () => {
    it('should handle zero-size elements gracefully', () => {
      const element = createTestElement({
        width: 0,
        height: 0
      })

      const snapPoints = composable.calculateSnapPoints([element])

      expect(snapPoints).toHaveLength(6)
      expect(snapPoints.every(sp => typeof sp.value === 'number')).toBe(true)
    })

    it('should handle negative positions', () => {
      const element = createTestElement({
        x: -50,
        y: -50,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])

      expect(snapPoints).toHaveLength(6)
      expect(snapPoints.some(sp => sp.value < 0)).toBe(true)
    })

    it('should handle very large coordinates', () => {
      const element = createTestElement({
        x: 10000,
        y: 10000,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])

      expect(snapPoints).toHaveLength(6)
      expect(snapPoints.every(sp => sp.value > 0)).toBe(true)
    })

    it('should handle decimal positions from mm conversion', () => {
      const element = createTestElement({
        x: 123.456,
        y: 789.012,
        width: 50.5,
        height: 60.7
      })

      const snapPoints = composable.calculateSnapPoints([element])

      expect(snapPoints).toHaveLength(6)
      expect(snapPoints.every(sp => typeof sp.value === 'number')).toBe(true)
    })

    it('should handle alignment with exact match (distance 0)', () => {
      const element = createTestElement({
        x: 100,
        y: 0,
        width: 100,
        height: 100
      })

      const snapPoints = composable.calculateSnapPoints([element])

      // Perfect alignment with left edge
      const exactLeft = 100 * MM_TO_PX
      const draggingRect = createTestDOMRect(exactLeft, 0, 100, 100)

      const result = composable.detectAlignment(draggingRect, snapPoints)

      expect(result!.horizontal!.distance).toBe(0)
      expect(composable.shouldSnap(0)).toBe(true)
    })
  })

  // ========================================
  // CACHE MANAGEMENT
  // ========================================

  describe('Cache invalidation', () => {
    it('should invalidate cache when requested', () => {
      const elements = [createTestElement()]

      // Calculate and cache
      const snapPoints1 = composable.calculateSnapPoints(elements)

      // Invalidate
      composable.invalidateSnapPointsCache()

      // Calculate again (not cached)
      const snapPoints2 = composable.calculateSnapPoints(elements)

      // Should be different objects (not cached)
      expect(snapPoints1).not.toBe(snapPoints2)
      // But should have same values
      expect(snapPoints1).toEqual(snapPoints2)
    })

    it('should automatically invalidate when element count changes', () => {
      const element1 = createTestElement({ id: 'elem1' })
      const element2 = createTestElement({ id: 'elem2' })

      const snapPoints1 = composable.calculateSnapPoints([element1])
      const snapPoints2 = composable.calculateSnapPoints([element1, element2])

      // Should be different
      expect(snapPoints1).not.toBe(snapPoints2)
      expect(snapPoints2.length).toBeGreaterThan(snapPoints1.length)
    })

    it('should automatically invalidate when element IDs change', () => {
      const element1 = createTestElement({ id: 'elem-a' })
      const element1Modified = createTestElement({ id: 'elem-b' })

      const snapPoints1 = composable.calculateSnapPoints([element1])
      const snapPoints2 = composable.calculateSnapPoints([element1Modified])

      expect(snapPoints1).not.toBe(snapPoints2)
    })
  })

  // ========================================
  // EXPORT VERIFICATION
  // ========================================

  describe('Exports and API', () => {
    it('should export all required functions', () => {
      expect(typeof composable.calculateSnapPoints).toBe('function')
      expect(typeof composable.detectAlignment).toBe('function')
      expect(typeof composable.shouldSnap).toBe('function')
      expect(typeof composable.applySnap).toBe('function')
      expect(typeof composable.detectAndApplySnap).toBe('function')
      expect(typeof composable.getSnapGuides).toBe('function')
      expect(typeof composable.clearSnapGuides).toBe('function')
      expect(typeof composable.generateSnapGuides).toBe('function')
    })

    it('should export constants for testing', () => {
      expect(composable.SNAP_THRESHOLD_PX).toBe(10)
      expect(composable.SNAP_DEBOUNCE_MS).toBe(50)
      expect(composable.MM_TO_PX).toBe(MM_TO_PX)
    })
  })
})
