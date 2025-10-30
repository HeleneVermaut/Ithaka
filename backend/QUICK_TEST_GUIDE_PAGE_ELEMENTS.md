# Quick Test Guide: Page Element Type Validation Fix

**Purpose:** Verify that the page element type validation fix works correctly

---

## Setup

### Prerequisites

1. Backend running in development mode:
   ```bash
   cd backend
   npm run dev
   ```

2. Valid authentication token (JWT):
   - Register a new user or use existing credentials
   - Obtain access token from login endpoint
   - Store token for requests below

3. Valid page ID:
   - Create a notebook via POST /api/notebooks
   - Create a page via POST /api/notebooks/:id/pages
   - Use the page ID in element creation requests

---

## Test Cases

### Test 1: Create Text Element (Previously Failing)

**Endpoint:** `POST http://localhost:3000/api/page-elements`

**Request:**
```bash
curl -X POST http://localhost:3000/api/page-elements \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_ACCESS_TOKEN" \
  -d '{
    "pageId": "YOUR_PAGE_ID_HERE",
    "type": "text",
    "x": 100,
    "y": 150,
    "width": 200,
    "height": 50,
    "rotation": 0,
    "zIndex": 1,
    "content": {
      "text": "Hello, Ithaka!",
      "fontFamily": "Arial",
      "fontSize": 18,
      "fill": "#000000",
      "textAlign": "left",
      "fontWeight": "normal",
      "fontStyle": "normal"
    },
    "style": {
      "opacity": 1
    }
  }'
```

**Expected Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "pageId": "YOUR_PAGE_ID_HERE",
    "type": "text",
    "x": 100,
    "y": 150,
    "width": 200,
    "height": 50,
    "rotation": 0,
    "zIndex": 1,
    "content": {
      "text": "Hello, Ithaka!",
      "fontFamily": "Arial",
      "fontSize": 18,
      "fill": "#000000",
      "textAlign": "left",
      "fontWeight": "normal",
      "fontStyle": "normal"
    },
    "style": {
      "opacity": 1
    },
    "createdAt": "2025-10-30T12:00:00Z",
    "updatedAt": "2025-10-30T12:00:00Z"
  }
}
```

**Validation Points:**
- Status code is 201 (not 400)
- Element ID is generated
- Type is preserved as "text"
- Content structure is correct

---

### Test 2: Create Mood Tracker Element (Previously Failing)

**Endpoint:** `POST http://localhost:3000/api/page-elements`

**Request:**
```bash
curl -X POST http://localhost:3000/api/page-elements \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_ACCESS_TOKEN" \
  -d '{
    "pageId": "YOUR_PAGE_ID_HERE",
    "type": "moodTracker",
    "x": 50,
    "y": 200,
    "width": 150,
    "height": 100,
    "rotation": 0,
    "zIndex": 0,
    "content": {
      "mood": "happy",
      "scale": 4,
      "notes": "Had a great day exploring"
    },
    "style": {}
  }'
```

**Expected Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "pageId": "YOUR_PAGE_ID_HERE",
    "type": "moodTracker",
    "x": 50,
    "y": 200,
    "width": 150,
    "height": 100,
    "rotation": 0,
    "zIndex": 0,
    "content": {
      "mood": "happy",
      "scale": 4,
      "notes": "Had a great day exploring"
    },
    "style": {},
    "createdAt": "2025-10-30T12:01:00Z",
    "updatedAt": "2025-10-30T12:01:00Z"
  }
}
```

**Validation Points:**
- Status code is 201 (not 400)
- Type "moodTracker" is accepted
- Content includes mood-specific fields

---

### Test 3: Verify All Types Are Supported

Test each element type in sequence:

```bash
#!/bin/bash

PAGE_ID="YOUR_PAGE_ID_HERE"
TOKEN="YOUR_ACCESS_TOKEN"
BASE_URL="http://localhost:3000/api/page-elements"

echo "Testing all element types..."

# Array of types to test
TYPES=("text" "image" "emoji" "sticker" "shape" "moodTracker")

for TYPE in "${TYPES[@]}"; do
  echo ""
  echo "Testing type: $TYPE"

  # Prepare content based on type
  case $TYPE in
    "text")
      CONTENT='{"text": "Test", "fontFamily": "Arial", "fontSize": 16, "fill": "#000000"}'
      ;;
    "image")
      CONTENT='{"url": "https://example.com/image.jpg", "originalWidth": 800, "originalHeight": 600}'
      ;;
    "emoji")
      CONTENT='{"code": "😊"}'
      ;;
    "sticker")
      CONTENT='{"url": "https://example.com/sticker.png"}'
      ;;
    "shape")
      CONTENT='{"shapeType": "circle", "fillColor": "#FF0000"}'
      ;;
    "moodTracker")
      CONTENT='{"mood": "happy", "scale": 4}'
      ;;
  esac

  # Send request
  RESPONSE=$(curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -H "Cookie: accessToken=$TOKEN" \
    -d "{
      \"pageId\": \"$PAGE_ID\",
      \"type\": \"$TYPE\",
      \"x\": 100,
      \"y\": 100,
      \"width\": 150,
      \"height\": 150,
      \"content\": $CONTENT
    }")

  # Check if successful (status 201)
  HTTP_CODE=$(echo "$RESPONSE" | jq -r '.success // false')

  if [ "$HTTP_CODE" = "true" ]; then
    echo "✓ $TYPE - PASSED"
  else
    echo "✗ $TYPE - FAILED"
    echo "Response: $RESPONSE"
  fi
done

echo ""
echo "All tests completed!"
```

**Expected Results:**
```
Testing type: text - PASSED
Testing type: image - PASSED
Testing type: emoji - PASSED
Testing type: sticker - PASSED
Testing type: shape - PASSED
Testing type: moodTracker - PASSED
```

---

### Test 4: Update Text Element (PATCH)

**Endpoint:** `PATCH http://localhost:3000/api/page-elements/{elementId}`

**Request:**
```bash
curl -X PATCH http://localhost:3000/api/page-elements/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_ACCESS_TOKEN" \
  -d '{
    "x": 150,
    "y": 200,
    "content": {
      "text": "Updated text",
      "fontFamily": "Arial",
      "fontSize": 20,
      "fill": "#FF0000"
    }
  }'
```

**Expected Response:** 200 OK
- Element is updated
- Type remains "text"
- New position and content are reflected

**Validation Points:**
- Status code is 200
- Updated fields are correct
- Type field cannot be changed via PATCH (immutable)

---

### Test 5: Verify Validation Still Works (Invalid Type)

**Endpoint:** `POST http://localhost:3000/api/page-elements`

**Request:**
```bash
curl -X POST http://localhost:3000/api/page-elements \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_ACCESS_TOKEN" \
  -d '{
    "pageId": "YOUR_PAGE_ID_HERE",
    "type": "invalidType",
    "x": 100,
    "y": 100,
    "width": 150,
    "height": 150,
    "content": {}
  }'
```

**Expected Response:** 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error: Type must be one of: text, image, emoji, sticker, shape, moodTracker"
}
```

**Validation Points:**
- Status code is 400 (validation error)
- Error message lists all valid types
- Invalid type is rejected

---

### Test 6: Verify Other Types Still Work (Image Element)

**Endpoint:** `POST http://localhost:3000/api/page-elements`

**Request:**
```bash
curl -X POST http://localhost:3000/api/page-elements \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_ACCESS_TOKEN" \
  -d '{
    "pageId": "YOUR_PAGE_ID_HERE",
    "type": "image",
    "x": 0,
    "y": 0,
    "width": 500,
    "height": 400,
    "content": {
      "url": "https://example.com/photo.jpg",
      "originalWidth": 1920,
      "originalHeight": 1440
    }
  }'
```

**Expected Response:** 201 Created
- Image element creation still works
- No regression in existing functionality

---

## Verification Checklist

- [ ] Test 1: Text element creation - PASSED
- [ ] Test 2: Mood tracker element creation - PASSED
- [ ] Test 3: All 6 types supported - PASSED
- [ ] Test 4: Text element update - PASSED
- [ ] Test 5: Invalid type rejected - PASSED
- [ ] Test 6: Image element still works - PASSED

---

## Integration Test: Full Workflow

This tests the complete user flow of creating a page with mixed element types:

```bash
#!/bin/bash

TOKEN="YOUR_ACCESS_TOKEN"
BASE_URL="http://localhost:3000/api"

echo "=== Full Page Element Workflow Test ==="

# 1. Create notebook
echo "1. Creating notebook..."
NOTEBOOK=$(curl -s -X POST "$BASE_URL/notebooks" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$TOKEN" \
  -d '{
    "title": "Test Page Elements",
    "type": "Daily",
    "format": "A4",
    "orientation": "portrait"
  }' | jq '.data.id' -r)
echo "Notebook ID: $NOTEBOOK"

# 2. Create page
echo "2. Creating page..."
PAGE=$(curl -s -X POST "$BASE_URL/notebooks/$NOTEBOOK/pages" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$TOKEN" \
  -d '{"pageNumber": 1}' | jq '.data.id' -r)
echo "Page ID: $PAGE"

# 3. Create multiple element types
echo "3. Creating elements..."

# Text element
TEXT_ID=$(curl -s -X POST "$BASE_URL/page-elements" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$TOKEN" \
  -d "{
    \"pageId\": \"$PAGE\",
    \"type\": \"text\",
    \"x\": 50, \"y\": 50,
    \"width\": 300, \"height\": 100,
    \"content\": {\"text\": \"Page Title\", \"fontFamily\": \"Arial\", \"fontSize\": 24, \"fill\": \"#000000\"}
  }" | jq '.data.id' -r)
echo "Text element: $TEXT_ID"

# Mood element
MOOD_ID=$(curl -s -X POST "$BASE_URL/page-elements" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$TOKEN" \
  -d "{
    \"pageId\": \"$PAGE\",
    \"type\": \"moodTracker\",
    \"x\": 50, \"y\": 200,
    \"width\": 200, \"height\": 150,
    \"content\": {\"mood\": \"happy\", \"scale\": 5}
  }" | jq '.data.id' -r)
echo "Mood element: $MOOD_ID"

# 4. Retrieve all elements
echo "4. Retrieving all page elements..."
ELEMENTS=$(curl -s -X GET "$BASE_URL/page-elements?pageId=$PAGE" \
  -H "Cookie: accessToken=$TOKEN" | jq '.data.elements')

echo "Elements count: $(echo "$ELEMENTS" | jq 'length')"
echo "Element types: $(echo "$ELEMENTS" | jq -r '.[].type')"

echo ""
echo "=== Workflow Complete ==="
```

**Expected Output:**
```
=== Full Page Element Workflow Test ===
1. Creating notebook...
Notebook ID: 550e8400-e29b-41d4-a716-446655440000
2. Creating page...
Page ID: 550e8400-e29b-41d4-a716-446655440001
3. Creating elements...
Text element: 550e8400-e29b-41d4-a716-446655440002
Mood element: 550e8400-e29b-41d4-a716-446655440003
4. Retrieving all page elements...
Elements count: 2
Element types: text
mood
=== Workflow Complete ===
```

---

## Troubleshooting

### Issue: "Invalid Token" or 401 Unauthorized

**Solution:**
```bash
# 1. Register/login to get a token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }'

# 2. Extract token from Set-Cookie header and use in requests
```

### Issue: Page Not Found (404)

**Solution:**
```bash
# 1. Verify page exists
curl -X GET http://localhost:3000/api/notebooks \
  -H "Cookie: accessToken=$TOKEN"

# 2. Create new notebook and page if needed
# 3. Use correct page UUID
```

### Issue: Element Creation Returns 400 with Validation Error

**Solution:**
1. Check that all required fields are present (pageId, type, x, y, width, height, content)
2. Verify type is one of: text, image, emoji, sticker, shape, moodTracker
3. Ensure x, y >= 0
4. Ensure width, height > 0
5. Content must be an object (may be empty {})

### Issue: Compilation Errors in Backend

**Solution:**
```bash
cd backend
npm run clean 2>/dev/null || true
rm -rf dist/
npm run build
npm run dev
```

---

## Success Criteria

All of the following must be true:

1. ✓ Text elements can be created without validation errors
2. ✓ Mood tracker elements can be created without validation errors
3. ✓ All 6 element types are supported
4. ✓ Invalid types are properly rejected with 400 status
5. ✓ Error messages include all valid types
6. ✓ Existing element types (image, emoji, sticker, shape) still work
7. ✓ PATCH updates work for all element types
8. ✓ No TypeScript compilation errors
9. ✓ Full workflow from notebook to elements works end-to-end

---

## Sign-off

- [ ] All tests passed
- [ ] No regressions detected
- [ ] Backend compiles without errors
- [ ] Frontend can now create text elements
- [ ] Frontend can now create mood tracker elements
- [ ] QA verified the fix

**Tested by:** ________________
**Date:** ________________
**Notes:** ________________________________________________________________
