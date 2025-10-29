import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '../editor'
// import * as fabricService from '@/services/fabricService'
import type { SerializedElement } from '@/services/fabricService'

/**
 * Mock Fabric.js service
 */
vi.mock('@/services/fabricService', () => ({
  serializeElement: vi.fn((obj: any) => ({
    id: obj.data?.elementId || 'elem-' + Math.random(),
    type: 'text',
    x: obj.left || 0,
    y: obj.top || 0,
    width: obj.width || 100,
    height: obj.height || 50,
    rotation: obj.angle || 0,
    zIndex: 0,
    content: obj.data?.content || {},
    style: obj.data?.style || {}
  })),
  getObjectById: vi.fn()
}))

/**
 * Mock Pinia pages store
 */
vi.mock('@/stores/pages', () => ({
  usePagesStore: vi.fn(() => ({
    addElement: vi.fn(),
    deleteElement: vi.fn(),
    updateElement: vi.fn()
  }))
}))

/**
 * Mock Fabric.js Canvas
 */
class MockFabricCanvas {
  zoom = 1
  private objects: any[] = []

  getObjects() {
    return this.objects
  }

  add(obj: any) {
    this.objects.push(obj)
  }

  remove(obj: any) {
    this.objects = this.objects.filter(o => o !== obj)
  }

  setActiveObject(_obj: any) {}
  discardActiveObject() {}
  bringToFront(obj: any) {
    const idx = this.objects.indexOf(obj)
    if (idx > -1) {
      this.objects.splice(idx, 1)
      this.objects.push(obj)
    }
  }
  bringForward(obj: any) {
    const idx = this.objects.indexOf(obj)
    if (idx > -1 && idx < this.objects.length - 1) {
      [this.objects[idx], this.objects[idx + 1]] = [this.objects[idx + 1], this.objects[idx]]
    }
  }
  sendBackwards(obj: any) {
    const idx = this.objects.indexOf(obj)
    if (idx > 0) {
      [this.objects[idx], this.objects[idx - 1]] = [this.objects[idx - 1], this.objects[idx]]
    }
  }
  sendToBack(obj: any) {
    const idx = this.objects.indexOf(obj)
    if (idx > -1) {
      this.objects.splice(idx, 1)
      this.objects.unshift(obj)
    }
  }
  renderAll() {}
  setZoom(zoom: number) {
    this.zoom = zoom
  }
  dispose() {}
}

/**
 * Helper function to create a mock SerializedElement with all required properties
 */
function createMockElement(overrides: Partial<SerializedElement> = {}): SerializedElement {
  return {
    id: 'elem-1',
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    zIndex: 0,
    content: { text: 'Test', fontFamily: 'Arial', fontSize: 16, fill: '#000000' },
    style: {},
    ...overrides
  }
}

/**
 * Test suite for editor store (Pinia)
 *
 * Tests canvas state management and editor operations (US03)
 */
describe('editor store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // =====================================================
  // STATE INITIALIZATION TESTS
  // =====================================================

  it('initializes with default state', () => {
    const store = useEditorStore()

    expect(store.canvas).toBeNull()
    expect(store.selectedElement).toBeNull()
    expect(store.selectedFabricObj).toBeNull()
    expect(store.zoom).toBe(1)
    expect(store.gridVisible).toBe(true)
    expect(store.autoSaveStatus).toBe('idle')
    expect(store.lastError).toBeNull()
    expect(store.clipboard).toBeNull()
    expect(store.history).toEqual([])
    expect(store.historyIndex).toBe(-1)
  })

  // =====================================================
  // CANVAS MANAGEMENT TESTS
  // =====================================================

  it('sets canvas reference', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()

    store.setCanvas(mockCanvas as any)

    expect(store.canvas).toBe(mockCanvas)
  })

  it('updates isCanvasReady getter', () => {
    const store = useEditorStore()

    expect(store.isCanvasReady).toBe(false)

    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    expect(store.isCanvasReady).toBe(true)
  })

  it('clears canvas', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()

    store.setCanvas(mockCanvas as any)
    store.clearCanvas()

    expect(store.canvas).toBeNull()
    expect(store.selectedElement).toBeNull()
    expect(store.zoom).toBe(1)
  })

  // =====================================================
  // ELEMENT SELECTION TESTS
  // =====================================================

  it('selects element', () => {
    const store = useEditorStore()
    const element = createMockElement()

    store.selectElement(element)

    expect(store.selectedElement).toEqual(element)
  })

  it('deselects element', () => {
    const store = useEditorStore()
    store.selectElement(null)

    expect(store.selectedElement).toBeNull()
    expect(store.selectedFabricObj).toBeNull()
  })

  it('updates selectedFabricObj when selecting', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    const element: SerializedElement = {
      id: 'elem-1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      zIndex: 0,
      rotation: 0,
      style: {},
      content: { text: 'Test', fontFamily: 'Arial', fontSize: 16, fill: '#000000' }
    }

    store.selectElement(element)
  })

  it('updates selected element', () => {
    const store = useEditorStore()
    const element1: SerializedElement = {
      id: 'elem-1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      zIndex: 0,
      rotation: 0,
      style: {},
      content: { text: 'Test', fontFamily: 'Arial', fontSize: 16, fill: '#000000' }
    }

    const element2: SerializedElement = {
      ...element1,
      x: 50,
      y: 50
    }

    store.selectElement(element1)
    store.updateSelectedElement(element2)

    expect(store.selectedElement).toEqual(element2)
  })

  it('returns selected element data via getter', () => {
    const store = useEditorStore()
    const element: SerializedElement = {
      id: 'elem-1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      zIndex: 0,
      rotation: 0,
      style: {},
      content: { text: 'Test', fontFamily: 'Arial', fontSize: 16, fill: '#000000' }
    }

    store.selectElement(element)

    expect(store.getSelectedElementData).toEqual(element)
  })

  // =====================================================
  // ZOOM TESTS
  // =====================================================

  it('updates zoom level', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    store.updateZoom(1.5)

    expect(store.zoom).toBe(1.5)
  })

  it('clamps zoom to minimum 0.1', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    store.updateZoom(0.05)

    expect(store.zoom).toBe(0.1)
  })

  it('clamps zoom to maximum 4', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    store.updateZoom(5)

    expect(store.zoom).toBe(4)
  })

  it('zoomIn increases by 0.1', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    store.zoomIn()

    expect(store.zoom).toBe(1.1)
  })

  it('zoomOut decreases by 0.1', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)
    store.zoom = 1.5

    store.zoomOut()

    expect(store.zoom).toBe(1.4)
  })

  it('resetZoom sets zoom to 1', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)
    store.zoom = 2

    store.resetZoom()

    expect(store.zoom).toBe(1)
  })

  // =====================================================
  // GRID VISIBILITY TESTS
  // =====================================================

  it('toggles grid visibility', () => {
    const store = useEditorStore()

    expect(store.gridVisible).toBe(true)

    store.toggleGrid()
    expect(store.gridVisible).toBe(false)

    store.toggleGrid()
    expect(store.gridVisible).toBe(true)
  })

  it('sets grid visibility', () => {
    const store = useEditorStore()

    store.setGridVisible(false)
    expect(store.gridVisible).toBe(false)

    store.setGridVisible(true)
    expect(store.gridVisible).toBe(true)
  })

  // =====================================================
  // AUTO-SAVE STATUS TESTS
  // =====================================================

  it('sets auto-save status', () => {
    const store = useEditorStore()

    store.setAutoSaveStatus('saving')
    expect(store.autoSaveStatus).toBe('saving')

    store.setAutoSaveStatus('saved')
    expect(store.autoSaveStatus).toBe('saved')

    store.setAutoSaveStatus('error')
    expect(store.autoSaveStatus).toBe('error')
  })

  it('resets saved status after timeout', async () => {
    vi.useFakeTimers()
    const store = useEditorStore()

    store.setAutoSaveStatus('saved')
    expect(store.autoSaveStatus).toBe('saved')

    vi.advanceTimersByTime(2000)

    expect(store.autoSaveStatus).toBe('idle')

    vi.useRealTimers()
  })

  // =====================================================
  // ERROR HANDLING TESTS
  // =====================================================

  it('sets error message', () => {
    const store = useEditorStore()

    store.setError('Test error')

    expect(store.lastError).toBe('Test error')
    expect(store.autoSaveStatus).toBe('error')
  })

  it('clears error when set to null', () => {
    const store = useEditorStore()

    store.setError('Test error')
    store.setError(null)

    expect(store.lastError).toBeNull()
  })

  // =====================================================
  // HISTORY/UNDO-REDO TESTS
  // =====================================================

  it('pushes element to history', () => {
    const store = useEditorStore()
    const elements: SerializedElement[] = [
      {
        id: 'elem-1',
        type: 'text',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        zIndex: 0,
      rotation: 0,
      style: {},
        content: { text: 'Test', fontFamily: 'Arial', fontSize: 16, fill: '#000000' }
      }
    ]

    store.pushHistory(elements)

    expect(store.history.length).toBe(1)
    expect(store.historyIndex).toBe(0)
  })

  it('implements undo', () => {
    const store = useEditorStore()
    const elem1: SerializedElement = {
      id: 'elem-1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      zIndex: 0,
      rotation: 0,
      style: {},
      content: { text: 'State 1', fontFamily: 'Arial', fontSize: 16, fill: '#000000' }
    }

    const elem2: SerializedElement = {
      id: 'elem-1',
      type: 'text',
      x: 100,
      y: 100,
      width: 100,
      height: 50,
      zIndex: 0,
      rotation: 0,
      style: {},
      content: { text: 'State 2', fontFamily: 'Arial', fontSize: 16, fill: '#000000' }
    }

    store.pushHistory([elem1])
    store.pushHistory([elem2])

    const previousState = store.undo()

    expect(previousState).toEqual([elem1])
    expect(store.historyIndex).toBe(0)
  })

  it('implements redo', () => {
    const store = useEditorStore()
    const elem1: SerializedElement = {
      id: 'elem-1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      zIndex: 0,
      rotation: 0,
      style: {},
      content: { text: 'State 1', fontFamily: 'Arial', fontSize: 16, fill: '#000000' }
    }

    const elem2: SerializedElement = {
      id: 'elem-1',
      type: 'text',
      x: 100,
      y: 100,
      width: 100,
      height: 50,
      zIndex: 0,
      rotation: 0,
      style: {},
      content: { text: 'State 2', fontFamily: 'Arial', fontSize: 16, fill: '#000000' }
    }

    store.pushHistory([elem1])
    store.pushHistory([elem2])

    store.undo()
    const nextState = store.redo()

    expect(nextState).toEqual([elem2])
    expect(store.historyIndex).toBe(1)
  })

  it('canUndo getter returns correct value', () => {
    const store = useEditorStore()

    expect(store.canUndo).toBe(false)

    store.pushHistory([])
    store.pushHistory([])

    expect(store.canUndo).toBe(true)

    store.undo()
    expect(store.canUndo).toBe(false)
  })

  it('canRedo getter returns correct value', () => {
    const store = useEditorStore()

    expect(store.canRedo).toBe(false)

    store.pushHistory([])
    store.pushHistory([])

    store.undo()
    expect(store.canRedo).toBe(true)

    store.redo()
    expect(store.canRedo).toBe(false)
  })

  it('clears history', () => {
    const store = useEditorStore()

    store.pushHistory([])
    store.pushHistory([])

    store.clearHistory()

    expect(store.history.length).toBe(0)
    expect(store.historyIndex).toBe(-1)
  })

  it('limits history to 50 entries', () => {
    const store = useEditorStore()

    for (let i = 0; i < 60; i++) {
      store.pushHistory([])
    }

    expect(store.history.length).toBe(50)
  })

  // =====================================================
  // CLIPBOARD TESTS
  // =====================================================

  it('copies to clipboard', () => {
    const store = useEditorStore()
    const mockObj = {
      clone: vi.fn((callback: Function) => {
        callback({ data: { elementId: 'elem-1' } })
      })
    }

    store.selectedFabricObj = mockObj as any
    store.copyToClipboard()

    expect(store.clipboard).toBeDefined()
  })

  it('pastes from clipboard', async () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    const mockObj = {
      clone: vi.fn((callback: Function) => {
        callback({
          set: vi.fn(),
          data: { elementId: 'elem-1' },
          left: 0,
          top: 0
        })
      })
    }

    store.clipboard = mockObj as any

    await store.pasteFromClipboard()
  })

  // =====================================================
  // Z-INDEX MANAGEMENT TESTS
  // =====================================================

  it('brings element to front', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    const obj1 = { data: { elementId: 'elem-1' } }
    const obj2 = { data: { elementId: 'elem-2' } }

    mockCanvas.add(obj1 as any)
    mockCanvas.add(obj2 as any)

    store.selectedFabricObj = obj1 as any
    store.bringToFront()

    expect(mockCanvas.getObjects()[1]).toBe(obj1)
  })

  it('brings element forward', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    const obj1 = { data: { elementId: 'elem-1' } }
    const obj2 = { data: { elementId: 'elem-2' } }

    mockCanvas.add(obj1 as any)
    mockCanvas.add(obj2 as any)

    store.selectedFabricObj = obj1 as any
    store.bringForward()

    expect(mockCanvas.getObjects().indexOf(obj1)).toBe(1)
  })

  it('sends element backward', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    const obj1 = { data: { elementId: 'elem-1' } }
    const obj2 = { data: { elementId: 'elem-2' } }

    mockCanvas.add(obj1 as any)
    mockCanvas.add(obj2 as any)

    store.selectedFabricObj = obj2 as any
    store.sendBackward()

    expect(mockCanvas.getObjects()[0]).toBe(obj2)
  })

  it('sends element to back', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    const obj1 = { data: { elementId: 'elem-1' } }
    const obj2 = { data: { elementId: 'elem-2' } }

    mockCanvas.add(obj1 as any)
    mockCanvas.add(obj2 as any)

    store.selectedFabricObj = obj2 as any
    store.sendToBack()

    expect(mockCanvas.getObjects()[0]).toBe(obj2)
  })

  // =====================================================
  // DESELECT ELEMENT TESTS
  // =====================================================

  it('deselects element', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    const element: SerializedElement = {
      id: 'elem-1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      zIndex: 0,
      rotation: 0,
      style: {},
      content: { text: 'Test', fontFamily: 'Arial', fontSize: 16, fill: '#000000' }
    }

    store.selectElement(element)
    store.deselectElement()

    expect(store.selectedElement).toBeNull()
    expect(store.selectedFabricObj).toBeNull()
  })

  // =====================================================
  // CANVAS OBJECTS GETTER TESTS
  // =====================================================

  it('returns canvas objects', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    const obj = { data: { elementId: 'elem-1' } }
    mockCanvas.add(obj as any)

    const objects = store.getCanvasObjects
    expect(objects.length).toBe(1)
  })

  it('returns empty array when canvas not ready', () => {
    const store = useEditorStore()

    expect(store.getCanvasObjects).toEqual([])
  })

  // =====================================================
  // INTEGRATION TESTS
  // =====================================================

  it('completes full editing workflow', async () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()

    // Initialize canvas
    store.setCanvas(mockCanvas as any)
    expect(store.isCanvasReady).toBe(true)

    // Select element
    const element: SerializedElement = {
      id: 'elem-1',
      type: 'text',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      zIndex: 0,
      rotation: 0,
      style: {},
      content: { text: 'Test', fontFamily: 'Arial', fontSize: 16, fill: '#000000' }
    }

    store.selectElement(element)
    expect(store.selectedElement).toEqual(element)

    // Modify
    store.updateSelectedElement({ ...element, x: 50, y: 50 })
    expect(store.selectedElement?.x).toBe(50)

    // Save to history
    store.pushHistory([element])
    expect(store.history.length).toBe(1)
  })

  it('handles zoom workflow', () => {
    const store = useEditorStore()
    const mockCanvas = new MockFabricCanvas()
    store.setCanvas(mockCanvas as any)

    // Zoom in
    store.zoomIn()
    expect(store.zoom).toBe(1.1)

    // Reset
    store.resetZoom()
    expect(store.zoom).toBe(1)

    // Zoom out
    store.zoomOut()
    expect(store.zoom).toBe(0.9)
  })
})
