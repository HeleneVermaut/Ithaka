/**
 * EmojiPicker Component Test Suite
 *
 * Comprehensive tests for the EmojiPicker component functionality:
 * - Component rendering and visibility
 * - Category tab navigation
 * - Search functionality and filtering
 * - Emoji selection and interaction
 * - API integration with pageElementService
 * - Event emissions (added, cancel)
 * - Error handling
 * - Loading states
 *
 * Test coverage:
 * - Unit tests for UI interactions
 * - Integration tests for API calls
 * - Edge cases and error scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import EmojiPicker from '../EmojiPicker.vue'
import pageElementService from '@/services/pageElementService'
import type { IPageElement } from '@/types/models'

/**
 * Mock pageElementService to avoid real API calls
 */
vi.mock('@/services/pageElementService', () => ({
  default: {
    createPageElement: vi.fn()
  }
}))

/**
 * Mock NaiveUI message API
 * Global window.$message used by the component
 */
const mockMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}

// Attach to window for component access
;(window as any).$message = mockMessage

describe('EmojiPicker.vue', () => {
  let wrapper: VueWrapper<any>

  /**
   * Default props for component mounting
   */
  const defaultProps = {
    show: true,
    pageId: '123e4567-e89b-12d3-a456-426614174000',
    x: 100,
    y: 200
  }

  /**
   * Helper function to mount component with custom props
   */
  const mountComponent = (props = {}) => {
    return mount(EmojiPicker, {
      props: {
        ...defaultProps,
        ...props
      },
      global: {
        stubs: {
          SearchOutline: true
        }
      }
    })
  }

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    mockMessage.success.mockClear()
    mockMessage.error.mockClear()
    mockMessage.warning.mockClear()
  })

  // ========================================
  // TEST 1: Component Rendering
  // ========================================

  it('should render correctly when show is true', () => {
    wrapper = mountComponent({ show: true })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props('show')).toBe(true)
  })

  it('should not be visible when show is false', () => {
    wrapper = mountComponent({ show: false })

    expect(wrapper.props('show')).toBe(false)
  })

  // ========================================
  // TEST 2: Category Tabs
  // ========================================

  it('should initialize with smileys category selected', async () => {
    wrapper = mountComponent()
    await nextTick()

    expect(wrapper.vm.selectedCategory).toBe('smileys')
  })

  it('should change category when handleCategoryChange is called', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Initial category should be 'smileys'
    expect(wrapper.vm.selectedCategory).toBe('smileys')

    // Simulate category change to 'nature'
    await wrapper.vm.handleCategoryChange('nature')
    await nextTick()

    expect(wrapper.vm.selectedCategory).toBe('nature')
  })

  // ========================================
  // TEST 3: Search Functionality
  // ========================================

  it('should filter emojis based on search query', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Set search query directly on VM
    wrapper.vm.searchQuery = 'dog'
    await nextTick()

    // Filtered emojis should include 'dog' in name or keywords
    const filtered = wrapper.vm.filteredEmojis
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.some((emoji: any) => emoji.name.toLowerCase().includes('dog'))).toBe(true)
  })

  it('should show empty state when search has no results', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Set search query that won't match anything
    wrapper.vm.searchQuery = 'zzz999nonexistent'
    await nextTick()

    expect(wrapper.vm.filteredEmojis.length).toBe(0)
  })

  it('should clear search when handleClearSearch is called', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Set search query
    wrapper.vm.searchQuery = 'cat'
    await nextTick()
    expect(wrapper.vm.searchQuery).toBe('cat')

    // Clear search
    await wrapper.vm.handleClearSearch()
    await nextTick()

    expect(wrapper.vm.searchQuery).toBe('')
  })

  it('should detect when search is active', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Initially search should not be active
    expect(wrapper.vm.isSearchActive).toBe(false)

    // Set search query
    wrapper.vm.searchQuery = 'smile'
    await nextTick()

    // Search should be active
    expect(wrapper.vm.isSearchActive).toBe(true)
  })

  // ========================================
  // TEST 4: Emoji Selection
  // ========================================

  it('should select emoji when handleEmojiClick is called', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Get first emoji from filtered list
    const firstEmoji = wrapper.vm.filteredEmojis[0]

    // Click emoji
    await wrapper.vm.handleEmojiClick(firstEmoji)
    await nextTick()

    expect(wrapper.vm.selectedEmoji).toEqual(firstEmoji)
    expect(wrapper.vm.hasSelectedEmoji).toBe(true)
  })

  it('should update selectedEmoji when different emoji is clicked', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Select first emoji
    const firstEmoji = wrapper.vm.filteredEmojis[0]
    await wrapper.vm.handleEmojiClick(firstEmoji)
    expect(wrapper.vm.selectedEmoji).toEqual(firstEmoji)

    // Select second emoji
    const secondEmoji = wrapper.vm.filteredEmojis[1]
    await wrapper.vm.handleEmojiClick(secondEmoji)
    await nextTick()

    expect(wrapper.vm.selectedEmoji).toEqual(secondEmoji)
  })

  // ========================================
  // TEST 5: API Integration
  // ========================================

  it('should call createPageElement when handleAddEmoji is called', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Mock successful API response
    const mockElement: IPageElement = {
      id: 'elem-123',
      pageId: defaultProps.pageId,
      type: 'emoji',
      x: 100,
      y: 200,
      width: 30,
      height: 30,
      rotation: 0,
      zIndex: 0,
      content: {},
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementService.createPageElement).mockResolvedValue(mockElement)

    // Select emoji
    const emoji = wrapper.vm.filteredEmojis[0]
    await wrapper.vm.handleEmojiClick(emoji)
    await nextTick()

    // Call add emoji
    await wrapper.vm.handleAddEmoji()
    await nextTick()

    // Verify API call
    expect(pageElementService.createPageElement).toHaveBeenCalledWith({
      pageId: defaultProps.pageId,
      type: 'emoji',
      x: 100,
      y: 200,
      width: 30,
      height: 30,
      rotation: 0,
      emojiContent: emoji.unicode
    })

    // Verify success message
    expect(mockMessage.success).toHaveBeenCalled()
  })

  it('should emit added event after successful API call', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Mock successful API response
    const mockElement: IPageElement = {
      id: 'elem-123',
      pageId: defaultProps.pageId,
      type: 'emoji',
      x: 100,
      y: 200,
      width: 30,
      height: 30,
      rotation: 0,
      zIndex: 0,
      content: {},
      style: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    vi.mocked(pageElementService.createPageElement).mockResolvedValue(mockElement)

    // Select emoji and add
    const emoji = wrapper.vm.filteredEmojis[0]
    await wrapper.vm.handleEmojiClick(emoji)
    await wrapper.vm.handleAddEmoji()
    await nextTick()

    // Verify added event emitted
    expect(wrapper.emitted('added')).toBeTruthy()
    expect(wrapper.emitted('added')?.[0]).toEqual([mockElement])
  })

  it('should handle API error gracefully', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Mock API error
    const mockError = new Error('Network error')
    vi.mocked(pageElementService.createPageElement).mockRejectedValue(mockError)

    // Select emoji and add
    const emoji = wrapper.vm.filteredEmojis[0]
    await wrapper.vm.handleEmojiClick(emoji)
    await wrapper.vm.handleAddEmoji()
    await nextTick()

    // Verify error message
    expect(mockMessage.error).toHaveBeenCalled()

    // Verify added event NOT emitted
    expect(wrapper.emitted('added')).toBeFalsy()
  })

  // ========================================
  // TEST 6: Cancel Action
  // ========================================

  it('should emit cancel event when handleCancel is called', async () => {
    wrapper = mountComponent()
    await nextTick()

    await wrapper.vm.handleCancel()
    await nextTick()

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('should reset state when modal is closed', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Set some state
    const emoji = wrapper.vm.filteredEmojis[0]
    await wrapper.vm.handleEmojiClick(emoji)
    wrapper.vm.searchQuery = 'test'
    await nextTick()

    // Change category (which clears search if active)
    await wrapper.vm.handleCategoryChange('nature')
    await nextTick()

    // Verify state is set (note: handleCategoryChange clears search)
    expect(wrapper.vm.selectedEmoji).not.toBeNull()
    expect(wrapper.vm.selectedCategory).toBe('nature')

    // Close modal
    await wrapper.vm.handleClose()
    await nextTick()

    // Verify state is reset
    expect(wrapper.vm.selectedEmoji).toBeNull()
    expect(wrapper.vm.searchQuery).toBe('')
    expect(wrapper.vm.selectedCategory).toBe('smileys')
  })

  // ========================================
  // TEST 7: Loading State
  // ========================================

  it('should show loading state during API call', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Mock slow API response
    vi.mocked(pageElementService.createPageElement).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    )

    // Select emoji and trigger add
    const emoji = wrapper.vm.filteredEmojis[0]
    await wrapper.vm.handleEmojiClick(emoji)

    // Start add operation (don't await)
    const addPromise = wrapper.vm.handleAddEmoji()

    // Check loading state is true
    expect(wrapper.vm.isLoading).toBe(true)

    // Wait for promise to complete
    await addPromise
    await nextTick()

    // Loading should be false after completion
    expect(wrapper.vm.isLoading).toBe(false)
  })

  // ========================================
  // TEST 8: Edge Cases
  // ========================================

  it('should show warning when add is clicked without selecting emoji', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Call handleAddEmoji without selecting emoji
    await wrapper.vm.handleAddEmoji()
    await nextTick()

    expect(mockMessage.warning).toHaveBeenCalledWith('Veuillez sélectionner un emoji')
  })

  it('should use default x and y positions when not provided', () => {
    wrapper = mountComponent({ x: undefined, y: undefined })

    expect(wrapper.props('x')).toBe(50)
    expect(wrapper.props('y')).toBe(50)
  })

  it('should reset state when show prop changes from false to true', async () => {
    wrapper = mountComponent({ show: false })
    await nextTick()

    // Set some state (while modal is closed)
    const emoji = wrapper.vm.filteredEmojis[0]
    await wrapper.vm.handleEmojiClick(emoji)
    wrapper.vm.searchQuery = 'test'
    await nextTick()

    // Verify state is set
    expect(wrapper.vm.selectedEmoji).not.toBeNull()
    expect(wrapper.vm.searchQuery).toBe('test')

    // Change show to true (opening modal)
    await wrapper.setProps({ show: true })
    await nextTick()

    // State should be reset due to watcher
    expect(wrapper.vm.selectedEmoji).toBeNull()
    expect(wrapper.vm.searchQuery).toBe('')
  })

  it('should have all 6 categories available', () => {
    wrapper = mountComponent()

    const categories = wrapper.vm.categories
    expect(categories).toHaveLength(6)
    expect(categories).toEqual(['smileys', 'nature', 'food', 'travel', 'objects', 'symbols'])
  })

  it('should return correct empty message based on search state', async () => {
    wrapper = mountComponent()
    await nextTick()

    // Without search
    expect(wrapper.vm.emptyMessage).toBe('Aucun emoji disponible dans cette catégorie')

    // With search
    wrapper.vm.searchQuery = 'test123'
    await nextTick()

    expect(wrapper.vm.emptyMessage).toBe('Aucun emoji trouvé pour "test123"')
  })
})
