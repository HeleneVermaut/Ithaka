<!--
  Vue de la page d'inscription

  Permet aux nouveaux utilisateurs de créer un compte
  avec email, username et mot de passe.
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
  username: '',
  password: '',
  confirmPassword: ''
})

// État de chargement pendant la soumission
const isSubmitting = ref(false)

/**
 * Soumet le formulaire d'inscription
 *
 * Appelle le store auth pour créer un nouveau compte.
 * En cas de succès, redirige vers le dashboard.
 * En cas d'erreur, affiche un message d'erreur.
 */
const handleSubmit = async (): Promise<void> => {
  // Vérification que les mots de passe correspondent
  if (formData.value.password !== formData.value.confirmPassword) {
    message.error('Les mots de passe ne correspondent pas')
    return
  }

  isSubmitting.value = true

  try {
    await authStore.register({
      email: formData.value.email,
      username: formData.value.username,
      password: formData.value.password
    })

    // Succès : afficher un message et rediriger
    message.success('Compte créé avec succès ! Bienvenue.')
    router.push({ name: 'Dashboard' })
  } catch (error) {
    // Erreur : afficher un message d'erreur
    message.error('Erreur lors de l\'inscription. Vérifiez vos informations.')
    console.error('Registration error:', error)
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Redirige vers la page de connexion
 */
const goToLogin = (): void => {
  router.push({ name: 'Login' })
}

/**
 * Vérifie si le formulaire est valide (basique)
 * TODO: Ajouter Vuelidate pour une validation plus robuste
 */
const isFormValid = computed(() => {
  return (
    formData.value.email.length > 0 &&
    formData.value.username.length > 0 &&
    formData.value.password.length >= 6 &&
    formData.value.confirmPassword.length >= 6
  )
})
</script>

<template>
  <div class="register">
    <div class="register__container">
      <n-card class="register__card">
        <!-- Titre -->
        <n-h2 class="register__title">Inscription</n-h2>
        <n-p class="register__subtitle">
          Créez votre compte Ithaka gratuitement
        </n-p>

        <!-- Formulaire -->
        <n-form class="register__form" @submit.prevent="handleSubmit">
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

          <!-- Champ Username -->
          <n-form-item label="Nom d'utilisateur" required>
            <n-input
              v-model:value="formData.username"
              type="text"
              placeholder="Votre nom d'utilisateur"
              size="large"
              :disabled="isSubmitting"
            />
          </n-form-item>

          <!-- Champ Mot de passe -->
          <n-form-item label="Mot de passe" required>
            <n-input
              v-model:value="formData.password"
              type="password"
              placeholder="Au moins 6 caractères"
              size="large"
              show-password-on="click"
              :disabled="isSubmitting"
            />
          </n-form-item>

          <!-- Champ Confirmation du mot de passe -->
          <n-form-item label="Confirmer le mot de passe" required>
            <n-input
              v-model:value="formData.confirmPassword"
              type="password"
              placeholder="Retapez votre mot de passe"
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
            S'inscrire
          </n-button>
        </n-form>

        <!-- Lien vers la connexion -->
        <div class="register__footer">
          <n-p class="register__login-link">
            Déjà un compte ?
            <a @click="goToLogin" class="register__link">Se connecter</a>
          </n-p>
        </div>
      </n-card>
    </div>
  </div>
</template>

<style scoped>
/**
 * Styles de la page d'inscription
 * Structure BEM (Block Element Modifier)
 */

.register {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: var(--spacing-md);
}

.register__container {
  width: 100%;
  max-width: 500px;
}

.register__card {
  padding: var(--spacing-xl);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
}

.register__title {
  text-align: center;
  margin-bottom: var(--spacing-sm);
}

.register__subtitle {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.register__form {
  margin-bottom: var(--spacing-lg);
}

.register__footer {
  text-align: center;
  margin-top: var(--spacing-lg);
}

.register__login-link {
  color: var(--color-text-secondary);
  margin-bottom: 0;
}

.register__link {
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 600;
  transition: color var(--transition-fast);
}

.register__link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 768px) {
  .register__card {
    padding: var(--spacing-lg);
  }
}
</style>
