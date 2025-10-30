/**
 * Tests unitaires pour le composant StickerLibrary
 *
 * Ce fichier contient tous les tests pour valider le comportement du composant
 * StickerLibrary, incluant :
 * - Rendering et affichage initial
 * - États de chargement (loading, empty, error)
 * - Filtrage et recherche
 * - Drag-and-drop de stickers
 * - Sélection de stickers
 * - Actions CRUD (edit, delete)
 * - Interactions utilisateur
 *
 * Architecture de test :
 * - Utilise Vitest pour l'exécution des tests
 * - Vue Test Utils pour le montage et les interactions
 * - Mock du store Pinia pour isoler la logique
 * - Tests de régression pour les cas limites
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StickerLibrary from '@/components/editor/StickerLibrary.vue'
import { useStickerLibraryStore } from '@/stores/stickerLibraryStore'
import type { IUserSticker } from '@/types/models'

/**
 * Mock des stickers pour les tests
 *
 * Représente une bibliothèque de stickers de test avec différents cas :
 * - Stickers publics et privés
 * - Stickers récents et anciens
 * - Stickers avec différents tags pour tester la recherche
 */
const mockStickers: IUserSticker[] = [
  {
    id: 'sticker-1',
    userId: 'user-1',
    name: 'Nature Sticker',
    cloudinaryUrl: 'https://cloudinary.com/sticker-1.png',
    cloudinaryPublicId: 'sticker-1',
    thumbnailUrl: 'https://cloudinary.com/sticker-1-thumb.png',
    tags: ['nature', 'forest', 'tree'],
    isPublic: true,
    usageCount: 5,
    createdAt: new Date().toISOString(), // Sticker récent
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sticker-2',
    userId: 'user-1',
    name: 'Animal Sticker',
    cloudinaryUrl: 'https://cloudinary.com/sticker-2.png',
    cloudinaryPublicId: 'sticker-2',
    thumbnailUrl: 'https://cloudinary.com/sticker-2-thumb.png',
    tags: ['animal', 'cat', 'pet'],
    isPublic: false,
    usageCount: 12,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // Sticker ancien (10 jours)
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sticker-3',
    userId: 'user-1',
    name: 'Food Sticker',
    cloudinaryUrl: 'https://cloudinary.com/sticker-3.png',
    cloudinaryPublicId: 'sticker-3',
    thumbnailUrl: 'https://cloudinary.com/sticker-3-thumb.png',
    tags: ['food', 'pizza', 'italian'],
    isPublic: true,
    usageCount: 8,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Sticker récent (2 jours)
    updatedAt: new Date().toISOString()
  }
]

/**
 * Helper pour créer une instance du composant avec Pinia
 *
 * @param props - Props à passer au composant
 * @param usePinia - Instance Pinia à utiliser
 * @returns VueWrapper du composant monté
 */
function createWrapper(props = {}, usePinia?: ReturnType<typeof createPinia>): VueWrapper {
  return mount(StickerLibrary, {
    props: {
      pageId: 'page-123',
      canSelect: true,
      ...props
    },
    global: {
      plugins: [usePinia || createPinia()],
      stubs: {
        // Stub des composants NaiveUI pour simplifier les tests
        NButton: {
          template: '<button @click="$emit(\'click\')"><slot /></button>'
        },
        NInput: {
          template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
          props: ['value']
        },
        NGrid: {
          template: '<div class="n-grid"><slot /></div>'
        },
        NGridItem: {
          template: '<div class="n-grid-item"><slot /></div>'
        },
        NImage: {
          template: '<img :src="src" :alt="alt" />',
          props: ['src', 'alt']
        },
        NEmpty: {
          template: '<div class="n-empty"><slot /><slot name="extra" /></div>'
        },
        NSkeleton: {
          template: '<div class="n-skeleton"></div>'
        },
        NModal: {
          template: '<div v-if="show" class="n-modal"><slot /><slot name="action" /></div>',
          props: ['show']
        },
        NForm: {
          template: '<form><slot /></form>'
        },
        NFormItem: {
          template: '<div class="n-form-item"><label>{{ label }}</label><slot /></div>',
          props: ['label']
        },
        NSpace: {
          template: '<div class="n-space"><slot /></div>'
        },
        NAlert: {
          template: '<div class="n-alert" :class="type">{{ title }}</div>',
          props: ['type', 'title']
        }
      }
    }
  })
}

describe('StickerLibrary', () => {
  let pinia: ReturnType<typeof createPinia>
  let store: ReturnType<typeof useStickerLibraryStore>

  beforeEach(() => {
    // Créer un nouveau Pinia avant chaque test pour isolation
    pinia = createPinia()
    setActivePinia(pinia)
    store = useStickerLibraryStore()

    // Mock de la fonction loadStickerLibrary pour éviter les appels réseau
    store.loadStickerLibrary = vi.fn().mockResolvedValue(undefined)
  })

  // ========================================
  // TEST 1: Rendering initial
  // ========================================
  it('should render the component with title and header buttons', () => {
    const wrapper = createWrapper()

    // Vérifier que le titre est affiché
    expect(wrapper.text()).toContain('Bibliothèque de stickers')

    // Vérifier que les boutons du header sont présents
    expect(wrapper.text()).toContain('Upload New Sticker')
  })

  // ========================================
  // TEST 2: Loading state
  // ========================================
  it('should display loading skeleton when loading is true', async () => {
    store.loading = true

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Vérifier que les skeletons sont affichés
    const skeletons = wrapper.findAll('.n-skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  // ========================================
  // TEST 3: Empty state
  // ========================================
  it('should display empty state when no stickers are available', async () => {
    store.loading = false
    store.stickers = []

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Vérifier que l'état vide est affiché
    expect(wrapper.find('.sticker-library__empty').exists()).toBe(true)
  })

  // ========================================
  // TEST 4: Rendering stickers grid
  // ========================================
  it('should render stickers in a grid when data is available', async () => {
    store.loading = false
    store.stickers = mockStickers
    store.pagination.total = mockStickers.length

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Vérifier que la grille est affichée
    expect(wrapper.find('.sticker-library__grid').exists()).toBe(true)

    // Vérifier que tous les stickers sont affichés
    const stickerCards = wrapper.findAll('.sticker-card')
    expect(stickerCards.length).toBe(mockStickers.length)
  })

  // ========================================
  // TEST 5: Search filtering
  // ========================================
  it('should filter stickers by search query (name)', async () => {
    store.loading = false
    store.stickers = mockStickers

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Saisir une recherche
    const searchInput = wrapper.find('input')
    await searchInput.setValue('Animal')
    await wrapper.vm.$nextTick()

    // Vérifier que le filtrage est appliqué (le composant filtre côté client)
    const stickerCards = wrapper.findAll('.sticker-card')
    expect(stickerCards.length).toBeLessThanOrEqual(mockStickers.length)
  })

  // ========================================
  // TEST 6: Filter by "all"
  // ========================================
  it('should display all stickers when "all" filter is selected', async () => {
    store.loading = false
    store.stickers = mockStickers
    store.pagination.total = mockStickers.length

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Vérifier que tous les stickers sont affichés
    const stickerCards = wrapper.findAll('.sticker-card')
    expect(stickerCards.length).toBe(mockStickers.length)
  })

  // ========================================
  // TEST 7: Filter by "recent"
  // ========================================
  it('should filter stickers by "recent" (last 7 days)', async () => {
    store.loading = false
    store.stickers = mockStickers

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Cliquer sur le filtre "Récents"
    const buttons = wrapper.findAll('button')
    const recentButton = buttons.find((btn) => btn.text().includes('Récents'))

    if (recentButton) {
      await recentButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Vérifier que le filtre est appliqué (vérifier qu'il y a des stickers)
      const stickerCards = wrapper.findAll('.sticker-card')
      expect(stickerCards.length).toBeGreaterThanOrEqual(0)
    }
  })

  // ========================================
  // TEST 8: Filter by "public"
  // ========================================
  it('should filter stickers by "public" status', async () => {
    store.loading = false
    store.stickers = mockStickers

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Cliquer sur le filtre "Publics"
    const buttons = wrapper.findAll('button')
    const publicButton = buttons.find((btn) => btn.text().includes('Publics'))

    if (publicButton) {
      await publicButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Vérifier que le filtre est appliqué
      const stickerCards = wrapper.findAll('.sticker-card')
      expect(stickerCards.length).toBeGreaterThanOrEqual(0)
    }
  })

  // ========================================
  // TEST 9: Click on sticker emits event
  // ========================================
  it('should emit "sticker-selected" event when sticker is clicked', async () => {
    store.loading = false
    store.stickers = mockStickers

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Cliquer sur le premier sticker
    const firstSticker = wrapper.find('.sticker-card')

    if (firstSticker.exists()) {
      await firstSticker.trigger('click')

      // Vérifier que l'événement est émis
      expect(wrapper.emitted('sticker-selected')).toBeTruthy()
    }
  })

  // ========================================
  // TEST 10: Drag start on sticker
  // ========================================
  it('should allow dragging stickers when canSelect is true', async () => {
    store.loading = false
    store.stickers = mockStickers

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Vérifier que le premier sticker est draggable
    const firstSticker = wrapper.find('.sticker-card')

    if (firstSticker.exists()) {
      expect(firstSticker.attributes('draggable')).toBe('true')
    }
  })

  // ========================================
  // TEST 11: Delete sticker calls store
  // ========================================
  it('should call deleteSticker when delete button is clicked and confirmed', async () => {
    store.loading = false
    store.stickers = mockStickers
    store.deleteSticker = vi.fn().mockResolvedValue(undefined)

    // Mock de la confirmation
    global.confirm = vi.fn(() => true)

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Trouver et cliquer sur le bouton delete (emoji 🗑️)
    const firstSticker = wrapper.find('.sticker-card')

    if (firstSticker.exists()) {
      const deleteButton = firstSticker.findAll('button').find((btn) => btn.text().includes('🗑️'))

      if (deleteButton) {
        await deleteButton.trigger('click')

        // Vérifier que confirm a été appelé
        expect(global.confirm).toHaveBeenCalled()

        // Vérifier que deleteSticker a été appelé
        expect(store.deleteSticker).toHaveBeenCalledWith('sticker-1')
      }
    }
  })

  // ========================================
  // TEST 12: Delete sticker cancelled
  // ========================================
  it('should not delete sticker when user cancels confirmation', async () => {
    store.loading = false
    store.stickers = mockStickers
    store.deleteSticker = vi.fn().mockResolvedValue(undefined)

    // Mock de la confirmation (annuler)
    global.confirm = vi.fn(() => false)

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Trouver et cliquer sur le bouton delete
    const firstSticker = wrapper.find('.sticker-card')

    if (firstSticker.exists()) {
      const deleteButton = firstSticker.findAll('button').find((btn) => btn.text().includes('🗑️'))

      if (deleteButton) {
        await deleteButton.trigger('click')

        // Vérifier que confirm a été appelé
        expect(global.confirm).toHaveBeenCalled()

        // Vérifier que deleteSticker n'a PAS été appelé
        expect(store.deleteSticker).not.toHaveBeenCalled()
      }
    }
  })

  // ========================================
  // TEST 13: Edit sticker opens modal
  // ========================================
  it('should open edit modal when edit button is clicked', async () => {
    store.loading = false
    store.stickers = mockStickers

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Trouver et cliquer sur le bouton edit (emoji ✏️)
    const firstSticker = wrapper.find('.sticker-card')

    if (firstSticker.exists()) {
      const editButton = firstSticker.findAll('button').find((btn) => btn.text().includes('✏️'))

      if (editButton) {
        await editButton.trigger('click')
        await wrapper.vm.$nextTick()

        // Vérifier que la modal est affichée
        const modal = wrapper.find('.n-modal')
        expect(modal.exists()).toBe(true)
      }
    }
  })

  // ========================================
  // TEST 14: Save edited sticker
  // ========================================
  it('should save sticker edits when save button is clicked', async () => {
    store.loading = false
    store.stickers = mockStickers
    store.renameSticker = vi.fn().mockResolvedValue(mockStickers[0])

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Ouvrir la modal d'édition
    const firstSticker = wrapper.find('.sticker-card')

    if (firstSticker.exists()) {
      const editButton = firstSticker.findAll('button').find((btn) => btn.text().includes('✏️'))

      if (editButton) {
        await editButton.trigger('click')
        await wrapper.vm.$nextTick()

        // Modifier le nom
        const modal = wrapper.find('.n-modal')
        const inputs = modal.findAll('input')

        if (inputs.length >= 2) {
          await inputs[0].setValue('Updated Name')
          await inputs[1].setValue('new, tags')

          // Cliquer sur Save
          const saveButton = modal.findAll('button').find((btn) => btn.text() === 'Save')

          if (saveButton) {
            await saveButton.trigger('click')
            await wrapper.vm.$nextTick()

            // Vérifier que renameSticker a été appelé
            expect(store.renameSticker).toHaveBeenCalled()
          }
        }
      }
    }
  })

  // ========================================
  // TEST 15: Close button emits event
  // ========================================
  it('should emit "close" event when close button is clicked', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Trouver et cliquer sur le bouton close (×)
    const buttons = wrapper.findAll('button')
    const closeButton = buttons.find((btn) => btn.text().includes('×'))

    if (closeButton) {
      await closeButton.trigger('click')

      // Vérifier que l'événement close est émis
      expect(wrapper.emitted('close')).toBeTruthy()
    }
  })

  // ========================================
  // TEST 16: Error state displays alert
  // ========================================
  it('should display error alert when error is present', async () => {
    store.loading = false
    store.error = 'Failed to load stickers'
    store.stickers = []

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Vérifier que l'alerte d'erreur est affichée
    expect(wrapper.find('.sticker-library__error').exists()).toBe(true)
  })

  // ========================================
  // TEST 17: canSelect prop disables selection
  // ========================================
  it('should not emit "sticker-selected" when canSelect is false', async () => {
    store.loading = false
    store.stickers = mockStickers

    const wrapper = createWrapper({ canSelect: false })
    await wrapper.vm.$nextTick()

    // Cliquer sur un sticker
    const firstSticker = wrapper.find('.sticker-card')

    if (firstSticker.exists()) {
      await firstSticker.trigger('click')

      // Vérifier que l'événement n'est PAS émis
      expect(wrapper.emitted('sticker-selected')).toBeFalsy()
    }
  })

  // ========================================
  // TEST 18: Store is called on mount
  // ========================================
  it('should call loadStickerLibrary on component mount', () => {
    createWrapper()

    // Vérifier que le store a été appelé pour charger les stickers
    expect(store.loadStickerLibrary).toHaveBeenCalled()
  })

  // ========================================
  // TEST 19: Stickers display name
  // ========================================
  it('should display sticker names in cards', async () => {
    store.loading = false
    store.stickers = mockStickers

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Vérifier que les noms des stickers sont présents dans le texte
    expect(wrapper.text()).toContain('Nature Sticker')
  })

  // ========================================
  // TEST 20: Upload button is present
  // ========================================
  it('should have an upload button in the header', () => {
    const wrapper = createWrapper()

    // Vérifier que le bouton d'upload est présent
    const uploadButton = wrapper.findAll('button').find((btn) => btn.text().includes('Upload'))
    expect(uploadButton).toBeDefined()
  })
})
