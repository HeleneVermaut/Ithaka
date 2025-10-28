<template>
  <div class="login-form-container">
    <n-card title="Connexion" :bordered="false" size="large">
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        @submit.prevent="handleSubmit"
      >
        <n-form-item label="Email" path="email">
          <n-input
            v-model:value="formData.email"
            type="text"
            placeholder="votre.email@exemple.com"
            size="large"
            clearable
            :disabled="loading"
            @keyup.enter="handleSubmit"
          />
        </n-form-item>

        <n-form-item label="Mot de passe" path="password">
          <n-input
            v-model:value="formData.password"
            type="password"
            placeholder="Votre mot de passe"
            size="large"
            :disabled="loading"
            @keyup.enter="handleSubmit"
            show-password-on="click"
          />
        </n-form-item>

        <n-space vertical size="large">
          <n-checkbox v-model:checked="rememberMe">
            Se souvenir de moi
          </n-checkbox>

          <n-button
            type="primary"
            size="large"
            :block="true"
            :loading="loading"
            :disabled="loading"
            attr-type="submit"
            @click="handleSubmit"
          >
            Se connecter
          </n-button>

          <n-space justify="space-between">
            <router-link to="/forgot-password" class="link">
              Mot de passe oublié ?
            </router-link>
            <router-link to="/register" class="link">
              Créer un compte
            </router-link>
          </n-space>
        </n-space>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import {
  useMessage,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSpace,
  NButton,
  NCheckbox,
  type FormInst,
  type FormRules
} from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

// Composables
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

// Refs
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const rememberMe = ref(false)

// Form data
const formData = reactive({
  email: '',
  password: '',
})

// Validation rules
const rules: FormRules = {
  email: [
    {
      required: true,
      message: 'Email requis',
      trigger: ['input', 'blur'],
    },
    {
      type: 'email',
      message: 'Email invalide',
      trigger: ['blur', 'input'],
    },
  ],
  password: [
    {
      required: true,
      message: 'Mot de passe requis',
      trigger: ['input', 'blur'],
    },
    {
      min: 8,
      message: 'Minimum 8 caractères',
      trigger: ['input', 'blur'],
    },
  ],
}

// Methods
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true

    await authStore.login({
      email: formData.email,
      password: formData.password,
    })

    message.success('Connexion réussie !')

    // Redirect to dashboard or intended route
    const redirect = (router.currentRoute.value.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (error: any) {
    console.error('Login error:', error)

    if (error.response) {
      // API error
      const status = error.response.status
      const data = error.response.data

      if (status === 401) {
        message.error('Email ou mot de passe incorrect')
      } else if (status === 429) {
        message.error('Trop de tentatives. Réessayez plus tard')
      } else {
        message.error(data.message || 'Erreur de connexion')
      }
    } else if (error.code === 'ECONNABORTED') {
      message.error('Connexion trop lente. Vérifiez votre connexion')
    } else if (error.message && !error.response) {
      // Validation error from form
      message.error('Veuillez corriger les erreurs du formulaire')
    } else {
      message.error('Erreur de connexion réseau')
    }
  } finally {
    loading.value = false
  }
}
</script>

<script lang="ts">
export default {
  name: 'LoginForm',
}
</script>

<style scoped>
.login-form-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.link {
  color: var(--n-color-target);
  text-decoration: none;
  font-size: 14px;
}

.link:hover {
  text-decoration: underline;
}

:deep(.n-card-header) {
  text-align: center;
  font-size: 24px;
  font-weight: 600;
}
</style>
