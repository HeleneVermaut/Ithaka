/**
 * Global type declarations for Ithaka frontend
 *
 * Déclare les types globaux disponibles dans window ou globalThis
 */

import type { MessageApi } from 'naive-ui'

/**
 * Extend window interface with NaiveUI message API
 *
 * Permet d'utiliser window.$message pour afficher des toasts
 * sans avoir à importer useMessage dans chaque composant
 */
declare global {
  interface Window {
    /**
     * NaiveUI message API for toast notifications
     *
     * @example
     * ```typescript
     * window.$message?.success('Opération réussie')
     * window.$message?.error('Une erreur est survenue')
     * window.$message?.warning('Attention')
     * window.$message?.info('Information')
     * ```
     */
    $message?: MessageApi
  }
}

export {}
