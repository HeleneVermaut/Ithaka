# US04 Media Validation Schemas - Usage Guide

Quick reference for using the new validation schemas for US04 media operations.

## Location

All schemas are in: `/backend/src/middleware/validation.ts`

## Schemas Overview

| Schema | Purpose | Type | Required Fields |
|--------|---------|------|-----------------|
| `uploadMediaSchema` | Media file upload | Joi.Object | - |
| `createPageElementSchema` | Create page element | Joi.Object | pageId, type, x, y, width, height |
| `updatePageElementSchema` | Update page element (PATCH) | Joi.Object | At least 1 field |
| `transformImageSchema` | Image transformations | Joi.Object | At least 1 transformation |
| `stickerUploadSchema` | Upload sticker | Joi.Object | name |
| `renameStickerSchema` | Rename sticker | Joi.Object | newName |

Plus middleware: `validateFileUpload` for post-Multer validation

## Quick Usage Examples

### 1. Creating a Page Element

```typescript
import { createPageElementSchema, validate } from '../middleware/validation';
import { Router } from 'express';

const router = Router();

// Image element
router.post(
  '/pages/:pageId/elements',
  validate(createPageElementSchema),
  async (req, res) => {
    const { pageId, type, x, y, width, height, cloudinaryUrl } = req.body;
    // req.body is already validated and sanitized
  }
);

// Request body example:
// {
//   "pageId": "550e8400-e29b-41d4-a716-446655440000",
//   "type": "image",
//   "x": 100,
//   "y": 200,
//   "width": 500,
//   "height": 300,
//   "cloudinaryUrl": "https://cloudinary.com/image.jpg"
// }
```

### 2. Updating a Page Element (PATCH)

```typescript
import { updatePageElementSchema, validate } from '../middleware/validation';

router.patch(
  '/pages/:pageId/elements/:elementId',
  validate(updatePageElementSchema),
  async (req, res) => {
    // Only provided fields are validated
    // All fields are optional but at least one required
    const updates = req.body;
  }
);

// Request body example (partial update):
// { "x": 150, "rotation": 45 }
```

### 3. Image Transformation

```typescript
import { transformImageSchema, validate } from '../middleware/validation';

router.post(
  '/images/:imageId/transform',
  validate(transformImageSchema),
  async (req, res) => {
    const { crop, brightness, contrast, saturation, rotation, flip } = req.body;
    // At least one transformation provided
  }
);

// Request body example:
// {
//   "brightness": 25,
//   "contrast": -10,
//   "rotation": 90
// }
```

### 4. Sticker Upload

```typescript
import { stickerUploadSchema, validate, validateFileUpload } from '../middleware/validation';
import multer from 'multer';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

router.post(
  '/stickers/upload',
  upload.single('file'),
  validateFileUpload,  // Validate file after Multer
  validate(stickerUploadSchema), // Validate body
  async (req, res) => {
    const { name, tags } = req.body;
    const file = req.file; // Multer file object
  }
);

// Request (multipart/form-data):
// file: (binary file)
// name: "My Sticker"
// tags: ["nature", "animal"]
```

### 5. Sticker Rename

```typescript
import { renameStickerSchema, validate } from '../middleware/validation';

router.patch(
  '/stickers/:stickerId/rename',
  validate(renameStickerSchema),
  async (req, res) => {
    const { newName, newTags } = req.body;
  }
);

// Request body example:
// {
//   "newName": "Updated Sticker Name",
//   "newTags": ["tag1", "tag2", "tag3"]
// }
```

## Validation Constraints Reference

### Position & Size (createPageElement)
- `x`, `y`: 0-2000 (page coordinates)
- `width`, `height`: 20-10000 (element dimensions)
- `rotation`: 0-360 degrees

### Types & Enums
- Element types: `'image'`, `'emoji'`, `'sticker'`, `'shape'`
- Shape types: `'circle'`, `'square'`, `'rectangle'`, `'triangle'`, `'heart'`
- Flip directions: `'horizontal'`, `'vertical'`
- Rotation (transform): `0`, `90`, `180`, `270`

### File Constraints
- Max size: 10 MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/svg+xml`

### String Constraints
- Sticker name: 1-100 characters
- Tags: max 10, each 1-30 characters
- Emoji content: 1-10 characters (usually 1 emoji)

### Color Format
- Hex colors: `#RRGGBB` (case-insensitive)
- Example: `#FF0000`, `#00ff00`, `#0000FF`

### Opacity
- Range: 0-100
- Represents percentage: 0% = transparent, 100% = opaque

### Adjustments (transform)
- Brightness: -100 to +100
- Contrast: -100 to +100
- Saturation: -100 to +100

## Error Handling

All schemas throw `AppError(400)` on validation failure. Error message format:

```
"Validation error: [field] [constraint], [field] [constraint], ..."
```

Example responses:

```json
{
  "error": "Validation error: x must be between 0 and 2000, y must be between 0 and 2000"
}
```

```json
{
  "error": "Validation error: Type must be one of: image, emoji, sticker, shape"
}
```

```json
{
  "error": "File too large (15 MB > 10 MB)"
}
```

## Conditional Validation

Some fields are conditionally required based on element type:

| Type | Requires | Example |
|------|----------|---------|
| `image` | `cloudinaryUrl` | Must provide image URL |
| `emoji` | `emojiContent` | Must provide emoji character(s) |
| `sticker` | `cloudinaryUrl` | Must provide sticker URL |
| `shape` | `shapeType`, `fillColor` | Must specify shape and color |

Joi.when() handles this automatically - just provide the appropriate field for your type.

## Common Errors & Solutions

### "Page ID must be a valid UUID"
```typescript
// Wrong:
{ pageId: "not-a-uuid" }

// Correct:
{ pageId: "550e8400-e29b-41d4-a716-446655440000" }
```

### "Position X must be between 0 and 2000"
```typescript
// Wrong:
{ x: -10 } or { x: 2500 }

// Correct:
{ x: 100 }
```

### "Fill color must be a valid hex color (#RRGGBB)"
```typescript
// Wrong:
{ fillColor: "red" } or { fillColor: "#FF" }

// Correct:
{ fillColor: "#FF0000" }
```

### "At least one field must be provided for update"
```typescript
// PATCH update cannot be empty
// Wrong:
{}

// Correct:
{ x: 150 } or { rotation: 45 }
```

### "At least one transformation must be provided"
```typescript
// Transform request must have at least one adjustment
// Wrong:
{}

// Correct:
{ brightness: 10 } or { crop: { x: 0, y: 0, width: 100, height: 100 } }
```

## Type Definitions

For TypeScript projects, import types from models:

```typescript
import { IPageElement } from '../types/models';

// The validated req.body will match this interface
const element: Partial<IPageElement> = req.body;
```

## Security Best Practices

1. Always use `validateFileUpload` middleware for file uploads
2. File size limit (10 MB) is enforced at Multer and schema levels
3. MIME types are validated server-side (whitelist approach)
4. Never trust file extensions - always validate MIME type
5. HTML/SVG files are allowed but should be sanitized before display

## Performance Notes

- Joi validation is fast (milliseconds)
- File validation happens after Multer processing (file buffered in memory)
- For large bulk operations, consider validating in batches

## Next Steps

Once these schemas are validated, move to:
1. TASK10: Create routes using these schemas
2. TASK11: Implement controllers
3. TASK12: Create integration tests
