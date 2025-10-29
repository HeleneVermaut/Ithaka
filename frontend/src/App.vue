<!--
  Composant racine de l'application Ithaka

  Ce composant est le point d'entrée de toute l'interface utilisateur.
  Il contient :
  - Le RouterView pour afficher les pages en fonction de l'URL
  - La structure globale (header, footer si besoin)
  - Les configurations NaiveUI (thème, message provider, etc.)

  Tous les autres composants sont des enfants de App.vue
-->

<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  lightTheme,
  type GlobalThemeOverrides
} from 'naive-ui'
import { useAuthStore } from './stores/auth'
import { useSessionTimeout } from './composables/useSessionTimeout'

/**
 * Configuration du thème de l'application
 *
 * Pour l'instant on utilise le thème clair par défaut.
 * On pourra ajouter un système de switch dark/light mode plus tard.
 */
const theme = computed(() => lightTheme)

/**
 * Personnalisation du thème NaiveUI
 *
 * Ces overrides permettent de customiser les couleurs, espacements,
 * et autres propriétés visuelles des composants NaiveUI.
 *
 * Couleurs principales de l'application Ithaka (à adapter selon la charte graphique)
 */
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#3B82F6', // Bleu principal
    primaryColorHover: '#2563EB', // Bleu hover
    primaryColorPressed: '#1D4ED8', // Bleu pressed
    successColor: '#10B981', // Vert succès
    warningColor: '#F59E0B', // Orange warning
    errorColor: '#EF4444', // Rouge erreur
    infoColor: '#3B82F6' // Bleu info
  }
}

/**
 * Session timeout management
 *
 * Tracks user session and displays warning before expiration.
 * Auto-logs out user if session expires.
 */
const authStore = useAuthStore()
const { startSessionTimeout, stopSessionTimeout } = useSessionTimeout()

// Watch authentication state to manage session timeout
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      // User just logged in - start session timeout
      startSessionTimeout()
    } else {
      // User logged out - stop session timeout
      stopSessionTimeout()
    }
  }
)
</script>

<template>
  <!--
    NConfigProvider : Fournit la configuration du thème à tous les composants NaiveUI
    NMessageProvider : Permet d'afficher des messages toast (notifications)
    NDialogProvider : Permet d'afficher des modales/dialogues
    NNotificationProvider : Permet d'afficher des notifications persistantes
  -->
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <!-- Conteneur principal de l'application -->
          <div id="app" class="app">
            <!--
              RouterView : Affiche le composant correspondant à la route actuelle
              C'est ici que seront montés tous les composants de pages (views)
            -->
            <router-view />
          </div>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
/**
 * Styles du composant App
 *
 * Le conteneur principal prend toute la hauteur et largeur de la fenêtre
 * et utilise flexbox pour la disposition des éléments enfants
 */
.app {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>
