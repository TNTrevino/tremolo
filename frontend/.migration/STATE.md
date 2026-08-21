# Migration ledger

**The only place phase status lives.** Update it as part of the phase's commit.

Status values: `pending` → `built` (builder finished, Verify green) → `done`
(a separate verifier agent confirmed Exit criteria). `blocked` if stopped.

| Phase | Name                       | Status  | Date | Commits | Notes |
| ----- | -------------------------- | ------- | ---- | ------- | ----- |
| 0     | Scaffold + parity harness  | done    | 2026-08-20 | `2e94f8a..1421b7b` | React app moved to `frontend-react/`; 7 deviations below. Verified 2026-08-20: build/lint/test green, 47/47 Playwright specs green vs React, 80 baselines confirmed |
| 1     | Core plumbing              | done    | 2026-08-20 | `fc19c37..5d82d9d` | HTTP, auth, guards, 20 routes; login wired end to end. 8 deviations below; the range's last commit is this ledger entry's own doc commit. Verified 2026-08-20: build/lint/test:run/format:check all exit 0 (27 tests, 8 files); all 20 paths navigate with **zero** console errors as anonymous, student and teacher; login persists across reload and clears on logout; dedup and `finalize` both mutation-tested. One verifier note below. |
| 2     | Shared UI kit              | done    | 2026-08-20 | `6de4be4..df5677f` | 9 UI primitives + 5 form components + nav, toast, theme store, icons, `/dev/kit`. 15 deviations below; the range's last commit is this ledger entry's own doc commit. Verified 2026-08-20 (held at `built` on finding F1, then re-verified): **F1 verified fixed** -- logout on `/dashboard` lands on `/login` with `tremolo-auth` cleared, logout on `/about` stays put, and Back after the bounce redirects to `/login` rather than re-rendering the guarded page. All seven signed-in-only routes carry `runGuardsAndResolvers: "always"`; the guest/public routes do not. `app.routes.spec.ts` mutation-tested independently. build/lint/test:run/format:check all exit 0 (109 tests, 17 files). See the re-verification note below. |
| 3     | CRUD features              | built (3.1) | 2026-08-20 | `2dd1e3d..` (3.1) | **Sub-feature 1 (auth screens) only** -- login at full React parity, signup on Signal Forms + zod, Google callback + OAuth service, one-shot notices on `AuthStore`. `phase-3-subfeature-1-handoff.md` is the pattern sub-features 2-6 copy. build/lint/test:run/format:check all exit 0 (146 tests, 21 files); `navigation.spec.ts` 21/21, `auth.spec.ts` 4/5 and `friends-and-theme.spec.ts` 3/4 (both failures owned by sub-features 6 and 4, and both reproduced before this slice). 9 deviations below. **3.1 verified 2026-08-20** -- gates re-run green, parity numbers reproduced exactly, both residual failures reproduced at `24a3bba` (pre-range), live auth flows driven against the Go service, the 12-shot screenshot residual read pixel by pixel, all three §7 kit fixes confirmed and four deviations spot-checked. One non-blocking finding (V1) below. **Sub-features 2-6 are cleared to fan out.** Sub-features 2-6 not started. |
| 4     | Sheet music / OSMD         | built   | 2026-08-20 | `64fb283..ce2ff23` | OSMD wrapper + card chrome, MusicService with the notation boundary, both pages, `/dev/kit` OSMD section. 146 tests in 21 files **on its own base**; 183 in 25 on the merged branch. 8/8 baseline screenshots pass; navigation.spec 21/21 unmodified on :4300. **Three inherited defects fixed, two of them global** -- React's zero-width staff race (F1), Tailwind utilities losing to Angular component hosts so all 47 `<ng-icon>`s rendered at 1em (F2, Phase 2's), and `<ng-icon>` missing preflight's `svg` rule (F3). 16 deviations below. **Built in a parallel worktree branched off `24a3bba` (Phase 2's last commit, pre-3.1), so the range contains none of 3.1's work; merged into this branch 2026-08-20 as `dd80abe`.** See the integration note below -- 3.1 and Phase 4 fixed the same icon defect independently and the overlap was reconciled in `3e92b99`. |
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
| 3.1 | Packet: sub-feature 1 proves "service + Signal Forms + **rxResource**" | No `rxResource`; service + Signal Forms + one-shot `.subscribe()` | All three auth screens are mutations and none displays a fetch result -- the Google callback navigates on every branch. PLAN.md §5.2 stays canonical; sub-feature 3 (account/profile) is its first honest consumer. Handoff §2.3. |
| 3.1 | Packet Inputs list `services/api/auth.service.ts` among the work | `AuthService` needed no change | R5. Phase 1 already ported `register`, `googleCallback` and `linkGoogle`, all Observable-returning. |
| 3.1 | React carried three cross-page messages in react-router location state | `AuthStore.setNotice()` / `takeNotice()`, one-shot and not persisted | Same move Phase 1 made for `redirectUrl`: Angular's router has no state that survives `navigateByUrl`, and a query param would change the landing URL the parity suite asserts. |
| 3.1 | D5: data services return `Observable<T>` | `GoogleOAuthService` returns plain values | It touches `crypto`, `sessionStorage` and `window.location` and never makes a request; nothing to cancel, retry or pipe. |
| 3.1 | Phase 2 shipped `[required]="true"` on the login fields | Dropped on both auth pages | React passes no `required`, so no baseline has an asterisk -- and `getByLabel("Password", { exact: true })` in `auth.spec.ts`'s signup flow cannot match "Password *". |
| 3.1 | Phase 2 handoff §2: the card parts take "none -- put your own classes on the element" | All six take a `className` input merged through `cn()` | React ran base + caller through tailwind-merge, so `shadow-lg` replaced `shadow-sm` and `text-3xl` replaced `text-2xl` **and** `leading-none`. Angular concatenated, and the winner was alphabetical accident: `text-sm` beat `text-base`, `shadow-sm` beat `shadow-lg`. The login card came out 46px short. Handoff §7.1. |
| 3.1 | Phase 2 handoff §4: size an icon with `class="h-5 w-5"` | Size it with `<ng-icon size="1.25rem">`; `styles.css` makes the host `display: block` | @ng-icons writes `--ng-icon__size` as an **inline style**, which no class can beat, so `h-8 w-8` rendered a 16px icon and the nav logo was 8px narrow in every screenshot. Its host was also `inline-block` where Tailwind's preflight makes every `<svg>` block. 14 nav icons re-sized. Handoff §7.2. **Amended at the Phase 4 merge:** the rationale is half wrong -- `size=` sets only the `--ng-icon__size` custom property inline; the `width`/`height` that read it live in `@ng-icons`' *component stylesheet*, so a class **can** beat them, and Phase 4's `important: "html"` now does. The 14 `size=` attributes stay (they agree with the `h-N` classes exactly and are load-bearing on the two auth logos, which carry no class), but `h-*` on an `<ng-icon>` is no longer decoration. Integration note below. |
| 3.1 | Phase 2 used `space-y-*` around kit components | `flex flex-col gap-*` | `space-y-*` sets `margin-top` on the `<app-form-field>` / `<app-button>` element, and margins on a `display: contents` box are ignored. Two 16px gaps were missing from the login card. Handoff §7.3. |
| 3.1 | Packet: "delivered routes screenshot-diff within threshold" | 12/12 shots are outside threshold as shipped; 12/12 pass with two Phase-2 restyles backed out | The residual is exactly the brass CTA fill and the `font-display` heading -- both deliberate DESIGN.md changes (rule 4, rollout step 3) that Phase 2's verifier signed off, and both newer than the baselines. Measured both ways and recorded rather than reverted; relitigating a Phase-2 decision is not this slice's call. Handoff §6. |
| 4 | Packet: one `SheetMusicComponent` | Two -- `<app-sheet-music>` (wrapper) + `<app-sheet-music-display>` (React's card) | React had the same hook/component split, and Phases 5-6 draw their own chrome around the wrapper. |
| 4 | Packet: "port the mapper test" | Written new | R5 -- the React repo has no test for `music.mapper.ts`. |
| 4 | React's SheetMusicPage posted music21 spellings (`"B-"`) from page code | Page holds `"Bb"`; `MusicService` converts | The stated invariant is that feature code never sees `-` flats; React's own page broke it. Identical wire payload. |
| 4 | React's `MusicService` had `isValidNote`/`isValidRhythm` | Not ported | Dead code -- nothing calls them. |
| 4 | Packet Inputs list all 7 music endpoints | `/mary` and `/random` only | The Work section scopes it to "the endpoints these pages use"; Phases 5-6 add theirs. |
| 4 | React had a separate axios `musicApiClient` module | Base URL, 10s timeout and error shaping live in `MusicService` | `HttpClient` is injected, not constructed; error strings are unchanged. |
| 4 | React wrapped the display in `ComponentErrorBoundary` + `SheetMusicFallback` | Error panel driven by the `error` signal | Phase 2 handoff §5's replacement for boundaries, applied to the case it named. |
| 4 | React renders OSMD into a hidden container and ships `width="0"` staves | One-shot `ResizeObserver` redraws once the container has a width | Verified React loses this race 2 times in 3 on :5173. A blank stave fails the packet's exit criterion. |
| 4 | Nothing about Tailwind's `important` | `important: "html"` | Angular injects component styles after `styles.css` at class specificity, so `@ng-icons` beat every `h-N w-N`: all 47 icons rendered at 1em. Selector strategy, no `!important`. **See the integration note -- this is now the general fix, and 3.1's `size=` attributes coexist with it.** |
| 4 | Nothing about `styles.css` | `:root ng-icon { display: block; vertical-align: middle }` | `<ng-icon>` is a custom element, so preflight's `svg` rule never reached it -- 6px of stray line-box height and a 3px nav offset. **Superseded 3.1's unlayered `ng-icon[role="img"]` rule at the merge (`3e92b99`); see the integration note.** |
| 4 | React used `space-y-2` for the rhythm/CTA columns | `flex flex-col gap-2` | `display: contents` hosts take no margin, so the columns stacked flush -- 32px short. |
| 4 | React's file input had no accessible name | `aria-label="Select a MusicXML file"` | Pixel-neutral; same class of change as Phase 0's nine names. Recorded because it is a name React does not have. |
| 4 | Phase 1 put mappers/types under the feature (`auth/models/`) | Followed PLAN.md §4: `shared/utils/`, `shared/models/`, `shared/services/` | `MusicService` serves three features; a feature-local home would mean cross-feature imports. |
| 4 | Packet silent on the CommonJS build warning | `allowedCommonJsDependencies: ["opensheetmusicdisplay"]` in `angular.json` | The documented remedy; keeps the build output clean. |
| 4 | Packet silent on exercising zoom/clear by hand | Added a "Sheet music (OSMD)" section to `/dev/kit` | No page exposes those; the section uses a static score so the kit still touches no API. |
| 4 | Phase 2 handoff §10: `display: contents` hosts swallow `class` | They swallow **margins** too | Recorded so Phases 5-6 do not rediscover it through a silent 32px layout shift. |

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

### Verifier notes (Phase 3 sub-feature 1, 2026-08-20) — 3.1 **verified**

Sub-feature 1 passes. Phase 3 stays `built (3.1)` because five sub-features
are still unbuilt; what is confirmed here is that the pattern-setter is sound
and that 2-6 may fan out. Nothing below is taken from the handoff — all of it
was run by the verifier, on `:4200`, against the Go service on `:5001`.

**Gates.** `npm run build` / `lint` / `test:run` / `format:check` all exit 0,
**146 tests in 21 files** — the handoff's count is exact.

**Parity suite, unmodified.** `navigation.spec.ts` **21/21**,
`auth.spec.ts` **4/5**, `friends-and-theme.spec.ts` **3/4** (28 passed, 2
failed of 30) — the handoff's numbers, reproduced. Both failures are
pre-existing, not regressions: re-run against a detached checkout of
**`24a3bba`** (the commit before the range) the same two fail there, plus a
third — `auth.spec.ts` was **3/5** before this slice, and the signup flow is
the test 3.1 fixed. The two residuals are the dashboard full-name assertion
(sub-feature 6) and the friends-panel heading (sub-feature 4), exactly as
owned.

**Live flows**, fresh throwaway accounts, driven through the UI:

- **Signup.** Form → account created (confirmed by a direct `POST
  /api/auth/login` against the Go service, 200) → lands on `/login` carrying
  "Account created! Please log in." → that account then signs in through the
  UI to `/dashboard`. A mismatched confirmation shows **"Passwords do not
  match"**, stays on `/signup`, and **fires no `POST /api/auth/register`** at
  all (asserted on the request, not on the URL). The checklist and meter are
  live: all five requirements flip and the label moves `Weak` → `Strong` as
  the field is typed into.
- **Login.** `Wr0ngPassw0rd!` → `role="alert"` reading **"Invalid
  credentials"**, still on `/login`. Correct password → `/dashboard`,
  `tremolo-auth` holds `"isAuthenticated":true`, and the session survives a
  reload (still `/dashboard` at t=0 and t=1s).
- **Google callback**, all four failure paths, no crash and no hang:
  no query string → `/login` + "OAuth callback missing required parameters.";
  `?error=access_denied` → "Google sign-in was cancelled.";
  `?error=server_error` → "Google sign-in failed. Please try again.";
  `?code=…&state=…` with a **matching** seeded `google_oauth_state` → the
  exchange really reaches the Go service and its own message, **"Invalid
  authorization code"**, is what the user sees. The notice is one-shot:
  navigating back to `/login` does not re-show it. Zero page errors; the only
  console error is the deliberate 401.

**Screenshot parity — the residual was read, not trusted.** 12/12 outside
threshold at the suite's own `maxDiffPixelRatio: 0.01`, ratios 0.02 desktop /
0.04 mobile, **13,060–17,433 px** — the handoff's figures to the pixel. Each
diff PNG was then decomposed into connected regions. Every shot resolves to
the same two large regions and nothing else of size:

| Region | Desktop | Mobile | What it is |
| ------ | ------- | ------ | ---------- |
| CTA fill | 396x44, ~17,1k px | 306x44, ~13,2k px | the brass button (DESIGN.md rule 4) |
| Heading | ~283x24, ~1.9k px | same | `font-display` (rollout step 3) |

So deviation 9 holds: the two deliberate Phase-2 restyles are the whole of
the large residual. No layout shift, no missing element, no size change in
the card, the fields, the reveal toggle, the divider, the Google button or
the footer link. **With one exception, recorded as V1.**

**V1 (non-blocking, and NOT a 3.1 regression). The mobile nav bar is not
pixel-clean; handoff §6's "nav bar … pixel-clean at both viewports" is
overstated.** A third diff region survives in every shot, and at mobile it is
a real 8px layout shift rather than antialiasing:

- **Desktop:** 34 px, and it is noise — the theme-toggle moon's ink box is
  `(1143,24)-(1158,39)`, **16x16, byte-identical in position and size** to the
  baseline, with the same 67/68 ink pixels. Only the crescent tip antialiases
  differently. The Login button is identical too. Nav icons therefore *do*
  render at their intended size (§7.2 confirmed).
- **Mobile:** 190 px + 72 px. The theme-toggle icon sits **8px right** of its
  React position (`(306,24)` vs `(298,24)`, same 16x16 size), and the
  hamburger glyph gains 1px of antialiasing top and bottom (18x14 → 18x16,
  **same 108 ink pixels**, so same glyph, sub-pixel offset from §7.2's new
  `display: block` host).

Cause, pinned in the live DOM rather than inferred. The nav's right cluster is
`<div class="flex items-center space-x-2">` with three children: the theme
toggle `<app-button>`, the Login `<a>`, and the mobile-menu `<app-button>`.
`space-x-2` puts `margin-left: 8px` on `> * + *`. The `<a>` is a real box, so
its margin applies and **desktop is correct**. At mobile the `<a>` is
`display: none` (`hidden md:block`) and the only remaining margin sits on the
mobile-menu `<app-button>`, whose host is `display: contents` — **so it is
ignored**, and the two buttons butt together at gap 0 instead of 8px.

That is precisely **handoff §7.3's own rule** ("a container holding kit
components uses `flex flex-col gap-*`, not `space-y-*`/`space-x-*`") applied
to the login card but not to the nav bar the same slice was editing. It is
**Phase 2's markup**: `git diff 24a3bba..cdaef29` on
`navigation.component.html` adds `size=` attributes and nothing else — the
`space-x-2` container and the `hidden md:block` are untouched, and the
`size="icon"` buttons were 40px wide before the fix too. Phase 2's verifier
never ran the baselines, which is why it went unseen until now.

Not blocking: 262 px of 355k (0.07%), no behaviour, test, or accessible name
is affected, and the screenshot exit criterion was already carried as
deviation 9. **Whoever next edits the nav — sub-feature 4 owns its friends
toggle — should swap `space-x-2` for `gap-2` on that container and re-check
the mobile shot.**

**Kit fixes (§7), all three confirmed.**

- **§7.1 card `className`.** On `/login` the card's live class list is
  `… rounded-lg shadow-lg …` with **no `shadow-sm`** — tailwind-merge
  *replaced* rather than concatenated — and the computed `box-shadow` is the
  three-layer large one. The title is `font-bold font-display text-3xl
  tracking-tight`: **no `text-2xl`, and `leading-none` is gone too**
  (computed `line-height: 36px`), which is the subtle half of the fix.
- **§7.2 icon sizing.** Verified above against the baseline shot — desktop
  nav icons are pixel-identical in position and size.
- **§7.3 / Phase 2 regression check.** `/dev/kit` renders in **both** themes
  with **zero** console or page errors: 12 headings, 35 buttons, 9 fields, no
  "something went wrong" banner. Screenshotted both ways and read — brass is
  still one CTA, cards carry the single soft shadow, dark is charcoal.
  Full unit suite green (above).

**Pattern check.** Handoff §2 is concrete enough to copy without asking:
file layout, selector/class naming, spec placement, a full component
skeleton with the five load-bearing rules, the template shape, the `TestBed`
+ `HttpTestingController` boilerplate with the `afterEach` contract, how to
drive an input and a submit, and the `npx ng test --include=` invocation.
Its claims check out: **`PLAN.md` was not edited in the range**, so §5.2
remains the canonical fetch-displaying form; **`rxResource` appears nowhere
in `src/` except in comments**, matching deviation 1 honestly rather than
cargo-culting; and every mutation is a one-shot `.subscribe()` per §5.6.
§2.1's "imports inside `src/app/` are relative, the aliases exist but nothing
uses them" is literally true — `grep` for `from "@core/|@shared/|@features/|@app/"`
returns nothing.

**Hygiene.** `shareReplay` still only in `refresh.interceptor.ts` (D6). No
`@NgModule`, no `zone.js` (`npm ls zone.js` empty), no stored `Subscription`,
no `.unsubscribe()`, no `takeUntil`/`destroy$`, no TanStack-shaped code. The
only `ngOnDestroy` hit is a comment saying there isn't one.
`git log 2dd1e3d..cdaef29 -- frontend/e2e/ frontend/.migration/baselines/
frontend-react/` is **empty**, and the baselines were still untracked-clean
after the 12-shot diff run.

**Deviation spot-checks (4 of 9).**

1. **No `rxResource` (dev. 1) — holds.** See the pattern check above.
2. **Password reveal carries no `aria-label` (§4) — proved by experiment.**
   Adding `aria-label="Show password"` to the login reveal button fails
   `login.component.spec.ts` (`expected [] to equal [ "Show password" ]`,
   1 of 10) **and** breaks **4 of 5** tests in `auth.spec.ts` with
   `strict mode violation: getByLabel('Password') resolved to 2 elements`.
   The mutation was reverted and `git diff` was empty afterwards. The
   deviation is not a shortcut; it is load-bearing.
3. **`setNotice`/`takeNotice` (dev. 3) — holds.** The signal is private, read
   once and cleared, never written into the `tremolo-auth` blob (a spec pins
   that, and the live callback run confirms the notice does not survive the
   next navigation).
4. **`[required]` dropped from the auth fields (dev. 6) — holds.** Neither
   auth template passes `required`, so no label renders an asterisk — and
   `grep required` over the React `LoginPage.tsx` / `SignupPage.tsx` returns
   nothing, so the baselines really do have none.

### Integration note (Phase 4, 2026-08-20) — merged, **not** verified

Phase 4 was built in a parallel worktree while 3.1 landed here. This records
what the merge did, because a textual merge alone would have left the branch
in a state neither builder shipped. **Phase 4 stays `built`; a verifier owns
`done` and must verify the *integrated* result, not Phase 4's own base.**

**Base-branch reset.** The worktree branch was created from `origin/main`
(`b2a52b7`), then reset onto **`24a3bba`** — Phase 2's last commit, *before*
3.1 — and its nine commits (`64fb283` through `2d41eb8`) sit on that. So Phase 4 never
saw 3.1's work, and every "unchanged since" claim in `phase-4-handoff.md`
(§8's `git log 24a3bba..HEAD -- frontend/e2e/ .migration/baselines/`, the
screenshot and geometry runs, the 146/21 suite count) is scoped to that base,
not to this branch. Re-measure before quoting any of it.

**Merge.** `dd80abe`, a real merge commit, both histories preserved. **No
textual conflicts** — the two phases touched disjoint files apart from
`styles.css` and `tailwind.config.js`, and even there git took both hunks
cleanly. `angular.json`, `test-setup.ts` and the `/dev/kit` page merged
additively. `e2e/`, `.migration/baselines/` and `frontend-react/` are
untouched across the merge (`git diff 7131492 dd80abe` on those paths is empty),
and Phase 4's ad-hoc screenshot runner was never committed — handoff §8 says
it ran from a scratch directory, and no Playwright config or spec appears in
the range.

**The icon overlap, reconciled in `3e92b99`.** Both builders fixed Phase 2's
`<ng-icon>` sizing defect, differently, and the merge kept both:

- 3.1: `size=` on 17 call sites (10 in the nav, 7 on the auth pages) + an
  unlayered `ng-icon[role="img"]
  { display: block }` in `styles.css`.
- Phase 4: `important: "html"` in `tailwind.config.js` (the general
  mechanism) + `:root ng-icon { display: block; vertical-align: middle }`
  inside `@layer base`.

Settled as follows.

1. **One `display` rule, Phase 4's.** 3.1's is the same specificity but sits
   *below* `@tailwind utilities`, so it would beat a `display` utility
   written on an `<ng-icon>` — the same cascade bug both fixes exist to undo.
   Deleted. Phase 4's also carries preflight's `vertical-align: middle`,
   which 3.1's omitted.
2. **Both *sizing* mechanisms stay, because both are load-bearing.** 3.1's
   `size=` attributes are **not** redundant: `login.component.html:6` and
   `signup-page.component.html:6` carry `size="2rem"` and **no `h-*` class**,
   so `important: "html"` has no utility to promote there and removing
   `size=` would drop both auth logos from 32px to 16px. Symmetrically, all
   seven of Phase 4's own call sites (converter, sheet-music page,
   `/dev/kit`) carry a class and **no `size=`**, so they are sized only by
   `important: "html"`. Removal in either direction changes pixels; nothing
   was removed.
3. **Where a call site has both, they agree exactly.** Audited all 27
   `<ng-icon>` call sites in `src/` (29 tag matches, two of them inside doc
   comments in `core/icons.ts`): **15** carry both, **2** carry `size=`
   only, **10** carry a class only (Phase 4's seven plus Phase 2's toast ×2
   and select). Every one of the 15 maps `h-3`↔
   `0.75rem`, `h-4`↔`1rem`, `h-5`↔`1.25rem`, `h-6`↔`1.5rem` — no mismatch.
   Equivalence is structural, not coincidental: `size=` sets only
   `--ng-icon__size`, `@ng-icons` reads it only for the host's
   `width`/`height`
   (`:host { width: var(--ng-icon__size, 1em) }`), and the inner `svg` is
   `width: inherit`. Whichever declaration wins the cascade, the drawn glyph
   is the same box. **No screenshot was needed and none was taken** — the two
   mechanisms cannot disagree while the mapping holds, and the audit is
   cheaper to re-run than a baseline diff. The mapping is written down in
   `tailwind.config.js` next to `important: "html"`.

**Gates on the merged branch**, all re-run here, all exit 0: `npm run build`,
`npm run lint`, `npm run test:run`, `npm run format:check` — **183 tests in
25 files**, exactly 3.1's 146/21 plus Phase 4's 37/4. `shareReplay` is still
only in `refresh.interceptor.ts` (D6).

**Not done here, and still open for the verifier:** no E2E or screenshot run
against the merged branch. `important: "html"` is a global cascade change
that landed on a branch whose baselines were last diffed without it, and
Phase 4's 8/8 and 12/12 numbers were measured on separate bases. The nav's
`space-x-2` mobile shift (V1 above) is also still open, and sub-feature 4
owns it.

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
- **`ALLOWED_ORIGINS` — settled 2026-08-20 by the 3.1 verifier. The running
  Go service allows three origins:
  `http://localhost:5173,http://localhost:4200,http://localhost:4300`.**
  Sub-feature 1's handoff §8 says "only `:4200` and `:5173`" — **that is
  wrong**, and an agent that believed it would pick a port it did not need to.
  Read from the live process (`tr '\0' '\n' < /proc/<pid>/environ`) and
  confirmed by preflight: `OPTIONS /api/auth/login` with
  `Origin: http://localhost:4300` returns **204** with
  `Access-Control-Allow-Origin: http://localhost:4300`; `:4200` likewise; an
  unlisted origin (`:9999`) returns **403**. So `:4300` is a first-class dev
  port for Go-service calls as well as Python ones. Anything outside the three
  still fails at the preflight, so a fourth port is a coordination problem, not
  a "pick another port" problem — that half of §8 stands.

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
