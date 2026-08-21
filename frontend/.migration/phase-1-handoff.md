# Phase 1 handoff — Core plumbing

Status: **built**. `npm run build`, `npm run lint`, `npm run test:run` and
`npm run format:check` all exit 0 (27 unit tests in 8 files). The login flow
was also driven in a real browser against the running Go service — see §6.

---

## 1. What exists now

| Area | Files |
| ---- | ----- |
| Auth types + mapper | `src/app/auth/models/{auth.models,user.mapper}.ts` |
| Token storage | `src/app/auth/services/token.storage.ts` |
| Signal store (D7) | `src/app/auth/services/auth.store.ts` |
| Auth HTTP (D5) | `src/app/auth/services/auth.service.ts` |
| Guards | `src/app/auth/services/security/{auth,guest,teacher}.guard.ts` |
| Interceptors | `src/app/core/interceptors/{auth,refresh}.interceptor.ts`, `api-url.ts` |
| Logger | `src/app/core/services/logger.service.ts` |
| Toast API (stub) | `src/app/core/services/notification.service.ts` |
| Error copy | `src/app/shared/utils/error.utils.ts` |
| Routes | `src/app/app.routes.ts` + 18 placeholder pages + the real login page |
| Test fixtures | `src/testing/auth-fixtures.ts` |

`app.config.ts` now reads:

```ts
provideHttpClient(withFetch(), withInterceptors([authInterceptor, refreshInterceptor]))
```

Order matters. `authInterceptor` runs first and attaches the bearer token;
`refreshInterceptor` sits closer to the backend, so the 401 it catches is
the one the token failed on, and its retry re-attaches the fresh token
itself (the auth interceptor does not run again on that retry).

---

## 2. The route table — what Phase 2+ builds into

Every path below already resolves, already runs its guard, and already has a
component file. **Fill the component in; do not add the route again.**

| Path | Guard | Component (all under `src/app/`) |
| ---- | ----- | -------------------------------- |
| `/` | — | redirect to `/note-game` (**not** `/home`) |
| `/home` | — | `public/home-page/home-page.component.ts` |
| `/about` | — | `public/about-page/about-page.component.ts` |
| `/login` | `guestGuard` | `auth/components/login/login.component.ts` ← **real** |
| `/signup` | `guestGuard` | `auth/components/signup/signup-page.component.ts` |
| `/note-game` | — | `features/note-game/components/note-game-page/` |
| `/key-signature-game` | — | `features/identification-game/components/key-signature-game-page/` |
| `/interval-game` | — | `features/identification-game/components/interval-game-page/` |
| `/scale-game` | — | `features/identification-game/components/scale-game-page/` |
| `/chord-game` | — | `features/identification-game/components/chord-game-page/` |
| `/sheet-music` | — | `features/sheet-music/components/sheet-music-page/` |
| `/convert` | — | `features/sheet-music/components/converter-page/` |
| `/auth/google/callback` | — | `auth/components/google-callback/` |
| `/dashboard` | `authGuard` | `features/dashboard/components/dashboard-page/` |
| `/profile` | `authGuard` | `features/account/components/profile-page/` |
| `/account` | `authGuard` | `features/account/components/account-page/` |
| `/assignments` | `authGuard` | `features/classes/components/assignments-page/` |
| `/assignments/:id/play` | `authGuard` | `features/classes/components/assignment-play-page/` |
| `/classes` | `teacherGuard` | `features/classes/components/classes-page/` |
| `/classes/:id` | `teacherGuard` | `features/classes/components/class-detail-page/` |

Guard counts match `App.tsx`: Protected ×5, Guest ×2, Teacher ×2. **All five
games are public** — they are playable signed out, and that is deliberate.

Every route uses `loadComponent`, which is the port of React's `lazy()`.
`/classes/:id` and `/assignments/:id/play` already bind `:id` to an
`input.required<string>()` on the page — that is `withComponentInputBinding()`
working, and it is the half of PLAN.md §5.2's parameterised `rxResource`
that Phase 3 plugs into.

### Guard behaviour (ported one for one)

- `authGuard` — signed out → `UrlTree('/login')`, and the attempted URL is
  written to `AuthStore.redirectUrl`.
- `guestGuard` — signed in → `UrlTree('/dashboard')`.
- `teacherGuard` — signed in and **not** `TEACHER` → `/dashboard`; anonymous →
  falls through to `authGuard`, so it goes to `/login`. The order is from
  `TeacherRoute.tsx`'s own comment and is now covered by a test it never had.

---

## 3. localStorage — keys and shapes

Three keys, all unchanged from the React app so a session written by either
app is readable by the other while both exist.

| Key | Written by | Shape |
| --- | ---------- | ----- |
| `access_token` | `TokenStorage` | the raw JWT |
| `refresh_token` | `TokenStorage` | the raw JWT |
| `tremolo-auth` | `AuthStore` | Zustand's persist envelope, below |

```json
{
	"state": {
		"user": {
			"id": 1631,
			"email": "sam@tremolo.test",
			"firstName": "Sam",
			"lastName": "Smoke",
			"role": "STUDENT",
			"hasGoogle": false
		},
		"token": "<access jwt>",
		"isAuthenticated": true
	},
	"version": 0
}
```

`isAuthenticated` is a `computed` in the store now, but it is still
**written** — dropping it would change the persisted shape, and the packet
requires sessions to survive. Reads ignore it and derive from `token`.
A corrupt blob is deleted and the app starts signed out.

---

## 4. The `NotificationService` interface Phase 2 must implement

`src/app/core/services/notification.service.ts` ships the **API surface
only**: toasts land in a signal and are echoed through `LoggerService`.
Phase 2 owns `core/components/toast/` and only has to render the signal.
Nothing about the surface below may change — Phase 1 callers are written
against it.

```ts
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
	id: string;
	type: ToastType;
	title?: string;
	message: string;
	duration: number; // ms; default 5000
}

@Injectable({ providedIn: "root" })
export class NotificationService {
	readonly toasts: Signal<Toast[]>;

	showToast(message: string, type?: ToastType, title?: string, duration?: number): void;
	showSuccess(message: string, title?: string): void;
	showError(message: string, title?: string): void;
	showWarning(message: string, title?: string): void;
	showInfo(message: string, title?: string): void;
	removeToast(id: string): void;
}
```

Argument order is `(message, title)` — message first, exactly as `useToast`
had it, and the opposite of most toast libraries. **Auto-dismissal is the
container's job**, as it was in React: `duration` rides on the toast and the
component times it out, then calls `removeToast(id)`.

Two toast strings are contractual and the parity suite selects on them
(Phase 6): `"Game results saved successfully!"` and `"Failed to save game
results. Your score was not recorded."`

---

## 5. Go-service API notes

Probed directly against the running service, not read from React.

- **Errors are `{"error": "..."}`.** No `message` field on any error seen.
  `getErrorMessage()` checks `message` then `error`, then falls back to the
  status table whose wording is carried over verbatim from React.
- **A wrong password is `401 {"error":"Invalid credentials"}`.** The app now
  shows exactly that. React showed "Please log in again", because its 401
  interceptor treated the rejected login as a session expiry — the parity
  suite is deliberately loose on the wording here and strict on the
  behaviour (an error shows, the user stays on `/login`). This is the
  intended improvement, not a regression.
- **Validation failures are `400`, not `422`**, with the same `{"error"}`
  shape: `{"error":"Password must be at least 8 characters"}`,
  `{"error":"First name must be at least 2 characters"}` (first/last name
  need ≥ 2 characters — worth knowing before Phase 2 writes the signup
  schema).
- **A bad refresh token is `401 {"error":"Invalid refresh token"}`.**
- **`/api/auth/login` does not return `has_google`.** The mapper defaults it
  to `false`; `/api/auth/me` is where the real value comes from.
- **There is no logout endpoint.** Logout is local: clear both tokens and
  the store.
- `ALLOWED_ORIGINS` must contain `http://localhost:4200` or every call from
  the Angular dev server fails CORS. Phase 0 already recorded this; it is
  still true and it is the first thing that bites.

---

## 6. Verification actually run

```
npm run build        exit 0
npm run lint         exit 0   (--max-warnings 0)
npm run test:run     exit 0   27 tests, 8 files
npm run format:check exit 0
```

Unit tests the packet required, and where they live:

| Requirement | Spec |
| ----------- | ---- |
| Guard redirects, signed in and out, ×3 | `auth/services/security/*.guard.spec.ts` |
| Token attached to main, **not** to music | `core/interceptors/auth.interceptor.spec.ts` |
| N concurrent 401s ⇒ exactly one refresh | `core/interceptors/refresh.interceptor.spec.ts` |
| Refresh failure clears the store, routes to `/login` | same file |

Two more in that file guard the seams this design can fail at: a later 401
must trigger a *live* refresh rather than replay the buffered token (the
`finalize` test), and a rejected login must not enter the refresh path at
all.

**Browser check** (Angular on :4200, Go on :5001, seeded student and
teacher, ad-hoc Playwright script — not committed, the parity suite is the
committed instrument):

- all 20 paths visited as anonymous, as a student, and as a teacher;
  every redirect matched the table in §2, and `/` landed on `/note-game`
- login → `/dashboard`, `tremolo-auth` written in the shape above
- reload → still `/dashboard`, session intact
- signed-in visit to `/login` and `/signup` → bounced to `/dashboard`
- wrong password → stays on `/login`, shows "Invalid credentials"
- one console error in the whole run: the browser logging the deliberate
  401 from that wrong-password request. No app errors.

**Logout has no UI yet** — the nav bar arrives in Phase 2. It is covered by
`auth.service.spec.ts` (tokens and store both cleared) and, in the browser,
by clearing the three keys and reloading, which bounced `/dashboard` to
`/login`.

**The Playwright parity suite was not run.** It is not in this packet's
Verify, and it cannot pass yet: `navigation.spec.ts` and the baselines
assert real page content, and 18 of the 20 pages are placeholders. The
first phase that can honestly run a slice of it should.

---

## 7. Deviations

| # | What the plan/packet said | What was done | Why |
| - | ------------------------- | ------------- | --- |
| 1 | PLAN.md §5.4 calls `inject(AuthService)` **inside** `catchError` | `inject()` hoisted to the interceptor body | `catchError`'s callback runs outside the injection context; `inject()` there throws NG0203. The stream shape — `??=`, `shareReplay(1)`, `finalize`, `switchMap` — is unchanged. |
| 2 | §5.4 skips refresh for `isAuthEndpoint(req.url)` | Skips the four *session-establishing* endpoints (`login`, `register`, `refresh`, `google/callback`), **not** `/api/auth/me` or `/api/auth/google/link` | A 401 from `me` is a real expiry and must be recoverable, or session restore breaks. A 401 from `login` is a wrong password. Taking "auth endpoint" literally would have kept the second half of the React bug. |
| 3 | Packet: port the guards "and their `.test.tsx` files" | `TeacherRoute.tsx` has **no** test in the repo | R5, repo wins. Its ordering rule is now covered by a new spec. |
| 4 | React passed the attempted URL in router state | It rides on `AuthStore.redirectUrl` | A query param is the obvious equivalent but changes the landing URL, and the parity suite asserts a bare `/login`. |
| 5 | React's `refreshToken()` returned the whole response | Returns `Observable<string>` (the access token) | That is what §5.4's `switchMap((token) => …)` consumes. Both tokens are still stored on the way through. |
| 6 | PLAN.md §4 has no folder for interceptors | Added `core/interceptors/` | They are core, not a feature, and not components. |
| 7 | PLAN.md §4 has no folder for shared test fixtures | Added `src/testing/`, included by `tsconfig.spec.json` and excluded from `tsconfig.app.json` | Guard specs need a signed-in store fixture. The exclusion is what stops app code importing it. |
| 8 | — | `NG_CLI_ANALYTICS=false` is now needed for `ng` commands | The first `ng` run rewrote `angular.json` (adding `"analytics": false`, unformatted, failing `format:check`). Reverted; the env var stops it recurring. |

### Two gotchas worth carrying forward

- **`(ngSubmit)` is inert without `FormsModule`.** It comes from `NgForm`.
  With no forms module imported the browser submits natively — the login
  page did a GET with the password in the query string. The page listens for
  the native `submit` event and calls `preventDefault()`. Phase 2 replaces
  this with Signal Forms (D11) and should delete the workaround with it.
- Phase 0's `app.component.spec.ts` asserted the placeholder shell's
  "Tremolo" heading. The shell is now just the router outlet, so the spec
  asserts the outlet instead.

---

## 8. What Phase 2 must know

- **The chrome is yours.** `app.component.html` is a `min-h-screen` wrapper
  and a `<router-outlet />`. `Navigation`, the toast container and the
  friends panel (rendered only when signed in, per `App.tsx`) all still have
  to be built.
- **Restyle the login page; do not rewrite its contract.** The parity suite
  selects on the heading "Welcome to Tremolo", the labels "Email Address"
  and "Password", and the button "Sign In" (`exact: true`). Keep the
  redirect-after-login behaviour: `AuthStore.redirectUrl() ?? "/dashboard"`,
  then clear it.
- **Signup is a placeholder.** `AuthService.register()` exists and works,
  and deliberately does not sign the new account in — after signup the user
  goes to `/login` and sees "Account created! Please log in.".
- **The accessible names from Phase 0 are acceptance criteria**, not
  suggestions: `Switch to light theme` / `Switch to dark theme`, `Open
  friends` / `Close friends` (with `aria-expanded`), `Open menu` / `Close
  menu`, `Account menu`, `Add friend`, `Back to friends`, `Add <name>` /
  `<name> added`. The theme toggle's label is how the suite reads the
  current theme.
- **The theme store is not built.** It is `core/services/theme.store.ts` in
  PLAN.md §4, it must persist to localStorage and survive a reload, and it
  toggles the `dark` class on `documentElement` (D7, §5.3).
- **No `shareReplay` outside the refresh interceptor**, and no caching or
  dedup layer anywhere (D6). The one sanctioned use has its `finalize`
  teardown and a spec that fails if it is removed.
- Inject `AuthStore` for auth state; inject `AuthService` for the calls.
  Never read `localStorage` directly — `TokenStorage` owns those keys.
