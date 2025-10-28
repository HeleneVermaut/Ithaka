<template>
  <div class="register-form-container">
    <n-card title="Créer un compte" :bordered="false" size="large">
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        @submit.prevent="handleSubmit"
      >
        <!-- Email -->
        <n-form-item label="Email" path="email">
          <n-input
            v-model:value="formData.email"
            type="text"
            placeholder="votre.email@exemple.com"
            size="large"
            clearable
            :disabled="loading"
            @blur="checkEmailAvailability"
          >
            <template #suffix v-if="emailChecking">
              <n-spin size="small" />
            </template>
          </n-input>
        </n-form-item>

        <!-- First Name & Last Name -->
        <n-grid :cols="2" :x-gap="12">
          <n-gi>
            <n-form-item label="Prénom" path="firstName">
              <n-input
                v-model:value="formData.firstName"
                placeholder="Jean"
                size="large"
                :disabled="loading"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="Nom" path="lastName">
              <n-input
                v-model:value="formData.lastName"
                placeholder="Dupont"
                size="large"
                :disabled="loading"
              />
            </n-form-item>
          </n-gi>
        </n-grid>

        <!-- Pseudo (optional) -->
        <n-form-item label="Pseudo (optionnel)" path="pseudo">
          <n-input
            v-model:value="formData.pseudo"
            placeholder="voyageur123"
            size="large"
            clearable
            :disabled="loading"
          />
        </n-form-item>

        <!-- Password -->
        <n-form-item label="Mot de passe" path="password">
          <n-input
            v-model:value="formData.password"
            type="password"
            placeholder="Minimum 8 caractères"
            size="large"
            :disabled="loading"
            @input="calculatePasswordStrength"
            show-password-on="click"
          />
        </n-form-item>

        <!-- Password Strength Indicator -->
        <n-progress
          v-if="formData.password"
          type="line"
          :percentage="passwordStrength.percentage"
          :status="passwordStrength.status"
          :show-indicator="false"
          style="margin-bottom: 1rem"
        />
        <n-text
          v-if="formData.password"
          :type="passwordStrength.textType"
          style="font-size: 12px; display: block; margin-bottom: 1rem"
        >
          {{ passwordStrength.text }}
        </n-text>

        <!-- Confirm Password -->
        <n-form-item
          label="Confirmer le mot de passe"
          path="confirmPassword"
        >
          <n-input
            v-model:value="formData.confirmPassword"
            type="password"
            placeholder="Confirmer votre mot de passe"
            size="large"
            :disabled="loading"
            show-password-on="click"
          />
        </n-form-item>

        <!-- Bio (optional) -->
        <n-form-item label="Bio (optionnel)" path="bio">
          <n-input
            v-model:value="formData.bio"
            type="textarea"
            placeholder="Quelques mots sur vous..."
            :maxlength="160"
            show-count
            :disabled="loading"
          />
        </n-form-item>

        <n-space vertical size="large">
          <n-button
            type="primary"
            size="large"
            :block="true"
            :loading="loading"
            :disabled="loading"
            attr-type="submit"
            @click="handleSubmit"
          >
            Créer mon compte
          </n-button>

          <n-space justify="center">
            <n-text>Vous avez déjà un compte ?</n-text>
            <router-link to="/login" class="link">
              Se connecter
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
  NGrid,
  NGi,
  NProgress,
  NText,
  NSpace,
  NButton,
  NSpin,
  type FormInst,
  type FormRules,
  type FormItemRule
} from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

// Composables
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

// Refs
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const emailChecking = ref(false)

// Form data
const formData = reactive({
  email: '',
  firstName: '',
  lastName: '',
  pseudo: '',
  password: '',
  confirmPassword: '',
  bio: '',
})

// Password strength
const passwordStrength = reactive({
  percentage: 0,
  status: 'default' as 'default' | 'success' | 'warning' | 'error',
  text: '',
  textType: 'default' as 'default' | 'success' | 'warning' | 'error',
})

// Custom validators
const validatePasswordMatch = (_rule: FormItemRule, value: string): boolean | Error => {
  if (value !== formData.password) {
    return new Error('Les mots de passe ne correspondent pas')
  }
  return true
}

const validatePasswordStrength = (_rule: FormItemRule, value: string): boolean | Error => {
  if (!value) {
    return new Error('Le mot de passe est requis')
  }

  const hasMinLength = value.length >= 8
  const hasUpperCase = /[A-Z]/.test(value)
  const hasNumber = /[0-9]/.test(value)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value)

  if (!hasMinLength) {
    return new Error('Le mot de passe doit contenir au moins 8 caractères')
  }
  if (!hasUpperCase) {
    return new Error('Le mot de passe doit contenir au moins une majuscule')
  }
  if (!hasNumber) {
    return new Error('Le mot de passe doit contenir au moins un chiffre')
  }
  if (!hasSpecialChar) {
    return new Error('Le mot de passe doit contenir au moins un caractère spécial')
  }

  return true
}

// Validation rules
const rules: FormRules = {
  email: [
    {
      required: true,
      message: 'L\'email est requis',
      trigger: ['input', 'blur'],
    },
    {
      type: 'email',
      message: 'L\'email n\'est pas valide',
      trigger: ['blur', 'input'],
    },
  ],
  firstName: [
    {
      required: true,
      message: 'Le prénom est requis',
      trigger: ['input', 'blur'],
    },
    {
      min: 2,
      max: 50,
      message: 'Le prénom doit contenir entre 2 et 50 caractères',
      trigger: ['input', 'blur'],
    },
  ],
  lastName: [
    {
      required: true,
      message: 'Le nom est requis',
      trigger: ['input', 'blur'],
    },
    {
      min: 2,
      max: 50,
      message: 'Le nom doit contenir entre 2 et 50 caractères',
      trigger: ['input', 'blur'],
    },
  ],
  pseudo: [
    {
      min: 3,
      max: 20,
      message: 'Le pseudo doit contenir entre 3 et 20 caractères',
      trigger: ['input', 'blur'],
    },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: 'Le pseudo ne peut contenir que des lettres, chiffres et underscores',
      trigger: ['input', 'blur'],
    },
  ],
  password: [
    {
      required: true,
      validator: validatePasswordStrength,
      trigger: ['input', 'blur'],
    },
  ],
  confirmPassword: [
    {
      required: true,
      message: 'La confirmation du mot de passe est requise',
      trigger: ['input', 'blur'],
    },
    {
      validator: validatePasswordMatch,
      trigger: ['input', 'blur'],
    },
  ],
  bio: [
    {
      max: 160,
      message: 'La bio ne peut pas dépasser 160 caractères',
      trigger: ['input', 'blur'],
    },
  ],
}

// Methods
const calculatePasswordStrength = () => {
  const password = formData.password

  if (!password) {
    passwordStrength.percentage = 0
    passwordStrength.status = 'default'
    passwordStrength.text = ''
    return
  }

  let strength = 0
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }

  // Calculate strength
  Object.values(checks).forEach((check) => {
    if (check) strength += 20
  })

  passwordStrength.percentage = strength

  if (strength < 40) {
    passwordStrength.status = 'error'
    passwordStrength.textType = 'error'
    passwordStrength.text = 'Mot de passe faible'
  } else if (strength < 60) {
    passwordStrength.status = 'warning'
    passwordStrength.textType = 'warning'
    passwordStrength.text = 'Mot de passe moyen'
  } else if (strength < 80) {
    passwordStrength.status = 'default'
    passwordStrength.textType = 'default'
    passwordStrength.text = 'Mot de passe bon'
  } else {
    passwordStrength.status = 'success'
    passwordStrength.textType = 'success'
    passwordStrength.text = 'Mot de passe fort'
  }
}

const checkEmailAvailability = async () => {
  if (!formData.email || emailChecking.value) return

  try {
    emailChecking.value = true
    // This endpoint should be created on backend to check email availability
    // For now, we'll skip this check
    emailChecking.value = false
  } catch (error) {
    console.error('Email check error:', error)
    emailChecking.value = false
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true

    await authStore.register({
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      firstName: formData.firstName,
      lastName: formData.lastName,
      pseudo: formData.pseudo || undefined,
      bio: formData.bio || undefined,
    })

    message.success('Compte créé avec succès ! Bienvenue !')

    // Redirect to dashboard
    router.push('/dashboard')
  } catch (error: any) {
    console.error('Registration error:', error)

    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      if (status === 409) {
        // Email or pseudo already exists
        if (data.message?.includes('email')) {
          message.error('Cet email est déjà utilisé')
        } else if (data.message?.includes('pseudo')) {
          message.error('Ce pseudo est déjà utilisé')
        } else {
          message.error('Un compte avec ces informations existe déjà')
        }
      } else if (status === 400) {
        message.error(data.message || 'Erreur de validation des données')
      } else {
        message.error(data.message || 'Une erreur est survenue lors de l\'inscription')
      }
    } else if (error.code === 'ECONNABORTED') {
      message.error('La requête a pris trop de temps')
    } else if (error.message && !error.response) {
      // Validation error from form
      message.error('Veuillez vérifier les informations saisies')
    } else {
      message.error('Erreur de connexion au serveur')
    }
  } finally {
    loading.value = false
  }
}
</script>

<script lang="ts">
export default {
  name: 'RegisterForm',
}
</script>

<style scoped>
.register-form-container {
  max-width: 600px;
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
