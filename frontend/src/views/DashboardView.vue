<!--
  Vue du tableau de bord (Dashboard)

  Page principale accessible après connexion.
  Affiche les carnets de voyage de l'utilisateur et permet d'en créer de nouveaux.
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NH1, NP, NCard, NSpace, useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

// Instances
const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

// Récupération de l'utilisateur connecté
const currentUser = computed(() => authStore.user)

/**
 * Déconnexion de l'utilisateur
 *
 * Appelle le store auth pour déconnecter l'utilisateur
 * et redirige vers la page d'accueil
 */
const handleLogout = (): void => {
  authStore.logout()
  message.info('Vous êtes maintenant déconnecté')
  router.push({ name: 'Home' })
}

/**
 * Export user data (GDPR Article 20 - Right to data portability)
 *
 * Télécharge toutes les données utilisateur dans un fichier JSON
 */
const handleExportData = async (): Promise<void> => {
  try {
    await authStore.exportData()
    message.success('Vos données ont été exportées avec succès')
  } catch (error) {
    message.error('Erreur lors de l\'export des données')
    console.error('Export error:', error)
  }
}
</script>

<template>
  <div class="dashboard">
    <!-- En-tête du dashboard -->
    <header class="dashboard__header">
      <div class="container">
        <div class="dashboard__header-content">
          <div>
            <n-h1 class="dashboard__title">Tableau de bord</n-h1>
            <n-p class="dashboard__subtitle">
              Bienvenue, {{ currentUser?.firstName }} {{ currentUser?.lastName }} !
            </n-p>
          </div>
          <n-button @click="handleLogout" size="large">
            Déconnexion
          </n-button>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="dashboard__main">
      <div class="container">
        <n-card class="dashboard__card">
          <n-h1>Vos carnets de voyage</n-h1>
          <n-p>Gérez tous vos carnets de voyage depuis un seul endroit.</n-p>

          <n-space class="dashboard__actions" justify="center">
            <n-button
              type="primary"
              size="large"
              @click="router.push({ name: 'MyNotebooks' })"
            >
              Voir mes carnets
            </n-button>

            <n-button
              type="default"
              size="large"
              @click="handleExportData"
              :loading="authStore.loading"
            >
              Exporter mes données (GDPR)
            </n-button>
          </n-space>
        </n-card>
      </div>
    </main>
  </div>
</template>

<style scoped>
/**
 * Styles du tableau de bord
 * Structure BEM (Block Element Modifier)
 */

.dashboard {
  min-height: 100vh;
  background-color: var(--color-bg-secondary);
}

.dashboard__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: var(--spacing-2xl) 0;
  box-shadow: var(--shadow-md);
}

.dashboard__header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.dashboard__title {
  color: white;
  margin-bottom: var(--spacing-sm);
}

.dashboard__subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.125rem;
  margin-bottom: 0;
}

.dashboard__main {
  padding: var(--spacing-2xl) 0;
}

.dashboard__card {
  margin-bottom: var(--spacing-xl);
}

.dashboard__actions {
  margin-top: var(--spacing-xl);
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard__header {
    padding: var(--spacing-lg) 0;
  }

  .dashboard__header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard__main {
    padding: var(--spacing-lg) 0;
  }
}
</style>
