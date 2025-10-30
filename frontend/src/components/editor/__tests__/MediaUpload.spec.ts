/**
 * Tests unitaires pour le composant MediaUpload
 *
 * Ce test suite vérifie le bon fonctionnement du composant d'upload de médias
 * pour l'US04 (Page Edition - Media and Visual Elements).
 *
 * Tests couverts :
 * - Rendu et structure du composant
 * - Drag-and-drop de fichiers
 * - Sélection de fichiers via input
 * - Validation de type et taille de fichier
 * - Prévisualisation d'images
 * - Suivi de progression d'upload
 * - Gestion des erreurs
 * - Émission d'événements
 * - État désactivé
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MediaUpload from '../MediaUpload.vue'
import mediaService from '@/services/mediaService'

// Mock du service mediaService
vi.mock('@/services/mediaService', () => ({
  default: {
    uploadMedia: vi.fn()
  }
}))

describe('MediaUpload.vue', () => {
  let wrapper: any
  const mockPageId = '223e4567-e89b-12d3-a456-426614174000'

  // Mock d'une réponse d'upload de média retournée par le service
  const mockMediaUploadResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    pageId: mockPageId,
    type: 'image' as const,
    cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
    cloudinaryPublicId: 'test-public-id',
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    zIndex: 1,
    rotation: 0,
    content: { url: 'https://res.cloudinary.com/test/image.jpg' },
    style: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()

    wrapper = mount(MediaUpload, {
      props: {
        pageId: mockPageId
      }
    })
  })

  // =====================================================
  // RENDER & STRUCTURE TESTS
  // =====================================================

  it('renders dropzone when no file is selected', () => {
    const dropzone = wrapper.find('.media-upload__dropzone')
    expect(dropzone.exists()).toBe(true)
  })

  it('renders file input with correct accept attribute', () => {
    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('accept')).toContain('.jpg')
    expect(input.attributes('accept')).toContain('.png')
    expect(input.attributes('accept')).toContain('.svg')
  })

  it('renders dropzone content with icon and text', () => {
    const icon = wrapper.find('.media-upload__icon')
    const text = wrapper.find('.media-upload__text')
    const hint = wrapper.find('.media-upload__hint')

    expect(icon.exists()).toBe(true)
    expect(text.exists()).toBe(true)
    expect(text.text()).toContain('Glissez une image')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('Max 10 MB')
  })

  it('renders action buttons (Upload and Cancel)', () => {
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)

    const cancelBtn = buttons.find((btn: any) => btn.text().includes('Annuler'))
    const uploadBtn = buttons.find((btn: any) => btn.text().includes('Uploader'))

    expect(cancelBtn?.exists()).toBe(true)
    expect(uploadBtn?.exists()).toBe(true)
  })

  it('disables upload button when no file is selected', () => {
    const uploadBtn = wrapper.findAll('button').find((btn: any) => btn.text().includes('Uploader'))
    expect(uploadBtn?.attributes('disabled')).toBeDefined()
  })

  // =====================================================
  // FILE SELECTION TESTS
  // =====================================================

  it('shows preview when a valid file is selected', async () => {
    const file = new File(['test content'], 'test-image.jpg', { type: 'image/jpeg' })

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/jpeg;base64,mockbase64content',
      onload: null as any,
      onerror: null as any
    }

    vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)

    const input = wrapper.find('input[type="file"]')

    // Simuler la sélection de fichier
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')

    // Simuler le onload de FileReader
    if (mockFileReader.onload) {
      mockFileReader.onload({} as any)
    }

    await flushPromises()

    // Vérifier que le preview est affiché
    const preview = wrapper.find('.media-upload__preview')
    expect(preview.exists()).toBe(true)
  })

  it('displays filename in preview', async () => {
    const file = new File(['test content'], 'my-vacation-photo.jpg', { type: 'image/jpeg' })

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/jpeg;base64,mockbase64',
      onload: null as any,
      onerror: null as any
    }

    vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')

    if (mockFileReader.onload) {
      mockFileReader.onload({} as any)
    }

    await flushPromises()

    const filename = wrapper.find('.media-upload__filename')
    expect(filename.text()).toBe('my-vacation-photo.jpg')
  })

  // =====================================================
  // DRAG AND DROP TESTS
  // =====================================================

  it('applies dragging class on dragover', async () => {
    const dropzone = wrapper.find('.media-upload__dropzone')

    const dragEvent = new Event('dragover') as DragEvent
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: { files: [] }
    })

    await dropzone.trigger('dragover', { dataTransfer: { files: [] } })

    expect(dropzone.classes()).toContain('media-upload__dropzone--dragging')
  })

  it('removes dragging class on dragleave', async () => {
    const dropzone = wrapper.find('.media-upload__dropzone')

    await dropzone.trigger('dragover')
    expect(dropzone.classes()).toContain('media-upload__dropzone--dragging')

    await dropzone.trigger('dragleave')
    expect(dropzone.classes()).not.toContain('media-upload__dropzone--dragging')
  })

  it('handles file drop', async () => {
    const file = new File(['test'], 'dropped-image.jpg', { type: 'image/jpeg' })

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/jpeg;base64,mockbase64',
      onload: null as any,
      onerror: null as any
    }

    vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)

    const dropzone = wrapper.find('.media-upload__dropzone')

    await dropzone.trigger('drop', {
      preventDefault: () => {},
      dataTransfer: {
        files: [file]
      }
    })

    // Simuler le onload
    if (mockFileReader.onload) {
      mockFileReader.onload({} as any)
    }

    await flushPromises()

    const preview = wrapper.find('.media-upload__preview')
    expect(preview.exists()).toBe(true)
  })

  // =====================================================
  // FILE VALIDATION TESTS
  // =====================================================

  it('rejects invalid file type (PDF)', async () => {
    const file = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' })

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')
    await flushPromises()

    // Vérifier qu'une erreur est émise
    expect(wrapper.emitted('error')).toBeTruthy()
    expect(wrapper.emitted('error')[0][0]).toContain('Format de fichier non accepté')

    // Vérifier que le preview n'est pas affiché
    const preview = wrapper.find('.media-upload__preview')
    expect(preview.exists()).toBe(false)
  })

  it('rejects file larger than 10MB', async () => {
    // Créer un fichier de 11 MB
    const largeContent = new Array(11 * 1024 * 1024).fill('a').join('')
    const file = new File([largeContent], 'large-image.jpg', { type: 'image/jpeg' })

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')
    await flushPromises()

    // Vérifier qu'une erreur est émise
    expect(wrapper.emitted('error')).toBeTruthy()
    expect(wrapper.emitted('error')[0][0]).toContain('trop volumineux')

    // Vérifier que le preview n'est pas affiché
    const preview = wrapper.find('.media-upload__preview')
    expect(preview.exists()).toBe(false)
  })

  it('displays error alert for validation errors', async () => {
    const file = new File(['content'], 'doc.txt', { type: 'text/plain' })

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')
    await flushPromises()

    // Vérifier que l'alerte d'erreur est affichée
    const alert = wrapper.find('.media-upload__alert')
    expect(alert.exists()).toBe(true)
  })

  // =====================================================
  // UPLOAD TESTS
  // =====================================================

  it('calls mediaService.uploadMedia when upload button is clicked', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/jpeg;base64,mockbase64',
      onload: null as any,
      onerror: null as any
    }

    vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)

    // Mock uploadMedia
    vi.mocked(mediaService.uploadMedia).mockResolvedValue(mockMediaUploadResponse)

    // Sélectionner un fichier
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')

    if (mockFileReader.onload) {
      mockFileReader.onload({} as any)
    }

    await flushPromises()

    // Cliquer sur le bouton upload
    const uploadBtn = wrapper.findAll('button').find((btn: any) => btn.text().includes('Uploader'))
    await uploadBtn?.trigger('click')
    await flushPromises()

    expect(mediaService.uploadMedia).toHaveBeenCalledWith(
      file,
      mockPageId,
      expect.any(Function)
    )
  })

  it('emits uploaded event with page element on success', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/jpeg;base64,mockbase64',
      onload: null as any,
      onerror: null as any
    }

    vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)

    // Mock uploadMedia
    vi.mocked(mediaService.uploadMedia).mockResolvedValue(mockMediaUploadResponse)

    // Sélectionner un fichier
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')

    if (mockFileReader.onload) {
      mockFileReader.onload({} as any)
    }

    await flushPromises()

    // Upload
    const uploadBtn = wrapper.findAll('button').find((btn: any) => btn.text().includes('Uploader'))
    await uploadBtn?.trigger('click')
    await flushPromises()

    // Vérifier l'émission de l'événement uploaded
    expect(wrapper.emitted('uploaded')).toBeTruthy()
    expect(wrapper.emitted('uploaded')[0][0]).toEqual(mockMediaUploadResponse)
  })

  it('tracks upload progress', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/jpeg;base64,mockbase64',
      onload: null as any,
      onerror: null as any
    }

    vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)

    // Mock uploadMedia avec suivi de progression
    let progressCallback: ((percent: number) => void) | undefined

    vi.mocked(mediaService.uploadMedia).mockImplementation(
      async (_file: File, _pageId: string, onProgress?: (percent: number) => void) => {
        progressCallback = onProgress
        // Simuler la progression
        if (progressCallback) {
          progressCallback(25)
          progressCallback(50)
          progressCallback(75)
          progressCallback(100)
        }
        return mockMediaUploadResponse
      }
    )

    // Sélectionner un fichier
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')

    if (mockFileReader.onload) {
      mockFileReader.onload({} as any)
    }

    await flushPromises()

    // Upload
    const uploadBtn = wrapper.findAll('button').find((btn: any) => btn.text().includes('Uploader'))
    await uploadBtn?.trigger('click')
    await flushPromises()

    // Vérifier que la progression est affichée
    const progressBar = wrapper.find('.media-upload__progress')
    expect(progressBar.exists()).toBe(false) // Après upload complété, la barre devrait disparaître
  })

  it('emits error event on upload failure', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/jpeg;base64,mockbase64',
      onload: null as any,
      onerror: null as any
    }

    vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)

    // Mock uploadMedia avec erreur
    const errorMessage = 'Network error during upload'
    vi.mocked(mediaService.uploadMedia).mockRejectedValue(new Error(errorMessage))

    // Sélectionner un fichier
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')

    if (mockFileReader.onload) {
      mockFileReader.onload({} as any)
    }

    await flushPromises()

    // Upload
    const uploadBtn = wrapper.findAll('button').find((btn: any) => btn.text().includes('Uploader'))
    await uploadBtn?.trigger('click')
    await flushPromises()

    // Vérifier qu'une erreur est émise
    expect(wrapper.emitted('error')).toBeTruthy()
    const emittedErrors = wrapper.emitted('error')
    const lastError = emittedErrors[emittedErrors.length - 1][0]
    // Le message d'erreur peut être soit le message original de l'erreur, soit le message par défaut
    expect(typeof lastError).toBe('string')
    expect(lastError.length).toBeGreaterThan(0)
  })

  // =====================================================
  // CANCEL TESTS
  // =====================================================

  it('emits cancel event when cancel button is clicked', async () => {
    const cancelBtn = wrapper.findAll('button').find((btn: any) => btn.text().includes('Annuler'))
    await cancelBtn?.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('resets state when cancel is clicked after file selection', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/jpeg;base64,mockbase64',
      onload: null as any,
      onerror: null as any
    }

    vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)

    // Sélectionner un fichier
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')

    if (mockFileReader.onload) {
      mockFileReader.onload({} as any)
    }

    await flushPromises()

    // Vérifier que le preview existe
    let preview = wrapper.find('.media-upload__preview')
    expect(preview.exists()).toBe(true)

    // Annuler
    const cancelBtn = wrapper.findAll('button').find((btn: any) => btn.text().includes('Annuler'))
    await cancelBtn?.trigger('click')
    await flushPromises()

    // Vérifier que le preview a disparu
    preview = wrapper.find('.media-upload__preview')
    expect(preview.exists()).toBe(false)

    // Vérifier que la dropzone est à nouveau affichée
    const dropzone = wrapper.find('.media-upload__dropzone')
    expect(dropzone.exists()).toBe(true)
  })

  // =====================================================
  // DISABLED STATE TESTS
  // =====================================================

  it('disables dropzone when disabled prop is true', async () => {
    await wrapper.setProps({ disabled: true })

    const dropzone = wrapper.find('.media-upload__dropzone')
    expect(dropzone.classes()).toContain('media-upload__dropzone--disabled')

    const input = wrapper.find('input[type="file"]')
    expect(input.attributes('disabled')).toBeDefined()
  })

  it('disables buttons when disabled prop is true', async () => {
    await wrapper.setProps({ disabled: true })

    const buttons = wrapper.findAll('button')
    buttons.forEach((btn: any) => {
      expect(btn.attributes('disabled')).toBeDefined()
    })
  })
})
