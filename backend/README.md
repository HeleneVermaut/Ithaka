# Ithaka Backend API

Backend REST API pour l'application Ithaka - une application de carnets de voyage et journal personnel.

## Technologies

- **Node.js**: v22.20.0
- **TypeScript**: v5.9.3
- **Express.js**: Framework web
- **PostgreSQL**: v17.5 (Base de données)
- **Sequelize**: ORM pour PostgreSQL
- **JWT**: Authentification par tokens
- **bcryptjs**: Hashing de mots de passe
- **SendGrid**: Service d'envoi d'emails
- **Helmet**: Sécurité des headers HTTP
- **Express Rate Limit**: Protection contre les abus
- **Joi**: Validation des requêtes

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- Node.js 22.20.0 ou supérieur
- npm 10.0.0 ou supérieur
- PostgreSQL 17.5 ou supérieur

## Installation

1. Cloner le repository et naviguer vers le dossier backend :

```bash
cd backend
```

2. Installer les dépendances :

```bash
npm install
```

3. Créer le fichier `.env` à partir du template :

```bash
cp .env.example .env
```

4. Configurer les variables d'environnement dans `.env` (voir section suivante)

## Configuration de la base de données

### Création de la base de données PostgreSQL

1. Connectez-vous à PostgreSQL :

```bash
psql -U postgres
```

2. Créez la base de données et l'utilisateur :

```sql
CREATE DATABASE ithaka_db;
CREATE USER ithaka_user WITH PASSWORD 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE ithaka_db TO ithaka_user;
\q
```

3. Mettez à jour le `DATABASE_URL` dans votre fichier `.env` :

```
DATABASE_URL=postgres://ithaka_user:votre_mot_de_passe_securise@localhost:5432/ithaka_db
```

## Variables d'environnement

Toutes les variables d'environnement requises sont listées dans `.env.example`. Voici les plus importantes :

### Variables obligatoires

- `NODE_ENV`: Environnement (development, production)
- `PORT`: Port du serveur (défaut: 3000)
- `DATABASE_URL`: URL de connexion PostgreSQL
- `JWT_SECRET`: Secret pour les access tokens (minimum 64 caractères)
- `JWT_REFRESH_SECRET`: Secret pour les refresh tokens (minimum 64 caractères)

### Génération des secrets JWT

Pour générer des secrets sécurisés, utilisez cette commande Node.js :

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Exécutez cette commande deux fois pour générer `JWT_SECRET` et `JWT_REFRESH_SECRET`.

### Variables optionnelles

- `JWT_ACCESS_EXPIRATION`: Durée de vie des access tokens (défaut: 15m)
- `JWT_REFRESH_EXPIRATION`: Durée de vie des refresh tokens (défaut: 7d)
- `ALLOWED_ORIGINS`: Origines CORS autorisées (séparées par des virgules)
- `LOG_LEVEL`: Niveau de logs (debug, info, warn, error)
- `SENDGRID_API_KEY`: Clé API SendGrid pour l'envoi d'emails (requis pour reset password)
- `SENDGRID_FROM_EMAIL`: Email d'envoi SendGrid (défaut: noreply@ithaka.com)
- `FRONTEND_URL`: URL du frontend pour les liens dans les emails
- `COOKIE_SECRET`: Secret pour signer les cookies (minimum 32 caractères)

## Scripts npm disponibles

### Développement

```bash
npm run dev
```

Lance le serveur en mode développement avec rechargement automatique (hot-reload).
Le serveur redémarre automatiquement lorsque vous modifiez les fichiers.

### Build

```bash
npm run build
```

Compile le code TypeScript en JavaScript dans le dossier `dist/`.

### Production

```bash
npm start
```

Lance le serveur en mode production (nécessite d'avoir compilé avec `npm run build`).

### Vérification de types

```bash
npm run type-check
```

Vérifie les types TypeScript sans compiler le code.

### Linting

```bash
npm run lint
```

Vérifie la qualité du code avec ESLint.

## Structure du projet

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Configuration Sequelize et PostgreSQL
│   ├── controllers/             # Contrôleurs (logique métier)
│   ├── middleware/
│   │   ├── authMiddleware.ts    # Middleware d'authentification JWT
│   │   └── errorHandler.ts      # Gestionnaire d'erreurs global
│   ├── models/                  # Modèles Sequelize (tables DB)
│   ├── routes/
│   │   └── index.ts             # Routes centralisées
│   ├── services/                # Services (logique réutilisable)
│   ├── utils/
│   │   ├── jwt.ts               # Utilitaires JWT
│   │   └── logger.ts            # Système de logs
│   ├── app.ts                   # Configuration Express
│   └── server.ts                # Point d'entrée de l'application
├── .env                         # Variables d'environnement (non versionné)
├── .env.example                 # Template des variables d'environnement
├── .sequelizerc                 # Configuration Sequelize CLI
├── tsconfig.json                # Configuration TypeScript
└── package.json                 # Dépendances et scripts
```

## Architecture

### Flux de requête

1. **Client** → Envoie une requête HTTP
2. **Middleware CORS** → Vérifie l'origine
3. **Body Parser** → Parse le JSON
4. **Cookie Parser** → Parse les cookies (JWT)
5. **Auth Middleware** → Vérifie le JWT (si route protégée)
6. **Route Handler** → Traite la requête
7. **Controller** → Logique métier
8. **Service** → Interactions avec la DB
9. **Response** → Retourne JSON au client

### Sécurité

#### JWT Authentication

Les tokens JWT sont stockés dans des cookies httpOnly pour prévenir les attaques XSS :

- **Access Token**: Valide 15 minutes, utilisé pour l'authentification
- **Refresh Token**: Valide 7 jours, utilisé pour renouveler l'access token

#### Protection des mots de passe

- Hashing avec bcryptjs (salt rounds: 10)
- Jamais stockés en clair
- Validés côté serveur avant hashing

#### Validation des entrées

- Joi pour la validation des schémas
- Sanitization des inputs
- Protection contre SQL injection (Sequelize parameterized queries)

## Endpoints API

### Health Check

```
GET /health
```

Vérifie que le serveur fonctionne correctement.

### API Root

```
GET /api
```

Retourne les informations sur l'API et les endpoints disponibles.

### Routes Authentification (US01 - IMPLEMENTEES)

- `POST /api/auth/register` - Inscription utilisateur
- `POST /api/auth/login` - Connexion utilisateur
- `POST /api/auth/logout` - Déconnexion utilisateur
- `POST /api/auth/refresh` - Renouvellement du token
- `POST /api/auth/forgot-password` - Demande de réinitialisation mot de passe
- `GET /api/auth/verify-reset-token` - Vérification token de réinitialisation
- `POST /api/auth/reset-password` - Réinitialisation mot de passe

### Routes Gestion Utilisateur (US01 - IMPLEMENTEES)

- `GET /api/users/profile` - Récupération profil utilisateur
- `PUT /api/users/profile` - Modification profil utilisateur
- `PUT /api/users/password` - Changement mot de passe

### Routes à venir (US02+)

- `GET /api/notebooks` - Liste des carnets
- `POST /api/notebooks` - Créer un carnet
- `GET /api/notebooks/:id` - Détails d'un carnet
- `POST /api/pages` - Créer une page
- `POST /api/elements` - Ajouter un élément (texte, image)
- `POST /api/export/:notebookId` - Exporter en PDF

**Documentation API complète:** Voir `/docs/API-US01-Authentication.md`

## Logs

Le système de logs utilise différents niveaux :

- **debug**: Informations détaillées pour le développement
- **info**: Informations générales sur le flux de l'application
- **warn**: Avertissements sur des situations potentiellement problématiques
- **error**: Erreurs nécessitant une attention

Configurer le niveau avec la variable `LOG_LEVEL` dans `.env`.

## Gestion des erreurs

L'application utilise un système de gestion d'erreurs centralisé :

- Les erreurs opérationnelles (attendues) retournent des messages clairs au client
- Les erreurs de programmation (bugs) sont loguées mais retournent un message générique
- Les stack traces ne sont jamais exposées en production

### Exemple d'utilisation

```typescript
import { AppError } from './middleware/errorHandler';

// Erreur opérationnelle (400 Bad Request)
throw new AppError('Email already exists', 400);

// Erreur d'autorisation (403 Forbidden)
throw new AppError('You do not have permission', 403);
```

## Base de données

### Connexions

L'application utilise un pool de connexions Sequelize :

- **Max connections**: 20
- **Min connections**: 0
- **Connection timeout**: 30 secondes
- **Idle timeout**: 10 secondes

### Migrations

Pour créer une migration :

```bash
npx sequelize-cli migration:generate --name nom-de-la-migration
```

Pour exécuter les migrations :

```bash
npx sequelize-cli db:migrate
```

Pour annuler la dernière migration :

```bash
npx sequelize-cli db:migrate:undo
```

## Développement

### Bonnes pratiques

1. **Toujours** valider les inputs avec Joi
2. **Toujours** hasher les mots de passe avec bcryptjs
3. **Toujours** utiliser des requêtes paramétrées (Sequelize le fait automatiquement)
4. **Jamais** stocker de secrets dans le code (utiliser .env)
5. **Jamais** loguer d'informations sensibles (mots de passe, tokens)

### Conventions de nommage

- **Fonctions**: camelCase avec verbe + substantif (`getUserById`, `createNotebook`)
- **Variables**: camelCase (`userId`, `notebookData`)
- **Classes**: PascalCase (`UserController`, `AuthService`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `JWT_SECRET`)

### Documentation du code

Tous les fichiers incluent des commentaires JSDoc expliquant :

- La fonctionnalité du module
- Les paramètres des fonctions
- Les types de retour
- Des exemples d'utilisation
- Les considérations de sécurité

## Dépannage

### Le serveur ne démarre pas

1. Vérifiez que PostgreSQL est démarré :
   ```bash
   pg_ctl status
   ```

2. Vérifiez les credentials dans `.env`

3. Vérifiez les logs pour identifier l'erreur

### Erreur de connexion à la base de données

1. Testez la connexion PostgreSQL :
   ```bash
   psql -U ithaka_user -d ithaka_db
   ```

2. Vérifiez que l'utilisateur a les permissions :
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE ithaka_db TO ithaka_user;
   ```

### Erreurs TypeScript

Exécutez la vérification de types :
```bash
npm run type-check
```

## Support

Pour toute question ou problème, consultez :

- La documentation TypeScript : https://www.typescriptlang.org/docs/
- La documentation Express : https://expressjs.com/
- La documentation Sequelize : https://sequelize.org/docs/v6/
- La documentation PostgreSQL : https://www.postgresql.org/docs/

## License

ISC
