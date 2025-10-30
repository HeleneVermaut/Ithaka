# US04-TASK09 Quick Reference

## Schemas Available (from `/src/middleware/validation.ts`)

```typescript
// Media operations schemas
export const uploadMediaSchema
export const createPageElementSchema
export const updatePageElementSchema
export const transformImageSchema
export const stickerUploadSchema
export const renameStickerSchema

// Validation middleware
export const validateFileUpload

// Validation utility
export const validate
```

## Import Examples

```typescript
// Import specific schemas
import {
  createPageElementSchema,
  updatePageElementSchema,
  validate
} from '../middleware/validation';

// Or use default export
import validation from '../middleware/validation';
const { createPageElementSchema } = validation;
```

## Route Setup Examples

### Express Route with Validation

```typescript
import { Router } from 'express';
import { createPageElementSchema, validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// POST with validation
router.post(
  '/pages/:pageId/elements',
  authMiddleware,
  validate(createPageElementSchema, 'body'),
  elementController.handleCreate
);

// PATCH with validation
router.patch(
  '/pages/:pageId/elements/:elementId',
  authMiddleware,
  validate(updatePageElementSchema, 'body'),
  elementController.handleUpdate
);

export default router;
```

### File Upload with Validation

```typescript
import multer from 'multer';
import { validateFileUpload, validate, stickerUploadSchema } from '../middleware/validation';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

router.post(
  '/stickers/upload',
  authMiddleware,
  upload.single('file'),           // Parse file
  validateFileUpload,              // Validate file
  validate(stickerUploadSchema),   // Validate body
  stickerController.handleUpload
);
```

## Validation in Controllers

```typescript
// Controllers receive pre-validated data
export const handleCreateElement = (req: AuthRequest, res: Response): void => {
  // req.body is already validated
  const {
    pageId,
    type,
    x,
    y,
    width,
    height,
    cloudinaryUrl,
    rotation = 0,
    opacity = 100,
    zIndex
  } = req.body;

  // Safe to use - all constraints already enforced
  // type is one of: 'image', 'emoji', 'sticker', 'shape'
  // x, y are in range 0-2000
  // width, height are in range 20-10000
  // rotation is in range 0-360
  // opacity is in range 0-100

  // Process...
};
```

## Error Handling

```typescript
// Validation errors are caught by errorHandler middleware
// Returns 400 with clear message:
// {
//   "error": "Validation error: x must be between 0 and 2000"
// }

// Example in controller:
try {
  const element = await elementService.create(req.body, req.user.id);
  res.json(element);
} catch (error) {
  // errorHandler middleware catches and responds
  throw error;
}
```

## Test Data Examples

### Create Image Element
```json
{
  "pageId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "image",
  "x": 100,
  "y": 200,
  "width": 500,
  "height": 300,
  "cloudinaryUrl": "https://cloudinary.com/image.jpg",
  "rotation": 45,
  "opacity": 80
}
```

### Update Element (Partial)
```json
{
  "x": 150,
  "rotation": 90
}
```

### Transform Image
```json
{
  "brightness": 25,
  "contrast": -10,
  "rotation": 90
}
```

### Create Shape Element
```json
{
  "pageId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "shape",
  "x": 100,
  "y": 200,
  "width": 100,
  "height": 100,
  "shapeType": "circle",
  "fillColor": "#FF0000",
  "opacity": 75
}
```

### Create Emoji Element
```json
{
  "pageId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "emoji",
  "x": 50,
  "y": 50,
  "width": 40,
  "height": 40,
  "emojiContent": "😊"
}
```

### Upload Sticker
```
POST /api/stickers/upload
Content-Type: multipart/form-data

file: (binary image file)
name: "My Sticker"
tags: ["nature", "animal"]
```

### Rename Sticker
```json
{
  "newName": "Updated Sticker",
  "newTags": ["updated", "new"]
}
```

## Validation Constraints Quick Reference

| Field | Min | Max | Type | Example |
|-------|-----|-----|------|---------|
| x, y | 0 | 2000 | number | 100 |
| width, height | 20 | 10000 | number | 500 |
| rotation | 0 | 360 | number | 45 |
| zIndex | 0 | 999 | integer | 5 |
| opacity | 0 | 100 | integer | 75 |
| brightness | -100 | 100 | number | 25 |
| contrast | -100 | 100 | number | -10 |
| saturation | -100 | 100 | number | 10 |
| name | 1 | 100 | string | "Sticker" |
| tag | 1 | 30 | string | "nature" |
| emojiContent | 1 | 10 | string | "😊" |

## Type Definitions

```typescript
// When using TypeScript, import type interfaces
import type { IPageElement } from '../types/models';

// Validated data matches interface
const element: Partial<IPageElement> = req.body;
```

## Common Commands

```bash
# Type check
npm run type-check

# Build
npm run build

# Run tests
npm run test

# Run dev server
npm run dev
```

## Debugging

### Enable validation logging

In errorHandler middleware, validation errors are logged as warnings:
```
[WARNING] Validation failed: x must be between 0 and 2000
```

### Inspect Joi schema

```typescript
const schema = createPageElementSchema;
console.log(schema.describe()); // Print schema structure
```

### Manual validation test

```typescript
const testData = { /* your data */ };
const { error, value } = schema.validate(testData);
if (error) {
  console.log('Validation failed:', error.details);
} else {
  console.log('Valid data:', value);
}
```

## Common Issues & Solutions

### "X is not allowed"
- Schema has `.unknown(false)` - remove extra fields

### "X is required"
- Schema expects this field - add it to request body

### "X must be a valid UUID"
- Format: `550e8400-e29b-41d4-a716-446655440000`
- Generate: `import { v4 } from 'uuid'; v4()`

### "Type must be one of: ..."
- Use exact string value from enum list

### "File is required"
- Upload middleware must come before validation
- Check Content-Type is multipart/form-data

## File Structure

```
backend/src/
├── middleware/
│   ├── validation.ts          ← All schemas here
│   ├── authMiddleware.ts
│   └── errorHandler.ts
├── routes/
│   ├── mediaRoutes.ts         ← Will use schemas
│   └── elementRoutes.ts       ← Will use schemas
├── controllers/
│   ├── mediaController.ts     ← Will use validated data
│   └── elementController.ts   ← Will use validated data
└── services/
    ├── mediaService.ts
    └── elementService.ts
```

## Next Implementation Files

When implementing TASK10-TASK11:

1. Create routes in `/routes/elementRoutes.ts`
2. Create controller in `/controllers/elementController.ts`
3. Create service in `/services/elementService.ts`
4. Use: `validate(createPageElementSchema)` in routes
5. Process: `req.body` (pre-validated) in controllers

## Support & Documentation

- **Full Implementation Report**: `../IMPLEMENTATION_REPORT_US04_TASK09.md`
- **Usage Guide**: `./SCHEMAS_USAGE_GUIDE.md`
- **Completion Confirmation**: `../TASK09_COMPLETION_CONFIRMATION.md`
- **Spec**: `../context/US04/US04-TASK09.md`
