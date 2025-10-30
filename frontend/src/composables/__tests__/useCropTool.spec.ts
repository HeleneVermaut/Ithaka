/**
 * Unit tests for useCropTool composable
 *
 * Tests cover:
 * - Crop state management (position, size)
 * - Aspect ratio enforcement (square, portrait, landscape, custom, free)
 * - Snap-to-grid calculations
 * - Constraint validation (min/max sizes, boundaries)
 * - Drag/resize calculations
 * - Keyboard arrow key adjustments
 * - Reset and utility functions
 *
 * @module composables/__tests__/useCropTool.spec
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCropTool } from '../useCropTool'

describe('useCropTool', () => {
  // ========================================
  // SETUP
  // ========================================

  const IMAGE_WIDTH = 800
  const IMAGE_HEIGHT = 600

  let cropTool: ReturnType<typeof useCropTool>

  beforeEach(() => {
    cropTool = useCropTool(IMAGE_WIDTH, IMAGE_HEIGHT)
  })

  // ========================================
  // INITIALIZATION TESTS
  // ========================================

  describe('initialization', () => {
    it('should initialize crop data to 50% of image, centered', () => {
      const cropData = cropTool.getCropData()

      expect(cropData.x).toBe(Math.round(IMAGE_WIDTH * 0.25))
      expect(cropData.y).toBe(Math.round(IMAGE_HEIGHT * 0.25))
      expect(cropData.width).toBe(Math.round(IMAGE_WIDTH * 0.5))
      expect(cropData.height).toBe(Math.round(IMAGE_HEIGHT * 0.5))
    })

    it('should initialize aspect ratio to free (no constraint)', () => {
      expect(cropTool.aspectRatioPreset.value).toBe('free')
      expect(cropTool.currentAspectRatio.value).toBeNull()
    })

    it('should initialize custom aspect ratio to 1', () => {
      expect(cropTool.customAspectRatio.value).toBe(1)
    })

    it('should initialize drag state as inactive', () => {
      expect(cropTool.isDragging.value).toBe(false)
      expect(cropTool.activeHandle.value).toBeNull()
    })
  })

  // ========================================
  // ASPECT RATIO TESTS
  // ========================================

  describe('aspect ratio enforcement', () => {
    it('should set square aspect ratio (1:1)', () => {
      cropTool.setAspectRatio('square')

      expect(cropTool.aspectRatioPreset.value).toBe('square')
      expect(cropTool.currentAspectRatio.value).toBe(1)

      // Should adjust height to match width for square ratio
      const cropData = cropTool.getCropData()
      expect(Math.abs(cropData.width / cropData.height - 1)).toBeLessThan(0.1)
    })

    it('should set portrait aspect ratio (3:4)', () => {
      cropTool.setAspectRatio('portrait_3_4')

      expect(cropTool.aspectRatioPreset.value).toBe('portrait_3_4')
      expect(cropTool.currentAspectRatio.value).toBe(3 / 4)
    })

    it('should set landscape aspect ratio (16:9)', () => {
      cropTool.setAspectRatio('landscape_16_9')

      expect(cropTool.aspectRatioPreset.value).toBe('landscape_16_9')
      expect(cropTool.currentAspectRatio.value).toBe(16 / 9)
    })

    it('should set custom aspect ratio', () => {
      cropTool.setAspectRatio('custom')
      cropTool.setCustomAspectRatio(2.5)

      expect(cropTool.aspectRatioPreset.value).toBe('custom')
      expect(cropTool.customAspectRatio.value).toBe(2.5)
    })

    it('should constrain custom aspect ratio to valid range (0.1 - 10)', () => {
      cropTool.setCustomAspectRatio(0.05)
      expect(cropTool.customAspectRatio.value).toBe(0.1)

      cropTool.setCustomAspectRatio(15)
      expect(cropTool.customAspectRatio.value).toBe(10)
    })

    it('should allow free mode without aspect ratio constraint', () => {
      cropTool.setAspectRatio('free')

      expect(cropTool.aspectRatioPreset.value).toBe('free')
      expect(cropTool.currentAspectRatio.value).toBeNull()
    })
  })

  // ========================================
  // CONSTRAINT & VALIDATION TESTS
  // ========================================

  describe('constraints', () => {
    it('should enforce minimum crop size (50x50)', () => {
      cropTool.updateCropData({
        width: 20,
        height: 20,
      })

      const cropData = cropTool.getCropData()
      expect(cropData.width).toBeGreaterThanOrEqual(50)
      expect(cropData.height).toBeGreaterThanOrEqual(50)
    })

    it('should prevent crop from exceeding image boundaries', () => {
      cropTool.updateCropData({
        x: -50,
        y: -50,
        width: IMAGE_WIDTH + 100,
        height: IMAGE_HEIGHT + 100,
      })

      const cropData = cropTool.getCropData()
      expect(cropData.x).toBeGreaterThanOrEqual(0)
      expect(cropData.y).toBeGreaterThanOrEqual(0)
      expect(cropData.x + cropData.width).toBeLessThanOrEqual(IMAGE_WIDTH)
      expect(cropData.y + cropData.height).toBeLessThanOrEqual(IMAGE_HEIGHT)
    })

    it('should prevent crop from being moved beyond image bounds', () => {
      cropTool.updateCropData({
        x: IMAGE_WIDTH,
        y: IMAGE_HEIGHT,
      })

      const cropData = cropTool.getCropData()
      expect(cropData.x + cropData.width).toBeLessThanOrEqual(IMAGE_WIDTH)
      expect(cropData.y + cropData.height).toBeLessThanOrEqual(IMAGE_HEIGHT)
    })
  })

  // ========================================
  // GRID SNAPPING TESTS
  // ========================================

  describe('snap to grid', () => {
    it('should snap values to grid increments', () => {
      const snapped = cropTool.snapToGrid(47)
      expect(snapped).toBe(50) // Snaps to nearest 10px

      const snapped2 = cropTool.snapToGrid(63)
      expect(snapped2).toBe(60)
    })

    it('should snap crop dimensions to grid when updating', () => {
      cropTool.updateCropData({
        x: 47,
        y: 63,
        width: 247,
        height: 183,
      })

      const cropData = cropTool.getCropData()
      expect(cropData.x).toBe(50)
      expect(cropData.y).toBe(60)
      expect(cropData.width).toBe(250)
      expect(cropData.height).toBe(180)
    })
  })

  // ========================================
  // DRAG & RESIZE TESTS
  // ========================================

  describe('drag and resize', () => {
    it('should initialize drag state on mouse down', () => {
      const mockContainer = document.createElement('div')
      mockContainer.style.width = '800px'
      mockContainer.style.height = '600px'
      mockContainer.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })

      const event = new MouseEvent('mousedown', {
        clientX: 300,
        clientY: 300,
      })

      cropTool.handleMouseDown(event, mockContainer)

      expect(cropTool.isDragging.value).toBe(true)
      expect(cropTool.activeHandle.value).toBeTruthy()
    })

    it('should clear drag state on mouse up', () => {
      cropTool.handleMouseUp()

      expect(cropTool.isDragging.value).toBe(false)
      expect(cropTool.activeHandle.value).toBeNull()
    })
  })

  // ========================================
  // KEYBOARD CONTROL TESTS
  // ========================================

  describe('keyboard adjustments', () => {
    it('should increase height with arrow down key', () => {
      const initialCrop = cropTool.getCropData()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
      })

      cropTool.handleKeyDown(event)

      const newCrop = cropTool.getCropData()
      expect(newCrop.height).toBeGreaterThan(initialCrop.height)
    })

    it('should decrease height with arrow up key', () => {
      const initialCrop = cropTool.getCropData()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
      })

      cropTool.handleKeyDown(event)

      const newCrop = cropTool.getCropData()
      expect(newCrop.height).toBeLessThan(initialCrop.height)
    })

    it('should move crop with shift + arrow keys', () => {
      const initialCrop = cropTool.getCropData()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        shiftKey: true,
        bubbles: true,
      })

      cropTool.handleKeyDown(event)

      const newCrop = cropTool.getCropData()
      expect(newCrop.x).toBeGreaterThan(initialCrop.x)
    })

    it('should prevent key repeat by tracking active keys', () => {
      const event1 = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
      })

      const event2 = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
      })

      const initialCrop = cropTool.getCropData()

      cropTool.handleKeyDown(event1)
      const afterFirst = cropTool.getCropData()

      cropTool.handleKeyDown(event2) // Should be ignored (key repeat)
      const afterSecond = cropTool.getCropData()

      // After first adjustment should change
      expect(afterFirst.height).toBeLessThan(initialCrop.height)
      // After second (repeat) should NOT change
      expect(afterSecond.height).toBe(afterFirst.height)

      cropTool.handleKeyUp(event1)
    })
  })

  // ========================================
  // RESET & UTILITY TESTS
  // ========================================

  describe('reset and utilities', () => {
    it('should reset crop to default (50%, centered)', () => {
      cropTool.updateCropData({
        x: 100,
        y: 100,
        width: 200,
        height: 200,
      })

      cropTool.resetCrop()

      const cropData = cropTool.getCropData()
      expect(cropData.x).toBe(Math.round(IMAGE_WIDTH * 0.25))
      expect(cropData.y).toBe(Math.round(IMAGE_HEIGHT * 0.25))
      expect(cropData.width).toBe(Math.round(IMAGE_WIDTH * 0.5))
      expect(cropData.height).toBe(Math.round(IMAGE_HEIGHT * 0.5))
    })

    it('should reset aspect ratio preset to free on reset', () => {
      cropTool.setAspectRatio('square')
      cropTool.resetCrop()

      expect(cropTool.aspectRatioPreset.value).toBe('free')
    })

    it('should get crop data in original image pixels', () => {
      const cropData = cropTool.getCropData()

      expect(cropData.x).toBeGreaterThanOrEqual(0)
      expect(cropData.y).toBeGreaterThanOrEqual(0)
      expect(cropData.width).toBeGreaterThan(0)
      expect(cropData.height).toBeGreaterThan(0)
      expect(typeof cropData.x).toBe('number')
      expect(typeof cropData.y).toBe('number')
      expect(typeof cropData.width).toBe('number')
      expect(typeof cropData.height).toBe('number')
    })

    it('should update partial crop data', () => {
      cropTool.updateCropData({
        x: 100,
      })

      const cropData = cropTool.getCropData()
      expect(cropData.x).toBeCloseTo(100, -1) // Allow snapping
    })
  })

  // ========================================
  // COMPUTED PROPERTY TESTS
  // ========================================

  describe('computed properties', () => {
    it('should compute crop box position as percentages', () => {
      const position = cropTool.cropBoxPosition.value

      expect(position.left).toContain('%')
      expect(position.top).toContain('%')
      expect(position.width).toContain('%')
      expect(position.height).toContain('%')
    })

    it('should provide rule of thirds grid line positions', () => {
      const gridLines = cropTool.gridLinePositions.value

      expect(gridLines.vertical).toContain(33.333)
      expect(gridLines.vertical).toContain(66.667)
      expect(gridLines.horizontal).toContain(33.333)
      expect(gridLines.horizontal).toContain(66.667)
    })

    it('should provide crop handles with cursor styles', () => {
      const handles = cropTool.cropHandles.value

      expect(handles.tl).toHaveProperty('cursor')
      expect(handles.tr).toHaveProperty('cursor')
      expect(handles.bl).toHaveProperty('cursor')
      expect(handles.br).toHaveProperty('cursor')
      expect(handles.t).toHaveProperty('cursor')
      expect(handles.b).toHaveProperty('cursor')
      expect(handles.l).toHaveProperty('cursor')
      expect(handles.r).toHaveProperty('cursor')
    })

    it('should indicate dragging state', () => {
      expect(cropTool.isDragging.value).toBe(false)
    })

    it('should provide active handle or null', () => {
      expect(cropTool.activeHandle.value).toBeNull()
    })
  })

  // ========================================
  // EDGE CASES
  // ========================================

  describe('edge cases', () => {
    it('should handle very small image dimensions', () => {
      const smallCrop = useCropTool(100, 100)
      const cropData = smallCrop.getCropData()

      expect(cropData.width).toBeGreaterThanOrEqual(50)
      expect(cropData.height).toBeGreaterThanOrEqual(50)
    })

    it('should handle very large image dimensions', () => {
      const largeCrop = useCropTool(10000, 8000)
      const cropData = largeCrop.getCropData()

      expect(cropData.width).toBeLessThanOrEqual(10000)
      expect(cropData.height).toBeLessThanOrEqual(8000)
    })

    it('should handle non-square image aspect ratios', () => {
      const wideCrop = useCropTool(1600, 900) // 16:9
      const cropData = wideCrop.getCropData()

      expect(cropData.x).toBeGreaterThanOrEqual(0)
      expect(cropData.y).toBeGreaterThanOrEqual(0)
    })

    it('should enforce aspect ratio even with extreme ratios', () => {
      const crop = useCropTool(800, 600)
      crop.setAspectRatio('custom')
      crop.setCustomAspectRatio(0.1) // Extreme narrow

      const cropData = crop.getCropData()
      const ratio = cropData.width / cropData.height

      expect(ratio).toBeGreaterThan(0.09)
      expect(ratio).toBeLessThan(0.11)
    })
  })

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('integration scenarios', () => {
    it('should maintain constraints after multiple operations', () => {
      cropTool.setAspectRatio('landscape_16_9')
      cropTool.updateCropData({ x: -100, y: -100 })
      cropTool.updateCropData({ width: IMAGE_WIDTH + 500 })

      const cropData = cropTool.getCropData()

      expect(cropData.x).toBeGreaterThanOrEqual(0)
      expect(cropData.y).toBeGreaterThanOrEqual(0)
      expect(cropData.x + cropData.width).toBeLessThanOrEqual(IMAGE_WIDTH)
      expect(cropData.y + cropData.height).toBeLessThanOrEqual(IMAGE_HEIGHT)

      // Check aspect ratio still enforced
      const ratio = cropData.width / cropData.height
      expect(Math.abs(ratio - 16 / 9)).toBeLessThan(0.1)
    })

    it('should support switching between aspect ratios', () => {
      cropTool.setAspectRatio('square')
      let cropData = cropTool.getCropData()
      let ratio1 = cropData.width / cropData.height

      cropTool.setAspectRatio('landscape_16_9')
      cropData = cropTool.getCropData()
      let ratio2 = cropData.width / cropData.height

      cropTool.setAspectRatio('portrait_3_4')
      cropData = cropTool.getCropData()
      let ratio3 = cropData.width / cropData.height

      // All ratios should be different
      expect(Math.abs(ratio1 - 1)).toBeLessThan(0.1)
      expect(Math.abs(ratio2 - 16 / 9)).toBeLessThan(0.2)
      expect(Math.abs(ratio3 - 3 / 4)).toBeLessThan(0.1)
    })
  })
})
