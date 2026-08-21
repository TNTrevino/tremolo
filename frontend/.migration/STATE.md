# Migration ledger

**The only place phase status lives.** Update it as part of the phase's commit.

Status values: `pending` → `built` (builder finished, Verify green) → `done`
(a separate verifier agent confirmed Exit criteria). `blocked` if stopped.

| Phase | Name                       | Status  | Date | Commits | Notes |
| ----- | -------------------------- | ------- | ---- | ------- | ----- |
| 0     | Scaffold + parity harness  | done    | 2026-08-20 | `2e94f8a..1421b7b` | React app moved to `frontend-react/`; 7 deviations below. Verified 2026-08-20: build/lint/test green, 47/47 Playwright specs green vs React, 80 baselines confirmed |
| 1     | Core plumbing              | done    | 2026-08-20 | `fc19c37..5d82d9d` | HTTP, auth, guards, 20 routes; login wired end to end. 8 deviations below; the range's last commit is this ledger entry's own doc commit. Verified 2026-08-20: build/lint/test:run/format:check all exit 0 (27 tests, 8 files); all 20 paths navigate with **zero** console errors as anonymous, student and teacher; login persists across reload and clears on logout; dedup and `finalize` both mutation-tested. One verifier note below. |
| 2     | Shared UI kit              | done    | 2026-08-20 | `6de4be4..df5677f` | 9 UI primitives + 5 form components + nav, toast, theme store, icons, `/dev/kit`. 15 deviations below; the range's last commit is this ledger entry's own doc commit. Verified 2026-08-20 (held at `built` on finding F1, then re-verified): **F1 verified fixed** -- logout on `/dashboard` lands on `/login` with `tremolo-auth` cleared, logout on `/about` stays put, and Back after the bounce redirects to `/login` rather than re-rendering the guarded page. All seven signed-in-only routes carry `runGuardsAndResolvers: "always"`; the guest/public routes do not. `app.routes.spec.ts` mutation-tested independently. build/lint/test:run/format:check all exit 0 (109 tests, 17 files). See the re-verification note below. |
| 3     | CRUD features              | done    | 2026-08-20 | `2dd1e3d..5a83341` (this ledger entry's own commit follows) | **Verified 2026-08-20 by the consolidated verifier -- see the notes at the end of this file.** Gates re-run green at **394/49**; parity **33/34** (`navigation` 21/21, `auth` 5/5, `friends-and-theme` 4/4, `classes` 3/4 with the residual pinned to the Phase 5 answer pad); `settings.spec.ts` + `games.spec.ts` run for attribution only -- **9 failures, every one at a game screen, none at a CRUD screen**; seven live flows driven on fresh accounts with **zero console errors**; the recorded chart gap closed with a seeded 10-day play history; **32 of 40 Phase-3 shots inside threshold**, the 8 being the pre-recorded login/signup restyle residual. The baseline, chart-fidelity and `isLoading()` decisions are recorded in the verifier notes. **All six sub-features built and merged.** 2, 3, 4 and 6 were built in parallel worktrees off three different bases and merged 2026-08-20 as `b132e0e`, `1f96692`, `de54a7d` and `99ef609`; **5 (classes) followed as `2a4f61b`**, branched from `7131492` and so carrying none of the other four merges nor Phase 4's. See the two Phase 3 integration notes below. Gates on the fully merged branch all exit 0 -- **394 tests in 49 files** (the union, not the sum: 308/38 before 3.5, whose own 232/32 contributed exactly its 86 new tests in 11 new files). Parity suite unmodified on `:4200`: `navigation.spec.ts` **21/21**, `auth.spec.ts` **5/5**, `friends-and-theme.spec.ts` **4/4** -- **30/30, held across the 3.5 merge**. `classes.spec.ts` **3/4**; test 4 reaches the assignment-play route, resolves the game type and renders the host stub, then times out looking for an answer pad -- **Phase 5's**, and the only residual. 34 further deviations below (4 from 3.2, 8 from 3.3, 8 from 3.4, 6 from 3.6, 8 from 3.5) plus 5 integration deviations. **Not to be marked `done`** -- the consolidated verifier runs next and owns that. Sub-feature 1's own entry follows. **Sub-feature 1 (auth screens)** -- login at full React parity, signup on Signal Forms + zod, Google callback + OAuth service, one-shot notices on `AuthStore`. `phase-3-subfeature-1-handoff.md` is the pattern sub-features 2-6 copy. build/lint/test:run/format:check all exit 0 (146 tests, 21 files); `navigation.spec.ts` 21/21, `auth.spec.ts` 4/5 and `friends-and-theme.spec.ts` 3/4 (both failures owned by sub-features 6 and 4, and both reproduced before this slice). 9 deviations below. **3.1 verified 2026-08-20** -- gates re-run green, parity numbers reproduced exactly, both residual failures reproduced at `24a3bba` (pre-range), live auth flows driven against the Go service, the 12-shot screenshot residual read pixel by pixel, all three §7 kit fixes confirmed and four deviations spot-checked. One non-blocking finding (V1) below. **Sub-features 2-6 are cleared to fan out.** **Sub-feature 5 (classes)** -- classes list, class detail + roster, assignments, assignment-play plumbing, 20 components, 9 `rxResource`s. build/lint/test:run/format:check all exit 0 on its own base (232 tests, 32 files, +86). `classes.spec.ts` 3/4 and screenshots 12/16 -- both residuals are the Phase 5 game behind `/assignments/:id/play`. 8 deviations below. Resumed after its first agent died with 34 files uncommitted; see handoff §2. **Three defects found and fixed (handoff §7): Angular `isLoading()` is not TanStack's and was tearing pages down mid-refetch, a dropped unknown-game-type guard, and `display: inline` component hosts eating every `space-y-*` gap.** |
| 4     | Sheet music / OSMD         | done    | 2026-08-20 | `64fb283..ce2ff23` | OSMD wrapper + card chrome, MusicService with the notation boundary, both pages, `/dev/kit` OSMD section. 146 tests in 21 files **on its own base**; 183 in 25 on the merged branch. 8/8 baseline screenshots pass; navigation.spec 21/21 unmodified on :4300. **Three inherited defects fixed, two of them global** -- React's zero-width staff race (F1), Tailwind utilities losing to Angular component hosts so all 47 `<ng-icon>`s rendered at 1em (F2, Phase 2's), and `<ng-icon>` missing preflight's `svg` rule (F3). 16 deviations below. **Built in a parallel worktree branched off `24a3bba` (Phase 2's last commit, pre-3.1), so the range contains none of 3.1's work; merged into this branch 2026-08-20 as `dd80abe`.** See the integration note below -- 3.1 and Phase 4 fixed the same icon defect independently and the overlap was reconciled in `3e92b99`. **Verified on the integrated branch 2026-08-20** (`1e1fc5e`, not Phase 4's own base): gates green at 183/25, live against the Python service on :8000, the open screenshot risk closed route by route, E2E 21/21 + 4/5 re-measured here, and the documented `SheetMusicComponent` API diffed against the source. See the verifier notes below. |
| 5     | Identification-game engine | done    | 2026-08-20 | `fd84777..f5e9e6a`, merged as `ff67321`; **F1 fix `3377975` + its docs `8758590`** (this ledger entry's own commit closes the range) | Engine **redesigned** as Angular/RxJS per PLAN.md §5.5-§5.7, not translated: the queue's `generationRef` is a `switchMap` on the keyed payload, its reset debounce a cancellable `timer` with the first emission exempt, its `inflightRef` an `exhaustMap`; the constants are preserved exactly (low water 2, hydrate batch 2, 300ms). All four identification games play from their own routes and from an assignment; `keySignature` is a `.ts` and no JSX-shaped data is left in `games/`. **Measured on the merged branch, not taken from the handoff:** build/lint/test:run/format:check all exit 0 -- **439 tests in 54 files** (+45 in 5 new files over Phase 3's 394/49), which reproduces the builder's own numbers exactly. Parity suite unmodified on `:4300`, own server, cwd-verified: `classes.spec.ts` **4/4** -- **Phase 3's single residual, closed and reproduced at the merge**; golden three **30/30** (`navigation` 21/21, `auth` 5/5, `friends-and-theme` 4/4); `games.spec.ts` **4/6** and `settings.spec.ts` **2/3**, and all three residuals are the note game, so **Phase 6's** -- attribution re-confirmed at the merge, including that "renders a staff on every game" iterates `/note-game` first and never reaches the four that work. 16 deviations below. The builder's screenshot sweep (**20/20**, including the four `assignment-play` shots Phase 3 recorded as failing against the deferred-game stub) is **carried over unverified** -- `baselines.spec.ts` cannot report it and the integrator did not re-run the scratch sweep; the verifier owns that. `e2e/`, `.migration/baselines/`, `frontend-react/` and `package.json` byte-identical across the merge. See the Phase 5 integration note below, and `phase-5-handoff.md` for the verbatim `GameDefinition`. **Verified 2026-08-20 on the integrated branch (`56b657f`) and HELD at `built` on one blocking finding -- see the Phase 5 verifier findings at the end of this file.** Everything in the packet's Exit criteria passes except "test exit 0": **`npm run test:run` is flaky, 9 green in 12 clean runs**, always the same four tests in Phase 4's `sheet-music-display.component.spec.ts`, whose `vi.mock("opensheetmusicdisplay")` intermittently fails to apply so the real OSMD is used. **It is Phase 5's**: the identical treatment at `f022dfd` (this branch immediately before the merge) is 8/8 green, and the spec passes 5/5 in isolation every time. F1 below. Everything else re-measured and green: the **screenshot sweep the integrator carried unverified reproduces exactly at 20/20** (four game routes + assignment-play x 2 viewports x 2 themes, staff masked *and* asserted non-empty on all 20, harness negative-controlled, baselines byte-identical after); E2E unmodified on `:4300` with a cwd-verified server -- `classes` **4/4**, golden three **30/30**, `games` **4/6**, `settings` **2/3**, all three residuals confirmed as `/note-game` **by reading a failure snapshot**; **all four games played live end to end on a fresh student with 0 loading-overlay sightings across 40 question transitions** (D8 prefetch), Game Over scoring, both save toasts truthful, and scores reaching both the database and the dashboard's Total Sessions; settings persist/rehydrate/sanitize across a reload; queue debounce and low-water and `endGame`'s idempotence each mutation-tested and each caught; the handoff's `GameDefinition` diffs **character-for-character** against `types.ts`. One non-blocking finding (**V1**): the integration deviation's `ngOnDestroy` "correction" is wrong -- there is **one**, not two, and the builder's original claim was right. **F1 fixed 2026-08-21 (`3377975`), still `built` pending re-verification -- see the builder's response at the end of this file.** Root cause was `@angular/build:unit-test`'s **`isolate: false`** default (one module registry shared by every spec a worker picks up, so the first spec to reach a module fixes its binding for all the rest) meeting Phase 5's new `game-definitions.ts` -> identification-game barrel -> `GameStaffComponent` -> `SheetMusicComponent` -> `opensheetmusicdisplay` import, which put **four non-mocking specs** into the race against the two that mock it. Proved with a probe, not inferred. Fix is one line of test config -- `"isolate": true` -- with both sheet-music specs left byte-identical and **no product code touched**; new deviation row below. **12 consecutive `npm run test:run` executions green**, 439/54 unchanged; `build`/`lint`/`format:check` still exit 0. **V1 corrected too**: deviation 5/17 is struck. **Re-verified 2026-08-20 and marked `done` — `F1 verified fixed: 8/8 deterministic`.** Eight consecutive serial `npm run test:run` executions, nothing else running, **all eight `exit 0` at 54 files / 439 tests** with zero failure lines in any log; `build`, `lint` and `format:check` each exit 0; `sheet-music-display.component.spec.ts` **5/5** and `assignment-play-page.component.spec.ts` **6/6** in isolation. The fix's entire scope across `155650f^..8758590` is four files — `angular.json` (+1 line, `"isolate": true`), `src/test-setup.ts` (+13 lines, comment only), and the two `.migration` docs — with `e2e/`, `.migration/baselines/`, `frontend-react/`, `package.json` and `package-lock.json` **all byte-identical**, exactly as the addendum claims and nothing more. The struck 5/17 row's grep truth re-confirmed. See the re-verification note at the end of this file. |
| 6     | Note game                  | built   | 2026-08-21 | `896c1a3..44664d8`, merged as `9b5bb74`; reconciliation `96ac329`, `d1a6f4e`, `be81f62` (this ledger entry's own commit closes the range) | The note game **composes** Phase 5's engine rather than forking one, and after the merge that is literal: `NoteGameService` owns the settings, the audio and the keyboard stream and forwards everything else to `GameStateService` -- the same machine the four identification games run on. Built in a parallel worktree beside Phase 5 off `10cfbfb`, so it shipped same-semantics stand-ins for the whole engine behind one `models/engine.models.ts`; **that seam is collapsed, not carried**. Deleted in favour of Phase 5's: `engine.models.ts`, `identification-game.engine.ts`, `question-queue.ts` + `note-queue.ts`, `game-timer.service.ts`, `save-game-on-end.service.ts`, `components/score-bar/`, `components/game-over-card/` -- 11 files, 4 of them specs. `GameMode`/`GameState` reconciled to Phase 5's **TS enums** (Phase 6's const-object-plus-union reads identically at every call site but is not interchangeable in a type position, and the barrel owns them); `note-staff` draws through Phase 5's `<app-game-staff>` rather than a second port of React's `NoteGameDisplay`, which is the hand-off the Phase 5 integration note wrote to this merge. **Measured on the merged branch, not taken from the handoff:** build/lint/test:run/format:check all exit 0 -- **517 tests in 60 files**, the union after the duplicate specs came out (439/54 and 510/58 on their own bases), and **3 consecutive serial `test:run` runs at 517/60 with zero failure lines**, so Phase 5's `isolate: true` determinism held across the merge. **Parity: the complete golden suite is green for the first time in the migration -- 43/43** on `:4300`, own server, cwd-verified, specs unmodified: `navigation` 21/21, `auth` 5/5, `friends-and-theme` 4/4, `classes` 4/4, **`games` 6/6** and **`settings` 3/3**. The three residuals Phase 5 handed over are closed and nothing regressed. Screenshots: `baselines.spec.ts` still aborts each pass at `/login` (its assertion is hard), so a soft-assertion sweep of the same spec reported all 80 -- **68 pass, 12 fail, and the 12 are `login`, `signup` and `google-callback` (which redirects to login) x 2 viewports x 2 themes**, i.e. the login/signup restyle residual Phase 3.1 recorded as 12, unchanged; every game route, `assignment-play`, `/note-game` and `/` are inside threshold. Live on the running app: the note game played to Game Over **by keyboard** (8/10) and **by clicking the pad** (4/10), each saving its score, and an instrumented `AudioBufferSourceNode.start()` fired **exactly once per correct answer** with one `AudioContext` and zero decode errors; both entries reached the database and the dashboard read **total sessions: 2**; a key-signature game still plays to Game Over, so the seam did not regress. **Audio decision: the Web Audio API, no dependency** -- see the deferred-decisions row and handoff §4; `use-sound` absent from `package.json`, no dependency added. **One defect Phase 6 found by driving the real app, and three the merge found**, all below. 18 Phase 6 deviations plus 6 integration deviations. `e2e/`, `.migration/baselines/`, `frontend-react/`, `package.json` and `package-lock.json` byte-identical across the whole range. See the Phase 6 integration note at the end of this file. **Not to be marked `done`** -- a verifier owns that. |
| 7     | Cutover                    | pending | —    | —       |       |

---

## Deferred decisions

Recorded here when made, so later phases and future readers can find them.

| Decision                           | Phase | Choice      | Rationale |
| ---------------------------------- | ----- | ----------- | --------- |
| Chart library (replaces recharts)  | 3     | `d3-shape@3.2.0` (curve only; marks hand-drawn in SVG) | Rejected `@swimlane/ngx-charts@25` and `ng2-charts@10` -- both pass R6 on the Angular range, but both peer `@angular/cdk`, which Phase 2 declined (its deviation 8). Weight: `d3-shape` 247 KB unpacked vs 2,292 KB and 6,235 KB. `d3-shape` declares **no peerDependencies at all**, so it cannot fail R6 on a future Angular bump -- unlike `lucide-angular` (D12) and `ngx-toastr` (D13), which already have. React's `<Line type="monotone">` *is* `curveMonotoneX` (recharts delegates to it), so the port is the same interpolation, not a lookalike. Cost, stated plainly: ~700 lines of chart code maintained in-repo. `phase-3-subfeature-6-handoff.md` §2. |
| Audio library (replaces use-sound) | 6     | Web Audio API (no dependency) | `howler@2.2.4` passes R6 -- MIT, **no `peerDependencies`** (so, like `d3-shape` above, it cannot fail R6 on a future Angular bump the way `lucide-angular` and `ngx-toastr` already have), no runtime dependencies, 318 KB unpacked -- and was still declined. React's actual use is one correct-answer sound from twelve preloaded mp3s at volume 0.5, and every feature howler adds over that (sprites, spatial audio, format fallbacks, HTML5 streaming, its own autoplay shim) is unused. Two packages, since `@types/howler` ships separately, for ~60 lines of `AudioBufferSourceNode` code. The only two behaviours that mattered survive: overlapping notes (each play gets a fresh source node) and eager preloading (the twelve files are fetched eagerly and decoded lazily, so no `AudioContext` is constructed before a user gesture). `use-sound` absent from `package.json`. `phase-6-handoff.md` §4. **Measured live at the merge**: one `AudioContext`, `AudioBufferSourceNode.start()` called exactly once per correct answer (8/8 and 4/4 in two games), zero decode errors. |

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
| 3.6 | ~~React's heatmap tooltip was a hover card on a div grid~~ / ~~A `<title>` element~~ | **Withdrawn by the consolidated verifier: this deviation does not exist.** Both halves of the row are false and the shipped code is a faithful port. | React's `ActivityHeatmap.tsx` is **not** a div grid -- it is `<div class="relative"><svg>…<rect>…</svg><div>(tooltip)</div></div>`, and Angular's `activity-heatmap.component.html` is the same shape. Angular renders **zero** `<title>` elements anywhere on `/dashboard` (React renders 4, in recharts); the heatmap tooltip is an absolutely-positioned `<div>` driven by `(mousemove)`, exactly as in React. Driven live against a seeded 10-entry account, both apps report **369 cells, 10 filled, an identical 1036x151.6 box and the identical tooltip string "1 game on Sun, Aug 16, 2026"**. So there is no behaviour change to record -- and, importantly, **no accessibility improvement either**: the cells are bare `<rect>`s under one `role="img"` `aria-label` in both apps. A later phase wanting them screen-reader-reachable still has that work to do. |
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
| 5 | Worktree rule: base on `feature/angular-migration` | The worktree came up on bare `main` (`b2a52b7`); the builder reset onto `10cfbfb` | The trap the packet warned about, and the third time it has bitten (3.4 and Phase 4 before it). `origin/feature/angular-migration` is *behind* the local branch and does not contain `10cfbfb`, so resetting onto the origin ref as literally instructed would have missed Phase 3's completion. **Integrator's note:** `10cfbfb` turned out to be a *sibling* of this branch's `f022dfd`, not an ancestor -- same message, same parent `5a83341`, one docs paragraph apart. That is what produced the merge's single conflict. |
| 5 | Packet: routes "via `identification-game.routes.ts`" | The four routes stay inlined in `app.routes.ts`; no such file | R5. Phase 1 declared them there and `app.routes.spec.ts` drives that table. A lazy child route file would buy nothing -- each page is one component, already lazily loaded. **This is why the merge had no route conflict at all.** |
| 5 | React: `fetchQuestion: (request) => Promise<T>` | `(request, music) => Observable<T>` | The Observable half is D5. The *argument* is forced: the queue calls this inside a `switchMap`, where `inject()` throws NG0203 -- Phase 1's `catchError` finding (verifier notes 1/1) in a new place. A definition is a module-level constant with no injector of its own. It also means a definition can be exercised with a stub and no TestBed. |
| 5 | `useIdentificationGame` owned the settings state | `GameStateService` does not; the page does | The page needs settings anyway for `toRequest`, `answerOptions` and `prompt`. Keeping them there is what lets the service stay **non-generic**, which is what makes it reusable by Phase 6 without a generic-DI cast. The hook owned them only because that is how hooks compose. |
| 5 | React's `endGame` had no re-entry guard | `endGame` is idempotent | React relied on the timer's ref-mirroring -- which the packet forbids porting -- plus the assumption that the questions-mode branch and the timer never both fire. One line makes save-exactly-once a property of the machine. Three specs pin it. |
| 5 | `useGameLifecycle`'s `endGameRef` | Not ported | It existed only to break a circular hook dependency. Two services and an `expired` observable have no cycle. |
| 5 | Phase 4 handoff §4: the game OSMD display is "Phase 6's input" | Built here, as `GameStaffComponent` | Phase 5's `QuestionBoard` needs it first. **Phase 6 must reuse it rather than port `features/note-game-display/` a second time** -- see the integration note below, which is addressed to Phase 6's integrator. |
| 5 | React's `QuestionDisplay` **removes** the staff container on a render error | It stays mounted and is hidden with `invisible` (visibility, not display) | React's version leaves its OSMD instance pointing at a detached div, so a game never recovers from one bad MusicXML until remount. Keeping the box also avoids the zero-width trap Phase 4 fixed (its F1). Error path only; no baseline photographs it. |
| 5 | React wrapped the board in `ComponentErrorBoundary` + `GameBoardFallback` | Not ported | Phase 2 §5 already recorded the decision: global `ErrorHandler`, coarser granularity accepted. |
| 5 | React's `useSaveGameOnEnd` invalidated three TanStack caches on success | No port | `rxResource` does not cache (D6), so the dashboard and the assignment list refetch on their next load. The policy working, not a dropped feature -- and `classes.spec.ts` test 4 is the assertion that it does. |
| 5 | Phase 3 left `defaultAssignmentConfig()` reading a copied `DEFAULTS` table | The four identification entries now read each definition's own `defaults` | `game-definitions.ts`'s own header asked Phase 5 to do this. `game-definitions.spec.ts` needed no change -- it asserts values, and the values are identical. **`NOTE_DEFAULTS` is the last copy left and is Phase 6's to reclaim.** |
| 5 | Nothing about jsdom's `matchMedia` | Stubbed in `src/test-setup.ts` | `BreakpointService` builds three media-query lists in its constructor, so **any** spec whose tree reaches a game board, the score bar or the nav bar threw on injection. Same class as the existing `ResizeObserver` stub. Every query reports `false`, which is `BreakpointService`'s own initial state. |
| 5 | `assignment-play-page.component.spec.ts` verified an empty backend | It now drains music-service requests before `verify()` | The host renders a real game, and a real game prefetches two questions. Draining them keeps `verify()` meaning "no stray *assignment* request". The unknown-game-type tests are untouched. |
| 5 | React's `SettingsControls` read `option.render` directly | The schema is normalised into view rows first | An optional `glyph?.kind` does not narrow in a `@switch`, and `@if (fifths; as f)` would **silently drop the natural key**, whose `fifths` is `0`. The normalisation is what makes the §5.7 glyph union safe in a template. |
| 5 | PLAN.md §4 draws the feature as `{components,games,settings,services,models}` | Plus `game.utils.ts` and `index.ts` at the feature root | Mirrors React's own `utils.ts` and `index.ts`, and adds no folder. |
| 5 (F1 fix) | Nothing about the unit-test runner's isolation | `"isolate": true` on the `test` target in `angular.json` | The builder defaults it to `false` "to align with the Karma/Jasmine experience", which gives every spec file in a worker **one shared module registry** — so a third-party module is evaluated once per worker and the first spec to reach it fixes the binding for all the rest. Phase 5's deviation 11 made `game-definitions.ts` import the identification-game barrel, which reaches `opensheetmusicdisplay`, so four non-mocking specs joined the two that mock it and the mock became a scheduling lottery (verifier F1). Isolation removes the race rather than winning it more often, and protects every future module-level mock. Costs ~3s on a ~6s suite. Test configuration only; no product code. `phase-5-handoff.md` §9 has the probe output and the two rejected alternatives. |
| 5 | React's `GameOverCard` took three `ReactNode` props | Three `<ng-content select="[…]">` slots -- `[gameOverSections]`, `[gameOverSummary]`, `[gameOverActions]` | Same three seams (React's `children` / `summaryExtras` / `actions`); the note game fills them in Phase 6. |
| 6 | Worktree rule: base on `feature/angular-migration` | The worktree came up on **bare `main` (`b2a52b7`)**; reset onto `10cfbfb` | The trap 3.4, Phase 4 and Phase 5 all hit. Recorded a **fourth** time because it is clearly systemic, not bad luck. Local `feature/angular-migration` (`10cfbfb`) was one commit *ahead* of `origin/feature/angular-migration` (`5a83341`), so resetting onto the origin ref as the prompt suggested would have silently dropped the "Phase 3 done" commit. |
| 6 | Packet: record the audio decision in `STATE.md`'s deferred-decisions table | Recorded in `phase-6-handoff.md` §4; `STATE.md` untouched by the phase | The orchestrator made `STATE.md` read-only for that phase. The row was written out verbatim in §4 and is now in the table above, with the merge's own live measurement appended. |
| 6 | Packet: shared constants are "imported from the identification-game barrel" | Imported from `models/engine.models.ts`, a local mirror | Phase 5 owned that barrel and was building it in parallel. Handoff §3.1 was the one-file redirect, and the merge took it -- see integration deviation 6/1. |
| 6 | React's `GameMode` / `GameState` are TS `enum`s | Const object + matching union type | Call sites read identically (`GameMode.Time`) and the value is the string the wire already carries, so `game_mode` needed no conversion. **Flagged in the handoff as the one seam symbol that is not structurally interchangeable**, and reconciled at the merge to Phase 5's enums -- integration deviation 6/1. |
| 6 | React's `endGame` could be called twice | The engine's `endGame` returns early once the game is over; `handleAnswer` ignores answers after game over | `onGameEnd` is what posts the score, so a second call posts a second entry. React relied on nothing calling it twice, and its `useGameTimer` carries a comment about a StrictMode double-invoke that **did** save duplicates once. Phase 5 had the first half; the merge carried the second half into `GameStateService` (`96ac329`) so it was not lost with the duplicate. |
| 6 | React's `utils.ts` exports `calculateNPM`; `types/index.ts` exports `ACCIDENTALS` | Neither ported | Dead code -- nothing in the React app imports either. Same call Phase 4 made for `isValidNote`/`isValidRhythm`. |
| 6 | React's `KeyboardBindingsEditor` declares its own `NATURAL_NOTES` | Imports the shared one; only `SHARP_NOTES` and `FLAT_NOTES` stay local | `frontend/CLAUDE.md` names `NATURAL_NOTES` as a constant that lives once. The two accidental rows exist nowhere else, so they stay. |
| 6 | React's `GameBoard`/`GameBoardLandscape` share a `useGameBoardCore` hook | Two components sharing `<app-note-staff>` | They cannot be one component with two `@if` branches: a template may project a given `<ng-content>` slot **once**, whichever arm it sits in. The shared core is now a component rather than a hook, which is a better home for it. |
| 6 | React's `NoteGameDisplay` set `EngravingRules` in its constructor | Set on the first successful load, then re-rendered | Phase 4's `<app-sheet-music>` creates the OSMD instance lazily inside `loadAndRender`, and engraving rules are not `IOSMDOptions`. Only the first question pays for the second render. **Superseded at the merge**: this is `GameStaffComponent`'s `prepare()` now, which does the same thing -- integration deviation 6/3. |
| 6 | React wrapped both boards in `ComponentErrorBoundary` + `GameBoardFallback` | Not ported | Phase 2 handoff §5 replaced boundaries with error signals. The failure the boundary actually guarded -- MusicXML that will not render -- is handled inside `<app-note-staff>` by the text fallback, which React's boundary never saw because `useQuestionLoader` swallowed the error itself. |
| 6 | React's `useNoteAudio` used `use-sound` | Web Audio API, no dependency | The deferred-decisions row above, and handoff §4. Two consequences worth knowing: **jsdom has no `AudioContext`**, so playback degrades to a no-op there rather than throwing (asserted, and it is why the game is testable without an audio fake); and **four answerable notes have no sample** -- `Cb`, `Fb`, `E#`, `B#` are on the pad but there are only twelve marimba files. React logged a warning and moved on; so does this, pinned in `note-audio.service.spec.ts` so nobody "fixes" it by accident. |
| 6 | React's `KeyboardBindingsEditor` used `document.addEventListener(..., { capture: true })` | A `fromEvent(document, "keydown", { capture: true })` stream under `takeUntilDestroyed` | The capture phase is load-bearing: `stopPropagation()` there is what lets Escape cancel a pending rebind without also closing the dialog. An Angular `(document:keydown)` host binding is bubble-phase and would fire *after* `<app-dialog>`'s. |
| 6 | Phase 2's `SelectComponent` takes no `className` | Added one, merged through `cn()` | React put `className` on the `<select>` element, and the note game's settings bar sizes its scale picker `w-28 h-9` -- which is in the captured baselines. A `class` on `<app-select>` reaches the wrapper, a different box. Additive; no existing caller changes. |
| 6 | React's desktop bar wraps the picker in `[&>div]:w-auto` | `[&>app-select]:w-auto` | The Angular wrapper *is* the `<app-select>` host element, not a nested `<div>`. Same rule, correct selector. |
| 6 | `src/test-setup.ts` shims only `ResizeObserver` | Added a `matchMedia` stub | jsdom has none and `BreakpointService` opens three in its constructor, so any spec rendering a component that reads a breakpoint died before rendering. Phase 5 needed the same thing (deviation 5/12) and wrote its own; the merge kept one -- integration deviation 6/5. |
| 6 | Packet: wire the note game into assignment mode | `NoteGamePageComponent` supports it; `AssignmentGameHostComponent` was left untouched | Both game shells land in that one file, so editing it in a parallel worktree guaranteed a conflict with Phase 5 over the same three lines. **Wired at the merge** (`be81f62`), which is where the snake_case defect below surfaced. |
| 6 | STATE.md's `isLoading()` rule (Phase 3.5 §7.1) | No `isLoading()` anywhere in this feature | `savedBindings.reload()` is called after saving new bindings, which is exactly the case the rule is about -- but no template reads that resource's loading state at all, so there was nothing to switch. Recorded so a verifier grepping for the pair does not think it was missed. **Still true after the merge**; the standing requirement is met. |
| 6 | React's `GameOverCard` interpolated `Score: {correct}/{total}` inline | Built in a `computed()` | **A defect found by driving the real app, not a style preference.** `e2e/support/app.ts`'s `correctCount()` reads the line with the anchored regex `/^Score: \d+\/\d+$/` and Playwright does not trim before matching a regex; JSX drops the whitespace around a newline, so React rendered exactly `"Score: 2/10"` while Angular rendered `" Score: 2/10 "` and the locator matched **0** elements with the number plainly on screen. Handoff §9.1. The general lesson, for Phase 7: any text an unmodified spec matches with an anchored regex must be a single interpolation or a single literal. Accessible names are unaffected -- name computation trims. |
| 6 (integration) | Handoff §3.1: replace `engine.models.ts`'s body with re-exports from Phase 5's barrel | The file is **deleted**; every note-game file imports from `@features/identification-game` directly | `frontend/CLAUDE.md`'s invariant names the barrel as the import site, and a surviving one-file shim would have been a second name for it that a later reader has to chase. Same outcome, one fewer file. `GameMode`/`GameState` reconciled to Phase 5's **TS enums**, which is the half the handoff flagged as not structurally interchangeable; every call site already read `GameMode.Time`, and the two places that took a string (`mapSavedSettings`, `mapNoteAssignmentConfig`) already cast. |
| 6 (integration) | Handoff §3.2: `QuestionQueue` is a plain class taking `Signal<TRequest \| null>` | Phase 5's `QuestionQueueService`, provided per board, taking `request` + a separate `enabled` gate | Both key on `JSON.stringify(request)`, so the invariant that only a payload-affecting setting resets the queue is unchanged and is still what `note-game-page.component.spec.ts` checks. `<app-note-staff>` now gates on `staff().isReady()` the way `QuestionBoardComponent` does, rather than its own `afterNextRender` flag. |
| 6 (integration) | Handoff §3.2: `note-staff` folds React's `NoteGameDisplay` in itself | It draws through Phase 5's `<app-game-staff>`; the OSMD options, engraving rules, recolour and `getBBox`→`viewBox` crop are deleted | The hand-off the Phase 5 integration note wrote to this merge, and the one Phase 5's deviation 7 predicted. `note-staff` keeps what is note-game-specific: the card chrome, the request mapping and the huge text fallback. **One behaviour changes as a consequence**: the error path no longer swaps the card out for the fallback but overlays it, because unmounting the staff would take the queue's readiness gate with it and wedge the game. That is Phase 5's deviation 8, arrived at independently. No baseline photographs the error path. |
| 6 (integration) | Handoff §3.2: `SaveGameOnEndService` adds a second, independent guard against a concurrent POST | Phase 5's `GameScoreSaverService` survives and has no such guard | It is root-provided and already handled `gameType: "note"`, and the guarantee it was doubling up on -- `endGame` is idempotent, so `onGameEnd` fires once per game -- is now structural on both halves (see the deviation above). `reset()` has no port either: the saver clears `saveError` when the next save starts, and the results screen that reads it is unmounted on Play Again. |
| 6 (integration) | Phases 5 and 6 each wrote a `matchMedia` stub in `src/test-setup.ts` | One survives -- HEAD's -- with the useful half of Phase 6's prose folded in | Not "keep both halves": they are the same stub written twice, and a second `??=` assignment would be dead code. Phase 5's `isolate: true` doc comment is untouched. |
| 6 (integration) | Phase 5 §9 named the `game-definitions.ts` import-depth cleanup and left it as "a standing invitation, not a defect" | Taken, and generalised to two note-game model modules | `game-definitions.ts` now imports `@features/identification-game/games`, and `note-game.models.ts` / `range.utils.ts` deep-import `game.utils.ts` and `models/game-state.models.ts`. The barrel re-exports `GameStaffComponent`, which reaches `opensheetmusicdisplay`; these four modules are pure data, and going through the barrel drags a 1 MB engraver into jsdom for a table of strings -- which is exactly what caused F1. The rule, stated once: **the barrel is the import site for anything that needs the feature's components or services; a pure-data module deep-imports the leaf it needs and says why in its header.** Nothing is redeclared either way, which is what the "shared constants live once" invariant is actually about. |
| 5 (integration) | ~~The handoff's hygiene sweep says "the only `ngOnDestroy` in `src/` is still `SheetMusicComponent`'s"~~ | ~~There are **two**: `SheetMusicComponent` and `ToastItemComponent`~~ **Struck: this deviation does not exist. The handoff's sweep was right — there is exactly one.** | **Corrected 2026-08-21 on the Phase 5 verifier's finding V1, and re-checked before striking.** `grep -rn "ngOnDestroy" src/` returns five hits and only **one** is an implementation: `sheet-music.component.ts:204`. The `toast-item.component.ts` hit is line 47 of a comment, and what it says is "no `ngOnDestroy`" — the integrator read a grep count instead of the lines. The other three hits are prose in `sheet-music.component.ts` explaining why its hook is legitimate. Kept as a struck row rather than deleted so the false claim is not re-derived from a raw grep. The half that still holds: Phase 5 itself added no `ngOnDestroy`, no stored `Subscription` and no `takeUntil(destroy$)`. |

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

### Verifier notes (Phase 3, consolidated, 2026-08-20) — Phase 3 is `done`

Every exit criterion in `phase-3.md` passes. Nothing below is taken from a
handoff or an integration note; all of it was run here, on this checkout, on
`:4200` (`/proc/302685/cwd` confirmed to be `frontend/`, per Phase 4's env
note), against the Go service on `:5001` and the Python service on `:8000`.
The working tree was clean before and after.

**Gates.** `npm run build` / `lint` / `test:run` / `format:check` all exit 0 —
**394 tests in 49 files**, the ledger's number exactly. The build emits no
warnings.

**TanStack.** `grep -ri "tanstack\|useQuery\|queryClient" src/` returns **9**
matches, up from the 5 the four-merge note recorded (3.5 added four). Checked
mechanically rather than by eye — each hit's own line was re-read and every
one begins `*`, `//` or `/*`: **zero non-comment hits.** The criterion passes;
the grep still cannot tell prose from code, and the standing advice to tighten
the pattern rather than edit the comments stands.

**Parity suite, unmodified — 33 / 34.** `navigation.spec.ts` **21/21**,
`auth.spec.ts` **5/5**, `friends-and-theme.spec.ts` **4/4**,
`classes.spec.ts` **3/4**, in one run. The single failure is test 4, and its
captured snapshot was read rather than assumed: it shows the nav, the "Back to
assignments" link, a level-1 heading reading **"Key Signature practice"** and
the sentence "This assignment is ready to play. The Key Signature game is not
available in this build yet." The route, the resource, the assignment lookup,
the game-type resolution and the handoff to `<app-assignment-game-host>` all
work; the timeout is on `getByRole("button", { name: "C" })`. **A missing
answer pad, not a plumbing error. Phase 5's.**

**Phase 5/6 specs, run only to attribute their failures.**
`settings.spec.ts` + `games.spec.ts`: **9 failed**. Every failure is at a game
screen — six waiting on `getByRole("button", { name: "Settings" })` or
`{ name: "notes" }` (the games' own settings controls), one on the music
staff. **Not one failure is at a CRUD screen**, so none is a Phase 3 finding.

**Live end-to-end, fresh throwaway accounts, driven through the UI.** Seven
flows, all green, **zero console and zero page errors across the whole run**:
teacher registers → creates "LiveClass-…" → the detail page shows its real
join code `M83F2N` (asserted against the code read back from the Go API, not
against a regex guess); student registers → joins with that code → sees the
class; the teacher's roster then shows **"Stan Studently — Joined Aug 20,
2026"** and the assignment; assignment play reaches the **"Key Signature
practice"** stub; the friends flow searches "Fran", adds Fran Friendly and the
panel shows her; `/profile` renders the student's real name, email and role and
`/account` its real email; `/dashboard` renders. One documented wrinkle: the
student's assignment list does not refresh in place after joining a class, so
the flow reloads — which is what `classes.spec.ts` does and what
`student-assignments-list.component.ts` documents. React was *worse* here
(TanStack cached it until the next page load); nothing to fix.

#### The recorded harness gap, closed: charts with real data

3.6 §5.3 recorded that **no screenshot in any phase had ever exercised a chart
that draws a line**, because every baseline student has zero games. Closed
here. Ten entries were POSTed through the real `POST /api/note-game/entry`
(honouring both DTO quirks — `correct_questions` > 0, `notes_per_minute` <=
127), then their `created_date` was spread across ten consecutive days
directly in Postgres. The API has no backdating path; `database/queries/
seeders.sql` carries `CreateNoteGameEntryWithDate` for exactly this reason, so
a direct write is the repo's own sanctioned mechanism. The same account was
then loaded on **both** apps.

**What is identical.** The line draws in both, from the same data, and the
geometry matches to the pixel: a **28-point path** whose `d` starts
`M40,…C76,…112,…148,…` in both, the same 972 px plot width at the same
`x=162`, the same ten `Aug 11 … Aug 20` tick labels, the same `avg 75.0`
reference line, the same monotone interpolation (`curveMonotoneX` *is* what
recharts' `type="monotone"` delegates to). The heatmap is indistinguishable —
**369 cells, 10 filled, 1036 x 151.6, identical tooltip text** — and its
tooltip appears on hover in both. Stats tiles reflect the entries.

**What differs, measured.**

| | React (recharts) | Angular | 
| - | ---------------- | ------- |
| Y ticks | `0 30 60 90 120` | `40 60 80 100 120` |
| Y domain | `[0,120]` (recharts anchors at 0) | `[40,120]` (`niceScale(42,118)`) |
| Drawn line height | **171 px** | **260 px** (1.52x) |
| Tooltip at the last point | flips left, 184 px wide, one line | does not flip, squeezed to 125 px, "Notes Per Minute" wraps onto three lines |

**Judgment, recorded honestly: cosmetic-acceptable, not must-fix — but with
the numbers, so nobody has to re-derive them.**

- **F1 is real and its recorded direction is backwards.** 3.6 predicted "In
  React the line touched the top and bottom of the plot box; here it floats
  inside a padded box." The opposite happens: recharts' default anchors the
  axis at **0**, `niceScale` does not, and the Angular line is therefore
  **taller**, not flatter. 3.6's instinct that this "would change every
  dashboard that has data" was right; its explanation was not. Corrected here.
- **F2 does not arise on the dashboard.** `PerformanceChart` passes no
  `yDomain`, so the fixed-domain tick divergence F2 describes has no live
  case; the tick difference above is purely F1's consequence. Both charts
  render exactly 5 ticks.
- **F3 is real** and slightly worse than recorded: the tooltip does not merely
  overhang, it re-wraps. It is **not** clipped by the viewport at 1280 (box
  right edge 1269 of 1280), so no information is lost — it is ugly, not
  broken.
- **Why not must-fix.** Every packet exit criterion passes with these present;
  the plan's own instrument carves chart interiors out of pixel parity
  (§1, "Dynamic-content carve-out"); the data, the marks, the x-scale, the
  reference line and the whole heatmap are faithful; and both renderings are
  valid readings of the same numbers. Failing a phase that met every stated
  criterion over an axis-anchoring choice would be the wrong call.
- **Handed forward.** F1 and F3 are the two things a side-by-side reviewer
  will notice at cutover. **Phase 7 should decide them deliberately** —
  anchoring the auto-domain at 0 for all-non-negative series is a one-line
  change to `yScale` in `tremolo-line-chart.component.ts:281-292` that would
  restore recharts' default exactly, and F3 is a clamp on `tooltipPosition`
  at `:471`. Note `tremolo-line-chart.component.spec.ts:154` **pins the
  current tick values**, so either change breaks that spec on purpose.
- **F5 still stands:** `performance-chart` has no spec. Not a Phase 3
  criterion; recorded so it is not lost.

#### The baseline judgment — accepted, and deliberately **not** re-captured

The question handed over was whether to re-baseline the four `dashboard-*`
shots now that Angular renders a real "Joined 20 Aug 2026" where React
photographs "Joined Invalid Date".

**The date is correct.** `GET /api/users/:id/general-info` returns
`"created_date":"Joined 20 Aug 2026"` — already formatted, already carrying
the word "Joined" — for an account created today, and
`user-profile-card.component.ts:59` renders that string verbatim. React's
`new Date(user.createdAt)` reads a field the Go service has never sent
(`DTOs/general_user_info_dto.go` serialises six fields, and `created_at` is
not one). So this is a React bug photographed into the baseline, and Angular
is right.

**But there is nothing to re-capture, because the baselines still pass.** All
four `dashboard-*` shots were captured here the way `baselines.spec.ts`
captures them and diffed against the committed PNGs:

| Shot | diff | ratio | vs 0.01 threshold |
| ---- | ---- | ----- | ----------------- |
| `dashboard-desktop-dark` | 581 px | 0.00038 | **PASS** |
| `dashboard-desktop-light` | 668 px | 0.00044 | **PASS** |
| `dashboard-mobile-dark` | 1,276 px | 0.00190 | **PASS** |
| `dashboard-mobile-light` | 1,596 px | 0.00238 | **PASS** |

Decomposed into connected regions (max-channel Δ > 20, 9x9 dilation), the join
date is one region — **95x22 at (371,172), 580-611 px** on desktop; at 390 px
it wraps and becomes the 228x36 / 144x22+65x20 regions at y≈320-355. The only
other regions anywhere in the four shots are the nav Moon (56 px, light only,
0 px in dark) and 1 px of noise.

**Decision: accept the improvement, change no baseline.** Re-capturing would
spend the migration's first sanctioned baseline update on a divergence the
harness already tolerates, and would replace a React-captured reference with an
Angular-captured one for the *whole* dashboard — including the chart empty
state and a throwaway account's identity — to fix a region that is not
failing. The conservative move is to leave all 80 baselines exactly as Phase 0
captured them and write the measurement down instead, which is what this table
is. **`.migration/baselines/` is byte-untouched across the entire Phase 3
range** (`git log 2dd1e3d~1..5a83341 -- frontend/e2e/
frontend/.migration/baselines/ frontend-react/` is empty).

#### Screenshot sweep — 32 of 40 Phase-3 shots inside threshold

All ten Phase-3 routes x 2 viewports x 2 themes, same seeding, same helpers,
same mask, same 0.01 threshold as `baselines.spec.ts`, but with a soft
assertion per route so one run reports all of them.

**Failing: 8, and all 8 are login and signup** — 17,433 / 17,414 px desktop
(ratio 0.02) and 13,537 / 13,518 px mobile (0.04) for login, 16,887 / 16,866
and 12,991 / 12,970 for signup. These reproduce **3.1's figures to the pixel**
and are deviation 3.1/9's residual: the brass CTA fill and the `font-display`
heading, two deliberate Phase-2 restyles newer than the baselines.

**Passing: 32** — `home`, `about`, `account`, `profile`, `classes`,
`class-detail`, `assignments`, `dashboard`, all four ways. Six of them were
region-decomposed rather than merely trusted, and **every region resolves to a
known**:

- **3.2's lucide glyph finding — confirmed three independent ways.** The nav
  Moon is one 23x23 region of **56 px, in light only, and exactly 0 px in
  dark** (where the Sun is drawn) on every route that has it —
  `(1140,20)` desktop, `(295,20)` mobile, identical position and size to the
  baseline. `lucideSchool` on Home is a 30x30 region of 76-78 px at
  `(131,1667)`; `lucideBrain` on About is 30x30 / ~150 px at `(233,995)`.
  Path data only; no box moved.
- **The seeded email**, on `account` (272x26, ~2,270 px) and `profile`
  (239x24, ~1,550 px). This is 3.3's Finding B — the baselines bake in one
  run's random address, which no later run reproduces. A harness limitation,
  not a port defect, and it stays well inside threshold; the mobile shots also
  came back at the baseline's exact dimensions (390x2046, 390x2402), so the
  two-line-wrap dimension mismatch 3.3 feared does not bite at this length.
- **`assignments-desktop-dark` differs by 1 pixel.** Essentially perfect.

**V1 is fixed.** The mobile theme toggle no longer shifts: it is now a single
56 px glyph-redraw region — the *same* signature as the desktop Moon, which
has no positional component at all — where V1 measured **190 px + 72 px** with
the toggle sitting 8 px right of its React position. What remains at mobile is
72 px in two 26x11 bands at `(341,20)` and `(341,33)`: the hamburger's
top and bottom edges antialiasing, which V1 itself characterised as the same
glyph at a sub-pixel offset (18x14 → 18x16, same 108 ink px). So: **no layout
shift anywhere in the nav at either viewport**, which is what "pixel-clean"
was supposed to mean. Stated precisely rather than as "0 px", because it is
not 0 px.

#### The `isLoading()` standing trap — accepted, with a corrected inventory

The 3.5 integration note swept the other slices and found **three**
contingent `isLoading()` sites. **There are five.** The two it missed are both
inside the classes feature, which the sweep treated as already-clean because
all five resources that *call* `.reload()` gate on `status() === "loading"`:

| # | Site | Gates | Reloaded today? |
| - | ---- | ----- | --------------- |
| 1 | `my-friends-view.component.html:49` | the friend list | no |
| 2 | `add-friend-view.component.html:42` | the search results | no |
| 3 | `dashboard-page.component.html:50` | the heatmap | no |
| 4 | **`assignment-play-page.component.html:1`** | **`<app-assignment-game-host>`** | no |
| 5 | `assignment-results-grid.component.html:11,14` | the results table + insight tiles | no |

**Decision: accept the risk, do not require a guard now** — but the rationale
is stronger than "nothing reloads them", and the inventory above is the part
that was missing.

- Sites 1-3 gate **leaf subtrees only**. `app-friend-card` and
  `app-activity-heatmap` own no `rxResource` (checked: neither appears in the
  15 `rxResource` call sites). So even with a `.reload()` added, the worst
  outcome there is a spinner flicker during refetch — not 3.5's defect, which
  was a *parent* tearing down *fetching children* and cancelling their
  requests.
- **Site 4 is the one that matters, and it is Phase 5's first file.**
  `assignment-play-page.component.html:1` gates the entire
  `<app-assignment-game-host>` subtree on `assignments.isLoading()`. That is
  exactly the shape 3.5 fixed, sitting in front of the component Phase 5 is
  about to fill with game state and fetches. It is safe today only because
  nothing reloads `assignments` — and "reload the assignment after an attempt
  is saved" is a natural thing for Phase 5 to add.

**So, as a requirement on Phases 5 and 6 rather than a fix for Phase 3:**
adding a `.reload()` to any of the five resources above obliges you to switch
that template to `status() === "loading"` in the same commit. If a builder
wants it pinned mechanically, the cheap version is a spec asserting those five
templates key on `status()`; nothing enforces it today. Recorded rather than
built, because the defect does not exist yet and inventing a guard for it is
not a verifier's change to make.

#### Policy checks

- **`rxResource` on every fetch-displaying page.** 15 call sites across 
  friends (`my-friends-view`, `add-friend-view`), dashboard, sheet-music,
  google-callback, `user.service`, `classes.service` and nine classes
  components. `account` and `profile` carry `rxResource` only in a *comment*
  saying they deliberately have none — which matches deviation 3.3/1 and is
  true: neither page fetches, and the live run confirms both render straight
  off `AuthStore`.
- **No caching or dedup.** `shareReplay` appears as code in exactly one file,
  `refresh.interceptor.ts` (D6's sanctioned request dedup); the two other hits
  are doc comments, one of which says there isn't one.
- **§5.6 hygiene, clean.** No `@NgModule`. No `zone.js` (`npm ls zone.js`
  empty). No stored `Subscription` field, no `.unsubscribe()`, no
  `takeUntil(destroy$)` — the only `takeUntil*` hits are `takeUntilDestroyed`,
  the sanctioned API, in `toast-item` and `clipboard.service`. The one real
  `ngOnDestroy` in `src/` is `SheetMusicComponent`'s, which §5.6 names as the
  legitimate non-RxJS case.
- **The two host-`display` conventions are disjoint — confirmed by
  enumeration, not assertion.** `:host { display: block }` in styles: **11**
  components, all in `features/classes` (3.5's). `host: { class: "block" }`:
  **8** — both charts, five dashboard components, and the kit's `select`
  (3.6's plus Phase 2's). `display: contents`: **15**, the kit parts, both
  dialogs, the friends views and both sheet-music components. **No component
  is claimed by two.** Both spellings stay load-bearing where they sit.

#### Deviation spot-checks (8, across five slices)

1. **3.3's four dead endpoints — all four re-probed live, not two.**
   `PATCH /api/users/:id` → **404**, `POST /api/users/:id/change-password` →
   **404**, `DELETE /api/users/:id` → **404**,
   `GET /api/users/:id/data-export` → **404**, with
   `GET /api/users/:id/general-info` → **200** as the control, all on a real
   token. Dropping the four methods was correct.
2. **3.5's unknown-game-type guard — mutation-tested.** Neutering
   `isKnownGameType` in `game-definitions.ts:73` fails **exactly 2 tests, one
   in each of its two specs**, and nothing else (13 still pass):
   `game-definitions.spec.ts` → "expected true to be false", and
   `assignment-play-page.component.spec.ts` →
   `expected ' Back to assignments   practice  This…' to contain 'Assignment
   not found'`. That second message *is* the bug the guard prevents — the
   heading rendering as a bare `" practice"`. Restored; `git diff` empty.
3. **3.2's lucide glyph finding — holds**, measured three ways above (Moon,
   School, Brain), plus the reveal-toggle eye that Phase 4's verifier cleared.
   Light-only, 0 px in dark, no box moved.
4. **3.4's friends-store disposition — holds.** `friends.store.ts` holds
   `isPanelOpen` and `searchQuery` and nothing else; the server data lives in
   `rxResource` on the two views. Exactly "both at once: no *new* store, and
   Phase 2's `FriendsUiStore` stays".
5. **3.6's legend-as-real-controls — holds.** The legend is
   `<ul>/<li>/<button [attr.aria-pressed]>`, not recharts' `<span>`s.
6. **3.6's two new accessible names — hold.** `ariaLabel="Chart interval"` on
   the interval select and `ariaLabel="Performance over time"` on the chart
   `<svg role="img">`. Names React does not have.
7. **3.6's heatmap-`<title>` row — does NOT hold. Withdrawn above**; it is the
   one deviation in the table that describes a change nobody made. The code is
   fine; the ledger was wrong.
8. **3.5's single-confirm-dialog roster — holds.** One `confirming` signal on
   `RosterListComponent` (`:69`), one dialog, no per-row component.

#### Notes for the next agent

- **Both backends stayed up throughout and nothing else was listening on
  `:4200`** — the serving process's `/proc/<pid>/cwd` was checked
  (`/home/noetrevino/projects/tremolo/frontend`, pid 302685) before any live
  measurement was believed, per Phase 4's env note. React was served on
  `:5173` from `frontend-react/` for the side-by-side comparison.

- **Correction, found after the fact: this verification did NOT have the
  machine to itself, and `:5173` no longer means what it means above.** The
  brief for this run said no other agents were active; two were. Both
  `.claude/worktrees/agent-a7cb8ece04aed9523` (serving `:4300`, running
  `--project=baselines`) and `.claude/worktrees/agent-abb9039f68e79fc92`
  (serving `:5173`, running `games`/`settings`) were live against the **same**
  Go service, Python service and Postgres. Two consequences, both recorded
  rather than hand-waved:

  1. **`:5173` is now an Angular worktree**, not React
     (`curl localhost:5173` returns Angular's `index.html`). It was React
     while the chart comparison ran, and that is provable from the captures
     rather than assumed: the `:5173` app rendered **"Joined Invalid Date"**
     and **"0 total sessions"** for an account the `:4200` app rendered as
     "Joined 20 Aug 2026" / "10"; its Y ticks were recharts' `0 30 60 90 120`
     against `niceScale`'s `40 60 80 100 120`; its legend text ran together as
     one recharts `<span>` run; it carried **4** `<title>` elements to
     Angular's 0; and its tooltip flipped at the right edge. Any one of those
     is decisive, and the two full-page PNGs differ. **A later agent
     re-running that comparison on `:5173` will silently get Angular on both
     sides — check `/proc/<pid>/cwd` first, every time.**
  2. **The parity numbers were measured on a shared database.**
     `playwright.config.ts` warns that the golden flows "assert on counts
     (attempts, friends, roster size) that concurrent runs would race on".
     The 33/34 above is therefore not a hermetic measurement. It is still
     believed, for a specific reason: every spec seeds its own users through
     `unique()` (timestamp + random) and asserts only on its own rows, and the
     run produced **zero unexplained failures** — the single failure was the
     documented Phase 5 boundary, whose page snapshot was read. A race would
     show up as a *novel* failure, not as the expected one. Anyone wanting a
     hermetic number should re-run with the machine quiet.
- **A stale scratch directory from an earlier agent's run was picked up by a
  glob** on the first sweep attempt and silently contributed extra results.
  If you point a Playwright `testDir` at a scratchpad, scope `testMatch` to
  your own file or you will read someone else's numbers as yours.
- **The seeded-history fixture is worth keeping.** The recipe is: register a
  student, POST 8-10 entries through `/api/note-game/entry`, then
  `update tremolo.note_game_entries set created_date = current_date -
  interval 'N day' where id = …`. It is the only way any instrument in this
  migration has ever seen a chart with a line in it, and Phases 5-7 will want
  it again.

---

### Integration note (Phase 5 — 2026-08-20) — merged, **not** verified

Merged as `ff67321` (`--no-ff`) from `worktree-agent-a7cb8ece04aed9523`,
range `fd84777..f5e9e6a`, 7 commits. Phase 5 is `built`. A verifier owns
`done`; nothing below is a verification.

#### The base was a sibling, not an ancestor

The worktree was built on `10cfbfb` and this branch was at `f022dfd`. Those
are **two different commits with the same message** (`docs(migration): mark
Phase 3 done after consolidated verification`), both children of `5a83341`,
differing only in that `f022dfd`'s `STATE.md` carries 36 more lines. Deviation
5/1 explains how it happened. Consequences, both benign:

- The merge base was `5a83341`, so the merge replayed Phase 3's completion
  docs from the other side. That is the **entire** source of the one conflict.
- Phase 5's gate numbers were measured against a tree whose only difference
  from `f022dfd` is prose in `STATE.md`, which is why they reproduce exactly
  rather than approximately.

#### The one conflict, and why "ours" lost nothing

`STATE.md`'s "Notes for the next agent", first bullet. Both sides edited the
`/proc/<pid>/cwd` paragraph; this branch's version is a **strict superset** —
it appends the after-the-fact correction that `:5173` is now an Angular
worktree rather than React, with the evidence for why the chart comparison
still stands. Phase 5's side is the same bullet before that correction was
written. Took ours. Phase 5 never authored a word in that paragraph, so
nothing of its own was dropped.

Everything else auto-merged. The two files both sides own *semantically* had
no textual overlap, and were read rather than trusted:

- **`assignment-game-host.component.ts`** — 3.5's stub replaced wholesale by
  Phase 5's four-branch `@switch`. The `@default` placeholder survives, and
  now covers exactly one game type: `"note"`. Replacing that one branch is
  all Phase 6 owes this file.
- **`game-definitions.ts`** — `defaultAssignmentConfig()` now reads each
  definition's own `defaults`; only `NOTE_DEFAULTS` is still a copy.

**The unknown-game-type guard 3.5 recovered survived**, which was the specific
risk in taking Phase 5's version of the host: `isKnownGameType` is still what
`playable()` gates on, and both its tests are green —
`game-definitions.spec.ts` "recognises every known game type and nothing else"
and `assignment-play-page.component.spec.ts` "shows not-found for a game type
this build does not know".

**No route conflict at all.** Phase 1 declared all 20 paths in
`app.routes.ts`; Phase 5 filled in the four page components behind four of
them and never touched the table (deviation 5/2). `app.routes.ts` is
byte-identical on both sides.

#### The `isLoading()` standing requirement — checked, and met

The requirement recorded above: *adding a `.reload()` to any of the five
listed resources obliges switching that template to `status() === "loading"`
in the same commit.* Site 4 —
`assignment-play-page.component.html:1`, called "Phase 5's first file" — was
the one at risk.

**Phase 5 added no `.reload()` anywhere.** Every `.reload()` in the merged
tree is a pre-existing classes-feature call from 3.5 (`class-assignments-list`
×2, `class-detail-page`, `classes-page`, `join-class-card`, `roster-list`);
`git diff` over the range adds none. And
`assignment-play-page.component.html` is **byte-identical to what Phase 3
wrote** — still `@if (assignments.isLoading())`, correctly so, because nothing
reloads `assignments`.

The handoff says the temptation ("reload the assignment after an attempt is
saved") was declined deliberately, since `rxResource` does not cache and
returning to `/assignments` refetches anyway. `classes.spec.ts` test 4 passing
is the evidence that declining it was right. **No finding.** The requirement
carries forward unchanged to Phase 6.

#### For the Phase 6 integrator: `GameStaffComponent` already exists

**Read this before merging Phase 6.** Phase 4's handoff §4 assigned the
game-configured OSMD display to Phase 6. **Phase 5 built it anyway**, as
`features/identification-game/components/game-staff/game-staff.component.ts`,
because `QuestionBoardComponent` needed it first (deviation 5/7). It is the
port of React's `features/note-game-display/` — both files — carrying
`compacttight`, zero margins, dark-mode recolour and `getBBox`→`viewBox`
centering. Inputs `zoom`, `padding`, `ariaLabel`; API `loadNote(xml)`,
`clear()`, `isReady`, `error`.

So at Phase 6's merge, **check for a second port of that React class.** If
Phase 6 built its own game staff — reasonably, since its packet told it to —
that is a duplicate to resolve in favour of the one already on this branch,
not a conflict to take both sides of. The same caution applies to the rest of
what Phase 5 left reusable and non-identification-specific:
`GameStateService` (non-generic on purpose), `GameTimerService`,
`GameScoreSaverService` (already handles `gameType: "note"`),
`QuestionQueueService`, `QuestionBoardComponent` (answer UI is
`<ng-content />`), `GameOverCardComponent`, `ScoreBarComponent`,
`GameModeLimitControlsComponent`. Shared constants — `TIME_LIMITS`,
`NOTE_LIMITS`, `NATURAL_NOTES`, `CLEF_UNICODE`, `CLEF_LABELS` — are exported
from `@features/identification-game` and **must not be redeclared**;
`frontend/CLAUDE.md` makes that an invariant, and a redeclaration will merge
cleanly and silently.

Phase 6 also owes this branch two things named in the handoff: the `@default`
branch of `assignment-game-host`, and `NOTE_DEFAULTS` in
`classes/models/game-definitions.ts`.

#### What was measured on the merged branch

Gates, `nvm use 24`, from `frontend/`:

| Gate | Result |
| ---- | ------ |
| `npm run build` | exit 0, no warnings |
| `npm run lint` | exit 0 (`--max-warnings 0`) |
| `npm run test:run` | exit 0 — **439 tests, 54 files** |
| `npm run format:check` | exit 0 |

439/54 reproduces the builder's number exactly; the union and the sum agree
here because Phase 5's base and this branch differ only in `STATE.md` prose.

E2E, specs unmodified, `E2E_BASE_URL=http://localhost:4300`, on a server this
integrator started from **this** checkout — `/proc/352435/cwd` read as
`/home/noetrevino/projects/tremolo/frontend` before any result was believed,
per the env note. `/tmp/tremolo-port-4300.lock` held for the run and released
after. Go on `:5001`, Python on `:8000`.

| Spec | Result | Residual |
| ---- | ------ | -------- |
| `classes.spec.ts` | **4 / 4** | — |
| `navigation.spec.ts` | 21 / 21 | — |
| `auth.spec.ts` | 5 / 5 | — |
| `friends-and-theme.spec.ts` | 4 / 4 | — |
| `games.spec.ts` | **4 / 6** | both the note game |
| `settings.spec.ts` | **2 / 3** | the note game |

**`classes.spec.ts` 4/4 held across the merge.** Test 4 was Phase 3's single
recorded residual, attributed to "a missing answer pad, not a plumbing error.
Phase 5's". It now plays the assignment's frozen key-signature game to Game
Over and records the attempt.

All three failures were re-attributed at the merge rather than taken on
faith:

- "plays the note game to game over" — fails in
  `useQuestionMode` (`e2e/support/app.ts:167`) on `/note-game`.
- "renders a staff on every game before the first answer" — its loop is
  `["/note-game", ...IDENTIFICATION_GAMES]`, so it fails on the **first**
  iteration and never reaches the four that work. The four are covered
  anyway by tests 1-4, which assert against
  `GET /api/note-game/recent` per `game_type` — i.e. the score really
  reached the database.
- "the note game remembers its scale" — `/note-game`.

**All Phase 6's.**

The builder's 20/20 screenshot sweep was **not** re-run here.
`baselines.spec.ts` cannot report it (its four passes abort at `/`, whose
redirect target is the note game), and reproducing it needs the scratch
harness the builder wrote and deleted. Carried over as a claim for the
verifier to settle — it is the one number in the Phase 5 row that this
integrator did not measure.

#### Hygiene

- `shareReplay` appears as **code** in one file, `refresh.interceptor.ts`
  (D6). The other hit is a comment in `user.service.ts` saying there is none.
- No `@NgModule`; `zone.js` appears only in `app.config.ts`'s comment
  explaining that it is not installed. No `takeUntil` that is not
  `takeUntilDestroyed`.
- Two `ngOnDestroy`s, not one — see deviation 5 (integration). Neither is
  Phase 5's.
- `e2e/`, `.migration/baselines/`, `frontend-react/`, `package.json` and
  `package-lock.json` are **byte-identical across the merge** (`git diff
  f022dfd -- <paths>` is empty). No dependency added; R6 not exercised.
- Phase 6's worktree (`agent-abb9039f68e79fc92`) and its `:5173` server
  (pid 344145) were not touched, and the server was confirmed still up
  afterwards.

---

### Verifier findings (Phase 5, 2026-08-20) — status held at `built`

Verified on the **integrated** branch at `56b657f`, in the main checkout, by
an agent that neither built nor integrated the phase. Every Exit criterion in
`phase-5.md` passes **except the last one**, and the phase is therefore not
marked `done`. Phase 5's builder owns the fix; the verifier does not fix.

#### F1 (blocking). `npm run test:run` is flaky — it fails about one run in four

The packet's Exit criterion is "build/lint/test exit 0", and CI runs the same
command. On this branch it does not reliably exit 0.

**Twelve consecutive full-suite runs on `56b657f`, nothing else running: 9
green, 3 red.** Every failure is identical — the same file, the same four
tests:

```
src/app/features/sheet-music/components/sheet-music-display/sheet-music-display.component.spec.ts
  × loads whenever musicXml changes
  × shows the skeleton while OSMD works, and hides the staff
  × shows the error panel, not a blank stave, when rendering fails
  × re-shows the staff when a later load succeeds
```

**It is Phase 5's.** The same twelve-run treatment on `f022dfd` — this
branch's commit immediately before the Phase 5 merge, same `node_modules`,
same Node — is **8 / 8 green**. The spec is Phase 4's and is untouched by
Phase 5's range.

**The mechanism is a mock leak, not a timing flake.** The spec hoists a
`FakeOsmd` and `vi.mock("opensheetmusicdisplay")`. In a failing run the mock
is never applied:

- `FakeOsmd.instances` is empty — `TypeError: Cannot read properties of
  undefined (reading 'loaded')` at the first assertion;
- the panel renders `"Failed to render sheet music given music sheet was
  incomplete or could not be loaded"`, which is the **real** OSMD's message.
  `FakeOsmd` throws `"Invalid MusicXML"`.

So the real `opensheetmusicdisplay` is being used where the mock should be.

**Scope of the repro.** The spec passes 5 / 5 in isolation, every time
(`npx ng test --include=…`). It also passes 6 / 6 when run with only the two
other specs that reach a real `SheetMusicComponent`
(`sheet-music.component.spec.ts` and
`assignment-play-page.component.spec.ts`), and 3 / 3 paired with the
play-page spec alone. It only misfires in the full 54-file suite, which
points at worker scheduling / shared module graph under
`@angular/build:unit-test` rather than at any one pair of files.

**Where to look.** Phase 5 is the first phase whose specs render a *live
game* inside another component's test — deviation 5/13 records exactly that
change to `assignment-play-page.component.spec.ts` ("the host renders a real
game, and a real game prefetches two questions"). That tree reaches
`GameStaffComponent` → `SheetMusicComponent` → the real
`opensheetmusicdisplay`. Phase 5 also added five spec files, which changes
how all 54 are distributed across workers. Either is enough to lose the
`vi.mock` race; pinning which is the builder's to do.

Not a product defect — the app itself is fine, and every live check below
passed. It is a **gate** defect: a suite that goes red on a quarter of its
runs cannot be the thing a phase is signed off on, and the next phase would
inherit it as noise.

#### Everything else passed

**Gates.** `build`, `lint` and `format:check` exit 0. `test:run` reports
**439 tests in 54 files** and passes 9 runs in 12 (F1).

**The screenshot sweep — the one number the integrator carried unverified —
re-measured here and it reproduces: 20 / 20.** A scratch harness outside
`e2e/` reproduced `baselines.spec.ts`'s `capture()` exactly (same
`staff(page)` mask, same `settle`, same `maxDiffPixelRatio: 0.01`, same
`.migration/baselines/` path, same seeding), with `updateSnapshots: "none"`
and soft assertions so one run reports every shot:

| Route | desktop light | desktop dark | mobile light | mobile dark |
| ----- | ------------- | ------------ | ------------ | ----------- |
| `key-signature-game` | pass | pass | pass | pass |
| `interval-game` | pass | pass | pass | pass |
| `scale-game` | pass | pass | pass | pass |
| `chord-game` | pass | pass | pass | pass |
| `assignment-play` | pass | pass | pass | pass |

The masked staff was additionally asserted **non-empty** on all 20 shots
(desktop 1084 × 68–87, mobile 306 × 68–74), so the mask is covering drawn
music rather than a blank box. The four `assignment-play` shots that Phase 3
recorded as failing against the deferred-game stub now pass against the same
untouched PNGs.

The harness was **negative-controlled** before it was believed: pointing the
`chord-game` shot at `home-desktop-light.png` instead produced
`389475 pixels (ratio 0.14) are different`, so a pass really is a comparison.
The 24 game/assignment baselines were checksummed before and after and are
**byte-identical**; `git status` over `.migration/baselines/` is empty. The
scratch directory was deleted.

**E2E, specs unmodified**, `E2E_BASE_URL=http://localhost:4300`, on a server
this verifier started from this checkout (`/proc/365847/cwd` read as
`/home/noetrevino/projects/tremolo/frontend` before anything was believed).
`/tmp/tremolo-port-4300.lock` held for the run and released after.

| Spec | Result |
| ---- | ------ |
| `classes.spec.ts` | **4 / 4** |
| `navigation.spec.ts` | 21 / 21 |
| `auth.spec.ts` | 5 / 5 |
| `friends-and-theme.spec.ts` | 4 / 4 |
| `games.spec.ts` | **4 / 6** |
| `settings.spec.ts` | **2 / 3** |

Golden three **30 / 30**, `classes` **4 / 4** — every claimed number
reproduced. All three residuals are the note game, attribution confirmed by
**reading the failure snapshot**, not by taking the label: the
`renders a staff on every game` context shows a page whose entire body is
`heading "Note Game"` — Phase 1's stub, the loop's first iteration, so the
four identification games are never reached. The other two fail in
`useQuestionMode` at `e2e/support/app.ts:167` on `/note-game`. **Phase 6's.**

*A caution for the next verifier:* a first pass of this suite showed
`games.spec.ts` at 2 / 6, with the key-signature and interval games failing
to reach Game Over. That was **CPU contention** — this verifier was running
`ng test` concurrently — and not a real failure. A clean re-run with nothing
else running gave 4 / 6. The golden flows answer on a 1200 ms clock and wait
20 s for Game Over; do not run them next to a build.

**All four games played live end to end**, one fresh student, own scratch
harness, against Go on `:5001` and Python on `:8000`:

| Game | Fetch gaps | Game Over | Save toast | DB entries | Dashboard Total Sessions |
| ---- | ---------- | --------- | ---------- | ---------- | ------------------------ |
| key signature | 0 / 10 | Score 0/10 | **failure** (truthful) | 0 → 0 | 0 → 0 |
| interval | 0 / 10 | Score 1/10 | success | 0 → 1 | 0 → 1 |
| scale | 0 / 10 | Score 10/10 | success | 0 → 1 | 1 → 2 |
| chord | 0 / 10 | Score 1/10 | success | 0 → 1 | 2 → 3 |

- **"No visible fetch gap" was measured, not eyeballed.** After every answer
  the board was polled for its `Loading sheet music...` overlay — which is
  bound to the queue's `isInitializing` — across the whole 1200 ms
  inter-answer interval. **Zero sightings in 40 question transitions.** D8 is
  doing its job.
- **Both save-outcome toasts behaved**, and both truthfully. The key-signature
  run happened to score 0/10, the Go DTO's `required` on `correct_questions`
  rejects a zero, and the app said so and persisted nothing — DB and dashboard
  both stayed put. The other three scored ≥ 1, got the success toast, and
  each added exactly one row *and* one dashboard session.
- The scale game was played with its schema narrowed to a single scale type
  and scored **10 / 10**, which is only possible if the settings change
  really reached `answerOptions` and `getAnswer`.

**Settings persist, rehydrate and sanitize.** After the narrowed scale game,
a reload of `/scale-game` came back with mode `Questions`, limit `10`, and
`Major` selected with the three minors not — through the Go `game_settings`
JSONB round-trip and `sanitizeConfig`. `sanitize-config.spec.ts` is 5 / 5 and
is a **verbatim** port: all five React case names match
`frontend-react/…/sanitizeConfig.test.ts` one for one.
`settings.spec.ts`'s "an identification game remembers mode and limit" also
passes.

**Queue invariants — inspected, then mutation-tested.**
`question-queue.service.spec.ts` is 9 / 9. Reading the code:
`connect()` keys on `JSON.stringify(request)` (line 129) with
`distinctUntilChanged` on that key; `QUEUE_LOW_WATER = 2`,
`HYDRATE_BATCH = 2`, `RESET_DEBOUNCE_MS = 300`; the first emission is exempt
from the debounce via `switchMap((v, index) => index === 0 ? …)`;
`exhaustMap` is the in-flight guard; `forkJoin` + per-call `catchError` keeps
partial failures non-fatal. Two mutations, each caught:

| Mutation | Test that failed |
| -------- | ---------------- |
| `RESET_DEBOUNCE_MS` 300 → 0 | "debounces a burst of payload changes into one reset" |
| `QUEUE_LOW_WATER` 2 → 0 | "refills when a pop drops the buffer below the low-water mark" |

The non-payload invariant is pinned by "does not reset when a setting leaves
the payload unchanged", and it holds end to end: **none** of the four
definitions' `toRequest` reads `gameMode`, `timeLimit` or `noteLimit`.

**Save-exactly-once — three files, and mutation-tested.**
`game-state.service.spec.ts`, `game-timer.service.spec.ts` and
`game-score-saver.service.spec.ts` are **31 / 31** together. Removing
`endGame`'s one-line guard (`if (this._state() === GameState.GameOver)
return;`) failed two tests — "ignores a second endGame, so the score saves
once" and "ignores a timer expiry that lands on the last answer". Restored;
`git diff` empty after every mutation.

**The `GameDefinition` contract is an exact match.** The handoff §2 code
block was diffed mechanically against
`models/game-definition.models.ts` — `GameDefinition` and `defineGame`,
comments included — and is character-for-character identical. Phase 6 can
merge against it. All four definitions are `.ts`, `keySignature` included;
the only `ReactNode`/`.tsx` hits under the feature are prose in comments
naming the React files they replaced. Shared constants are declared exactly
once each (`TIME_LIMITS`/`NOTE_LIMITS` in `models/game-state.models.ts`,
`NATURAL_NOTES` in `game.utils.ts`, `CLEF_UNICODE`/`CLEF_LABELS` in
`clef-glyph.component.ts`) and re-exported from the barrel.

**Deviations spot-checked (5 of 17).**

- **5/7, `GameStaffComponent`** — exists at
  `components/game-staff/game-staff.component.ts`, documents itself as the
  port of `frontend-react/src/features/note-game-display/` (both files), and
  says in so many words that Phase 6 should reuse it. **No second port
  exists**; `src/app/features/note-game/` is still Phase 1's stub page plus
  two `.gitkeep`s. It imports `opensheetmusicdisplay` **types only** and
  wraps Phase 4's `<app-sheet-music>`, so it is not itself a new runtime
  importer of OSMD. Confirmed.
- **5/4, non-generic `GameStateService`** — `GameStateConfig.settings` is
  `Signal<BaseGameSettings>` and the doc comment states the rationale the
  deviation gives (only `gameMode` and the two limits are read; anything
  game-specific arrives via `statsExtras`). The class carries no type
  parameter. Confirmed, and it is what makes it reusable by Phase 6 without
  a generic-DI cast.
- **5/2, routes** — there is no `identification-game.routes.ts`; the four
  paths are inlined in `app.routes.ts` with lazy imports of the four page
  components. Confirmed.
- **5/14, glyph normalisation** — `settings-controls.component.ts` normalises
  each option to `glyph: option.glyph ?? { kind: "text" }` and the template
  `@switch`es on `option.glyph.kind`, binding `[fifths]` directly. The
  deviation's stated hazard is real and avoided: `ALL_KEY_SIGNATURES` is
  `-7…+7`, so the natural key's `fifths` is **0**, and an `@if (fifths; as
  f)` would have dropped it silently. Confirmed.
- **5/17 (integration), the `ngOnDestroy` count — this correction is
  itself wrong.** The integration deviation says "There are **two**:
  `SheetMusicComponent` and `ToastItemComponent`". There is **one**.
  `grep -rn "ngOnDestroy()" src/` and `grep -rn "implements.*OnDestroy" src/`
  both return `sheet-music.component.ts` and nothing else.
  `toast-item.component.ts` has no such hook — the grep hit is its doc
  comment, which says *"no stored handles, no `ngOnDestroy`"*. So the
  **builder's original hygiene claim was correct** and the integrator's
  "correction" matched prose. Non-blocking, but the deviation row should not
  be left standing as a fact a later phase reasons from. Recorded as **V1**.

**Hygiene.** `shareReplay` appears as code in exactly one file,
`refresh.interceptor.ts` (D6); the only other hit is a comment in
`user.service.ts` saying there is none. No `@NgModule`; `zone.js` only in
`app.config.ts`'s comment. No `takeUntil` that is not `takeUntilDestroyed`,
no stored `Subscription`, no `.unsubscribe()`, no `destroy$`. **No dependency
added.** `git diff f022dfd..56b657f` over `e2e/`, `.migration/baselines/`,
`frontend-react/`, `package.json` and `package-lock.json` is **empty**, and
so is `git status` over them.

#### V1 (non-blocking) — the `ngOnDestroy` count in deviation 5/17

As above: one, not two, and the builder's sweep was right. Worth correcting
in place so no later phase "fixes" `ToastItemComponent`, which is fine.

#### What Phase 5 owes before it can be `done`

Exactly one thing: **make `npm run test:run` deterministic** (F1). Nothing
else in the packet is outstanding — the games play, the settings round-trip,
the scores land, the screenshots match, the contract is exact, and the E2E
residuals are all Phase 6's.

#### Environment notes from this run

- Ports: `:4300` used, `/tmp/tremolo-port-4300.lock` held and released.
  `/tmp/tremolo-port-4200.lock` was already held by someone else and was
  never taken; nothing was listening on `:4200`.
- Phase 6's worktree `agent-abb9039f68e79fc92` was **not touched**. Its
  `:5173` server (pid 344145) was **already gone** when this verifier looked
  — nothing here ever addressed `:5173`, and this verifier started and
  stopped only its own `:4300` server (pid 365847).
- A throwaway git worktree at `f022dfd` was used for the pre-Phase-5 control
  runs (with `node_modules` symlinked) and removed afterwards;
  `git worktree list` is back to the main checkout plus Phase 6's.

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

#### Builder's response to the Phase 5 verifier (2026-08-21)

Both findings are addressed. The phase **stays at `built`** for a verifier to
re-check; the builder does not mark it `done`.

**F1 fixed — and the flake was reproduced before it was touched.** Twelve
serial `npm run test:run` executions at `155650f`: **9 green, 3 red**, every
failure the same four tests. The verifier's number, reproduced exactly.

*Root cause, established by probe rather than by inference.*
`@angular/build:unit-test` runs vitest with **`isolate: false`** — its own
default, stated in `runners/vitest/plugins.js` as "to align with the
Karma/Jasmine experience". Under it every spec file a worker picks up shares
**one module registry**, so a module is evaluated once per *worker* and
whichever spec reaches it first fixes the binding for every spec after it;
a `vi.mock()` in a spec that is not first silently does nothing.

Phase 5 supplied the second half. Deviation 11 added
`import { GAME_DEFINITIONS } from "@features/identification-game"` to
`features/classes/models/game-definitions.ts`, and that barrel re-exports
`GameStaffComponent` → `SheetMusicComponent` → `opensheetmusicdisplay`. At
`f022dfd` the only specs whose graphs reached the library were the **two
that mock it**; after the merge there are **six** — the four newcomers are
`game-definitions.spec.ts`, `assignment-play-page.component.spec.ts`,
`class-detail-page.component.spec.ts` and
`create-assignment-dialog.component.spec.ts`, none of which mocks anything.
Whether the display spec's fake was used became a scheduling lottery. A
temporary probe recorded the `.name` of the `OpenSheetMusicDisplay` binding
at each evaluation of `sheet-music.component.ts`: the array was **length 1
in every run** (one evaluation per worker, as predicted) and held `"w"` —
the minified real class — in exactly the red runs and the display spec's own
fake in exactly the green ones. Probe reverted.

*The verifier's first suggested direction cannot work, and that is worth
recording:* stubbing `SheetMusicComponent`/`GameStaffComponent` in the play
page's TestBed replaces a component in a **template**, long after the spec's
import graph has been evaluated — the real library is loaded either way, and
three other specs would still load it. A second attempt, one shared fake and
`vi.mock` hoisted into `src/test-setup.ts`, was built and measured **still
red**: setup files are modules too, so under `isolate: false` the setup body
runs once per worker (the probe printed `setup run #1` fifteen times and
never `#2`) and its registration is live for that worker's first spec only.
Reverted.

*The fix is one line of test configuration:* `"isolate": true` on the `test`
target in `angular.json` — the builder's own supported option for exactly
this. Each spec file then gets its own module registry, so a spec's
`vi.mock()` always applies before its imports evaluate: the race is removed,
not won more often. **Both sheet-music specs are byte-identical**; the fix is
deliberately not spread across six spec files that would have to keep
agreeing forever. `angular.json` cannot hold a comment, so the reasoning
lives at the top of `src/test-setup.ts` with a pointer to the handoff. New
deviation row above. **No product code, no `e2e/`, no baselines, no
`package.json`.**

*Proof.* **Twelve consecutive `npm run test:run` executions, serially, with
nothing else running: 12 green in 12**, `54 files / 439 tests` every time
(three further runs re-run capturing `npm`'s own exit status: `0`, `0`, `0`).
`sheet-music-display.component.spec.ts` in isolation **5/5 three times**;
`assignment-play-page.component.spec.ts` **6/6 three times**. `build`, `lint`
and `format:check` all exit 0. Test count unchanged — the fix adds no test
and deletes none. Cost: ~6s → ~9s wall clock, and an isolated run emits
**zero** `stderr` blocks where a red run emitted real-OSMD XHR failures and
`NG0953`. No E2E run: this touches nothing the browser sees.

*Not taken, and left for Phase 6 to weigh:* `game-definitions.ts` needs
`GAME_DEFINITIONS`, not `GameStaffComponent`. Deep-importing
`@features/identification-game/games` would stop four specs pulling a 1 MB
music engraver into jsdom at all — a real cleanup, but product code, and it
narrows the blast radius rather than removing the hazard.

**V1 corrected.** Deviation 5/17 is struck above, crediting the verifier.
Re-checked before striking: `grep -rn "ngOnDestroy" src/` returns five hits
and exactly **one** is an implementation (`sheet-music.component.ts:204`);
the `toast-item.component.ts` hit is line 47 of a comment whose text is "no
`ngOnDestroy`", and the remaining three are prose in `sheet-music.component.ts`.
One, not two — the builder's original sweep was right.

`phase-5-handoff.md` §9 carries the same account with the probe output.

#### Re-verification (2026-08-20) — Phase 5 is `done`

F1 is fixed. Everything else in Phase 5 was already fully verified at
`56b657f` (the findings above), so this pass confirms the fix, checks that
the fix is *only* the fix, and closes the phase. Nothing below is taken from
the handoff or the builder's response; all of it was run on `5e2e17d`, from a
clean tree, on Node v24.19.0.

**Determinism — the one thing Phase 5 owed. Eight consecutive serial
`npm run test:run` executions, nothing else running** (no concurrent build —
CPU contention is a documented false-failure source here):

| Run | Exit | Result | Run | Exit | Result |
| --- | ---- | ------ | --- | ---- | ------ |
| 1 | 0 | 54 files / 439 tests passed | 5 | 0 | 54 / 439 passed |
| 2 | 0 | 54 files / 439 tests passed | 6 | 0 | 54 / 439 passed |
| 3 | 0 | 54 files / 439 tests passed | 7 | 0 | 54 / 439 passed |
| 4 | 0 | 54 files / 439 tests passed | 8 | 0 | 54 / 439 passed |

**8 green in 8**, `npm`'s own exit status captured per run (not a pipeline's),
and every log searched for `FAIL`/`failed` — **zero hits in all eight**. The
verifier's original measurement at `155650f` was 9 green in 12 on the same
machine, so the change in behaviour is real and not a lucky window. Test
count is unchanged at 439 in 54 files: the fix adds no test and deletes none.

Both specs implicated in F1, run in isolation:
`sheet-music-display.component.spec.ts` **5 / 5**,
`assignment-play-page.component.spec.ts` **6 / 6** — each `exit 0`.

**Gates.** `npm run build`, `npm run lint` and `npm run format:check` each
exit 0. `git status` is empty before and after the whole run.

**The fix is what the addendum says it is, and nothing more.**
`git diff --name-only 155650f^..8758590` returns exactly four files:

| File | Change |
| ---- | ------ |
| `frontend/angular.json` | **+1 line**: `"isolate": true` in the `test` target's options |
| `frontend/src/test-setup.ts` | **+13 lines**, all inside the file's leading doc comment |
| `frontend/.migration/STATE.md` | docs |
| `frontend/.migration/phase-5-handoff.md` | docs (§9 addendum) |

`git diff 155650f^..8758590 -- frontend/e2e/ frontend/.migration/baselines/
frontend-react/ frontend/package.json frontend/package-lock.json` is
**empty**. **No product code, no spec file, no E2E, no baseline, no
dependency was touched** — which is also why the prior verifier's live
results (20/20 screenshots, `classes` 4/4, golden three 30/30, four games
played end to end) stand without re-running.

**The root cause is honestly recorded.** `angular.json`'s `test` target does
carry `"isolate": true`. The addendum's probe is described as what it was —
a temporary instrument that recorded the `.name` of the
`OpenSheetMusicDisplay` binding at each evaluation of
`sheet-music.component.ts`, printed a **length-1 array in every one of six
runs** (one evaluation per worker, as the shared-registry explanation
predicts) holding the minified real class `"w"` in exactly the red runs and
`FakeOsmd2` in exactly the green ones. That is a measurement that
discriminates between the hypothesis and its negation, not a restatement of
it; and the probe is not in the tree. The addendum also records the two
rejected candidate fixes *with the measurement that rejected them* (the
`test-setup.ts` hoist was built and came back `1 failed | 53 passed`), and
names the deeper cleanup it deliberately did not take —
`game-definitions.ts` deep-importing `@features/identification-game/games`
so four specs stop pulling a 1 MB engraver into jsdom. **That is Phase 6's
to weigh, and it is left as a standing invitation, not a defect.**

**V1's strike holds.** `grep -rn "ngOnDestroy" src/` returns **five** hits
and exactly **one** is an implementation —
`features/sheet-music/components/sheet-music/sheet-music.component.ts:204`.
Three more are prose in that same file explaining why its hook is
legitimate, and the fifth is `core/components/toast/toast-item.component.ts:47`,
a comment whose text is *"no `ngOnDestroy`"*. Deviation 5/17 is struck in
place above rather than deleted, so the false claim cannot be re-derived
from a raw grep count. Confirmed.

**Note on the fix's commit shape** (not a finding): the fix landed as **two**
commits, not one — `3377975` carries the code (`angular.json` +
`test-setup.ts`) and `8758590` carries the docs. That is this repo's commit
style working as intended; the ledger's `Commits` column now names both.

Phase 5 is **`done`**. Phase 6 (note game) is next, and inherits three things
from this phase deliberately: `GameStaffComponent` to reuse rather than
re-port, `NOTE_DEFAULTS` as the last copied defaults table to reclaim, and
the `game-definitions.ts` import-depth cleanup described above.

---

### Integration note (Phase 6 — 2026-08-21) — merged, **not** verified

Merged as `9b5bb74` (`--no-ff`) from `worktree-agent-abb9039f68e79fc92`,
range `896c1a3..44664d8`, 8 commits, plus three reconciliation commits.
Phase 6 is `built`. A verifier owns `done`; nothing below is a verification.

This was the most semantic merge of the migration: Phase 6 was built beside
Phase 5 and could not see it, so it shipped a working copy of the whole
engine. Git merged all of it cleanly — the duplicates live in a different
folder — which is precisely why the map in `phase-6-handoff.md` §3 mattered
more than the conflict list.

#### The two textual conflicts, and what the merge actually had to do

`git merge` reported exactly two: `src/test-setup.ts` (the same `matchMedia`
stub written twice) and `shared/services/music.service.ts` (two phases adding
endpoints to one import list and one class). Both are integration deviations
above; neither took five minutes.

Everything the merge really had to reconcile, git could not see. Eleven files
were deleted in favour of Phase 5's, four of them specs:

| Phase 6's | Replaced by | Note |
| --------- | ----------- | ---- |
| `models/engine.models.ts` | `@features/identification-game` | The seam file. Deleted rather than collapsed to a re-export — deviation 6/1. |
| `services/identification-game.engine.{ts,spec.ts}` | `GameStateService` | The settings move out of the engine into `NoteGameService`, which is what keeps the service non-generic (Phase 5's deviation 4). `scale` still reaches the stats through `statsExtras`. |
| `services/question-queue.{ts,spec.ts}`, `services/note-queue.ts` | `QuestionQueueService` | Both key on the serialized request. |
| `services/game-timer.service.{ts,spec.ts}` | `GameTimerService` | Method names differ (`start`/`reset`/`format`/`remaining`); behaviour does not. |
| `services/save-game-on-end.service.{ts,spec.ts}` | `GameScoreSaverService` | Root-provided, already handled `gameType: "note"`. |
| `components/score-bar/` | `ScoreBarComponent` | Identical API. |
| `components/game-over-card/` | `GameOverCardComponent` | Projection slots renamed at the two call sites. |

**The composition invariant is intact, and is now literal.**
`frontend/CLAUDE.md`: *"the note game composes the engine: `useNoteGame`
delegates to `useIdentificationGame`."* Before the merge that was true of a
copy; after it, the note game runs the same `GameStateService` the four
identification games run.

#### The enum risk was real, and cost one word per call site

Phase 6 shipped `GameMode`/`GameState` as a frozen object plus a union type;
Phase 5 shipped TS `enum`s. Those are **not** interchangeable in a type
position, which the handoff flagged. Reconciled to Phase 5's enums — the
barrel owns them, `sanitizeConfig` and four game definitions already depend on
them, and every Phase 6 call site already read `GameMode.Time`. The only two
places that took a raw string (`mapSavedSettings` and the new
`mapNoteAssignmentConfig`) already cast. `tsc` found nothing to fix.

#### Three fixes carried into the surviving engine before the duplicates died

`96ac329`. Each was in a Phase 6 file being deleted, so each had to move first
or be lost.

1. **`GameOverCardComponent`'s `Score:` line.** Phase 6's copy carried the
   §9.1 fix; Phase 5's did not, and rendered the line as a template
   interpolation that Prettier happened to have kept on one line. That is not
   a fix, it is luck: the same line one character longer wraps, gains a
   leading and trailing space, and `e2e/support/app.ts`'s anchored
   `/^Score: \d+\/\d+$/` matches nothing. The `computed()` moved across.
   **Proof it survived**: `games.spec.ts` is 6/6, which reads that line for
   all five games, and a key-signature game driven by hand reports
   `"Score: 0/10"` off the same locator.
2. **The post-game-over answer guard.** Phase 6's engine dropped a guess
   arriving after `GameOver`; Phase 5's did not. Moved into
   `GameStateService.answer()` with a test.
3. **`QuestionQueueService` clears its buffer on the payload change, not on
   the debounce.** Found because Phase 6's queue spec asserted it and Phase
   5's queue failed the assertion. React's own comment on that line says why:
   *"the queue is already cleared above, so no stale question can be served in
   the meantime."* Phase 5 deferred the clear until the 300ms debounce fired,
   which left a window in which `pop()` still handed out a question generated
   for the settings the player had just changed. **This is a parity defect in
   Phase 5's engine that the merge found, and it affected all four
   identification games.**

#### The defect wiring the assignment host surfaced

`AssignmentGameHostComponent`'s `@default` branch became `@case ("note")`,
which is the three lines Phase 6 predicted. Doing it exposed something the
seam had hidden: **the note game's assignment `config` is snake_case and its
hydration read camelCase.** A teacher's frozen assignment would have loaded as
the plain defaults, silently, with no error anywhere.

React needed one mapper because *its* saved settings also came off the wire
snake_case. Phase 3's `UserService` maps that row at the API boundary, so this
port needs two: `toNoteAssignmentConfig` (write) and `mapNoteAssignmentConfig`
(read, with React's per-field guards). `note-game.models.spec.ts` round-trips
them against what `defaultAssignmentConfig("note")` actually freezes, which is
the assertion that keeps the two in step.

That constant is also the `NOTE_DEFAULTS` reclaim: `defaultAssignmentConfig`
now reads `NOTE_GAME_DEFAULTS`, the same constant the note game's own page
starts from. **No defaults table is duplicated anywhere in the app any more.**

#### The import-depth cleanup Phase 5 left open — taken

`game-definitions.ts` imports `@features/identification-game/games`, and
`note-game.models.ts` / `range.utils.ts` deep-import `game.utils.ts` and
`models/game-state.models.ts`. Integration deviation 6/6 states the rule. It
is small — four import lines — and it is the difference between four class
specs loading `opensheetmusicdisplay` and not. It narrows the blast radius
that caused F1; `isolate: true` is still what removes the hazard, and is
untouched.

#### What was measured on the merged branch

Gates, `nvm use 24`, from `frontend/`:

| Gate | Result |
| ---- | ------ |
| `npm run build` | exit 0, no warnings |
| `npm run lint` | exit 0 (`--max-warnings 0`) |
| `npm run test:run` | exit 0 — **517 tests, 60 files** |
| `npm run format:check` | exit 0 |

**517/60 is the union, not the sum.** Phase 5's base was 439/54 and Phase 6's
510/58, both over Phase 3's 394/49; the two phases' new tests add to 555 in
63, and deleting Phase 6's four duplicate service specs takes 42 of them back
out. The 4 net additions are the three fixes' pins plus
`note-game.models.spec.ts`.

**Determinism: three consecutive serial `npm run test:run` executions**,
nothing else running, `npm`'s own exit status captured per run — `exit=0` at
**60 files / 517 tests** all three times, with **zero** `FAIL` lines in any
log. Phase 5's `isolate: true` held across a merge that added 9 spec files and
removed 4.

E2E, specs unmodified, `E2E_BASE_URL=http://localhost:4300`, on a server this
integrator started from **this** checkout — `/proc/454776/cwd` read as
`/home/noetrevino/projects/tremolo/frontend` before any result was believed.
`/tmp/tremolo-port-4300.lock` held for the run and released after. Go on
`:5001`, Python on `:8000`.

| Spec | Result |
| ---- | ------ |
| `navigation.spec.ts` | 21 / 21 |
| `auth.spec.ts` | 5 / 5 |
| `friends-and-theme.spec.ts` | 4 / 4 |
| `classes.spec.ts` | 4 / 4 |
| `games.spec.ts` | **6 / 6** |
| `settings.spec.ts` | **3 / 3** |
| | **43 / 43** |

**The complete golden suite is green for the first time in the migration.**
Phase 5 handed over three residuals, all `/note-game`; all three are closed
and nothing regressed.

#### Screenshots — 68 of 80, and the 12 are the recorded residual

`baselines.spec.ts` run as-is still fails 4/4: it photographs 20 routes inside
*one* test per viewport/theme and `toHaveScreenshot` is a hard assertion, so
each pass aborts at `/login` — route 4 — and never reaches the rest. That is
Phase 3.1 deviation 9, still open, and it is why every phase since has needed
a sweep to report anything.

The sweep here was `baselines.spec.ts` copied verbatim with its one assertion
made `expect.soft`, run through a scratch config pointing
`snapshotPathTemplate` at the real `.migration/baselines/`, same mask
(`staff(page)`), same `settle`, same `maxDiffPixelRatio: 0.01`, same seeding.
All 80 shots reported in one run:

| Result | Shots |
| ------ | ----- |
| Inside threshold | **68** |
| Outside | **12** — `login`, `signup` and `google-callback`, x 2 viewports x 2 themes |

`google-callback` with no code redirects to `/login`, and its diffs are
pixel-for-pixel identical to `login`'s (17433, 17414, 13537, 13518), so the
12 are one defect on three route slugs: **the login/signup restyle residual
Phase 3.1 recorded as 12 shots**, unchanged and untouched by this phase. The
consolidated Phase 3 verifier counted 8 of them because its own route set was
10 routes wide. Every other route — all four game routes, `/note-game`, `/`,
`assignment-play`, the dashboard, classes, profile, account, sheet-music,
convert — is inside threshold.

The scratch config and spec were deleted after the run. `git status` on
`.migration/baselines/` is clean and all 80 PNGs are byte-identical: a
missing baseline makes Playwright *fail while writing it*, and the 68 passes
are comparisons.

#### Live, on the running app

Driven through a scratch Playwright script (deleted after), against
`:4300` with both backends up, on a freshly seeded student.

- **The note game played to Game Over on the physical keyboard**, ten
  questions, `Score: 8/10`, "Game results saved successfully!".
- **And again by clicking the answer pad**, `Score: 4/10`, same toast.
- **Audio fires on correct answers, measured rather than assumed.** The page
  was instrumented before load to count `AudioBufferSourceNode.start()`,
  `AudioContext` constructions and `decodeAudioData` failures. Keyboard game:
  **1 context, 8 starts, 4 samples decoded, 0 errors** — one marimba note per
  correct answer, and one context, created inside the first answer's gesture,
  never before it. Click game: **1 context, 4 starts, 0 errors**. The
  decode/start ratio is the enharmonic table doing its job.
- **The scores reached the database and the dashboard.**
  `GET /api/note-game/recent?game_type=note` returns 2 entries, and
  `/dashboard` reads **total sessions: 2**.
- **No seam regression.** A key-signature game plays to Game Over from its own
  route and its results screen reports `Score: 0/10` — read through
  `e2e/support/app.ts`'s anchored regex, which is the `GameOverCardComponent`
  fix proving itself on the identification side. (A 0 is the expected outcome:
  the harness clicks "C" without knowing the answer, which `games.spec.ts`
  documents.)

#### Hygiene

- `shareReplay` appears as **code** in one file, `refresh.interceptor.ts`
  (D6). The other hit is a comment in `user.service.ts` saying there is none.
- `grep -n "use-sound\|howler" package.json` → nothing. **No dependency was
  added**; `package.json` and `package-lock.json` are byte-identical across
  the whole range, so R6 was not exercised.
- `NATURAL_NOTES`, `TIME_LIMITS`, `NOTE_LIMITS`, `CLEF_UNICODE` and
  `CLEF_LABELS` each have exactly **one** declaration, all in
  `features/identification-game/`.
- No `@NgModule`, no `zone.js`, no `takeUntil` that is not
  `takeUntilDestroyed`. One `ngOnDestroy` implementation in `src/` —
  `SheetMusicComponent`'s; the other grep hits are comments, two of them now
  in `note-game/services/keyboard-input.ts` saying there is none.
- `e2e/`, `.migration/baselines/` and `frontend-react/` are **byte-untouched**
  across `10cfbfb..HEAD` (`git diff --stat` over those paths is empty).
- Phase 6's worktree and branch were removed after the push; its `:5173`
  server was already gone.

#### What Phase 7 inherits

1. **The login/signup restyle residual is the last open screenshot item**, and
   `baselines.spec.ts` cannot report a clean run until it is closed —
   12 shots, one page, three route slugs.
2. **Anchored-regex text matching is a real trap in Angular templates.** Any
   text an unmodified spec matches with `^…$` must be one interpolation or one
   literal; multi-line interpolated text silently gains a leading and trailing
   space that JSX did not have. Accessible names are unaffected.
3. **`e2e/support/app.ts` paces answers at 1200ms** because the Go DTO types
   `notes_per_minute` as `int8`. Nothing in the app enforces that, so a fast
   human can still lose a score to a 400. The Go service is out of scope for
   this migration, but it is a real bug and it is worth writing down once more.
4. The docs update Phase 7 owns should take the `GameDefinition` interface
   from `phase-5-handoff.md` §2 and the note-game invariants from
   `phase-6-handoff.md` §7, both of which still hold after this merge.
