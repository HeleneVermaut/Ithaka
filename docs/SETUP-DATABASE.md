# Guide de Configuration - Base de Données PostgreSQL

Ce guide explique comment configurer et gérer la base de données PostgreSQL pour Ithaka.

---

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Commandes utiles](#commandes-utiles)
- [Dépannage](#dépannage)

---

## ✅ Prérequis

- Docker Desktop installé et démarré
- Node.js >= 22.20.0
- npm >= 10.0.0

---

## 🐳 Installation avec Docker

### 1. Démarrer Docker Desktop

Lancez Docker Desktop depuis vos Applications et attendez qu'il soit complètement démarré.

### 2. Créer le conteneur PostgreSQL

Deux options :

#### Option A : Docker Compose (Recommandé)

```bash
# Depuis la racine du projet
docker-compose up -d
```

#### Option B : Docker CLI

```bash
docker run --name ithaka-postgres \
  -e POSTGRES_USER=ithaka_user \
  -e POSTGRES_PASSWORD=ithaka_password \
  -e POSTGRES_DB=ithaka_db \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### 3. Vérifier que le conteneur fonctionne

```bash
docker ps
```

Vous devriez voir :
```
CONTAINER ID   IMAGE                COMMAND                  STATUS         PORTS                    NAMES
e1585ca826ab   postgres:15-alpine   "docker-entrypoint.s…"   Up 2 minutes   0.0.0.0:5432->5432/tcp   ithaka-postgres
```

---

## ⚙️ Configuration

### 1. Vérifier le fichier .env backend

Le fichier `backend/.env` doit contenir :

```env
# Database Configuration
DATABASE_URL=postgresql://ithaka_user:ithaka_password@localhost:5432/ithaka_db

# JWT Configuration
JWT_SECRET=your-super-secret-access-token-key-change-this-in-production-32chars-minimum
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-different-from-access-32chars-minimum

# SendGrid (optionnel pour dev)
SENDGRID_API_KEY=your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=noreply@ithaka.com

# Environment
NODE_ENV=development
PORT=3000
```

### 2. Synchroniser le modèle User avec la base de données

```bash
cd backend
npm run db:sync
```

Sortie attendue :
```
✓ Database connection established successfully
✓ Database synchronized (tables updated)
Tables in database: users
User model fields: id, email, passwordHash, firstName, lastName, pseudo, bio, avatarBase64, ...
✓ Database synchronization completed successfully!
```

### 3. Démarrer le serveur backend

```bash
cd backend
npm run dev
```

Sortie attendue :
```
✓ Database connection established successfully
✓ Server is running successfully on port 3000
✓ Health check available at: http://localhost:3000/health
✓ API available at: http://localhost:3000/api
```

### 4. Tester la connexion

```bash
curl http://localhost:3000/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2025-10-28T09:33:05.900Z",
  "uptime": 115.299707167,
  "environment": "development"
}
```

---

## 🛠️ Commandes Utiles

### Script de gestion DB

Un script pratique est disponible : `scripts/db-manage.sh`

```bash
# Démarrer PostgreSQL
./scripts/db-manage.sh start

# Arrêter PostgreSQL
./scripts/db-manage.sh stop

# Redémarrer PostgreSQL
./scripts/db-manage.sh restart

# Voir le statut
./scripts/db-manage.sh status

# Voir les logs
./scripts/db-manage.sh logs

# Accéder au shell PostgreSQL
./scripts/db-manage.sh shell

# Créer une sauvegarde
./scripts/db-manage.sh backup

# Restaurer une sauvegarde
./scripts/db-manage.sh restore ./backups/ithaka_backup_20241027.sql

# Réinitialiser la base (⚠️ SUPPRIME TOUTES LES DONNÉES)
./scripts/db-manage.sh reset
```

### Commandes Docker manuelles

```bash
# Démarrer le conteneur
docker start ithaka-postgres

# Arrêter le conteneur
docker stop ithaka-postgres

# Voir les logs
docker logs -f ithaka-postgres

# Accéder au shell PostgreSQL
docker exec -it ithaka-postgres psql -U ithaka_user -d ithaka_db

# Supprimer le conteneur (⚠️ SUPPRIME LES DONNÉES)
docker rm -f ithaka-postgres
```

### Commandes npm backend

```bash
# Synchroniser la DB (créer/mettre à jour tables)
npm run db:sync

# Synchroniser avec FORCE (⚠️ SUPPRIME TOUT)
npm run db:sync:force

# Démarrer le serveur en mode dev
npm run dev

# Vérifier les types TypeScript
npm run type-check

# Build pour production
npm run build
```

---

## 🔍 Vérification de l'intégration

### 1. Structure de la base de données

Connectez-vous à PostgreSQL :
```bash
docker exec -it ithaka-postgres psql -U ithaka_user -d ithaka_db
```

Vérifiez la table users :
```sql
\dt                    -- Liste des tables
\d users              -- Structure de la table users
SELECT COUNT(*) FROM users;  -- Nombre d'utilisateurs
```

### 2. Test des endpoints API

```bash
# Health check
curl http://localhost:3000/health

# API root
curl http://localhost:3000/api

# Endpoints d'authentification (après création composants frontend)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

---

## 🐛 Dépannage

### Erreur : "Cannot connect to Docker daemon"

**Problème** : Docker Desktop n'est pas démarré

**Solution** :
1. Lancez Docker Desktop
2. Attendez l'icône Docker dans la barre de menu
3. Relancez la commande

### Erreur : "port 5432 already in use"

**Problème** : Un autre service PostgreSQL utilise déjà le port

**Solutions** :
```bash
# Option 1 : Trouver et arrêter le service qui utilise le port
lsof -i :5432
kill <PID>

# Option 2 : Changer le port dans docker-compose.yml
ports:
  - "5433:5432"  # Utiliser 5433 au lieu de 5432

# Puis mettre à jour DATABASE_URL dans backend/.env
DATABASE_URL=postgresql://ithaka_user:ithaka_password@localhost:5433/ithaka_db
```

### Erreur : "DATABASE_URL is not defined"

**Problème** : Les variables d'environnement ne sont pas chargées

**Solution** :
1. Vérifiez que `backend/.env` existe
2. Vérifiez que `DATABASE_URL` est défini dans le fichier
3. Redémarrez le serveur backend

### Erreur : "password authentication failed for user"

**Problème** : Mauvaises credentials PostgreSQL

**Solution** :
```bash
# Supprimer le conteneur existant
docker rm -f ithaka-postgres

# Recréer avec les bonnes credentials
docker run --name ithaka-postgres \
  -e POSTGRES_USER=ithaka_user \
  -e POSTGRES_PASSWORD=ithaka_password \
  -e POSTGRES_DB=ithaka_db \
  -p 5432:5432 \
  -d postgres:15-alpine

# Attendre 5 secondes
sleep 5

# Resynchroniser
cd backend && npm run db:sync
```

### Erreur : "relation 'users' does not exist"

**Problème** : La table users n'a pas été créée

**Solution** :
```bash
cd backend
npm run db:sync
```

### Warning : "API key does not start with 'SG.'"

**Problème** : Clé SendGrid non configurée (normal en développement)

**Solution** :
- **En développement** : Vous pouvez ignorer ce warning
- **En production** : Configurez une vraie clé SendGrid :
  1. Créez un compte sur [SendGrid](https://sendgrid.com)
  2. Générez une API key
  3. Ajoutez-la dans `backend/.env` :
     ```env
     SENDGRID_API_KEY=SG.votre-clé-ici
     ```

---

## 📊 Architecture de la base de données

### Table `users`

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | UUID | PRIMARY KEY | Identifiant unique |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email de connexion |
| `password_hash` | VARCHAR(255) | NOT NULL | Hash bcrypt du mot de passe |
| `first_name` | VARCHAR(100) | NOT NULL | Prénom |
| `last_name` | VARCHAR(100) | NOT NULL | Nom |
| `pseudo` | VARCHAR(50) | UNIQUE | Pseudo optionnel |
| `bio` | VARCHAR(160) | | Biographie optionnelle |
| `avatar_base64` | TEXT | | Photo de profil en base64 |
| `is_email_verified` | BOOLEAN | DEFAULT false | Email vérifié ? |
| `password_reset_token` | VARCHAR(255) | | Token de réinitialisation |
| `password_reset_expiry` | TIMESTAMP | | Expiration du token |
| `last_login_at` | TIMESTAMP | | Dernière connexion |
| `last_logout_at` | TIMESTAMP | | Dernière déconnexion |
| `created_at` | TIMESTAMP | NOT NULL | Date de création |
| `updated_at` | TIMESTAMP | NOT NULL | Date de mise à jour |
| `deleted_at` | TIMESTAMP | | Date de suppression (soft delete) |

### Index

- `users_email_unique` : Index unique sur `email`
- `users_pseudo_unique` : Index unique sur `pseudo` (si non null)
- `users_password_reset_expiry_idx` : Index sur `password_reset_expiry`
- `users_created_at_idx` : Index sur `created_at`
- `users_last_login_at_idx` : Index sur `last_login_at`

---

## ✅ Checklist Setup Complet

- [x] Docker Desktop installé et démarré
- [x] Conteneur PostgreSQL créé et démarré
- [x] Fichier `.env` configuré avec DATABASE_URL
- [x] Table `users` créée avec `npm run db:sync`
- [x] Serveur backend démarré avec `npm run dev`
- [x] Endpoint `/health` répond correctement
- [x] Endpoint `/api` liste les routes disponibles
- [ ] SendGrid configuré (optionnel pour dev)
- [ ] Tests d'authentification effectués

---

## 🚀 Prochaines étapes

1. **Finaliser les composants frontend** (4-6h)
   - LoginForm, RegisterForm, ProfileSettings, etc.

2. **Écrire les tests** (8-12h)
   - Tests unitaires AuthService
   - Tests d'intégration API
   - Tests E2E

3. **Configuration production**
   - Générer des JWT secrets forts
   - Configurer SendGrid réel
   - Configurer HTTPS

---

**Documentation créée le** : 2025-10-28
**Dernière mise à jour** : 2025-10-28
**Version** : 1.0.0
