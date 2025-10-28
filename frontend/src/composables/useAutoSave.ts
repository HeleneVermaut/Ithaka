/**
 * Auto-Save Composable
 *
 * Manages automatic saving of page elements with:
 * - Debounced saves (2 second delay by default)
 * - Automatic retry logic (3 attempts with exponential backoff)
 * - Offline mode with localStorage fallback
 * - Visual save status tracking
 * - Force save capability (bypasses debounce)
 *
 * @module composables/useAutoSave
 */

import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'

/**
 * Save status enumeration
 * Indicates the current state of save operations
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Interface for auto-save composable return value
 */
export interface UseAutoSaveReturn {
  // State
  isSaving: Ref<boolean>
  saveStatus: Ref<SaveStatus>
  lastSaveTime: Ref<Date | null>
  error: Ref<string | null>
  retryCount: Ref<number>
  timeSinceLastSave: ComputedRef<number | null>
  // Methods
  trigger: (elements: any[]) => void
  forceSave: (elements: any[]) => Promise<void>
  clearError: () => void
  saveToLocalStorage: (elements: any[]) => void
  loadFromLocalStorage: (pageId: string) => any[] | null
  clearLocalStorage: (pageId: string) => void
}

/**
 * Auto-save composable factory
 *
 * Creates auto-save functionality for managing element persistence with:
 * - Configurable debounce delay
 * - Automatic retry on failure
 * - Offline fallback to localStorage
 * - Save status tracking
 *
 * @param saveCallback - Async function to execute when saving
 * @param debounceDelay - Delay in ms before triggering save (default: 2000ms)
 * @returns Auto-save interface with state and methods
 *
 * @example
 * const autoSave = useAutoSave(
 *   async (elements) => await pageService.saveElements(elements),
 *   2000
 * )
 *
 * // Track changes and auto-save
 * watch(() => editorStore.elements, (newElements) => {
 *   autoSave.trigger(newElements)
 * })
 *
 * // Force immediate save (skip debounce)
 * await autoSave.forceSave(editorStore.elements)
 *
 * // Display save status in UI
 * <div>{{ autoSave.saveStatus.value }}</div>
 */
export function useAutoSave(
  saveCallback: (elements: any[]) => Promise<void>,
  debounceDelay: number = 2000
): UseAutoSaveReturn {
  // State
  const isSaving = ref<boolean>(false)
  const saveStatus = ref<SaveStatus>('idle')
  const lastSaveTime = ref<Date | null>(null)
  const error = ref<string | null>(null)
  const retryCount = ref<number>(0)
  const maxRetries = 3

  // Computed
  const timeSinceLastSave = computed((): number | null => {
    if (!lastSaveTime.value) return null
    const diff = Date.now() - lastSaveTime.value.getTime()
    return Math.floor(diff / 1000) // in seconds
  })

  // Debounce state
  let debounceTimer: NodeJS.Timeout | null = null

  /**
   * Execute save with automatic retry logic
   *
   * Attempts to save elements with exponential backoff on failure:
   * - Attempt 1: immediate
   * - Attempt 2: after 1 second (2^0 * 1000ms)
   * - Attempt 3: after 2 seconds (2^1 * 1000ms)
   * - Attempt 4: after 4 seconds (2^2 * 1000ms)
   *
   * On success:
   * - Updates lastSaveTime
   * - Sets status to 'saved' for 3 seconds then returns to 'idle'
   *
   * On failure after max retries:
   * - Sets status to 'error'
   * - Saves to localStorage for recovery
   * - Shows user notification
   */
  async function executeSave(elements: any[]): Promise<void> {
    if (isSaving.value) return

    isSaving.value = true
    saveStatus.value = 'saving'
    error.value = null

    let currentRetry = 0

    while (currentRetry < maxRetries) {
      try {
        // Execute save callback
        await saveCallback(elements)

        // Success
        saveStatus.value = 'saved'
        lastSaveTime.value = new Date()
        retryCount.value = 0
        error.value = null

        // Return to idle after 3 seconds
        setTimeout(() => {
          if (saveStatus.value === 'saved') {
            saveStatus.value = 'idle'
          }
        }, 3000)

        return
      } catch (err: any) {
        currentRetry++
        retryCount.value = currentRetry

        if (currentRetry >= maxRetries) {
          // Failed after max retries
          saveStatus.value = 'error'
          error.value = err.message || 'Erreur de sauvegarde'
          console.error(`Save failed after ${maxRetries} attempts:`, err)

          // Fallback to localStorage
          saveToLocalStorage(elements)

          // Show error notification if available
          if (typeof window !== 'undefined' && (window as any).$message) {
            (window as any).$message.error(
              `Echec sauvegarde apres ${maxRetries} tentatives`
            )
          }
          break
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, currentRetry - 1) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    isSaving.value = false
  }

  /**
   * Debounced save
   * Delays save execution to batch rapid changes
   * Cancels previous pending save if new change arrives
   */
  function debouncedSave(elements: any[]): void {
    // Cancel previous debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set new timer
    debounceTimer = setTimeout(() => {
      executeSave(elements)
      debounceTimer = null
    }, debounceDelay)
  }

  /**
   * Force immediate save
   * Bypasses debounce and executes save immediately
   * Useful for manual save triggers (Ctrl+S)
   */
  async function forceSave(elements: any[]): Promise<void> {
    // Cancel any pending debounced save
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    // Execute immediately
    await executeSave(elements)
  }

  /**
   * Trigger auto-save with debounce
   * Use this when tracking element changes
   */
  function trigger(elements: any[]): void {
    debouncedSave(elements)
  }

  /**
   * Save elements to localStorage as fallback for offline mode
   * Stored with pageId key for recovery
   */
  function saveToLocalStorage(elements: any[]): void {
    try {
      // Try to extract pageId from first element
      const pageId = elements[0]?.pageId

      if (pageId) {
        const data = JSON.stringify(elements)
        localStorage.setItem(`unsaved-${pageId}`, data)
        console.log(`Saved ${elements.length} elements to localStorage`)

        // Show warning notification if available
        if (typeof window !== 'undefined' && (window as any).$message) {
          (window as any).$message.warning(
            'Sauvegarde locale (mode hors ligne)'
          )
        }
      }
    } catch (err) {
      console.error('Failed to save to localStorage:', err)
    }
  }

  /**
   * Load elements from localStorage
   * Used to recover unsaved changes after offline period
   */
  function loadFromLocalStorage(pageId: string): any[] | null {
    try {
      const data = localStorage.getItem(`unsaved-${pageId}`)
      if (data) {
        return JSON.parse(data)
      }
    } catch (err) {
      console.error('Failed to load from localStorage:', err)
    }
    return null
  }

  /**
   * Clear localStorage data for a page
   * Called after successfully syncing offline changes
   */
  function clearLocalStorage(pageId: string): void {
    try {
      localStorage.removeItem(`unsaved-${pageId}`)
      console.log(`Cleared localStorage for page ${pageId}`)
    } catch (err) {
      console.error('Failed to clear localStorage:', err)
    }
  }

  /**
   * Clear error state
   * Used to dismiss error notifications
   */
  function clearError(): void {
    error.value = null
    if (saveStatus.value === 'error') {
      saveStatus.value = 'idle'
    }
  }

  return {
    // State
    isSaving,
    saveStatus,
    lastSaveTime,
    error,
    retryCount,
    timeSinceLastSave,
    // Methods
    trigger,
    forceSave,
    clearError,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage
  }
}

export default useAutoSave
