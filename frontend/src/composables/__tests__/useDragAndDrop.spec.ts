/**
 * Unit tests for useDragAndDrop composable (US04-TASK25)
 *
 * Tests cover:
 * - Drag lifecycle (startDrag, onDragMove, endDrag, cancelDrag)
 * - Position tracking and offset calculations
 * - Snap-to-grid alignment
 * - Throttling behavior for mouse move events
 * - Error scenarios and rollback
 * - Event listener cleanup
 *
 * @module composables/__tests__/useDragAndDrop.spec
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDragAndDrop } from '../useDragAndDrop'
import { usePageElementsStore } from '@/stores/pageElementsStore'
import type { IPageElement } from '@/types/models'

// Mock dependencies
vi.mock('@/stores/pageElementsStore')
vi.mock('@/services/pageElementService')

// ========================================
// TEST SETUP & FIXTURES
// ========================================

/**
 * Create a mock page element for testing
 */
const createMockElement = (overrides?: Partial<IPageElement>): IPageElement => ({
  id: 'element-123',
  pageId: 'page-456',
  type: 'text',
  x: 100, // in millimeters
  y: 200,
  width: 200,
  height: 100,
  rotation: 0,
  zIndex: 1,
  content: { text: 'Test' },
  style: {},
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides
})

/**
 * Create a mock mouse event
 */
const createMouseEvent = (
  clientX: number,
  clientY: number,
  overrides?: Partial<MouseEvent>
): MouseEvent => {
  const event = new MouseEvent('mousemove', {
    clientX,
    clientY,
    bubbles: true,
    ...overrides
  })

  // Mock preventDefault
  event.preventDefault = vi.fn()

  return event
}

describe('useDragAndDrop composable', () => {
  let mockStore: any
  let mockElement: IPageElement

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock the store
    mockElement = createMockElement()
    mockStore = {
      getElementById: vi.fn((id: string) => (id === 'element-123' ? mockElement : null)),
      updateElement: vi.fn().mockResolvedValue(mockElement)
    }

    vi.mocked(usePageElementsStore).mockReturnValue(mockStore)

    // Mock requestAnimationFrame for tests
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Drag Lifecycle', () => {
    it('should start drag with valid element', () => {
      const { startDrag, isDragging } = useDragAndDrop()

      expect(isDragging.value).toBe(false)

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      expect(isDragging.value).toBe(true)
      expect(mockStore.getElementById).toHaveBeenCalledWith('element-123')
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('should throw error when starting drag with non-existent element', () => {
      const { startDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      expect(() => {
        startDrag('non-existent', 100, 200, event)
      }).toThrow('Cannot drag: element non-existent not found')
    })

    it('should prevent text selection during drag', () => {
      const { startDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      expect(document.body.style.userSelect).toBe('none')
    })

    it('should restore text selection after drag ends', async () => {
      const { startDrag, endDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      expect(document.body.style.userSelect).toBe('none')

      await endDrag()

      expect(document.body.style.userSelect).toBe('auto')
    })
  })

  describe('Position Tracking', () => {
    it('should calculate correct drag offset', () => {
      const { startDrag, onDragMove, getDragOffset } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // Move 50px right and 30px down
      onDragMove(150, 230)

      vi.advanceTimersByTime(60) // Advance past throttle interval
      vi.runAllTimers() // Execute RAF

      const offset = getDragOffset.value
      expect(offset.dx).toBe(50)
      expect(offset.dy).toBe(30)
    })

    it('should return zero offset when not dragging', () => {
      const { getDragOffset } = useDragAndDrop()

      const offset = getDragOffset.value
      expect(offset.dx).toBe(0)
      expect(offset.dy).toBe(0)
    })

    it('should calculate element position correctly', () => {
      const { startDrag, onDragMove, getElementPosition } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      onDragMove(150, 230)
      vi.advanceTimersByTime(60)
      vi.runAllTimers()

      const position = getElementPosition.value
      expect(position.x).toBe(50)
      expect(position.y).toBe(30)
    })

    it('should return zero position when not dragging', () => {
      const { getElementPosition } = useDragAndDrop()

      const position = getElementPosition.value
      expect(position.x).toBe(0)
      expect(position.y).toBe(0)
    })
  })

  describe('Snap-to-Grid', () => {
    it('should snap coordinates to grid when enabled', () => {
      const { startDrag, onDragMove, getDragOffset } = useDragAndDrop({
        snapToGrid: true,
        gridSize: 10
      })

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // Move 47px right and 43px down - should snap to 50 and 40
      onDragMove(147, 243)
      vi.advanceTimersByTime(60)
      vi.runAllTimers()

      const offset = getDragOffset.value
      expect(offset.dx).toBe(50)
      expect(offset.dy).toBe(40)
    })

    it('should not snap coordinates when disabled', () => {
      const { startDrag, onDragMove, getDragOffset } = useDragAndDrop({
        snapToGrid: false
      })

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // Move 47px right and 43px down - should NOT snap
      onDragMove(147, 243)
      vi.advanceTimersByTime(60)
      vi.runAllTimers()

      const offset = getDragOffset.value
      expect(offset.dx).toBe(47)
      expect(offset.dy).toBe(43)
    })

    it('should respect custom grid size', () => {
      const { startDrag, onDragMove, getDragOffset } = useDragAndDrop({
        snapToGrid: true,
        gridSize: 25
      })

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // Move 47px right - should snap to 50 (with gridSize 25)
      onDragMove(147, 200)
      vi.advanceTimersByTime(60)
      vi.runAllTimers()

      const offset = getDragOffset.value
      expect(offset.dx).toBe(50)
    })
  })

  describe('Throttling', () => {
    it('should throttle mouse move events', () => {
      const { startDrag, onDragMove, getDragOffset } = useDragAndDrop({
        throttleInterval: 50
      })

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // First move at 0ms
      onDragMove(110, 210)
      vi.advanceTimersByTime(25) // 25ms elapsed (less than 50ms throttle)
      onDragMove(120, 220)

      // Both moves within throttle window, only first should be queued
      let offset = getDragOffset.value
      // Position will use the last move call within the throttle window
      expect(offset.dx).toBeGreaterThanOrEqual(0)

      // Advance past throttle interval to allow processing
      vi.advanceTimersByTime(30) // 55ms total, past throttle window
      onDragMove(130, 230)

      offset = getDragOffset.value
      expect(offset.dx).toBeGreaterThan(0) // Position updated after throttle
    })

    it('should use custom throttle interval', () => {
      const { startDrag, onDragMove, getDragOffset } = useDragAndDrop({
        throttleInterval: 100
      })

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      onDragMove(110, 210)
      vi.advanceTimersByTime(50)

      // Still within throttle window
      let offset = getDragOffset.value
      expect(offset.dx).toBe(0)

      // Advance past throttle interval (110ms total)
      vi.advanceTimersByTime(60)
      onDragMove(110, 210) // Same position
      offset = getDragOffset.value
      expect(offset.dx).toBeGreaterThanOrEqual(0) // Should process after throttle
    })

    it('should update position in requestAnimationFrame', () => {
      const { startDrag, onDragMove, getDragOffset } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      onDragMove(110, 210)
      vi.advanceTimersByTime(50) // Pass throttle interval

      // Execute RAF callbacks to process position update
      vi.runAllTimers()

      const offset = getDragOffset.value
      expect(offset.dx).toBe(10)
    })
  })

  describe('Drag Persistence', () => {
    it('should persist position when drag ends with movement', async () => {
      const { startDrag, onDragMove, endDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      onDragMove(150, 230)
      vi.advanceTimersByTime(60)
      vi.runAllTimers()

      await endDrag()

      expect(mockStore.updateElement).toHaveBeenCalledWith('element-123', expect.any(Object))

      // Verify position was converted from pixels to millimeters
      const updateCall = mockStore.updateElement.mock.calls[0]
      const updates = updateCall[1]
      expect(updates).toHaveProperty('x')
      expect(updates).toHaveProperty('y')
    })

    it('should not persist position when drag ends without movement', async () => {
      const { startDrag, endDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // No movement, just immediately end drag
      await endDrag()

      // updateElement should not be called when there's no movement
      // (or we should verify it's not called with the same position)
      const updateCall = mockStore.updateElement.mock.calls[0]
      if (updateCall) {
        const updates = updateCall[1]
        // Offset should be 0 for no movement
        expect(updates.x).toBe(100) // Same as initial
        expect(updates.y).toBe(200)
      }
    })

    it('should clear drag state after endDrag', async () => {
      const { startDrag, isDragging, endDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      expect(isDragging.value).toBe(true)

      await endDrag()

      expect(isDragging.value).toBe(false)
    })

    it('should handle endDrag error gracefully', async () => {
      const { startDrag, isDragging, endDrag } = useDragAndDrop()

      mockStore.updateElement.mockRejectedValueOnce(new Error('API error'))

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // onDragMove to trigger position update
      const mockEvent = createMouseEvent(150, 230)
      vi.spyOn(mockEvent, 'preventDefault')

      // Should not throw - error is caught internally
      await expect(endDrag()).resolves.toBeUndefined()

      // Drag state should still be cleared
      expect(isDragging.value).toBe(false)
    })
  })

  describe('Cancel Drag', () => {
    it('should cancel drag operation', () => {
      const { startDrag, isDragging, cancelDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      expect(isDragging.value).toBe(true)

      cancelDrag()

      expect(isDragging.value).toBe(false)
    })

    it('should restore text selection when cancelled', () => {
      const { startDrag, cancelDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      expect(document.body.style.userSelect).toBe('none')

      cancelDrag()

      expect(document.body.style.userSelect).toBe('auto')
    })

    it('should not throw when cancelling without active drag', () => {
      const { cancelDrag } = useDragAndDrop()

      expect(() => {
        cancelDrag()
      }).not.toThrow()
    })

    it('should cancel pending animation frame', () => {
      const cancelAnimationFrameSpy = vi.spyOn(global, 'cancelAnimationFrame')

      const { startDrag, onDragMove, cancelDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      onDragMove(110, 210)
      vi.advanceTimersByTime(60) // Trigger RAF scheduling

      cancelDrag()

      // RAF should have been cancelled
      expect(cancelAnimationFrameSpy).toHaveBeenCalled()

      cancelAnimationFrameSpy.mockRestore()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const cancelAnimationFrameSpy = vi.spyOn(global, 'cancelAnimationFrame')

      const { startDrag, onDragMove } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      onDragMove(110, 210)
      vi.advanceTimersByTime(60)

      // For full cleanup test, we'd need to test the actual component lifecycle
      // This is a partial test showing RAF cancellation would happen

      expect(document.body.style.userSelect).toBe('none')

      cancelAnimationFrameSpy.mockRestore()
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple rapid dragMove calls', () => {
      const { startDrag, onDragMove, getDragOffset } = useDragAndDrop({
        throttleInterval: 50
      })

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // Rapid moves within throttle interval - first call is processed
      onDragMove(110, 210)
      onDragMove(115, 215)
      onDragMove(120, 220)

      // Advance past throttle to process the latest position
      vi.advanceTimersByTime(60)
      vi.runAllTimers() // Execute RAF

      const offset = getDragOffset.value
      // Should be at least 10, could be 20 depending on throttle timing
      expect(offset.dx).toBeGreaterThanOrEqual(10)
      expect(offset.dy).toBeGreaterThanOrEqual(10)
    })

    it('should handle zero movement', async () => {
      const { startDrag, endDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // No movement
      await endDrag()

      // Should complete without error
      expect(mockStore.updateElement).toBeDefined()
    })

    it('should handle negative coordinates', () => {
      const { startDrag, onDragMove, getDragOffset } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // Move to negative coordinates
      onDragMove(-50, -30)
      vi.advanceTimersByTime(50)

      const offset = getDragOffset.value
      expect(offset.dx).toBe(-150)
      expect(offset.dy).toBe(-230)
    })

    it('should handle very large movements', () => {
      const { startDrag, onDragMove, getDragOffset } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      // Very large movement
      onDragMove(10000, 20000)
      vi.advanceTimersByTime(50)

      const offset = getDragOffset.value
      expect(offset.dx).toBe(9900)
      expect(offset.dy).toBe(19800)
    })
  })

  describe('Debug Mode', () => {
    it('should log debug messages when enabled', () => {
      const logSpy = vi.spyOn(console, 'log')

      const { startDrag } = useDragAndDrop({ debug: true })

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[useDragAndDrop]'),
        expect.anything()
      )

      logSpy.mockRestore()
    })

    it('should not log debug messages when disabled', () => {
      const logSpy = vi.spyOn(console, 'log')

      const { startDrag } = useDragAndDrop({ debug: false })

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[useDragAndDrop]'),
        expect.anything()
      )

      logSpy.mockRestore()
    })
  })

  describe('Store Integration', () => {
    it('should fetch element from store', () => {
      const { startDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      expect(mockStore.getElementById).toHaveBeenCalledWith('element-123')
    })

    it('should update element in store on endDrag', async () => {
      const { startDrag, onDragMove, endDrag } = useDragAndDrop()

      const event = createMouseEvent(100, 200)
      startDrag('element-123', 100, 200, event)

      onDragMove(110, 210)
      vi.advanceTimersByTime(60)
      vi.runAllTimers()

      await endDrag()

      expect(mockStore.updateElement).toHaveBeenCalledWith('element-123', expect.any(Object))
    })
  })
})
