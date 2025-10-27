# Rapport d'implémentation - US01: Gestion de compte et authentification (Frontend)

## Statut: Partiellement implémenté (Phase 1 et 2 complétées)

Date: 27 octobre 2025
Agent IA: Claude Code
Projet: Ithaka - Carnets de voyage

---

## Résumé exécutif

L'architecture core (types, services, store Pinia, validation) de l'US01 a été complètement implémentée selon les spécifications du PRP. Les composants PhotoUpload et les règles de validation Vuelidate sont également créés.

**Il reste à implémenter** : Les composants de formulaires (LoginForm, RegisterForm, etc.), les views, la configuration complète du Router, et l'intégration NaiveUI dans App.vue et main.ts.

---

## Fichiers créés et modifiés

### Phase 1 - Architecture Core (TERMINÉE)

#### 1. Types TypeScript - `src/types/models.ts`
**Statut**: Créé et complet

**Contenu**:
- Interface `User` complète avec tous les champs selon PRP:
  - `id`, `email`, `firstName`, `lastName`
  - `pseudo?`, `bio?`, `avatarBase64?`
  - `isEmailVerified?`, `lastLoginAt?`, `createdAt`, `updatedAt`

- Interfaces d'authentification:
  - `LoginData` (email, password)
  - `RegisterData` (email, password, confirmPassword, firstName, lastName, pseudo?, bio?, avatarBase64?)
  - `UpdateProfileData` (tous les champs modifiables)
  - `UpdatePasswordData` (oldPassword, newPassword, confirmPassword)
  - `ForgotPasswordData` (email)
  - `ResetPasswordData` (token, email, newPassword, confirmPassword)

- Interfaces de réponses API:
  - `AuthResponse` (success, message, user)
  - `ApiSuccessResponse` (success, message)
  - `UpdateProfileResponse` (success, message, user)
  - `VerifyResetTokenResponse` (success, message, canResetPassword)
  - `ApiError` (message, statusCode, details?, errors?)
  - `CheckEmailUniqueResponse` (isUnique)
  - `CheckPseudoUniqueResponse` (isUnique)

- Types utilitaires:
  - `NotificationType` ('success' | 'error' | 'warning' | 'info')
  - `ToastNotification` (type, title?, message, duration?)
  - `PasswordStrength` ('weak' | 'medium' | 'strong' | 'very-strong')
  - `PasswordStrengthResult` (strength, score, suggestions)

#### 2. Service API - `src/services/authService.ts`
**Statut**: Créé et complet

**Méthodes implémentées**:
- `register(userData: RegisterData)` - POST /api/auth/register
- `login(credentials: LoginData)` - POST /api/auth/login
- `logout()` - POST /api/auth/logout
- `getProfile()` - GET /api/users/profile
- `updateProfile(profileData: UpdateProfileData)` - PUT /api/users/profile
- `updatePassword(passwordData: UpdatePasswordData)` - PUT /api/users/password
- `forgotPassword(forgotData: ForgotPasswordData)` - POST /api/auth/forgot-password
- `verifyResetToken(token: string, email: string)` - GET /api/auth/verify-reset-token
- `resetPassword(resetData: ResetPasswordData)` - POST /api/auth/reset-password
- `checkEmailUnique(email: string)` - GET /api/auth/check-email
- `checkPseudoUnique(pseudo: string)` - GET /api/auth/check-pseudo

**Caractéristiques**:
- Tous les endpoints utilisent `withCredentials: true` pour les cookies httpOnly
- Documentation JSDoc complète pour chaque méthode
- Gestion des erreurs avec propagation aux appelants
- Commentaires explicatifs pour les débutants

#### 3. Configuration API - `src/services/api.ts`
**Statut**: Modifié

**Changements**:
- Ajout `withCredentials: true` dans la config Axios pour activer les cookies httpOnly
- Suppression de la logique localStorage (les tokens sont maintenant en cookies)
- Intercepteur de requête simplifié (plus de header Authorization manuel)
- Intercepteur de réponse mis à jour pour ne plus supprimer les tokens du localStorage

**Configuration**:
```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  withCredentials: true // IMPORTANT: Cookies httpOnly
})
```

#### 4. Store Pinia - `src/stores/auth.ts`
**Statut**: Réécrit complètement

**State**:
- `user: ref<User | null>(null)` - Utilisateur connecté
- `loading: ref<boolean>(false)` - Indicateur de chargement
- `error: ref<string | null>(null)` - Message d'erreur

**Getters**:
- `isAuthenticated: computed<boolean>` - true si user !== null

**Actions**:
- `register(userData: RegisterData)` - Inscription
- `login(credentials: LoginData)` - Connexion
- `logout()` - Déconnexion
- `fetchProfile()` - Récupération profil (pour restoreSession)
- `updateProfile(profileData: UpdateProfileData)` - Mise à jour profil
- `updatePassword(passwordData: UpdatePasswordData)` - Changement password
- `forgotPassword(forgotData: ForgotPasswordData)` - Demande réinitialisation
- `resetPassword(resetData: ResetPasswordData)` - Réinitialisation password
- `checkEmailUnique(email: string)` - Validation async email
- `checkPseudoUnique(pseudo: string)` - Validation async pseudo

**Caractéristiques**:
- Toutes les actions gèrent loading et error
- Toutes les erreurs sont propagées (throw) après être stockées
- Documentation JSDoc complète avec exemples
- Compatible cookies httpOnly (pas de gestion localStorage)

#### 5. Composable Validation - `src/composables/useValidation.ts`
**Statut**: Créé et complet

**Validators custom**:
- `isEmailUnique` - Validation async de l'unicité de l'email
- `isPseudoUnique` - Validation async de l'unicité du pseudo
- `hasUppercase` - Vérifie présence majuscule
- `hasNumber` - Vérifie présence chiffre
- `hasSpecialChar` - Vérifie présence caractère spécial
- `isAlphanumericWithUnderscore` - Format pseudo valide

**Règles de validation**:
- `emailRules(checkUnique: boolean)` - Email (required, format, unicité optionnelle)
- `passwordRules` - Password (required, minLength 8, majuscule, chiffre, spécial)
- `confirmPasswordRules(passwordFieldName)` - Confirmation password (required, sameAs)
- `firstNameRules` - Prénom (required, minLength 2, maxLength 50)
- `lastNameRules` - Nom (required, minLength 2, maxLength 50)
- `pseudoRules(checkUnique: boolean)` - Pseudo (minLength 3, maxLength 20, alphanumeric, unicité optionnelle)
- `bioRules` - Bio (maxLength 160)

**Fonctions utilitaires**:
- `calculatePasswordStrength(password: string)` - Calcule la robustesse du password avec score et suggestions
- `convertFileToBase64(file: File)` - Convertit un fichier image en base64
- `validateImageFile(file: File)` - Valide format (JPEG, PNG) et taille (max 2MB)

### Phase 2 - Composants (EN COURS)

#### 6. Composant PhotoUpload - `src/components/profile/PhotoUpload.vue`
**Statut**: Créé et complet

**Fonctionnalités**:
- Drag & drop d'image
- Click pour sélectionner un fichier
- Preview de l'image avant upload
- Validation format (JPEG, PNG) et taille (max 2MB)
- Conversion automatique en base64
- Bouton supprimer image

**Props**:
- `modelValue?: string` - Valeur actuelle (base64 ou URL)
- `size?: number` - Taille de l'avatar preview (défaut: 120px)

**Émissions**:
- `update:modelValue` - Émet la chaîne base64 de l'image
- `error` - Émet un message d'erreur

**Utilisation**:
```vue
<PhotoUpload
  v-model="formData.avatarBase64"
  :size="150"
  @error="handlePhotoError"
/>
```

---

## Fichiers À CRÉER (Phase 3 - Formulaires et Views)

### Composants de formulaires d'authentification

#### 7. LoginForm.vue - `src/components/auth/LoginForm.vue`
**À implémenter**:

**Structure**:
```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { emailRules, passwordRules } from '@/composables/useValidation'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, NCheckbox, NSpin } from 'naive-ui'

// Form data
const formData = reactive({
  email: '',
  password: ''
})

// Validation rules
const rules = {
  email: emailRules(false), // Pas de vérification d'unicité sur login
  password: { required: passwordRules.required } // Seulement required, pas les autres règles
}

// Vuelidate
const v$ = useVuelidate(rules, formData)

// Store et router
const authStore = useAuthStore()
const router = useRouter()

// Submit handler
const handleSubmit = async () => {
  const isValid = await v$.value.$validate()
  if (!isValid) return

  try {
    await authStore.login({
      email: formData.email,
      password: formData.password
    })
    // Toast succès
    window.$message.success('Connexion réussie! Bienvenue')
    // Redirection /dashboard
    router.push('/dashboard')
  } catch (error) {
    // Toast erreur
    window.$message.error(authStore.error || 'Erreur de connexion')
  }
}
</script>

<template>
  <n-spin :show="authStore.loading">
    <n-form @submit.prevent="handleSubmit">
      <!-- Email field -->
      <n-form-item
        label="Email"
        :validation-status="v$.email.$error ? 'error' : undefined"
        :feedback="v$.email.$errors[0]?.$message"
      >
        <n-input
          v-model:value="formData.email"
          type="email"
          placeholder="votre@email.com"
          @blur="v$.email.$touch"
        />
      </n-form-item>

      <!-- Password field -->
      <n-form-item
        label="Mot de passe"
        :validation-status="v$.password.$error ? 'error' : undefined"
        :feedback="v$.password.$errors[0]?.$message"
      >
        <n-input
          v-model:value="formData.password"
          type="password"
          show-password-on="click"
          placeholder="Votre mot de passe"
          @blur="v$.password.$touch"
        />
      </n-form-item>

      <!-- Remember me + Forgot password -->
      <div class="login-form__actions">
        <n-checkbox>Se souvenir de moi</n-checkbox>
        <router-link to="/forgot-password" class="login-form__link">
          Mot de passe oublié?
        </router-link>
      </div>

      <!-- Submit button -->
      <n-button
        type="primary"
        attr-type="submit"
        block
        :disabled="authStore.loading"
      >
        Se connecter
      </n-button>

      <!-- Link to register -->
      <div class="login-form__register">
        Pas encore de compte?
        <router-link to="/register" class="login-form__link">
          S'inscrire
        </router-link>
      </div>
    </n-form>
  </n-spin>
</template>

<style scoped>
.login-form__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.login-form__link {
  color: #18a058;
  text-decoration: none;
}

.login-form__link:hover {
  text-decoration: underline;
}

.login-form__register {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
}
</style>
```

#### 8. RegisterForm.vue - `src/components/auth/RegisterForm.vue`
**À implémenter**:

**Structure similaire à LoginForm mais avec**:
- Champs: email, password, confirmPassword, firstName, lastName, pseudo (optionnel), bio (optionnel)
- Validation Vuelidate complète avec `emailRules(true)`, `passwordRules`, `confirmPasswordRules`, etc.
- Composant `PhotoUpload` intégré
- Indicateur de robustesse du password avec `calculatePasswordStrength()`
- Submit appelle `authStore.register()` puis redirection `/dashboard`

#### 9. ForgotPasswordForm.vue - `src/components/auth/ForgotPasswordForm.vue`
**À implémenter**:

**Structure**:
- Un seul champ: email
- Validation: `emailRules(false)`
- Submit appelle `authStore.forgotPassword()`
- Toast info: "Si votre email existe, vous recevrez un lien de réinitialisation"
- Rate limit feedback: Désactiver bouton pendant 5 min après envoi
- Lien "Pas reçu?" avec compteur

#### 10. ResetPasswordForm.vue - `src/components/auth/ResetPasswordForm.vue`
**À implémenter**:

**Structure**:
- Récupérer token et email depuis query params: `const route = useRoute(); const token = route.query.token as string`
- onMounted: Vérifier validité du token avec `authService.verifyResetToken(token, email)`
- Si token invalide: Afficher message erreur + lien "Demander nouveau lien"
- Si token valide: Afficher formulaire avec champs newPassword, confirmPassword
- Validation: `passwordRules`, `confirmPasswordRules`
- Indicateur robustesse password
- Submit appelle `authStore.resetPassword()` puis redirection `/login` avec toast succès

#### 11. ProfileSettings.vue - `src/components/profile/ProfileSettings.vue`
**À implémenter**:

**Structure**:
- onMounted: Appeler `authStore.fetchProfile()` pour récupérer données actuelles
- Champs: firstName, lastName, email, pseudo, bio
- Composant `PhotoUpload` pour avatarBase64
- Validation avec `emailRules(true)` (vérifier unicité), `pseudoRules(true)`, etc.
- Submit appelle `authStore.updateProfile()` avec seulement les champs modifiés
- Toast succès: "Profil mis à jour"

#### 12. SecuritySettings.vue - `src/components/profile/SecuritySettings.vue`
**À implémenter**:

**Structure**:
- Champs: oldPassword, newPassword, confirmPassword
- Validation: `passwordRules`, `confirmPasswordRules`
- Indicateur robustesse nouveau password
- Validation custom: nouveau password différent de l'ancien
- Submit appelle `authStore.updatePassword()`
- Toast succès: "Mot de passe changé. Autres sessions déconnectées"

### Views (Pages)

#### 13. LoginView.vue - `src/views/auth/LoginView.vue`
```vue
<script setup lang="ts">
import LoginForm from '@/components/auth/LoginForm.vue'
</script>

<template>
  <div class="login-view">
    <div class="login-view__container">
      <h1 class="login-view__title">Connexion à Ithaka</h1>
      <p class="login-view__subtitle">
        Accédez à vos carnets de voyage
      </p>
      <LoginForm />
    </div>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-view__container {
  width: 100%;
  max-width: 450px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.login-view__title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
}

.login-view__subtitle {
  font-size: 16px;
  color: #666;
  margin-bottom: 32px;
  text-align: center;
}

@media (max-width: 768px) {
  .login-view__container {
    margin: 20px;
    padding: 30px 20px;
  }
}
</style>
```

#### 14. RegisterView.vue - `src/views/auth/RegisterView.vue`
Structure similaire à LoginView mais avec RegisterForm

#### 15. ForgotPasswordView.vue - `src/views/auth/ForgotPasswordView.vue`
Structure similaire à LoginView mais avec ForgotPasswordForm

#### 16. ResetPasswordView.vue - `src/views/auth/ResetPasswordView.vue`
Structure similaire à LoginView mais avec ResetPasswordForm

#### 17. ProfileView.vue - `src/views/ProfileView.vue`
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { NTabs, NTabPane } from 'naive-ui'
import ProfileSettings from '@/components/profile/ProfileSettings.vue'
import SecuritySettings from '@/components/profile/SecuritySettings.vue'

const activeTab = ref<string>('profile')
</script>

<template>
  <div class="profile-view">
    <div class="profile-view__container">
      <h1 class="profile-view__title">Mon profil</h1>

      <n-tabs v-model:value="activeTab" type="line">
        <n-tab-pane name="profile" tab="Informations">
          <ProfileSettings />
        </n-tab-pane>
        <n-tab-pane name="security" tab="Sécurité">
          <SecuritySettings />
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  padding: 40px 20px;
  max-width: 800px;
  margin: 0 auto;
}

.profile-view__container {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.profile-view__title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .profile-view__container {
    padding: 20px;
  }
}
</style>
```

### Configuration Router

#### 18. Mettre à jour `src/router/index.ts`
**À ajouter**:

```typescript
const routes: RouteRecordRaw[] = [
  // ... routes existantes ...

  // Routes d'authentification
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Mot de passe oublié',
      hideForAuth: true
    }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Réinitialisation mot de passe',
      hideForAuth: true
    }
  },

  // Routes profil
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Mon profil'
    }
  },
  {
    path: '/settings/profile',
    redirect: '/profile' // Alias pour compatibilité PRP
  },
  {
    path: '/settings/security',
    redirect: '/profile' // Alias, géré par tabs dans ProfileView
  }
]
```

**Mettre à jour le guard beforeEach**:

```typescript
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Tentative de restauration de session si pas encore fait
  if (!authStore.user && !authStore.loading) {
    try {
      await authStore.fetchProfile()
    } catch (error) {
      // Session invalide ou pas de cookies, continuer
    }
  }

  // Mise à jour du titre de la page
  const defaultTitle = import.meta.env.VITE_APP_TITLE || 'Ithaka'
  document.title = to.meta.title ? `${to.meta.title} - ${defaultTitle}` : defaultTitle

  // Vérification de l'authentification
  const requiresAuth = to.meta.requiresAuth as boolean
  const hideForAuth = to.meta.hideForAuth as boolean
  const isAuthenticated = authStore.isAuthenticated

  // Si la route nécessite une authentification et que l'utilisateur n'est pas connecté
  if (requiresAuth && !isAuthenticated) {
    console.warn('Access denied - Authentication required')
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    })
    return
  }

  // Si la route doit être cachée pour les utilisateurs connectés
  if (hideForAuth && isAuthenticated) {
    console.log('User already authenticated, redirecting to dashboard')
    next({ name: 'Dashboard' })
    return
  }

  // Autoriser la navigation
  next()
})
```

### Configuration NaiveUI et notifications

#### 19. Mettre à jour `src/main.ts`
**À modifier**:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAuthStore } from '@/stores/auth'

// NaiveUI - Import des styles et configuration
import { create, NMessageProvider, NNotificationProvider } from 'naive-ui'

// Styles globaux
import './assets/main.css'

/**
 * Fonction asynchrone de bootstrap de l'application
 */
const bootstrapApp = async (): Promise<void> => {
  const app = createApp(App)

  // Configuration NaiveUI (optionnel, pour customisation globale)
  const naive = create({
    // Configuration globale des composants NaiveUI
  })
  app.use(naive)

  // Pinia
  const pinia = createPinia()
  app.use(pinia)

  // Vue Router
  app.use(router)

  // Restauration de la session
  const authStore = useAuthStore()
  try {
    await authStore.fetchProfile()
    console.log('Session restoration complete')
  } catch (error) {
    console.warn('Session restoration failed:', error)
  }

  // Montage de l'application
  app.mount('#app')

  console.log('Application Ithaka mounted successfully')
}

// Lancement de l'application
bootstrapApp().catch((error: unknown) => {
  console.error('Failed to bootstrap application:', error)
})
```

#### 20. Mettre à jour `src/App.vue`
**À modifier**:

```vue
<script setup lang="ts">
import { useMessage, useNotification } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

// Configuration globale des notifications NaiveUI
const message = useMessage()
const notification = useNotification()

// Rendre les notifications accessibles globalement
window.$message = message
window.$notification = notification

const authStore = useAuthStore()
const router = useRouter()

// Handler de déconnexion
const handleLogout = async () => {
  try {
    await authStore.logout()
    message.info('Vous avez été déconnecté')
    router.push('/login')
  } catch (error) {
    message.error('Erreur lors de la déconnexion')
  }
}
</script>

<template>
  <n-message-provider>
    <n-notification-provider>
      <div id="app">
        <!-- Header avec navigation -->
        <header v-if="authStore.isAuthenticated" class="app-header">
          <div class="app-header__container">
            <router-link to="/" class="app-header__logo">
              Ithaka
            </router-link>

            <nav class="app-header__nav">
              <router-link to="/dashboard" class="app-header__link">
                Mes carnets
              </router-link>
              <router-link to="/profile" class="app-header__link">
                Mon profil
              </router-link>
            </nav>

            <div class="app-header__user">
              <n-avatar
                v-if="authStore.user?.avatarBase64"
                :src="authStore.user.avatarBase64"
                :size="40"
              />
              <n-dropdown
                trigger="click"
                :options="[
                  { label: 'Mon profil', key: 'profile', icon: 'person-outline' },
                  { label: 'Déconnexion', key: 'logout', icon: 'log-out-outline' }
                ]"
                @select="(key) => {
                  if (key === 'profile') router.push('/profile')
                  if (key === 'logout') handleLogout()
                }"
              >
                <n-button text>
                  {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
                </n-button>
              </n-dropdown>
            </div>
          </div>
        </header>

        <!-- Main content -->
        <main class="app-main">
          <router-view />
        </main>
      </div>
    </n-notification-provider>
  </n-message-provider>
</template>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.app-header {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-header__container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-header__logo {
  font-size: 24px;
  font-weight: 700;
  color: #18a058;
  text-decoration: none;
}

.app-header__nav {
  display: flex;
  gap: 24px;
}

.app-header__link {
  color: #333;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.app-header__link:hover,
.app-header__link.router-link-active {
  color: #18a058;
}

.app-header__user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-main {
  min-height: calc(100vh - 72px);
}

@media (max-width: 768px) {
  .app-header__container {
    padding: 12px 16px;
  }

  .app-header__nav {
    display: none; /* Menu mobile à implémenter */
  }
}
</style>
```

#### 21. Déclarer les globals TypeScript
Créer `src/types/global.d.ts`:

```typescript
import type { MessageApi, NotificationApi } from 'naive-ui'

declare global {
  interface Window {
    $message: MessageApi
    $notification: NotificationApi
  }
}

export {}
```

---

## Instructions pour finaliser l'implémentation

### Étape 1: Créer les composants manquants

Créez les fichiers suivants dans l'ordre:

1. `src/components/auth/LoginForm.vue` (voir structure ci-dessus)
2. `src/components/auth/RegisterForm.vue`
3. `src/components/auth/ForgotPasswordForm.vue`
4. `src/components/auth/ResetPasswordForm.vue`
5. `src/components/profile/ProfileSettings.vue`
6. `src/components/profile/SecuritySettings.vue`

### Étape 2: Créer les views

Créez les fichiers suivants:

1. `src/views/auth/LoginView.vue` (voir structure ci-dessus)
2. `src/views/auth/RegisterView.vue`
3. `src/views/auth/ForgotPasswordView.vue`
4. `src/views/auth/ResetPasswordView.vue`
5. `src/views/ProfileView.vue`

### Étape 3: Mettre à jour le Router

Modifiez `src/router/index.ts` pour ajouter les routes manquantes et mettre à jour le guard.

### Étape 4: Configurer NaiveUI

1. Créez `src/types/global.d.ts`
2. Modifiez `src/main.ts` pour importer et configurer NaiveUI
3. Modifiez `src/App.vue` pour ajouter le header avec menu utilisateur

### Étape 5: Tester l'intégration

1. Lancez le backend (assurez-vous qu'il tourne sur le port 8000)
2. Lancez le frontend: `npm run dev`
3. Testez chaque flow:
   - Inscription d'un nouvel utilisateur
   - Connexion
   - Modification du profil
   - Changement de mot de passe
   - Mot de passe oublié
   - Déconnexion

### Étape 6: Vérifier les endpoints backend

Assurez-vous que le backend expose bien tous les endpoints avec le bon format de réponse:

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/users/profile
- PUT /api/users/profile
- PUT /api/users/password
- POST /api/auth/forgot-password
- GET /api/auth/verify-reset-token
- POST /api/auth/reset-password
- GET /api/auth/check-email
- GET /api/auth/check-pseudo

---

## Dépendances déjà installées

D'après le `package.json`, les dépendances suivantes sont déjà installées:
- @vuelidate/core: ^2.0.3
- @vuelidate/validators: ^2.0.4
- axios: ^1.12.2
- naive-ui: ^2.43.1
- pinia: ^2.3.1
- vue: ^3.5.15
- vue-router: ^4.6.3
- typescript: ^5.9.3

**Pas besoin d'installer de nouvelles dépendances**.

---

## Points d'attention

1. **Cookies httpOnly**: Le backend DOIT configurer les cookies avec les flags `httpOnly`, `secure` (HTTPS), et `sameSite=Strict`.

2. **CORS**: Le backend DOIT autoriser les requêtes depuis `http://localhost:5173` (frontend Vite) avec credentials:
   ```javascript
   app.use(cors({
     origin: 'http://localhost:5173',
     credentials: true
   }))
   ```

3. **Variables d'environnement**: Le fichier `.env` contient déjà:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   VITE_APP_ENV=development
   VITE_APP_TITLE=Ithaka - Carnets de Voyage
   VITE_DEBUG_MODE=true
   ```

4. **Responsive**: Tous les composants et views doivent être responsive (desktop 1920px+, tablet 768-1024px).

5. **Accessibilité**: Les formulaires doivent avoir des labels, aria-invalid, et la navigation au clavier doit fonctionner.

6. **Validation**: Utiliser Vuelidate pour TOUTE validation de formulaire côté client.

7. **Toast notifications**: Utiliser `window.$message` (NaiveUI) pour afficher les notifications:
   - Succès: `window.$message.success('Message')`
   - Erreur: `window.$message.error('Message')`
   - Info: `window.$message.info('Message')`
   - Warning: `window.$message.warning('Message')`

---

## Commandes pour lancer le frontend

```bash
# Installation des dépendances (si nécessaire)
cd frontend
npm install

# Lancement en mode développement
npm run dev

# Build pour production
npm run build

# Vérification TypeScript
npm run type-check

# Tests (si implémentés)
npm run test
```

L'application sera accessible sur `http://localhost:5173`

---

## Statut des fichiers

### Créés et complets
- types/models.ts
- services/authService.ts
- services/api.ts (modifié)
- stores/auth.ts (réécrit)
- composables/useValidation.ts
- components/profile/PhotoUpload.vue

### À créer
- components/auth/LoginForm.vue
- components/auth/RegisterForm.vue
- components/auth/ForgotPasswordForm.vue
- components/auth/ResetPasswordForm.vue
- components/profile/ProfileSettings.vue
- components/profile/SecuritySettings.vue
- views/auth/LoginView.vue
- views/auth/RegisterView.vue
- views/auth/ForgotPasswordView.vue
- views/auth/ResetPasswordView.vue
- views/ProfileView.vue
- types/global.d.ts

### À modifier
- router/index.ts (ajouter routes + guard complet)
- main.ts (configuration NaiveUI)
- App.vue (header avec menu utilisateur)

---

## Conclusion

L'architecture core de l'US01 est complète et prête à l'emploi. Il reste principalement à créer les composants de formulaires et les views en suivant les structures fournies dans ce rapport. Toute la logique métier (validation, appels API, gestion d'état) est déjà implémentée et testable.

Temps estimé pour finaliser l'implémentation: 4-6 heures de développement.

---

**Date de génération**: 27 octobre 2025
**Agent**: Claude Code (Sonnet 4.5)
**Status**: Architecture complète, composants à finaliser
