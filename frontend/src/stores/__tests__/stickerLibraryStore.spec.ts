/**
 * Tests unitaires pour le store stickerLibraryStore
 *
 * Ces tests vérifient le bon fonctionnement de toutes les opérations
 * de gestion de la bibliothèque de stickers :
 * - Initialisation du state
 * - Chargement de la bibliothèque (loadStickerLibrary)
 * - Upload de stickers (uploadSticker)
 * - Renommage de stickers (renameSticker)
 * - Suppression de stickers (deleteSticker)
 * - Sélection/désélection (selectSticker, deselectSticker)
 * - Getters (getStickerById, getSelectedSticker, etc.)
 * - Pagination
 * - Gestion des erreurs
 *
 * Stratégie de test :
 * - Mock du stickerService pour isoler la logique du store
 * - Tests synchrones avec vi.mock() pour contrôler les réponses
 * - Vérification des états (loading, error, stickers, etc.)
 * - Couverture des cas d'erreur et des edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStickerLibraryStore } from '../stickerLibraryStore'
import type { IUserSticker } from '@/types/models'

// ========================================
// MOCK DU STICKER SERVICE
// ========================================

/**
 * Mock du service stickerService
 *
 * Permet de contrôler les réponses du service sans appeler le backend.
 * Chaque test peut configurer des réponses spécifiques ou des erreurs.
 */
vi.mock('@/services/stickerService', () => ({
  default: {
    fetchStickerLibrary: vi.fn(),
    uploadStickerToLibrary: vi.fn(),
    updateStickerMetadata: vi.fn(),
    deleteStickerFromLibrary: vi.fn()
  }
}))

// Import du mock après la déclaration
import stickerService from '@/services/stickerService'

// ========================================
// FIXTURES DE TEST
// ========================================

/**
 * Données de test : sticker exemple 1
 */
const mockSticker1: IUserSticker = {
  id: 'sticker-uuid-1',
  userId: 'user-uuid-1',
  name: 'Mountain Landscape',
  cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sticker1.png',
  cloudinaryPublicId: 'sticker1',
  thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/c_thumb,w_200/sticker1.png',
  tags: ['nature', 'mountain', 'landscape'],
  isPublic: false,
  usageCount: 5,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z'
}

/**
 * Données de test : sticker exemple 2
 */
const mockSticker2: IUserSticker = {
  id: 'sticker-uuid-2',
  userId: 'user-uuid-1',
  name: 'Cute Cat',
  cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sticker2.png',
  cloudinaryPublicId: 'sticker2',
  thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/c_thumb,w_200/sticker2.png',
  tags: ['animal', 'cat', 'cute'],
  isPublic: true,
  usageCount: 12,
  createdAt: '2025-01-16T14:30:00Z',
  updatedAt: '2025-01-16T14:30:00Z'
}

/**
 * Données de test : sticker exemple 3
 */
const mockSticker3: IUserSticker = {
  id: 'sticker-uuid-3',
  userId: 'user-uuid-1',
  name: 'Tropical Beach',
  cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sticker3.png',
  cloudinaryPublicId: 'sticker3',
  thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/c_thumb,w_200/sticker3.png',
  tags: ['nature', 'beach', 'tropical'],
  isPublic: false,
  usageCount: 3,
  createdAt: '2025-01-17T09:15:00Z',
  updatedAt: '2025-01-17T09:15:00Z'
}

/**
 * Liste de stickers pour les tests
 */
const mockStickers: IUserSticker[] = [mockSticker1, mockSticker2, mockSticker3]

// ========================================
// TESTS
// ========================================

describe('stickerLibraryStore', () => {
  /**
   * Configuration avant chaque test
   *
   * Réinitialise Pinia et les mocks pour un environnement de test propre.
   */
  beforeEach(() => {
    // Créer une nouvelle instance Pinia pour chaque test (isolation)
    setActivePinia(createPinia())

    // Réinitialiser tous les mocks
    vi.clearAllMocks()
  })

  // ========================================
  // TEST 1: Initialisation du state
  // ========================================

  it('should initialize with empty state', () => {
    const store = useStickerLibraryStore()

    // Vérifier l'état initial
    expect(store.stickers).toEqual([])
    expect(store.selectedStickerId).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0
    })
  })

  // ========================================
  // TEST 2: Chargement de la bibliothèque (succès)
  // ========================================

  it('should load sticker library successfully', async () => {
    const store = useStickerLibraryStore()

    // Mock de la réponse du service
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: mockStickers, pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 } })

    // Appeler l'action
    await store.loadStickerLibrary()

    // Vérifier que le service a été appelé
    expect(stickerService.fetchStickerLibrary).toHaveBeenCalledOnce()

    // Vérifier l'état après le chargement
    expect(store.stickers).toEqual(mockStickers)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.pagination.total).toBe(3)
  })

  // ========================================
  // TEST 3: Chargement avec pagination personnalisée
  // ========================================

  it('should load sticker library with custom pagination', async () => {
    const store = useStickerLibraryStore()

    // Mock de la réponse
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: mockStickers, pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 } })

    // Charger la bibliothèque
    await store.loadStickerLibrary()

    // Vérifier la pagination
    expect(store.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 3
    })
  })

  // ========================================
  // TEST 4: Gestion d'erreur lors du chargement
  // ========================================

  it('should handle error when loading sticker library', async () => {
    const store = useStickerLibraryStore()

    // Mock d'une erreur
    const errorMessage = 'Network error'
    vi.mocked(stickerService.fetchStickerLibrary).mockRejectedValue(
      new Error(errorMessage)
    )

    // Appeler l'action
    await store.loadStickerLibrary()

    // Vérifier que l'erreur est stockée
    expect(store.error).toContain(errorMessage)
    expect(store.loading).toBe(false)
    expect(store.stickers).toEqual([])
  })

  // ========================================
  // TEST 5: Upload de sticker (succès)
  // ========================================

  it('should upload sticker successfully', async () => {
    const store = useStickerLibraryStore()

    // Mock de l'upload et du reload
    vi.mocked(stickerService.uploadStickerToLibrary).mockResolvedValue(mockSticker1)
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: mockStickers, pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 } })

    // Créer un fichier de test
    const file = new File(['fake-content'], 'test-sticker.png', { type: 'image/png' })

    // Appeler l'action
    const result = await store.uploadSticker(file, 'Test Sticker', ['test'])

    // Vérifier que l'upload a été appelé
    expect(stickerService.uploadStickerToLibrary).toHaveBeenCalledWith(
      file,
      'Test Sticker',
      ['test'],
      undefined
    )

    // Vérifier que la bibliothèque a été rechargée
    expect(stickerService.fetchStickerLibrary).toHaveBeenCalled()

    // Vérifier le résultat
    expect(result).toEqual(mockSticker1)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  // ========================================
  // TEST 6: Upload avec callback de progression
  // ========================================

  it('should upload sticker with progress callback', async () => {
    const store = useStickerLibraryStore()

    // Mock des services
    vi.mocked(stickerService.uploadStickerToLibrary).mockResolvedValue(mockSticker1)
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: mockStickers, pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 } })

    // Callback de progression
    const progressCallback = vi.fn()

    // Upload avec callback
    const file = new File(['fake-content'], 'test.png', { type: 'image/png' })
    await store.uploadSticker(file, 'Test', [], progressCallback)

    // Vérifier que le callback a été passé au service
    expect(stickerService.uploadStickerToLibrary).toHaveBeenCalledWith(
      file,
      'Test',
      [],
      progressCallback
    )
  })

  // ========================================
  // TEST 7: Gestion d'erreur lors de l'upload
  // ========================================

  it('should handle error when uploading sticker', async () => {
    const store = useStickerLibraryStore()

    // Mock d'une erreur
    const errorMessage = 'Upload failed'
    vi.mocked(stickerService.uploadStickerToLibrary).mockRejectedValue(
      new Error(errorMessage)
    )

    const file = new File(['fake'], 'test.png', { type: 'image/png' })

    // Appeler l'action
    const result = await store.uploadSticker(file, 'Test')

    // Vérifier que l'erreur est gérée
    expect(result).toBeNull()
    expect(store.error).toContain(errorMessage)
    expect(store.loading).toBe(false)
  })

  // ========================================
  // TEST 8: Renommage de sticker (succès)
  // ========================================

  it('should rename sticker successfully', async () => {
    const store = useStickerLibraryStore()

    // Mock du renommage et reload
    const updatedSticker = { ...mockSticker1, name: 'New Name', tags: ['new', 'tags'] }
    vi.mocked(stickerService.updateStickerMetadata).mockResolvedValue(updatedSticker)
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({
      stickers: [updatedSticker, mockSticker2, mockSticker3],
      pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 }
    })

    // Renommer
    const result = await store.renameSticker('sticker-uuid-1', 'New Name', ['new', 'tags'])

    // Vérifier l'appel au service
    expect(stickerService.updateStickerMetadata).toHaveBeenCalledWith(
      'sticker-uuid-1',
      'New Name',
      ['new', 'tags']
    )

    // Vérifier le résultat
    expect(result).toEqual(updatedSticker)
    expect(store.error).toBeNull()
  })

  // ========================================
  // TEST 9: Gestion d'erreur lors du renommage
  // ========================================

  it('should handle error when renaming sticker', async () => {
    const store = useStickerLibraryStore()

    // Mock d'une erreur
    const errorMessage = 'Rename failed'
    vi.mocked(stickerService.updateStickerMetadata).mockRejectedValue(new Error(errorMessage))

    // Renommer
    const result = await store.renameSticker('sticker-uuid-1', 'New Name')

    // Vérifier l'erreur
    expect(result).toBeNull()
    expect(store.error).toContain(errorMessage)
    expect(store.loading).toBe(false)
  })

  // ========================================
  // TEST 10: Suppression de sticker (succès)
  // ========================================

  it('should delete sticker successfully', async () => {
    const store = useStickerLibraryStore()

    // Charger des stickers d'abord
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: mockStickers, pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 } })
    await store.loadStickerLibrary()

    // Mock de la suppression et reload
    vi.mocked(stickerService.deleteStickerFromLibrary).mockResolvedValue()
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({
      stickers: [mockSticker2, mockSticker3],
      pagination: { currentPage: 1, limit: 20, total: 2, totalPages: 1 }
    })

    // Supprimer
    await store.deleteSticker('sticker-uuid-1')

    // Vérifier l'appel au service
    expect(stickerService.deleteStickerFromLibrary).toHaveBeenCalledWith('sticker-uuid-1')

    // Vérifier que la bibliothèque a été rechargée
    expect(store.stickers.length).toBe(2)
    expect(store.error).toBeNull()
  })

  // ========================================
  // TEST 11: Suppression désélectionne si sélectionné
  // ========================================

  it('should deselect sticker when deleting selected sticker', async () => {
    const store = useStickerLibraryStore()

    // Sélectionner un sticker
    store.selectSticker('sticker-uuid-1')
    expect(store.selectedStickerId).toBe('sticker-uuid-1')

    // Mock de la suppression
    vi.mocked(stickerService.deleteStickerFromLibrary).mockResolvedValue()
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: [], pagination: { currentPage: 1, limit: 20, total: 0, totalPages: 0 } })

    // Supprimer le sticker sélectionné
    await store.deleteSticker('sticker-uuid-1')

    // Vérifier la désélection
    expect(store.selectedStickerId).toBeNull()
  })

  // ========================================
  // TEST 12: Gestion d'erreur lors de la suppression
  // ========================================

  it('should handle error when deleting sticker', async () => {
    const store = useStickerLibraryStore()

    // Mock d'une erreur
    const errorMessage = 'Delete failed'
    vi.mocked(stickerService.deleteStickerFromLibrary).mockRejectedValue(
      new Error(errorMessage)
    )

    // Supprimer
    await store.deleteSticker('sticker-uuid-1')

    // Vérifier l'erreur
    expect(store.error).toContain(errorMessage)
    expect(store.loading).toBe(false)
  })

  // ========================================
  // TEST 13: Sélection et désélection
  // ========================================

  it('should select and deselect stickers', () => {
    const store = useStickerLibraryStore()

    // État initial : aucune sélection
    expect(store.selectedStickerId).toBeNull()

    // Sélectionner un sticker
    store.selectSticker('sticker-uuid-1')
    expect(store.selectedStickerId).toBe('sticker-uuid-1')

    // Désélectionner
    store.deselectSticker()
    expect(store.selectedStickerId).toBeNull()
  })

  // ========================================
  // TEST 14: Getter getStickerById
  // ========================================

  it('should get sticker by id', async () => {
    const store = useStickerLibraryStore()

    // Charger des stickers
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: mockStickers, pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 } })
    await store.loadStickerLibrary()

    // Récupérer par ID
    const sticker = store.getStickerById('sticker-uuid-2')
    expect(sticker).toEqual(mockSticker2)

    // ID inexistant
    const notFound = store.getStickerById('non-existent-id')
    expect(notFound).toBeUndefined()
  })

  // ========================================
  // TEST 15: Getter getSelectedSticker
  // ========================================

  it('should get selected sticker', async () => {
    const store = useStickerLibraryStore()

    // Charger des stickers
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: mockStickers, pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 } })
    await store.loadStickerLibrary()

    // Aucune sélection
    expect(store.getSelectedSticker).toBeUndefined()

    // Sélectionner
    store.selectSticker('sticker-uuid-2')
    expect(store.getSelectedSticker).toEqual(mockSticker2)
  })

  // ========================================
  // TEST 16: Getter getStickerCount
  // ========================================

  it('should get sticker count', async () => {
    const store = useStickerLibraryStore()

    // État initial
    expect(store.getStickerCount).toBe(0)

    // Charger des stickers
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: mockStickers, pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 } })
    await store.loadStickerLibrary()

    // Vérifier le compte
    expect(store.getStickerCount).toBe(3)
  })

  // ========================================
  // TEST 17: Filtrage par terme de recherche
  // ========================================

  it('should filter stickers by query', async () => {
    const store = useStickerLibraryStore()

    // Charger des stickers
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: mockStickers, pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 } })
    await store.loadStickerLibrary()

    // Recherche par nom
    const results1 = store.getFilteredStickers('mountain')
    expect(results1.length).toBe(1)
    expect(results1[0].id).toBe('sticker-uuid-1')

    // Recherche par tag
    const results2 = store.getFilteredStickers('nature')
    expect(results2.length).toBe(2) // Mountain Landscape et Tropical Beach

    // Recherche sans résultat
    const results3 = store.getFilteredStickers('nonexistent')
    expect(results3.length).toBe(0)

    // Recherche vide retourne tous les stickers
    const results4 = store.getFilteredStickers('')
    expect(results4.length).toBe(3)
  })

  // ========================================
  // TEST 18: Filtrage insensible à la casse
  // ========================================

  it('should filter stickers case-insensitively', async () => {
    const store = useStickerLibraryStore()

    // Charger des stickers
    vi.mocked(stickerService.fetchStickerLibrary).mockResolvedValue({ stickers: mockStickers, pagination: { currentPage: 1, limit: 20, total: 3, totalPages: 1 } })
    await store.loadStickerLibrary()

    // Recherche en majuscules
    const results1 = store.getFilteredStickers('MOUNTAIN')
    expect(results1.length).toBe(1)
    expect(results1[0].name).toBe('Mountain Landscape')

    // Recherche en minuscules
    const results2 = store.getFilteredStickers('cute')
    expect(results2.length).toBe(1)
    expect(results2[0].name).toBe('Cute Cat')
  })
})
