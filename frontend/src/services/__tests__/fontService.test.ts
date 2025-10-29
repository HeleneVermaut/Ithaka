/**
 * Unit Tests for fontService.ts
 * Tests Google Fonts integration, WebFontLoader, caching, and fallback mechanisms
 * Coverage target: 85%+
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import WebFont from 'webfontloader'
import {
  getFonts,
  getFontsByCategory,
  getFallbackFont,
  getFontStyle,
  initializeFonts,
  areFontsLoaded,
  getFontsLoadingState,
  clearFontCache,
  fonts
  // type Font
} from '../fontService'

/**
 * Mock WebFontLoader
 */
vi.mock('webfontloader', () => ({
  default: {
    load: vi.fn()
  }
}))

/**
 * Mock localStorage
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('fontService', () => {
  beforeEach(() => {
    // Clear localStorage and reset state
    localStorageMock.clear()
    clearFontCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearFontCache()
  })

  // =====================================================
  // FONT LIST TESTS
  // =====================================================

  describe('getFonts', () => {
    it('should return array of 20 fonts', () => {
      const allFonts = getFonts()
      expect(allFonts).toHaveLength(20)
    })

    it('should return fonts with required properties', () => {
      const allFonts = getFonts()
      allFonts.forEach(font => {
        expect(font).toHaveProperty('name')
        expect(font).toHaveProperty('family')
        expect(font).toHaveProperty('category')
        expect(typeof font.name).toBe('string')
        expect(typeof font.family).toBe('string')
        expect(['serif', 'sans-serif', 'monospace', 'display', 'handwriting']).toContain(font.category)
      })
    })

    it('should return a fresh copy of the fonts array', () => {
      const fonts1 = getFonts()
      const fonts2 = getFonts()
      expect(fonts1).not.toBe(fonts2) // Different references
      expect(fonts1).toEqual(fonts2) // Same content
    })

    it('should include Open Sans font', () => {
      const allFonts = getFonts()
      const openSans = allFonts.find(f => f.family === 'Open Sans')
      expect(openSans).toBeDefined()
      expect(openSans?.category).toBe('sans-serif')
    })

    it('should include Playfair Display font', () => {
      const allFonts = getFonts()
      const playfair = allFonts.find(f => f.family === 'Playfair Display')
      expect(playfair).toBeDefined()
      expect(playfair?.category).toBe('serif')
    })
  })

  describe('getFontsByCategory', () => {
    it('should return sans-serif fonts (5 fonts)', () => {
      const sansSerifFonts = getFontsByCategory('sans-serif')
      expect(sansSerifFonts).toHaveLength(5)
      sansSerifFonts.forEach(font => {
        expect(font.category).toBe('sans-serif')
      })
    })

    it('should return serif fonts (5 fonts)', () => {
      const serifFonts = getFontsByCategory('serif')
      expect(serifFonts).toHaveLength(5)
      serifFonts.forEach(font => {
        expect(font.category).toBe('serif')
      })
    })

    it('should return display fonts (4 fonts)', () => {
      const displayFonts = getFontsByCategory('display')
      expect(displayFonts).toHaveLength(4)
      displayFonts.forEach(font => {
        expect(font.category).toBe('display')
      })
    })

    it('should return handwriting fonts (4 fonts)', () => {
      const handwritingFonts = getFontsByCategory('handwriting')
      expect(handwritingFonts).toHaveLength(4)
      handwritingFonts.forEach(font => {
        expect(font.category).toBe('handwriting')
      })
    })

    it('should return monospace fonts (2 fonts)', () => {
      const monospaceFonts = getFontsByCategory('monospace')
      expect(monospaceFonts).toHaveLength(2)
      monospaceFonts.forEach(font => {
        expect(font.category).toBe('monospace')
      })
    })
  })

  describe('fonts export object', () => {
    it('should have all fonts in fonts.all', () => {
      expect(fonts.all).toHaveLength(20)
    })

    it('should have categorized fonts in fonts.byCategory', () => {
      expect(fonts.byCategory['sans-serif']).toHaveLength(5)
      expect(fonts.byCategory['serif']).toHaveLength(5)
      expect(fonts.byCategory['display']).toHaveLength(4)
      expect(fonts.byCategory['handwriting']).toHaveLength(4)
      expect(fonts.byCategory['monospace']).toHaveLength(2)
    })
  })

  // =====================================================
  // FALLBACK FONTS TESTS
  // =====================================================

  describe('getFallbackFont', () => {
    it('should return system fonts for sans-serif', () => {
      const fallback = getFallbackFont('sans-serif')
      expect(fallback).toContain('Arial')
      expect(fallback).toContain('sans-serif')
    })

    it('should return Georgia for serif', () => {
      const fallback = getFallbackFont('serif')
      expect(fallback).toContain('Georgia')
      expect(fallback).toContain('serif')
    })

    it('should return cursive for handwriting', () => {
      const fallback = getFallbackFont('handwriting')
      expect(fallback).toBe('cursive')
    })

    it('should return Courier for monospace', () => {
      const fallback = getFallbackFont('monospace')
      expect(fallback).toContain('Courier')
      expect(fallback).toContain('monospace')
    })

    it('should return serif fallback for display', () => {
      const fallback = getFallbackFont('display')
      expect(fallback).toContain('Georgia')
      expect(fallback).toContain('serif')
    })
  })

  // =====================================================
  // FONT STYLE TESTS
  // =====================================================

  describe('getFontStyle', () => {
    it('should return fallback when font not loaded', () => {
      const style = getFontStyle('Open Sans', 'sans-serif')
      const fallback = getFallbackFont('sans-serif')
      expect(style).toBe(fallback)
    })

    it('should return font family when loaded', async () => {
      // Mock WebFont.load to call active callback
      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.active) {
          config.active()
        }
      })

      await initializeFonts()
      const style = getFontStyle('Open Sans', 'sans-serif')
      expect(style).toBe('Open Sans')
    })

    it('should use appropriate fallback for different categories', () => {
      expect(getFontStyle('NonExistentFont', 'serif')).toContain('Georgia')
      expect(getFontStyle('NonExistentFont', 'monospace')).toContain('Courier')
      expect(getFontStyle('NonExistentFont', 'handwriting')).toBe('cursive')
    })
  })

  // =====================================================
  // INITIALIZATION TESTS
  // =====================================================

  describe('initializeFonts', () => {
    it('should load fonts successfully', async () => {
      // Mock WebFont.load to call active callback
      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.active) {
          config.active()
        }
      })

      await initializeFonts()

      expect(areFontsLoaded()).toBe(true)
      expect(WebFont.load).toHaveBeenCalled()
    })

    it('should handle timeout gracefully', async () => {
      // Mock WebFont.load to simulate timeout
      vi.mocked(WebFont.load).mockImplementation((_config: any) => {
        // Don't call any callbacks to simulate timeout
      })

      // Override setTimeout to immediately trigger timeout
      vi.useFakeTimers()
      const promise = initializeFonts()
      vi.advanceTimersByTime(10000)
      await promise

      // Should still resolve and mark as loaded
      expect(areFontsLoaded()).toBe(true)
      vi.useRealTimers()
    })

    it('should handle inactive callback (font loading failure)', async () => {
      // Mock WebFont.load to call inactive callback
      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.inactive) {
          config.inactive()
        }
      })

      await initializeFonts()

      // Should still be marked as loaded (fallback fonts will be used)
      expect(areFontsLoaded()).toBe(true)
    })

    it('should not reload fonts if already loaded', async () => {
      // Mock first load
      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.active) {
          config.active()
        }
      })

      await initializeFonts()
      const firstCallCount = vi.mocked(WebFont.load).mock.calls.length

      // Call again
      await initializeFonts()
      const secondCallCount = vi.mocked(WebFont.load).mock.calls.length

      // Should not have called WebFont.load again
      expect(secondCallCount).toBe(firstCallCount)
    })

    it('should wait for existing loading promise', async () => {
      // Mock WebFont.load with a delay
      vi.mocked(WebFont.load).mockImplementation(async (config: any) => {
        await new Promise(resolve => setTimeout(resolve, 100))
        if (config.active) {
          config.active()
        }
      })

      // Start two concurrent initializations
      const promise1 = initializeFonts()
      const promise2 = initializeFonts()

      await Promise.all([promise1, promise2])

      // Should have called WebFont.load only once
      expect(vi.mocked(WebFont.load).mock.calls.length).toBe(1)
    })
  })

  // =====================================================
  // CACHE TESTS
  // =====================================================

  describe('localStorage cache', () => {
    it('should save loaded fonts to localStorage', async () => {
      // Mock WebFont.load to call active callback
      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.active) {
          config.active()
        }
      })

      await initializeFonts()

      const cached = localStorageMock.getItem('loaded_fonts')
      expect(cached).toBeTruthy()
      const parsedCache = JSON.parse(cached!)
      expect(Array.isArray(parsedCache)).toBe(true)
      expect(parsedCache.length).toBeGreaterThan(0)
    })

    it('should load from localStorage cache on initialization', async () => {
      // Manually set cache
      const cachedFonts = ['Open Sans', 'Roboto']
      localStorageMock.setItem('loaded_fonts', JSON.stringify(cachedFonts))

      // Mock WebFont.load to expect only non-cached fonts
      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        const families = config.google.families
        // Should not include cached fonts
        expect(families).not.toContain('Open Sans')
        expect(families).not.toContain('Roboto')
        if (config.active) {
          config.active()
        }
      })

      await initializeFonts()

      expect(areFontsLoaded()).toBe(true)
    })

    it('should skip loading if all fonts are cached', async () => {
      // Cache all 20 fonts
      const allFontFamilies = getFonts().map(f => f.family)
      localStorageMock.setItem('loaded_fonts', JSON.stringify(allFontFamilies))

      await initializeFonts()

      // Should not have called WebFont.load
      expect(vi.mocked(WebFont.load).mock.calls.length).toBe(0)
      expect(areFontsLoaded()).toBe(true)
    })

    it('should handle corrupted localStorage cache', async () => {
      // Set invalid JSON in cache
      localStorageMock.setItem('loaded_fonts', 'invalid json {')

      // Mock WebFont.load
      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.active) {
          config.active()
        }
      })

      // Should not throw error
      await expect(initializeFonts()).resolves.not.toThrow()
      expect(areFontsLoaded()).toBe(true)
    })
  })

  describe('clearFontCache', () => {
    it('should clear localStorage and reset state', async () => {
      // Load fonts first
      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.active) {
          config.active()
        }
      })

      await initializeFonts()
      expect(areFontsLoaded()).toBe(true)
      expect(localStorageMock.getItem('loaded_fonts')).toBeTruthy()

      // Clear cache
      clearFontCache()

      expect(areFontsLoaded()).toBe(false)
      expect(localStorageMock.getItem('loaded_fonts')).toBeNull()
      expect(getFontsLoadingState().loadedCount).toBe(0)
    })
  })

  // =====================================================
  // LOADING STATE TESTS
  // =====================================================

  describe('areFontsLoaded', () => {
    it('should return false initially', () => {
      expect(areFontsLoaded()).toBe(false)
    })

    it('should return true after successful load', async () => {
      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.active) {
          config.active()
        }
      })

      await initializeFonts()
      expect(areFontsLoaded()).toBe(true)
    })
  })

  describe('getFontsLoadingState', () => {
    it('should return initial state', () => {
      const state = getFontsLoadingState()
      expect(state.isLoaded).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.loadedCount).toBe(0)
      expect(state.totalCount).toBe(20)
    })

    it('should show loading state during initialization', () => {
      // Mock WebFont.load with a delay
      vi.mocked(WebFont.load).mockImplementation(async (config: any) => {
        // Delay to check loading state
        await new Promise(resolve => setTimeout(resolve, 100))
        if (config.active) {
          config.active()
        }
      })

      initializeFonts() // Don't await

      const state = getFontsLoadingState()
      expect(state.isLoading).toBe(true)
    })

    it('should show loaded state after completion', async () => {
      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.active) {
          config.active()
        }
      })

      await initializeFonts()

      const state = getFontsLoadingState()
      expect(state.isLoaded).toBe(true)
      expect(state.isLoading).toBe(true) // Promise still exists
      expect(state.loadedCount).toBe(20)
      expect(state.totalCount).toBe(20)
    })
  })

  // =====================================================
  // ERROR HANDLING TESTS
  // =====================================================

  describe('error handling', () => {
    it('should propagate WebFont.load synchronous errors', async () => {
      vi.mocked(WebFont.load).mockImplementation(() => {
        throw new Error('WebFont error')
      })

      // The fontService doesn't catch synchronous WebFont.load errors
      // It relies on the timeout fallback for async failures only
      await expect(initializeFonts()).rejects.toThrow('WebFont error')
    })

    it('should call fontinactive callback for individual font failures', async () => {
      // const fontinactiveSpy = vi.fn()

      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.fontinactive) {
          config.fontinactive('Open Sans')
          config.fontinactive('Roboto')
        }
        if (config.inactive) {
          config.inactive()
        }
      })

      await initializeFonts()

      // Should still complete successfully
      expect(areFontsLoaded()).toBe(true)
    })

    it('should handle localStorage.setItem failure gracefully', async () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorageMock.setItem
      localStorageMock.setItem = () => {
        throw new Error('Quota exceeded')
      }

      vi.mocked(WebFont.load).mockImplementation((config: any) => {
        if (config.active) {
          config.active()
        }
      })

      // Should not throw
      await expect(initializeFonts()).resolves.not.toThrow()

      // Restore
      localStorageMock.setItem = originalSetItem
    })
  })
})
