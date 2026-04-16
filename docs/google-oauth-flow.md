# Google OAuth Flow

Tremolo uses the **authorization code** grant type. The browser never touches the client secret — it picks up a one-time code from Google and hands it to the backend, which pairs the code with the secret to get the user's identity.

## Step 1 — Redirect to Google

User clicks the sign-in button. The frontend builds a URL pointing at Google's OAuth server and navigates there via a full-page redirect.

- `GoogleSignInButton` (`frontend/src/features/auth/components/GoogleSignInButton.tsx`) — click handler calls `getGoogleOAuthURL()` and sets `window.location.href`.
- `getGoogleOAuthURL` (`frontend/src/features/auth/services/google-oauth.ts`) — constructs the URL with `VITE_GOOGLE_CLIENT_ID`, a `redirect_uri` from `getRedirectUri()`, requested scopes (`openid email profile`), and a random `state` parameter stored in `sessionStorage` for CSRF protection.

The browser leaves the app entirely. Tremolo is not running any code during the consent screen.

## Step 2 — Google redirects back with a code

After the user approves, Google 302-redirects the browser to:

```
http://localhost:5173/auth/google/callback?code=<authorization_code>&state=<state>
```

The `code` is a short-lived one-time claim ticket (~60 seconds). It cannot be used directly — it must be exchanged server-side with the client secret.

## Step 3 — Frontend validates and forwards the code

- `GoogleCallbackPage` (`frontend/src/pages/GoogleCallbackPage.tsx`) — mounts on the callback route, extracts `code` and `state` from the URL.
- `verifyOAuthState` (`frontend/src/features/auth/services/google-oauth.ts`) — compares the `state` parameter against the value stored in `sessionStorage`. Rejects the callback if they don't match (prevents CSRF).
- If validation passes, calls `googleCallback.mutate({ code, redirect_uri })` which triggers a `POST /api/auth/google/callback` to the backend.

## Step 4 — Backend exchanges code for identity

- `GoogleCallback` (`backend/main/services/google_auth_service.go`) — receives the code and makes a server-to-server POST to Google's token endpoint, sending the code along with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Google returns an **ID token** (a signed JWT containing the user's email, name, and Google subject ID). The backend verifies the token's signature, then either creates a new user or looks up the existing one, and issues Tremolo's own JWT access + refresh tokens.

## Step 5 — Frontend stores tokens and navigates

- `useGoogleCallback` (`frontend/src/shared/hooks/queries/useAuthQuery.ts`) — the mutation hook's `onSuccess` calls `handleLoginSuccess` which saves tokens to the Zustand auth store (persisted to `localStorage`) and populates the TanStack Query cache with the user object. Then it calls `navigate("/dashboard")`.

## Environment variables

| Variable | Where it's read | Purpose |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Frontend (`google-oauth.ts`) | Public client ID embedded in the OAuth URL sent to Google |
| `GOOGLE_CLIENT_ID` | Backend (`google_auth_service.go`) | Same value — used to verify ID token audience |
| `GOOGLE_CLIENT_SECRET` | Backend (`google_auth_service.go`) | Proves server identity when exchanging the code with Google |

`VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` hold the same value. Both are needed because Vite only exposes env vars prefixed with `VITE_` to the browser, and the Go backend reads env vars by their exact name.

## Security properties

- **Client secret stays server-side.** The browser never sees `GOOGLE_CLIENT_SECRET`. The authorization code flow exists specifically to keep this split.
- **CSRF protection via `state`.** A random value generated per sign-in attempt, stored in `sessionStorage`, and verified on callback. An attacker can't forge a valid callback without knowing the state the user's tab generated.
- **Redirect URI must match everywhere.** Google checks it against the registered list in the Cloud Console. The backend sends it back to Google during the exchange. If any party disagrees on the URI, the flow fails.
