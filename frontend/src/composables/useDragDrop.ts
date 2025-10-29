/**
 * Composable for Drag & Drop functionality
 *
 * Provides reusable logic for dragging items from the TextLibrary
 * and dropping them onto the Fabric.js canvas as text elements.
 *
 * Features:
 * - Drag start handling with custom drag image
 * - Drop zone highlighting
 * - Coordinate conversion from DOM to canvas space
 * - TypeScript type safety for drag data
 *
 * Architecture:
 * - Encapsulates all drag-and-drop logic in one place
 * - Works with both TextLibrary and EditorCanvas components
 * - Handles visual feedback for better UX
 *
 * Usage:
 * ```typescript
 * // In TextLibrary component
 * const { handleDragStart } = useDragDrop()
 *
 * // In EditorCanvas component
 * const { handleDragOver, handleDragLeave, handleDrop } = useDragDrop()
 * ```
 */

import { ref } from 'vue'
import type { ISavedText } from '@/types/models'
import { fabric } from 'fabric'

/**
 * Drag data format stored in DataTransfer
 * Used to pass saved text information from library to canvas
 */
export interface DragDataPayload {
  /** Unique identifier of saved text */
  id: string
  /** Display label for the text */
  label: string
  /** Type of saved text (citation, poeme, libre) */
  type: string
  /** Formatted text content with styling */
  content: {
    text: string
    fontFamily: string
    fontSize: number
    fill: string
    textAlign?: 'left' | 'center' | 'right'
    fontWeight?: 'normal' | 'bold'
    fontStyle?: 'normal' | 'italic'
    underline?: boolean
    lineHeight?: number
  }
}

/**
 * Configuration options for drag-and-drop behavior
 */
export interface DragDropOptions {
  /** Enable debug logging (default: false) */
  debug?: boolean
  /** Custom drop effect (default: 'copy') */
  dropEffect?: 'copy' | 'move' | 'link'
  /** Default text width when dropped (default: 300px) */
  defaultTextWidth?: number
}

/**
 * Return type for useDragDrop composable
 */
export interface UseDragDropReturn {
  /** Is user currently dragging over drop zone */
  isDraggingOver: Readonly<ReturnType<typeof ref>>
  /** Handle drag start event (from TextLibrary) */
  handleDragStart: (text: ISavedText, event: DragEvent) => void
  /** Handle drag over event (on canvas) */
  handleDragOver: (event: DragEvent) => void
  /** Handle drag leave event (on canvas) */
  handleDragLeave: (event: DragEvent) => void
  /** Handle drop event (on canvas) */
  handleDrop: (
    event: DragEvent,
    canvas: fabric.Canvas | null,
    onSuccess?: (textbox: fabric.Textbox) => void
  ) => Promise<void>
  /** Parse drag data from DataTransfer */
  parseDragData: (dataTransfer: DataTransfer) => DragDataPayload | null
  /** Create Fabric.js Textbox from drag data */
  createTextboxFromDragData: (
    data: DragDataPayload,
    position: { x: number; y: number },
    width?: number
  ) => fabric.Textbox
}

/**
 * Composable for handling drag-and-drop operations
 *
 * Provides all necessary functions and state for implementing
 * drag-and-drop from TextLibrary to EditorCanvas.
 *
 * @param options - Configuration options for drag-and-drop behavior
 * @returns Object with drag-and-drop handlers and state
 *
 * @example
 * ```typescript
 * // In component
 * const { isDraggingOver, handleDragStart, handleDrop } = useDragDrop({
 *   debug: true,
 *   defaultTextWidth: 400
 * })
 * ```
 */
export function useDragDrop(options: DragDropOptions = {}): UseDragDropReturn {
  // ========================================
  // CONFIGURATION
  // ========================================

  const {
    debug = false,
    dropEffect = 'copy',
    defaultTextWidth = 300
  } = options

  // ========================================
  // STATE
  // ========================================

  /**
   * Tracks if user is currently dragging over the drop zone
   * Used to show visual feedback (highlight, border, etc.)
   */
  const isDraggingOver = ref<boolean>(false)

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Log debug messages if debug mode is enabled
   *
   * @param message - Message to log
   * @param data - Optional data to log
   */
  const log = (message: string, data?: any): void => {
    if (debug) {
      console.log(`[useDragDrop] ${message}`, data || '')
    }
  }

  /**
   * Parse drag data from DataTransfer object
   *
   * Extracts and validates JSON data from the DataTransfer.
   * Returns null if data is invalid or missing.
   *
   * @param dataTransfer - DataTransfer object from drag event
   * @returns Parsed drag data or null if invalid
   */
  const parseDragData = (dataTransfer: DataTransfer): DragDataPayload | null => {
    try {
      const jsonData = dataTransfer.getData('application/json')
      if (!jsonData) {
        log('No JSON data found in DataTransfer')
        return null
      }

      const data = JSON.parse(jsonData) as DragDataPayload
      log('Parsed drag data', data)

      // Validate required fields
      if (!data.id || !data.content || !data.content.text) {
        log('Invalid drag data structure', data)
        return null
      }

      return data
    } catch (error) {
      console.error('[useDragDrop] Failed to parse drag data:', error)
      return null
    }
  }

  /**
   * Create Fabric.js Textbox from drag data
   *
   * Constructs a new Textbox object with all formatting preserved
   * from the saved text in the library.
   *
   * @param data - Drag data payload with text content and styling
   * @param position - Drop position { x, y } in canvas pixels
   * @param width - Optional width override (default: defaultTextWidth)
   * @returns Configured fabric.Textbox ready to add to canvas
   */
  const createTextboxFromDragData = (
    data: DragDataPayload,
    position: { x: number; y: number },
    width: number = defaultTextWidth
  ): fabric.Textbox => {
    const textbox = new fabric.Textbox(data.content.text, {
      left: position.x,
      top: position.y,
      width,
      fontFamily: data.content.fontFamily,
      fontSize: data.content.fontSize,
      fill: data.content.fill || '#000000',
      textAlign: data.content.textAlign || 'left',
      fontWeight: data.content.fontWeight || 'normal',
      fontStyle: data.content.fontStyle || 'normal',
      underline: data.content.underline || false,
      lineHeight: data.content.lineHeight || 1.2
    })

    // Add metadata for element tracking
    textbox.data = {
      elementId: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceLibraryId: data.id,
      sourceLabel: data.label,
      sourceType: data.type,
      createdAt: new Date().toISOString()
    }

    log('Created textbox from drag data', {
      elementId: textbox.data.elementId,
      position,
      text: data.content.text.substring(0, 50) + '...'
    })

    return textbox
  }

  // ========================================
  // DRAG-AND-DROP HANDLERS
  // ========================================

  /**
   * Handle drag start event
   *
   * Called when user starts dragging a text item from TextLibrary.
   * Stores text data in DataTransfer and creates custom drag image.
   *
   * @param text - Saved text being dragged
   * @param event - Native drag event
   */
  const handleDragStart = (text: ISavedText, event: DragEvent): void => {
    if (!event.dataTransfer) return

    log('Drag started', { id: text.id, label: text.label })

    // Set drag effect
    event.dataTransfer.effectAllowed = dropEffect

    // Store text data as JSON
    const dragData: DragDataPayload = {
      id: text.id,
      label: text.label,
      type: text.type,
      content: text.content
    }
    event.dataTransfer.setData('application/json', JSON.stringify(dragData))

    // Create custom drag image for better UX
    const dragImage = document.createElement('div')
    dragImage.textContent = text.label
    dragImage.style.cssText = `
      padding: 8px 12px;
      background: #1976d2;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      position: absolute;
      left: -10000px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    `
    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, 0, 0)

    // Clean up drag image after a short delay
    setTimeout(() => dragImage.remove(), 0)
  }

  /**
   * Handle drag over event
   *
   * Called when dragging over the canvas drop zone.
   * Prevents default to allow dropping and shows visual feedback.
   *
   * @param event - Native drag event
   */
  const handleDragOver = (event: DragEvent): void => {
    event.preventDefault()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dropEffect
    }

    // Set dragging state for visual feedback
    if (!isDraggingOver.value) {
      isDraggingOver.value = true
      log('Drag entered drop zone')
    }
  }

  /**
   * Handle drag leave event
   *
   * Called when dragging leaves the canvas drop zone.
   * Removes visual feedback.
   *
   * @param event - Native drag event
   */
  const handleDragLeave = (event: DragEvent): void => {
    event.preventDefault()

    // Only clear if actually leaving (not entering child element)
    const relatedTarget = event.relatedTarget as HTMLElement
    if (!relatedTarget || !event.currentTarget) {
      isDraggingOver.value = false
      log('Drag left drop zone')
    }
  }

  /**
   * Handle drop event
   *
   * Called when user drops text onto the canvas.
   * Creates new Fabric.js Textbox at drop coordinates.
   *
   * @param event - Native drag event
   * @param canvas - Fabric canvas instance to add text to
   * @param onSuccess - Optional callback when text is successfully added
   */
  const handleDrop = async (
    event: DragEvent,
    canvas: fabric.Canvas | null,
    onSuccess?: (textbox: fabric.Textbox) => void
  ): Promise<void> => {
    event.preventDefault()
    isDraggingOver.value = false

    if (!canvas) {
      console.error('[useDragDrop] Cannot drop: canvas is null')
      return
    }

    if (!event.dataTransfer) {
      console.error('[useDragDrop] Cannot drop: no dataTransfer')
      return
    }

    log('Drop event triggered')

    // Parse drag data
    const dragData = parseDragData(event.dataTransfer)
    if (!dragData) {
      console.error('[useDragDrop] Invalid or missing drag data')
      return
    }

    try {
      // Get drop coordinates relative to canvas
      const canvasElement = event.target as HTMLElement
      const canvasRect = canvasElement.getBoundingClientRect()
      const dropX = event.clientX - canvasRect.left
      const dropY = event.clientY - canvasRect.top

      log('Drop coordinates', { x: dropX, y: dropY })

      // Create textbox from drag data
      const textbox = createTextboxFromDragData(dragData, { x: dropX, y: dropY })

      // Add to canvas
      canvas.add(textbox)
      canvas.setActiveObject(textbox)
      canvas.requestRenderAll()

      log('Textbox added to canvas', { elementId: textbox.data?.elementId })

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(textbox)
      }

      // Show success message
      window.$message?.success(`"${dragData.label}" ajouté au canvas`)
    } catch (error) {
      console.error('[useDragDrop] Failed to handle drop:', error)
      window.$message?.error('Erreur lors de l\'ajout du texte')
    }
  }

  // ========================================
  // RETURN INTERFACE
  // ========================================

  return {
    isDraggingOver,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    parseDragData,
    createTextboxFromDragData
  }
}
