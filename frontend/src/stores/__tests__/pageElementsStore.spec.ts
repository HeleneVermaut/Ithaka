/**
 * Tests unitaires pour le store pageElementsStore (Pinia)
 *
 * Ce fichier teste la gestion des éléments de page (US04 - Media and Visual Elements).
 * Les tests couvrent :
 * - Initialisation du state
 * - Getters (getElementById, getSelectedElement, getElementCount, getElementsByType)
 * - Actions CRUD (load, create, update, delete)
 * - Actions spéciales (duplicate, restore)
 * - Gestion de la sélection (select, deselect)
 * - Gestion des erreurs et du loading state
 * - Edge cases et intégration
 *
 * Structure des tests :
 * 1. State initialization tests
 * 2. Getter tests
 * 3. Load page elements tests
 * 4. Create element tests
 * 5. Update element tests
 * 6. Delete element tests
 * 7. Duplicate element tests
 * 8. Restore element tests
 * 9. Selection management tests
 * 10. Error handling tests
 * 11. Integration tests
 * 12. Edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePageElementsStore } from '../pageElementsStore'
import pageElementServiceDefault from '@/services/pageElementService'
import type { IPageElement, IPageElementInput, IPageElementUpdate } from '@/types/models'

/**
 * Mock du service pageElementService
 *
 * Le store importe pageElementService comme default export,
 * on mocke donc l'export default avec toutes ses méthodes.
 */
vi.mock('@/services/pageElementService', () => ({
  default: {
    fetchPageElements: vi.fn(),
    createPageElement: vi.fn(),
    updatePageElement: vi.fn(),
    deletePageElement: vi.fn(),
    duplicatePageElement: vi.fn(),
    restorePageElement: vi.fn()
  }
}))

/**
 * Mock data factories
 *
 * Utilisation de fonctions pour créer des copies fraîches
 * et éviter la pollution des tests par mutations de tableaux.
 */

/**
 * Crée un élément de page mock de type texte
 */
const getMockTextElement = (): IPageElement => ({
  id: 'elem-text-1',
  pageId: 'page-1',
  type: 'text',
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  rotation: 0,
  zIndex: 0,
  content: {
    text: 'Sample text',
    fontFamily: 'Open Sans',
    fontSize: 16,
    fill: '#000000'
  },
  style: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

/**
 * Crée un élément de page mock de type image
 */
const getMockImageElement = (): IPageElement => ({
  id: 'elem-image-1',
  pageId: 'page-1',
  type: 'image',
  x: 50,
  y: 60,
  width: 150,
  height: 100,
  rotation: 0,
  zIndex: 1,
  content: {
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    cloudinaryPublicId: 'sample'
  },
  style: { opacity: 1 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

/**
 * Crée un élément de page mock de type emoji
 */
const getMockEmojiElement = (): IPageElement => ({
  id: 'elem-emoji-1',
  pageId: 'page-1',
  type: 'emoji',
  x: 100,
  y: 100,
  width: 50,
  height: 50,
  rotation: 0,
  zIndex: 2,
  content: {
    emojiContent: '😀'
  },
  style: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

/**
 * Crée un tableau d'éléments de page mock variés
 */
const getMockElements = (): IPageElement[] => [
  getMockTextElement(),
  getMockImageElement(),
  getMockEmojiElement()
]

/**
 * Suite de tests pour pageElementsStore
 */
describe('pageElementsStore', () => {
  beforeEach(() => {
    // Initialisation de Pinia pour chaque test (isolation)
    setActivePinia(createPinia())
    // Clear des mocks avant chaque test
    vi.clearAllMocks()
  })

  // =====================================================
  // STATE INITIALIZATION TESTS
  // =====================================================

  it('initializes with default state', () => {
    const store = usePageElementsStore()

    expect(store.elements).toEqual([])
    expect(store.selectedElementIds.length).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.currentPageId).toBeNull()
  })

  it('initializes elements as empty array', () => {
    const store = usePageElementsStore()
    expect(store.elements).toBeInstanceOf(Array)
    expect(store.elements.length).toBe(0)
  })

  it('initializes selectedElementId as null', () => {
    const store = usePageElementsStore()
    expect(store.selectedElementIds.length).toBe(0)
  })

  it('initializes loading as false', () => {
    const store = usePageElementsStore()
    expect(store.loading).toBe(false)
  })

  it('initializes error as null', () => {
    const store = usePageElementsStore()
    expect(store.error).toBeNull()
  })

  it('initializes currentPageId as null', () => {
    const store = usePageElementsStore()
    expect(store.currentPageId).toBeNull()
  })

  // =====================================================
  // GETTER TESTS
  // =====================================================

  it('getElementById returns element when found', () => {
    const store = usePageElementsStore()
    const mockElements = getMockElements()
    store.elements = mockElements

    const element = store.getElementById('elem-text-1')
    expect(element).toBeDefined()
    expect(element?.id).toBe('elem-text-1')
    expect(element?.type).toBe('text')
  })

  it('getElementById returns undefined when not found', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const element = store.getElementById('non-existent-id')
    expect(element).toBeUndefined()
  })

  it('getSelectedElement returns selected element', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()
    store.selectElement('elem-image-1')

    const selected = store.getSelectedElement
    expect(selected).toBeDefined()
    expect(selected?.id).toBe('elem-image-1')
    expect(selected?.type).toBe('image')
  })

  it('getSelectedElement returns null when no selection', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()
    store.deselectAll()

    const selected = store.getSelectedElement
    expect(selected).toBeNull()
  })

  it('getSelectedElement returns null when selected element not found', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()
    store.selectElement('non-existent-id')

    const selected = store.getSelectedElement
    expect(selected).toBeNull()
  })

  it('getElementCount returns correct count', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    expect(store.getElementCount).toBe(3)
  })

  it('getElementCount returns zero for empty array', () => {
    const store = usePageElementsStore()
    store.elements = []

    expect(store.getElementCount).toBe(0)
  })

  it('getElementsByType filters by text type', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const textElements = store.getElementsByType('text')
    expect(textElements.length).toBe(1)
    expect(textElements[0].type).toBe('text')
  })

  it('getElementsByType filters by image type', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const imageElements = store.getElementsByType('image')
    expect(imageElements.length).toBe(1)
    expect(imageElements[0].type).toBe('image')
  })

  it('getElementsByType returns empty array for no matches', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const shapeElements = store.getElementsByType('shape')
    expect(shapeElements).toEqual([])
  })

  // =====================================================
  // LOAD PAGE ELEMENTS TESTS
  // =====================================================

  it('loads page elements successfully', async () => {
    const store = usePageElementsStore()
    const mockElements = getMockElements()

    vi.mocked(pageElementServiceDefault.fetchPageElements).mockResolvedValue(mockElements)

    await store.loadPageElements('page-1')

    expect(store.elements).toEqual(mockElements)
    expect(store.currentPageId).toBe('page-1')
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets loading state during load', async () => {
    const store = usePageElementsStore()

    vi.mocked(pageElementServiceDefault.fetchPageElements).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(getMockElements()), 50))
    )

    const loadPromise = store.loadPageElements('page-1')
    expect(store.loading).toBe(true)

    await loadPromise
    expect(store.loading).toBe(false)
  })

  it('clears error on successful load', async () => {
    const store = usePageElementsStore()
    store.error = 'Previous error'

    vi.mocked(pageElementServiceDefault.fetchPageElements).mockResolvedValue(getMockElements())

    await store.loadPageElements('page-1')

    expect(store.error).toBeNull()
  })

  it('deselects element after load', async () => {
    const store = usePageElementsStore()
    store.selectElement('elem-text-1')

    vi.mocked(pageElementServiceDefault.fetchPageElements).mockResolvedValue(getMockElements())

    await store.loadPageElements('page-1')

    expect(store.selectedElementIds.length).toBe(0)
  })

  it('handles load error', async () => {
    const store = usePageElementsStore()
    const error = new Error('Network error')

    vi.mocked(pageElementServiceDefault.fetchPageElements).mockRejectedValue(error)

    await expect(store.loadPageElements('page-1')).rejects.toThrow('Network error')
    expect(store.error).toContain('Network error')
    expect(store.loading).toBe(false)
  })

  it('handles generic load error', async () => {
    const store = usePageElementsStore()

    vi.mocked(pageElementServiceDefault.fetchPageElements).mockRejectedValue('Unknown error')

    await expect(store.loadPageElements('page-1')).rejects.toBe('Unknown error')
    expect(store.error).toBe('Erreur lors du chargement des éléments de la page')
    expect(store.loading).toBe(false)
  })

  // =====================================================
  // CREATE ELEMENT TESTS
  // =====================================================

  it('creates element successfully', async () => {
    const store = usePageElementsStore()
    const newElementInput: IPageElementInput = {
      pageId: 'page-1',
      type: 'text',
      x: 30,
      y: 40,
      width: 120,
      height: 60
    }

    const createdElement: IPageElement = {
      id: 'elem-new-1',
      pageId: 'page-1',
      type: 'text',
      x: 30,
      y: 40,
      width: 120,
      height: 60,
      rotation: 0,
      zIndex: 0,
      content: { text: 'New text', fontFamily: 'Arial', fontSize: 14, fill: '#000000' },
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementServiceDefault.createPageElement).mockResolvedValue(createdElement)

    const result = await store.createElement(newElementInput)

    expect(result).toEqual(createdElement)
    expect(store.elements).toContainEqual(createdElement)
    expect(store.selectedElementIds[0]).toBe('elem-new-1')
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets loading state during create', async () => {
    const store = usePageElementsStore()
    const newElementInput: IPageElementInput = {
      pageId: 'page-1',
      type: 'text',
      x: 30,
      y: 40,
      width: 120,
      height: 60
    }

    const createdElement: IPageElement = {
      id: 'elem-new-1',
      pageId: 'page-1',
      type: 'text',
      x: 30,
      y: 40,
      width: 120,
      height: 60,
      rotation: 0,
      zIndex: 0,
      content: {},
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementServiceDefault.createPageElement).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(createdElement), 50))
    )

    const createPromise = store.createElement(newElementInput)
    expect(store.loading).toBe(true)

    await createPromise
    expect(store.loading).toBe(false)
  })

  it('handles create error', async () => {
    const store = usePageElementsStore()
    const newElementInput: IPageElementInput = {
      pageId: 'page-1',
      type: 'text',
      x: 30,
      y: 40,
      width: 120,
      height: 60
    }

    const error = new Error('Validation failed')
    vi.mocked(pageElementServiceDefault.createPageElement).mockRejectedValue(error)

    await expect(store.createElement(newElementInput)).rejects.toThrow('Validation failed')
    expect(store.error).toContain('Validation failed')
    expect(store.loading).toBe(false)
  })

  it('handles generic create error', async () => {
    const store = usePageElementsStore()
    const newElementInput: IPageElementInput = {
      pageId: 'page-1',
      type: 'text',
      x: 30,
      y: 40,
      width: 120,
      height: 60
    }

    vi.mocked(pageElementServiceDefault.createPageElement).mockRejectedValue('Unknown error')

    await expect(store.createElement(newElementInput)).rejects.toBe('Unknown error')
    expect(store.error).toBe("Erreur lors de la création de l'élément")
    expect(store.loading).toBe(false)
  })

  // =====================================================
  // UPDATE ELEMENT TESTS
  // =====================================================

  it('updates element successfully', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const updateData: IPageElementUpdate = {
      x: 100,
      y: 200,
      rotation: 45
    }

    const updatedElement: IPageElement = {
      ...getMockTextElement(),
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementServiceDefault.updatePageElement).mockResolvedValue(updatedElement)

    const result = await store.updateElement('elem-text-1', updateData)

    expect(result).toEqual(updatedElement)
    expect(store.elements.find(el => el.id === 'elem-text-1')).toEqual(updatedElement)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets loading state during update', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const updateData: IPageElementUpdate = { x: 100 }
    const updatedElement = { ...getMockTextElement(), ...updateData }

    vi.mocked(pageElementServiceDefault.updatePageElement).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(updatedElement), 50))
    )

    const updatePromise = store.updateElement('elem-text-1', updateData)
    expect(store.loading).toBe(true)

    await updatePromise
    expect(store.loading).toBe(false)
  })

  it('handles update error', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const error = new Error('Element not found')
    vi.mocked(pageElementServiceDefault.updatePageElement).mockRejectedValue(error)

    await expect(store.updateElement('elem-text-1', { x: 100 })).rejects.toThrow('Element not found')
    expect(store.error).toContain('Element not found')
    expect(store.loading).toBe(false)
  })

  it('handles generic update error', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    vi.mocked(pageElementServiceDefault.updatePageElement).mockRejectedValue('Unknown error')

    await expect(store.updateElement('elem-text-1', { x: 100 })).rejects.toBe('Unknown error')
    expect(store.error).toBe("Erreur lors de la mise à jour de l'élément")
    expect(store.loading).toBe(false)
  })

  // =====================================================
  // DELETE ELEMENT TESTS
  // =====================================================

  it('deletes element successfully', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    vi.mocked(pageElementServiceDefault.deletePageElement).mockResolvedValue()

    await store.deleteElement('elem-text-1')

    expect(store.elements.find(el => el.id === 'elem-text-1')).toBeUndefined()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('deselects element if deleted element was selected', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()
    store.selectElement('elem-text-1')

    vi.mocked(pageElementServiceDefault.deletePageElement).mockResolvedValue()

    await store.deleteElement('elem-text-1')

    expect(store.selectedElementIds.length).toBe(0)
  })

  it('does not deselect if deleted element was not selected', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()
    store.selectElement('elem-image-1')

    vi.mocked(pageElementServiceDefault.deletePageElement).mockResolvedValue()

    await store.deleteElement('elem-text-1')

    expect(store.selectedElementIds[0]).toBe('elem-image-1')
  })

  it('sets loading state during delete', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    vi.mocked(pageElementServiceDefault.deletePageElement).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(), 50))
    )

    const deletePromise = store.deleteElement('elem-text-1')
    expect(store.loading).toBe(true)

    await deletePromise
    expect(store.loading).toBe(false)
  })

  it('handles delete error', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const error = new Error('Element not found')
    vi.mocked(pageElementServiceDefault.deletePageElement).mockRejectedValue(error)

    await expect(store.deleteElement('elem-text-1')).rejects.toThrow('Element not found')
    expect(store.error).toContain('Element not found')
    expect(store.loading).toBe(false)
  })

  it('handles generic delete error', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    vi.mocked(pageElementServiceDefault.deletePageElement).mockRejectedValue('Unknown error')

    await expect(store.deleteElement('elem-text-1')).rejects.toBe('Unknown error')
    expect(store.error).toBe("Erreur lors de la suppression de l'élément")
    expect(store.loading).toBe(false)
  })

  // =====================================================
  // DUPLICATE ELEMENT TESTS
  // =====================================================

  it('duplicates element successfully', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const duplicatedElement: IPageElement = {
      ...getMockTextElement(),
      id: 'elem-text-2',
      x: 20, // Backend offsets by +10mm
      y: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementServiceDefault.duplicatePageElement).mockResolvedValue(duplicatedElement)

    const result = await store.duplicateElement('elem-text-1')

    expect(result).toEqual(duplicatedElement)
    expect(store.elements).toContainEqual(duplicatedElement)
    expect(store.selectedElementIds[0]).toBe('elem-text-2')
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets loading state during duplicate', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const duplicatedElement: IPageElement = {
      ...getMockTextElement(),
      id: 'elem-text-2'
    }

    vi.mocked(pageElementServiceDefault.duplicatePageElement).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(duplicatedElement), 50))
    )

    const duplicatePromise = store.duplicateElement('elem-text-1')
    expect(store.loading).toBe(true)

    await duplicatePromise
    expect(store.loading).toBe(false)
  })

  it('handles duplicate error', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const error = new Error('Element not found')
    vi.mocked(pageElementServiceDefault.duplicatePageElement).mockRejectedValue(error)

    await expect(store.duplicateElement('elem-text-1')).rejects.toThrow('Element not found')
    expect(store.error).toContain('Element not found')
    expect(store.loading).toBe(false)
  })

  it('handles generic duplicate error', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    vi.mocked(pageElementServiceDefault.duplicatePageElement).mockRejectedValue('Unknown error')

    await expect(store.duplicateElement('elem-text-1')).rejects.toBe('Unknown error')
    expect(store.error).toBe("Erreur lors de la duplication de l'élément")
    expect(store.loading).toBe(false)
  })

  // =====================================================
  // RESTORE ELEMENT TESTS
  // =====================================================

  it('restores element successfully', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const restoredElement: IPageElement = {
      ...getMockTextElement(),
      deletedAt: null
    }

    vi.mocked(pageElementServiceDefault.restorePageElement).mockResolvedValue(restoredElement)

    const result = await store.restoreElement('elem-text-1')

    expect(result).toEqual(restoredElement)
    expect(store.elements).toContainEqual(restoredElement)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets loading state during restore', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const restoredElement: IPageElement = {
      ...getMockTextElement(),
      deletedAt: null
    }

    vi.mocked(pageElementServiceDefault.restorePageElement).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(restoredElement), 50))
    )

    const restorePromise = store.restoreElement('elem-text-1')
    expect(store.loading).toBe(true)

    await restorePromise
    expect(store.loading).toBe(false)
  })

  it('handles restore error', async () => {
    const store = usePageElementsStore()

    const error = new Error('Element not found')
    vi.mocked(pageElementServiceDefault.restorePageElement).mockRejectedValue(error)

    await expect(store.restoreElement('elem-text-1')).rejects.toThrow('Element not found')
    expect(store.error).toContain('Element not found')
    expect(store.loading).toBe(false)
  })

  it('handles generic restore error', async () => {
    const store = usePageElementsStore()

    vi.mocked(pageElementServiceDefault.restorePageElement).mockRejectedValue('Unknown error')

    await expect(store.restoreElement('elem-text-1')).rejects.toBe('Unknown error')
    expect(store.error).toBe("Erreur lors de la restauration de l'élément")
    expect(store.loading).toBe(false)
  })

  // =====================================================
  // SELECTION MANAGEMENT TESTS
  // =====================================================

  it('selects element by ID', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    store.selectElement('elem-image-1')

    expect(store.selectedElementIds[0]).toBe('elem-image-1')
  })

  it('deselects element', () => {
    const store = usePageElementsStore()
    store.selectElement('elem-image-1')

    store.deselectAll()

    expect(store.selectedElementIds.length).toBe(0)
  })

  it('changes selection from one element to another', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()
    store.selectElement('elem-text-1')

    store.selectElement('elem-image-1')

    expect(store.selectedElementIds[0]).toBe('elem-image-1')
  })

  // =====================================================
  // INTEGRATION TESTS
  // =====================================================

  it('completes full CRUD workflow', async () => {
    const store = usePageElementsStore()

    // 1. Load page elements
    const mockElements = getMockElements()
    vi.mocked(pageElementServiceDefault.fetchPageElements).mockResolvedValue(mockElements)

    await store.loadPageElements('page-1')
    expect(store.elements.length).toBe(3)
    expect(store.currentPageId).toBe('page-1')

    // 2. Create new element
    const newElementInput: IPageElementInput = {
      pageId: 'page-1',
      type: 'text',
      x: 30,
      y: 40,
      width: 120,
      height: 60
    }

    const createdElement: IPageElement = {
      id: 'elem-new-1',
      pageId: 'page-1',
      type: 'text',
      x: 30,
      y: 40,
      width: 120,
      height: 60,
      rotation: 0,
      zIndex: 3,
      content: { text: 'New text', fontFamily: 'Arial', fontSize: 14, fill: '#000000' },
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementServiceDefault.createPageElement).mockResolvedValue(createdElement)

    await store.createElement(newElementInput)
    expect(store.elements.length).toBe(4)
    expect(store.selectedElementIds[0]).toBe('elem-new-1')

    // 3. Update element
    const updateData: IPageElementUpdate = { x: 100, y: 200 }
    const updatedElement: IPageElement = {
      ...createdElement,
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementServiceDefault.updatePageElement).mockResolvedValue(updatedElement)

    await store.updateElement('elem-new-1', updateData)
    expect(store.elements.find(el => el.id === 'elem-new-1')?.x).toBe(100)

    // 4. Delete element
    vi.mocked(pageElementServiceDefault.deletePageElement).mockResolvedValue()

    await store.deleteElement('elem-new-1')
    expect(store.elements.length).toBe(3)
    expect(store.selectedElementIds.length).toBe(0)
  })

  it('handles duplicate and restore workflow', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    // 1. Duplicate element
    const duplicatedElement: IPageElement = {
      ...getMockTextElement(),
      id: 'elem-text-2',
      x: 20,
      y: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementServiceDefault.duplicatePageElement).mockResolvedValue(duplicatedElement)

    await store.duplicateElement('elem-text-1')
    expect(store.elements.length).toBe(4)
    expect(store.selectedElementIds[0]).toBe('elem-text-2')

    // 2. Delete duplicated element
    vi.mocked(pageElementServiceDefault.deletePageElement).mockResolvedValue()

    await store.deleteElement('elem-text-2')
    expect(store.elements.length).toBe(3)

    // 3. Restore deleted element
    const restoredElement: IPageElement = {
      ...duplicatedElement,
      deletedAt: null
    }

    vi.mocked(pageElementServiceDefault.restorePageElement).mockResolvedValue(restoredElement)

    await store.restoreElement('elem-text-2')
    expect(store.elements.length).toBe(4)
  })

  // =====================================================
  // EDGE CASES
  // =====================================================

  it('handles empty page load', async () => {
    const store = usePageElementsStore()

    vi.mocked(pageElementServiceDefault.fetchPageElements).mockResolvedValue([])

    await store.loadPageElements('page-empty')

    expect(store.elements).toEqual([])
    expect(store.currentPageId).toBe('page-empty')
    expect(store.getElementCount).toBe(0)
  })

  it('handles loading multiple pages sequentially', async () => {
    const store = usePageElementsStore()

    // Load page 1
    const page1Elements = [getMockTextElement()]
    vi.mocked(pageElementServiceDefault.fetchPageElements).mockResolvedValue(page1Elements)

    await store.loadPageElements('page-1')
    expect(store.currentPageId).toBe('page-1')
    expect(store.elements.length).toBe(1)

    // Load page 2
    const page2Elements = [getMockImageElement(), getMockEmojiElement()]
    vi.mocked(pageElementServiceDefault.fetchPageElements).mockResolvedValue(page2Elements)

    await store.loadPageElements('page-2')
    expect(store.currentPageId).toBe('page-2')
    expect(store.elements.length).toBe(2)
  })

  it('handles rapid selection changes', () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    store.selectElement('elem-text-1')
    expect(store.selectedElementIds[0]).toBe('elem-text-1')

    store.selectElement('elem-image-1')
    expect(store.selectedElementIds[0]).toBe('elem-image-1')

    store.selectElement('elem-emoji-1')
    expect(store.selectedElementIds[0]).toBe('elem-emoji-1')

    store.deselectAll()
    expect(store.selectedElementIds.length).toBe(0)
  })

  it('handles update of non-existent element in state', async () => {
    const store = usePageElementsStore()
    store.elements = getMockElements()

    const updateData: IPageElementUpdate = { x: 100 }
    const updatedElement: IPageElement = {
      ...getMockTextElement(),
      id: 'elem-non-existent',
      ...updateData
    }

    vi.mocked(pageElementServiceDefault.updatePageElement).mockResolvedValue(updatedElement)

    // Even if element doesn't exist in state, service call succeeds
    await store.updateElement('elem-non-existent', updateData)

    // Element is not added to state (only updated if it exists)
    expect(store.elements.find(el => el.id === 'elem-non-existent')).toBeUndefined()
  })

  it('preserves elements after error', async () => {
    const store = usePageElementsStore()
    const initialElements = getMockElements()
    store.elements = initialElements

    const error = new Error('Server error')
    vi.mocked(pageElementServiceDefault.deletePageElement).mockRejectedValue(error)

    await expect(store.deleteElement('elem-text-1')).rejects.toThrow('Server error')

    // Elements should be preserved after error
    expect(store.elements.length).toBe(3)
    expect(store.elements).toEqual(initialElements)
  })
})
