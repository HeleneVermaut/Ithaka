# API Documentation US01 - Authentication & User Management

## Overview

Cette documentation couvre tous les endpoints d'authentification et de gestion utilisateur implémentés dans l'US01.

**Base URL:** `http://localhost:3000/api`

**Version:** 1.0.0

**Date:** 27 octobre 2024

---

## Table des Matières

1. [Authentification](#authentification)
2. [Rate Limiting](#rate-limiting)
3. [Format des Réponses](#format-des-réponses)
4. [Endpoints Authentication](#endpoints-authentication)
5. [Endpoints User Management](#endpoints-user-management)
6. [Codes d'Erreur](#codes-derreur)
7. [Exemples d'Utilisation](#exemples-dutilisation)

---

## Authentification

### Stratégie JWT

L'API utilise des JSON Web Tokens (JWT) stockés dans des cookies httpOnly pour l'authentification sécurisée.

#### Cookies

| Cookie | Durée | Usage |
|--------|-------|-------|
| `accessToken` | 15 minutes | Authentification des requêtes API |
| `refreshToken` | 7 jours | Renouvellement des access tokens |

#### Sécurité

- `httpOnly: true` - Inaccessible en JavaScript (protection XSS)
- `secure: true` - HTTPS uniquement en production
- `sameSite: 'strict'` - Protection CSRF

---

## Rate Limiting

Pour protéger l'API contre les abus, des limites de taux sont appliquées par IP:

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| `/api/auth/register` | 3 requêtes | 1 heure |
| `/api/auth/login` | 5 tentatives | 15 minutes |
| `/api/auth/forgot-password` | 3 requêtes | 1 heure |
| `/api/auth/refresh` | 20 requêtes | 15 minutes |
| `/api/users/profile` (PUT) | 10 mises à jour | 1 heure |
| `/api/users/password` (PUT) | 5 changements | 24 heures |
| Général | 100 requêtes | 15 minutes |

**Réponse Rate Limit Dépassé (429):**
```json
{
  "status": "fail",
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "retryAfter": "900"
}
```

---

## Format des Réponses

### Succès (2xx)

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "user": { ... }
}
```

### Erreur (4xx/5xx)

```json
{
  "status": "fail",
  "statusCode": 400,
  "message": "Detailed error message"
}
```

---

## Endpoints Authentication

### 1. POST /api/auth/register

Inscription d'un nouvel utilisateur.

**URL:** `/api/auth/register`

**Méthode:** `POST`

**Auth requise:** Non

**Rate Limit:** 3 req/heure

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "pseudo": "johndoe",
  "bio": "Travel enthusiast",
  "avatarBase64": "data:image/jpeg;base64,..."
}
```

**Champs requis:**
- `email` (string, format email valide, max 255 chars)
- `password` (string, min 8 chars, majuscule, minuscule, chiffre)
- `firstName` (string, 2-100 chars)
- `lastName` (string, 2-100 chars)

**Champs optionnels:**
- `pseudo` (string, 3-50 chars, alphanumeric, unique)
- `bio` (string, max 160 chars)
- `avatarBase64` (string, max 375KB en base64)

**Réponse Succès (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "pseudo": "johndoe",
    "bio": "Travel enthusiast",
    "isEmailVerified": false,
    "createdAt": "2024-10-27T10:30:00.000Z",
    "updatedAt": "2024-10-27T10:30:00.000Z"
  }
}
```

**Cookies définis:**
- `accessToken` (httpOnly, 15min)
- `refreshToken` (httpOnly, 7j)

**Erreurs possibles:**
- `400` - Validation échouée
- `409` - Email ou pseudo déjà utilisé
- `429` - Trop de tentatives

**Exemple cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

---

### 2. POST /api/auth/login

Connexion avec email et mot de passe.

**URL:** `/api/auth/login`

**Méthode:** `POST`

**Auth requise:** Non

**Rate Limit:** 5 tentatives/15min

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "pseudo": "johndoe",
    "lastLoginAt": "2024-10-27T10:30:00.000Z"
  }
}
```

**Cookies définis:**
- `accessToken` (httpOnly, 15min)
- `refreshToken` (httpOnly, 7j)

**Erreurs possibles:**
- `401` - Email ou mot de passe incorrect
- `429` - Trop de tentatives (bloquer 15min)

**Exemple cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

---

### 3. POST /api/auth/logout

Déconnexion de l'utilisateur.

**URL:** `/api/auth/logout`

**Méthode:** `POST`

**Auth requise:** Oui (JWT)

**Rate Limit:** 100 req/15min

**Body:** Aucun

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Cookies supprimés:**
- `accessToken`
- `refreshToken`

**Exemple cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

---

### 4. POST /api/auth/refresh

Renouvellement de l'access token.

**URL:** `/api/auth/refresh`

**Méthode:** `POST`

**Auth requise:** Refresh token requis

**Rate Limit:** 20 req/15min

**Body:** Aucun

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Access token refreshed successfully"
}
```

**Cookie mis à jour:**
- `accessToken` (nouveau token, 15min)

**Erreurs possibles:**
- `401` - Refresh token manquant ou expiré

**Exemple cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

---

### 5. POST /api/auth/forgot-password

Demande de réinitialisation du mot de passe.

**URL:** `/api/auth/forgot-password`

**Méthode:** `POST`

**Auth requise:** Non

**Rate Limit:** 3 req/heure

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "If your email is registered, you will receive a password reset link"
}
```

**Note:** Retourne toujours succès pour ne pas révéler si l'email existe (sécurité).

**Email envoyé:** Lien de réinitialisation valide 1 heure
- Format: `http://localhost:5173/reset-password?token=XXX&email=user@example.com`

**Exemple cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

### 6. GET /api/auth/verify-reset-token

Vérification de la validité du token de réinitialisation.

**URL:** `/api/auth/verify-reset-token`

**Méthode:** `GET`

**Auth requise:** Non

**Rate Limit:** 100 req/15min

**Query Params:**
- `token` (string, requis)
- `email` (string, requis)

**Exemple:** `/api/auth/verify-reset-token?token=abc123&email=user@example.com`

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "canResetPassword": true
}
```

**Erreurs possibles:**
- `400` - Token ou email manquant
- `401` - Token invalide ou expiré

**Exemple cURL:**
```bash
curl -X GET "http://localhost:3000/api/auth/verify-reset-token?token=abc123&email=test@example.com"
```

---

### 7. POST /api/auth/reset-password

Réinitialisation du mot de passe avec token.

**URL:** `/api/auth/reset-password`

**Méthode:** `POST`

**Auth requise:** Non

**Rate Limit:** 100 req/15min

**Body:**
```json
{
  "token": "abc123def456",
  "email": "user@example.com",
  "newPassword": "NewSecurePass123",
  "confirmPassword": "NewSecurePass123"
}
```

**Validation:**
- `newPassword`: min 8 chars, majuscule, minuscule, chiffre
- `confirmPassword`: doit correspondre à newPassword

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Password reset successfully. Please login with your new password."
}
```

**Erreurs possibles:**
- `400` - Mots de passe ne correspondent pas
- `401` - Token invalide ou expiré

**Exemple cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123",
    "email": "test@example.com",
    "newPassword": "NewPass123",
    "confirmPassword": "NewPass123"
  }'
```

---

## Endpoints User Management

### 8. GET /api/users/profile

Récupération du profil utilisateur.

**URL:** `/api/users/profile`

**Méthode:** `GET`

**Auth requise:** Oui (JWT)

**Rate Limit:** 100 req/15min

**Body:** Aucun

**Réponse Succès (200):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "pseudo": "johndoe",
    "bio": "Travel enthusiast",
    "avatarBase64": "data:image/jpeg;base64,...",
    "isEmailVerified": false,
    "lastLoginAt": "2024-10-27T10:30:00.000Z",
    "createdAt": "2024-10-20T08:00:00.000Z",
    "updatedAt": "2024-10-27T10:30:00.000Z"
  }
}
```

**Erreurs possibles:**
- `401` - Non authentifié
- `404` - Utilisateur non trouvé

**Exemple cURL:**
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -b cookies.txt
```

---

### 9. PUT /api/users/profile

Mise à jour du profil utilisateur.

**URL:** `/api/users/profile`

**Méthode:** `PUT`

**Auth requise:** Oui (JWT)

**Rate Limit:** 10 mises à jour/heure

**Body (tous les champs sont optionnels):**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "pseudo": "janesmith",
  "bio": "Designer and traveler",
  "avatarBase64": "data:image/jpeg;base64,..."
}
```

**Validation:**
- Au moins un champ doit être fourni
- `firstName`: 2-100 chars
- `lastName`: 2-100 chars
- `pseudo`: 3-50 chars, alphanumeric, unique
- `bio`: max 160 chars
- `avatarBase64`: max 375KB

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "pseudo": "janesmith",
    "bio": "Designer and traveler",
    "updatedAt": "2024-10-27T11:00:00.000Z"
  }
}
```

**Erreurs possibles:**
- `400` - Aucun champ fourni ou validation échouée
- `401` - Non authentifié
- `409` - Pseudo déjà utilisé

**Exemple cURL:**
```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "pseudo": "janesmith"
  }'
```

---

### 10. PUT /api/users/password

Changement du mot de passe utilisateur.

**URL:** `/api/users/password`

**Méthode:** `PUT`

**Auth requise:** Oui (JWT)

**Rate Limit:** 5 changements/24h

**Body:**
```json
{
  "oldPassword": "CurrentPass123",
  "newPassword": "NewSecurePass456",
  "confirmPassword": "NewSecurePass456"
}
```

**Validation:**
- `newPassword`: min 8 chars, majuscule, minuscule, chiffre
- `confirmPassword`: doit correspondre à newPassword
- Nouveau mot de passe doit être différent de l'ancien

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Password changed successfully. You have been logged out from other sessions."
}
```

**Note:** Toutes les autres sessions seront invalidées.

**Erreurs possibles:**
- `400` - Validation échouée ou mots de passe ne correspondent pas
- `401` - Ancien mot de passe incorrect ou non authentifié

**Exemple cURL:**
```bash
curl -X PUT http://localhost:3000/api/users/password \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "OldPass123",
    "newPassword": "NewPass456",
    "confirmPassword": "NewPass456"
  }'
```

---

## Codes d'Erreur

| Code | Signification | Description |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée avec succès |
| 400 | Bad Request | Données de requête invalides |
| 401 | Unauthorized | Authentification requise ou échouée |
| 403 | Forbidden | Permissions insuffisantes |
| 404 | Not Found | Ressource non trouvée |
| 409 | Conflict | Ressource existe déjà (email/pseudo) |
| 429 | Too Many Requests | Rate limit dépassé |
| 500 | Internal Server Error | Erreur serveur |

---

## Exemples d'Utilisation

### Flux Complet d'Inscription et Utilisation

```bash
# 1. Inscription
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "demo@example.com",
    "password": "DemoPass123",
    "firstName": "Demo",
    "lastName": "User"
  }'

# 2. Récupération du profil
curl -X GET http://localhost:3000/api/users/profile \
  -b cookies.txt

# 3. Mise à jour du profil
curl -X PUT http://localhost:3000/api/users/profile \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "pseudo": "demouser",
    "bio": "Je teste l API"
  }'

# 4. Changement de mot de passe
curl -X PUT http://localhost:3000/api/users/password \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "DemoPass123",
    "newPassword": "NewDemoPass456",
    "confirmPassword": "NewDemoPass456"
  }'

# 5. Déconnexion
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

### Flux de Réinitialisation de Mot de Passe

```bash
# 1. Demande de réinitialisation
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com"}'

# 2. Vérification du token (depuis l'email)
curl -X GET "http://localhost:3000/api/auth/verify-reset-token?token=TOKEN_FROM_EMAIL&email=demo@example.com"

# 3. Réinitialisation du mot de passe
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_EMAIL",
    "email": "demo@example.com",
    "newPassword": "NewResetPass123",
    "confirmPassword": "NewResetPass123"
  }'

# 4. Connexion avec nouveau mot de passe
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "demo@example.com",
    "password": "NewResetPass123"
  }'
```

---

## Configuration Requise

### Variables d'Environnement

Créer un fichier `.env` à la racine du projet backend:

```bash
# Environment
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ithaka_db

# JWT Secrets (minimum 32 caractères random)
JWT_SECRET=your-super-secret-access-token-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Cookies
COOKIE_SECRET=your-cookie-secret-key-change-this

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@ithaka.com

# Frontend
FRONTEND_URL=http://localhost:5173

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001
```

### Installation et Démarrage

```bash
# Installation des dépendances
cd backend
npm install

# Configuration de la base de données
# S'assurer que PostgreSQL est démarré

# Démarrage du serveur
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

---

## Notes de Sécurité

1. **HTTPS obligatoire en production** - Les cookies Secure nécessitent HTTPS
2. **Secrets JWT forts** - Minimum 32 caractères aléatoires
3. **Rate limiting actif** - Protection contre brute force
4. **Validation serveur stricte** - Ne jamais faire confiance au client
5. **Cookies httpOnly** - Protection XSS
6. **SameSite Strict** - Protection CSRF
7. **Bcrypt pour passwords** - Hash sécurisé avec salt
8. **Tokens de reset hashés** - Ne jamais stocker en clair
9. **CORS configuré** - Seulement origins autorisées
10. **Helmet activé** - Headers de sécurité HTTP

---

## Support

Pour toute question ou problème:
- **Issues:** GitHub repository issues
- **Email:** support@ithaka.com
- **Documentation:** Cette documentation

---

**Version:** 1.0.0
**Dernière mise à jour:** 27 octobre 2024
**Statut:** Implémentation complète US01
