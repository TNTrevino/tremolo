# API Services

This directory contains the API service layer for the Tremolo frontend application. It provides type-safe interfaces to communicate with both backend services.

## Architecture

The application uses a **microservices architecture** with two backend services:

1. **Music Generation Service** (Django, port 8000)
   - Generates MusicXML for various exercises
   - No authentication required

2. **User Tracking Service** (Go, port 5001)
   - User authentication and management
   - Progress tracking and analytics
   - Requires JWT authentication

## Files Overview

### `client.ts`

Axios client configuration with:

- Two separate clients (`musicApiClient`, `mainApiClient`)
- Request interceptors for JWT token attachment
- Response interceptors for token refresh on 401 errors
- Token management utilities
- Automatic retry with refreshed tokens

### `types.ts`

TypeScript type definitions matching backend API contracts:

- Auth & User types
- Note game entry types
- Chart/analytics types
- Music generation types
- Error types

### `auth.service.ts`

Authentication operations:

- `login()` - Authenticate user
- `register()` - Create new account
- `logout()` - Clear session
- `refreshToken()` - Refresh access token
- `getCurrentUser()` - Get authenticated user info
- `isAuthenticated()` - Check auth status

### `music.service.ts`

Music generation operations:

- `generateMary()` - Generate "Mary Had a Little Lamb" in any key
- `generateRandom()` - Generate random notes with rhythm patterns
- `generateNoteGame()` - Generate single note for identification game
- Helper validators for notes and rhythms

### `user.service.ts`

User profile and progress tracking:

- `getProfile()` - Get user profile and stats
- `updateProfile()` - Update user information
- `getStats()` - Get performance metrics for charts
- `saveGameResult()` - Save note game entry
- `getRecentGameEntries()` - Get last 30 game entries
- `getClassMetrics()` - Get aggregated class stats (teachers only)
- Helper utilities for time formatting and NPM calculation

### `index.ts`

Central export point for all services and types.

## Usage Examples

### Authentication

```typescript
import { authService } from '@/services/api';

// Login
try {
  const response = await authService.login({
    email: 'student@example.com',
    password: 'SecurePass123!',
  });
  console.log('Logged in as:', response.user.first_name);
  // Tokens are automatically stored
} catch (error) {
  console.error('Login failed:', error);
}

// Get current user
const user = await authService.getCurrentUser();

// Logout
authService.logout();
```

### Music Generation

```typescript
import { musicService } from '@/services/api';

// Generate "Mary Had a Little Lamb" in D major, octave 4
const maryXml = await musicService.generateMary({
  tonic: 'D',
  octave: 4,
});

// Generate random notes with rhythm pattern
const randomXml = await musicService.generateRandom({
  rhythm: '1111',
  rhythmType: 16,
  tonic: 'C',
});

// Generate note for identification game
const noteGame = await musicService.generateNoteGame({
  scale: 'C',
  octave: '4',
});
console.log('Answer:', noteGame.noteName, noteGame.noteOctave);
// Render noteGame.generatedXml with OpenSheetMusicDisplay
```

### User Profile & Stats

```typescript
import { userService } from '@/services/api';

// Get user profile
const profile = await userService.getProfile(123);
console.log(`${profile.first_name} ${profile.last_name}`);
console.log(`Average NPM: ${profile.average_npm}`);

// Get performance stats for charts
const stats = await userService.getStats(123, {
  interval: 'day',
  days: 30,
});
// Use stats.npm, stats.accuracy, etc. with Chart.js

// Save game result
await userService.saveGameResult({
  time_length: '00:05:30',
  total_questions: 20,
  correct_questions: 18,
  user_id: 123,
  notes_per_minute: 65,
});

// Get recent entries
const recentGames = await userService.getRecentGameEntries();
```

### Error Handling

```typescript
import { authService } from '@/services/api';
import type { ApiError } from '@/services/api';

try {
  await authService.login({ email, password });
} catch (error) {
  const apiError = error as ApiError;
  console.error('Error:', apiError.message);
  console.error('Status:', apiError.status);
}
```

## Environment Variables

Required environment variables (`.env` file):

```bash
VITE_BACKEND_MUSIC=http://localhost:8000
VITE_BACKEND_MAIN=http://localhost:5001
```

## Authentication Flow

1. User calls `authService.login()` with credentials
2. Backend returns access token (short-lived) and refresh token (long-lived)
3. Tokens are stored in localStorage
4. All subsequent requests to `mainApiClient` automatically include the access token
5. If a request returns 401 (token expired):
   - Interceptor automatically calls refresh token endpoint
   - New tokens are stored
   - Original request is retried with new token
   - If refresh fails, user is logged out

## Token Storage

Tokens are stored in localStorage:

- `access_token` - JWT access token (short-lived)
- `refresh_token` - JWT refresh token (long-lived)

Use `clearTokens()` to remove all stored tokens.

## Custom Events

The API client dispatches custom events for app-wide handling:

- `auth:logout` - Fired when user is logged out (automatic or manual)

Listen for these events to update UI state:

```typescript
window.addEventListener('auth:logout', () => {
  // Redirect to login page, clear user state, etc.
});
```

## Type Safety

All services are fully typed with TypeScript. Import types as needed:

```typescript
import type { User, NoteGameEntry, MultiMetricChartData } from '@/services/api';

const user: User = await authService.getCurrentUser();
const entries: NoteGameEntry[] = await userService.getRecentGameEntries();
```

## Testing

When testing components that use these services, mock the service functions:

```typescript
import { vi } from 'vitest';
import * as authService from '@/services/api/auth.service';

vi.spyOn(authService, 'login').mockResolvedValue({
  user: { id: 1, email: 'test@example.com' /* ... */ },
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
});
```

## Future Enhancements

Potential improvements:

- [ ] Add request caching for frequently accessed data
- [ ] Implement retry logic for failed requests
- [ ] Add request cancellation for pending requests
- [ ] Create React Query hooks wrapper
- [ ] Add request/response logging in development
- [ ] Implement rate limiting handling
