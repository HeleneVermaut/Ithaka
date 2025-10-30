/**
 * Tests unitaires pour le composant ImageTransformModal
 *
 * Ce fichier teste toutes les fonctionnalités du modal de transformation d'images :
 * - Navigation entre les onglets
 * - Modification des sliders de transformation (brightness, contrast, saturation)
 * - Rotation de l'image
 * - Crop (recadrage) avec activation/désactivation
 * - Flip horizontal et vertical
 * - Génération de l'URL de preview Cloudinary
 * - Réinitialisation des transformations
 * - Annulation et fermeture du modal
 * - Application des transformations via l'API
 * - Gestion des erreurs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ImageTransformModal from '../editor/ImageTransformModal.vue'
import mediaService from '@/services/mediaService'
import pageElementService from '@/services/pageElementService'

// ========================================
// MOCKS
// ========================================

/**
 * Mock de window.$message pour les notifications NaiveUI
 */
const mockMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}

/**
 * Mock des services API
 */
vi.mock('@/services/mediaService', () => ({
  default: {
    transformImage: vi.fn()
  }
}))

vi.mock('@/services/pageElementService', () => ({
  default: {
    updatePageElement: vi.fn()
  }
}))

/**
 * Mock de useMessage de NaiveUI
 */
vi.mock('naive-ui', async () => {
  const actual = await vi.importActual('naive-ui')
  return {
    ...actual,
    useMessage: () => mockMessage
  }
})

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Crée une instance montée du composant avec des props par défaut
 *
 * @param overrides - Props à surcharger
 * @returns VueWrapper du composant monté
 */
const createWrapper = (overrides = {}): VueWrapper => {
  const defaultProps = {
    elementId: '123e4567-e89b-12d3-a456-426614174000',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    show: true
  }

  return mount(ImageTransformModal, {
    props: {
      ...defaultProps,
      ...overrides
    },
    global: {
      stubs: {
        // Stub NModal to always show content when show=true
        NModal: {
          template: '<div v-if="show" class="n-modal"><slot /></div>',
          props: ['show']
        },
        NCard: {
          template: `
            <div class="n-card">
              <div class="n-card__header">
                <slot name="header" />
              </div>
              <div class="n-card__content">
                <slot />
              </div>
              <div class="n-card__footer">
                <slot name="footer" />
              </div>
            </div>
          `,
          props: ['title', 'bordered', 'size', 'closable']
        },
        NTabs: {
          template: '<div class="n-tabs"><slot /></div>',
          props: ['value', 'type', 'animated']
        },
        NTabPane: {
          template: '<div class="n-tab-pane" :data-tab-name="name"><slot /></div>',
          props: ['name', 'tab']
        },
        NSlider: {
          template: '<input class="n-slider" type="range" :value="value" @input="$emit(\'update:value\', Number($event.target.value))" />',
          props: ['value', 'min', 'max', 'step', 'tooltip']
        },
        NInputNumber: {
          template: '<input class="n-input-number" type="number" :value="value" @input="$emit(\'update:value\', Number($event.target.value))" />',
          props: ['value', 'min', 'max', 'step', 'size']
        },
        NButton: {
          template: '<button class="n-button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
          props: ['disabled', 'loading', 'type', 'secondary']
        },
        NSpace: {
          template: '<div class="n-space"><slot /></div>',
          props: ['vertical', 'justify', 'size']
        },
        NImage: {
          template: '<img class="n-image" :src="src" :alt="alt" />',
          props: ['src', 'alt', 'previewDisabled']
        },
        NGrid: {
          template: '<div class="n-grid"><slot /></div>',
          props: ['cols', 'xGap']
        },
        NGridItem: {
          template: '<div class="n-grid-item"><slot /></div>',
          props: ['span']
        },
        NText: {
          template: '<span class="n-text"><slot /></span>',
          props: ['depth', 'strong']
        }
      }
    }
  })
}

// ========================================
// TESTS
// ========================================

describe('ImageTransformModal', () => {
  beforeEach(() => {
    // Réinitialiser les mocks avant chaque test
    vi.clearAllMocks()
  })

  // ========================================
  // Test 1: Rendu initial
  // ========================================
  it('should render correctly when show is true', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('.n-modal').exists()).toBe(true)
    expect(wrapper.find('.n-card').exists()).toBe(true)
    expect(wrapper.text()).toContain("Transformations d'image")
  })

  // ========================================
  // Test 2: Affichage de la preview
  // ========================================
  it('should display image preview with correct URL', () => {
    const imageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    const wrapper = createWrapper({ imageUrl })

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(imageUrl)
  })

  // ========================================
  // Test 3: Navigation entre les onglets
  // ========================================
  it('should display all transformation tabs', () => {
    const wrapper = createWrapper()

    // Vérifier la présence des onglets via leur contenu
    expect(wrapper.text()).toContain('Luminosité')
    expect(wrapper.text()).toContain('Contraste')
    expect(wrapper.text()).toContain('Saturation')
    expect(wrapper.text()).toContain('Rotation')
    expect(wrapper.text()).toContain('Recadrage')
    expect(wrapper.text()).toContain('Retournement')
  })

  // ========================================
  // Test 4: Modification du brightness
  // ========================================
  it('should update brightness value when slider changes', async () => {
    const wrapper = createWrapper()

    // Trouver le slider de brightness (premier slider dans le DOM)
    const sliders = wrapper.findAll('input[type="range"]')
    const brightnessSlider = sliders[0]

    // Simuler un changement de valeur
    await brightnessSlider.setValue(50)
    await nextTick()

    // Vérifier que la valeur a été mise à jour dans l'input number associé
    const numberInputs = wrapper.findAll('input[type="number"]')
    const brightnessInput = numberInputs[0]
    expect((brightnessInput.element as HTMLInputElement).value).toBe('50')
  })

  // ========================================
  // Test 5: Modification du contrast
  // ========================================
  it('should update contrast value when slider changes', async () => {
    const wrapper = createWrapper()

    const sliders = wrapper.findAll('input[type="range"]')
    const contrastSlider = sliders[1] // Deuxième slider

    await contrastSlider.setValue(-30)
    await nextTick()

    const numberInputs = wrapper.findAll('input[type="number"]')
    const contrastInput = numberInputs[1]
    expect((contrastInput.element as HTMLInputElement).value).toBe('-30')
  })

  // ========================================
  // Test 6: Modification de la saturation
  // ========================================
  it('should update saturation value when slider changes', async () => {
    const wrapper = createWrapper()

    const sliders = wrapper.findAll('input[type="range"]')
    const saturationSlider = sliders[2] // Troisième slider

    await saturationSlider.setValue(70)
    await nextTick()

    const numberInputs = wrapper.findAll('input[type="number"]')
    const saturationInput = numberInputs[2]
    expect((saturationInput.element as HTMLInputElement).value).toBe('70')
  })

  // ========================================
  // Test 7: Modification de la rotation
  // ========================================
  it('should update rotation value when slider changes', async () => {
    const wrapper = createWrapper()

    const sliders = wrapper.findAll('input[type="range"]')
    const rotationSlider = sliders[3] // Quatrième slider

    await rotationSlider.setValue(90)
    await nextTick()

    const numberInputs = wrapper.findAll('input[type="number"]')
    const rotationInput = numberInputs[3]
    expect((rotationInput.element as HTMLInputElement).value).toBe('90')
  })

  // ========================================
  // Test 8: Activation du crop
  // ========================================
  it('should enable crop when activate button is clicked', async () => {
    const wrapper = createWrapper()

    // Vérifier que le crop n'est pas actif initialement
    expect(wrapper.text()).toContain('Activer le recadrage')

    // Trouver et cliquer sur le bouton d'activation
    const buttons = wrapper.findAll('button')
    const activateCropButton = buttons.find(btn => btn.text() === 'Activer le recadrage')

    expect(activateCropButton).toBeDefined()
    await activateCropButton!.trigger('click')
    await nextTick()

    // Vérifier que le crop est maintenant actif
    expect(wrapper.text()).toContain('Désactiver le recadrage')
    expect(wrapper.text()).toContain('Position X')
    expect(wrapper.text()).toContain('Position Y')
  })

  // ========================================
  // Test 9: Désactivation du crop
  // ========================================
  it('should disable crop when deactivate button is clicked', async () => {
    const wrapper = createWrapper()

    // Activer le crop
    const buttons = wrapper.findAll('button')
    const activateCropButton = buttons.find(btn => btn.text() === 'Activer le recadrage')
    await activateCropButton!.trigger('click')
    await nextTick()

    // Désactiver le crop
    const deactivateButton = wrapper.findAll('button').find(btn => btn.text() === 'Désactiver le recadrage')
    expect(deactivateButton).toBeDefined()
    await deactivateButton!.trigger('click')
    await nextTick()

    // Vérifier que le crop est désactivé
    expect(wrapper.text()).toContain('Activer le recadrage')
    expect(wrapper.text()).not.toContain('Position X')
  })

  // ========================================
  // Test 10: Toggle flip horizontal
  // ========================================
  it('should toggle flip horizontal when button is clicked', async () => {
    const wrapper = createWrapper()

    const buttons = wrapper.findAll('button')
    const flipHorizontalButton = buttons.find(btn => btn.text() === 'Flip Horizontal')

    expect(flipHorizontalButton).toBeDefined()
    await flipHorizontalButton!.trigger('click')
    await nextTick()

    // Vérifier que le message de confirmation s'affiche
    expect(wrapper.text()).toContain('Retournement horizontal activé')
  })

  // ========================================
  // Test 11: Toggle flip vertical
  // ========================================
  it('should toggle flip vertical when button is clicked', async () => {
    const wrapper = createWrapper()

    const buttons = wrapper.findAll('button')
    const flipVerticalButton = buttons.find(btn => btn.text() === 'Flip Vertical')

    expect(flipVerticalButton).toBeDefined()
    await flipVerticalButton!.trigger('click')
    await nextTick()

    // Vérifier que le message de confirmation s'affiche
    expect(wrapper.text()).toContain('Retournement vertical activé')
  })

  // ========================================
  // Test 12: Réinitialisation des transformations
  // ========================================
  it('should reset all transformations when reset button is clicked', async () => {
    const wrapper = createWrapper()

    // Modifier plusieurs valeurs
    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0].setValue(50) // Brightness
    await sliders[1].setValue(-30) // Contrast
    await nextTick()

    // Cliquer sur le bouton Reset
    const buttons = wrapper.findAll('button')
    const resetButton = buttons.find(btn => btn.text() === 'Réinitialiser')

    expect(resetButton).toBeDefined()
    await resetButton!.trigger('click')
    await nextTick()

    // Vérifier que les valeurs sont réinitialisées
    const numberInputs = wrapper.findAll('input[type="number"]')
    expect((numberInputs[0].element as HTMLInputElement).value).toBe('0')
    expect((numberInputs[1].element as HTMLInputElement).value).toBe('0')

    // Vérifier que le message info est affiché
    expect(mockMessage.info).toHaveBeenCalledWith('Transformations réinitialisées')
  })

  // ========================================
  // Test 13: Annulation (fermeture du modal)
  // ========================================
  it('should emit cancel and update:show when cancel button is clicked', async () => {
    const wrapper = createWrapper()

    const buttons = wrapper.findAll('button')
    const cancelButton = buttons.find(btn => btn.text() === 'Annuler')

    expect(cancelButton).toBeDefined()
    await cancelButton!.trigger('click')
    await nextTick()

    // Vérifier les événements émis
    expect(wrapper.emitted('update:show')).toBeTruthy()
    expect(wrapper.emitted('update:show')![0]).toEqual([false])
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  // ========================================
  // Test 14: Application des transformations (succès)
  // ========================================
  it('should apply transformations successfully when apply button is clicked', async () => {
    // Mock des services
    const mockCloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/transformed.jpg'
    vi.mocked(mediaService.transformImage).mockResolvedValue({
      cloudinaryUrl: mockCloudinaryUrl,
      metadata: {
        width: 800,
        height: 600,
        adjustments: {}
      }
    })
    vi.mocked(pageElementService.updatePageElement).mockResolvedValue({} as any)

    const wrapper = createWrapper()

    // Modifier des valeurs
    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0].setValue(30) // Brightness
    await nextTick()

    // Cliquer sur le bouton Appliquer
    const buttons = wrapper.findAll('button')
    const applyButton = buttons.find(btn => btn.text() === 'Appliquer')

    expect(applyButton).toBeDefined()
    await applyButton!.trigger('click')
    await nextTick()

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0))

    // Vérifier que les services ont été appelés
    expect(mediaService.transformImage).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      expect.objectContaining({
        brightness: 30
      })
    )

    expect(pageElementService.updatePageElement).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      { cloudinaryUrl: mockCloudinaryUrl }
    )

    // Vérifier que le message de succès est affiché
    expect(mockMessage.success).toHaveBeenCalledWith('Transformations appliquées avec succès')

    // Vérifier que l'événement applied est émis
    expect(wrapper.emitted('applied')).toBeTruthy()
  })

  // ========================================
  // Test 15: Application des transformations (erreur)
  // ========================================
  it('should handle error when applying transformations fails', async () => {
    // Mock d'erreur
    const errorMessage = 'Erreur réseau'
    vi.mocked(mediaService.transformImage).mockRejectedValue(new Error(errorMessage))

    const wrapper = createWrapper()

    // Modifier des valeurs
    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0].setValue(30)
    await nextTick()

    // Cliquer sur le bouton Appliquer
    const buttons = wrapper.findAll('button')
    const applyButton = buttons.find(btn => btn.text() === 'Appliquer')

    await applyButton!.trigger('click')
    await nextTick()

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0))

    // Vérifier que le message d'erreur est affiché
    expect(mockMessage.error).toHaveBeenCalled()
  })

  // ========================================
  // Test 16: Preview URL avec transformations
  // ========================================
  it('should generate correct preview URL with transformations', async () => {
    const wrapper = createWrapper()

    // Modifier plusieurs transformations
    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0].setValue(20) // Brightness
    await sliders[1].setValue(-10) // Contrast
    await sliders[3].setValue(90) // Rotation
    await nextTick()

    // Récupérer l'URL de l'image preview
    const img = wrapper.find('img')
    const previewUrl = img.attributes('src')

    // Vérifier que l'URL contient les transformations Cloudinary
    expect(previewUrl).toContain('e_brightness:20')
    expect(previewUrl).toContain('e_contrast:-10')
    expect(previewUrl).toContain('a_90')
  })

  // ========================================
  // Test 17: Preview URL sans transformations
  // ========================================
  it('should return original URL when no transformations are active', () => {
    const imageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    const wrapper = createWrapper({ imageUrl })

    const img = wrapper.find('img')
    const previewUrl = img.attributes('src')

    // Sans transformations, l'URL doit être l'originale
    expect(previewUrl).toBe(imageUrl)
  })

  // ========================================
  // Test 18: Désactivation du bouton Apply sans transformations
  // ========================================
  it('should disable apply button when no transformations are active', () => {
    const wrapper = createWrapper()

    const buttons = wrapper.findAll('button')
    const applyButton = buttons.find(btn => btn.text() === 'Appliquer')

    expect(applyButton).toBeDefined()
    expect(applyButton!.attributes('disabled')).toBeDefined()
  })

  // ========================================
  // Test 19: Activation du bouton Apply avec transformations
  // ========================================
  it('should enable apply button when transformations are active', async () => {
    const wrapper = createWrapper()

    // Modifier une valeur
    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0].setValue(30)
    await nextTick()

    const buttons = wrapper.findAll('button')
    const applyButton = buttons.find(btn => btn.text() === 'Appliquer')

    expect(applyButton).toBeDefined()
    expect(applyButton!.attributes('disabled')).toBeUndefined()
  })
})
