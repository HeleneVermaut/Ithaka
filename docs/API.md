# API Documentation - Ithaka

Documentation complète de l'API REST pour l'application Ithaka.

## Base URL

```
http://localhost:3000/api
```

## Authentication

L'API utilise des JSON Web Tokens (JWT) stockés dans des cookies httpOnly pour l'authentification.

### Cookies
- `accessToken`: Token d'accès (expiration: 15 minutes)
- `refreshToken`: Token de rafraîchissement (expiration: 7 jours)

### Headers
```
Content-Type: application/json
```

---

## Endpoints

### Health Check

#### GET /health
Vérifier l'état de santé du serveur.

**Response 200 OK**
```json
{
  "status": "ok",
  "timestamp": "2025-10-27T10:30:00.000Z"
}
```

---

## Authentication Endpoints

### POST /api/auth/register
Créer un nouveau compte utilisateur.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "pseudo": "johndoe"
}
```

**Response 201 Created**
```json
{
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "pseudo": "johndoe",
    "createdAt": "2025-10-27T10:00:00.000Z"
  }
}
```

**Cookies Set**
- `accessToken` (httpOnly, Secure, SameSite=Strict)
- `refreshToken` (httpOnly, Secure, SameSite=Strict)

---

### POST /api/auth/login
Se connecter avec email et mot de passe.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response 200 OK**
```json
{
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "pseudo": "johndoe"
  }
}
```

**Cookies Set**
- `accessToken` (httpOnly, Secure, SameSite=Strict)
- `refreshToken` (httpOnly, Secure, SameSite=Strict)

---

### POST /api/auth/logout
Se déconnecter (supprime les cookies JWT).

**Response 200 OK**
```json
{
  "message": "Déconnexion réussie"
}
```

**Cookies Cleared**
- `accessToken`
- `refreshToken`

---

### POST /api/auth/refresh
Rafraîchir le token d'accès avec le refresh token.

**Response 200 OK**
```json
{
  "message": "Token rafraîchi avec succès"
}
```

**Cookies Set**
- `accessToken` (nouveau token)

---

### POST /api/auth/forgot-password
Demander un lien de réinitialisation de mot de passe.

**Request Body**
```json
{
  "email": "user@example.com"
}
```

**Response 200 OK**
```json
{
  "message": "Email de réinitialisation envoyé"
}
```

---

### POST /api/auth/reset-password
Réinitialiser le mot de passe avec un token.

**Request Body**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response 200 OK**
```json
{
  "message": "Mot de passe réinitialisé avec succès"
}
```

---

## User Endpoints

### GET /api/users/profile
Obtenir le profil de l'utilisateur connecté.

**Authentication Required**: ✅

**Response 200 OK**
```json
{
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "pseudo": "johndoe",
    "profilePhoto": "data:image/jpeg;base64,...",
    "createdAt": "2025-10-27T10:00:00.000Z",
    "updatedAt": "2025-10-27T10:00:00.000Z"
  }
}
```

---

### PUT /api/users/profile
Mettre à jour le profil utilisateur.

**Authentication Required**: ✅

**Request Body**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "pseudo": "johndoe",
  "profilePhoto": "data:image/jpeg;base64,..."
}
```

**Response 200 OK**
```json
{
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "pseudo": "johndoe",
    "profilePhoto": "data:image/jpeg;base64,...",
    "updatedAt": "2025-10-27T10:30:00.000Z"
  }
}
```

---

### PUT /api/users/password
Changer le mot de passe.

**Authentication Required**: ✅

**Request Body**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

**Response 200 OK**
```json
{
  "message": "Mot de passe modifié avec succès"
}
```

---

## Notebook Endpoints

### GET /api/notebooks
Obtenir la liste des carnets avec pagination et filtres.

**Authentication Required**: ✅

**Query Parameters**
- `page` (number, default: 1): Numéro de page
- `limit` (number, default: 12): Nombre de carnets par page
- `sort` (string): Critère de tri (`date_desc`, `date_asc`, `alpha_asc`, `alpha_desc`, `pages_desc`)
- `type` (string): Filtrer par type (`Voyage`, `Daily`, `Reportage`)
- `status` (string): Filtrer par statut (`active`, `archived`)
- `search` (string): Recherche par titre

**Response 200 OK**
```json
{
  "notebooks": [
    {
      "id": "uuid-v4",
      "userId": "uuid-v4",
      "title": "Mon voyage au Japon",
      "description": "Souvenirs inoubliables de Tokyo et Kyoto",
      "type": "Voyage",
      "format": "A4",
      "orientation": "portrait",
      "pageCount": 15,
      "coverImageUrl": "https://...",
      "status": "active",
      "createdAt": "2025-10-27T10:00:00.000Z",
      "updatedAt": "2025-10-27T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "totalCount": 45,
    "totalPages": 4
  }
}
```

---

### POST /api/notebooks
Créer un nouveau carnet.

**Authentication Required**: ✅

**Request Body**
```json
{
  "title": "Mon voyage au Japon",
  "description": "Souvenirs inoubliables de Tokyo et Kyoto",
  "type": "Voyage",
  "format": "A4",
  "orientation": "portrait"
}
```

**Response 201 Created**
```json
{
  "notebook": {
    "id": "uuid-v4",
    "userId": "uuid-v4",
    "title": "Mon voyage au Japon",
    "description": "Souvenirs inoubliables de Tokyo et Kyoto",
    "type": "Voyage",
    "format": "A4",
    "orientation": "portrait",
    "dpi": 300,
    "pageCount": 0,
    "status": "active",
    "createdAt": "2025-10-27T10:00:00.000Z",
    "updatedAt": "2025-10-27T10:00:00.000Z"
  }
}
```

---

### GET /api/notebooks/:id
Obtenir les détails d'un carnet.

**Authentication Required**: ✅

**Response 200 OK**
```json
{
  "notebook": {
    "id": "uuid-v4",
    "userId": "uuid-v4",
    "title": "Mon voyage au Japon",
    "description": "Souvenirs inoubliables de Tokyo et Kyoto",
    "type": "Voyage",
    "format": "A4",
    "orientation": "portrait",
    "dpi": 300,
    "pageCount": 15,
    "coverImageUrl": "https://...",
    "status": "active",
    "createdAt": "2025-10-27T10:00:00.000Z",
    "updatedAt": "2025-10-27T10:00:00.000Z"
  }
}
```

---

### PUT /api/notebooks/:id
Mettre à jour un carnet.

**Authentication Required**: ✅

**Request Body**
```json
{
  "title": "Mon voyage au Japon (2024)",
  "description": "Mise à jour de la description"
}
```

**Response 200 OK**
```json
{
  "notebook": {
    "id": "uuid-v4",
    "title": "Mon voyage au Japon (2024)",
    "description": "Mise à jour de la description",
    "updatedAt": "2025-10-27T11:00:00.000Z"
  }
}
```

---

### POST /api/notebooks/:id/duplicate
Dupliquer un carnet avec toutes ses pages.

**Authentication Required**: ✅

**Response 201 Created**
```json
{
  "notebook": {
    "id": "new-uuid-v4",
    "title": "Mon voyage au Japon (Copie)",
    "pageCount": 15,
    "createdAt": "2025-10-27T11:00:00.000Z"
  }
}
```

---

### PUT /api/notebooks/:id/archive
Archiver un carnet.

**Authentication Required**: ✅

**Response 200 OK**
```json
{
  "notebook": {
    "id": "uuid-v4",
    "status": "archived",
    "archivedAt": "2025-10-27T11:00:00.000Z"
  }
}
```

---

### PUT /api/notebooks/:id/restore
Restaurer un carnet archivé.

**Authentication Required**: ✅

**Response 200 OK**
```json
{
  "notebook": {
    "id": "uuid-v4",
    "status": "active",
    "archivedAt": null
  }
}
```

---

### DELETE /api/notebooks/:id
Supprimer définitivement un carnet (doit être archivé).

**Authentication Required**: ✅

**Response 200 OK**
```json
{
  "message": "Carnet supprimé définitivement"
}
```

---

## Page Endpoints

### GET /api/notebooks/:id/pages
Obtenir toutes les pages d'un carnet.

**Authentication Required**: ✅

**Response 200 OK**
```json
{
  "pages": [
    {
      "id": "uuid-v4",
      "notebookId": "uuid-v4",
      "pageNumber": 1,
      "isCustomCover": true,
      "createdAt": "2025-10-27T10:00:00.000Z",
      "updatedAt": "2025-10-27T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/notebooks/:id/pages
Créer une nouvelle page dans un carnet.

**Authentication Required**: ✅

**Request Body**
```json
{
  "pageNumber": 2,
  "isCustomCover": false
}
```

**Response 201 Created**
```json
{
  "page": {
    "id": "uuid-v4",
    "notebookId": "uuid-v4",
    "pageNumber": 2,
    "isCustomCover": false,
    "createdAt": "2025-10-27T10:00:00.000Z",
    "updatedAt": "2025-10-27T10:00:00.000Z"
  }
}
```

---

### GET /api/pages/:pageId
Obtenir les détails d'une page.

**Authentication Required**: ✅

**Response 200 OK**
```json
{
  "page": {
    "id": "uuid-v4",
    "notebookId": "uuid-v4",
    "pageNumber": 1,
    "isCustomCover": true,
    "createdAt": "2025-10-27T10:00:00.000Z",
    "updatedAt": "2025-10-27T10:00:00.000Z"
  }
}
```

---

### GET /api/pages/:pageId/elements
Obtenir tous les éléments d'une page.

**Authentication Required**: ✅

**Response 200 OK**
```json
{
  "elements": [
    {
      "id": "uuid-v4",
      "pageId": "uuid-v4",
      "type": "text",
      "x": 50.0,
      "y": 100.0,
      "width": 150.0,
      "height": 30.0,
      "rotation": 0,
      "zIndex": 1,
      "content": {
        "text": "Bonjour le monde",
        "fontFamily": "Roboto",
        "fontSize": 24,
        "fill": "#000000",
        "textAlign": "left"
      },
      "style": {},
      "metadata": {},
      "createdAt": "2025-10-27T10:00:00.000Z",
      "updatedAt": "2025-10-27T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/pages/:pageId/elements
Créer ou mettre à jour plusieurs éléments en batch.

**Authentication Required**: ✅

**Request Body**
```json
{
  "elements": [
    {
      "id": "existing-uuid-v4",
      "type": "text",
      "x": 50.0,
      "y": 100.0,
      "width": 150.0,
      "height": 30.0,
      "rotation": 0,
      "zIndex": 1,
      "content": {
        "text": "Texte modifié",
        "fontFamily": "Roboto",
        "fontSize": 24,
        "fill": "#000000"
      }
    },
    {
      "type": "text",
      "x": 60.0,
      "y": 150.0,
      "width": 200.0,
      "height": 40.0,
      "rotation": 0,
      "zIndex": 2,
      "content": {
        "text": "Nouveau texte",
        "fontFamily": "Arial",
        "fontSize": 18,
        "fill": "#333333"
      }
    }
  ]
}
```

**Response 200 OK**
```json
{
  "elements": [
    {
      "id": "existing-uuid-v4",
      "updatedAt": "2025-10-27T11:00:00.000Z"
    },
    {
      "id": "new-uuid-v4",
      "createdAt": "2025-10-27T11:00:00.000Z"
    }
  ]
}
```

---

### PUT /api/elements/:elementId
Mettre à jour un élément unique.

**Authentication Required**: ✅

**Request Body**
```json
{
  "x": 55.0,
  "y": 105.0,
  "rotation": 15,
  "content": {
    "text": "Texte pivoté"
  }
}
```

**Response 200 OK**
```json
{
  "element": {
    "id": "uuid-v4",
    "x": 55.0,
    "y": 105.0,
    "rotation": 15,
    "updatedAt": "2025-10-27T11:00:00.000Z"
  }
}
```

---

### DELETE /api/elements/:elementId
Supprimer un élément.

**Authentication Required**: ✅

**Response 200 OK**
```json
{
  "message": "Élément supprimé avec succès"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "email",
      "message": "Email invalide"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Non authentifié"
}
```

### 403 Forbidden
```json
{
  "error": "Accès refusé"
}
```

### 404 Not Found
```json
{
  "error": "Ressource non trouvée"
}
```

### 500 Internal Server Error
```json
{
  "error": "Une erreur est survenue"
}
```

---

## Notes de développement

### Conventions de nommage
- Routes: kebab-case (`/api/user-profile`)
- JSON keys: camelCase (`firstName`, `createdAt`)
- Database tables: PascalCase (`Users`, `Notebooks`, `Pages`)

### Pagination
- Par défaut: 12 éléments par page
- Maximum: 100 éléments par page
- Format: `?page=1&limit=12`

### Filtrage et tri
- Utiliser des query parameters
- Exemples: `?sort=date_desc&type=Voyage&search=japon`

### Formats de date
- ISO 8601: `2025-10-27T10:00:00.000Z`
- Timezone: UTC

### Images
- Stockage: Base64 dans PostgreSQL
- Format accepté: `data:image/jpeg;base64,...`
- Limite de taille: À définir

---

Cette documentation sera mise à jour au fur et à mesure de l'implémentation des endpoints.
