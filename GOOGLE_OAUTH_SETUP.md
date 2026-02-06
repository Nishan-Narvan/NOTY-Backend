# Google OAuth 2.0 Setup Guide

## Overview
This guide explains how to set up and use Google OAuth 2.0 authentication in the NOTY application.

## What's Been Implemented

### Routes
The following Google OAuth endpoints are now available:

1. **Initiate Google OAuth**
   - Route: `GET /api/auth/google`
   - Purpose: Redirects user to Google's OAuth consent screen
   - Usage: User clicks "Sign in with Google" button

2. **Google OAuth Callback**
   - Route: `GET /api/auth/google/callback`
   - Purpose: Handles Google's redirect after user authorization
   - Returns: JWT token and user info via redirect to frontend

3. **Auth Failure Handler**
   - Route: `GET /api/auth/google/failure`
   - Purpose: Handles authentication failures
   - Returns: Error response

4. **Get Current User**
   - Route: `GET /api/auth/me` (Protected)
   - Purpose: Returns current authenticated user info
   - Requires: Valid JWT token

### Database Schema Updates
- Added `googleId` field to User model (unique, optional)
- Changed `password` field to optional (for OAuth users without password)

### Existing Endpoints (Unchanged)
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `GET /api/auth/profile` - Get user profile (protected)
- `POST /api/auth/logout` - Logout endpoint

## Setup Steps

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the Google+ API
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)
   - Copy the Client ID and Client Secret

### Step 2: Create .env File

Copy `.env_sample` to `.env` and add your credentials:

```bash
cp .env_sample .env
```

Edit `.env` and add:

```plaintext
GOOGLE_CLIENT_ID="your-client-id-here"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
CLIENT_URL="http://localhost:5173"  # Frontend URL for redirects
```

### Step 3: Run Database Migration

After updating the schema, run:

```bash
npx prisma migrate dev --name add_google_oauth
```

This creates a migration for the schema changes (adds googleId field, makes password optional).

### Step 4: Test the Flow

#### Using Browser
1. Navigate to: `http://localhost:5000/api/auth/google`
2. You'll be redirected to Google's consent screen
3. After granting permission, you'll be redirected to:
   `http://localhost:5173/auth-success?token=<JWT_TOKEN>&userId=<USER_ID>&email=<EMAIL>`

#### Using Frontend Integration
In your frontend (React), create a login button that links to:
```jsx
<a href="http://localhost:5000/api/auth/google">
  Sign in with Google
</a>
```

Or use an OAuth library like `@react-oauth/google`:

```jsx
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

<GoogleOAuthProvider clientId="your-client-id">
  <GoogleLogin
    onSuccess={(credentialResponse) => {
      // Send credentialResponse to your backend
    }}
    onError={() => console.log('Login Failed')}
  />
</GoogleOAuthProvider>
```

#### API Testing (cURL)
```bash
# Test if Google OAuth is working
curl -X GET http://localhost:5000/api/auth/google \
  -L \  # Follow redirects
  -v    # Verbose to see redirects
```

## How It Works

### Flow Diagram
```
1. User clicks "Sign in with Google"
   ↓
2. Frontend redirects to: GET /api/auth/google
   ↓
3. Passport authenticates with Google
   ↓
4. User logs in with Google account
   ↓
5. Google redirects to: GET /api/auth/google/callback
   ↓
6. Passport receives user profile
   ↓
7. Backend checks if user exists in DB:
   - If exists: Use existing user
   - If not: Create new user with googleId
   ↓
8. JWT token is generated
   ↓
9. User is redirected to frontend with token
   ↓
10. Frontend stores token in localStorage/sessionStorage
    and treats user as authenticated
```

## Implementation Details

### Passport Configuration
File: `src/config/passport.js`

```javascript
new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  // Find or create user in database
});
```

### User Creation
When a new user signs in with Google:
- `email` is extracted from Google profile
- `name` is extracted from Google displayName
- `googleId` is stored for future logins
- `password` field is left NULL

### Authentication Flow
1. Passport middleware handles OAuth dance
2. User profile is validated
3. User is created or fetched from database
4. JWT token is generated using the same utility as email/password login
5. Token is passed to frontend via URL redirect

## Error Handling

### Common Issues

**Issue**: "Redirect URI mismatch"
- **Solution**: Ensure the redirect URI in Google Console matches exactly:
  - Protocol (http/https)
  - Domain
  - Port
  - Path

**Issue**: "Cannot find module 'passport'"
- **Solution**: Run `npm install passport passport-google-oauth20`

**Issue**: "GOOGLE_CLIENT_ID is undefined"
- **Solution**: Check `.env` file has correct values and server is restarted

**Issue**: "User not found after callback"
- **Solution**: Ensure Prisma migrations are run: `npx prisma migrate dev`

## Production Checklist

- [ ] Use HTTPS (not HTTP)
- [ ] Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- [ ] Add production redirect URI to Google Console
- [ ] Set NODE_ENV to "production"
- [ ] Update CLIENT_URL to production frontend URL
- [ ] Set JWT_SECRET to strong random string
- [ ] Enable SSL/TLS on database connection
- [ ] Test complete auth flow in staging environment

## Frontend Integration Example

```javascript
// After receiving token from Google callback
const token = new URLSearchParams(window.location.search).get('token');

if (token) {
  localStorage.setItem('authToken', token);
  
  // Redirect to dashboard
  window.location.href = '/dashboard';
}

// For subsequent API calls
fetch('http://localhost:5000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
});
```

## Testing the Endpoint

```bash
# 1. Start the server
npm run dev

# 2. Visit in browser
http://localhost:5000/api/auth/google

# 3. Complete Google sign-in flow

# 4. You should be redirected to:
http://localhost:5173/auth-success?token=<jwt_token>&userId=<id>&email=<email>

# 5. Test getting current user (replace with actual token)
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <your_jwt_token>"
```

## References

- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [JWT Authentication](https://jwt.io/introduction)

## Support

For issues or questions, check:
1. Google Console OAuth credentials are correct
2. Database migrations have been run
3. Environment variables are set
4. Server is restarted after .env changes
