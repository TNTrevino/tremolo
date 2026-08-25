# Security

What this service actually does, as of the #237 (email & account recovery) and #238 (teacher trust) stacks. Every claim below names the file that proves it. If you change one of those files and this document stops being true, this document is the bug.

Last verified against the code: 2026-08-25.

## Authentication

### Two tokens, both stateless

Signing in returns two HS256 JWTs (core-api/middleware/auth_middleware.go):

| Token | Claim | Lifetime | Sent on |
|---|---|---|---|
| Access | token_type "access" | ACCESS_TOKEN_EXPIRY_MINUTES (15 as deployed) | Every API request |
| Refresh | token_type "refresh" | REFRESH_TOKEN_EXPIRY_HOURS (168 = 7 days as deployed) | POST /api/auth/refresh only |

Both carry user_id and are signed with JWT_SECRET. InitJWTSecret() panics at startup if JWT_SECRET is missing or shorter than MinJWTSecretLength (32), and it eagerly reads both expiry variables so a missing one is a boot failure rather than a runtime surprise.

middleware.RequireAuth verifies the signature, verifies token_type == "access", and puts the user id on the request context under an unexported typed key. Handlers read it with middleware.AuthenticatedUserID(r), which returns an error when the middleware is absent — a route that loses its middleware fails closed rather than serving user 0's data. Presenting a refresh token where an access token belongs is a 401 with the distinct body {"error":"Invalid token type"}.

### The refresh token does not rotate, and cannot be revoked

POST /api/auth/refresh validates the refresh token and returns only a new access token (services.RefreshToken; handleRefreshToken). The refresh token itself is unchanged and stays valid for its full lifetime.

There is no token store, no allow-list, no deny-list, and no jti. Three consequences worth stating out loud:
1. A stolen refresh token is usable until it expires — up to seven days.
2. Changing or resetting a password does not invalidate tokens already issued.
3. There is no way to sign a user out of another device.

This is the single largest gap in the service's authentication design. See "Known limits".

### Token storage in the browser

The Angular app keeps both tokens in localStorage (frontend/src/app/auth/services/token.storage.ts) and persists the session envelope under "tremolo-auth" (auth.store.ts). This is a deliberate trade with a real cost: any successful XSS against the app is a full account takeover, because the script can read both tokens and the refresh token cannot be revoked. httpOnly cookies would remove that, at the cost of a CSRF design the two-host deployment would need solved. Until then the mitigation is not having an XSS: Angular escapes interpolation by default, the app never uses innerHTML with user content, and a Content Security Policy is tracked in #260.

Two interceptors (app.config.ts): auth.interceptor.ts attaches the bearer token; refresh.interceptor.ts retries a 401 once after refreshing, deduplicating concurrent 401s onto one shared refresh.

## Passwords

- bcrypt at services.BcryptCost = 12. Plaintext never stored, never logged.
- Complexity enforced on register, login and reset by one shared rule, `addPasswordProblem` in core-api/DTOs/auth_dtos.go: at least 8 characters and at most 72 bytes (bcrypt's own limit — added after the #238 stack shipped, per the #269 review, because a password longer than that used to reach `bcrypt.GenerateFromPassword` and error deep inside `Register`), with uppercase, lowercase, digit and special character (validations.PasswordComplexity). "Shared" covers those three self-service routes, not every password check in the service: a second, independent copy of the same rule — minus the 72-byte cap — gates admin-created users (`CreateUserRequest.Valid`, core-api/DTOs/user_dto.go). And the account page's "change password" card does not reach the server at all — `submitPasswordChange` (frontend/src/app/features/account/components/account-page/account-page.component.ts) shows a "coming soon" toast and returns without an HTTP call, and core-api/controllers/user_info_controller.go registers one GET route and no change-password route.
- A Google-only account has a NULL password; Login rejects an empty hash before bcrypt, so a Google account cannot be signed into with an empty password.

## Account lockout

Login counts failed attempts per email in users.failed_login_attempts. At services.MaxLoginAttempts (5), users.locked_until is set to now plus getLockoutDuration() (ACCOUNT_LOCKOUT_DURATION_MINUTES, default 15). CheckAccountLocked runs before any bcrypt work. A successful sign-in resets the counter.

Documentation discrepancy, unresolved: MAX_LOGIN_ATTEMPTS appears in .env.example, README.md, docs/self-hosting.md, and two GitHub Actions workflows (.github/workflows/api-smoke.yml, .github/workflows/core-api.yml) — an operator has five places to read it as a real, tunable setting — but no Go code reads it (`grep -rn MAX_LOGIN_ATTEMPTS core-api --include=*.go` returns nothing); the threshold is the hard-coded constant. Either wire it or drop it from those files.

Lockout is per email, not per IP, so it does not stop a spray across many accounts. That is what rate limiting (#103) is for.

## Password reset

core-api/services/password_reset_service.go (#248):
- 32 bytes from crypto/rand; only the SHA-256 hash is stored (a 256-bit random token has full entropy, so a slow hash buys nothing, and a bcrypt hash could not be indexed).
- One-hour lifetime; single use enforced by one conditional UPDATE that checks unused and unexpired in the same statement.
- forgot-password answers identically for known and unknown addresses, and the controller floors the response time (400ms) so timing does not distinguish them either.
- A Google-only address receives an explanatory mail instead of a reset link.
- A successful reset invalidates the user's other reset tokens. It does not invalidate JWTs — see above.

## Email verification

Soft by default (#108): signup enqueues a verify link; users.email_verified_at records it; login blocks only when REQUIRE_EMAIL_VERIFICATION=true. Tokens live in email_tokens (purpose-separated, SHA-256 hashes, 24h TTL, single-use conditional UPDATE). The mailed link points at the frontend and the API consume route is POST-only, so mail scanners cannot burn tokens. Google addresses are verified by construction and backfilled.

## Email transport

core-api/email/. Rendered at enqueue, queued in Postgres, drained by a watcher with exponential backoff and a stale-claim lease. mail.WithTLSPolicy(mail.TLSMandatory) — a relay that will not start TLS is a failure, not a downgrade (smtp_sender.go). Credentials from EMAIL_SMTP_USER/PASSWORD; deployed relay is Gmail with an app password. Missing config queues-and-holds rather than failing signup. Emailed links build on PUBLIC_BASE_URL (services/links.go), deliberately not derived from ALLOWED_ORIGINS.

## Authorization

- Ownership: user-scoped routes compare the authenticated id to the requested one and answer 403 {"error":"Access denied"} on mismatch (user_info_controller.go).
- Teacher access to a student is scoped by class: services.RequireUserStatsAccess requires an ACTIVE class the caller owns and the student joined. Archived classes grant nothing; probing a nonexistent id gets 403, not 404 (blocks enumeration) — #254 / PR #267.
- Admin: services.RequireAdmin reads the role from the database, not a token claim.
- Teacher accounts cannot be self-issued: registration claiming TEACHER needs a valid invite code; redemption is one conditional UPDATE (race-proof), and unknown/expired/spent codes are indistinguishable (#250).

## SQL

Every query is sqlc-generated and parameterized; no service builds SQL by concatenation. Hand-editing database/generated/ is prohibited (core-api/CLAUDE.md).

## CORS

core-api/middleware/cors.go, allowlist from ALLOWED_ORIGINS. No Origin header passes through; unlisted origins get a bare 403 before any handler; preflight is 204 with Vary: Origin; a config with no valid origin is a startup panic.

## Transport and headers

Caddy terminates TLS (Let's Encrypt) and reverse-proxies /api/* and /music/* (docs/self-hosting.md). Static frontend ships X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin. No CSP, no HSTS — #260.

## Google OAuth

The browser never sees a Google token: the code goes to POST /api/auth/google/callback, the service exchanges it server-side, verifies signature and audience, and refuses accounts whose email_verified is false. Linking requires a matching email; a Google id bound to another user is a 409. Full flow: docs/google-oauth-flow.md.

## Known limits

| Limit | Consequence | Tracked |
|---|---|---|
| No refresh-token revocation or rotation | A stolen refresh token works until expiry; a password change does not sign other devices out | stated in the #249 PR |
| Tokens in localStorage | XSS equals account takeover | mitigated by #260 (CSP) |
| Frontend refresh handler stores a field the server never sends | `RefreshTokenResponse` declares a `refresh_token` field (frontend/src/app/auth/models/auth.models.ts:58-61); `AuthService.refreshToken()` writes `res.refresh_token` into storage (frontend/src/app/auth/services/auth.service.ts:64); `handleRefreshToken` answers with only `{"access_token": ...}` (core-api/controllers/auth_controller.go:355-357). `res.refresh_token` is therefore `undefined`, `localStorage.setItem` stores the literal string `"undefined"`, and the second refresh in a session sends that string as the refresh token and fails. | not yet filed |
| No API rate limiting | Credential spraying and mail-queue abuse are unthrottled | #103 |
| No CSP, no HSTS | see above | #260 |
| No audit log | No record of who read or changed what | not yet filed |
| Email addresses in auth log lines | Host log access reveals sign-in attempts | not yet filed |
| MAX_LOGIN_ATTEMPTS documented but not read | Operators believe a knob exists; it does not | not yet filed |
| `users.locked_until` is `timestamp without time zone` (00001_initial_schema.sql) | On a non-UTC host the driver stores local wall-clock digits shifted by the UTC offset instead of true UTC; breaks the two local lockout tests (`TestLogin_AccountLocked`, `TestLogin_LockoutTriggered` in core-api/tests/auth_service_test.go) while CI, which runs in UTC, passes. Needs a migration to `timestamptz`. | not yet filed |
| /dev/kit publicly routable | Harmless showcase, shipped unguarded | #263 |
| No security certification | No SOC 2, ISO 27001, or third-party audit | stated in docs/legal/dpa.md |

## Reporting a problem

Email contact@tremolonotes.com. Please do not open a public issue for a vulnerability.

<!-- TODO(owner): confirm this address, or replace it with a dedicated security contact, before publishing this file anywhere public. -->
