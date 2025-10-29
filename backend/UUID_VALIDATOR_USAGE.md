# UUID Validator Middleware - Usage Guide

Quick reference guide for using UUID validation middleware in routes.

## Import

```typescript
import { validateId, validateNotebookId, validatePageId, validateElementId } from '../middleware/uuidValidator';
```

## Common Usage Patterns

### Single ID Parameter

```typescript
// Validate :id parameter
router.get('/:id', authenticateUser, validateId, handleGetNotebook);
router.put('/:id', authenticateUser, validateId, validate(schema), handleUpdateNotebook);
router.delete('/:id', authenticateUser, validateId, handleDeleteNotebook);
```

### Nested Route with notebookId

```typescript
// Validate :notebookId parameter
router.get('/notebooks/:notebookId/pages', authenticateUser, validateNotebookId, handleGetPages);
router.post('/notebooks/:notebookId/pages', authenticateUser, validateNotebookId, validate(schema), handleCreatePage);
```

### Page Routes with pageId

```typescript
// Validate :pageId parameter
router.get('/pages/:pageId', authenticateUser, validatePageId, handleGetPage);
router.put('/pages/:pageId', authenticateUser, validatePageId, validate(schema), handleUpdatePage);
```

### Element Routes with elementId

```typescript
// Validate :elementId parameter
router.put('/elements/:elementId', authenticateUser, validateElementId, validate(schema), handleUpdateElement);
router.delete('/elements/:elementId', authenticateUser, validateElementId, handleDeleteElement);
```

### Custom Parameter Name

```typescript
import { validateUUID } from '../middleware/uuidValidator';

// Validate :customId parameter
router.get('/resource/:customId', authenticateUser, validateUUID('customId'), handleGetResource);
```

## Middleware Order

Always place UUID validation AFTER authentication but BEFORE body validation:

```typescript
router.put(
  '/:id',
  authenticateUser,    // 1. Check JWT token
  validateId,          // 2. Validate UUID format
  validate(schema),    // 3. Validate request body
  handleUpdate         // 4. Controller logic
);
```

## Error Response

When validation fails, clients receive:

```json
{
  "status": "fail",
  "statusCode": 400,
  "message": "Invalid UUID format for parameter: id",
  "detail": "Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

## Valid UUID Formats

The middleware accepts UUID v1-v5:
- UUID v1: `550e8400-e29b-11d4-a716-446655440000`
- UUID v4: `123e4567-e89b-12d3-a456-426614174000`
- UUID v5: `74738ff5-5367-5958-9aee-98fffdcd1876`

Both lowercase and uppercase accepted.

## When NOT to Use

Don't use UUID validation for:
- Query parameters (unless you create a custom validator)
- Request body fields (validate with Joi schemas instead)
- Optional parameters (UUID validator requires the parameter to exist)

## Testing

To test UUID validation in your routes:

```bash
# Valid UUID - should reach controller
curl http://localhost:3000/api/notebooks/123e4567-e89b-12d3-a456-426614174000

# Invalid UUID - should return 400 Bad Request
curl http://localhost:3000/api/notebooks/invalid-uuid-format
```

## Security Benefits

- Prevents malformed input from reaching controllers
- Reduces unnecessary database queries
- Provides clear error messages to clients
- Logs invalid attempts for security monitoring
- Consistent validation across all routes

---

For implementation details, see: `/backend/src/middleware/uuidValidator.ts`
