# GET /api/auth/verify - Session Verification Endpoint

## Overview

Implementation of the `GET /api/auth/verify` endpoint for frontend session restoration on application startup. This endpoint validates the current JWT token in httpOnly cookies and returns user data if the session is valid.

## Implementation Summary

### Files Modified/Created

1. **backend/src/controllers/authController.ts**
   - Added `verifySession()` handler function
   - Location: Lines 515-607
   - Validates token and returns user data without generating new tokens

2. **backend/src/routes/authRoutes.ts**
   - Added GET /api/auth/verify route
   - Applies `authenticateUser` middleware
   - Calls `verifySession` handler
   - Location: Lines 309-313 (route definition)

3. **backend/src/controllers/__tests__/authController.test.ts** (NEW)
   - Comprehensive unit tests for verifySession endpoint
   - 11 test cases covering success, error, and security scenarios
   - Tests mock authMiddleware and database interactions

## Endpoint Specification

### Route
```
GET /api/auth/verify
```

### Authentication
- **Required**: Yes (authMiddleware validates JWT in cookies)
- **Cookies Used**: `accessToken` (httpOnly)
- **Token Type**: Access token (short-lived, 15 minutes default)

### Request

```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Accept: application/json" \
  --cookie "accessToken=<valid-jwt>"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Session is valid",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "pseudo": "johndoe",
    "bio": "Travel enthusiast",
    "avatarBase64": null,
    "isEmailVerified": true,
    "lastLoginAt": "2024-01-27T10:30:00Z",
    "lastLogoutAt": null,
    "createdAt": "2024-01-20T15:00:00Z",
    "updatedAt": "2024-01-27T10:30:00Z"
  }
}
```

### Error Responses

#### 401 Unauthorized - No Token

```json
{
  "status": "fail",
  "statusCode": 401,
  "message": "Authentication required. Please log in."
}
```

#### 401 Unauthorized - Expired Token

```json
{
  "status": "fail",
  "statusCode": 401,
  "message": "Your session has expired. Please log in again."
}
```

#### 401 Unauthorized - Invalid Token

```json
{
  "status": "fail",
  "statusCode": 401,
  "message": "Invalid authentication token. Please log in again."
}
```

#### 401 Unauthorized - User Not Found

```json
{
  "status": "fail",
  "statusCode": 401,
  "message": "User not found. Please log in again."
}
```

#### 500 Internal Server Error - Database Error

```json
{
  "status": "error",
  "statusCode": 500,
  "message": "Internal server error"
}
```

## Security Analysis

### Authentication & Authorization

✓ **authMiddleware Applied**: Endpoint requires valid JWT in httpOnly cookies
✓ **Token Validation**: Access token signature and expiration verified
✓ **Token Blacklist Check**: Revoked tokens are rejected
✓ **No Auto-Refresh**: Expired tokens are NOT automatically refreshed
- If token is expired but refresh token is valid, returns 401
- Frontend must call POST /api/auth/refresh if auto-refresh is needed

### Data Protection

✓ **Safe JSON Only**: `toSafeJSON()` method removes sensitive fields:
- `passwordHash` - Never exposed
- `passwordResetToken` - Never exposed
- `passwordResetExpiry` - Never exposed
- `deletedAt` - Soft-delete timestamp not exposed

✓ **No Cookie Modification**: Response does NOT set any new cookies
- NO new tokens generated
- NO side effects on database
- Read-only operation

✓ **User Consistency Check**: Verifies user exists in database
- Token can be valid but user account deleted
- Returns 401 if user not found
- Prevents access with stale tokens

### Audit Logging

✓ **Security Events Logged**:
- Successful session verification logged with userId
- Failed authentication logged with context
- Database errors logged appropriately
- No sensitive data logged (passwords, tokens, email in production)

## Test Coverage

### Test File Location
`backend/src/controllers/__tests__/authController.test.ts`

### Test Cases (11 Total)

#### Success Cases (3 tests)
1. ✓ Valid session returns user data
2. ✓ No database modifications (read-only)
3. ✓ User data properly transformed to safe JSON

#### Error Cases (3 tests)
4. ✓ 401 when user not found in database
5. ✓ 500 when database query fails
6. ✓ 401 when userId missing from token

#### Response Format (2 tests)
7. ✓ Response has correct structure with success/message/user
8. ✓ Response returns 200 status with JSON content-type

#### Security Tests (3 tests)
9. ✓ No Set-Cookie headers in response (no token generation)
10. ✓ Audit logging performed for security events
11. ✓ Sensitive user fields never exposed

### Running Tests

```bash
# Run specific test file
npm test -- src/controllers/__tests__/authController.test.ts

# Run with watch mode
npm test -- src/controllers/__tests__/authController.test.ts --watch

# Run with coverage
npm test -- src/controllers/__tests__/authController.test.ts --coverage
```

## Implementation Details

### verifySession Handler

**Location**: `backend/src/controllers/authController.ts:572-607`

**Function Signature**:
```typescript
export const verifySession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void>
```

**Security Features**:
1. Extracts userId from authenticated request (req.user)
2. Validates userId is not undefined
3. Fetches user from database using findByPk()
4. Returns 401 if user not found (deleted account)
5. Converts user to safe JSON (removes sensitive fields)
6. Logs successful verification for audit trail
7. Returns 200 OK with user data

**No Token Operations**:
- Does NOT call generateAccessToken()
- Does NOT call generateRefreshToken()
- Does NOT call setAuthTokens()
- Does NOT refresh expired tokens

### Route Registration

**Location**: `backend/src/routes/authRoutes.ts:309-313`

```typescript
router.get(
  '/verify',
  authenticateUser,  // Middleware validates JWT
  verifySession      // Handler returns user data
);
```

**Middleware Chain**:
1. Cookie Parser - Extracts accessToken from cookies
2. authenticateUser - Validates JWT and attaches user to req
3. verifySession - Returns user data

**Error Handling**:
- authMiddleware throws 401 if no token or invalid token
- errorHandler catches errors and returns appropriate status

## Frontend Integration

### Usage in Frontend

```typescript
// In frontend auth store or app initialization
async function verifySession() {
  try {
    const response = await axios.get('/api/auth/verify');

    if (response.status === 200) {
      // Session valid - restore user data
      authStore.setUser(response.data.user);
      return true;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      // Token invalid or expired
      // Try to refresh token
      try {
        await axios.post('/api/auth/refresh');
        // If refresh succeeds, try verify again
        return verifySession();
      } catch {
        // Refresh failed - require login
        authStore.logout();
        return false;
      }
    }
    throw error;
  }
}

// Call on app startup
onBeforeMount(async () => {
  const sessionValid = await verifySession();
  if (!sessionValid) {
    router.push('/login');
  }
});
```

## Behavior Specification

| Scenario | Status | Token Action | Response |
|----------|--------|--------------|----------|
| Valid token, user exists | 200 | None | User data |
| Valid token, user deleted | 401 | None | "User not found" |
| Expired token | 401 | None | "Session expired" |
| Invalid/malformed token | 401 | None | "Invalid token" |
| No token provided | 401 | None | "Auth required" |
| Database error | 500 | None | "Internal error" |
| Valid token, revoked | 401 | None | "Revoked token" |

## Security Considerations

### What This Endpoint Does
- ✓ Validates current JWT token
- ✓ Returns user data if valid
- ✓ Checks token signature and expiration
- ✓ Verifies user exists in database
- ✓ Removes sensitive fields from response
- ✓ Logs verification for audit trail

### What This Endpoint Does NOT Do
- ✗ Generate new tokens
- ✗ Modify existing tokens
- ✗ Auto-refresh expired tokens
- ✗ Update lastLoginAt timestamp
- ✗ Modify database
- ✗ Expose sensitive user fields
- ✗ Allow token refresh logic

### Token Lifecycle

```
POST /api/auth/login
  ├─ Generate accessToken (15m) + refreshToken (7d)
  ├─ Set both in httpOnly cookies
  └─ Return user data + 200 OK

GET /api/auth/verify (during session)
  ├─ Read accessToken from cookie
  ├─ Validate signature + expiration
  ├─ Return user data + 200 OK
  └─ NO token changes

GET /api/auth/verify (token expired)
  ├─ Read accessToken from cookie
  ├─ Check expiration: EXPIRED
  ├─ Return 401 "Session expired"
  └─ Frontend calls POST /api/auth/refresh

POST /api/auth/refresh (token expired)
  ├─ Read refreshToken from cookie
  ├─ Validate refreshToken
  ├─ Generate new accessToken
  ├─ Set new accessToken in cookie
  └─ Return 200 OK

GET /api/auth/verify (after refresh)
  ├─ Read NEW accessToken from cookie
  ├─ Validate: SUCCESS
  ├─ Return user data + 200 OK
  └─ Session restored
```

## Compilation Status

✓ **TypeScript Compilation**: No errors
✓ **Type Safety**: Fully typed with AuthRequest interface
✓ **Linting**: Complies with project standards
✓ **Build**: Successfully builds to JavaScript

## Files Changed

### Modified
- `/backend/src/controllers/authController.ts` (added verifySession function)
- `/backend/src/routes/authRoutes.ts` (added GET /api/auth/verify route)

### Created
- `/backend/src/controllers/__tests__/authController.test.ts` (unit tests)

## API Documentation Updates

### Swagger/OpenAPI

The endpoint should be documented in Swagger as:

```yaml
/api/auth/verify:
  get:
    summary: Verify user session
    description: |
      Check if the current session is valid by verifying the JWT token.
      Used by frontend on app startup to restore user session.
      Does NOT generate new tokens.
    tags:
      - Authentication
    security:
      - bearerAuth: []
    responses:
      '200':
        description: Session is valid
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                message:
                  type: string
                user:
                  $ref: '#/components/schemas/User'
      '401':
        description: Session invalid or expired
      '500':
        description: Server error
```

## Next Steps

1. **Frontend Integration**: Implement verifySession() call in app initialization
2. **Error Handling**: Handle 401 responses to redirect to login
3. **Token Refresh**: Implement auto-refresh logic if needed
4. **Testing**: Test with real database and cookies
5. **Monitoring**: Monitor logs for session verification failures

## References

- **JWT Module**: `backend/src/utils/jwt.ts` (token validation)
- **Auth Middleware**: `backend/src/middleware/authMiddleware.ts` (token authentication)
- **User Model**: `backend/src/models/User.ts` (user database operations)
- **Error Handler**: `backend/src/middleware/errorHandler.ts` (error responses)
- **Logger**: `backend/src/utils/logger.ts` (audit logging)

## Security Checklist

- [x] Requires authentication (authMiddleware)
- [x] Validates JWT signature
- [x] Checks token expiration
- [x] Checks token blacklist (revoked tokens)
- [x] Verifies user exists in database
- [x] Returns only safe user data
- [x] No new tokens generated
- [x] No database modifications
- [x] Audit logging implemented
- [x] Error messages don't leak information
- [x] CORS properly configured
- [x] Rate limiting not needed (auth-protected)
- [x] TypeScript strict mode compliant
- [x] Error handling comprehensive
