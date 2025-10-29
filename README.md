# Ithaka - Application de carnets de voyage et journal

Application web pour créer et personnaliser des carnets de voyage et journaux personnels avec édition WYSIWYG, partage et export PDF.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Installation](#installation)
- [Développement](#développement)
- [Documentation](#documentation)

## 🎯 Vue d'ensemble

Ithaka permet de :
- Créer des carnets de voyage et journaux personnels (format A4/A5)
- Éditer des pages avec textes, images, formes, emojis et mood trackers
- Personnaliser complètement la mise en page (WYSIWYG)
- Partager avec confidentialité (privé, utilisateurs autorisés, public)
- Exporter en PDF haute qualité (300 DPI)

## 🏗️ Architecture

```
appli-claude-code/
├── frontend/              # Application Vue.js 3
│   ├── src/
│   │   ├── components/   # Composants réutilisables
│   │   ├── stores/       # Stores Pinia (state management)
│   │   ├── services/     # Services API (Axios)
│   │   └── views/        # Pages/Vues
│   └── package.json
├── backend/              # API REST Node.js
│   ├── src/
│   │   ├── controllers/  # Contrôleurs HTTP
│   │   ├── routes/       # Définition des routes
│   │   ├── models/       # Modèles Sequelize
│   │   ├── services/     # Logique métier
│   │   └── middleware/   # Middleware Express
│   └── package.json
├── docs/                 # Documentation
│   └── API.md           # Documentation API REST
└── context/             # Contexte projet et PRPs
    ├── PRD.md
    ├── PRP-US01-Authentication.md
    ├── PRP-US02-NotebookManagement.md
    └── PRP-US03-PageEditionTexts.md
```

## 🛠️ Technologies

### Frontend
- **Vue.js 3.5.15** - Framework JavaScript progressif avec Composition API
- **TypeScript 5.9.3** - Typage statique pour JavaScript
- **Pinia** - State management officiel Vue.js
- **NaiveUI** - Bibliothèque de composants UI modernes
- **Vuelidate** - Validation de formulaires
- **Axios** - Client HTTP pour les appels API
- **Vitest** - Framework de tests unitaires
- **Vite** - Build tool moderne et rapide

### Backend
- **Node.js 22.20.0 LTS** - Runtime JavaScript serveur
- **Express.js** - Framework web minimaliste
- **TypeScript 5.9.3** - Typage statique
- **Sequelize** - ORM pour PostgreSQL
- **PostgreSQL 17.5** - Base de données relationnelle
- **bcryptjs** - Hachage de mots de passe
- **jsonwebtoken** - Authentification JWT
- **Joi** - Validation de schémas
- **SendGrid** - Service d'envoi d'emails

### Outils communs
- **npm 10.0.0** - Gestionnaire de paquets
- **ESLint** - Linter JavaScript/TypeScript
- **Git** - Contrôle de version

## 📦 Installation

### Prérequis

- Node.js 22.20.0 ou supérieur
- npm 10.0.0 ou supérieur
- PostgreSQL 17.5 ou supérieur

### Étapes d'installation

#### 1. Cloner le repository

```bash
git clone <repository-url>
cd appli-claude-code
```

#### 2. Installer les dépendances

```bash
# Installer les dépendances du frontend
cd frontend
npm install

# Installer les dépendances du backend
cd ../backend
npm install
```

#### 3. Configurer l'environnement

**Frontend** (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**Backend** (`backend/.env`)
```env
# Environment
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://ithaka_user:your_password@localhost:5432/ithaka_db

# JWT Secrets (générer avec: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your_jwt_secret_key_here_at_least_64_characters_long
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_at_least_64_characters_long
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Cookie
COOKIE_SECRET=your_cookie_secret_key_here_at_least_32_characters_long

# CORS
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5173

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@ithaka.app
SENDGRID_FROM_NAME=Ithaka

# Logging
LOG_LEVEL=debug
```

#### 4. Créer la base de données PostgreSQL

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données et l'utilisateur
CREATE DATABASE ithaka_db;
CREATE USER ithaka_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ithaka_db TO ithaka_user;
\q
```

## 🚀 Développement

### Lancer le frontend

```bash
cd frontend
npm run dev
```

Le frontend sera accessible sur **http://localhost:3001**

### Lancer le backend

```bash
cd backend
npm run dev
```

L'API sera accessible sur **http://localhost:3000**

### Scripts disponibles

#### Frontend
```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run preview      # Prévisualiser le build
npm run test         # Lancer les tests
npm run test:ui      # Tests avec interface UI
npm run test:coverage # Rapport de couverture
npm run type-check   # Vérifier les types TypeScript
```

#### Backend
```bash
npm run dev          # Serveur de développement (hot reload)
npm run build        # Compiler TypeScript → JavaScript
npm start            # Lancer le serveur compilé
npm run type-check   # Vérifier les types TypeScript
npm run lint         # Linter le code
```

## 📚 Documentation

- **[API Documentation](docs/API.md)** - Documentation complète de l'API REST
- **[PRD](context/PRD.md)** - Product Requirements Document
- **[PRP-US01](context/PRP-US01-Authentication.md)** - Authentification et gestion de compte
- **[PRP-US02](context/PRP-US02-NotebookManagement.md)** - Gestion des carnets
- **[PRP-US03](context/PRP-US03-PageEditionTexts.md)** - Édition de pages - Textes
- **[Frontend README](frontend/README.md)** - Documentation frontend détaillée
- **[Backend README](backend/README.md)** - Documentation backend détaillée

## 🎨 User Stories implémentées

- ✅ **US01** - Gestion de compte et authentification
- ✅ **US02** - Gestion des carnets
- ✅ **US03** - Édition de pages - Textes
- 🚧 **US04** - Édition de pages - Médias et éléments visuels
- 🚧 **US05** - Édition de pages - Citations
- 🚧 **US06** - Édition de pages - Mood trackers
- 🚧 **US07** - Édition de pages - Pagination
- 🚧 **US08** - Partage et confidentialité
- 🚧 **US09** - Export et livre d'aventure
- 🚧 **US10** - Notifications et activité

Légende : ✅ Implémenté | 🚧 En cours | ⏳ À faire

## 🔐 Sécurité

- Mots de passe hachés avec bcryptjs (10 salt rounds)
- JWT stockés en cookies httpOnly (Secure, SameSite=Strict)
- Access token: 15 minutes, Refresh token: 7 jours
- Protection CSRF via cookies SameSite
- Validation stricte des entrées (Joi backend, Vuelidate frontend)
- CORS configuré avec origins autorisées
- TypeScript en mode strict sur tout le projet

## 👥 Personas utilisateurs

1. **Hélène** (35 ans, développeuse créative) - Journal quotidien avec mood trackers
2. **Delphine** (40 ans, ingénieure aéronautique) - Carnets de voyage avec photos
3. **Marc** (72 ans, reporter militant) - Reportages en temps réel

## 📄 Licence

[À définir]

## 🤝 Contribution

[À définir]

## 📞 Support

Pour toute question, consultez la documentation ou ouvrez une issue sur GitHub.

---

**Ithaka** - Capturez vos aventures, créez vos souvenirs ✨
