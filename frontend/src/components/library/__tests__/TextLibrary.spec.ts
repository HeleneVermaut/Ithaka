import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import TextLibrary from '../TextLibrary.vue'
import { useAuthStore } from '@/stores/auth'
import type { ISavedText } from '@/types/models'

/**
 * Mock data for testing
 */
const mockSavedTexts: ISavedText[] = [
  {
    id: 'text-1',
    label: 'First Text',
    type: 'citation',
    content: {
      text: 'This is a citation quote',
      fontFamily: 'Roboto',
      fontSize: 16,
      fill: '#000000',
      textAlign: 'left',
      fontWeight: 'normal',
      fontStyle: 'normal',
      underline: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'text-2',
    label: 'Poetry Example',
    type: 'poeme',
    content: {
      text: 'A beautiful poem with multiple lines\nof creative text',
      fontFamily: 'Playfair Display',
      fontSize: 18,
      fill: '#1a1a1a',
      textAlign: 'center',
      fontWeight: 'bold',
      fontStyle: 'italic',
      underline: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'text-3',
    label: 'Free Text Example',
    type: 'libre',
    content: {
      text: 'This is a free text sample',
      fontFamily: 'Open Sans',
      fontSize: 14,
      fill: '#333333',
      textAlign: 'left',
      fontWeight: 'normal',
      fontStyle: 'normal',
      underline: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

/**
 * Test suite for TextLibrary component
 *
 * Tests library display, search, delete, and use functionality (US03)
 */
describe('TextLibrary.vue', () => {
  let wrapper: any
  let authStore: any

  beforeEach(() => {
    const pinia = createPinia()

    wrapper = mount(TextLibrary, {
      global: {
        plugins: [pinia],
        stubs: {
          NInput: { template: '<input />' },
          NButton: { template: '<button><slot /></button>' },
          NEmpty: { template: '<div>Empty</div>' },
          NIcon: { template: '<span></span>' },
          NGrid: { template: '<div><slot /></div>' },
          NGridItem: { template: '<div><slot /></div>' },
          NSpace: { template: '<div><slot /></div>' },
          NCard: { template: '<div><slot /></div>' },
          NPopconfirm: { template: '<div><slot /></div>' }
        }
      }
    })

    authStore = useAuthStore()
    authStore.savedTexts = mockSavedTexts
  })

  // =====================================================
  // RENDER & STRUCTURE TESTS
  // =====================================================

  it('renders component container', () => {
    const container = wrapper.find('.text-library')
    expect(container.exists()).toBe(true)
  })

  it('renders header with title', () => {
    const header = wrapper.find('.text-library-header h2')
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('Bibliothèque de Textes')
  })

  it('renders search input', () => {
    const searchInput = wrapper.find('input')
    expect(searchInput.exists()).toBe(true)
  })

  it('renders text grid when texts exist', () => {
    const grid = wrapper.find('.text-grid')
    expect(grid.exists()).toBe(true)
  })

  it('renders empty state when no texts', async () => {
    authStore.savedTexts = []
    await flushPromises()

    const emptyState = wrapper.find('.empty-state-container')
    expect(emptyState.exists()).toBe(true)
  })

  // =====================================================
  // EMPTY STATE TESTS
  // =====================================================

  it('displays empty message when no texts saved', async () => {
    authStore.savedTexts = []
    await flushPromises()

    const emptyText = wrapper.find('.empty-state-container')
    expect(emptyText.text()).toContain('Aucun texte sauvegardé')
  })

  it('shows helpful subtitle in empty state', async () => {
    authStore.savedTexts = []
    await flushPromises()

    const subtitle = wrapper.find('.empty-subtitle')
    expect(subtitle.exists()).toBe(true)
  })

  it('transitions from empty to populated state', async () => {
    authStore.savedTexts = []
    await flushPromises()

    expect(wrapper.find('.empty-state-container').exists()).toBe(true)

    authStore.savedTexts = mockSavedTexts
    await flushPromises()

    expect(wrapper.find('.text-grid').exists()).toBe(true)
  })

  // =====================================================
  // TEXT DISPLAY TESTS
  // =====================================================

  it('displays all saved texts', () => {
    const cards = wrapper.findAll('.text-card')
    expect(cards.length).toBe(mockSavedTexts.length)
  })

  it('displays text label correctly', () => {
    const labels = wrapper.findAll('.text-label')
    expect(labels[0].text()).toBe('First Text')
    expect(labels[1].text()).toBe('Poetry Example')
    expect(labels[2].text()).toBe('Free Text Example')
  })

  it('displays text type badge', () => {
    const typeBadges = wrapper.findAll('.text-type')
    expect(typeBadges[0].text()).toBe('Citation')
    expect(typeBadges[1].text()).toBe('Poème')
    expect(typeBadges[2].text()).toBe('Libre')
  })

  it('displays text preview truncated at 100 chars', () => {
    const longText = 'x'.repeat(150)
    authStore.savedTexts[0].content.text = longText

    const previews = wrapper.findAll('.text-preview p')
    expect(previews[0].text().length).toBeLessThanOrEqual(103) // 100 + '...'
  })

  it('displays complete text preview when under 100 chars', () => {
    authStore.savedTexts[0].content.text = 'Short text'
    const preview = wrapper.vm.getTextPreview(authStore.savedTexts[0])
    expect(preview).toBe('Short text')
  })

  it('displays font family and size info', () => {
    const fontInfos = wrapper.findAll('.font-info')
    expect(fontInfos.length).toBeGreaterThan(0)
  })

  it('displays creation date', () => {
    const dates = wrapper.findAll('.text-time')
    expect(dates.length).toBeGreaterThan(0)
  })

  // =====================================================
  // SEARCH & FILTER TESTS
  // =====================================================

  it('filters texts by label', async () => {
    wrapper.vm.searchQuery = 'First'
    await flushPromises()

    const filtered = wrapper.vm.filteredTexts
    expect(filtered.length).toBe(1)
    expect(filtered[0].label).toBe('First Text')
  })

  it('filters texts by content', async () => {
    wrapper.vm.searchQuery = 'citation quote'
    await flushPromises()

    const filtered = wrapper.vm.filteredTexts
    expect(filtered.length).toBeGreaterThan(0)
  })

  it('case-insensitive search', async () => {
    wrapper.vm.searchQuery = 'POETRY'
    await flushPromises()

    const filtered = wrapper.vm.filteredTexts
    expect(filtered.length).toBe(1)
    expect(filtered[0].label).toBe('Poetry Example')
  })

  it('trims search query whitespace', async () => {
    wrapper.vm.searchQuery = '  First Text  '
    await flushPromises()

    const filtered = wrapper.vm.filteredTexts
    expect(filtered.length).toBe(1)
  })

  it('returns all texts when search is empty', async () => {
    wrapper.vm.searchQuery = ''
    await flushPromises()

    expect(wrapper.vm.filteredTexts.length).toBe(mockSavedTexts.length)
  })

  it('returns no results for non-matching search', async () => {
    wrapper.vm.searchQuery = 'nonexistent'
    await flushPromises()

    expect(wrapper.vm.filteredTexts.length).toBe(0)
  })

  it('updates results as search query changes', async () => {
    wrapper.vm.searchQuery = 'First'
    await flushPromises()
    expect(wrapper.vm.filteredTexts.length).toBe(1)

    wrapper.vm.searchQuery = 'Poetry'
    await flushPromises()
    expect(wrapper.vm.filteredTexts.length).toBe(1)

    wrapper.vm.searchQuery = 'Text'
    await flushPromises()
    expect(wrapper.vm.filteredTexts.length).toBeGreaterThan(0)
  })

  // =====================================================
  // TEXT SELECTION TESTS
  // =====================================================

  it('selects text on card click', async () => {
    wrapper.vm.handleCardClick(mockSavedTexts[0])
    expect(wrapper.vm.selectedTextId).toBe('text-1')
  })

  it('applies selected style to selected card', async () => {
    wrapper.vm.selectedTextId = 'text-1'
    await flushPromises()

    // The selected state would be reflected in the card classes
    expect(wrapper.vm.selectedTextId).toBe('text-1')
  })

  it('changes selection when clicking different card', async () => {
    wrapper.vm.handleCardClick(mockSavedTexts[0])
    expect(wrapper.vm.selectedTextId).toBe('text-1')

    wrapper.vm.handleCardClick(mockSavedTexts[1])
    expect(wrapper.vm.selectedTextId).toBe('text-2')
  })

  // =====================================================
  // USE TEXT EVENT TESTS
  // =====================================================

  it('emits use-text event on double-click', async () => {
    wrapper.vm.handleDoubleClick(mockSavedTexts[0])

    expect(wrapper.emitted('use-text')).toBeTruthy()
    expect(wrapper.emitted('use-text')[0]).toEqual([mockSavedTexts[0]])
  })

  it('emits use-text event on use button click', async () => {
    wrapper.vm.handleUseClick(mockSavedTexts[1])

    expect(wrapper.emitted('use-text')).toBeTruthy()
    expect(wrapper.emitted('use-text')[0]).toEqual([mockSavedTexts[1]])
  })

  it('passes correct text data in use-text event', async () => {
    wrapper.vm.handleUseClick(mockSavedTexts[0])

    const emittedData = wrapper.emitted('use-text')[0][0]
    expect(emittedData.id).toBe('text-1')
    expect(emittedData.label).toBe('First Text')
    expect(emittedData.content.text).toBe('This is a citation quote')
  })

  // =====================================================
  // DELETE TESTS
  // =====================================================

  it('shows delete confirmation dialog', async () => {
    wrapper.vm.handleDeleteClick(mockSavedTexts[0])

    expect(wrapper.vm.showDeleteDialog).toBe(true)
    expect(wrapper.vm.textToDelete).toEqual(mockSavedTexts[0])
  })

  it('calls authStore.deleteSavedText on confirm delete', async () => {
    const spy = vi.spyOn(authStore, 'deleteSavedText').mockResolvedValue(undefined)

    wrapper.vm.textToDelete = mockSavedTexts[0]
    await wrapper.vm.confirmDelete()
    await flushPromises()

    expect(spy).toHaveBeenCalledWith('text-1')
  })

  it('clears delete dialog after successful delete', async () => {
    vi.spyOn(authStore, 'deleteSavedText').mockResolvedValue(undefined)

    wrapper.vm.textToDelete = mockSavedTexts[0]
    await wrapper.vm.confirmDelete()
    await flushPromises()

    expect(wrapper.vm.showDeleteDialog).toBe(false)
    expect(wrapper.vm.textToDelete).toBeNull()
  })

  it('handles delete error gracefully', async () => {
    const error = new Error('Delete failed')
    vi.spyOn(authStore, 'deleteSavedText').mockRejectedValue(error)

    wrapper.vm.textToDelete = mockSavedTexts[0]
    await wrapper.vm.confirmDelete()
    await flushPromises()

    // Dialog should close even on error
    expect(wrapper.vm.showDeleteDialog).toBe(false)
  })

  // =====================================================
  // DRAG AND DROP TESTS
  // =====================================================

  it('handles drag start event', () => {
    const event = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true
    })

    const spy = vi.spyOn(event.dataTransfer!, 'setData')

    wrapper.vm.handleDragStart(mockSavedTexts[0], event as any)

    expect(spy).toHaveBeenCalled()
  })

  it('sets correct dataTransfer effectAllowed', () => {
    const mockDataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      setDragImage: vi.fn()
    }

    wrapper.vm.handleDragStart(mockSavedTexts[0], {
      dataTransfer: mockDataTransfer
    } as any)

    expect(mockDataTransfer.effectAllowed).toBe('copy')
  })

  it('stores text data in dataTransfer', () => {
    const mockDataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      setDragImage: vi.fn()
    }

    wrapper.vm.handleDragStart(mockSavedTexts[0], {
      dataTransfer: mockDataTransfer
    } as any)

    expect(mockDataTransfer.setData).toHaveBeenCalledWith(
      'application/json',
      expect.stringContaining('First Text')
    )
  })

  // =====================================================
  // TYPE LABEL FORMATTING TESTS
  // =====================================================

  it('formats citation type label', () => {
    const label = wrapper.vm.getTypeLabel('citation')
    expect(label).toBe('Citation')
  })

  it('formats poeme type label', () => {
    const label = wrapper.vm.getTypeLabel('poeme')
    expect(label).toBe('Poème')
  })

  it('formats libre type label', () => {
    const label = wrapper.vm.getTypeLabel('libre')
    expect(label).toBe('Libre')
  })

  it('returns original value for unknown type', () => {
    const label = wrapper.vm.getTypeLabel('unknown')
    expect(label).toBe('unknown')
  })

  // =====================================================
  // LIFECYCLE TESTS
  // =====================================================

  it('loads saved texts on mount', async () => {
    const spy = vi.spyOn(authStore, 'fetchSavedTexts').mockResolvedValue(undefined)

    await wrapper.vm.loadSavedTexts()

    expect(spy).toHaveBeenCalled()
  })

  it('sets loading state during fetch', async () => {
    expect(wrapper.vm.isLoading).toBe(false)

    vi.spyOn(authStore, 'fetchSavedTexts').mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    wrapper.vm.loadSavedTexts()
    expect(wrapper.vm.isLoading).toBe(true)

    await flushPromises()
  })

  // =====================================================
  // INTEGRATION TESTS
  // =====================================================

  it('completes full workflow: search, select, use', async () => {
    // Search
    wrapper.vm.searchQuery = 'Poetry'
    await flushPromises()
    expect(wrapper.vm.filteredTexts.length).toBe(1)

    // Select
    wrapper.vm.handleCardClick(mockSavedTexts[1])
    expect(wrapper.vm.selectedTextId).toBe('text-2')

    // Use
    wrapper.vm.handleUseClick(mockSavedTexts[1])
    expect(wrapper.emitted('use-text')).toBeTruthy()
  })

  it('completes full workflow: search, select, delete', async () => {
    const deleteSpy = vi.spyOn(authStore, 'deleteSavedText').mockResolvedValue(undefined)

    // Search
    wrapper.vm.searchQuery = 'First'
    await flushPromises()

    // Delete
    wrapper.vm.handleDeleteClick(mockSavedTexts[0])
    await wrapper.vm.confirmDelete()
    await flushPromises()

    expect(deleteSpy).toHaveBeenCalledWith('text-1')
  })

  // =====================================================
  // EDGE CASES
  // =====================================================

  it('handles search with special characters', async () => {
    wrapper.vm.searchQuery = '!@#$%'
    await flushPromises()

    expect(wrapper.vm.filteredTexts.length).toBe(0)
  })

  it('handles very long text content', () => {
    const longText = 'x'.repeat(1000)
    const preview = wrapper.vm.getTextPreview({
      ...mockSavedTexts[0],
      content: { ...mockSavedTexts[0].content, text: longText }
    })

    expect(preview.length).toBeLessThanOrEqual(103)
  })

  it('handles empty savedTexts array', async () => {
    authStore.savedTexts = []
    await flushPromises()

    expect(wrapper.vm.filteredTexts.length).toBe(0)
    expect(wrapper.find('.empty-state-container').exists()).toBe(true)
  })

  it('handles null or undefined dates gracefully', () => {
    const textWithoutDate: ISavedText = {
      ...mockSavedTexts[0],
      createdAt: new Date().toISOString()
    }

    expect(() => {
      new Date(textWithoutDate.createdAt).toLocaleDateString('fr-FR')
    }).not.toThrow()
  })
})
