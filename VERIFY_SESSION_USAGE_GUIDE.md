# GET /api/auth/verify - Usage Guide

## Quick Reference

| Aspect | Details |
|--------|---------|
| **Endpoint** | `GET /api/auth/verify` |
| **Authentication** | Required (JWT in httpOnly cookie) |
| **Purpose** | Verify session validity without token refresh |
| **Response Time** | < 100ms |
| **Side Effects** | None (read-only) |

## Use Cases

### 1. App Startup - Restore User Session

When the application loads, check if the user has an active session:

```typescript
// app.ts or main.ts
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Before mounting, verify session
const authStore = useAuthStore()

const verifySessionBeforeMount = async () => {
  try {
    const response = await axios.get('/api/auth/verify')

    if (response.status === 200) {
      // Session valid - restore user
      authStore.setUser(response.data.user)
      authStore.setIsAuthenticated(true)
      return true
    }
  } catch (error) {
    // Session invalid
    authStore.logout()
    return false
  }
}

app.mount('#app')
verifySessionBeforeMount()
```

### 2. Page Reload - Restore Session

Preserve user state across page reloads:

```typescript
// router/guards.ts
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // If no user in store but token in cookie, verify session
  if (!authStore.user && to.meta.requiresAuth) {
    try {
      const response = await axios.get('/api/auth/verify')
      authStore.setUser(response.data.user)
      next()
    } catch {
      next('/login')
    }
  } else {
    next()
  }
})
```

### 3. Session Validation Check

Verify session is still valid before making sensitive requests:

```typescript
// composables/useSessionValidation.ts
export const useSessionValidation = () => {
  const isSessionValid = async (): Promise<boolean> => {
    try {
      await axios.get('/api/auth/verify')
      return true
    } catch (error) {
      if (error.response?.status === 401) {
        // Try refresh
        try {
          await axios.post('/api/auth/refresh')
          // Verify again after refresh
          await axios.get('/api/auth/verify')
          return true
        } catch {
          return false
        }
      }
      return false
    }
  }

  return { isSessionValid }
}
```

### 4. Periodic Session Check

Poll periodically to detect session expiration:

```typescript
// composables/useSessionMonitor.ts
export const useSessionMonitor = () => {
  const authStore = useAuthStore()
  let checkInterval: NodeJS.Timeout | null = null

  const startMonitoring = (intervalMs = 5 * 60 * 1000) => {
    checkInterval = setInterval(async () => {
      try {
        await axios.get('/api/auth/verify')
      } catch (error) {
        if (error.response?.status === 401) {
          // Session expired
          authStore.logout()
          router.push('/login')
        }
      }
    }, intervalMs)
  }

  const stopMonitoring = () => {
    if (checkInterval) clearInterval(checkInterval)
  }

  return { startMonitoring, stopMonitoring }
}
```

## Error Handling

### Case 1: No Token (401)

```typescript
try {
  await axios.get('/api/auth/verify')
} catch (error) {
  if (error.response?.status === 401) {
    // No valid session
    // Redirect to login
    router.push('/login')
  }
}
```

### Case 2: Expired Token (401)

```typescript
try {
  await axios.get('/api/auth/verify')
} catch (error) {
  if (error.response?.status === 401) {
    if (error.response?.data?.message.includes('expired')) {
      // Token expired - try to refresh
      try {
        await axios.post('/api/auth/refresh')
        // After refresh, verify session again
        const response = await axios.get('/api/auth/verify')
        authStore.setUser(response.data.user)
      } catch {
        // Refresh failed - require login
        authStore.logout()
        router.push('/login')
      }
    }
  }
}
```

### Case 3: Database Error (500)

```typescript
try {
  await axios.get('/api/auth/verify')
} catch (error) {
  if (error.response?.status === 500) {
    // Server error
    // Show error message but don't logout
    ElMessage.error('Unable to verify session. Please refresh.')
  }
}
```

## Implementation Examples

### Full Authentication Flow

```typescript
// services/authService.ts
export class AuthService {
  /**
   * Restore user session on app startup
   */
  async restoreSession(): Promise<boolean> {
    try {
      const response = await api.get('/auth/verify')

      if (response.status === 200) {
        return true
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // Try to refresh
        return await this.refreshSession()
      }
    }
    return false
  }

  /**
   * Refresh access token if possible
   */
  async refreshSession(): Promise<boolean> {
    try {
      await api.post('/auth/refresh')
      // After refresh, verify the new token
      const response = await api.get('/auth/verify')
      return response.status === 200
    } catch {
      return false
    }
  }

  /**
   * Verify session is still active
   */
  async verifySession(): Promise<User | null> {
    try {
      const response = await api.get('/auth/verify')
      return response.data.user
    } catch {
      return null
    }
  }
}
```

### Pinia Store Integration

```typescript
// stores/auth.ts
import { defineStore } from 'pinia'
import { authService } from '@/services/authService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    isLoading: false,
    isAuthenticated: false,
  }),

  actions: {
    async initializeAuth() {
      this.isLoading = true
      try {
        const isValid = await authService.restoreSession()

        if (isValid) {
          const user = await authService.verifySession()
          this.user = user
          this.isAuthenticated = true
        } else {
          this.isAuthenticated = false
        }
      } finally {
        this.isLoading = false
      }
    },

    async refreshIfNeeded() {
      if (this.isAuthenticated) {
        const user = await authService.verifySession()

        if (!user) {
          // Session expired, try refresh
          if (await authService.refreshSession()) {
            const refreshedUser = await authService.verifySession()
            this.user = refreshedUser
          } else {
            this.logout()
          }
        }
      }
    },

    logout() {
      this.user = null
      this.isAuthenticated = false
    },
  },
})
```

### Vue Component Usage

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

onMounted(async () => {
  // Verify session on component mount
  try {
    await authStore.initializeAuth()

    if (!authStore.isAuthenticated) {
      router.push('/login')
    }
  } catch (error) {
    console.error('Auth initialization failed:', error)
    router.push('/login')
  }
})
</script>

<template>
  <div v-if="authStore.isLoading" class="loading">
    <div class="spinner">Restoring session...</div>
  </div>

  <div v-else-if="authStore.isAuthenticated" class="dashboard">
    <h1>Welcome, {{ authStore.user?.firstName }}!</h1>
  </div>

  <div v-else class="login-redirect">
    Redirecting to login...
  </div>
</template>
```

## Best Practices

### 1. Always Handle Errors

```typescript
// Good
try {
  await axios.get('/api/auth/verify')
} catch (error) {
  // Handle 401 (invalid/expired)
  // Handle 500 (server error)
  // Show user-friendly messages
}

// Avoid
await axios.get('/api/auth/verify') // No error handling
```

### 2. Don't Spam the Endpoint

```typescript
// Good - Check once on app load
onBeforeMount(async () => {
  await verifySession()
})

// Avoid - Checking every render
watch(isVisible, async () => {
  await verifySession() // Too frequent
})
```

### 3. Combine with Token Refresh

```typescript
// Good - Retry with refresh on 401
try {
  await axios.get('/api/auth/verify')
} catch (error) {
  if (error.response?.status === 401) {
    try {
      await axios.post('/api/auth/refresh')
      await axios.get('/api/auth/verify') // Retry
    } catch {
      logout()
    }
  }
}

// Avoid - No refresh attempt
try {
  await axios.get('/api/auth/verify')
} catch {
  logout() // Immediate logout without refresh
}
```

### 4. Use Proper Loading States

```typescript
// Good - Show loading indicator
const isVerifying = ref(false)

onMounted(async () => {
  isVerifying.value = true
  try {
    await verifySession()
  } finally {
    isVerifying.value = false
  }
})

// Avoid - No loading feedback
onMounted(async () => {
  await verifySession()
})
```

### 5. Secure Cookie Configuration

The backend automatically:
- ✓ Sets cookies as httpOnly (not accessible via JavaScript)
- ✓ Marks as Secure (only transmitted over HTTPS in production)
- ✓ Uses SameSite=Strict (CSRF protection)

Your frontend should:
- ✓ Never manually set accessToken or refreshToken
- ✓ Always use axios (handles cookies automatically)
- ✓ Never read tokens from cookies (read user data from response)

```typescript
// Good - Let axios handle cookies
const response = await axios.get('/api/auth/verify')
const userData = response.data.user // Get user from response

// Avoid - Trying to read cookies
const token = localStorage.getItem('accessToken') // Not stored here
const token = document.cookie.split('accessToken=')[1] // Don't do this
```

## Performance Tips

### 1. Debounce Session Checks

```typescript
import { useDebounceFn } from '@vueuse/core'

const checkSession = useDebounceFn(
  async () => {
    await axios.get('/api/auth/verify')
  },
  1000 // Wait 1s before checking
)
```

### 2. Cache Results Briefly

```typescript
let lastCheckTime = 0
const CACHE_DURATION = 60 * 1000 // 1 minute

async function verifySessionCached() {
  if (Date.now() - lastCheckTime < CACHE_DURATION) {
    return true // Use cached result
  }

  const result = await axios.get('/api/auth/verify')
  lastCheckTime = Date.now()
  return result.status === 200
}
```

### 3. Lazy Session Initialization

```typescript
// Only verify when needed, not on every route
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth && !authStore.user) {
    // Only verify if accessing protected route
    try {
      await authStore.initializeAuth()
    } catch {
      return next('/login')
    }
  }
  next()
})
```

## Troubleshooting

### Issue: "Session is valid" but user is null

**Cause**: Response data structure issue

**Solution**:
```typescript
const response = await axios.get('/api/auth/verify')
console.log(response.data) // Should have: { success, message, user }
const user = response.data.user // Not response.data.data.user
```

### Issue: 401 on every request

**Cause**: Cookie not being sent or token expired

**Solution**:
```typescript
// Ensure axios sends cookies
const api = axios.create({
  withCredentials: true // This is critical
})

// Check if token is expired
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Try to refresh
      try {
        await api.post('/auth/refresh')
        return api.request(error.config) // Retry original request
      } catch {
        // Refresh failed
      }
    }
    return Promise.reject(error)
  }
)
```

### Issue: "User not found" error

**Cause**: User account deleted but token still valid

**Solution**:
```typescript
try {
  await axios.get('/api/auth/verify')
} catch (error) {
  if (error.response?.data?.message.includes('User not found')) {
    // Account was deleted
    authStore.logout()
    router.push('/login')
  }
}
```

## Security Notes

1. **Never Store Token**: Token is in httpOnly cookie, don't try to store it
2. **Never Log Token**: Don't log JWT tokens in console or logs
3. **Always Use HTTPS**: Cookies should be transmitted over HTTPS only
4. **CSRF Protection**: Cookies have SameSite=Strict enabled
5. **No Local Storage**: Don't store auth tokens in localStorage

## API Response Examples

### Success
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Accept: application/json" \
  --cookie "accessToken=eyJhbGciOiJIUzI1NiIs..."

# Response 200 OK
{
  "success": true,
  "message": "Session is valid",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    ...
  }
}
```

### Token Expired
```bash
# Response 401 Unauthorized
{
  "status": "fail",
  "statusCode": 401,
  "message": "Your session has expired. Please log in again."
}
```

### No Token
```bash
# Response 401 Unauthorized
{
  "status": "fail",
  "statusCode": 401,
  "message": "Authentication required. Please log in."
}
```

## Summary

The `GET /api/auth/verify` endpoint enables:
- ✓ Session restoration on app startup
- ✓ Detecting expired sessions
- ✓ Validating active sessions
- ✓ Seamless user experience across page reloads

Use it to restore user context and improve user experience without requiring re-login.
