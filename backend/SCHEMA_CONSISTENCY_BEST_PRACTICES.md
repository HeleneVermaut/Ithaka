# Schema Consistency Best Practices

**Purpose:** Prevent validation schema divergence and inconsistency bugs

---

## Problem Statement

The page element validation revealed an architectural issue:
- **Multiple schemas** for the same entity (pageElement)
- **Inconsistent type support** between schemas
- **Single source of truth violation** - type list duplicated in 3 places
- **Difficult to maintain** - requires coordinated updates across files

---

## Current State Analysis

### Current Validation Schemas

| Schema | Location | Types Supported | Used For |
|--------|----------|-----------------|----------|
| `pageElementSchema` | Line 623 | text, image, shape, emoji, sticker, moodTracker | General validation, batch operations |
| `createPageElementSchema` | Line 1176 | image, emoji, sticker, shape | POST /api/page-elements |
| `updatePageElementSchema` | Line 1345 | image, emoji, sticker, shape | PATCH /api/page-elements/:id |

**Problem:** Two schemas are outdated (missing text, moodTracker)

---

## Recommended Solution

### Phase 1: Create Constant Type Definitions

**File:** `backend/src/types/pageElement.ts` (new)

```typescript
/**
 * Supported page element types
 * Use this as single source of truth for all element type validation
 */
export const SUPPORTED_ELEMENT_TYPES = [
  'text',
  'image',
  'emoji',
  'sticker',
  'shape',
  'moodTracker',
] as const;

export type ElementType = typeof SUPPORTED_ELEMENT_TYPES[number];

/**
 * Element type groupings for different operations
 */
export const ELEMENT_TYPES_BY_CATEGORY = {
  // Content elements that have direct text/visual content
  content: ['text', 'image', 'emoji', 'sticker', 'shape'] as const,

  // Interactive/trackers
  interactive: ['moodTracker'] as const,

  // Media elements requiring external URLs
  media: ['image', 'sticker'] as const,

  // Elements from user libraries
  library: ['sticker'] as const,
} as const;
```

### Phase 2: Update Validation Schemas

**File:** `backend/src/middleware/validation.ts`

```typescript
import { SUPPORTED_ELEMENT_TYPES } from '../types/pageElement';

/**
 * Joi schema for page element (canvas element)
 * Validates type, positioning, sizing, and content/styling properties
 *
 * IMPORTANT: Type list is sourced from SUPPORTED_ELEMENT_TYPES constant
 * to ensure consistency across all schemas
 */
export const pageElementSchema = Joi.object({
  type: Joi.string()
    .valid(...SUPPORTED_ELEMENT_TYPES)
    .required()
    .messages({
      'any.required': 'Element type is required',
      'any.only': `Type must be one of: ${SUPPORTED_ELEMENT_TYPES.join(', ')}`,
    }),
  // ... rest of schema
});

/**
 * Joi schema for creating a page element (media, emoji, sticker, shape, text)
 * Validates positioning, dimensions, and element-specific properties
 */
export const createPageElementSchema = Joi.object({
  pageId: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.uuid': 'Page ID must be a valid UUID',
      'any.required': 'Page ID is required',
    }),

  type: Joi.string()
    .valid(...SUPPORTED_ELEMENT_TYPES)
    .required()
    .messages({
      'any.required': 'Element type is required',
      'any.only': `Type must be one of: ${SUPPORTED_ELEMENT_TYPES.join(', ')}`,
    }),

  // ... rest of schema
});

/**
 * Joi schema for updating a page element (PATCH semantics)
 * All fields are optional for partial updates
 */
export const updatePageElementSchema = Joi.object({
  type: Joi.string()
    .valid(...SUPPORTED_ELEMENT_TYPES)
    .optional()
    .messages({
      'any.only': `Type must be one of: ${SUPPORTED_ELEMENT_TYPES.join(', ')}`,
    }),

  // ... rest of schema
});
```

### Phase 3: Backend Model Type Alignment

**File:** `backend/src/models/PageElement.ts`

```typescript
import { SUPPORTED_ELEMENT_TYPES, ElementType } from '../types/pageElement';

export default (sequelize: Sequelize, DataTypes: typeof DataTypes) => {
  const PageElement = sequelize.define(
    'PageElement',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      type: {
        type: DataTypes.ENUM(...SUPPORTED_ELEMENT_TYPES),
        allowNull: false,
        validate: {
          isIn: [SUPPORTED_ELEMENT_TYPES],
        },
      },

      // ... rest of fields
    },
    // ... options
  );

  return PageElement;
};
```

### Phase 4: Frontend Type Alignment

**File:** `frontend/src/types/pageElement.ts`

```typescript
// Re-export from shared types if possible, otherwise duplicate with comment
export const ELEMENT_TYPES = [
  'text',
  'image',
  'emoji',
  'sticker',
  'shape',
  'moodTracker',
] as const;

export type ElementType = typeof ELEMENT_TYPES[number];

export interface PageElement {
  id: string;
  pageId: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: Record<string, unknown>;
  style?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
```

---

## Code Review Checklist

When adding a new element type (e.g., `"annotation"`):

### Backend Changes Required

- [ ] Add `"annotation"` to `SUPPORTED_ELEMENT_TYPES` in `backend/src/types/pageElement.ts`
- [ ] Update `PageElement` model ENUM constraint in `backend/src/models/PageElement.ts`
- [ ] Verify all validation schemas use `SUPPORTED_ELEMENT_TYPES` constant
  - [ ] `pageElementSchema`
  - [ ] `createPageElementSchema`
  - [ ] `updatePageElementSchema`
- [ ] Add type-specific validation schema if needed (e.g., `annotationElementSchema`)
- [ ] Update `pageElementService.ts` to handle annotation content structure
- [ ] Update JSDoc comments in `pageElementRoutes.ts` to list new type
- [ ] Update API documentation if applicable

### Frontend Changes Required

- [ ] Add `"annotation"` to `ELEMENT_TYPES` in `frontend/src/types/pageElement.ts`
- [ ] Update `PageElement` TypeScript interface
- [ ] Add UI component/modal for annotation element creation
- [ ] Update element picker/library to support annotation type
- [ ] Add tests for annotation element creation/editing
- [ ] Update user-facing documentation

### Database Changes

- [ ] If using Sequelize ENUM, run migration to add new type value
- [ ] Ensure backward compatibility with existing data
- [ ] Test migration on staging environment

### Testing Required

- [ ] Unit tests for new validation schema
- [ ] Integration tests for CREATE endpoint with new type
- [ ] Integration tests for UPDATE endpoint with new type
- [ ] Frontend component tests for element creation UI
- [ ] End-to-end tests with real backend

### Documentation Updates

- [ ] Update `CLAUDE.md` project overview
- [ ] Update API documentation with new type
- [ ] Update PRP (Product Requirements Prompt) document
- [ ] Add migration notes if applicable

---

## Implementation Phases

### Immediate (This Sprint)
1. Create `backend/src/types/pageElement.ts` with type constants
2. Update all three validation schemas to use the constant
3. Compile and verify tests pass

### Short-term (Next Sprint)
1. Update backend `PageElement` model
2. Update frontend types
3. Add tests for type consistency

### Medium-term (Ongoing)
1. Establish this pattern for other entity types (Notebook, Page, etc.)
2. Create shared constants for all enums
3. Add pre-commit hooks to detect schema divergence

---

## Preventing Schema Divergence

### Automated Checks

**Pre-commit Hook:** `tools/validate-schemas.js`

```javascript
#!/usr/bin/env node
/**
 * Validates that all validation schemas use SUPPORTED_ELEMENT_TYPES constant
 * and no hardcoded type lists exist
 */

const fs = require('fs');
const path = require('path');

const validationFile = path.join(
  __dirname,
  '../backend/src/middleware/validation.ts'
);

const content = fs.readFileSync(validationFile, 'utf-8');

// Pattern to detect hardcoded type lists in validation schemas
const hardcodedTypesPattern = /\.valid\('image',\s*'emoji',\s*'sticker',\s*'shape'\)/g;
const matches = content.match(hardcodedTypesPattern);

if (matches && matches.length > 0) {
  console.error(
    'ERROR: Found hardcoded element types in validation.ts'
  );
  console.error('Use SUPPORTED_ELEMENT_TYPES constant instead');
  process.exit(1);
}

console.log('Schema consistency check: PASSED');
process.exit(0);
```

**Add to `package.json`:**

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "node tools/validate-schemas.js"
    }
  }
}
```

### Unit Tests

**File:** `backend/src/middleware/__tests__/validation.spec.ts`

```typescript
import {
  pageElementSchema,
  createPageElementSchema,
  updatePageElementSchema,
} from '../validation';
import { SUPPORTED_ELEMENT_TYPES } from '../../types/pageElement';

describe('Page Element Validation Schemas', () => {
  describe('Element Type Consistency', () => {
    it('should accept all SUPPORTED_ELEMENT_TYPES in pageElementSchema', () => {
      SUPPORTED_ELEMENT_TYPES.forEach(type => {
        const { error } = pageElementSchema.validate({
          type,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          content: {},
        });
        expect(error).toBeUndefined();
      });
    });

    it('should accept all SUPPORTED_ELEMENT_TYPES in createPageElementSchema', () => {
      SUPPORTED_ELEMENT_TYPES.forEach(type => {
        const { error } = createPageElementSchema.validate({
          pageId: '550e8400-e29b-41d4-a716-446655440000',
          type,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          content: {},
        });
        expect(error).toBeUndefined();
      });
    });

    it('should accept all SUPPORTED_ELEMENT_TYPES in updatePageElementSchema', () => {
      SUPPORTED_ELEMENT_TYPES.forEach(type => {
        const { error } = updatePageElementSchema.validate({
          type,
        });
        expect(error).toBeUndefined();
      });
    });

    it('should reject unknown element types', () => {
      const { error } = createPageElementSchema.validate({
        pageId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'unknown',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        content: {},
      });
      expect(error).toBeDefined();
    });
  });
});
```

---

## Benefits of This Approach

1. **Single Source of Truth**
   - Types defined once in `SUPPORTED_ELEMENT_TYPES`
   - All schemas and models reference the same constant

2. **Automatic Error Messages**
   - Error messages generated from constant
   - Always accurate when types are updated

3. **Type Safety**
   - TypeScript enforces types at compile time
   - IDE autocomplete for valid types

4. **Easy Maintenance**
   - Adding a new type requires change in ONE place
   - All schemas, models, tests update automatically

5. **Testability**
   - Easy to write comprehensive type validation tests
   - Automated checks catch divergence

6. **Documentation**
   - Self-documenting code
   - Clear what types are supported

---

## Timeline for Implementation

- **Week 1:** Create types constant, update validation schemas
- **Week 2:** Update model constraints, frontend types
- **Week 3:** Add tests and pre-commit hooks
- **Week 4:** Refactor other entity types (Notebook, Page, etc.)

---

## Questions for Team

1. Should element type constants be shared between frontend/backend (possibly in a shared package)?
2. Are there other enums that need this same treatment?
3. Should we implement the pre-commit hook immediately or after other urgent fixes?
