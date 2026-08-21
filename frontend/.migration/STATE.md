# Migration ledger

**The only place phase status lives.** Update it as part of the phase's commit.

Status values: `pending` → `built` (builder finished, Verify green) → `done`
(a separate verifier agent confirmed Exit criteria). `blocked` if stopped.

| Phase | Name                       | Status  | Date | Commits | Notes |
| ----- | -------------------------- | ------- | ---- | ------- | ----- |
| 0     | Scaffold + parity harness  | done    | 2026-08-20 | `2e94f8a..1421b7b` | React app moved to `frontend-react/`; 7 deviations below. Verified 2026-08-20: build/lint/test green, 47/47 Playwright specs green vs React, 80 baselines confirmed |
| 1     | Core plumbing              | done    | 2026-08-20 | `fc19c37..5d82d9d` | HTTP, auth, guards, 20 routes; login wired end to end. 8 deviations below; the range's last commit is this ledger entry's own doc commit. Verified 2026-08-20: build/lint/test:run/format:check all exit 0 (27 tests, 8 files); all 20 paths navigate with **zero** console errors as anonymous, student and teacher; login persists across reload and clears on logout; dedup and `finalize` both mutation-tested. One verifier note below. |
| 2     | Shared UI kit              | done    | 2026-08-20 | `6de4be4..df5677f` | 9 UI primitives + 5 form components + nav, toast, theme store, icons, `/dev/kit`. 15 deviations below; the range's last commit is this ledger entry's own doc commit. Verified 2026-08-20 (held at `built` on finding F1, then re-verified): **F1 verified fixed** -- logout on `/dashboard` lands on `/login` with `tremolo-auth` cleared, logout on `/about` stays put, and Back after the bounce redirects to `/login` rather than re-rendering the guarded page. All seven signed-in-only routes carry `runGuardsAndResolvers: "always"`; the guest/public routes do not. `app.routes.spec.ts` mutation-tested independently. build/lint/test:run/format:check all exit 0 (109 tests, 17 files). See the re-verification note below. |
| 3     | CRUD features              | built (all six slices) | 2026-08-20 | `2dd1e3d..d6c13ad` (the ledger sync commit follows) | **All six sub-features built and merged.** 2, 3, 4 and 6 were built in parallel worktrees off three different bases and merged 2026-08-20 as `b132e0e`, `1f96692`, `de54a7d` and `99ef609`; **5 (classes) followed as `2a4f61b`**, branched from `7131492` and so carrying none of the other four merges nor Phase 4's. See the two Phase 3 integration notes below. Gates on the fully merged branch all exit 0 -- **394 tests in 49 files** (the union, not the sum: 308/38 before 3.5, whose own 232/32 contributed exactly its 86 new tests in 11 new files). Parity suite unmodified on `:4200`: `navigation.spec.ts` **21/21**, `auth.spec.ts` **5/5**, `friends-and-theme.spec.ts` **4/4** -- **30/30, held across the 3.5 merge**. `classes.spec.ts` **3/4**; test 4 reaches the assignment-play route, resolves the game type and renders the host stub, then times out looking for an answer pad -- **Phase 5's**, and the only residual. 34 further deviations below (4 from 3.2, 8 from 3.3, 8 from 3.4, 6 from 3.6, 8 from 3.5) plus 5 integration deviations. **Not to be marked `done`** -- the consolidated verifier runs next and owns that. Sub-feature 1's own entry follows. **Sub-feature 1 (auth screens)** -- login at full React parity, signup on Signal Forms + zod, Google callback + OAuth service, one-shot notices on `AuthStore`. `phase-3-subfeature-1-handoff.md` is the pattern sub-features 2-6 copy. build/lint/test:run/format:check all exit 0 (146 tests, 21 files); `navigation.spec.ts` 21/21, `auth.spec.ts` 4/5 and `friends-and-theme.spec.ts` 3/4 (both failures owned by sub-features 6 and 4, and both reproduced before this slice). 9 deviations below. **3.1 verified 2026-08-20** -- gates re-run green, parity numbers reproduced exactly, both residual failures reproduced at `24a3bba` (pre-range), live auth flows driven against the Go service, the 12-shot screenshot residual read pixel by pixel, all three §7 kit fixes confirmed and four deviations spot-checked. One non-blocking finding (V1) below. **Sub-features 2-6 are cleared to fan out.** **Sub-feature 5 (classes)** -- classes list, class detail + roster, assignments, assignment-play plumbing, 20 components, 9 `rxResource`s. build/lint/test:run/format:check all exit 0 on its own base (232 tests, 32 files, +86). `classes.spec.ts` 3/4 and screenshots 12/16 -- both residuals are the Phase 5 game behind `/assignments/:id/play`. 8 deviations below. Resumed after its first agent died with 34 files uncommitted; see handoff §2. **Three defects found and fixed (handoff §7): Angular `isLoading()` is not TanStack's and was tearing pages down mid-refetch, a dropped unknown-game-type guard, and `display: inline` component hosts eating every `space-y-*` gap.** |
| 4     | Sheet music / OSMD         | done    | 2026-08-20 | `64fb283..ce2ff23` | OSMD wrapper + card chrome, MusicService with the notation boundary, both pages, `/dev/kit` OSMD section. 146 tests in 21 files **on its own base**; 183 in 25 on the merged branch. 8/8 baseline screenshots pass; navigation.spec 21/21 unmodified on :4300. **Three inherited defects fixed, two of them global** -- React's zero-width staff race (F1), Tailwind utilities losing to Angular component hosts so all 47 `<ng-icon>`s rendered at 1em (F2, Phase 2's), and `<ng-icon>` missing preflight's `svg` rule (F3). 16 deviations below. **Built in a parallel worktree branched off `24a3bba` (Phase 2's last commit, pre-3.1), so the range contains none of 3.1's work; merged into this branch 2026-08-20 as `dd80abe`.** See the integration note below -- 3.1 and Phase 4 fixed the same icon defect independently and the overlap was reconciled in `3e92b99`. **Verified on the integrated branch 2026-08-20** (`1e1fc5e`, not Phase 4's own base): gates green at 183/25, live against the Python service on :8000, the open screenshot risk closed route by route, E2E 21/21 + 4/5 re-measured here, and the documented `SheetMusicComponent` API diffed against the source. See the verifier notes below. |
| 5     | Identification-game engine | pending | —    | —       |       |
| 6     | Note game                  | pending | —    | —       |       |
| 7     | Cutover                    | pending | —    | —       |       |

---

## Deferred decisions

Recorded here when made, so later phases and future readers can find them.

| Decision                           | Phase | Choice      | Rationale |
| ---------------------------------- | ----- | ----------- | --------- |
| Chart library (replaces recharts)  | 3     | `d3-shape@3.2.0` (curve only; marks hand-drawn in SVG) | Rejected `@swimlane/ngx-charts@25` and `ng2-charts@10` -- both pass R6 on the Angular range, but both peer `@angular/cdk`, which Phase 2 declined (its deviation 8). Weight: `d3-shape` 247 KB unpacked vs 2,292 KB and 6,235 KB. `d3-shape` declares **no peerDependencies at all**, so it cannot fail R6 on a future Angular bump -- unlike `lucide-angular` (D12) and `ngx-toastr` (D13), which already have. React's `<Line type="monotone">` *is* `curveMonotoneX` (recharts delegates to it), so the port is the same interpolation, not a lookalike. Cost, stated plainly: ~700 lines of chart code maintained in-repo. `phase-3-subfeature-6-handoff.md` §2. |
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
| 3.2 | 3.1 §2.1: pages live in `<feature>/components/<page>/` | `public/<page>/`, with no `components/` level | PLAN.md §4 draws `public/` as a flat leaf and Phase 1's placeholders were already there. The `components/` level exists to sit beside `models/` and `services/`; `public/` has neither. |
| 3.2 | Packet "Uniform rules": every page consumes via `rxResource` (D6) | Neither page fetches anything | Both are static marketing copy. 3.1 made the same call for the same reason (its deviation 1). |
| 3.2 | DESIGN.md rollout step 3: apply `font-display` to headings | About's `h1`/`h2`/`h3` stay `font-sans`; Home's `h1`/`h2` are `font-display` | React applied `font-display` on HomePage only, and the baselines were captured from React. Parity wins over a literal reading of the rollout. |
| 3.2 | DESIGN.md rule 5: no gradient washes | About's vision card keeps `bg-gradient-to-br from-primary/5 to-brass/5` | Rule 5 governs **the hero**, and the hero has no gradient. This is a 5%-opacity wash on one card that the baseline contains. Flagged, not changed -- restyling is not that slice's call. |
| 3.3 | Packet + 3.1 §9: sub-feature 3 is "the first honest `rxResource` consumer" | No `rxResource`. Both pages read `AuthStore` and fetch nothing | Neither page fetches in React either -- profile renders the session, and all three account actions end in a toast because no backend route exists. Inventing a fetch would have broken the screenshot parity the same packet requires. Handoff §2. |
| 3.3 | Packet Inputs: `services/api/user.service.ts` as one unit | Ported minus four methods (`updateProfile`, `changePassword`, `deleteAccount`, `downloadUserData`) | R5. All four address routes `backend/main/controllers/` never registers, and nothing called them in React. Re-probed live: all four answer **404**. Handoff §4.2. |
| 3.3 | React's `user.types.ts` declares ten `GeneralUserInfo` fields | Six, matching the live payload; `created_date` typed as pre-formatted text | R5, verified by `curl` and again by reading `DTOs/general_user_info_dto.go`. The four stats and `createdAt` never arrive; React masks it with `?? 0` and renders an Invalid Date. Typed away so sub-feature 6 gets a compile error instead of silence. **This is what the 3.6 merge conflict turned on** -- see the integration note. Handoff §4.1. |
| 3.3 | Packet: DTO snake_case -> camelCase mapping at the service boundary, uniformly | `GameType`'s values, `KeyBindings`' keys and `GameSettings.config`'s contents keep their wire spelling | All three are data rather than property names -- a validated identifier, a note-keyed dictionary, and a JSONB blob the games own and `sanitizeConfig` validates. Rewriting keys inside `config` would break every saved config in the database. Handoff §4.4. |
| 3.3 | Packet: `user.service` belongs to the account sub-feature | `shared/services/user.service.ts`, models in `shared/models/` | Neither account page calls it; its consumers are dashboard, note game, the four identification games and assignment-play. PLAN.md §4 maps `services/api/types/` -> `shared/models/` anyway. Handoff §1. |
| 3.3 | React's password form renders a `passwordErrors.root` banner | Not ported | `zodResolver` never populates `root` and nothing calls `setError("root")`, so the branch is unreachable in React. Server errors have no route to come from here. |
| 3.3 | DESIGN.md rollout step 3 applies `font-display` to headings | Not applied to account or profile | Rollout step 3 names the **HomePage** rebuild, and 3.1 measured that the same change costs every shot on a page its threshold. These are ports, not restyles. |
| 3.3 | One agent builds a sub-feature start to finish | Two: the first died mid-handoff at its API limit, the second audited and finished it | Not a choice. Recorded because the audit is the only reason the `self-start` fix is in a commit rather than lost in a dirty tree -- every number was re-measured before being believed. Handoff §6.1. |
| 3.4 | Task: "note the 3.1 verifier's finding V1 (STATE.md)" | `STATE.md` at 3.4's base (`cdaef29`) has **no** 3.1 verifier section and no V1 | R5, and recorded rather than guessed. V1 was reproduced from first principles against the committed markup before being fixed, so the fix does not depend on a document that worktree could not see. |
| 3.4 | Worktree rule: base on `feature/angular-migration` | The worktree came up on `main` (`b2a52b7`); reset onto `cdaef29` | The same trap Phase 4 hit. Recorded so it is fixed rather than re-discovered a third time. |
| 3.4 | Packet: "if it is just server data, it becomes `rxResource` … no store at all" | Both at once: no *new* store, and Phase 2's `FriendsUiStore` stays | The React store holds **only** client state (`isPanelOpen`, `searchQuery`) and never held server data. |
| 3.4 | React rendered its own `<Loader2>` and raw `error?.message` inside the panel | `<app-spinner>` and `<app-error>` | PLAN.md §5.2's template block is the prescribed shape, and `app-error` runs `getErrorMessage`, which is friendlier copy than an axios message. No baseline photographs the open panel, so this costs no parity. |
| 3.4 | React's `FriendCard` took an optional `className` | Dropped | Neither call site passed one. Dead API, and the kit's `className`-through-`cn()` rule (3.1 §7.1) is for parts with base classes worth overriding. |
| 3.4 | React had a `FriendsUIStore` interface in `features/friends/types.ts` | Not ported (`Friend` **is**) | Its fields are `FriendsUiStore`'s signals and its setters are its methods. A second shape would only be a second thing to keep in sync. |
| 3.4 | 3.1 §2.4: `createComponent` then `await fixture.whenStable()` | `createComponent`, `detectChanges()`, flush, **then** `whenStable()` | `whenStable()` deadlocks while an `rxResource` holds a pending task that only the flush releases. Not a change to the pattern -- an extension of it to the fetch-on-load case 3.1 had no example of. **Phases 5-6 will need this.** |
| 3.4 | Task: run the dev server on `:4200` or `:4300`, claiming the lock | Ran on **`:5173`**, with its own lock | Both lock directories were held for the entire run with **no listener on either port**. `:5173` is the second origin in the Go service's `ALLOWED_ORIGINS`, so it passes CORS. |
| 3.6 | PLAN.md §2 sanctioned hand-rolling **the heatmap** only | Both charts are hand-drawn; only the curve interpolator comes from a library | Follows from the same reasoning as the chart decision above, but goes beyond what the plan authorised, so it is recorded. |
| 3.6 | React rendered recharts' `.recharts-legend-item` `<span>`s | `<ul>/<li>/<button aria-pressed>` -- real controls | A keyboard user can now toggle a series, which they could not before. Verified safe: **no spec in `e2e/` references a legend, a chart, or `recharts`**, and none uses `getByRole("img")`. |
| 3.6 | React had no accessible name on the interval select or the chart SVGs | `aria-label="Chart interval"` and an `ariaLabel` on each `<svg role="img">` | Two names React does not have. Same class of change as Phase 0's nine names; same verification as the legend row. |
| 3.6 | React's heatmap tooltip was a hover card on a div grid | A `<title>` element | Makes the cells reachable by screen reader, which React's div grid was not. Visual output unchanged. |
| 3.6 | React's `TeacherDashboard` passed `<Button asChild>` | The bug is **reproduced on purpose**: a `<button>` wrapping an `<a>` | `asChild` was never honoured, so React shipped that markup and the baselines were captured from it. Flagged for whoever cleans up the kit. |
| 3.6 | React's `PerformanceChart` used a discriminated union (`isTeacher: true` => `viewMode` required) | Two independent inputs with defaults | Runtime behaviour is identical; the compile-time guarantee is gone. Recorded as a real loss, not a wash. |
| 3.5 | Packet: port `AssignmentPlayPage.test` | Ported as `models/game-definitions.spec.ts`, and the page got a **new** spec | R5. That file does not test the page despite its name -- it tests `GENERIC_GAME_DEFINITIONS`. React has no component test for the page; 5 were written. |
| 3.5 | Packet: port React's page structure | `@if (x.isLoading())` became `@if (x.status() === "loading")` on five templates | React's `isLoading` is first-load-only; Angular's is also true while reloading. Ported literally, it destroyed child components mid-refetch and cancelled their requests. Handoff §7.1. **The rule generalises: `isLoading()` is only safe on a resource nothing ever reloads.** |
| 3.5 | Packet is silent on component host display | `:host { display: block }` on 11 components, `display: contents` on 2 dialogs | React had no wrapper element at all. Angular's default `inline` host silently ate every `space-y-*` gap; 8 screenshots were failing on it. Handoff §7.3. |
| 3.5 | Packet: assignment-play is plumbing only | Added a runtime `isKnownGameType()` guard React got from its registry lookup | The guard is pure plumbing and needs no game code, so leaving it out was a dropped behaviour rather than a deferral. Handoff §7.2. |
| 3.5 | React's `RosterList` gave each row its own `RosterRow` component | One `confirming` signal on the list, one dialog | That component existed only to hold a `useState` for its own confirm dialog. A signal does not need a component to live in. Same behaviour, one dialog in the DOM instead of one per row. |
| 3.5 | React's play page used `useMemo` for a stable launch object | Plain `computed()` | `useMemo` was there because the game pages' effects keyed off the object's identity. A `computed()` is stable by construction; the concern has no port. |
| 3.5 | Packet: "delivered routes screenshot-diff within threshold" | 12/16 pass; the 4 `assignment-play` shots do not | The baseline photographs React **playing a key-signature game**; Angular photographs the deferred-game stub, and the page is 32px shorter for exactly that reason. Phase 5 owns it. |
| 3.5 | Packet: E2E specs green | `classes.spec.ts` 3/4 | Same cause. Test 4 passes its URL assertion and reaches the host stub; it fails looking for a game answer pad. **Phase 5.** Reproduced at the merge -- see the 3.5 integration note. |
| 3 (integration) | The four slices each ship their own `shared/models/user.models.ts` + `UserService` | One of each, resolved to 3.3's | 3.3 probed the live service and typed what it actually sends; 3.6 branched before that finding existed and ported React's stale ten-field type. Ground truth wins (R5). All four of 3.6's methods already existed in 3.3's superset, so no capability was lost. Integration note below. |
| 3 (integration) | 3.6 kept `game_count` snake_case in a `DailyActivityCount` on `chart.models.ts` | Dropped for 3.3's mapped `DailyActivity` in `game.models.ts` | 3.6 argued a one-field mapper was more machinery than the rename is worth; 3.3 had already written it. With the mapper in hand, the uniform rule (no snake_case above `shared/services/`) costs nothing and the exception costs a standing carve-out. |
| 3 (integration) | 3.6 put `mapGeneralUserInfo` in `shared/utils/user.mapper.ts` | Deleted; 3.3's copy in `shared/models/user.models.ts` is the survivor | Not a judgement that `utils/` is the wrong home -- Phase 4's `music.mapper.ts` lives there. 3.3 co-locates **six** mappers with their DTOs in `game.models.ts`, and moving one without the other five would leave the convention split. A later phase may unify them; doing it mid-merge would be a refactor wearing a conflict's clothes. |
| 3 (integration) | 3.6's dashboard read four stats and a parsed `createdAt` off the profile | Sessions from `total_entries`; the other three tiles zero; the join date rendered as the service's pre-formatted string | Forced by the row above -- the phantom fields no longer typecheck. React rendered four zeroes and "Joined Invalid Date" from the same absent data, so three tiles are unchanged in behaviour and the sessions tile now shows the number it always claimed to. **The join date is the one visible change and the `dashboard-*` baselines were captured with "Invalid Date"** -- flagged for the consolidated verifier, not re-baselined here. |
| 3 (integration) | 3.5 ships `shared/models/game.types.ts` holding a `GameType` union that 3.3's `shared/models/game.models.ts` already declares | One declaration, 3.3's; 3.5's six importers repointed and its copy deleted | Both are ports of the same React file (`services/api/types/game.types.ts`); 3.3 ported all of it, 3.5 only the union it needed. `GameType` is one of three places a new game must be registered (root CLAUDE.md) and a second copy makes it four. The unions are string-literal types, so they were structurally interchangeable and **nothing failed to compile** -- which is why this had to be caught by reading rather than by building. `GenericGameType` and `SettingsGameType` are deliberately left as two aliases; a comment now explains why, so a third is not added. |

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
owns it. **All of this is closed by the verification below, except V1, which
sub-feature 4 still owns.**

### Verifier notes (Phase 4, 2026-08-20) — Phase 4 is `done`

Verified on the **integrated** branch at `1e1fc5e`, not on Phase 4's own
base. Nothing below is taken from `phase-4-handoff.md`; every number was
re-measured here, because the handoff's were measured at `24a3bba`.

**Gates.** `npm run build` / `lint` / `test:run` / `format:check` all exit 0,
**183 tests in 25 files**. The build emits **no warnings** — the
`allowedCommonJsDependencies` entry (deviation 14) is doing its job.

**Live, against the Python service on :8000** (`ng serve` on `:4300` from
this checkout; the serving process's `/proc/<pid>/cwd` was confirmed to be
`frontend/`, not a worktree). `/sheet-music`, Bb Major → **Generate Mary**:

| Generation | Request body | `<svg>` |
| ---------- | ------------ | ------- |
| 1 (Mary)   | `{"tonic":"B-","octave":4}` | `908 × 318`, laid-out box `908 × 318` |
| 2 (16th rhythm) | `{"rhythm":"112","rhythmType":16,"tonic":"B-"}` | `908 × 318` |
| 3 (Mary)   | `{"tonic":"B-","octave":4}` | `908 × 318` |

So the boundary really converts on the wire (`"Bb"` in the UI's option list,
`"B-"` in the POST body) and **no generation ships a `width="0"` staff** —
the F1 case React loses twice in three.

- **Error path, from a clean page:** a 400 from `/mary` renders
  **"Error: The note Cannot make a step out of 'Z' is not currently
  supported, reconsider you root note"** — the service's own body, verbatim —
  with "Please try again with different options" beneath it, and **no staff
  container in the DOM at all**. A good generation from that same page then
  recovers to `908 × 318`.
- **`/convert`:** a real `/mary` response uploaded as a file shows
  "Uploaded: mary.musicxml" and draws at `780 × 318`. XML that passes the
  page's own checks and fails OSMD's parser shows the error panel —
  **"Failed to render sheet music: given music sheet was incomplete or could
  not be loaded."** — and again no staff, not a blank one.
- **`/dev/kit`:** `zoom` 1 → 2.2 grows the drawn staff `318px` → `699.6px`
  with **zero navigations** (no reload, no refetch); `clear()` takes the SVG
  from 3 children to 0 and leaves the OSMD shell; broken XML sets both the
  status output and the `error` signal.
- Every console error across the whole run (5) was a deliberately triggered
  error path. Zero unexpected console or page errors.

**Mapper leak.** `grep -rE '"[A-G]-"|Music21NoteName|music21' src/` returns
`music.mapper.ts`, `music.mapper.spec.ts`, `music.service.ts`,
`music.service.spec.ts`, and four doc comments. No `-` spelling reaches a
component or a template. `music.mapper.spec.ts` run alone: **7/7**.

**The open risk — screenshot sweep on the merged branch. Closed.** All four
routes with real content, 2 viewports × 2 themes, full page, staff masked,
against `.migration/baselines/`, then every diff decomposed into connected
regions (threshold: max-channel Δ > 20, 9×9 dilation). Captured twice, on two
different ports, byte-identical both times.

| Route | Desktop light | Desktop dark | Mobile light | Mobile dark |
| ----- | ------------- | ------------ | ------------ | ----------- |
| `/sheet-music` | 56 px | **0 px** | 297 px | 272 px |
| `/convert`     | 56 px | **0 px** | 297 px | 272 px |
| `/login`       | 19,610 px | 19,545 px | 15,891 px | 15,857 px |
| `/signup`      | 19,315 px | 19,279 px | 15,596 px | 15,591 px |

Every region resolves to a known:

- **Phase 4's own two routes are pixel-clean.** Desktop dark is **exactly
  zero**; desktop light differs only by the nav moon (below); mobile only by
  the nav. Nothing on either page body moved. This is the direct evidence
  that `important: "html"` restored React's cascade rather than inventing a
  new one.
- **Nav moon**, desktop light, 56 px, one 23×23 region. Ink box is
  `(1142,23)-(1160,41)`, **18×18 and identical in position and size** to the
  baseline; 114 → 111 ink px. A glyph redraw by the newer lucide in
  `@ng-icons` (3.2's known), not a size or position change. Dark theme shows
  the Sun instead and diffs **0 px**.
- **Mobile nav**, 272–297 px in three regions: the theme toggle 18×18 sitting
  **8 px right** (`(297,23)` → `(305,23)`) and the hamburger at the same x
  going 18×14 → 18×16 with the **same 108 ink px**. That is V1 exactly —
  Phase 2's `space-x-2` on a `display: contents` host. **Still sub-feature
  4's.**
- **`/login` and `/signup`:** the brass CTA fill (404×52, ~17.2k px desktop /
  314×52, ~13.1k px mobile) and the `font-display` heading (~293×32, ~2.3k
  px) — the two deliberate DESIGN.md restyles, unchanged in size from 3.1's
  measurement.
- One region 3.1's sweep did not name, checked and cleared: an **8–11 px**
  region per password field (one on `/login`, two on `/signup`, at
  `(811,493)-(825,503)` and friends). Ink box is **14×10 in both baseline and
  actual, same position**, 80 → 81 / 77 → 74 ink px. It is the reveal-toggle
  eye — the same lucide glyph-redraw class as the moon, not a layout or size
  change.

**No region anywhere in the sweep falls outside those knowns.**

**E2E on the merged branch, unmodified specs, `E2E_BASE_URL=…:4300`.**
`navigation.spec.ts` **21/21**. `auth.spec.ts` **4/5** — the one failure is
`signs in and lands on the dashboard`, waiting on the signed-in user's full
name, which sub-feature 6 owns. Exactly the expected split.

**`SheetMusicComponent` API contract — matches the handoff §3 document
exactly.** Selector, `display: contents` host, all four inputs with their
declared types and defaults (`zoom` 1, `options` undefined, `ariaLabel`
`"Sheet music display"`, `containerClass` `""`), both outputs
(`renderComplete: void`, `renderError: Error`), and all five public members
(`loadAndRender` returning `Promise<void>` and never rejecting — the `catch`
records and emits, the `finally` clears `isLoading`; `clear()` resetting
`error` and **not** touching `isLoading`; `isLoading` / `error` as readonly
signals; `instance` a getter, null until the first `loadAndRender`). No
drift. `SheetMusicDisplayComponent` matches §3's short form too: `musicXml`
required, `className`, both outputs, no `zoom` passthrough. **Phases 5 and 6
may build against the document as written.**

**Zoneless honesty.** No `detectChanges`, `ApplicationRef.tick` or
`markForCheck` anywhere outside tests — in fact nowhere in `src/` at all. The
ResizeObserver fix is genuinely one-shot: the callback returns early while
`clientWidth` is 0, and otherwise calls `stopWatchingVisibility()`
(`disconnect()` + null) **before** re-rendering, so it never re-arms;
`watchVisibility()` also refuses to create a second observer, and both
`clear()` and `ngOnDestroy` tear it down.

**Deviation spot-checks (8 of 16).**

1. **Deviation 8 (ResizeObserver / F1) — the React race is real, in React's
   own code.** `frontend-react/.../SheetMusicDisplay.tsx:120` puts `hidden`
   on the container while `isLoading`, and `useOSMD.ts` sets `isLoading` true
   at :128 then calls `osmd.render()` at :144 *inside* `load().then(...)`,
   settling `isLoading` only at :157. So whether OSMD measures a laid-out box
   depends on which promise resolves first. Confirmed by reading; the Angular
   side's three-generation run above shows the fix holding.
2. **The amended icon-sizing row (3.1 dev. 6) — the amendment is correct and
   the original rationale was wrong.** `@ng-icons/core`'s compiled component
   declares `host: { properties: { "style.--ng-icon__size": "size()" } }` and
   a stylesheet of `:host{display:inline-block;width:var(--ng-icon__size,1em);
   height:var(--ng-icon__size,1em)…}`. So `size=` writes **only the custom
   property** inline; the `width`/`height` reading it are a `[_nghost-…]`
   rule at (0,1,0), which `important: "html"`'s `html .h-6` (0,1,1) beats.
   The `:root ng-icon` display rule is (0,1,1) for the same reason and does
   outrank `[_nghost-…]`. Both mechanisms are live, as the row says.
3. **Deviation 3 (page holds UI spelling) — holds.** `SCALES` in
   `sheet-music-page.component.ts` is `{ label: "Bb Major", tonic: "Bb" }`;
   the `"B-"` appears only on the wire, as the live run shows.
4. **Deviation 5 (two endpoints only) — holds.** `music.service.ts` posts
   `/mary` and `/random` and nothing else.
5. **Deviation 11 (`flex flex-col gap-2`) — holds.** All three button columns
   on `/sheet-music` use it; no `space-y-*` around a kit component on that
   page. Corroborated by the page's 0 px desktop-dark diff.
6. **Deviation 12 (file-input name) — holds.** `aria-label="Select a MusicXML
   file"` is on `/convert`'s `input[type="file"]`.
7. **Deviation 14 (CommonJS) — holds.** `angular.json` carries
   `"allowedCommonJsDependencies": ["opensheetmusicdisplay"]` and the build
   is warning-free.
8. **Deviation 15 (`/dev/kit` OSMD section) — holds.** Load / Load broken XML
   / Clear / zoom select all present and all four exercised live above.

**Hygiene.** `shareReplay` still only in `refresh.interceptor.ts` (D6). No
`@NgModule`, no `zone.js` (`npm ls zone.js` → empty), no stored
`Subscription`, no `takeUntil`. The only `ngOnDestroy` in `src/` is
`SheetMusicComponent`'s, which PLAN.md §5.6 names as the legitimate case, and
there is no subscription in that file. `git log 7131492..1e1fc5e --
frontend/e2e/ frontend/.migration/baselines/ frontend-react/` is **empty**,
and the working tree was clean before and after this verification.

**Env note for the next agent — the port locks are not honoured by everyone.**
`/tmp/tremolo-port-4300.lock` was held by this verifier from 18:30, yet a
parallel worktree's `ng serve` bound `:4300` at 18:35 the moment this one
exited, and an E2E run went silently against *that* build (it reported
`auth.spec.ts` 5/5, which is not this branch's number). **Before trusting any
live measurement, read `/proc/<pid>/cwd` for whatever is listening on your
port** — `ss -lntp | grep :<port>`. Both backends' `ALLOWED_ORIGINS` still
cover only `:5173`, `:4200`, `:4300`, so a fourth port is not an escape
hatch: an origin outside those three gets no
`Access-Control-Allow-Origin` from either service (verified against both
on :8000 and :5001). A port not in the list is still fine for a
screenshot-only run, which needs no backend.

### Integration note (Phase 3 sub-features 2, 3, 4, 6 — 2026-08-20) — merged, **not** verified

Four slices built in parallel worktrees off three different bases, merged
here in one pass, smallest/oldest-base first. **Sub-feature 5 (classes) was
still building in its own worktree and is not in this range.** Phase 3 stays
`built (…)`; a consolidated verifier owns `done` and must verify the
*integrated* result, not any slice's own base.

| # | Slice | Branch base | Merge commit | Conflicts |
| - | ----- | ----------- | ------------ | --------- |
| 1 | 3.2 public (home + about) | `7131492` | `b132e0e` | none |
| 2 | 3.3 account (+ `UserService`) | `7131492` | `1f96692` | none |
| 3 | 3.4 friends (+ nav V1 fix) | `cdaef29` | `de54a7d` | none |
| 4 | 3.6 dashboard (+ charts) | `3e92b99` (already carried the Phase 4 merge) | `99ef609` | **4, all add/add** |

**Gates were re-run after every merge and all four exit 0 each time.** Suite
growth: 183/25 (base) → 195/27 → 230/30 → 261/34 → **308/38**. The union is
not the sum of the slices' own counts (158/23, 181/24, 177/25, 234/30),
because each was measured on a base that already contained 146/21 or 183/25.

#### The one real conflict: whose profile type is true

3.3 and 3.6 both created `shared/models/user.models.ts`,
`shared/models/chart.models.ts`, `shared/services/user.service.ts` and its
spec. This was not a formatting collision — the two files disagreed about
what the Go service sends.

- **3.3** probed `GET /api/users/:id/general-info` live and typed the **six**
  fields it returns (`first_name`, `last_name`, `role`, `created_date`,
  `total_entries`, `total_duration`), deliberately dropping the four stats
  and `created_at` that React's `user.types.ts` declares and the service has
  never sent. Its handoff §4.1 says in as many words that this is meant to
  hand sub-feature 6 a compile error rather than another year of silence,
  and it names the resulting stat-tile decision as 6's to make.
- **3.6** branched from `3e92b99`, before 3.3 existed, so it never saw that
  finding. It ported React's ten-field type verbatim and built the dashboard
  on it.

Resolved for 3.3, on ground truth rather than seniority:
`backend/main/DTOs/general_user_info_dto.go` was read directly during the
merge and serialises exactly the six fields 3.3 describes. Keeping 3.6's
type would have meant knowingly shipping a declaration that lies about the
wire. All four of 3.6's methods (`getProfile`, `getStats`,
`getClassMetrics`, `getActivityHeatmap`) already existed in 3.3's superset,
so the service reconciled to one file with nothing dropped.

3.6's dashboard was then adapted to the surviving type — the four deviation
rows above give the detail. **The decision 3.3 §4.1 left open was therefore
forced by the merge rather than taken freely, and the verifier should treat
it as still open**: the sessions tile now reads `total_entries`, and
`total_questions` / `average_npm` / `average_accuracy` render zero because
no endpoint supplies them. Deriving the latter two from the chart series is
possible and was **not** done — that is new behaviour, not a port.

**One open screenshot risk, not closed here.** 3.6 measured `/dashboard`
**4/4 unmasked** against the baselines on its own base, with the join date
rendering "Joined Invalid Date" exactly as React does. The reconciled model
renders the real "Joined 15 Jan 2026". That string is a different width, so
the four `dashboard-*` baselines are expected to diff on that region and
**were deliberately not re-captured** — re-baselining to accommodate a merge
resolution is not an integrator's call. Nothing else in 3.6's sweep is
affected: the baseline student has zero games, so `total_entries` is 0 and
the sessions tile is pixel-identical to React's `?? 0`.

#### What was measured on the merged branch

- **Gates**, all exit 0: `npm run build`, `npm run lint`, `npm run test:run`,
  `npm run format:check` — **308 tests in 38 files**.
- **Parity suite, unmodified, on `:4200`** (this checkout's own `ng serve`;
  `/proc/<pid>/cwd` confirmed to be `frontend/`, per Phase 4's env note):
  `navigation.spec.ts` **21/21**, `auth.spec.ts` **5/5**,
  `friends-and-theme.spec.ts` **4/4** — **30/30 in one run**. This is the
  first fully green run of the three golden specs in the migration: 3.4
  closed the friends-panel failure and 3.6 closed the dashboard full-name
  failure, and both hold together.
- `classes.spec.ts` **1/4** — the three failures are **sub-feature 5's**,
  which is not in this range. `settings.spec.ts` and `games.spec.ts` were
  not run; they belong to Phases 5 and 6.
- **Hygiene.** `shareReplay` appears as *code* only in
  `refresh.interceptor.ts` (D6); the two other hits are doc comments, one of
  which says there isn't one. No `@NgModule`, no `zone.js` (`npm ls zone.js`
  empty), no `takeUntil`. `git log 5191082..99ef609 -- frontend/e2e/
  frontend/.migration/baselines/ frontend-react/` is **empty** and so is the
  diff over those paths.
- **The TanStack grep is no longer literally empty, and the criterion still
  passes.** `grep -ri "tanstack\|useQuery\|queryClient" src/` returns **5**
  matches; every one is English prose in a comment explaining what replaced
  the query layer (checked mechanically — no hit is outside a comment).
  3.6's handoff §6 predicted 3; 3.4 added two more. The grep as written
  cannot tell prose from code. **A later phase that wants this greppable
  should tighten the pattern rather than edit the comments.**

#### Env notes for the next agent

- **A full `npm install` is required after this merge** — 3.6 adds
  `d3-shape` and `@types/d3-shape` to `package.json`.
- **The OSMD specs flake under load.** On the first post-merge run, all four
  `sheet-music-display.component.spec.ts` tests failed with
  `Failed to initialize OpenSheetMusicDisplay Error: WebGL is not available`
  while `npm install`'s native rebuilds were still settling. The file passes
  **5/5** alone, and two consecutive full runs afterwards were **308/38
  green**. It is WebGL context contention, not a merge defect — but a single
  red run of that file is not evidence of a regression. Re-run before
  believing it.
- `:5173` was held throughout by sub-feature 5's worktree
  (`agent-a741e57bd110253e8`) and was left alone. `:4200` was taken over
  from a stale server that was serving this checkout; it was stopped and
  replaced so the E2E numbers above are known to be this tree's.

---

### Integration note (Phase 3 sub-feature 5 — 2026-08-20) — merged, **not** verified

The last Phase 3 merge. 3.5 branched from `7131492`, so it carries **none**
of Phase 4's merge and none of the other four slice merges — it is the
oldest base of the six and the only one merged alone.

| Slice | Branch base | Merge commit | Conflicts |
| ----- | ----------- | ------------ | --------- |
| 3.5 classes | `7131492` | `2a4f61b` | **none, textually** |

**The merge was textually clean and that is not the same as semantically
clean.** 3.5 touches the classes feature (which the other five slices never
opened, because Phase 1 left it as four placeholder components) plus exactly
two new shared files. It did not touch `app.routes.ts` — its four routes
were declared in Phase 1 and already carried
`runGuardsAndResolvers: "always"` — and it did not touch the nav. So git had
nothing to resolve. One overlap needed a human read anyway.

#### The overlap git could not see: two `GameType` unions

3.5 added `shared/models/game.types.ts` declaring
`"note" | "key_signature" | "scale" | "chord" | "interval"`. 3.3's
`shared/models/game.models.ts`, merged three merges earlier, declares the
identical union. Both are ports of the same React file
(`services/api/types/game.types.ts`) — 3.3 ported all of it (score entries,
settings, key bindings), 3.5 only the union the classes feature needed.

Different filenames, so no conflict; string-literal unions, so the two are
structurally interchangeable and **every gate passed with both present**.
The build could not have told anyone. Resolved in `d6c13ad`: 3.3's file
survives, 3.5's six importers repoint to it, 3.5's copy is deleted.
`game-definitions.ts` stays in the classes feature — its labels and default
configs are the feature's, not the wire's.

`GenericGameType` (3.5) and `SettingsGameType` (3.3) both spell
`Exclude<GameType, "note">` and were **left as two aliases**. They agree
because the note game is special twice over — it has its own page *and* its
own settings table — not because either is defined in terms of the other. A
comment in `game-definitions.ts` now says so.

#### The `isLoading()` sweep — clean, with a standing trap

3.5's handoff §7.1 found that Angular's `resource.isLoading()` is true for
`loading` **and** `reloading`, where TanStack's was first-load only, and
that a page gated on it tears its own body down mid-refetch — cancelling the
child requests it had just started. The other four merged slices were swept
for the same trap at this merge:

- **`.reload()` appears nowhere outside the classes feature.** Every call
  site (`classes-page`, `class-detail-page`, `class-assignments-list`,
  `roster-list`, `join-class-card`) is 3.5's, and all five already gate on
  `status() === "loading"`.
- The three `isLoading()` uses in other slices — friends'
  `add-friend-view` (`results`) and `my-friends-view` (`friends`), and
  dashboard's `activity` — are on **params-driven resources that nothing
  reloads**. Without a `.reload()`, `reloading` is unreachable and
  `isLoading()` is exactly `status() === "loading"`. Dashboard's page
  skeleton already keys on `status()` and documents why.
- Friends' list is read-only in this phase: no mutation, no refresh, no
  invalidation. That is *why* it is safe, and it is also why the safety is
  contingent.

**So: no exposure today, and one rule for Phases 5-6.** The moment anything
adds a `.reload()` to friends' `friends` (after removing a friend) or to
dashboard's `activity` (after a game), those three `isLoading()` calls
become the same defect 3.5 fixed. Flagged for the consolidated verifier as a
finding, not fixed here — fixing another slice's working code mid-merge is
not an integrator's call.

#### The host-`display` conventions coexist without colliding

3.5 put `:host { display: block }` on 11 components and `display: contents`
on its 2 dialogs; 3.6 used `host: { class: "block" }` on the heatmap; the
kit and 3.1 use `display: contents` deliberately on parts that must
contribute no box. **No component is claimed by two conventions** — the sets
are disjoint — so nothing was changed. Recorded because the branch now
carries two spellings of "this host is a block", and a later phase choosing
between them should know both are load-bearing where they sit.

#### What was measured on the fully merged branch

- **Gates**, all exit 0: `npm run build`, `npm run lint`, `npm run test:run`,
  `npm run format:check` — **394 tests in 49 files**, up from 308/38. The
  delta is exactly 3.5's 86 new tests in 11 new files, so the merge added no
  test and lost none.
- **Parity suite, unmodified, on `:4200`** (this checkout's own `ng serve`;
  `/proc/296658/cwd` confirmed to be `frontend/`): `navigation.spec.ts`
  **21/21**, `auth.spec.ts` **5/5**, `friends-and-theme.spec.ts` **4/4** —
  **30/30 in one run.** The first fully green run, from the four-merge
  train, **holds across this merge.**
- **`classes.spec.ts` 3 / 4** — 3.5's own numbers reproduced here exactly.
  Test 4 fails at `getByRole("button", { name: "C" })` after 20s. Its
  captured page snapshot shows the "Back to assignments" link, a heading
  reading **"Key Signature practice"** and the stub's own sentence, "This
  assignment is ready to play. The Key Signature game is not available in
  this build yet." The route, the resource, the list lookup, the game-type
  resolution and the handoff to `<app-assignment-game-host>` all work; the
  answer pad is **Phase 5's** and nothing else is missing.
- `settings.spec.ts` and `games.spec.ts` were not run — Phases 5 and 6.
- **Hygiene.** `shareReplay` appears as *code* only in
  `refresh.interceptor.ts` (D6); the one other hit is a doc comment in
  `user.service.ts` saying there isn't one. No `@NgModule`; the only
  `takeUntil*` hits are `takeUntilDestroyed`, which is the sanctioned API.
  `git diff 52c5a35..HEAD -- frontend/e2e/ frontend/.migration/baselines/
  frontend-react/` is **empty**, and so is `git log` over those paths.
- **No `npm install` surprises**: 3.5 adds no dependency. `package.json` is
  untouched by the merge.

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
