import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePagesStore } from '../pages'
import pageServiceDefault from '@/services/pageService'
import type { IPage, IPageElement, IPageElementCreateRequest } from '@/types/models'

/**
 * Mock page service module
 * The store imports pageService as default, so we mock the default export with its methods
 */
vi.mock('@/services/pageService', () => ({
  default: {
    fetchPageDetails: vi.fn(),
    fetchPageElements: vi.fn(),
    fetchNotebookPages: vi.fn(),
    saveElements: vi.fn()
  }
}))

/**
 * Mock data factories
 * Using functions to create fresh copies prevents test pollution from array mutations
 */
const getMockPage = (): IPage => ({
  id: 'page-1',
  notebookId: 'nb-1',
  pageNumber: 1,
  isCustomCover: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const getMockElements = (): IPageElement[] => [
  {
    id: 'elem-1',
    pageId: 'page-1',
    type: 'text',
    x: 10,
    y: 10,
    width: 100,
    height: 50,
    rotation: 0,
    zIndex: 0,
    content: { text: 'Sample text', fontFamily: 'Open Sans', fontSize: 16, fill: '#000000' },
    style: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'elem-2',
    pageId: 'page-1',
    type: 'text',
    x: 120,
    y: 120,
    width: 150,
    height: 60,
    rotation: 0,
    zIndex: 1,
    content: { text: 'Another text', fontFamily: 'Roboto', fontSize: 18, fill: '#FF0000' },
    style: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Backward compatibility: keep references for simple tests
const mockPage = getMockPage()
const mockElements = getMockElements()

/**
 * Test suite for pages store (Pinia)
 *
 * Tests state management for page editing (US03)
 */
describe('pages store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // =====================================================
  // STATE INITIALIZATION TESTS
  // =====================================================

  it('initializes with default state', () => {
    const store = usePagesStore()

    expect(store.currentPage).toBeNull()
    expect(store.pages).toEqual([])
    expect(store.elements).toEqual({})
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.unsavedElements.size).toBe(0)
  })

  it('initializes loading as false', () => {
    const store = usePagesStore()
    expect(store.loading).toBe(false)
  })

  it('initializes error as null', () => {
    const store = usePagesStore()
    expect(store.error).toBeNull()
  })

  it('initializes unsavedElements as empty Map', () => {
    const store = usePagesStore()
    expect(store.unsavedElements).toBeInstanceOf(Map)
    expect(store.unsavedElements.size).toBe(0)
  })

  // =====================================================
  // GETTER TESTS
  // =====================================================

  it('elementsByZIndex getter returns sorted elements', () => {
    const store = usePagesStore()
    store.elements['page-1'] = mockElements

    const sorted = store.elementsByZIndex('page-1')
    expect(sorted[0].zIndex).toBeLessThan(sorted[1].zIndex)
  })

  it('textElementCount getter counts text elements', () => {
    const store = usePagesStore()
    store.elements['page-1'] = mockElements

    const count = store.textElementCount('page-1')
    expect(count).toBe(2)
  })

  it('hasUnsavedChanges getter returns false when empty', () => {
    const store = usePagesStore()
    expect(store.hasUnsavedChanges).toBe(false)
  })

  it('hasUnsavedChanges getter returns true when unsaved', () => {
    const store = usePagesStore()
    store.unsavedElements.set('elem-1', mockElements[0])

    expect(store.hasUnsavedChanges).toBe(true)
  })

  // =====================================================
  // LOAD PAGE TESTS
  // =====================================================

  it('loads page successfully', async () => {
    const mockPageDetails = mockPage
    const mockPageElem = mockElements

    vi.mocked(pageServiceDefault.fetchPageDetails).mockResolvedValue(mockPageDetails)
    vi.mocked(pageServiceDefault.fetchPageElements).mockResolvedValue(mockPageElem)

    const store = usePagesStore()
    await store.loadPage('page-1')

    expect(store.currentPage).toEqual(mockPageDetails)
    expect(store.elements['page-1']).toEqual(mockPageElem)
    expect(store.loading).toBe(false)
  })

  it('sets loading state during load', async () => {
    vi.mocked(pageServiceDefault.fetchPageDetails).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPage), 50))
    )
    vi.mocked(pageServiceDefault.fetchPageElements).mockResolvedValue(mockElements)

    const store = usePagesStore()
    const loadPromise = store.loadPage('page-1')

    expect(store.loading).toBe(true)

    await loadPromise
    expect(store.loading).toBe(false)
  })

  it('clears error on successful load', async () => {
    const store = usePagesStore()
    store.error = 'Previous error'

    vi.mocked(pageServiceDefault.fetchPageDetails).mockResolvedValue(mockPage)
    vi.mocked(pageServiceDefault.fetchPageElements).mockResolvedValue(mockElements)

    await store.loadPage('page-1')

    expect(store.error).toBeNull()
  })

  it('clears unsaved elements after successful load', async () => {
    const store = usePagesStore()
    store.unsavedElements.set('temp-1', mockElements[0] as any)

    vi.mocked(pageServiceDefault.fetchPageDetails).mockResolvedValue(mockPage)
    vi.mocked(pageServiceDefault.fetchPageElements).mockResolvedValue(mockElements)

    await store.loadPage('page-1')

    expect(store.unsavedElements.size).toBe(0)
  })

  it('handles load error', async () => {
    const error = new Error('Load failed')
    vi.mocked(pageServiceDefault.fetchPageDetails).mockRejectedValue(error)

    const store = usePagesStore()

    await expect(store.loadPage('page-1')).rejects.toThrow('Load failed')
    expect(store.error).toContain('Load failed')
    expect(store.loading).toBe(false)
  })

  // =====================================================
  // ADD ELEMENT TESTS
  // =====================================================

  it('adds element to unsavedElements', () => {
    const store = usePagesStore()
    store.currentPage = mockPage

    const elementData: IPageElementCreateRequest = {
      type: 'text',
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      content: { text: 'New text', fontFamily: 'Arial', fontSize: 14, fill: '#000000' }
    }

    store.addElement(elementData)

    expect(store.unsavedElements.size).toBe(1)
  })

  it('throws error when no page loaded', () => {
    const store = usePagesStore()
    store.currentPage = null

    const elementData: IPageElementCreateRequest = {
      type: 'text',
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      content: { text: 'New text', fontFamily: 'Arial', fontSize: 14, fill: '#000000' }
    }

    expect(() => store.addElement(elementData)).toThrow('No page currently loaded')
  })

  it('assigns correct zIndex to new element', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.elements['page-1'] = mockElements

    const elementData: IPageElementCreateRequest = {
      type: 'text',
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      content: { text: 'New text', fontFamily: 'Arial', fontSize: 14, fill: '#000000' }
    }

    store.addElement(elementData)

    const unsavedArray = Array.from(store.unsavedElements.values())
    expect(unsavedArray[0].zIndex).toBe(2) // After elem with zIndex 1
  })

  it('generates unique temporary ID for new element', () => {
    const store = usePagesStore()
    store.currentPage = mockPage

    const elementData: IPageElementCreateRequest = {
      type: 'text',
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      content: { text: 'New text', fontFamily: 'Arial', fontSize: 14, fill: '#000000' }
    }

    store.addElement(elementData)

    store.addElement(elementData)

    // IDs should be different
    expect(store.unsavedElements.size).toBe(2)
  })

  // =====================================================
  // UPDATE ELEMENT TESTS
  // =====================================================

  it('updates unsaved element', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.unsavedElements.set('elem-1', mockElements[0] as any)

    store.updateElement('elem-1', { x: 100, y: 100 })

    const updated = store.unsavedElements.get('elem-1')
    expect(updated?.x).toBe(100)
    expect(updated?.y).toBe(100)
  })

  it('marks saved element as unsaved when updated', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.elements['page-1'] = mockElements

    expect(store.unsavedElements.size).toBe(0)

    store.updateElement('elem-1', { x: 200 })

    expect(store.unsavedElements.size).toBe(1)
    expect(store.unsavedElements.has('elem-1')).toBe(true)
  })

  it('throws error when updating with no page loaded', () => {
    const store = usePagesStore()
    store.currentPage = null

    expect(() => store.updateElement('elem-1', { x: 100 })).toThrow('No page currently loaded')
  })

  it('throws error when element not found', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.elements['page-1'] = []

    expect(() => store.updateElement('non-existent', { x: 100 })).toThrow('not found')
  })

  it('updates timestamp on element modification', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.elements['page-1'] = mockElements

    const originalTime = mockElements[0].updatedAt
    store.updateElement('elem-1', { x: 100 })

    const updated = store.unsavedElements.get('elem-1')
    expect(updated?.updatedAt).not.toBe(originalTime)
  })

  // =====================================================
  // DELETE ELEMENT TESTS
  // =====================================================

  it('deletes unsaved element', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.unsavedElements.set('elem-1', mockElements[0] as any)

    store.deleteElement('elem-1')

    // Element is marked for deletion (empty object)
    expect(store.unsavedElements.has('elem-1')).toBe(true)
  })

  it('marks saved element for deletion', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.elements['page-1'] = mockElements

    store.deleteElement('elem-1')

    expect(store.unsavedElements.has('elem-1')).toBe(true)
  })

  it('throws error when deleting non-existent element', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.elements['page-1'] = []

    expect(() => store.deleteElement('non-existent')).toThrow('not found')
  })

  it('throws error when deleting with no page loaded', () => {
    const store = usePagesStore()
    store.currentPage = null

    expect(() => store.deleteElement('elem-1')).toThrow('No page currently loaded')
  })

  // =====================================================
  // SAVE ELEMENTS TESTS
  // =====================================================

  it('saves unsaved elements to backend', async () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.elements['page-1'] = []
    store.unsavedElements.set('temp-1', mockElements[0] as any)

    vi.mocked(pageServiceDefault.saveElements).mockResolvedValue({ created: 1, updated: 0 })

    await store.saveElements()

    expect(pageServiceDefault.saveElements).toHaveBeenCalledWith('page-1', expect.any(Array))
  })

  it('clears unsaved elements after successful save', async () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.elements['page-1'] = []
    store.unsavedElements.set('temp-1', mockElements[0] as any)

    vi.mocked(pageServiceDefault.saveElements).mockResolvedValue({ created: 1, updated: 0 })

    await store.saveElements()

    expect(store.unsavedElements.size).toBe(0)
  })

  it('does nothing when no unsaved elements', async () => {
    const store = usePagesStore()
    store.currentPage = mockPage

    await store.saveElements()

    expect(pageServiceDefault.saveElements).not.toHaveBeenCalled()
  })

  it('sets loading state during save', async () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.unsavedElements.set('temp-1', mockElements[0] as any)

    vi.mocked(pageServiceDefault.saveElements).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 50))
    )

    const savePromise = store.saveElements()
    expect(store.loading).toBe(true)

    await savePromise
    expect(store.loading).toBe(false)
  })

  it('handles save error', async () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.unsavedElements.set('temp-1', mockElements[0] as any)

    const error = new Error('Save failed')
    vi.mocked(pageServiceDefault.saveElements).mockRejectedValue(error)

    await expect(store.saveElements()).rejects.toThrow('Save failed')
    expect(store.error).toContain('Save failed')
  })

  it('preserves unsaved elements on error', async () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.unsavedElements.set('temp-1', mockElements[0] as any)

    vi.mocked(pageServiceDefault.saveElements).mockRejectedValue(new Error('Save failed'))

    await expect(store.saveElements()).rejects.toThrow()

    // Unsaved elements should be preserved for retry
    expect(store.unsavedElements.size).toBe(1)
  })

  // =====================================================
  // REORDER Z-INDEX TESTS
  // =====================================================

  it('reorders elements by zIndex', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.elements['page-1'] = mockElements

    const newOrder = ['elem-2', 'elem-1']
    store.reorderByZIndex('page-1', newOrder)

    expect(store.unsavedElements.has('elem-1')).toBe(true)
    expect(store.unsavedElements.has('elem-2')).toBe(true)
  })

  // =====================================================
  // CLEAR PAGE TESTS
  // =====================================================

  it('clears current page', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.unsavedElements.set('elem-1', mockElements[0] as any)

    store.clearPage()

    expect(store.currentPage).toBeNull()
    expect(store.unsavedElements.size).toBe(0)
    expect(store.error).toBeNull()
  })

  it('clears error', () => {
    const store = usePagesStore()
    store.error = 'Some error'

    store.clearError()

    expect(store.error).toBeNull()
  })

  // =====================================================
  // INTEGRATION TESTS
  // =====================================================

  it('completes full page editing workflow', async () => {
    const store = usePagesStore()

    // Load page - use factory functions to prevent array mutation pollution
    vi.mocked(pageServiceDefault.fetchPageDetails).mockResolvedValue(getMockPage())
    vi.mocked(pageServiceDefault.fetchPageElements).mockResolvedValue(getMockElements())

    await store.loadPage('page-1')
    expect(store.currentPage).toMatchObject({
      id: 'page-1',
      notebookId: 'nb-1',
      pageNumber: 1,
      orientation: 'portrait',
      format: 'A4'
    })

    // Add element
    store.addElement({
      type: 'text',
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      content: { text: 'New', fontFamily: 'Arial', fontSize: 14, fill: '#000000' }
    })
    expect(store.unsavedElements.size).toBe(1)

    // Update element
    store.updateElement('elem-1', { x: 200 })
    expect(store.unsavedElements.size).toBe(2)

    // Save elements
    vi.mocked(pageServiceDefault.saveElements).mockResolvedValue({ created: 1, updated: 1 })
    await store.saveElements()
    expect(store.unsavedElements.size).toBe(0)
  })

  it('handles concurrent load and add operations', async () => {
    const store = usePagesStore()

    vi.mocked(pageServiceDefault.fetchPageDetails).mockResolvedValue(mockPage)
    vi.mocked(pageServiceDefault.fetchPageElements).mockResolvedValue(mockElements)

    const loadPromise = store.loadPage('page-1')

    // Start adding element during load
    store.currentPage = mockPage // Set manually for test
    store.addElement({
      type: 'text',
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      content: { text: 'New', fontFamily: 'Arial', fontSize: 14, fill: '#000000' }
    })

    await loadPromise

    expect(store.currentPage).toEqual(mockPage)
    // Unsaved elements should be cleared by load
    expect(store.unsavedElements.size).toBe(0)
  })

  // =====================================================
  // EDGE CASES
  // =====================================================

  it('handles page with no elements', async () => {
    const store = usePagesStore()

    vi.mocked(pageServiceDefault.fetchPageDetails).mockResolvedValue(mockPage)
    vi.mocked(pageServiceDefault.fetchPageElements).mockResolvedValue([])

    await store.loadPage('page-1')

    expect(store.elements['page-1']).toEqual([])
  })

  it('handles multiple pages', () => {
    const store = usePagesStore()

    // Create fresh copies to avoid mutation issues
    store.elements['page-1'] = [...mockElements]
    store.elements['page-2'] = [mockElements[0]]

    expect(store.elementsByZIndex('page-1').length).toBe(2)
    expect(store.elementsByZIndex('page-2').length).toBe(1)
  })

  it('handles empty element zIndex calculation', () => {
    const store = usePagesStore()
    store.currentPage = mockPage
    store.elements['page-1'] = []

    store.addElement({
      type: 'text',
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      content: { text: 'First', fontFamily: 'Arial', fontSize: 14, fill: '#000000' }
    })

    const elem = Array.from(store.unsavedElements.values())[0]
    expect(elem.zIndex).toBe(1) // First element gets zIndex 1
  })

  // =====================================================
  // PERFORMANCE TESTS (TASK64)
  // =====================================================

  it('should save 20 elements in < 2 seconds', async () => {
    const store = usePagesStore()
    store.currentPage = mockPage

    // Mock successful save
    vi.mocked(pageServiceDefault.saveElements).mockResolvedValue({
      created: 20,
      updated: 0
    })

    // Create 20 elements to test batch save performance
    const elements: IPageElementCreateRequest[] = []
    for (let i = 0; i < 20; i++) {
      elements.push({
        type: 'text',
        x: i * 10,
        y: i * 10,
        width: 100,
        height: 50,
        rotation: 0,
        zIndex: i,
        content: {
          text: `Element ${i}`,
          fontFamily: 'Arial',
          fontSize: 14,
          fill: '#000000'
        },
        style: {}
      })
    }

    // Measure batch save performance
    const startTime = performance.now()

    // Add all elements to unsavedElements
    elements.forEach((el) => {
      const tempId = `temp-${Date.now()}-${Math.random()}`
      store.unsavedElements.set(tempId, el as any)
    })

    // Trigger save
    await store.saveElements()

    const duration = performance.now() - startTime

    // Target: < 2000ms (2 seconds) for batch save
    expect(duration).toBeLessThan(2000)
    console.log(`✓ Saved 20 elements in ${duration.toFixed(2)}ms`)

    // Verify save was called with all elements
    expect(pageServiceDefault.saveElements).toHaveBeenCalledWith('page-1', elements)
  })

  it('should handle batch operations efficiently', async () => {
    const store = usePagesStore()
    store.currentPage = mockPage

    // Mock successful save
    vi.mocked(pageServiceDefault.saveElements).mockResolvedValue({
      created: 20,
      updated: 0
    })

    // Add 30 elements in rapid succession
    const startTime = performance.now()

    for (let i = 0; i < 30; i++) {
      store.addElement({
        type: 'text',
        x: i * 15,
        y: i * 15,
        width: 100,
        height: 50,
        content: {
          text: `Batch Element ${i}`,
          fontFamily: 'Arial',
          fontSize: 14,
          fill: '#000000'
        }
      })
    }

    const duration = performance.now() - startTime

    // Adding elements should be very fast (< 100ms)
    expect(duration).toBeLessThan(100)
    expect(store.unsavedElements.size).toBe(30)

    console.log(`✓ Added 30 elements in ${duration.toFixed(2)}ms`)
  })
})
