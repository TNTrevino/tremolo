# Migration ledger

**The only place phase status lives.** Update it as part of the phase's commit.

Status values: `pending` → `built` (builder finished, Verify green) → `done`
(a separate verifier agent confirmed Exit criteria). `blocked` if stopped.

| Phase | Name                       | Status  | Date | Commits | Notes |
| ----- | -------------------------- | ------- | ---- | ------- | ----- |
| 0     | Scaffold + parity harness  | done    | 2026-08-20 | `2e94f8a..1421b7b` | React app moved to `frontend-react/`; 7 deviations below. Verified 2026-08-20: build/lint/test green, 47/47 Playwright specs green vs React, 80 baselines confirmed |
| 1     | Core plumbing              | done    | 2026-08-20 | `fc19c37..5d82d9d` | HTTP, auth, guards, 20 routes; login wired end to end. 8 deviations below; the range's last commit is this ledger entry's own doc commit. Verified 2026-08-20: build/lint/test:run/format:check all exit 0 (27 tests, 8 files); all 20 paths navigate with **zero** console errors as anonymous, student and teacher; login persists across reload and clears on logout; dedup and `finalize` both mutation-tested. One verifier note below. |
| 2     | Shared UI kit              | done    | 2026-08-20 | `6de4be4..74e504e` | 9 UI primitives + 5 form components + nav, toast, theme store, icons, `/dev/kit`. 15 deviations below; the range's last commit is this ledger entry's own doc commit. Verified 2026-08-20 (held at `built` on finding F1, then re-verified): **F1 verified fixed** -- logout on `/dashboard` lands on `/login` with `tremolo-auth` cleared, logout on `/about` stays put, and Back after the bounce redirects to `/login` rather than re-rendering the guarded page. All seven signed-in-only routes carry `runGuardsAndResolvers: "always"`; the guest/public routes do not. `app.routes.spec.ts` mutation-tested independently. build/lint/test:run/format:check all exit 0 (109 tests, 17 files). See the re-verification note below. |
| 3     | CRUD features              | pending | —    | —       |       |
| 4     | Sheet music / OSMD         | pending | —    | —       |       |
| 5     | Identification-game engine | pending | —    | —       |       |
| 6     | Note game                  | pending | —    | —       |       |
| 7     | Cutover                    | pending | —    | —       |       |

---

## Deferred decisions

Recorded here when made, so later phases and future readers can find them.

| Decision                           | Phase | Choice      | Rationale |
| ---------------------------------- | ----- | ----------- | --------- |
| Chart library (replaces recharts)  | 3     | _undecided_ |           |
| Audio library (replaces use-sound) | 6     | _undecided_ |           |

---

## Deviations

Anything where the repo contradicted the plan (R5), or a packet instruction
could not be followed as written. One row per deviation.

| Phase | What the plan said | What was actually done | Why |
| ----- | ------------------ | ---------------------- | --- |
| 0 | `nvm install 24` (STATE.md env note) | Used the already-installed v24.19.0; `NVM_DIR` is `~/.config/nvm`, not `~/.nvm` | Nothing to install. Recorded so the next agent looks in the right place. |
| 0 | PLAN.md §4 lists `frontend/vitest.config.ts` | No `vitest.config.ts`; the test config lives in `angular.json` under `@angular/build:unit-test` | That builder owns the vitest config and only loads an external one via `runnerConfig`, which the Angular team explicitly does not support the contents of. |
| 0 | Packet: "verify `provideZonelessChangeDetection()` is in `app.config.ts`" | The `ng new --zoneless` scaffold does **not** emit it (zoneless is Angular 22's default); added by hand | The invariant (no zone.js) held either way. Kept as the explicit, greppable statement of D4. |
| 0 | Packet: port `src/index.css`, "keeping both `@fontsource-variable` imports" | Those imports are in `main.tsx`, not `index.css`; they were moved to the top of `styles.css` | R5, repo wins. Angular bootstraps from a `.ts` that cannot import CSS. |
| 0 | Packet §4: `environments/` exposing `mainApi` and `musicApi` | Also exposes `appName` and `googleClientId` | `.env.example` defines four `VITE_*` vars, not two (R5). |
| 0 | Packet: aliases `@app/ @core/ @shared/ @features/` + tsconfig `baseUrl` | Aliases as specified; **no** `baseUrl` | TypeScript 6 errors on `baseUrl` (TS5101). `paths` resolve relative to the tsconfig without it. |
| 0 | Packet is silent on the React app's accessibility | Added `aria-label` to 9 icon-only controls in `frontend-react/` (commit `cb7b35b`, plus the game staff container and the note-game scale picker) | The packet requires user-visible selectors only, and these controls -- including the theme and friends toggles, both named golden flows -- had no accessible name at all. Pixel-neutral; **the Angular port must carry the same names**. |
| 1 | PLAN.md §5.4 calls `inject(AuthService)` inside `catchError` | `inject()` hoisted to the interceptor body | `catchError`'s callback runs outside the injection context, where `inject()` throws NG0203. The stream shape (`??=`, `shareReplay(1)`, `finalize`, `switchMap`) is unchanged. |
| 1 | §5.4 skips refresh for `isAuthEndpoint(req.url)` | Skips only the four session-establishing endpoints (login, register, refresh, google/callback) | A 401 from `/api/auth/me` is a real expiry and must stay recoverable; a 401 from login is a wrong password. |
| 1 | Packet: port the guards "and their `.test.tsx` files" | `TeacherRoute.tsx` has no test in the repo (R5); wrote a new one | Its ordering rule -- anonymous goes to /login, not /dashboard -- was untested. |
| 1 | React passed the attempted URL in router state | It rides on `AuthStore.redirectUrl` | A query param changes the landing URL and the parity suite asserts a bare `/login`. |
| 1 | React's `refreshToken()` returned the whole response | Returns `Observable<string>` (the access token) | That is what §5.4's `switchMap((token) => ...)` consumes. Both tokens are still stored. |
| 1 | PLAN.md §4 has no folder for interceptors | Added `core/interceptors/` | Core, not a feature, and not components. |
| 1 | PLAN.md §4 has no folder for shared test fixtures | Added `src/testing/`, in `tsconfig.spec.json` and excluded from `tsconfig.app.json` | Guard specs need a signed-in store fixture; the exclusion stops app code importing it. |
| 1 | Packet is silent on the Angular CLI writing to `angular.json` | Export `NG_CLI_ANALYTICS=false` before `ng` commands | The first `ng` run added an unformatted `"analytics": false`, which fails `format:check`. Reverted. **Superseded in Phase 2 -- the env var does not actually stop it; see Phase 2 deviation 13.** |
| 2 | Packet: read `frontend-react/DESIGN.md` | It lives at `frontend/DESIGN.md` | R5. Phase 0 moved the React app but left `DESIGN.md` behind. Content unchanged; still the source of truth. |
| 2 | Packet: `shared/components/ui/` is "10 files" / "10 primitives" | 9 primitives ported; the 10th file is `button.test.tsx` | R5. The packet's own list names nine. `/dev/kit` renders those nine plus `app-spinner` and `app-error`. |
| 2 | Packet lists confirm-dialog and toast under `shared/components/ui/` | Both in `core/components/`, with navigation, spinner and app-error | R5. PLAN.md §4 puts them there and Phase 1 left the `.gitkeep` folders waiting. |
| 2 | PLAN.md §4 has no folder for a demo route | Added `src/app/dev/kit-page/` | The packet requires `/dev/kit` and that it be trivially removable; a top-level `dev/` says "not the product". |
| 2 | Packet: prove the pattern with the login **and signup** schemas | Login rebuilt on Signal Forms; signup stays a placeholder, its schema proven on `/dev/kit` | PLAN.md §1 makes auth screens Phase 3's pattern-setter; building signup here takes work out of the phase scoped for it. |
| 2 | Phase 1 handoff: "delete the `(ngSubmit)` workaround" | Native `(submit)` + `preventDefault()` stays | It was never a workaround -- Signal Forms brings no `NgForm`, so native submit is the documented idiom. |
| 2 | React's `<Button>` defaulted to `type="submit"` inside a form | `<app-button>` defaults to `type="button"` | Explicit beats implicit for the one behaviour that silently posts a form. |
| 2 | React portaled the dialog into `document.body` | Renders in place; `fixed inset-0 z-50`, host `display: contents` | A portal needs `@angular/cdk`, a dependency this packet does not authorise. No ancestor creates a containing block for `fixed`. |
| 2 | `ConfirmDialog` took `ReactNode` for `title`/`description` | Plain strings | Nothing passed markup; same move D9 makes for `GameDefinition`. |
| 2 | Packet: component test for "select keyboard nav" | The spec pins the contract that earns native keyboard nav (real `<select>`, focusable, labelled, value round-trips) | jsdom implements none of the browser's arrow-key/type-ahead handling. The real keyboard path is Playwright's `selectOption`. |
| 2 | Packet: port `stores/theme.store.ts`; friends store unmentioned | `FriendsUiStore` ported too (UI half only) | The nav bar's friends toggle needs it, and `friends-and-theme.spec.ts` asserts the toggle is hidden from anonymous visitors. |
| 2 | Nothing about what logout should navigate to | Re-navigate the current URL after logout, with `ROUTER_CONFIG`'s `onSameUrlNavigation: "reload"` **and** `runGuardsAndResolvers: "always"` on the seven signed-in-only routes | Angular guards do not re-run on a store change. **Amended after verifier finding F1:** the first two alone left the signed-out visitor on `/dashboard` — `onSameUrlNavigation` only lets the same-URL navigation be processed, and the default `runGuardsAndResolvers` (`"paramsOrQueryParamsChange"`) never fires on it, so `canActivate` never re-ran. With the third piece it reproduces React: guarded page bounces to `/login`, public page stays. `src/app/app.routes.spec.ts` pins both halves; handoff §11 has the mutation proof. |
| 2 | Phase 1 deviation 1/8: `NG_CLI_ANALYTICS=false` "stops it recurring" | It does not. Fixed with `npx ng analytics disable --global` | The CLI rewrote `angular.json` again with the env var exported. The global setting lives in `~/.angular-config.json`, outside the repo. |
| 2 | `src/testing/auth-fixtures.ts` claimed the tsconfig exclusion blocks app imports | Header rewritten to say it is a convention | Acting on the Phase 1 verifier's note, so no later phase trusts a guard rail that is not enforcing anything. |
| 2 | React's inputs/selects had no `aria-invalid` | Set when they carry an error | Pixel-neutral; it is what tells a screen reader what the red border means. Same class of change as Phase 0's accessible names. |

### Verifier notes (Phase 1, 2026-08-20)

Phase 1 passed every exit criterion. One deviation rationale is overstated
and is corrected here so a later phase does not rely on a guard rail that
is not actually enforcing anything.

- **Deviation 1/7 (`src/testing/`) — the exclusion does not enforce the
  boundary it claims.** The row says excluding `src/testing/**/*.ts` from
  `tsconfig.app.json` "stops app code importing it." It does not. TypeScript
  `exclude` only trims the *root* file set; a file reached through an import
  is still compiled. Verified by adding `import "../../../testing/auth-fixtures"`
  to `auth.store.ts` and running `npm run build` — **exit 0, no error**.

  Not a defect and not an exit-criterion failure: the split is real, and
  today only the four `.spec.ts` files import the fixture. But it is a
  convention, not a compile-time barrier. A phase that wants it enforced
  needs an ESLint `no-restricted-imports` (or `import/no-restricted-paths`)
  rule — `eslint.config.js` currently has none.

### Verifier findings (Phase 2, 2026-08-20) — status held at `built`

Every criterion in the phase-2 packet's **Exit criteria** passes. The phase
is nevertheless **not** marked `done`, because one shipped behaviour does not
do what the handoff and deviation 12 say it does. Phase 2's builder owns the
fix; the verifier does not fix.

**F1 (blocking). Logout does not bounce a guarded page to `/login`.**
Deviation 12 and handoff §6 both assert that
`withRouterConfig({ onSameUrlNavigation: "reload" })` plus
`router.navigateByUrl(router.url)` "makes the guards run again" and
"reproduces React exactly". It does not. Driven in Chromium against the Go
service on :5001:

- sign in, land on `/dashboard`, open the account menu, press **Log Out**
- the session *is* cleared (`tremolo-auth` goes to
  `{"user":null,"token":null,"isAuthenticated":false}`) and the nav bar
  correctly flips to the signed-out chrome (Login link, no account menu, no
  friends toggle)
- **the URL stays `/dashboard`** at t = 0.5s / 1s / 2s / 4s / 8s, and the
  guarded page keeps rendering to a signed-out visitor

The guard itself is fine: an anonymous visit to `/dashboard` redirects, and
so does a fresh navigation *after* the logout. Only the re-navigation fails
to re-run it. React's `ProtectedRoute` re-rendered on the store change and
bounced, so this is a real behaviour change, not a cosmetic one.

Cause, confirmed by experiment: `onSameUrlNavigation: "reload"` re-processes
the navigation but does not by itself re-run `canActivate`. Angular's default
`runGuardsAndResolvers` is `"paramsOrQueryParamsChange"`, and re-navigating
to an identical URL changes neither. Adding `runGuardsAndResolvers: "always"`
to the `dashboard` route made the same script bounce to `/login` at t=0.5s;
the diagnostic was reverted and the working tree left clean. Whether the
right fix is that property on all eight guarded routes, a
`router.navigate(["/login"])` when the current route is guarded, or
something else is the builder's call — but deviation 12's rationale as
written is false and must not be inherited by Phase 3.

The half of deviation 12 that *does* hold: logging out on a **public** page
(`/about`) leaves the visitor there. Verified.

**F2 (note, non-blocking). Handoff §8 miscounts `button.component.spec.ts`.**
It says 16 tests; the file actually runs **22** (verbose vitest reporter).
The suite total, 104 tests in 16 files, is exact.

**What was verified green** (all run by the verifier, not taken from the
handoff): `npm run build` / `lint` / `test:run` / `format:check` all exit 0,
104 tests in 16 files; no `lucide-react` or `ngx-toastr` in `package.json`;
`shareReplay` only in `refresh.interceptor.ts`; no NgModules, no `zone.js`
(`npm ls zone.js` empty), no stored `Subscription`, no hand-written
unsubscribe, no `takeUntil` subject, no caching layer — every `.subscribe()`
in app code is a one-shot handler or a `timer()` under `takeUntilDestroyed`;
`e2e/`, `.migration/baselines/` and `frontend-react/` untouched across the
range; the only new runtime deps are the two R6-recorded `@ng-icons`
packages (`@ng-icons/core@35.0.1` peers `@angular/core >=22.0.0`;
`@ng-icons/lucide` declares no peers), and no `@angular/cdk` was installed;
the icon registry's 47 symbols are exactly the 47 `lucide-react` imports
across the React app's 33 consumers; `/dev/kit` renders all nine primitives,
both dialogs, toast, spinner, `app-error`, RhythmGlyph and all five form
components, legible in both themes; theme toggles the `documentElement`
class, writes Zustand's envelope to `tremolo-theme` and survives a reload;
dialog closes by button and by Escape; toast shows, dismisses on click and
self-dismisses at 5s; the zod round trip appears and clears on `/login`, a
wrong password shows "Invalid credentials" and stays on `/login`, and the Go
service's own 400 message surfaces too; the three icon-only nav controls
("Switch to light theme", "Open friends", "Open menu") all carry accessible
names. Two specs were mutation-tested: neutering
`FormFieldComponent.message` failed 3 tests, and dropping the `closed.emit`
from `ToastItemComponent.dismiss()` failed 1; both were restored and
`git diff` was empty afterwards. `navigation.spec.ts` passes 26/26 against
Angular on :4200; `friends-and-theme.spec.ts` fails only its friends-panel
test, which Phase 3 owns as the handoff says. `/dev/kit` and the login page
read as DESIGN.md conformant — ink does the everyday work, brass appears
once as the CTA, `--accent` only as a hover wash, one soft shadow on cards
and none on buttons, charcoal rather than purple in dark. No violations to
flag.

Env note for the next agent: `:4200` was free and used for this run,
contrary to handoff §10.

#### Builder's response (2026-08-20)

Both findings are addressed; the phase stays at `built` for a verifier to
re-check.

- **F1 fixed.** `runGuardsAndResolvers: "always"` now sits on the seven
  signed-in-only routes in `app.routes.ts` — the verifier's own diagnostic,
  promoted to the fix, so the guards stay the single source of truth for who
  may see a route. `app.config.ts` exports `ROUTER_CONFIG` so the new
  `src/app/app.routes.spec.ts` drives the app's real router configuration.
  That spec presses the real **Log Out** button over the real route table:
  `/dashboard` and `/classes` bounce to `/login`, `/about` does not, and a
  fifth test fails if any future guarded route omits the flag. Deleting the
  fix fails 4 of its 5 tests; flipping `onSameUrlNavigation` to `"ignore"`
  fails 3 — both mutations were run and reverted (handoff §11). Re-verified in
  Chromium against the Go service on :5001: logout on `/dashboard` lands on
  `/login`, logout on `/about` stays, no console errors.
- **F2 corrected.** Handoff §8 now says 22 tests for
  `button.component.spec.ts`. The `:4200` claim in handoff §10 was corrected
  too.
- `e2e/` was not touched. Suite is now 109 tests in 17 files; build, lint,
  test:run and format:check all exit 0.

#### Re-verification (2026-08-20) — Phase 2 is `done`

F1 is fixed, F2's correction is in place, and every packet exit criterion
still holds. Nothing below is taken from the handoff; all of it was run.

- **F1, live.** `ng serve` on `:4200` (started fresh from a clean tree at
  `74e504e`), Go service on `:5001`, a freshly registered student, Chromium.
  Sign in → `/dashboard`; account menu → **Log Out** → the URL is `/login` at
  every sample from t=0.5s to t=8s, `tremolo-auth` is
  `{"user":null,"token":null,"isAuthenticated":false}`, and the page renders
  the sign-in screen, not the guarded one. Pressing **Back** from there does
  not show signed-out content on the guarded page — the guard re-runs and the
  URL is `/login` again. Logging out on `/about` leaves the visitor on
  `/about`. One console error across the whole run: the deliberate
  wrong-password 400/401.
- **Mutation-checked independently.** Deleting the single
  `runGuardsAndResolvers: "always"` line from the `dashboard` route fails
  **2 of the 5** tests in `app.routes.spec.ts`, both naming that route:
  `expected '/dashboard' to be '/login'` and
  `expected 'dashboard: undefined' to be 'dashboard: always'`. Restored,
  `git diff` empty, back to 5/5 green. Note for later phases: `npx vitest run
  <file>` does **not** work here — the vitest config is the
  `@angular/build:unit-test` builder's, so a single file is
  `npx ng test --include=<file>`; a bare `npx vitest` dies on
  "JIT compilation failed for service [class BrowserXhr]".
- **Route flags.** Exactly seven routes carry
  `runGuardsAndResolvers: "always"` — `dashboard`, `profile`, `account`,
  `assignments`, `assignments/:id/play`, `classes`, `classes/:id`. `login`,
  `signup` and all public routes do not.
- **Regression.** `npm run build` / `lint` / `test:run` / `format:check` all
  exit 0; **109 tests in 17 files**. `shareReplay` still only in
  `refresh.interceptor.ts`. `git log a823d0a..HEAD -- frontend/e2e/
  frontend-react/` is empty. `/dev/kit` renders in both themes (screenshotted;
  brass still one CTA per screen); the zod round trip shows and clears; a
  wrong password shows **"Invalid credentials"** and stays on `/login`; the
  theme survives a reload (`tremolo-theme` → `{"state":{"theme":"light"},
  "version":0}`, class swapped on `documentElement`).
- **Docs.** Deviation 12 and handoff §11 now describe the real mechanism —
  `onSameUrlNavigation: "reload"` lets the same-URL navigation be processed,
  `runGuardsAndResolvers: "always"` is what re-runs `canActivate` — and §11
  carries the mutation proof.

Gotcha for a wrong-password check: the Go service validates password
*format* before credentials, so a throwaway string like `definitely-wrong`
returns its own 400 ("Password must contain…"), not "Invalid credentials".
Use a well-formed wrong password (e.g. `Wr0ngPassw0rd!`) to exercise the 401.

---

## Environment notes

- **Node:** Angular 22 requires `^22.22.3 || ^24.15.0 || >=26.0.0`. This
  machine's system Node is **v25.9.0, which satisfies none of those ranges.**
  `frontend/.nvmrc` pins 24. nvm lives at `NVM_DIR=~/.config/nvm` (not
  `~/.nvm`), and **v24.19.0 is already installed** -- no `nvm install` needed:

  ```bash
  export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
  ```

  Every `ng`, `npm`, and `npx playwright` command in `frontend/` needs this
  first. `node --version` must print v24.x.
- Local dev needs both backends running for integration/E2E work:
  Go on :5001, Python on :8000. See root `README.md` for env vars, and
  `phase-0-handoff.md` for the exact working invocation (the README omits
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, which the Go service panics
  without). Postgres is on :5432 with the `tremolo` database already
  migrated; connect as the `postgres` role.

- **CLI analytics are now disabled globally** (`~/.angular-config.json`,
  written by `npx ng analytics disable --global` in Phase 2). Before that,
  the CLI kept rewriting `angular.json` with an unformatted
  `"analytics": false`, which fails `npm run format:check` --
  `NG_CLI_ANALYTICS=false` did **not** reliably prevent it, despite what the
  Phase 1 note said. Exporting the env var is still harmless. If
  `angular.json` ever shows that diff again, `git checkout` it and re-run the
  global disable.

- **`frontend/` is the Angular app; `frontend-react/` is the React one.**
  Both are checked by CI and by `make check`. The deploy workflow builds
  and ships `frontend-react/` until Phase 7 repoints it.
