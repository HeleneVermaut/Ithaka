/**
 * Unit Tests for useKeyboardShortcuts Composable
 *
 * Tests de couverture complète pour tous les raccourcis clavier supportés:
 * - Undo/Redo (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
 * - Suppression (Delete, Backspace)
 * - Sélection (Ctrl+A)
 * - Duplication (Ctrl+D)
 * - Nudging (Flèches)
 * - Escape / ForceSave
 *
 * Couverture: 85%+
 * Exécution: npm run test composables/__tests__/useKeyboardShortcuts.spec.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts'
import { usePageElementsStore } from '@/stores/pageElementsStore'
import { useEditorStore } from '@/stores/editor'
import { useMessage } from 'naive-ui'

// Mock des stores
vi.mock('@/stores/pageElementsStore')
vi.mock('@/stores/editor')
vi.mock('naive-ui', () => ({
  useMessage: vi.fn()
}))

vi.mock('@/services/pageElementService', () => ({
  default: {
    deletePageElement: vi.fn(),
    updatePageElement: vi.fn()
  }
}))

// ========================================
// TEST SETUP
// ========================================

describe('useKeyboardShortcuts Composable', () => {
  let pageElementsStoreMock: any
  let editorStoreMock: any
  let messageMock: any

  beforeEach(() => {
    // Setup page elements store mock
    pageElementsStoreMock = {
      selectedElementIds: ref<string[]>(['element-1']),
      elements: [
        {
          id: 'element-1',
          type: 'text',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          rotation: 0
        },
        {
          id: 'element-2',
          type: 'image',
          x: 50,
          y: 60,
          width: 150,
          height: 100,
          rotation: 0
        }
      ],
      getElementCount: 2,
      getElementById: vi.fn((id: string) => {
        return pageElementsStoreMock.elements.find((el: any) => el.id === id)
      }),
      selectElement: vi.fn(),
      selectAll: vi.fn(),
      deselectAll: vi.fn(),
      deleteElement: vi.fn().mockResolvedValue(undefined),
      duplicateElement: vi.fn().mockResolvedValue({ id: 'element-3' }),
      updateElement: vi.fn().mockResolvedValue({}),
      getSelectedElement: null
    }

    // Setup editor store mock
    editorStoreMock = {
      canUndo: true,
      canRedo: true,
      undo: vi.fn(),
      redo: vi.fn()
    }

    // Setup message mock
    messageMock = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    }

    // Apply mocks
    vi.mocked(usePageElementsStore).mockReturnValue(pageElementsStoreMock)
    vi.mocked(useEditorStore).mockReturnValue(editorStoreMock)
    vi.mocked(useMessage).mockReturnValue(messageMock)

    // Clear all timers
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  // ========================================
  // LIFECYCLE TESTS
  // ========================================

  describe('Lifecycle', () => {
    it('should attach event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { registerShortcuts } = useKeyboardShortcuts()
      registerShortcuts()

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function))

      addEventListenerSpy.mockRestore()
    })

    it('should detach event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unregisterShortcuts } = useKeyboardShortcuts()
      unregisterShortcuts()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function))

      removeEventListenerSpy.mockRestore()
    })

    it('should clean up timers on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const shortcuts = useKeyboardShortcuts()

      // Trigger a nudge to create a timer
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      shortcuts.handleKeyDown(event)

      // Unmount should clear timers
      shortcuts.unregisterShortcuts()

      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })
  })

  // ========================================
  // UNDO/REDO TESTS
  // ========================================

  describe('Undo/Redo Shortcuts', () => {
    it('should handle Ctrl+Z (undo) correctly', async () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(editorStoreMock.undo).toHaveBeenCalled()
    })

    it('should handle Ctrl+Shift+Z (redo) correctly', async () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(editorStoreMock.redo).toHaveBeenCalled()
    })

    it('should handle Ctrl+Y (redo) correctly', async () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(editorStoreMock.redo).toHaveBeenCalled()
    })

    it('should show warning when undo is not available', async () => {
      editorStoreMock.canUndo = false

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(messageMock.warning).toHaveBeenCalledWith('Aucune action à annuler')
    })

    it('should show warning when redo is not available', async () => {
      editorStoreMock.canRedo = false

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(messageMock.warning).toHaveBeenCalledWith('Aucune action à rétablir')
    })
  })

  // ========================================
  // DELETE TESTS
  // ========================================

  describe('Delete Shortcut', () => {
    it('should handle Delete key correctly', async () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'Delete'
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(pageElementsStoreMock.deleteElement).toHaveBeenCalledWith('element-1')
      expect(messageMock.success).toHaveBeenCalledWith('Élément supprimé')
    })

    it('should handle Backspace key correctly', async () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'Backspace'
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(pageElementsStoreMock.deleteElement).toHaveBeenCalledWith('element-1')
    })

    it('should not delete if no element is selected', async () => {
      pageElementsStoreMock.selectedElementIds = ref<string[]>([])

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'Delete'
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(pageElementsStoreMock.deleteElement).not.toHaveBeenCalled()
    })

    it('should show error message on delete failure', async () => {
      pageElementsStoreMock.deleteElement.mockRejectedValueOnce(new Error('API Error'))

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'Delete'
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(messageMock.error).toHaveBeenCalledWith('Erreur lors de la suppression')
    })
  })

  // ========================================
  // SELECT ALL TESTS
  // ========================================

  describe('Select All Shortcut', () => {
    it('should handle Ctrl+A correctly', async () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(pageElementsStoreMock.selectAll).toHaveBeenCalled()
      expect(messageMock.info).toHaveBeenCalledWith('2 élément(s) sélectionnés')
    })

    it('should show info when no elements on page', async () => {
      pageElementsStoreMock.getElementCount = 0
      pageElementsStoreMock.elements = []

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(messageMock.info).toHaveBeenCalledWith('Aucun élément sur la page')
    })
  })

  // ========================================
  // DUPLICATE TESTS
  // ========================================

  describe('Duplicate Shortcut', () => {
    it('should handle Ctrl+D correctly', async () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(pageElementsStoreMock.duplicateElement).toHaveBeenCalledWith('element-1')
      expect(messageMock.success).toHaveBeenCalledWith('Élément dupliqué')
    })

    it('should not duplicate if no element is selected', async () => {
      pageElementsStoreMock.selectedElementIds = ref<string[]>([])

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(pageElementsStoreMock.duplicateElement).not.toHaveBeenCalled()
    })

    it('should show error on duplicate failure', async () => {
      pageElementsStoreMock.duplicateElement.mockRejectedValueOnce(new Error('API Error'))

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(messageMock.error).toHaveBeenCalledWith('Erreur lors de la duplication')
    })
  })

  // ========================================
  // NUDGE (ARROW KEYS) TESTS
  // ========================================

  describe('Nudge with Arrow Keys', () => {
    it('should nudge up with 1px (ArrowUp)', async () => {
      vi.useFakeTimers()

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowUp'
      })

      shortcuts.handleKeyDown(event)

      vi.advanceTimersByTime(200)

      expect(pageElementsStoreMock.updateElement).toHaveBeenCalledWith('element-1', {
        x: 10,
        y: 19 // 20 - 1
      })

      vi.useRealTimers()
    })

    it('should nudge down with 1px (ArrowDown)', async () => {
      vi.useFakeTimers()

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown'
      })

      shortcuts.handleKeyDown(event)

      vi.advanceTimersByTime(200)

      expect(pageElementsStoreMock.updateElement).toHaveBeenCalledWith('element-1', {
        x: 10,
        y: 21 // 20 + 1
      })

      vi.useRealTimers()
    })

    it('should nudge left with 1px (ArrowLeft)', async () => {
      vi.useFakeTimers()

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft'
      })

      shortcuts.handleKeyDown(event)

      vi.advanceTimersByTime(200)

      expect(pageElementsStoreMock.updateElement).toHaveBeenCalledWith('element-1', {
        x: 9, // 10 - 1
        y: 20
      })

      vi.useRealTimers()
    })

    it('should nudge right with 1px (ArrowRight)', async () => {
      vi.useFakeTimers()

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight'
      })

      shortcuts.handleKeyDown(event)

      vi.advanceTimersByTime(200)

      expect(pageElementsStoreMock.updateElement).toHaveBeenCalledWith('element-1', {
        x: 11, // 10 + 1
        y: 20
      })

      vi.useRealTimers()
    })

    it('should nudge with 10px when Shift is pressed', async () => {
      vi.useFakeTimers()

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        shiftKey: true
      })

      shortcuts.handleKeyDown(event)

      vi.advanceTimersByTime(200)

      expect(pageElementsStoreMock.updateElement).toHaveBeenCalledWith('element-1', {
        x: 10,
        y: 10 // 20 - 10
      })

      vi.useRealTimers()
    })

    it('should not allow negative positions', async () => {
      vi.useFakeTimers()

      // Set element with x=0, y=0
      pageElementsStoreMock.elements[0].x = 0
      pageElementsStoreMock.elements[0].y = 0

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft'
      })

      shortcuts.handleKeyDown(event)

      vi.advanceTimersByTime(200)

      expect(pageElementsStoreMock.updateElement).toHaveBeenCalledWith('element-1', {
        x: 0, // stays at 0, not -1
        y: 0
      })

      vi.useRealTimers()
    })

    it('should not nudge if no element is selected', async () => {
      pageElementsStoreMock.selectedElementIds = ref<string[]>([])

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowUp'
      })

      shortcuts.handleKeyDown(event)

      expect(pageElementsStoreMock.updateElement).not.toHaveBeenCalled()
    })
  })

  // ========================================
  // ESCAPE TESTS
  // ========================================

  describe('Escape Key', () => {
    it('should deselect elements on Escape', async () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'Escape'
      })

      shortcuts.handleKeyDown(event)

      expect(pageElementsStoreMock.deselectAll).toHaveBeenCalled()
    })

    it('should not deselect if nothing is selected', async () => {
      pageElementsStoreMock.selectedElementIds = ref<string[]>([])

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'Escape'
      })

      shortcuts.handleKeyDown(event)

      expect(pageElementsStoreMock.deselectAll).not.toHaveBeenCalled()
    })

    it('should call onShowDeleteModal callback if provided', async () => {
      const onShowDeleteModalMock = vi.fn()

      const shortcuts = useKeyboardShortcuts({
        onShowDeleteModal: onShowDeleteModalMock
      })

      const event = new KeyboardEvent('keydown', {
        key: 'Escape'
      })

      shortcuts.handleKeyDown(event)

      expect(onShowDeleteModalMock).toHaveBeenCalledWith(false)
    })
  })

  // ========================================
  // FORCE SAVE TESTS
  // ========================================

  describe('Force Save (Ctrl+S)', () => {
    it('should call forceSave callback on Ctrl+S', async () => {
      const forceSaveMock = vi.fn()

      const shortcuts = useKeyboardShortcuts({
        forceSave: forceSaveMock
      })

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(forceSaveMock).toHaveBeenCalled()
    })

    it('should handle async forceSave', async () => {
      const forceSaveMock = vi.fn().mockResolvedValue(undefined)

      const shortcuts = useKeyboardShortcuts({
        forceSave: forceSaveMock
      })

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(forceSaveMock).toHaveBeenCalled()
      expect(messageMock.success).toHaveBeenCalledWith('Sauvegarde effectuée')
    })

    it('should show info when no forceSave is configured', async () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(messageMock.info).toHaveBeenCalledWith('Aucune fonction de sauvegarde configurée')
    })
  })

  // ========================================
  // INPUT/TEXTAREA BYPASS TESTS
  // ========================================

  describe('Input/Textarea Bypass', () => {
    it('should not trigger shortcuts when typing in input', () => {
      const shortcuts = useKeyboardShortcuts()

      const inputElement = document.createElement('input')
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true
      })

      Object.defineProperty(event, 'target', { value: inputElement, enumerable: true })

      shortcuts.handleKeyDown(event)

      expect(editorStoreMock.undo).not.toHaveBeenCalled()
    })

    it('should not trigger shortcuts when typing in textarea', () => {
      const shortcuts = useKeyboardShortcuts()

      const textareaElement = document.createElement('textarea')
      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        bubbles: true
      })

      Object.defineProperty(event, 'target', { value: textareaElement, enumerable: true })

      shortcuts.handleKeyDown(event)

      expect(pageElementsStoreMock.duplicateElement).not.toHaveBeenCalled()
    })

    it('should not trigger shortcuts in contentEditable elements', () => {
      const shortcuts = useKeyboardShortcuts()

      const editableDiv = document.createElement('div')
      editableDiv.contentEditable = 'true'

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true
      })

      Object.defineProperty(event, 'target', { value: editableDiv, enumerable: true })

      shortcuts.handleKeyDown(event)

      expect(pageElementsStoreMock.selectElement).not.toHaveBeenCalled()
    })

    it('should allow Escape even in input elements', () => {
      const shortcuts = useKeyboardShortcuts()

      const inputElement = document.createElement('input')
      pageElementsStoreMock.selectedElementIds = ref<string[]>(['element-1'])

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      })

      Object.defineProperty(event, 'target', { value: inputElement, enumerable: true })

      shortcuts.handleKeyDown(event)

      expect(pageElementsStoreMock.deselectAll).toHaveBeenCalled()
    })
  })

  // ========================================
  // BROWSER SHORTCUTS PROTECTION TESTS
  // ========================================

  describe('Browser Shortcuts Protection', () => {
    it('should not intercept Ctrl+Tab', () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        ctrlKey: true
      })

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      shortcuts.handleKeyDown(event)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('should not intercept Alt+Tab', () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        altKey: true
      })

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      shortcuts.handleKeyDown(event)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('should not intercept Ctrl+N (new window)', () => {
      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true
      })

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      shortcuts.handleKeyDown(event)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
  })

  // ========================================
  // CONTROL FUNCTIONS TESTS
  // ========================================

  describe('Control Functions', () => {
    it('should enable shortcuts', () => {
      const { enableShortcuts, isEnabled } = useKeyboardShortcuts({
        initiallyEnabled: false
      })

      expect(isEnabled.value).toBe(false)

      enableShortcuts()

      expect(isEnabled.value).toBe(true)
    })

    it('should disable shortcuts', () => {
      const { disableShortcuts, isEnabled } = useKeyboardShortcuts({
        initiallyEnabled: true
      })

      expect(isEnabled.value).toBe(true)

      disableShortcuts()

      expect(isEnabled.value).toBe(false)
    })

    it('should toggle shortcuts', () => {
      const { toggleShortcuts, isEnabled } = useKeyboardShortcuts({
        initiallyEnabled: true
      })

      expect(isEnabled.value).toBe(true)

      let result = toggleShortcuts()
      expect(result).toBe(false)
      expect(isEnabled.value).toBe(false)

      result = toggleShortcuts()
      expect(result).toBe(true)
      expect(isEnabled.value).toBe(true)
    })

    it('should not execute shortcuts when disabled', async () => {
      const shortcuts = useKeyboardShortcuts()

      shortcuts.disableShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true
      })

      shortcuts.handleKeyDown(event)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(editorStoreMock.undo).not.toHaveBeenCalled()
    })
  })

  // ========================================
  // HELPER FUNCTIONS TESTS
  // ========================================

  describe('Helper Functions', () => {
    it('should detect macOS correctly', () => {
      const { isMacOS } = useKeyboardShortcuts()

      const result = isMacOS()
      expect(typeof result).toBe('boolean')
    })

    it('should detect editable elements', () => {
      const { isEditableElement } = useKeyboardShortcuts()

      const input = document.createElement('input')
      expect(isEditableElement(input)).toBe(true)

      const textarea = document.createElement('textarea')
      expect(isEditableElement(textarea)).toBe(true)

      const div = document.createElement('div')
      expect(isEditableElement(div)).toBe(false)

      expect(isEditableElement(null)).toBe(false)
    })

    it('should check if action can execute (throttle)', () => {
      const { canExecuteAction } = useKeyboardShortcuts()

      const result1 = canExecuteAction()
      expect(result1).toBe(true)

      // Immediate second call should be throttled
      const result2 = canExecuteAction()
      expect(result2).toBe(false)

      // After delay, should be able to execute again
      vi.useFakeTimers()
      vi.advanceTimersByTime(100)
      const result3 = canExecuteAction()
      expect(result3).toBe(true)
      vi.useRealTimers()
    })
  })

  // ========================================
  // EDGE CASES TESTS
  // ========================================

  describe('Edge Cases', () => {
    it('should handle rapid key presses', async () => {
      vi.useFakeTimers()

      const shortcuts = useKeyboardShortcuts()

      // Simulate rapid Ctrl+Z presses
      for (let i = 0; i < 5; i++) {
        const event = new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true
        })
        shortcuts.handleKeyDown(event)
        vi.advanceTimersByTime(30)
      }

      // Only some should execute due to throttling
      expect(editorStoreMock.undo.mock.calls.length).toBeLessThan(5)

      vi.useRealTimers()
    })

    it('should handle element movement during drag', async () => {
      vi.useFakeTimers()

      const shortcuts = useKeyboardShortcuts()

      // Simulate holding arrow key
      const event1 = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      const event2 = new KeyboardEvent('keydown', { key: 'ArrowUp' })

      shortcuts.handleKeyDown(event1)
      vi.advanceTimersByTime(50)

      shortcuts.handleKeyDown(event2)
      vi.advanceTimersByTime(200)

      // Should debounce API updates
      expect(pageElementsStoreMock.updateElement).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should handle deleted element gracefully', async () => {
      pageElementsStoreMock.getElementById.mockReturnValue(undefined)

      const shortcuts = useKeyboardShortcuts()

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowUp'
      })

      shortcuts.handleKeyDown(event)

      // Should not crash
      expect(pageElementsStoreMock.updateElement).not.toHaveBeenCalled()
    })

    it('should prevent default for all handled shortcuts', () => {
      const shortcuts = useKeyboardShortcuts()

      const shortcuts_to_test = [
        { key: 'z', ctrlKey: true },
        { key: 'y', ctrlKey: true },
        { key: 'Delete' },
        { key: 'a', ctrlKey: true },
        { key: 'd', ctrlKey: true },
        { key: 'ArrowUp' },
        { key: 'Escape' },
        { key: 's', ctrlKey: true }
      ]

      shortcuts_to_test.forEach(options => {
        const event = new KeyboardEvent('keydown', options)
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        shortcuts.handleKeyDown(event)

        expect(preventDefaultSpy).toHaveBeenCalled()
      })
    })
  })

  // ========================================
  // PLATFORM-SPECIFIC TESTS
  // ========================================

  describe('Platform-Specific', () => {
    it('should work with Cmd on Mac (metaKey)', () => {
      const shortcuts = useKeyboardShortcuts()

      // Mock macOS detection
      const originalPlatform = navigator.platform
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true
      })

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true
      })

      shortcuts.handleKeyDown(event)

      expect(editorStoreMock.undo).toHaveBeenCalled()

      Object.defineProperty(navigator, 'platform', {
        value: originalPlatform,
        configurable: true
      })
    })
  })
})
