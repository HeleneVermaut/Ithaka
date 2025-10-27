<!--
  Vue de la page d'accueil de l'application Ithaka

  Cette page est la première page visible par les visiteurs.
  Elle présente l'application et propose de se connecter ou s'inscrire.
-->

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton, NH1, NP, NSpace } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'

// Accès au routeur pour la navigation
const router = useRouter()
const authStore = useAuthStore()

// Détermine si l'utilisateur est connecté
const isAuthenticated = computed(() => authStore.isAuthenticated)

/**
 * Redirige vers la page de connexion
 */
const goToLogin = (): void => {
  router.push({ name: 'Login' })
}

/**
 * Redirige vers la page d'inscription
 */
const goToRegister = (): void => {
  router.push({ name: 'Register' })
}

/**
 * Redirige vers le dashboard
 */
const goToDashboard = (): void => {
  router.push({ name: 'Dashboard' })
}
</script>

<template>
  <div class="home">
    <div class="home__container">
      <div class="home__content">
        <!-- Titre principal -->
        <n-h1 class="home__title">
          Bienvenue sur Ithaka
        </n-h1>

        <!-- Description -->
        <n-p class="home__description">
          Créez et partagez vos carnets de voyage avec une expérience d'édition moderne.
          Capturez vos souvenirs, ajoutez des photos et exportez vos aventures en PDF.
        </n-p>

        <!-- Boutons d'action -->
        <n-space class="home__actions" justify="center" size="large">
          <template v-if="!isAuthenticated">
            <n-button type="primary" size="large" @click="goToRegister">
              Commencer gratuitement
            </n-button>
            <n-button size="large" @click="goToLogin">
              Se connecter
            </n-button>
          </template>
          <template v-else>
            <n-button type="primary" size="large" @click="goToDashboard">
              Accéder au tableau de bord
            </n-button>
          </template>
        </n-space>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * Styles de la page d'accueil
 * Structure BEM (Block Element Modifier)
 */

.home {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.home__container {
  max-width: 800px;
  padding: var(--spacing-2xl);
}

.home__content {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-xl);
  text-align: center;
}

.home__title {
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
}

.home__description {
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
  line-height: 1.8;
}

.home__actions {
  margin-top: var(--spacing-xl);
}

/* Responsive */
@media (max-width: 768px) {
  .home__title {
    font-size: 2rem;
  }

  .home__description {
    font-size: 1rem;
  }

  .home__container {
    padding: var(--spacing-md);
  }

  .home__content {
    padding: var(--spacing-lg);
  }
}
</style>
