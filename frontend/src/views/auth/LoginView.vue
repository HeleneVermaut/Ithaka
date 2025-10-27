<!--
  Vue de la page de connexion

  Permet aux utilisateurs de se connecter avec leur email et mot de passe.
  Utilise Vuelidate pour la validation du formulaire.
-->

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, NH2, NP, NCard, useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

// Instances pour la navigation et les notifications
const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

// État du formulaire
const formData = ref({
  email: '',
  password: ''
})

// État de chargement pendant la soumission
const isSubmitting = ref(false)

/**
 * Soumet le formulaire de connexion
 *
 * Appelle le store auth pour authentifier l'utilisateur.
 * En cas de succès, redirige vers le dashboard.
 * En cas d'erreur, affiche un message d'erreur.
 */
const handleSubmit = async (): Promise<void> => {
  isSubmitting.value = true

  try {
    await authStore.login({
      email: formData.value.email,
      password: formData.value.password
    })

    // Succès : afficher un message et rediriger
    message.success('Connexion réussie ! Bienvenue.')

    // Redirection vers le dashboard ou la page demandée
    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || { name: 'Dashboard' })
  } catch (error) {
    // Erreur : afficher un message d'erreur
    message.error('Email ou mot de passe incorrect')
    console.error('Login error:', error)
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Redirige vers la page d'inscription
 */
const goToRegister = (): void => {
  router.push({ name: 'Register' })
}

/**
 * Vérifie si le formulaire est valide (basique)
 * TODO: Ajouter Vuelidate pour une validation plus robuste
 */
const isFormValid = computed(() => {
  return formData.value.email.length > 0 && formData.value.password.length > 0
})
</script>

<template>
  <div class="login">
    <div class="login__container">
      <n-card class="login__card">
        <!-- Titre -->
        <n-h2 class="login__title">Connexion</n-h2>
        <n-p class="login__subtitle">
          Connectez-vous à votre compte Ithaka
        </n-p>

        <!-- Formulaire -->
        <n-form class="login__form" @submit.prevent="handleSubmit">
          <!-- Champ Email -->
          <n-form-item label="Email" required>
            <n-input
              v-model:value="formData.email"
              type="text"
              placeholder="votre.email@exemple.com"
              size="large"
              :disabled="isSubmitting"
            />
          </n-form-item>

          <!-- Champ Mot de passe -->
          <n-form-item label="Mot de passe" required>
            <n-input
              v-model:value="formData.password"
              type="password"
              placeholder="Votre mot de passe"
              size="large"
              show-password-on="click"
              :disabled="isSubmitting"
            />
          </n-form-item>

          <!-- Bouton de soumission -->
          <n-button
            type="primary"
            size="large"
            block
            :loading="isSubmitting"
            :disabled="!isFormValid"
            attr-type="submit"
          >
            Se connecter
          </n-button>
        </n-form>

        <!-- Lien vers l'inscription -->
        <div class="login__footer">
          <n-p class="login__register-link">
            Pas encore de compte ?
            <a @click="goToRegister" class="login__link">S'inscrire</a>
          </n-p>
        </div>
      </n-card>
    </div>
  </div>
</template>

<style scoped>
/**
 * Styles de la page de connexion
 * Structure BEM (Block Element Modifier)
 */

.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: var(--spacing-md);
}

.login__container {
  width: 100%;
  max-width: 450px;
}

.login__card {
  padding: var(--spacing-xl);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
}

.login__title {
  text-align: center;
  margin-bottom: var(--spacing-sm);
}

.login__subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.login__form {
  margin-bottom: var(--spacing-lg);
}

.login__footer {
  text-align: center;
  margin-top: var(--spacing-lg);
}

.login__register-link {
  color: var(--color-text-secondary);
  margin-bottom: 0;
}

.login__link {
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 600;
  transition: color var(--transition-fast);
}

.login__link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 768px) {
  .login__card {
    padding: var(--spacing-lg);
  }
}
</style>
