<template>
  <div class="auth-view">
    <div class="auth-view__background"></div>
    <div class="auth-view__content">
      <div class="auth-view__header">
        <h1 class="auth-view__logo">Ithaka</h1>
        <p class="auth-view__tagline">Créez vos carnets de voyage et souvenirs</p>
      </div>
      <LoginForm />
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginForm from '@/components/auth/LoginForm.vue'
</script>

<script lang="ts">
export default {
  name: 'LoginView',
}
</script>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.auth-view__background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 0;
}

.auth-view__content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 500px;
  padding: 2rem 1rem;
}

.auth-view__header {
  text-align: center;
  margin-bottom: 2rem;
  color: white;
}

.auth-view__logo {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.auth-view__tagline {
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .auth-view__content {
    padding: 1rem;
  }

  .auth-view__logo {
    font-size: 2.5rem;
  }

  .auth-view__tagline {
    font-size: 1rem;
  }
}
</style>
