# Backend Environment Setup - Quick Guide

## Problem

The backend fails to start with these errors:
```
API key does not start with "SG.".
ERROR Missing required Cloudinary environment variables: CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
Error: Cloudinary configuration error: CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are required
```

## Quick Fix (5 minutes)

### Option 1: Development Mode - Skip Optional Services

Use this approach for **local development only**:

```bash
# Navigate to backend directory
cd backend

# Copy the example file
cp .env.example .env

# Edit .env and set these to skip Cloudinary and SendGrid
ENABLE_MEDIA_FEATURES=false
ENABLE_EMAIL_SERVICE=false

# Start the server
npm run dev
```

**Result:** Backend starts successfully. Media uploads and email features will fail gracefully at runtime.

---

### Option 2: Production Ready - Use Real Services

Use this approach for **production and full feature testing**:

#### Step 1: Get Cloudinary Credentials (2 minutes)

1. Go to https://cloudinary.com
2. Sign up for a free account (no credit card needed)
3. Log in to your account
4. Find your credentials in Dashboard:
   - **Cloud Name:** Top of page
   - **API Key:** Settings → API Keys
   - **API Secret:** Settings → API Keys (sensitive, keep safe)

#### Step 2: Get SendGrid Credentials (2 minutes)

1. Go to https://sendgrid.com
2. Sign up for a free account
3. Log in and go to Settings → API Keys
4. Click "Create API Key"
5. Name it "Ithaka Dev" and save the key (starts with "SG.")
   - **Important:** Copy immediately, you won't see it again!
6. Go to Settings → Sender Authentication → Verify a Single Sender
   - Add your email address and verify it

#### Step 3: Create .env File

```bash
cd backend

# Create .env from template
cp .env.example .env

# Edit .env and update these sections
```

**Update these lines in .env:**

```env
# Cloudinary - from https://cloudinary.com dashboard
ENABLE_MEDIA_FEATURES=true
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key_12345
CLOUDINARY_API_SECRET=your_api_secret_abcde

# SendGrid - from https://sendgrid.com settings
ENABLE_EMAIL_SERVICE=true
SENDGRID_API_KEY=SG.your_actual_sendgrid_key_here
SENDGRID_FROM_EMAIL=your.email@example.com
```

#### Step 4: Start Backend

```bash
npm run dev

# You should see:
# "Server is running successfully on port 3000"
```

---

## Verification

### Check if backend started correctly

```bash
# In another terminal
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"...","environment":"development","database":"connected"}
```

### Check if Cloudinary is configured

```bash
# Try uploading a file via the API
# If it works: Cloudinary is properly configured
# If it fails with "Cloudinary configuration error": Check your .env values
```

### Check if SendGrid is configured

```bash
# Try password reset feature
# If email is sent: SendGrid is properly configured
# If it fails: Check your SENDGRID_API_KEY (must start with "SG.")
```

---

## Common Issues and Solutions

### Issue: "API key does not start with SG."

**Cause:** Invalid SendGrid API key

**Solution:**
1. Go to https://sendgrid.com Settings → API Keys
2. Create a new API Key (not an existing one)
3. Verify it starts with "SG."
4. Update SENDGRID_API_KEY in .env

---

### Issue: "CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are required"

**Cause:** Missing Cloudinary configuration

**Solution (Choose one):**

Option A: Add real Cloudinary credentials
- Get from https://cloudinary.com dashboard
- Add to .env

Option B: Disable media features for now
- Set `ENABLE_MEDIA_FEATURES=false` in .env
- Backend will start, media uploads will fail at runtime

---

### Issue: "SENDGRID_API_KEY is not defined"

**Cause:** Missing SendGrid configuration

**Solution (Choose one):**

Option A: Add real SendGrid API key
- Get from https://sendgrid.com Settings → API Keys
- Add to .env

Option B: Disable email service for now
- Set `ENABLE_EMAIL_SERVICE=false` in .env
- Backend will start, emails will fail at runtime

---

## Minimal .env for Development

If you just want to start the backend quickly:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://ithaka_user:password@localhost:5432/ithaka_db
JWT_SECRET=dev_jwt_secret_min_64_chars_needed_for_production_security_12345678901
JWT_REFRESH_SECRET=dev_jwt_refresh_secret_min_64_chars_needed_for_production_12345678
COOKIE_SECRET=dev_cookie_secret_min_32_chars_needed_1234567890
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5173
ENABLE_MEDIA_FEATURES=false
ENABLE_EMAIL_SERVICE=false
```

Then run:
```bash
npm run dev
```

---

## Full Production .env Example

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

DATABASE_URL=postgresql://ithaka_user:secure_password@prod-db.example.com:5432/ithaka_db

JWT_SECRET=your_64_char_secure_random_jwt_secret_from_crypto_module_1234567890abc
JWT_REFRESH_SECRET=your_64_char_secure_random_refresh_secret_from_crypto_module_abc123
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

COOKIE_SECRET=your_32_char_secure_random_cookie_secret_from_crypto_module_12345

FRONTEND_URL=https://ithaka.example.com
ALLOWED_ORIGINS=https://ithaka.example.com,https://www.ithaka.example.com
FORCE_HTTPS=true

ENABLE_MEDIA_FEATURES=true
CLOUDINARY_NAME=your_production_cloud_name
CLOUDINARY_API_KEY=your_production_api_key
CLOUDINARY_API_SECRET=your_production_api_secret

ENABLE_EMAIL_SERVICE=true
SENDGRID_API_KEY=SG.your_production_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@ithaka.example.com
```

---

## Generate Secure Secrets

For production, generate cryptographically secure secrets:

```bash
# Generate JWT secret (copy into JWT_SECRET)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT refresh secret (copy into JWT_REFRESH_SECRET)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate cookie secret (copy into COOKIE_SECRET)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Next Steps

1. Copy `.env.example` to `.env`
2. Fill in required values (at minimum: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET)
3. For full features: Add Cloudinary and SendGrid credentials
4. Run `npm run dev`
5. Test with `curl http://localhost:3000/health`

For detailed documentation, see: `BACKEND_STARTUP_ERROR_ANALYSIS.md`
