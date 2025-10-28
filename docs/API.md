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

### POST /api/notebooks
Créer un nouveau carnet.

**Authentication Required**: ✅ (JWT via httpOnly cookie)

**Request Body**
```json
{
  "title": "Mon voyage au Japon",
  "description": "Souvenirs inoubliables de Tokyo et Kyoto",
  "type": "Voyage",
  "format": "A4",
  "orientation": "portrait",
  "dpi": 300,
  "coverImageUrl": "https://example.com/cover.jpg"
}
```

**Field Specifications**
- `title` (string, required): Titre du carnet (1-100 caractères)
- `description` (string, optional): Description (max 300 caractères)
- `type` (string, required): Type de carnet - valeurs possibles: `Voyage`, `Daily`, `Reportage`
- `format` (string, required): Format de page - valeurs possibles: `A4`, `A5`
- `orientation` (string, required): Orientation - valeurs possibles: `portrait`, `landscape`
- `dpi` (number, optional): Résolution d'impression (72-600, défaut: 300)
- `coverImageUrl` (string, optional): URL de l'image de couverture (max 2048 caractères, format URI valide)

**Response 201 Created**
```json
{
  "success": true,
  "message": "Notebook created successfully",
  "data": {
    "id": "uuid-v4",
    "userId": "uuid-v4",
    "title": "Mon voyage au Japon",
    "description": "Souvenirs inoubliables de Tokyo et Kyoto",
    "type": "Voyage",
    "format": "A4",
    "orientation": "portrait",
    "dpi": 300,
    "pageCount": 0,
    "coverImageUrl": "https://example.com/cover.jpg",
    "status": "active",
    "archivedAt": null,
    "permissions": {
      "id": "uuid-v4",
      "notebookId": "uuid-v4",
      "type": "private",
      "publicLink": null,
      "allowedEmails": [],
      "allowedUserIds": [],
      "createdAt": "2025-10-28T10:00:00.000Z",
      "updatedAt": "2025-10-28T10:00:00.000Z"
    },
    "owner": {
      "id": "uuid-v4",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-10-28T10:00:00.000Z",
    "updatedAt": "2025-10-28T10:00:00.000Z"
  }
}
```

**Error Responses**
- **400 Bad Request**: Validation error (champ manquant ou invalide)
- **401 Unauthorized**: Token JWT manquant ou invalide
- **500 Internal Server Error**: Erreur serveur

**cURL Example**
```bash
curl -X POST http://localhost:3000/api/notebooks \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your-jwt-token" \
  -d '{
    "title": "Châteaux de La Loire",
    "description": "Découverte des châteaux de la vallée de la Loire",
    "type": "Voyage",
    "format": "A4",
    "orientation": "portrait"
  }'
```

---

### GET /api/notebooks
Obtenir la liste des carnets avec pagination, filtres et tri.

**Authentication Required**: ✅ (JWT via httpOnly cookie)

**Query Parameters**
- `page` (number, optional, default: 1, min: 1): Numéro de page
- `limit` (number, optional, default: 12, min: 1, max: 100): Nombre de carnets par page
- `sort` (string, optional, default: 'createdAt'): Critère de tri
  - Valeurs possibles: `createdAt`, `updatedAt`, `title`, `pageCount`, `type`
- `order` (string, optional, default: 'DESC'): Ordre de tri
  - Valeurs possibles: `ASC`, `DESC`
- `type` (string, optional): Filtrer par type (valeurs séparées par virgule)
  - Exemples: `Voyage`, `Daily`, `Reportage`, `Voyage,Daily`
- `status` (string, optional, default: 'active'): Filtrer par statut
  - Valeurs possibles: `active`, `archived`, `all`
- `search` (string, optional): Recherche case-insensitive partielle dans le titre

**Response 200 OK**
```json
{
  "success": true,
  "data": {
    "notebooks": [
      {
        "id": "uuid-v4",
        "userId": "uuid-v4",
        "title": "Mon voyage au Japon",
        "description": "Souvenirs inoubliables de Tokyo et Kyoto",
        "type": "Voyage",
        "format": "A4",
        "orientation": "portrait",
        "dpi": 300,
        "pageCount": 15,
        "coverImageUrl": "https://example.com/cover.jpg",
        "status": "active",
        "archivedAt": null,
        "permissions": {
          "id": "uuid-v4",
          "notebookId": "uuid-v4",
          "type": "private"
        },
        "createdAt": "2025-10-28T10:00:00.000Z",
        "updatedAt": "2025-10-28T15:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 12,
      "total": 45,
      "totalPages": 4,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Pagination Metadata**
- `currentPage`: Page actuelle (1-indexed)
- `pageSize`: Nombre d'éléments par page
- `total`: Nombre total d'éléments correspondant aux filtres
- `totalPages`: Nombre total de pages (calculé: Math.ceil(total / pageSize))
- `hasNext`: Booléen indiquant si une page suivante existe
- `hasPrev`: Booléen indiquant si une page précédente existe

**Filter Examples**
```bash
# Tous les carnets actifs (défaut)
GET /api/notebooks

# Carnets de type Voyage uniquement
GET /api/notebooks?type=Voyage

# Carnets de voyage et quotidiens
GET /api/notebooks?type=Voyage,Daily

# Recherche par titre
GET /api/notebooks?search=Japon

# Page 2 avec 20 résultats
GET /api/notebooks?page=2&limit=20

# Tri par titre (A-Z)
GET /api/notebooks?sort=title&order=ASC

# Recherche + filtres + pagination
GET /api/notebooks?search=Loire&type=Voyage&page=1&limit=12&sort=createdAt&order=DESC
```

**Error Responses**
- **401 Unauthorized**: Token JWT manquant ou invalide
- **500 Internal Server Error**: Erreur serveur

**cURL Example**
```bash
curl -X GET "http://localhost:3000/api/notebooks?page=1&limit=12&type=Voyage&search=Japon" \
  -H "Cookie: accessToken=your-jwt-token"
```

---

### GET /api/notebooks/archived
Obtenir la liste des carnets archivés avec pagination.

**Authentication Required**: ✅ (JWT via httpOnly cookie)

**Important**: Cette route doit être placée AVANT `/api/notebooks/:id` dans Express pour éviter que "archived" soit interprété comme un ID.

**Query Parameters**
- `page` (number, optional, default: 1, min: 1): Numéro de page
- `limit` (number, optional, default: 12, min: 1, max: 100): Nombre de carnets par page

**Response 200 OK**
```json
{
  "success": true,
  "data": {
    "notebooks": [
      {
        "id": "uuid-v4",
        "userId": "uuid-v4",
        "title": "Ancien voyage",
        "description": "Voyage de 2023",
        "type": "Voyage",
        "format": "A4",
        "orientation": "portrait",
        "dpi": 300,
        "pageCount": 10,
        "status": "archived",
        "archivedAt": "2025-10-20T14:30:00.000Z",
        "permissions": {
          "id": "uuid-v4",
          "notebookId": "uuid-v4",
          "type": "private"
        },
        "createdAt": "2025-01-15T10:00:00.000Z",
        "updatedAt": "2025-10-20T14:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 12,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

**Error Responses**
- **401 Unauthorized**: Token JWT manquant ou invalide
- **500 Internal Server Error**: Erreur serveur

**cURL Example**
```bash
curl -X GET "http://localhost:3000/api/notebooks/archived?page=1&limit=12" \
  -H "Cookie: accessToken=your-jwt-token"
```

**Note**: Les carnets archivés sont exclus de la liste par défaut (`GET /api/notebooks`). Utilisez `status=all` pour inclure tous les carnets ou cette route pour uniquement les carnets archivés.

---

### GET /api/notebooks/:id
Obtenir les détails d'un carnet spécifique.

**Authentication Required**: ✅ (JWT via httpOnly cookie)

**URL Parameters**
- `id` (string, required): UUID du carnet

**Response 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "userId": "uuid-v4",
    "title": "Mon voyage au Japon",
    "description": "Souvenirs inoubliables de Tokyo et Kyoto",
    "type": "Voyage",
    "format": "A4",
    "orientation": "portrait",
    "dpi": 300,
    "pageCount": 15,
    "coverImageUrl": "https://example.com/cover.jpg",
    "status": "active",
    "archivedAt": null,
    "permissions": {
      "id": "uuid-v4",
      "notebookId": "uuid-v4",
      "type": "private",
      "publicLink": null,
      "allowedEmails": [],
      "allowedUserIds": []
    },
    "owner": {
      "id": "uuid-v4",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-10-28T10:00:00.000Z",
    "updatedAt": "2025-10-28T15:30:00.000Z"
  }
}
```

**Error Responses**
- **404 Not Found**: Carnet inexistant ou utilisateur non propriétaire (même réponse pour les deux cas, pour des raisons de sécurité)
- **401 Unauthorized**: Token JWT manquant ou invalide
- **500 Internal Server Error**: Erreur serveur

**Security Note**: L'API retourne 404 (au lieu de 403) même si le carnet existe mais appartient à un autre utilisateur. Cela empêche de déterminer l'existence d'un carnet qui n'appartient pas à l'utilisateur.

**cURL Example**
```bash
curl -X GET http://localhost:3000/api/notebooks/550e8400-e29b-41d4-a716-446655440000 \
  -H "Cookie: accessToken=your-jwt-token"
```

---

### PUT /api/notebooks/:id
Mettre à jour un carnet existant.

**Authentication Required**: ✅ (JWT via httpOnly cookie)

**URL Parameters**
- `id` (string, required): UUID du carnet

**Request Body** (tous les champs sont optionnels, au moins un requis)
```json
{
  "title": "Mon voyage au Japon (2024)",
  "description": "Mise à jour de la description avec plus de détails",
  "coverImageUrl": "https://example.com/new-cover.jpg",
  "dpi": 300
}
```

**Field Specifications**
- `title` (string, optional): Nouveau titre (1-100 caractères)
- `description` (string, optional): Nouvelle description (max 300 caractères, peut être vide)
- `coverImageUrl` (string, optional): Nouvelle URL d'image de couverture (max 2048 caractères, format URI valide, peut être vide)
- `dpi` (number, optional): Nouvelle résolution (72-600)

**Immutable Fields** (ne peuvent pas être modifiés après création):
- `type` (Voyage/Daily/Reportage)
- `format` (A4/A5)
- `orientation` (portrait/landscape)
- `pageCount` (géré automatiquement par le système)
- `status` (géré par archive/restore)
- `userId` (propriétaire)

**Response 200 OK**
```json
{
  "success": true,
  "message": "Notebook updated successfully",
  "data": {
    "id": "uuid-v4",
    "userId": "uuid-v4",
    "title": "Mon voyage au Japon (2024)",
    "description": "Mise à jour de la description avec plus de détails",
    "type": "Voyage",
    "format": "A4",
    "orientation": "portrait",
    "dpi": 300,
    "pageCount": 15,
    "coverImageUrl": "https://example.com/new-cover.jpg",
    "status": "active",
    "permissions": {
      "id": "uuid-v4",
      "notebookId": "uuid-v4",
      "type": "private"
    },
    "owner": {
      "id": "uuid-v4",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-10-28T10:00:00.000Z",
    "updatedAt": "2025-10-28T16:00:00.000Z"
  }
}
```

**Error Responses**
- **400 Bad Request**: Validation error (champ invalide ou vide)
- **404 Not Found**: Carnet inexistant ou utilisateur non propriétaire
- **401 Unauthorized**: Token JWT manquant ou invalide
- **500 Internal Server Error**: Erreur serveur

**cURL Example**
```bash
curl -X PUT http://localhost:3000/api/notebooks/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=your-jwt-token" \
  -d '{
    "title": "Mon voyage au Japon (2024)",
    "description": "Mise à jour complète de la description"
  }'
```

---

### DELETE /api/notebooks/:id
Supprimer définitivement un carnet (hard delete).

**Authentication Required**: ✅ (JWT via httpOnly cookie)

**URL Parameters**
- `id` (string, required): UUID du carnet

**Important**: Cette suppression est permanente et irréversible. Les données associées (NotebookPermissions) sont automatiquement supprimées grâce à la contrainte ON DELETE CASCADE de la base de données.

**Response 204 No Content**
(Pas de corps de réponse)

**Error Responses**
- **404 Not Found**: Carnet inexistant ou utilisateur non propriétaire
- **401 Unauthorized**: Token JWT manquant ou invalide
- **500 Internal Server Error**: Erreur serveur

**Security Note**: Contrairement à l'archive qui est réversible, cette opération supprime définitivement toutes les données. Il est recommandé d'archiver d'abord un carnet avant de permettre sa suppression définitive dans l'interface utilisateur.

**cURL Example**
```bash
curl -X DELETE http://localhost:3000/api/notebooks/550e8400-e29b-41d4-a716-446655440000 \
  -H "Cookie: accessToken=your-jwt-token"
```

**Implementation Note**: La base de données gère automatiquement la suppression en cascade des enregistrements liés (NotebookPermissions) via la contrainte `ON DELETE CASCADE`.

---

### POST /api/notebooks/:id/duplicate
Dupliquer un carnet existant (créer une copie indépendante).

**Authentication Required**: ✅ (JWT via httpOnly cookie)

**URL Parameters**
- `id` (string, required): UUID du carnet source à dupliquer

**Request Body**: Aucun

**Response 201 Created**
```json
{
  "success": true,
  "message": "Notebook duplicated successfully",
  "data": {
    "id": "new-uuid-v4",
    "userId": "uuid-v4",
    "title": "Mon voyage au Japon (copie)",
    "description": "Souvenirs inoubliables de Tokyo et Kyoto",
    "type": "Voyage",
    "format": "A4",
    "orientation": "portrait",
    "dpi": 300,
    "pageCount": 0,
    "coverImageUrl": "https://example.com/cover.jpg",
    "status": "active",
    "archivedAt": null,
    "permissions": {
      "id": "new-uuid-v4",
      "notebookId": "new-uuid-v4",
      "type": "private",
      "publicLink": null,
      "allowedEmails": [],
      "allowedUserIds": []
    },
    "owner": {
      "id": "uuid-v4",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-10-28T16:00:00.000Z",
    "updatedAt": "2025-10-28T16:00:00.000Z"
  }
}
```

**Behavior**
- Crée un nouveau carnet avec toutes les métadonnées du carnet source
- Ajoute le suffixe " (copie)" au titre (gère les duplications multiples: "(copie 2)", "(copie 3)", etc.)
- Réinitialise `pageCount` à 0 (les pages seront copiées dans US03)
- Crée un nouvel enregistrement NotebookPermissions avec `type='private'`
- Le carnet dupliqué est toujours actif (jamais archivé au départ)
- Génère de nouveaux UUIDs pour le carnet et les permissions

**Error Responses**
- **404 Not Found**: Carnet source inexistant ou utilisateur non propriétaire
- **401 Unauthorized**: Token JWT manquant ou invalide
- **500 Internal Server Error**: Erreur serveur

**cURL Example**
```bash
curl -X POST http://localhost:3000/api/notebooks/550e8400-e29b-41d4-a716-446655440000/duplicate \
  -H "Cookie: accessToken=your-jwt-token"
```

**Future Enhancement (US03)**: Lorsque le modèle Page sera implémenté, cette opération copiera également toutes les pages et leurs éléments.

---

### PUT /api/notebooks/:id/archive
Archiver un carnet (soft delete avec possibilité de restauration).

**Authentication Required**: ✅ (JWT via httpOnly cookie)

**URL Parameters**
- `id` (string, required): UUID du carnet à archiver

**Request Body**: Aucun

**Response 200 OK**
```json
{
  "success": true,
  "message": "Notebook archived successfully",
  "data": {
    "id": "uuid-v4",
    "userId": "uuid-v4",
    "title": "Mon voyage au Japon",
    "description": "Souvenirs inoubliables de Tokyo et Kyoto",
    "type": "Voyage",
    "format": "A4",
    "orientation": "portrait",
    "dpi": 300,
    "pageCount": 15,
    "status": "archived",
    "archivedAt": "2025-10-28T16:00:00.000Z",
    "permissions": {
      "id": "uuid-v4",
      "notebookId": "uuid-v4",
      "type": "private"
    },
    "owner": {
      "id": "uuid-v4",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-10-28T10:00:00.000Z",
    "updatedAt": "2025-10-28T16:00:00.000Z"
  }
}
```

**Behavior**
- Définit `status` à `'archived'`
- Définit `archivedAt` avec le timestamp actuel
- Le carnet est exclu de la liste par défaut (`GET /api/notebooks`)
- Le carnet est visible dans `GET /api/notebooks/archived`
- Le carnet peut être restauré avec `PUT /api/notebooks/:id/restore`

**Error Responses**
- **404 Not Found**: Carnet inexistant ou utilisateur non propriétaire
- **401 Unauthorized**: Token JWT manquant ou invalide
- **500 Internal Server Error**: Erreur serveur

**cURL Example**
```bash
curl -X PUT http://localhost:3000/api/notebooks/550e8400-e29b-41d4-a716-446655440000/archive \
  -H "Cookie: accessToken=your-jwt-token"
```

**UI Recommendation**: Dans l'interface utilisateur, implémenter un délai de 30 jours avant de permettre la suppression définitive des carnets archivés, avec un compte à rebours visible.

---

### PUT /api/notebooks/:id/restore
Restaurer un carnet archivé (annuler l'archivage).

**Authentication Required**: ✅ (JWT via httpOnly cookie)

**URL Parameters**
- `id` (string, required): UUID du carnet à restaurer

**Request Body**: Aucun

**Response 200 OK**
```json
{
  "success": true,
  "message": "Notebook restored successfully",
  "data": {
    "id": "uuid-v4",
    "userId": "uuid-v4",
    "title": "Mon voyage au Japon",
    "description": "Souvenirs inoubliables de Tokyo et Kyoto",
    "type": "Voyage",
    "format": "A4",
    "orientation": "portrait",
    "dpi": 300,
    "pageCount": 15,
    "status": "active",
    "archivedAt": null,
    "permissions": {
      "id": "uuid-v4",
      "notebookId": "uuid-v4",
      "type": "private"
    },
    "owner": {
      "id": "uuid-v4",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-10-28T10:00:00.000Z",
    "updatedAt": "2025-10-28T16:30:00.000Z"
  }
}
```

**Behavior**
- Définit `status` à `'active'`
- Définit `archivedAt` à `null`
- Le carnet réapparaît dans la liste par défaut (`GET /api/notebooks`)
- Le carnet est exclu de `GET /api/notebooks/archived`

**Error Responses**
- **404 Not Found**: Carnet inexistant ou utilisateur non propriétaire
- **401 Unauthorized**: Token JWT manquant ou invalide
- **500 Internal Server Error**: Erreur serveur

**cURL Example**
```bash
curl -X PUT http://localhost:3000/api/notebooks/550e8400-e29b-41d4-a716-446655440000/restore \
  -H "Cookie: accessToken=your-jwt-token"
```

**Note**: La restauration peut être effectuée à tout moment, même après plusieurs jours/semaines. Il n'y a pas de limite de temps technique (bien que l'UI puisse implémenter une suppression automatique après 30 jours).

---

### Notebook Endpoint Summary

**Route Ordering (Important for Express)**
```javascript
// Routes spécifiques AVANT les routes génériques avec :id
router.get('/archived', handleGetArchivedNotebooks);      // Avant /:id
router.post('/:id/duplicate', handleDuplicateNotebook);   // Avant /:id
router.put('/:id/archive', handleArchiveNotebook);        // Avant /:id
router.put('/:id/restore', handleRestoreNotebook);        // Avant /:id
router.get('/:id', handleGetNotebook);                    // Route générique en dernier
```

**Ownership Validation**
Tous les endpoints vérifient que l'utilisateur authentifié est bien le propriétaire du carnet (`notebook.userId === req.user.userId`). Si ce n'est pas le cas, une erreur 404 est retournée (au lieu de 403) pour des raisons de sécurité.

**Immutable Fields**
Les champs suivants ne peuvent PAS être modifiés après création:
- `type` (Voyage/Daily/Reportage)
- `format` (A4/A5)
- `orientation` (portrait/landscape)
- `userId` (propriétaire)
- `pageCount` (géré automatiquement)
- `status` (géré via archive/restore)

**Cascade Deletion**
La suppression d'un carnet (DELETE) entraîne automatiquement la suppression de:
- Son enregistrement NotebookPermissions (contrainte ON DELETE CASCADE)
- Dans le futur (US03+): Toutes ses pages et éléments

**Filter & Sort Options**

Filtres disponibles (GET /api/notebooks):
- `type`: Voyage, Daily, Reportage (séparés par virgule pour multi-sélection)
- `status`: active (défaut), archived, all
- `search`: Recherche case-insensitive partielle dans le titre

Tri disponible (GET /api/notebooks):
- `sort`: createdAt (défaut), updatedAt, title, pageCount, type
- `order`: DESC (défaut), ASC

Pagination:
- `page`: Numéro de page (défaut: 1, min: 1)
- `limit`: Éléments par page (défaut: 12, min: 1, max: 100)

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
