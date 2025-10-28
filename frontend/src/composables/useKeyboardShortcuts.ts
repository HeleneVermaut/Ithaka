/**
 * Composable: useKeyboardShortcuts
 *
 * Gère tous les raccourcis clavier pour l'éditeur de page.
 * Supporte les raccourcis multi-plateformes (Ctrl sur Windows/Linux, Cmd sur Mac).
 *
 * Raccourcis supportés:
 * - Ctrl+C: Copier l'élément sélectionné
 * - Ctrl+V: Coller depuis le clipboard
 * - Ctrl+Z: Annuler (undo)
 * - Ctrl+Y / Ctrl+Shift+Z: Refaire (redo)
 * - Delete / Backspace: Supprimer l'élément sélectionné
 * - Ctrl+S: Forcer la sauvegarde
 * - Ctrl+]: Avancer d'un plan (bring forward)
 * - Ctrl+[: Reculer d'un plan (send backward)
 * - Ctrl+Shift+]: Premier plan (bring to front)
 * - Ctrl+Shift+[: Arrière-plan (send to back)
 * - Escape: Désélectionner
 *
 * @module composables/useKeyboardShortcuts
 */

import { onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { usePagesStore } from '@/stores/pages'

/**
 * Callback type pour afficher le modal de suppression
 */
export type ShowDeleteModalCallback = (show: boolean) => void

/**
 * Options pour keyboard shortcuts
 */
export interface KeyboardShortcutsOptions {
  /** Callback for forced save (Ctrl+S) */
  forceSave?: () => void | Promise<void>
}

/**
 * Vérifie si l'élément cible est un input/textarea
 * pour éviter d'intercepter les raccourcis de saisie
 */
function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toUpperCase()
  const isContentEditable = target.contentEditable === 'true'

  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    isContentEditable
  )
}

/**
 * Détecte si on est sur macOS pour utiliser Cmd au lieu de Ctrl
 */
function isMacOS(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

/**
 * Composable pour gérer les raccourcis clavier
 *
 * @param showDeleteModal - Callback pour afficher le modal de suppression
 * @param options - Additional options for keyboard shortcuts (forceSave callback, etc.)
 *
 * @example
 * ```typescript
 * // Dans PageEditor.vue
 * const showDeleteModal = ref(false)
 * useKeyboardShortcuts((show: boolean) => {
 *   showDeleteModal.value = show
 * }, {
 *   forceSave: async () => {
 *     await autoSave.forceSave(elements)
 *     message.info('Sauvegarde forcée effectuée')
 *   }
 * })
 * ```
 */
export function useKeyboardShortcuts(
  showDeleteModal: ShowDeleteModalCallback,
  options: KeyboardShortcutsOptions = {}
): void {
  const editorStore = useEditorStore()
  const pagesStore = usePagesStore()
  const isMac = isMacOS()

  /**
   * Gestionnaire d'événement keydown
   * Intercepte les raccourcis clavier et exécute les actions correspondantes
   */
  function handleKeyDown(e: KeyboardEvent): void {
    const target = e.target
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey

    // Si on est dans un input/textarea, autoriser seulement Escape et Ctrl+S
    if (isEditableElement(target)) {
      if (e.key !== 'Escape' && !(ctrlKey && e.key === 's')) {
        return
      }
    }

    // ============================================
    // RACCOURCIS PRESSE-PAPIER (Ctrl+C, Ctrl+V)
    // ============================================

    // Ctrl+C: Copier l'élément sélectionné
    if (ctrlKey && e.key === 'c' && !e.shiftKey && editorStore.selectedElement) {
      e.preventDefault()
      editorStore.copyToClipboard()
      window.$message?.success('Élément copié dans le presse-papier')
      return
    }

    // Ctrl+V: Coller depuis le clipboard
    if (ctrlKey && e.key === 'v' && !e.shiftKey && editorStore.clipboard) {
      e.preventDefault()
      editorStore.pasteFromClipboard()
      return
    }

    // ============================================
    // HISTORIQUE (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
    // ============================================

    // Ctrl+Z: Annuler (undo)
    if (ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      if (editorStore.canUndo) {
        editorStore.undo()
        window.$message?.info('Action annulée')
      } else {
        window.$message?.warning('Aucune action à annuler')
      }
      return
    }

    // Ctrl+Y ou Ctrl+Shift+Z: Refaire (redo)
    if ((ctrlKey && e.key === 'y') || (ctrlKey && e.shiftKey && e.key === 'z')) {
      e.preventDefault()
      if (editorStore.canRedo) {
        editorStore.redo()
        window.$message?.info('Action rétablie')
      } else {
        window.$message?.warning('Aucune action à rétablir')
      }
      return
    }

    // ============================================
    // SUPPRESSION (Delete, Backspace)
    // ============================================

    // Delete ou Backspace: Supprimer l'élément sélectionné
    if ((e.key === 'Delete' || e.key === 'Backspace') && editorStore.selectedElement) {
      e.preventDefault()
      showDeleteModal(true)
      return
    }

    // ============================================
    // SAUVEGARDE (Ctrl+S)
    // ============================================

    // Ctrl+S: Forcer la sauvegarde
    if (ctrlKey && e.key === 's') {
      e.preventDefault()

      if (options.forceSave) {
        // Use custom force save callback (typically from auto-save composable)
        const result = options.forceSave()

        if (result instanceof Promise) {
          result
            .then(() => {
              window.$message?.success('Sauvegarde forcée effectuée')
            })
            .catch((err) => {
              console.error('Force save failed:', err)
              window.$message?.error('Erreur lors de la sauvegarde')
            })
        } else {
          window.$message?.success('Sauvegarde forcée en cours...')
        }
      } else {
        // Fallback to store save method
        pagesStore.saveElements()
        window.$message?.info('Sauvegarde en cours...')
      }
      return
    }

    // ============================================
    // Z-INDEX (Ctrl+], Ctrl+[, Ctrl+Shift+], Ctrl+Shift+[)
    // ============================================

    // Ctrl+]: Avancer d'un plan (bring forward)
    if (ctrlKey && e.key === ']' && !e.shiftKey && editorStore.selectedElement) {
      e.preventDefault()
      editorStore.bringForward()
      return
    }

    // Ctrl+[: Reculer d'un plan (send backward)
    if (ctrlKey && e.key === '[' && !e.shiftKey && editorStore.selectedElement) {
      e.preventDefault()
      editorStore.sendBackward()
      return
    }

    // Ctrl+Shift+]: Premier plan (bring to front)
    if (ctrlKey && e.shiftKey && e.key === ']' && editorStore.selectedElement) {
      e.preventDefault()
      editorStore.bringToFront()
      return
    }

    // Ctrl+Shift+[: Arrière-plan (send to back)
    if (ctrlKey && e.shiftKey && e.key === '[' && editorStore.selectedElement) {
      e.preventDefault()
      editorStore.sendToBack()
      return
    }

    // ============================================
    // DÉSÉLECTION (Escape)
    // ============================================

    // Escape: Désélectionner l'élément actif
    if (e.key === 'Escape') {
      editorStore.deselectElement()
      return
    }
  }

  /**
   * Enregistrer le listener au montage du composant
   */
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    console.log('Keyboard shortcuts registered')
  })

  /**
   * Nettoyer le listener au démontage du composant
   */
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    console.log('Keyboard shortcuts unregistered')
  })
}
