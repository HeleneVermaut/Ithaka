/**
 * Font Service - Google Fonts Management
 *
 * Gère le chargement et le cache des polices Google Fonts avec:
 * - Liste de 20 polices sélectionnées
 * - WebFontLoader avec timeout 10s
 * - Cache localStorage
 * - Fallback system fonts
 */

import WebFont from 'webfontloader'

/**
 * Interface pour une police
 */
export interface Font {
  name: string
  family: string
  category: 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting'
}

/**
 * Liste des 20 polices Google Fonts sélectionnées
 * Organisées par catégorie pour un meilleur UX
 */
const GOOGLE_FONTS: Font[] = [
  // Sans-serif (modernes, lisibles)
  { name: 'Open Sans', family: 'Open Sans', category: 'sans-serif' },
  { name: 'Roboto', family: 'Roboto', category: 'sans-serif' },
  { name: 'Lato', family: 'Lato', category: 'sans-serif' },
  { name: 'Inter', family: 'Inter', category: 'sans-serif' },
  { name: 'Montserrat', family: 'Montserrat', category: 'sans-serif' },

  // Serif (classiques, élégants)
  { name: 'Playfair Display', family: 'Playfair Display', category: 'serif' },
  { name: 'Merriweather', family: 'Merriweather', category: 'serif' },
  { name: 'Lora', family: 'Lora', category: 'serif' },
  { name: 'Crimson Text', family: 'Crimson Text', category: 'serif' },
  { name: 'Cormorant Garamond', family: 'Cormorant Garamond', category: 'serif' },

  // Display (créatifs, impactants)
  { name: 'Pacifico', family: 'Pacifico', category: 'display' },
  { name: 'Abril Fatface', family: 'Abril Fatface', category: 'display' },
  { name: 'Bebas Neue', family: 'Bebas Neue', category: 'display' },
  { name: 'Fredoka One', family: 'Fredoka One', category: 'display' },

  // Handwriting (créatifs, personnels)
  { name: 'Dancing Script', family: 'Dancing Script', category: 'handwriting' },
  { name: 'Great Vibes', family: 'Great Vibes', category: 'handwriting' },
  { name: 'Caveat', family: 'Caveat', category: 'handwriting' },
  { name: 'Satisfy', family: 'Satisfy', category: 'handwriting' },

  // Monospace (code, technique)
  { name: 'Fira Code', family: 'Fira Code', category: 'monospace' },
  { name: 'Courier Prime', family: 'Courier Prime', category: 'monospace' }
]

/**
 * Polices système de fallback en fonction de la catégorie
 * Utilisées si le chargement de la police Google échoue
 */
const FALLBACK_FONTS: Record<Font['category'], string> = {
  'sans-serif': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'serif': 'Georgia, "Times New Roman", Times, serif',
  'display': 'Georgia, "Times New Roman", Times, serif',
  'handwriting': 'cursive',
  'monospace': '"Courier New", Courier, monospace'
}

/**
 * Clé localStorage pour le cache des polices chargées
 */
const CACHE_KEY = 'loaded_fonts'

/**
 * Timeout pour le chargement WebFont (10 secondes)
 */
const LOAD_TIMEOUT = 10000

/**
 * État du chargement des polices
 */
let loadedFonts: Set<string> = new Set()
let fontsLoaded = false
let loadingPromise: Promise<void> | null = null

/**
 * Initialise les polices depuis le cache localStorage
 */
function initializeFromCache(): void {
  const cached = localStorage.getItem(CACHE_KEY)
  if (cached) {
    try {
      loadedFonts = new Set(JSON.parse(cached))
    } catch (error) {
      console.warn('Failed to load font cache from localStorage:', error)
      loadedFonts = new Set()
    }
  }
}

/**
 * Sauvegarde les polices chargées dans le cache localStorage
 */
function saveToCache(): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(loadedFonts)))
  } catch (error) {
    console.warn('Failed to save font cache to localStorage:', error)
  }
}

/**
 * Charge les polices Google Fonts avec timeout
 * Retourne une Promise qui resolve même en cas de timeout (utilise fallback)
 */
function loadGoogleFonts(): Promise<void> {
  return new Promise((resolve) => {
    // Créer un timeout qui forcera la résolution même si WebFont ne termine pas
    const timeoutId = setTimeout(() => {
      console.warn('Font loading timeout after 10 seconds - using fallback fonts')
      resolve() // Résoudre quand même pour permettre l'utilisation avec fallback
    }, LOAD_TIMEOUT)

    // Créer la liste des familles à charger (uniquement celles pas encore en cache)
    const fontFamilies = GOOGLE_FONTS
      .filter((font) => !loadedFonts.has(font.family))
      .map((font) => font.family)

    // Si toutes les polices sont en cache, résoudre immédiatement
    if (fontFamilies.length === 0) {
      clearTimeout(timeoutId)
      resolve()
      return
    }

    // Charger les polices avec WebFontLoader
    WebFont.load({
      google: {
        families: fontFamilies
      },
      active: () => {
        // Callback quand les polices sont chargées avec succès
        fontFamilies.forEach((family) => {
          loadedFonts.add(family)
        })
        saveToCache()
        clearTimeout(timeoutId)
        console.log('Google Fonts loaded successfully:', fontFamilies)
        resolve()
      },
      inactive: () => {
        // Callback si certaines polices n'ont pas pu être chargées
        console.warn('Some fonts failed to load - using fallback fonts')
        clearTimeout(timeoutId)
        resolve() // Résoudre quand même pour permettre la continuation
      },
      timeout: LOAD_TIMEOUT,
      fontinactive: (familyName) => {
        console.warn(`Font "${familyName}" failed to load - using fallback`)
      }
    })
  })
}

/**
 * Export public: Obtenir toutes les polices disponibles
 */
export function getFonts(): Font[] {
  return [...GOOGLE_FONTS]
}

/**
 * Export public: Obtenir les polices par catégorie
 */
export function getFontsByCategory(category: Font['category']): Font[] {
  return GOOGLE_FONTS.filter((font) => font.category === category)
}

/**
 * Export public: Obtenir la police de fallback pour une catégorie
 */
export function getFallbackFont(category: Font['category']): string {
  return FALLBACK_FONTS[category]
}

/**
 * Export public: Obtenir le style CSS pour une police
 * Utilisé dans les aperçus et le rendu du texte
 */
export function getFontStyle(fontFamily: string, fontCategory: Font['category']): string {
  // Si la police est chargée, l'utiliser
  if (loadedFonts.has(fontFamily)) {
    return fontFamily
  }
  // Sinon, utiliser le fallback approprié
  return getFallbackFont(fontCategory)
}

/**
 * Export public: Initialiser et charger toutes les polices
 * A appeler une seule fois au démarrage de l'application
 */
export async function initializeFonts(): Promise<void> {
  // Si déjà chargé, retourner immédiatement
  if (fontsLoaded) {
    return
  }

  // Si un chargement est en cours, attendre son résultat
  if (loadingPromise) {
    return loadingPromise
  }

  // Initialiser le cache depuis localStorage
  initializeFromCache()

  // Créer la promise de chargement
  loadingPromise = loadGoogleFonts().then(() => {
    fontsLoaded = true
    console.log('Font initialization complete')
  })

  return loadingPromise
}

/**
 * Export public: Vérifier si les polices sont entièrement chargées
 */
export function areFontsLoaded(): boolean {
  return fontsLoaded
}

/**
 * Export public: Obtenir l'état de chargement des polices
 */
export function getFontsLoadingState(): {
  isLoaded: boolean
  isLoading: boolean
  loadedCount: number
  totalCount: number
} {
  return {
    isLoaded: fontsLoaded,
    isLoading: loadingPromise !== null,
    loadedCount: loadedFonts.size,
    totalCount: GOOGLE_FONTS.length
  }
}

/**
 * Export public: Réinitialiser le cache des polices (utile pour le debug/test)
 */
export function clearFontCache(): void {
  localStorage.removeItem(CACHE_KEY)
  loadedFonts.clear()
  fontsLoaded = false
  loadingPromise = null
  console.log('Font cache cleared')
}

/**
 * Export de l'objet fonts pour accès directe à la liste
 */
export const fonts = {
  all: GOOGLE_FONTS,
  byCategory: {
    'sans-serif': GOOGLE_FONTS.filter((f) => f.category === 'sans-serif'),
    'serif': GOOGLE_FONTS.filter((f) => f.category === 'serif'),
    'display': GOOGLE_FONTS.filter((f) => f.category === 'display'),
    'handwriting': GOOGLE_FONTS.filter((f) => f.category === 'handwriting'),
    'monospace': GOOGLE_FONTS.filter((f) => f.category === 'monospace')
  }
}
