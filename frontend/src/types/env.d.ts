/**
 * Déclarations de types pour les variables d'environnement Vite
 *
 * Ce fichier permet à TypeScript de connaître les types des variables
 * d'environnement disponibles dans import.meta.env
 *
 * Toutes les variables d'environnement Vite doivent commencer par VITE_
 * pour être exposées au code client (pour des raisons de sécurité)
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API backend (ex: http://localhost:3000/api) - Must include /api prefix */
  readonly VITE_API_BASE_URL: string

  /** Environnement d'exécution (development | production | test) */
  readonly VITE_APP_ENV: string

  /** Titre de l'application affiché dans le navigateur */
  readonly VITE_APP_TITLE: string

  /** Mode debug pour afficher des logs supplémentaires */
  readonly VITE_DEBUG_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
