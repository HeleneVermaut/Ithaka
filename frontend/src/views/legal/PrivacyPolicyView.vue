<script setup lang="ts">
/**
 * Privacy Policy View
 *
 * Displays the complete privacy policy in accordance with GDPR Article 13 & 14
 * Fetches the policy from the backend and renders it as formatted markdown
 */

import { ref, onMounted } from 'vue'
import { NCard, NSpin, NAlert } from 'naive-ui'
import apiClient from '@/services/api'

// State
const content = ref<string>('')
const loading = ref<boolean>(true)
const error = ref<string | null>(null)
const lastUpdated = ref<string>('')
const version = ref<string>('')

/**
 * Fetch privacy policy from backend
 */
const fetchPrivacyPolicy = async (): Promise<void> => {
  try {
    loading.value = true
    error.value = null

    const response = await apiClient.get('/legal/privacy-policy')

    content.value = response.data.content
    lastUpdated.value = response.data.lastUpdated
    version.value = response.data.version
  } catch (err: unknown) {
    console.error('Error loading privacy policy:', err)
    error.value = 'Erreur lors du chargement de la politique de confidentialité'
  } finally {
    loading.value = false
  }
}

/**
 * Convert markdown to HTML (basic implementation)
 * For a production app, consider using a proper markdown library like marked.js
 */
const markdownToHtml = (markdown: string): string => {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/gim, '</p><p>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

onMounted(() => {
  fetchPrivacyPolicy()
})
</script>

<template>
  <div class="privacy-policy-container">
    <n-card title="Politique de Confidentialité">
      <template #header-extra v-if="lastUpdated">
        <span class="last-updated">Mise à jour : {{ lastUpdated }} (v{{ version }})</span>
      </template>

      <!-- Loading state -->
      <div v-if="loading" class="loading-container">
        <n-spin size="large" />
        <p>Chargement de la politique de confidentialité...</p>
      </div>

      <!-- Error state -->
      <n-alert
        v-else-if="error"
        type="error"
        :title="error"
      >
        Impossible de charger la politique de confidentialité. Veuillez réessayer plus tard.
      </n-alert>

      <!-- Content -->
      <div v-else class="markdown-content" v-html="markdownToHtml(content)"></div>
    </n-card>
  </div>
</template>

<style scoped>
.privacy-policy-container {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.last-updated {
  font-size: 0.875rem;
  color: var(--n-text-color-secondary);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 0;
}

.markdown-content {
  line-height: 1.8;
  font-size: 1rem;
}

.markdown-content :deep(h1) {
  font-size: 2rem;
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-weight: 700;
  color: var(--n-title-text-color);
}

.markdown-content :deep(h2) {
  font-size: 1.5rem;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: var(--n-title-text-color);
  border-bottom: 2px solid var(--n-divider-color);
  padding-bottom: 0.5rem;
}

.markdown-content :deep(h3) {
  font-size: 1.25rem;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--n-title-text-color);
}

.markdown-content :deep(p) {
  margin-bottom: 1rem;
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: var(--n-text-color);
}

.markdown-content :deep(li) {
  margin-left: 1.5rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(a) {
  color: var(--n-color-target);
  text-decoration: underline;
}

.markdown-content :deep(a:hover) {
  opacity: 0.8;
}

.markdown-content :deep(hr) {
  margin: 2rem 0;
  border: none;
  border-top: 1px solid var(--n-divider-color);
}
</style>
