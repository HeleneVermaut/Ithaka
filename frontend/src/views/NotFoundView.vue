<!--
  Vue de la page 404 (Not Found)

  Affichée quand l'utilisateur accède à une URL qui n'existe pas
-->

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton, NResult } from 'naive-ui'

// Instance du routeur pour la navigation
const router = useRouter()

/**
 * Redirige vers la page d'accueil
 */
const goToHome = (): void => {
  router.push({ name: 'Home' })
}
</script>

<template>
  <div class="not-found">
    <div class="not-found__container">
      <n-result
        status="404"
        title="Page non trouvée"
        description="La page que vous recherchez n'existe pas ou a été déplacée."
      >
        <template #footer>
          <n-button type="primary" size="large" @click="goToHome">
            Retour à l'accueil
          </n-button>
        </template>
      </n-result>
    </div>
  </div>
</template>

<style scoped>
/**
 * Styles de la page 404
 * Structure BEM (Block Element Modifier)
 */

.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-secondary);
}

.not-found__container {
  width: 100%;
  max-width: 600px;
  padding: var(--spacing-xl);
  text-align: center;
}
</style>
