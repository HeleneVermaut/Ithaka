<!--
  Vue MyNotebooks - Page principale de gestion des carnets

  Cette page permet à l'utilisateur de visualiser et gérer tous ses carnets.
  Elle intègre les composants NotebookFilters, NotebookGallery, et gère
  les actions CRUD via le store Pinia.

  Fonctionnalités:
  - Affichage de la galerie de carnets avec pagination
  - Filtrage et recherche de carnets
  - Onglets pour carnets actifs et archivés
  - Actions: créer, dupliquer, archiver, restaurer, supprimer
  - Notifications toast pour toutes les actions
-->

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NTabs,
  NTabPane,
  NSpace,
  NIcon,
  useMessage
} from 'naive-ui'
import {
  AddOutline as AddIcon,
  LogOutOutline as LogoutIcon
} from '@vicons/ionicons5'
import { useNotebooksStore } from '@/stores/notebooks'
import { useAuthStore } from '@/stores/auth'
import { fetchNotebookPages } from '@/services/pageService'
import NotebookFilters from '@/components/notebooks/NotebookFilters.vue'
import NotebookGallery from '@/components/notebooks/NotebookGallery.vue'
import CreateNotebookModal from '@/components/notebooks/CreateNotebookModal.vue'
import RenameNotebookModal from '@/components/notebooks/RenameNotebookModal.vue'
import EditNotebookModal from '@/components/notebooks/EditNotebookModal.vue'
import ConfirmationModal from '@/components/notebooks/ConfirmationModal.vue'
import NotebookContextMenu from '@/components/notebooks/NotebookContextMenu.vue'
import ArchivedNotebooks from '@/components/notebooks/ArchivedNotebooks.vue'
import type { Notebook, NotebookFilters as INotebookFilters } from '@/types/notebook'

// Instances
const router = useRouter()
const notebooksStore = useNotebooksStore()
const authStore = useAuthStore()
const message = useMessage()

// État local
const activeTab = ref<'active' | 'archived'>('active')

// État des modals
const showCreateModal = ref<boolean>(false)
const showRenameModal = ref<boolean>(false)
const showEditModal = ref<boolean>(false)
const showConfirmationModal = ref<boolean>(false)
const showContextMenu = ref<boolean>(false)

// Carnet sélectionné pour les actions modales
const selectedNotebook = ref<Notebook | null>(null)

// Position du menu contextuel
const contextMenuPosition = ref({ x: 0, y: 0 })

// Configuration du modal de confirmation
const confirmationConfig = ref({
  title: '',
  message: '',
  confirmText: 'Confirmer',
  type: 'warning' as 'warning' | 'error' | 'info',
  action: '' as 'archive' | 'delete' | ''
})

// Computed properties depuis le store
const notebooks = computed(() => notebooksStore.notebooks)
const loading = computed(() => notebooksStore.loading)
const filters = computed(() => notebooksStore.filters)
const pagination = computed(() => notebooksStore.pagination)
const currentUser = computed(() => authStore.user)

/**
 * Helper function: Maps backend errors to user-friendly messages
 *
 * This function prevents exposure of backend implementation details by
 * mapping HTTP status codes and error types to generic, safe messages.
 *
 * @param error - The error object from the API call
 * @returns A user-friendly error message in French
 */
const getErrorMessage = (error: any): string => {
  // Check for network errors (no response from server)
  if (!error.response) {
    return 'Erreur de connexion. Veuillez vérifier votre connexion internet.'
  }

  // Map HTTP status codes to user-friendly messages
  const status = error.response?.status

  if (status === 401) {
    return 'Votre session a expiré. Veuillez vous reconnecter.'
  }
  if (status === 403) {
    return 'Vous n\'avez pas les permissions nécessaires pour cette action.'
  }
  if (status === 404) {
    return 'Carnet non trouvé.'
  }
  if (status === 409) {
    return 'Cette opération ne peut pas être effectuée pour le moment.'
  }
  if (status >= 500) {
    return 'Erreur serveur. Veuillez réessayer plus tard.'
  }

  // Generic message for all other errors (4xx client errors)
  return 'Une erreur est survenue. Veuillez réessayer.'
}

/**
 * Helper function: Handles authorization errors (401/403)
 *
 * Provides specific handling for authentication and authorization failures,
 * including automatic redirect to login page when session expires.
 *
 * @param error - The error object from the API call
 * @returns true if the error was an authorization error, false otherwise
 */
const handleAuthorizationError = (error: any): boolean => {
  if (!error.response) {
    return false
  }

  const status = error.response?.status

  if (status === 401) {
    // Session expired - redirect to login after showing message
    message.error('Votre session a expiré. Redirection vers la page de connexion...')
    setTimeout(() => {
      authStore.logout()
      router.push('/login')
    }, 2000)
    return true
  }

  if (status === 403) {
    // Permission denied
    message.error('Vous n\'avez pas les permissions nécessaires pour cette action.')
    return true
  }

  return false
}

// Initialisation
onMounted(async () => {
  await loadNotebooks()
})

// Surveiller les changements d'onglet
watch(activeTab, async (newTab) => {
  // Mettre à jour le statut dans les filtres
  const newFilters: INotebookFilters = {
    ...filters.value,
    status: newTab,
    page: 1 // Réinitialiser à la page 1
  }
  await notebooksStore.setFilters(newFilters)
})

// Fonctions de chargement
const loadNotebooks = async (): Promise<void> => {
  try {
    if (activeTab.value === 'archived') {
      await notebooksStore.fetchArchivedNotebooks()
    } else {
      await notebooksStore.fetchNotebooks()
    }
  } catch (error) {
    console.error('Error loading notebooks:', error)

    // Check for authorization errors first
    if (handleAuthorizationError(error)) {
      return
    }

    // Display user-friendly error message
    message.error(getErrorMessage(error))
  }
}

// Gestionnaires d'événements - Filtres
const handleFiltersUpdate = async (updatedFilters: INotebookFilters): Promise<void> => {
  await notebooksStore.setFilters(updatedFilters)
}

const handleFiltersReset = async (): Promise<void> => {
  await notebooksStore.setFilters({
    status: 'active',
    sort: 'createdAt',
    order: 'DESC',
    page: 1,
    limit: 10
  })
  message.info('Filtres réinitialisés')
}

// Gestionnaires d'événements - Pagination
const handlePageChange = async (page: number): Promise<void> => {
  const updatedFilters: INotebookFilters = {
    ...filters.value,
    page
  }
  await notebooksStore.setFilters(updatedFilters)
}

// Gestionnaires d'événements - Actions sur carnets
const handleNotebookClick = async (notebook: Notebook): Promise<void> => {
  try {
    // Récupérer les pages du carnet
    const pages = await fetchNotebookPages(notebook.id)

    if (pages.length === 0) {
      message.warning(`Le carnet "${notebook.title}" n'a pas de pages. Veuillez en créer une.`)
      return
    }

    // Naviguer vers le PageEditor avec la première page
    const firstPage = pages[0]
    await router.push(`/notebooks/${notebook.id}/edit/${firstPage.id}`)
    message.success(`Ouverture du carnet "${notebook.title}"`)
  } catch (error) {
    console.error('Error opening notebook:', error)
    message.error('Erreur lors de l\'ouverture du carnet')
  }
}

const handleCreateNotebook = (): void => {
  showCreateModal.value = true
}

const handleNotebookCreated = async (): Promise<void> => {
  await loadNotebooks()
}

const handleDuplicateNotebook = async (notebook: Notebook): Promise<void> => {
  try {
    await notebooksStore.duplicateNotebook(notebook.id)
    message.success(`Carnet "${notebook.title}" dupliqué avec succès`)
    await loadNotebooks()
  } catch (error) {
    console.error('Error duplicating notebook:', error)

    // Check for authorization errors first
    if (handleAuthorizationError(error)) {
      return
    }

    // Display user-friendly error message
    message.error(getErrorMessage(error))
  }
}

const handleArchiveNotebook = (notebook: Notebook): void => {
  selectedNotebook.value = notebook
  confirmationConfig.value = {
    title: 'Archiver le carnet',
    message: `Êtes-vous sûr de vouloir archiver "${notebook.title}" ?\n\nLe carnet sera déplacé dans les archives et ne sera plus visible dans la liste principale.`,
    confirmText: 'Archiver',
    type: 'warning',
    action: 'archive'
  }
  showConfirmationModal.value = true
}

const handleRestoreNotebook = async (notebook: Notebook): Promise<void> => {
  try {
    await notebooksStore.restoreNotebook(notebook.id)
    message.success(`Carnet "${notebook.title}" restauré`)
    await loadNotebooks()
  } catch (error) {
    console.error('Error restoring notebook:', error)

    // Check for authorization errors first
    if (handleAuthorizationError(error)) {
      return
    }

    // Display user-friendly error message
    message.error(getErrorMessage(error))
  }
}

const handleRenameNotebook = (notebook: Notebook): void => {
  selectedNotebook.value = notebook
  showRenameModal.value = true
}

const handleNotebookRenamed = async (): Promise<void> => {
  await loadNotebooks()
}

const handleEditNotebook = (notebook: Notebook): void => {
  selectedNotebook.value = notebook
  showEditModal.value = true
}

const handleNotebookUpdated = async (): Promise<void> => {
  await loadNotebooks()
}

const handleDeleteNotebook = (notebook: Notebook): void => {
  selectedNotebook.value = notebook
  confirmationConfig.value = {
    title: 'Supprimer définitivement',
    message: `⚠️ ATTENTION: La suppression de "${notebook.title}" est IRRÉVERSIBLE.\n\nToutes les pages et éléments seront définitivement perdus.\n\nÊtes-vous absolument sûr ?`,
    confirmText: 'Supprimer définitivement',
    type: 'error',
    action: 'delete'
  }
  showConfirmationModal.value = true
}

const handleNotebookAction = async (action: string, notebook: Notebook): Promise<void> => {
  switch (action) {
    case 'open':
      handleNotebookClick(notebook)
      break
    case 'duplicate':
      await handleDuplicateNotebook(notebook)
      break
    case 'archive':
      if (notebook.status === 'archived') {
        await handleRestoreNotebook(notebook)
      } else {
        handleArchiveNotebook(notebook)
      }
      break
    case 'rename':
      handleRenameNotebook(notebook)
      break
    case 'edit':
      handleEditNotebook(notebook)
      break
    case 'delete':
      handleDeleteNotebook(notebook)
      break
    default:
      console.warn(`Unknown action: ${action}`)
  }
}

// Gestionnaire de confirmation du modal de confirmation
const handleConfirmAction = async (): Promise<void> => {
  if (!selectedNotebook.value) return

  const action = confirmationConfig.value.action

  try {
    if (action === 'archive') {
      await notebooksStore.archiveNotebook(selectedNotebook.value.id)
      message.success(`Carnet "${selectedNotebook.value.title}" archivé`)
    } else if (action === 'delete') {
      await notebooksStore.deleteNotebook(selectedNotebook.value.id)
      message.success(`Carnet "${selectedNotebook.value.title}" supprimé définitivement`)
    }

    await loadNotebooks()
    showConfirmationModal.value = false
  } catch (error) {
    console.error(`Error performing ${action} action:`, error)

    // Check for authorization errors first
    if (handleAuthorizationError(error)) {
      // Keep modal open if authorization failed
      return
    }

    // Display user-friendly error message
    message.error(getErrorMessage(error))
  }
}

// Gestionnaire du menu contextuel
const handleContextMenu = (event: MouseEvent, notebook: Notebook): void => {
  selectedNotebook.value = notebook
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  showContextMenu.value = true
}

// Déconnexion
const handleLogout = (): void => {
  authStore.logout()
  message.info('Vous êtes maintenant déconnecté')
  router.push({ name: 'Home' })
}
</script>

<template>
  <div class="my-notebooks">
    <!-- En-tête -->
    <header class="my-notebooks__header">
      <div class="container">
        <div class="my-notebooks__header-content">
          <div class="my-notebooks__header-left">
            <h1 class="my-notebooks__title">Mes Carnets</h1>
            <p v-if="currentUser" class="my-notebooks__subtitle">
              Bienvenue, {{ currentUser.firstName }} {{ currentUser.lastName }}
            </p>
          </div>

          <n-space :size="16">
            <n-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleCreateNotebook"
            >
              <template #icon>
                <n-icon :component="AddIcon" />
              </template>
              Nouveau Carnet
            </n-button>

            <n-button
              size="large"
              @click="handleLogout"
            >
              <template #icon>
                <n-icon :component="LogoutIcon" />
              </template>
              Déconnexion
            </n-button>
          </n-space>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="my-notebooks__main">
      <div class="container">
        <!-- Onglets: Actifs / Archivés -->
        <n-tabs
          v-model:value="activeTab"
          type="line"
          size="large"
          animated
        >
          <!-- Onglet Carnets actifs -->
          <n-tab-pane name="active" tab="Carnets actifs">
            <div class="my-notebooks__content">
              <!-- Filtres -->
              <notebook-filters
                :filters="filters"
                :loading="loading"
                @update:filters="handleFiltersUpdate"
                @reset="handleFiltersReset"
              />

              <!-- Galerie -->
              <notebook-gallery
                :notebooks="notebooks"
                :loading="loading"
                :pagination="pagination"
                @page-change="handlePageChange"
                @notebook-click="handleNotebookClick"
                @notebook-action="handleNotebookAction"
                @notebook-contextmenu="handleContextMenu"
              />
            </div>
          </n-tab-pane>

          <!-- Onglet Carnets archivés -->
          <n-tab-pane name="archived" tab="Carnets archivés">
            <div class="my-notebooks__content">
              <!-- Archived notebooks component -->
              <archived-notebooks
                :notebooks="notebooks"
                :loading="loading"
                :pagination="pagination"
                @page-change="handlePageChange"
                @restore="handleRestoreNotebook"
                @delete="handleDeleteNotebook"
              />
            </div>
          </n-tab-pane>
        </n-tabs>
      </div>
    </main>

    <!-- Modals -->
    <create-notebook-modal
      v-model:show="showCreateModal"
      @created="handleNotebookCreated"
    />

    <rename-notebook-modal
      v-if="selectedNotebook"
      v-model:show="showRenameModal"
      :notebook="selectedNotebook"
      @renamed="handleNotebookRenamed"
    />

    <edit-notebook-modal
      v-if="selectedNotebook"
      v-model:show="showEditModal"
      :notebook="selectedNotebook"
      @updated="handleNotebookUpdated"
    />

    <confirmation-modal
      v-model:show="showConfirmationModal"
      :title="confirmationConfig.title"
      :message="confirmationConfig.message"
      :confirm-text="confirmationConfig.confirmText"
      :type="confirmationConfig.type"
      @confirm="handleConfirmAction"
    />

    <notebook-context-menu
      v-if="selectedNotebook"
      v-model:show="showContextMenu"
      :x="contextMenuPosition.x"
      :y="contextMenuPosition.y"
      :notebook="selectedNotebook"
      @action="handleNotebookAction"
    />
  </div>
</template>

<style scoped>
/**
 * Styles de la page Mes Carnets
 * Structure BEM (Block Element Modifier)
 */

.my-notebooks {
  min-height: 100vh;
  background-color: var(--color-bg-secondary, #f9fafb);
}

/* En-tête */
.my-notebooks__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: var(--spacing-2xl, 48px) 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.my-notebooks__header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-lg, 24px);
}

.my-notebooks__header-left {
  flex: 1;
}

.my-notebooks__title {
  color: white;
  margin: 0 0 var(--spacing-sm, 12px) 0;
  font-size: 2rem;
  font-weight: 700;
}

.my-notebooks__subtitle {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 1.125rem;
}

/* Contenu principal */
.my-notebooks__main {
  padding: var(--spacing-2xl, 48px) 0;
}

.my-notebooks__content {
  margin-top: var(--spacing-xl, 32px);
}

.my-notebooks__info {
  margin-top: var(--spacing-lg, 24px);
  padding: var(--spacing-lg, 24px);
  background-color: #FEF3C7;
  border-radius: 8px;
  border-left: 4px solid #F59E0B;
}

.my-notebooks__info p {
  margin: 0;
  color: #92400E;
  font-size: 0.9375rem;
  line-height: 1.6;
}

/* Container */
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg, 24px);
}

/* Responsive */
@media (max-width: 768px) {
  .my-notebooks__header {
    padding: var(--spacing-lg, 24px) 0;
  }

  .my-notebooks__header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .my-notebooks__title {
    font-size: 1.5rem;
  }

  .my-notebooks__subtitle {
    font-size: 1rem;
  }

  .my-notebooks__main {
    padding: var(--spacing-lg, 24px) 0;
  }

  .my-notebooks__content {
    margin-top: var(--spacing-md, 16px);
  }

  /* Ajuster les boutons sur mobile */
  :deep(.n-space) {
    width: 100%;
  }

  :deep(.n-space .n-button) {
    flex: 1;
  }
}

/* Animations */
.my-notebooks__content {
  animation: fadeIn 0.4s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
