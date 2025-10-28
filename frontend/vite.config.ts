import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * Configuration Vite pour l'application Ithaka
 *
 * Vite est un outil de build moderne qui offre :
 * - Un serveur de développement ultra-rapide avec Hot Module Replacement (HMR)
 * - Un build optimisé pour la production avec Rollup
 *
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  // Plugin Vue.js : permet à Vite de compiler les fichiers .vue
  plugins: [vue()],

  // Configuration des alias de chemin
  // Permet d'utiliser @ pour référencer le dossier src/
  // Exemple : import MyComponent from '@/components/MyComponent.vue'
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  // Configuration du serveur de développement
  server: {
    port: 3001, // Port du serveur de développement (le backend utilise 3000)
    host: true, // Écoute sur toutes les interfaces réseau (0.0.0.0)
    strictPort: true, // Échoue si le port est déjà utilisé
    open: false // N'ouvre pas automatiquement le navigateur
  },

  // Configuration du build de production
  build: {
    outDir: 'dist', // Dossier de sortie pour les fichiers compilés
    sourcemap: false, // Pas de source maps en production (pour la sécurité)
    // Optimisation de la taille des chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Sépare les dépendances volumineuses dans des chunks dédiés
          // Cela améliore le cache du navigateur
          'naive-ui': ['naive-ui'],
          'vue-vendor': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  },

  // Configuration pour les tests Vitest
  test: {
    globals: true, // Utilise les fonctions de test globales (describe, it, expect)
    environment: 'jsdom', // Simule un environnement de navigateur pour les tests
    setupFiles: [], // Fichiers de setup pour les tests (à créer si nécessaire)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
