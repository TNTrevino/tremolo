# Phase 1 — Core plumbing

**Depends on:** 0 · **Weight:** ~10% · **Parallel:** no

## Objective

HTTP, auth, guards, and all 20 routes. Still almost nothing renders — this is
the highest-risk plumbing, so it goes early.

## Preconditions

```bash
grep -A2 '^| 0 ' frontend/.migration/STATE.md   # Phase 0 → done
cd frontend && npm run build                     # exit 0
node --version                                   # supported range
curl -s localhost:5001/health || true            # Go service reachable
```

Go service must be running for end-to-end auth verification.

## Inputs

Read all of these from `frontend-react/src/`:

- `services/api/clients/main-client.ts` — JWT attach + the 401-refresh queue
  (`isRefreshing` flag, `failedQueue`, `processQueue`)
- `services/api/clients/music-client.ts` — unauthenticated client
- `services/api/clients/token.ts` — token storage
- `services/api/auth.service.ts` — login/register/refresh/logout
- `stores/auth.store.ts` — note `isAuthenticated` is a **third stored field**
  manually kept in sync
- `lib/logger.ts`
- `shared/components/layout/{ProtectedRoute,GuestRoute,TeacherRoute}.tsx`
  and their `.test.tsx` files — the redirect behavior to reproduce
- `App.tsx` — the complete route table (20 paths, PLAN.md §3)

## Work

- `provideHttpClient(withInterceptors([auth, refresh]))`.
  **Auth interceptor attaches the bearer token to main-service URLs only** —
  the music service is unauthenticated.
- **Refresh interceptor per PLAN.md §5.4.** The `finalize(() => refresh$ = null)`
  line is load-bearing — without it the shared observable becomes a token
  cache. Refresh failure → clear `AuthStore` → route to `/login` (this
  replaces the `auth:logout` window event).
- `AuthStore` per PLAN.md §5.3, with localStorage persistence under the
  existing key `tremolo-auth` and the same persisted shape, so sessions
  survive. `isAuthenticated` becomes `computed`, not stored.
- Port `token.ts` storage helpers.
- `LoggerService` (port `lib/logger.ts`). `NotificationService` **API surface
  only** — a console-backed stub; the real toast lands in Phase 2.
- Three functional guards (`CanActivateFn`): `authGuard`, `guestGuard`,
  `teacherGuard`, mirroring the wrapper components' redirect behavior. Port
  their existing tests.
- `app.routes.ts` with all 20 routes → placeholder standalone components.
  Guards applied to the same route sets as today (from `App.tsx`:
  Protected ×5, Guest ×2, Teacher ×2).
  Use `withComponentInputBinding()` so `:id` params bind to `input()`s.
- Login flow wired end-to-end against the Go service. The login page can be
  bare unstyled fields — Phase 2 restyles it.

## Verify

```bash
cd frontend && npm run build && npm run lint && npm run test:run
```

Required tests:

- Guard redirects (3 guards, logged-in and logged-out)
- Auth interceptor attaches token to main-service URLs, **not** to music-service URLs
- **N concurrent 401s trigger exactly one refresh call** (the thundering-herd test)
- Refresh failure clears the store and routes to `/login`

Manual: login against local Go service succeeds; reload keeps session; logout
clears it; protected route redirects when logged out.

## Exit criteria

- [ ] All 20 paths navigate without console errors
- [ ] Login → token persisted → reload keeps session → logout clears it
- [ ] Concurrent-401 test proves a single refresh
- [ ] No `shareReplay` used for anything except the refresh dedup, and that one
      has its `finalize` teardown (D6)
- [ ] build/lint/test exit 0

## Handoff must record

- The route table with guard assignments (Phase 2+ builds pages into these)
- localStorage key and persisted shape
- Any Go-service API surprises (endpoint shapes, error formats)
- The `NotificationService` interface Phase 2 must implement
