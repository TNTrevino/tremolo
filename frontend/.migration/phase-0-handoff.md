# Phase 0 handoff — Scaffold & parity harness

Status: **built**. Every command under the packet's _Verify_ passes. Ledger
row updated in `STATE.md`, along with seven deviations and a rewritten
environment note.

---

## 1. What exists now

The repo has **two frontends** until Phase 7:

| Directory         | App                     | Role                                                                 |
| ----------------- | ----------------------- | -------------------------------------------------------------------- |
| `frontend/`       | Angular 22.1.3          | The migration target. Boots a blank shell; no routes yet.            |
| `frontend-react/` | React 18 + Vite         | The executable spec. Stays runnable and CI-green until Phase 7.      |

`frontend/.migration/` did not move — it is the migration's control
directory, not React's.

### The Angular app

- **Standalone, zoneless, no NgModules.** `zone.js` is absent from the
  dependency tree; `app.config.ts` states `provideZonelessChangeDetection()`
  explicitly anyway (see deviation 3).
- `provideRouter(routes, withComponentInputBinding())` is already on, because
  PLAN.md §5.2's parameterised `rxResource` binds route params through
  `input.required<string>()`.
- `provideHttpClient(withFetch())` is on; no interceptors yet — the 401
  refresh interceptor (§5.4) is Phase 1's.
- `app.routes.ts` is an empty table.

### Exact versions installed

| Package                     | Version     | Note                                                       |
| --------------------------- | ----------- | ---------------------------------------------------------- |
| `@angular/{core,cli,build}` | **22.1.3**  | Pinned exactly, no caret (D1). Latest on npm is 22.1.5.    |
| `typescript`                | **6.0.3**   | Pinned. `@angular/build@22` peers `>=6.0 <6.1`; 7.x breaks. |
| Node                        | **v24.19.0** | `.nvmrc` pins `24`.                                        |
| `@playwright/test`          | 1.62.1      | Chromium headless shell 151.0.7922.34.                     |
| `@testing-library/angular`  | 19.4.2      | D10.                                                       |
| `eslint` / `angular-eslint` | 10.8.1 / 22.1.0 | See R6 checks below.                                   |
| `vitest` / `jsdom`          | 4.1.11 / 27.4.0 |                                                        |
| `tailwindcss`               | 3.4.19      | Carried over unchanged.                                    |

### R6 dependency checks (all run via `npm view <pkg> peerDependencies`)

| Package                        | Peer range                                     | Verdict                        |
| ------------------------------ | ---------------------------------------------- | ------------------------------ |
| `@testing-library/angular@19`  | `@angular/core >= 21.0.0`                      | ✅ adopted                     |
| `angular-eslint@22.1.0`        | `@angular/cli >=22 <23`, `eslint ^9 \|\| ^10`  | ✅ adopted                     |
| `typescript-eslint@8.67.0`     | `eslint ^8.57 \|\| ^9 \|\| ^10`, `ts <6.1.0`   | ✅ adopted                     |
| `@playwright/test@1.62.1`      | none (no Angular peer)                         | ✅ adopted                     |
| `@analogjs/vitest-angular@2.7` | **`zone.js >=0.14.0`**                         | ❌ **rejected — violates D4**  |

The Analog rejection is the notable one: it is the usual answer for "vitest
with Angular", and it would have quietly reintroduced zone.js. Angular 22's
own `@angular/build:unit-test` builder runs vitest on jsdom with no such
peer, so that is what the app uses.

`eslint@^9.40.0` does not exist (9.x stops at 9.39.5); eslint 10.8.1 is
current and inside both peers' ranges.

### Where each old config landed

| Was (`frontend/`)         | Now                                                                       |
| ------------------------- | ------------------------------------------------------------------------- |
| `src/index.css`           | `frontend/src/styles.css`, verbatim + the two font imports from `main.tsx` |
| `tailwind.config.js`      | Copied; only the `content` glob changed (`.tsx` → `.ts,.html`)            |
| `postcss.config.js`       | Copied verbatim                                                            |
| `.prettierrc.json`        | Copied verbatim (hard tabs survive)                                        |
| `.prettierignore`         | Copied, plus `.angular`, `playwright-report`, `test-results`, `.migration` |
| `tsconfig.json` strictness | Carried into `frontend/tsconfig.json` (see deviation 6 re `baseUrl`)      |
| `.env.example` `VITE_*`   | `src/environments/environment{,.prod}.ts`                                  |
| `.eslintrc.cjs`           | Replaced by `eslint.config.js` (flat config)                               |
| everything else React     | Moved to `frontend-react/`                                                 |

`frontend/DESIGN.md` **stayed** — the tokens it documents are what the
Angular port has to reproduce. `ARCHITECTURE.md`, `CLASSES_FRONTEND.md`,
`CLAUDE.md`, `README.md`, and `docs/ERROR_HANDLING.md` describe React and
moved with it.

---

## 2. The parity harness

### Layout

```
frontend/
├── playwright.config.ts       ← two projects: "golden" and "baselines"
├── tsconfig.e2e.json          ← the specs are Node code, not Angular code
└── e2e/
    ├── routes.ts              ← the 20 routes + each one's guard, shared
    ├── baselines.spec.ts      ← the 80 screenshots
    ├── support/
    │   ├── api.ts             ← seeds users/classes/assignments via the Go API
    │   └── app.ts             ← page helpers; the selector rules live here
    └── specs/
        ├── auth.spec.ts             login, signup, both route guards
        ├── navigation.spec.ts       all 20 routes resolve, per role
        ├── games.spec.ts            all 5 games → game over → score saved
        ├── settings.spec.ts         settings persist across reload
        ├── classes.spec.ts          teacher creates, student joins, assignment play
        └── friends-and-theme.spec.ts  friends add/list, theme toggle
```

**48 specs, all green against the React app.**

### Selector discipline

Every locator goes through a role, an accessible name, or visible text.
There is not one CSS class, DOM path, or test id in the suite. Two places
needed care:

- **`exact: true` is mandatory on string answer labels.** Playwright's
  substring matching means `{ name: "C" }` also matches `"C#"`, `"Cb"` —
  and, because an empty accessible name substring-matches anything, whatever
  unlabelled icon button comes first in the DOM. That silently clicked
  nothing and the key-signature game never started.
- **The note game has two scale pickers** (settings bar + mobile drawer),
  one hidden per viewport. `visibleScalePicker()` filters on visibility, not
  on structure.

### Running it

```bash
export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
cd frontend

# against React (the default baseURL, :5173)
npm run e2e

# against Angular, later
E2E_BASE_URL=http://localhost:4200 npm run e2e
```

`E2E_BASE_URL` is the only thing that changes. `E2E_MAIN_API` overrides the
Go service (default `http://localhost:5001`).

### The exact baseline-capture command

Baselines are **20 routes × 2 viewports (1280×800, 390×844) × 2 themes = 80
PNGs** in `.migration/baselines/`, named `<slug>-<viewport>-<theme>.png`.

```bash
# 1. both backends up (see §4), React dev server on :5173
# 2. from frontend/:
npm run e2e:baselines -- --update-snapshots     # capture / re-capture
npm run e2e:baselines                           # compare
```

To diff a later phase's Angular routes against them:

```bash
E2E_BASE_URL=http://localhost:4200 npm run e2e:baselines
```

Threshold is `maxDiffPixelRatio: 0.01`, animations disabled, caret hidden.

### Dynamic-content carve-out

Game questions are random, so the staff is **masked** in every screenshot
via `getByLabel(/^(Music staff|Sheet music display)$/)`. That the staff
rendered at all is asserted separately, in `games.spec.ts` — an SVG exists
inside the container and has a real layout box.

---

## 3. Deviations

All seven are in `STATE.md`. The two that change what later phases must
build:

**The React app gained accessible names (commit `cb7b35b` + two follow-ups).**
Nine icon-only controls had no accessible name, so no user-visible selector
could reach them — including the theme toggle and the friends toggle, both
named golden flows. Added:

| Control                          | Accessible name                                    |
| -------------------------------- | -------------------------------------------------- |
| Theme toggle                     | `Switch to light theme` / `Switch to dark theme`   |
| Friends toggle (nav)             | `Open friends` / `Close friends` + `aria-expanded` |
| Mobile menu button               | `Open menu` / `Close menu` + `aria-expanded`       |
| Account avatar                   | `Account menu`                                     |
| Friends panel: add / close / back | `Add friend`, `Close friends`, `Back to friends`  |
| Friends search result button     | `Add <name>` / `<name> added`                      |
| Game staff container             | `Music staff`                                      |
| Note-game scale picker (desktop) | `Scale`                                            |

**The Angular port must reproduce these names verbatim.** They are the
acceptance criteria for Phases 1, 2, 3 and 5–6. The toggle labels are also
how the suite reads the current theme without touching a CSS class.

**No `vitest.config.ts`.** PLAN.md §4 lists one; the `@angular/build:unit-test`
builder owns that config and only loads an external file through
`runnerConfig`, whose contents the Angular team explicitly does not support.
Test config lives in `angular.json`; `src/test-setup.ts` is the seam for
global setup (Phase 4 will need it for OSMD's canvas measurement in jsdom).

---

## 4. Things Phase 1 must know

### Running the backends

The root `README.md` is incomplete — the Go service **panics** without
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. This works:

```bash
export DATABASE_URL="postgresql://postgres@127.0.0.1:5432/tremolo?sslmode=disable"
export JWT_SECRET="phase0-parity-harness-local-secret-key-32chars"   # >= 32 chars
export ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4200"
export ACCESS_TOKEN_EXPIRY_MINUTES=15 REFRESH_TOKEN_EXPIRY_HOURS=168
export MAX_LOGIN_ATTEMPTS=100 ACCOUNT_LOCKOUT_DURATION_MINUTES=1
export GOOGLE_CLIENT_ID=unused GOOGLE_CLIENT_SECRET=unused
export LOG_LEVEL=WARN LOG_FORMAT=text
cd backend/main && go run main.go            # :5001, migrations run on boot

cd backend/music && . env/bin/activate && python -m fastapi run main.py --port 8000
```

`ALLOWED_ORIGINS` must include `http://localhost:4200` before any Angular
page can call the Go service — that is the first thing that will bite.

### Behaviours the suite pins that a naive port will get wrong

1. **A rejected login currently shows "Please log in again."** The React 401
   interceptor treats the failed `/api/auth/login` as a session expiry.
   PLAN.md §5.4's interceptor excludes auth endpoints, so Angular is
   _expected_ to show the server's "Invalid credentials" instead — the spec
   is deliberately loose on wording and strict on behaviour (an error shows,
   the user stays on `/login`).
2. **Game settings save on the first answer, not on the click.** The spec
   changes a setting, plays a game, reloads, and expects the change. A port
   that saves on every control click passes while hammering the API.
3. **Joining a class does not refresh the assignment list in place** today —
   React caches it. The spec reloads rather than asserting either behaviour,
   since Angular's resources do not cache at all (D6) and will refetch.
4. **The theme must persist to `localStorage`** and survive a reload; the
   signal store (D7) has to do this explicitly.
5. **`/` redirects to `/note-game`**, not to `/home`.
6. **Game over and save-complete are different moments.** The score POST is
   fired when the game ends; navigating away in between aborts it and the
   attempt is silently lost. The assignment spec waits for the app's own
   "Game results saved successfully!" toast before navigating -- that toast
   is part of the contract and the Angular port must keep it.

### A real bug in the Go service (out of scope, but it shapes the harness)

`DTOs/Entry.NPM` is an **`int8`**. A score above 127 notes-per-minute fails
`ShouldBindJSON` and the save returns `400 Invalid request body` — the
player's game is silently lost. The harness therefore paces answers at
1200 ms (`ANSWER_INTERVAL_MS` in `e2e/support/app.ts`), which puts a
10-question game near 50 npm. At machine speed every save 400s; at 800 ms
it lands near 80 and tipped over the ceiling intermittently under load. `UserID` is an `int16` and user ids are already in the
1500s, so that one has headroom left but not unlimited.

A worked example from a passing run, for calibration:
`{"time_length":"00:00:08","total_questions":10,"notes_per_minute":80,...}`
-- 80 is already two-thirds of the way to the ceiling for a 10-question
game answered at roughly one per second.

This is not an Angular problem and the Go service is out of scope for this
migration — recorded here so it is not rediscovered as a "port bug".

### CI and deploy

- `frontend-ci.yml` now has two jobs: `frontend-checks` (Angular, Node from
  `frontend/.nvmrc`) and `react-checks` (React, Node 20). The CI gate's path
  filter covers both directories.
- **`deploy.yml` now builds and rsyncs `frontend-react/dist/`.** It pointed
  at `frontend/`, which is a blank shell — left alone it would have shipped
  an empty page to production. **Phase 7 must point it back**, and note that
  Angular emits to `dist/tremolo-frontend/browser/`, not `dist/`.
- `make check` runs four services now (`1/4`..`4/4`): frontend, react,
  music, go. `make check-frontend` is Angular; `make check-react` is React.
- The E2E suite is **not** in CI. It needs both backends and a database, and
  the repo has no such job. Phases that want it gated should say so.

### Not done, deliberately

- No `@ng-icons` install (D12) — Phase 2 owns icons, and R6 wants the check
  made where it is used.
- `environment.prod.ts` has **empty** `mainApi`/`musicApi`. Nothing builds
  for production from `frontend/` yet; Phase 7 fills them in when it
  repoints the deploy.
- The remaining unlabelled icon buttons in the React app (the password
  reveal toggles, dialog close buttons) were left alone — no golden flow
  needs them.
