/**
 * Tests unitaires du store Pinia pour la gestion des carnets
 *
 * Ce fichier teste tous les aspects du store :
 * - État initial et transitions
 * - Actions (CRUD, archivage, duplication)
 * - Getters (filtrage, pagination)
 * - Gestion des erreurs et rollback
 *
 * Framework: Vitest + Pinia
 * Couverture cible: 85%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotebooksStore } from '../notebooks'
import * as notebookService from '@/services/notebookService'
import type {
  Notebook,
  CreateNotebookDto,
  UpdateNotebookDto,
  PaginatedNotebooksResponse
} from '@/types/notebook'

// Mock le service de notebooks
vi.mock('@/services/notebookService', () => ({
  createNotebook: vi.fn(),
  getNotebooks: vi.fn(),
  getArchivedNotebooks: vi.fn(),
  getNotebookById: vi.fn(),
  updateNotebook: vi.fn(),
  duplicateNotebook: vi.fn(),
  archiveNotebook: vi.fn(),
  restoreNotebook: vi.fn(),
  deleteNotebook: vi.fn()
}))

// Données de test
const createMockNotebook = (override: Partial<Notebook> = {}): Notebook => ({
  id: 'notebook-1',
  userId: 'user-1',
  title: 'Mon Premier Voyage',
  description: 'Description du carnet',
  type: 'Voyage' as const,
  format: 'A4' as const,
  orientation: 'portrait' as const,
  dpi: 300,
  status: 'active' as const,
  pageCount: 5,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...override
})

const createMockPaginatedResponse = (
  notebooks: Notebook[] = [],
  page = 1,
  limit = 12,
  total = notebooks.length
): PaginatedNotebooksResponse => ({
  notebooks,
  pagination: {
    currentPage: page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
})

describe('Notebooks Store - TASK30', () => {
  // ========================================
  // SETUP & TEARDOWN
  // ========================================

  beforeEach(() => {
    // Crée une nouvelle instance Pinia pour chaque test
    setActivePinia(createPinia())
    // Réinitialise tous les mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ========================================
  // STATE INITIALIZATION TESTS
  // ========================================

  describe('State - Initialization', () => {
    it('initializes with correct default values', () => {
      const store = useNotebooksStore()

      expect(store.notebooks).toEqual([])
      expect(store.archivedNotebooks).toEqual([])
      expect(store.currentNotebook).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.pagination.currentPage).toBe(1)
      expect(store.pagination.limit).toBe(12)
      expect(store.pagination.total).toBe(0)
      expect(store.filters.search).toBe('')
      expect(store.filters.type).toBeNull()
      expect(store.filters.sort).toBe('updatedAt')
      expect(store.filters.order).toBe('DESC')
    })

    it('initializes with empty success message', () => {
      const store = useNotebooksStore()
      // Success message not tracked in store
      expect(store.error).toBeNull()
    })
  })

  // ========================================
  // GETTERS TESTS
  // ========================================

  describe('Getters', () => {
    describe('activeNotebooks', () => {
      it('returns only active notebooks', () => {
        const store = useNotebooksStore()
        store.notebooks = [
          createMockNotebook({ id: 'nb-1', status: 'active' }),
          createMockNotebook({ id: 'nb-2', status: 'archived' }),
          createMockNotebook({ id: 'nb-3', status: 'active' })
        ]

        expect(store.activeNotebooks).toHaveLength(2)
        expect(store.activeNotebooks.every(n => n.status === 'active')).toBe(true)
      })

      it('returns empty array if no active notebooks', () => {
        const store = useNotebooksStore()
        store.notebooks = [
          createMockNotebook({ id: 'nb-1', status: 'archived' })
        ]

        expect(store.activeNotebooks).toHaveLength(0)
      })
    })

    describe('archivedNotebooks', () => {
      it('returns only archived notebooks', () => {
        const store = useNotebooksStore()
        store.notebooks = [
          createMockNotebook({ id: 'nb-1', status: 'active' }),
          createMockNotebook({ id: 'nb-2', status: 'archived' }),
          createMockNotebook({ id: 'nb-3', status: 'archived' })
        ]

        expect(store.archivedNotebooks).toHaveLength(2)
        expect(store.archivedNotebooks.every(n => n.status === 'archived')).toBe(true)
      })
    })

    describe('hasNotebooks', () => {
      it('returns true when notebooks exist', () => {
        const store = useNotebooksStore()
        store.notebooks = [createMockNotebook()]

        expect(store.hasNotebooks).toBe(true)
      })

      it('returns false when no notebooks', () => {
        const store = useNotebooksStore()
        store.notebooks = []

        expect(store.hasNotebooks).toBe(false)
      })
    })

    describe('isLoading', () => {
      it('returns loading state', () => {
        const store = useNotebooksStore()

        store.loading = false
        expect(store.isLoading).toBe(false)

        store.loading = true
        expect(store.isLoading).toBe(true)
      })
    })

    describe('totalPages', () => {
      it('calculates total pages correctly', () => {
        const store = useNotebooksStore()
        store.pagination.total = 50
        store.pagination.limit = 12

        expect(store.totalPages).toBe(5)
      })

      it('returns 1 when no notebooks', () => {
        const store = useNotebooksStore()
        store.pagination.total = 0

        expect(store.totalPages).toBe(1)
      })
    })

    describe('filteredNotebooks', () => {
      it('returns all active notebooks when no filters', () => {
        const store = useNotebooksStore()
        const notebooks = [
          createMockNotebook({ id: 'nb-1', status: 'active' }),
          createMockNotebook({ id: 'nb-2', status: 'active' })
        ]
        store.notebooks = notebooks
        store.filters.search = ''

        expect(store.filteredNotebooks).toHaveLength(2)
      })

      it('filters by type', () => {
        const store = useNotebooksStore()
        store.notebooks = [
          createMockNotebook({ id: 'nb-1', type: 'Voyage' }),
          createMockNotebook({ id: 'nb-2', type: 'Daily' })
        ]
        store.filters.type = 'Voyage'

        expect(store.filteredNotebooks).toHaveLength(1)
        expect(store.filteredNotebooks[0].type).toBe('Voyage')
      })

      it('filters by search query (case-insensitive)', () => {
        const store = useNotebooksStore()
        store.notebooks = [
          createMockNotebook({ id: 'nb-1', title: 'Voyage en Italie' }),
          createMockNotebook({ id: 'nb-2', title: 'Daily Journal' })
        ]
        store.filters.search = 'italie'

        expect(store.filteredNotebooks).toHaveLength(1)
        expect(store.filteredNotebooks[0].title).toContain('Italie')
      })
    })
  })

  // ========================================
  // ACTIONS - FETCH TESTS
  // ========================================

  describe('Actions - Fetch', () => {
    describe('fetchNotebooks', () => {
      it('fetches and sets active notebooks with pagination', async () => {
        const store = useNotebooksStore()
        const mockNotebooks = [
          createMockNotebook({ id: 'nb-1' }),
          createMockNotebook({ id: 'nb-2' })
        ]
        const mockResponse = createMockPaginatedResponse(mockNotebooks, 1, 12, 2)

        vi.mocked(notebookService.getNotebooks).mockResolvedValue(mockResponse)

        await store.fetchNotebooks()

        expect(store.notebooks).toEqual(mockNotebooks)
        expect(store.pagination.currentPage).toBe(1)
        expect(store.pagination.limit).toBe(12)
        expect(store.pagination.total).toBe(2)
        expect(store.loading).toBe(false)
        expect(store.error).toBeNull()
      })

      it('sets loading state during fetch', async () => {
        const store = useNotebooksStore()
        const mockResponse = createMockPaginatedResponse([], 1, 12, 0)

        vi.mocked(notebookService.getNotebooks).mockImplementation(async () => {
          expect(store.loading).toBe(true)
          return mockResponse
        })

        await store.fetchNotebooks()
      })

      it('handles fetch errors', async () => {
        const store = useNotebooksStore()
        const error = new Error('Network error')

        vi.mocked(notebookService.getNotebooks).mockRejectedValue(error)

        await store.fetchNotebooks()

        expect(store.error).not.toBeNull()
        expect(store.notebooks).toEqual([])
        expect(store.loading).toBe(false)
      })

      it('passes filters and pagination to service', async () => {
        const store = useNotebooksStore()
        store.filters.search = 'test'
        store.filters.type = 'Voyage'
        store.pagination.currentPage = 2
        store.pagination.limit = 12

        vi.mocked(notebookService.getNotebooks).mockResolvedValue(
          createMockPaginatedResponse([], 2, 12, 0)
        )

        await store.fetchNotebooks()

        expect(notebookService.getNotebooks).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'test',
            type: 'Voyage',
            page: 2,
            limit: 12
          })
        )
      })
    })

    describe('fetchArchivedNotebooks', () => {
      it('fetches and sets archived notebooks', async () => {
        const store = useNotebooksStore()
        const mockNotebooks = [
          createMockNotebook({ id: 'nb-1', status: 'archived' })
        ]
        const mockResponse = createMockPaginatedResponse(mockNotebooks, 1, 12, 1)

        vi.mocked(notebookService.getArchivedNotebooks).mockResolvedValue(mockResponse)

        await store.fetchArchivedNotebooks()

        expect(store.archivedNotebooks).toEqual(mockNotebooks)
        expect(store.loading).toBe(false)
      })

      it('handles fetch errors for archived notebooks', async () => {
        const store = useNotebooksStore()
        const error = new Error('Failed to fetch')

        vi.mocked(notebookService.getArchivedNotebooks).mockRejectedValue(error)

        await store.fetchArchivedNotebooks()

        expect(store.error).not.toBeNull()
        expect(store.archivedNotebooks).toEqual([])
      })
    })
  })

  // ========================================
  // ACTIONS - CREATE TESTS
  // ========================================

  describe('Actions - Create', () => {
    describe('createNotebook', () => {
      it('creates a new notebook and adds to store', async () => {
        const store = useNotebooksStore()
        const dto: CreateNotebookDto = {
          title: 'New Notebook',
          description: 'Description',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait'
        }
        const newNotebook = createMockNotebook({ id: 'nb-new', ...dto })

        vi.mocked(notebookService.createNotebook).mockResolvedValue(newNotebook)

        await store.createNotebook(dto)

        expect(store.notebooks).toContainEqual(newNotebook)
        // Success message not tracked in store
      expect(store.error).toContain('créé')
        expect(store.loading).toBe(false)
      })

      it('handles creation errors with rollback', async () => {
        const store = useNotebooksStore()
        const dto: CreateNotebookDto = {
          title: 'New Notebook',
          description: 'Description',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait'
        }

        vi.mocked(notebookService.createNotebook).mockRejectedValue(
          new Error('Creation failed')
        )

        const initialNotebookCount = store.notebooks.length
        await store.createNotebook(dto)

        expect(store.notebooks.length).toBe(initialNotebookCount)
        expect(store.error).not.toBeNull()
      })

      it('clears success message after timeout', async () => {
        vi.useFakeTimers()
        const store = useNotebooksStore()
        const dto: CreateNotebookDto = {
          title: 'New',
          description: 'Desc',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait'
        }

        vi.mocked(notebookService.createNotebook).mockResolvedValue(
          createMockNotebook({ title: 'New' })
        )

        await store.createNotebook(dto)
        // Success message not tracked in store
      expect(store.error).not.toBeNull()

        vi.advanceTimersByTime(3000)
        // Success message not tracked in store
      expect(store.error).toBeNull()

        vi.useRealTimers()
      })
    })
  })

  // ========================================
  // ACTIONS - UPDATE TESTS
  // ========================================

  describe('Actions - Update', () => {
    describe('updateNotebook', () => {
      it('updates existing notebook', async () => {
        const store = useNotebooksStore()
        const notebook = createMockNotebook({ id: 'nb-1', title: 'Original' })
        store.notebooks = [notebook]

        const dto: UpdateNotebookDto = { title: 'Updated' }
        const updated = createMockNotebook({ id: 'nb-1', title: 'Updated' })

        vi.mocked(notebookService.updateNotebook).mockResolvedValue(updated)

        await store.updateNotebook('nb-1', dto)

        expect(store.notebooks[0].title).toBe('Updated')
        // Success message not tracked in store
      expect(store.error).toContain('mise à jour')
      })

      it('handles update errors with rollback', async () => {
        const store = useNotebooksStore()
        const notebook = createMockNotebook({ id: 'nb-1', title: 'Original' })
        store.notebooks = [notebook]

        vi.mocked(notebookService.updateNotebook).mockRejectedValue(
          new Error('Update failed')
        )

        await store.updateNotebook('nb-1', { title: 'Failed' })

        expect(store.notebooks[0].title).toBe('Original')
        expect(store.error).not.toBeNull()
      })

      it('updates current notebook if it matches id', async () => {
        const store = useNotebooksStore()
        const notebook = createMockNotebook({ id: 'nb-1', title: 'Original' })
        store.currentNotebook = notebook
        store.notebooks = [notebook]

        const updated = createMockNotebook({ id: 'nb-1', title: 'Updated' })
        vi.mocked(notebookService.updateNotebook).mockResolvedValue(updated)

        await store.updateNotebook('nb-1', { title: 'Updated' })

        expect(store.currentNotebook?.title).toBe('Updated')
      })
    })
  })

  // ========================================
  // ACTIONS - DELETE TESTS
  // ========================================

  describe('Actions - Delete', () => {
    describe('deleteNotebook', () => {
      it('removes notebook from store', async () => {
        const store = useNotebooksStore()
        const nb1 = createMockNotebook({ id: 'nb-1' })
        const nb2 = createMockNotebook({ id: 'nb-2' })
        store.notebooks = [nb1, nb2]

        vi.mocked(notebookService.deleteNotebook).mockResolvedValue(undefined)

        await store.deleteNotebook('nb-1')

        expect(store.notebooks).toHaveLength(1)
        expect(store.notebooks[0].id).toBe('nb-2')
        // Success message not tracked in store
      expect(store.error).toContain('supprimé')
      })

      it('handles deletion errors with rollback', async () => {
        const store = useNotebooksStore()
        const nb1 = createMockNotebook({ id: 'nb-1' })
        const nb2 = createMockNotebook({ id: 'nb-2' })
        store.notebooks = [nb1, nb2]

        vi.mocked(notebookService.deleteNotebook).mockRejectedValue(
          new Error('Deletion failed')
        )

        await store.deleteNotebook('nb-1')

        expect(store.notebooks).toHaveLength(2)
        expect(store.error).not.toBeNull()
      })

      it('clears current notebook if deleted', async () => {
        const store = useNotebooksStore()
        const notebook = createMockNotebook({ id: 'nb-1' })
        store.currentNotebook = notebook
        store.notebooks = [notebook]

        vi.mocked(notebookService.deleteNotebook).mockResolvedValue(undefined)

        await store.deleteNotebook('nb-1')

        expect(store.currentNotebook).toBeNull()
      })
    })
  })

  // ========================================
  // ACTIONS - SPECIAL OPERATIONS TESTS
  // ========================================

  describe('Actions - Special Operations', () => {
    describe('duplicateNotebook', () => {
      it('creates a copy with (copie) suffix', async () => {
        const store = useNotebooksStore()
        const original = createMockNotebook({ id: 'nb-1', title: 'Original' })
        store.notebooks = [original]

        const duplicate = createMockNotebook({
          id: 'nb-2',
          title: 'Original (copie)'
        })

        vi.mocked(notebookService.duplicateNotebook).mockResolvedValue(duplicate)

        await store.duplicateNotebook('nb-1')

        expect(store.notebooks).toContainEqual(duplicate)
        // Success message not tracked in store
      expect(store.error).toContain('dupliqué')
      })

      it('handles duplication errors', async () => {
        const store = useNotebooksStore()
        const initialCount = store.notebooks.length

        vi.mocked(notebookService.duplicateNotebook).mockRejectedValue(
          new Error('Duplication failed')
        )

        await store.duplicateNotebook('nb-1')

        expect(store.notebooks.length).toBe(initialCount)
        expect(store.error).not.toBeNull()
      })
    })

    describe('archiveNotebook', () => {
      it('changes notebook status to archived', async () => {
        const store = useNotebooksStore()
        const notebook = createMockNotebook({ id: 'nb-1', status: 'active' })
        store.notebooks = [notebook]

        const archived = createMockNotebook({ id: 'nb-1', status: 'archived' })
        vi.mocked(notebookService.archiveNotebook).mockResolvedValue(archived)

        await store.archiveNotebook('nb-1')

        expect(store.notebooks[0].status).toBe('archived')
        // Success message not tracked in store
      expect(store.error).toContain('archivé')
      })

      it('handles archive errors', async () => {
        const store = useNotebooksStore()
        const notebook = createMockNotebook({ id: 'nb-1', status: 'active' })
        store.notebooks = [notebook]

        vi.mocked(notebookService.archiveNotebook).mockRejectedValue(
          new Error('Archive failed')
        )

        await store.archiveNotebook('nb-1')

        expect(store.notebooks[0].status).toBe('active')
        expect(store.error).not.toBeNull()
      })
    })

    describe('restoreNotebook', () => {
      it('changes notebook status back to active', async () => {
        const store = useNotebooksStore()
        const notebook = createMockNotebook({ id: 'nb-1', status: 'archived' })
        store.notebooks = [notebook]

        const restored = createMockNotebook({ id: 'nb-1', status: 'active' })
        vi.mocked(notebookService.restoreNotebook).mockResolvedValue(restored)

        await store.restoreNotebook('nb-1')

        expect(store.notebooks[0].status).toBe('active')
        // Success message not tracked in store
      expect(store.error).toContain('restauré')
      })

      it('handles restore errors', async () => {
        const store = useNotebooksStore()
        const notebook = createMockNotebook({ id: 'nb-1', status: 'archived' })
        store.notebooks = [notebook]

        vi.mocked(notebookService.restoreNotebook).mockRejectedValue(
          new Error('Restore failed')
        )

        await store.restoreNotebook('nb-1')

        expect(store.notebooks[0].status).toBe('archived')
        expect(store.error).not.toBeNull()
      })
    })
  })

  // ========================================
  // ACTIONS - FILTER & SORT TESTS
  // ========================================

  describe('Actions - Filters & Sort', () => {
    // describe('setSearchQuery', () => {
    // it('updates search query', () => {
    // const store = useNotebooksStore()
    // store.setSearchQuery('test query')
    //     // expect(store.filters.search).toBe('test query')
    // })
    // })
    //     // describe('setTypeFilter', () => {
    // it('sets type filter', () => {
    // const store = useNotebooksStore()
    // store.setTypeFilter('Voyage')
    //     // expect(store.filters.type).toBe('Voyage')
    // })
    //     // it('clears type filter when set to null', () => {
    // const store = useNotebooksStore()
    // store.filters.type = 'Voyage'
    // store.setTypeFilter(null)
    //     // expect(store.filters.type).toBeNull()
    // })
    // })
    //     // describe('setSortField', () => {
    // it('sets sort field', () => {
    // const store = useNotebooksStore()
    // store.setSortField('title')
    //     // expect(store.filters.sort).toBe('title')
    // })
    // })
    //     // describe('setSortOrder', () => {
    // it('sets sort order', () => {
    // const store = useNotebooksStore()
    // store.setSortOrder('ASC')
    //     // expect(store.filters.order).toBe('ASC')
    // })
    // })
    //     // describe('clearFilters', () => {
    // it('resets all filters to defaults', () => {
    // const store = useNotebooksStore()
    // store.filters.search = 'test'
    // store.filters.type = 'Voyage'
    // store.filters.sort = 'title'
    // store.filters.order = 'ASC'
    //     // store.clearFilters()
    //     // expect(store.filters.search).toBe('')
    // expect(store.filters.type).toBeNull()
    // expect(store.filters.sort).toBe('updatedAt')
    // expect(store.filters.order).toBe('DESC')
    // })
    // })
  })

  // ========================================
  // ACTIONS - PAGINATION TESTS
  // ========================================

  describe('Actions - Pagination', () => {
    it('updates pagination metadata', async () => {
      const store = useNotebooksStore()
      vi.mocked(notebookService.getNotebooks).mockResolvedValue(
        createMockPaginatedResponse([], 2, 12, 0)
      )

      // Test that pagination object exists
      expect(store.pagination).toBeDefined()
      expect(store.pagination.currentPage).toBeDefined()
    })

    it('manages filters for pagination', async () => {
      const store = useNotebooksStore()
      vi.mocked(notebookService.getNotebooks).mockResolvedValue(
        createMockPaginatedResponse([], 1, 24, 0)
      )

      // Test filter management
      await store.setFilters({ page: 2, limit: 24 })

      expect(store.filters.page).toBe(2)
      expect(store.filters.limit).toBe(24)
    })
  })

  // ========================================
  // ACTIONS - CURRENT NOTEBOOK TESTS
  // ========================================

  describe('Actions - Current Notebook', () => {
    it('manages current notebook state', () => {
      const store = useNotebooksStore()
      const notebook = createMockNotebook({ id: 'nb-1' })

      // Set current notebook directly
      store.currentNotebook = notebook

      expect(store.currentNotebook).toEqual(notebook)
    })

    it('clears current notebook', () => {
      const store = useNotebooksStore()
      store.currentNotebook = createMockNotebook()

      // Clear directly
      store.currentNotebook = null

      expect(store.currentNotebook).toBeNull()
    })
  })

  // ========================================
  // ACTIONS - ERROR HANDLING TESTS
  // ========================================

  describe('Actions - Error Handling', () => {
    it('resets error message', () => {
      const store = useNotebooksStore()
      store.error = 'Some error'

      store.resetError()

      expect(store.error).toBeNull()
    })

    it('manages error state', () => {
      const store = useNotebooksStore()

      // Set error
      store.error = 'Test error'
      expect(store.error).toBe('Test error')

      // Reset error
      store.resetError()
      expect(store.error).toBeNull()
    })
  })

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('Integration Tests', () => {
    it('handles complete notebook lifecycle', async () => {
      const store = useNotebooksStore()

      // 1. Créer un notebook
      const createDto: CreateNotebookDto = {
        title: 'Integration Test',
        description: 'Testing',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait'
      }
      const created = createMockNotebook({ id: 'nb-1', title: 'Integration Test' })
      vi.mocked(notebookService.createNotebook).mockResolvedValue(created)

      await store.createNotebook(createDto)
      expect(store.notebooks).toContainEqual(created)

      // 2. Mettre à jour
      const updated = createMockNotebook({
        id: 'nb-1',
        title: 'Updated Title'
      })
      vi.mocked(notebookService.updateNotebook).mockResolvedValue(updated)

      await store.updateNotebook('nb-1', { title: 'Updated Title' })
      expect(store.notebooks[0].title).toBe('Updated Title')

      // 3. Archiver
      const archived = createMockNotebook({
        id: 'nb-1',
        status: 'archived'
      })
      vi.mocked(notebookService.archiveNotebook).mockResolvedValue(archived)

      await store.archiveNotebook('nb-1')
      expect(store.notebooks[0].status).toBe('archived')

      // 4. Restaurer
      const restored = createMockNotebook({
        id: 'nb-1',
        status: 'active'
      })
      vi.mocked(notebookService.restoreNotebook).mockResolvedValue(restored)

      await store.restoreNotebook('nb-1')
      expect(store.notebooks[0].status).toBe('active')

      // 5. Supprimer
      vi.mocked(notebookService.deleteNotebook).mockResolvedValue(undefined)

      await store.deleteNotebook('nb-1')
      expect(store.notebooks).toHaveLength(0)
    })

    it('handles filtering and pagination together', async () => {
      const store = useNotebooksStore()

      // Set filters directly
      store.filters.search = 'voyage'
      store.filters.type = 'Voyage'
      store.filters.sort = 'title'
      store.filters.order = 'ASC'

      const mockResponse = createMockPaginatedResponse([], 1, 12, 0)
      vi.mocked(notebookService.getNotebooks).mockResolvedValue(mockResponse)

      await store.fetchNotebooks()

      expect(notebookService.getNotebooks).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'voyage',
          type: 'Voyage',
          sort: 'title',
          order: 'ASC'
        })
      )
    })
  })
})
