# Ithaka Frontend

Application frontend Vue.js 3 pour Ithaka - Créez et partagez vos carnets de voyage interactifs.

## Stack Technologique

- **Vue.js 3.5.15** - Framework progressif avec Composition API
- **TypeScript 5.9.3** - Typage statique pour un code robuste
- **Vite 6** - Build tool ultra-rapide
- **Pinia** - State management officiel pour Vue 3
- **Vue Router 4** - Routage SPA
- **NaiveUI** - Bibliothèque de composants UI
- **Vuelidate** - Validation de formulaires
- **Axios** - Client HTTP
- **Vitest** - Framework de test

## Prérequis

- Node.js >= 18.0.0
- npm >= 10.0.0

## Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env pour configurer l'URL de l'API backend (must include /api prefix)
# VITE_API_BASE_URL=http://localhost:3000/api
```

## Scripts Disponibles

### Développement

```bash
# Lancer le serveur de développement (http://localhost:3000)
npm run dev
```

Le serveur de développement utilise le Hot Module Replacement (HMR) pour un rechargement instantané des modifications.

### Build

```bash
# Compiler l'application pour la production
npm run build
```

Les fichiers compilés seront dans le dossier `dist/`.

### Preview

```bash
# Prévisualiser le build de production en local
npm run preview
```

### Tests

```bash
# Lancer les tests en mode watch
npm run test

# Lancer les tests avec interface UI
npm run test:ui

# Générer le rapport de couverture
npm run test:coverage
```

### Vérification TypeScript

```bash
# Vérifier les erreurs TypeScript sans compiler
npm run type-check
```

## Structure du Projet

```
frontend/
├── src/
│   ├── assets/          # Fichiers statiques (CSS, images)
│   │   └── main.css     # Styles globaux
│   ├── components/      # Composants Vue réutilisables
│   ├── router/          # Configuration Vue Router
│   │   └── index.ts     # Routes et navigation guards
│   ├── services/        # Services et API
│   │   └── api.ts       # Instance Axios configurée
│   ├── stores/          # Stores Pinia
│   │   └── auth.ts      # Store d'authentification
│   ├── types/           # Définitions TypeScript
│   │   ├── env.d.ts     # Types pour les variables d'environnement
│   │   └── models.ts    # Interfaces des modèles de données
│   ├── views/           # Composants de pages
│   │   ├── auth/        # Pages d'authentification
│   │   │   ├── LoginView.vue
│   │   │   └── RegisterView.vue
│   │   ├── DashboardView.vue
│   │   ├── HomeView.vue
│   │   └── NotFoundView.vue
│   ├── App.vue          # Composant racine
│   └── main.ts          # Point d'entrée de l'application
├── index.html           # Template HTML principal
├── vite.config.ts       # Configuration Vite
├── tsconfig.json        # Configuration TypeScript
├── package.json         # Dépendances et scripts
├── .env.example         # Variables d'environnement (exemple)
└── README.md            # Ce fichier
```

## Conventions de Code

### Nommage

- **Fonctions** : camelCase avec verbe + sujet
  - Exemple : `fetchUserData()`, `validateEmail()`
- **Variables** : camelCase
  - Exemple : `userName`, `isLoading`
- **Composants et Classes** : PascalCase
  - Exemple : `UserProfile.vue`, `ApiService`
- **Classes CSS** : BEM (Block Element Modifier)
  - Exemple : `.user-profile__header`, `.button--primary`

### Composition API

- Utiliser `<script setup>` pour tous les composants
- Organiser le code dans cet ordre :
  1. Imports
  2. Props et Emits
  3. Composables et stores
  4. État réactif (ref, reactive)
  5. Propriétés calculées (computed)
  6. Méthodes
  7. Lifecycle hooks
  8. Watchers

### TypeScript

- Toujours typer les props, emits et fonctions
- Éviter `any`, préférer `unknown` ou types explicites
- Créer des interfaces pour les objets complexes

### Documentation

- Ajouter des commentaires JSDoc pour les fonctions
- Expliquer le "pourquoi" plutôt que le "quoi"
- Documenter les cas complexes pour les débutants

## Variables d'Environnement

Les variables d'environnement sont définies dans le fichier `.env` :

```env
VITE_API_BASE_URL=http://localhost:3000/api  # URL de l'API backend (must include /api prefix)
VITE_APP_ENV=development                      # Environnement (development|production|test)
VITE_APP_TITLE=Ithaka - Carnets de Voyage     # Titre de l'application
VITE_DEBUG_MODE=true                          # Activer les logs de debug
```

**Important** : Seules les variables préfixées par `VITE_` sont exposées au code client.

## Gestion de l'Authentification

L'authentification est gérée par le store Pinia `useAuthStore` :

```typescript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Connexion
await authStore.login({ email: '...', password: '...' })

// Inscription
await authStore.register({ email: '...', username: '...', password: '...' })

// Déconnexion
authStore.logout()

// Vérifier si connecté
const isAuthenticated = authStore.isAuthenticated
```

Le token JWT est automatiquement ajouté aux requêtes HTTP via un intercepteur Axios.

## Routing et Navigation Guards

Les routes sont définies dans `src/router/index.ts`.

Les routes protégées utilisent la métadonnée `requiresAuth: true` :

```typescript
{
  path: '/dashboard',
  meta: { requiresAuth: true }
}
```

Le navigation guard redirige automatiquement vers `/login` si l'utilisateur n'est pas authentifié.

## Communication avec le Backend

Toutes les requêtes HTTP utilisent l'instance Axios configurée dans `src/services/api.ts` :

```typescript
import apiClient from '@/services/api'

// GET request
const response = await apiClient.get('/users')

// POST request
const response = await apiClient.post('/auth/login', { email, password })

// PUT request
const response = await apiClient.put('/users/123', userData)

// DELETE request
const response = await apiClient.delete('/users/123')
```

Les intercepteurs gèrent automatiquement :
- Ajout du token JWT dans les headers
- Gestion des erreurs 401 (déconnexion automatique)
- Logging en mode debug

## Ressources Utiles

- [Documentation Vue.js 3](https://vuejs.org/)
- [Documentation TypeScript](https://www.typescriptlang.org/)
- [Documentation Pinia](https://pinia.vuejs.org/)
- [Documentation Vue Router](https://router.vuejs.org/)
- [Documentation NaiveUI](https://www.naiveui.com/)
- [Documentation Vite](https://vitejs.dev/)
- [Documentation Vuelidate](https://vuelidate-next.netlify.app/)

## Contribution

Ce projet suit les standards de développement Vue.js 3 avec TypeScript.
Merci de respecter les conventions de nommage et d'ajouter des commentaires pour les fonctionnalités complexes.

## Licence

ISC
