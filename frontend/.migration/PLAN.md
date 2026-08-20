# Angular Migration Plan

Migrating `frontend/` from React 18 + Vite to **Angular 22**, in phases.

Scope: `frontend/` only. The Go (`backend/main/`) and Python
(`backend/music/`) services are **not** touched. Their APIs are fixed contracts.

Tremolo is pre-production with no users, so this is a wholesale rewrite on one
branch — `main` keeps the working React app until the final merge. No
React/Angular interop, no route-by-route handoff.

---

## §1 Operating model — autonomous execution

The enemy is context rot: an agent that "remembers" a decision from a stale
conversation, or a plan that says _as discussed above_. The defenses are
structural.

### Rules

**R1. The repo is the only memory.** Chat history does not exist. Anything an
agent must know is in `.migration/`, in the code, or derivable by running a
command. If a builder needs information found in none of those places, that is
a plan bug — record it in `STATE.md` and stop. Never guess.

**R2. State lives in committed files.** `STATE.md` is the ledger: one row per
phase (status, date, commit range, deviations). Each phase also writes
`phase-N-handoff.md` — what was built, what deviated, what the next phase must
know. Both are committed with the phase's work.

**R3. One phase per agent, packet pasted verbatim.** Copy the full packet into
a fresh agent's prompt. Agents never span phases; a long-lived agent is a
rotting agent.

**R4. Builder ≠ verifier.** The builder runs the _Verify_ commands before
finishing, but only a separate fresh agent — reading nothing but the packet,
the handoff, and the repo — may run _Exit criteria_ and set status to `done`.

**R5. Repo beats plan.** If the repo contradicts a packet (a file moved, a
count is off), the repo wins. Record the deviation in the handoff; do not
silently "fix" the plan's expectations.

**R6. Version-check before adopting.** Any new dependency must have an
`@angular/core` peer range including 22, verified via
`npm view <pkg> peerDependencies`. Two libraries have already failed this
check (D12, D13).

### Parity harness — "looks and behaves the same," mechanically

Parity with the React app is verified by instruments, not judgment. Both
instruments work because `frontend-react/` stays runnable until Phase 7 — the
old app is the executable specification.

- **Spec-first E2E (behavior).** Phase 0 writes a Playwright suite (D15)
  covering the golden flows — login → dashboard, play each of the five games,
  settings persist across reload, teacher creates a class, student joins,
  assignment play, friends, theme toggle — against the **React** app, and
  proves it green there. Selectors must be user-visible only (roles,
  accessible names, text) — never CSS classes, component internals, or
  framework-specific test ids. From then on, each phase must make its slice of
  that **same, unmodified** suite pass against Angular (`baseURL` is the only
  thing that changes). A spec that needs editing to pass on Angular is a
  behavior change — record it as a deviation, don't silently edit the spec.

- **Screenshot baselines (looks).** Phase 0 captures the React app per route at
  two viewports (1280×800, 390×844), both themes, into `.migration/baselines/`.
  Each phase's verifier diffs its delivered routes against the baselines.
  Fonts, Tailwind config, and markup structure all carry over, so real diffs
  are small; a large diff is a finding, not noise.

- **Dynamic-content carve-out.** Game questions are randomly generated, so
  pixel-diffing the staff is meaningless. For game screens: diff the chrome
  (settings, answer pad, score bar, layout) with the staff region masked, and
  assert separately that the staff region rendered non-empty. Chart interiors
  get the same treatment.

- **Unit-level parity** is covered per phase: each packet ports the feature's
  existing tests and pins behavioral invariants (queue reset semantics,
  scoring math, save-once).

### Parallelism map

```
0 ──► 1 ──► 2 ──┬──► 3 (features fan out AFTER the first feature proves
                │        the pattern; one worktree per feature)
                └──► 4 ──┬──► 5 ─┐
                         └──► 6 ─┴──► 7
```

Phases 5 and 6 are independent. Within Phase 3, sub-features 2–6 can run as
parallel agents in isolated worktrees once sub-feature 1 (auth screens) has
landed and been verified — it is the pattern-setter.

---

## §2 Decisions of record

Fixed. Relitigating one is a deviation to record, not a judgment call to make.

| id      | Decision                                                                               | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1**  | **Angular 22.1.3** (latest stable, 2026-06-03), **TypeScript 6.0.3 — pinned, NOT 7.x** | Signal Forms and `httpResource`/`rxResource` are `@publicApi`. `@angular/build@22` and `@angular/compiler-cli@22` both peer TS `>=6.0 <6.1`, so TypeScript 7 (current `latest` on npm) is **incompatible** — installing `typescript@latest` breaks the build. 6.0.3 is the newest allowed.                                                                                                                                |
| **D2**  | **clone-i's layout, flattened**: `src/app/{auth,core,shared,features,…}`               | clone-i's organization by domain, without its `modules/` wrapper — this codebase has no NgModules, so a folder named "modules" would mislead.                                                                                                                                                                                                                                                                             |
| **D3**  | **No NgModules, anywhere**                                                             | Standalone components throughout. No `*.module.ts`, no `*-routing.module.ts`; routing is `app.routes.ts` + lazy `*.routes.ts`.                                                                                                                                                                                                                                                                                            |
| **D4**  | **Zoneless**: `provideZonelessChangeDetection()`                                       | `zone.js` is never installed. Change detection is signal-driven.                                                                                                                                                                                                                                                                                                                                                          |
| **D5**  | **Data services return `Observable<T>`**                                               | Cancellation, retry, and piping depend on it. Services never expose bare values or Promises.                                                                                                                                                                                                                                                                                                                              |
| **D6**  | **Pages consume via `rxResource({ stream })`**                                         | Fetch-on-load, no cache. Loading/error/value as signals; in-flight requests cancel on destroy. Replaces TanStack Query **and** the `QueryState` wrapper. **Deliberate consequence: resources do not share or dedupe across components — two components reading the same endpoint fire two requests. That is the policy working, not a bug; do not add `shareReplay`, a caching service, or any dedup layer to "fix" it.** |
| **D7**  | **Shared state = signal stores**                                                       | The three Zustand stores become `@Injectable` services exposing `signal`/`computed`. No `BehaviorSubject` state.                                                                                                                                                                                                                                                                                                          |
| **D8**  | **Keep the question prefetch buffer**                                                  | Not a cache — it is what makes the next question render instantly. Score is notes-per-minute; fetch latency lands directly in the player's rating.                                                                                                                                                                                                                                                                        |
| **D9**  | **`GameDefinition` stops embedding JSX**                                               | `prompt` and `ChoiceOption.render` become plain data the template switches on (§5.7). Definitions return to pure `.ts`.                                                                                                                                                                                                                                                                                                   |
| **D10** | **Vitest, not Karma**                                                                  | `@angular/build@22` peers `vitest@^4`; repo is already on `vitest@^4.0.17`. Runner and config style survive.                                                                                                                                                                                                                                                                                                              |
| **D11** | **Keep zod**                                                                           | Signal Forms accept Standard Schema via `validateStandardSchema`; zod v4 implements it. Existing schemas plug in directly.                                                                                                                                                                                                                                                                                                |
| **D12** | **Icons: `@ng-icons/core` + `@ng-icons/lucide`**                                       | `lucide-angular@1.0.0` peers `13.x–21.x` — no Angular 22. `@ng-icons/core@35` peers `>=22.0.0` and ships the Lucide set.                                                                                                                                                                                                                                                                                                  |
| **D13** | **Port our own toast; no ngx-toastr**                                                  | `ngx-toastr@20` peers `^21.0.0` — no Angular 22. The app already hand-rolls `toast.tsx` + `useToast`.                                                                                                                                                                                                                                                                                                                     |
| **D14** | **Keep path aliases** (`@core/`, `@shared/`, `@features/`)                             | clone-i's full-path imports are noise; the layout is what we adopt, not the verbosity.                                                                                                                                                                                                                                                                                                                                    |
| **D15** | **Playwright for the parity/E2E suite**                                                | One suite runs unchanged against both apps by switching `baseURL`; built-in screenshot assertions with thresholds; framework-agnostic. (clone-i uses Cypress; the dual-app requirement decides against it.)                                                                                                                                                                                                               |

### Deliberately deferred

- **Chart library** (replaces recharts in `TremoloLineChart` + `ActivityHeatmap`).
  Verified Angular-22-compatible candidates: `@swimlane/ngx-charts@25`
  (peers `^21.2 || ^22`), `ng2-charts@10` (peers `>=21`); the heatmap is simple
  enough to hand-roll in SVG. **Decide in Phase 3.**
- **Audio** (replaces React-only `use-sound`): `howler` directly (what
  use-sound wraps) or Web Audio. **Decide in Phase 6.**

---

## §3 Inventory of the React app

Measured on this branch 2026-08-20. Re-measure before trusting:

```bash
find frontend/src \( -name '*.ts' -o -name '*.tsx' \) ! -name '*.test.*' | wc -l
```

**184 non-test `.ts`/`.tsx` files, 17,086 LOC; plus 20 test files (~3,000 LOC).**

| Area                           | Files |   LOC | Notes                                                        |
| ------------------------------ | ----: | ----: | ------------------------------------------------------------ |
| `features/identification-game` |    27 | 2,306 | The engine; 4 games ride on it                               |
| `features/note-game`           |    18 | 2,221 | Keyboard input, audio, own queue                             |
| `features/classes`             |    15 | 1,777 | Classes, roster, assignments                                 |
| `features/dashboard`           |     8 |   671 | Charts live here                                             |
| `features/friends`             |     6 |   438 |                                                              |
| `features/sheet-music`         |     4 |   363 | OSMD wrapper (`useOSMD`, 201 LOC)                            |
| `features/note-game-display`   |     4 |   219 |                                                              |
| `features/auth`                |     3 |   148 |                                                              |
| `shared/`                      |    48 | 4,163 | 10 UI primitives, 5 form components, 9 hooks, layout, charts |
| `pages/`                       |    19 | 2,648 | Thin route components                                        |
| `services/`                    |    21 | 1,615 | 2 axios clients, 5 domain services, mappers, 9 type files    |
| `stores/` + `lib/`             |     6 |   154 | 3 Zustand stores; logger, axe, `cn()`                        |

**20 routes**, guarded by three wrapper components — `ProtectedRoute` (5 uses),
`GuestRoute` (2), `TeacherRoute` (2):

```
/                        /classes               /login
/about                   /classes/:id           /note-game
/account                 /convert               /profile
/assignments             /dashboard             /scale-game
/assignments/:id/play    /home                  /sheet-music
/auth/google/callback    /interval-game         /signup
/chord-game              /key-signature-game
```

---

## §4 Target directory layout

clone-i's domain organization, flattened (D2), standalone (D3).

```
frontend/
├── angular.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── e2e/                              ← Playwright parity suite (D15)
├── .migration/                       ← plan, ledger, handoffs, baselines
└── src/
    ├── main.ts
    ├── index.html
    ├── styles.css                    ← Tailwind entry (was src/index.css)
    ├── environments/
    │   ├── environment.ts            ← was import.meta.env.VITE_* + src/config/
    │   └── environment.prod.ts
    └── app/
        ├── app.component.ts
        ├── app.config.ts             ← providers: zoneless, router, http
        ├── app.routes.ts             ← was App.tsx routes
        ├── auth/
        │   ├── components/{login,signup,google-callback}/
        │   ├── services/
        │   │   ├── auth.service.ts   ← HTTP; Observables (D5)
        │   │   ├── auth.store.ts     ← signals (was stores/auth.store.ts)
        │   │   └── security/
        │   │       ├── auth.guard.ts     ← was ProtectedRoute
        │   │       ├── guest.guard.ts    ← was GuestRoute
        │   │       └── teacher.guard.ts  ← was TeacherRoute
        │   └── models/
        ├── core/
        │   ├── components/{navigation,toast,spinner,app-error,confirm-dialog}/
        │   └── services/
        │       ├── logger.service.ts       ← was lib/logger.ts
        │       ├── notification.service.ts ← was useToast
        │       └── theme.store.ts          ← signals (was stores/theme.store.ts)
        ├── shared/
        │   ├── components/
        │   │   ├── ui/               ← the 10 shadcn-style primitives
        │   │   ├── forms/            ← FormField, FormInput, FormLabel, …
        │   │   ├── charts/           ← TremoloLineChart, ActivityHeatmap
        │   │   └── music/            ← RhythmGlyph
        │   ├── models/               ← was services/api/types/
        │   ├── services/base-data.service.ts
        │   ├── utils/                ← cn() helper, mappers
        │   └── validators/
        ├── public/                   ← guest pages: home, about
        └── features/
            ├── classes/{components,models,services}/ + classes.routes.ts
            ├── dashboard/
            ├── friends/
            ├── account/              ← account, profile pages
            ├── sheet-music/          ← sheet-music, convert pages
            ├── identification-game/
            │   ├── components/ games/ settings/ services/ models/
            │   └── identification-game.routes.ts
            └── note-game/
```

---

## §5 Reference patterns

The canonical shapes. Builders copy these, adjusting names; deviating from a
pattern is a deviation to record.

### 5.1 Data service — Observables in, Observables out (D5)

```ts
// app/features/classes/services/classes.service.ts
@Injectable({ providedIn: "root" })
export class ClassesService {
	private http = inject(HttpClient);
	private base = `${environment.mainApi}/api/classes`;

	getClasses(): Observable<Class[]> {
		return this.http
			.get<ClassResponse[]>(this.base)
			.pipe(map((rows) => rows.map(mapClassResponse)));
	}
}
```

The existing mappers (`mapClassResponse` etc.) are plain functions with no
React in them — port verbatim into `shared/utils/` or the feature's `models/`.

### 5.2 Page — rxResource, no cache (D6)

```ts
export class ClassesPage {
	private classesService = inject(ClassesService);

	readonly classes = rxResource({
		stream: () => this.classesService.getClasses(),
		defaultValue: [],
	});

	// parameterized variant: refetches whenever params change
	readonly classId = input.required<string>(); // route binding
	readonly detail = rxResource({
		params: () => this.classId(),
		stream: ({ params }) => this.classesService.getClass(params),
	});
}
```

```html
<!-- this block IS the old QueryState component -->
@if (classes.isLoading()) {
<app-spinner />
} @else if (classes.error()) {
<app-error [error]="classes.error()" />
} @else { @for (c of classes.value(); track c.id) {
<app-class-card [class]="c" />
} }
```

Full resource surface (verified against `@angular/core@22.1.3` type
definitions — do not hand-roll any of this): `value` (writable —
`.set()`/`.update()` for local/optimistic state), `isLoading`, `error`,
`status` (`'idle' | 'loading' | 'reloading' | 'resolved' | 'error' | 'local'`
— `loading` vs `reloading` lets first-load show a skeleton while a refetch
keeps stale data on screen), reactive `hasValue()`, and `reload()` (returns
`false` if already loading, so retry buttons can't double-fire).

**Scope rule (D6):** a resource is per-component-instance state. Resources do
_not_ share or dedupe requests across components; two components reading the
same endpoint fire two requests, and that is the intended no-cache policy.
Never introduce `shareReplay`, a caching service, or request dedup to "fix"
duplicate fetches — flag it as a deviation instead if it ever becomes a real
problem.

### 5.3 Signal store (D7)

```ts
// app/auth/services/auth.store.ts — replaces stores/auth.store.ts
@Injectable({ providedIn: "root" })
export class AuthStore {
	private _user = signal<User | null>(null);
	private _token = signal<string | null>(null);

	readonly user = this._user.asReadonly();
	// was a THIRD stored field kept in sync by hand in Zustand — now derived
	readonly isAuthenticated = computed(() => this._token() !== null);

	setAuthFromLogin(res: LoginResponse): void {
		this._user.set(mapApiUserToUser(res.user));
		this._token.set(res.access_token);
	}
	clear(): void {
		this._user.set(null);
		this._token.set(null);
	}
}
```

Persistence (Zustand's `persist`) becomes an explicit localStorage read at
construction + an `effect()` that writes on change. Same for `theme.store`,
which also toggles the `dark` class on `documentElement`.

### 5.4 The 401-refresh interceptor

Today: an `isRefreshing` boolean, a `failedQueue` array, and a `processQueue`
function manually resolving parked promises (`main-client.ts`). The RxJS shape
shares one refresh observable among all 401s:

```ts
let refresh$: Observable<string> | null = null;

export const refreshInterceptor: HttpInterceptorFn = (req, next) =>
	next(req).pipe(
		catchError((err: HttpErrorResponse) => {
			if (err.status !== 401 || isAuthEndpoint(req.url)) throw err;
			refresh$ ??= inject(AuthService)
				.refreshToken()
				.pipe(
					shareReplay(1),
					finalize(() => (refresh$ = null)),
				);
			return refresh$.pipe(switchMap((token) => next(withBearer(req, token))));
		}),
	);
```

Concurrent 401s all `switchMap` onto the same `shareReplay`'d refresh — the
queue/flag machinery disappears. **The `finalize` line is load-bearing:** it
nulls the shared observable the moment the refresh settles, so the buffered
token can never be replayed to a later 401. That is what keeps this use of
`shareReplay` request-deduplication rather than caching (cf. D6). Refresh
failure clears `AuthStore` and routes to `/login` (replaces the `auth:logout`
window event).

### 5.5 The prefetch queue (D8)

Port of `useQuestionQueue`. Constants preserved: low-water **2**, hydrate batch
**2**, settings debounce **300ms**. Two hand-rolled mechanisms become
operators: the `generationRef` stale-response guard _is_ `switchMap`'s
cancellation, and the reset debounce _is_ `debounceTime`. The queue keys on the
serialized `toRequest` output, so only payload-affecting settings reset it —
this behavior is load-bearing and must survive.

```ts
request$ = toObservable(this.requestPayload).pipe(
	// computed from settings
	map((r) => JSON.stringify(r)),
	distinctUntilChanged(),
	debounceTime(300), // burst of settings clicks = 1 reset
	switchMap(() => this.refill$()), // switch = stale generation dropped
);
// queue itself: an Array<T> behind pop(); pop below low-water triggers
// refill (forkJoin of N fetchQuestion calls). First hydration skips the
// debounce, exactly as today.
```

### 5.6 Subscription hygiene — nobody writes `ngOnDestroy` unsubscribe code

There is no `this.subscription` field, no `takeUntil(this.destroy$)` subject,
and no unsubscribe bookkeeping anywhere in this codebase.

- **Don't subscribe at all.** `rxResource` / `toSignal` own the subscription
  and tear it down with the component. Covers every page's data and every
  stream a template reads.
- **Long-lived streams consumed in code** (keyboard input, timers): pipe
  through `takeUntilDestroyed()` (from `@angular/core/rxjs-interop`) at
  creation, inside an injection context. One operator, no fields, no lifecycle
  hook.
- **One-shot actions** (login submit, save score): plain `.subscribe()` in the
  handler is fine — `HttpClient` observables complete after one emission.

A hand-written `ngOnDestroy` that unsubscribes, or a stored `Subscription`
field, is a review flag: one of the three shapes above was missed.
(`ngOnDestroy` for non-RxJS teardown — e.g. disposing the OSMD instance — is
legitimate.)

### 5.7 GameDefinition without JSX (D9)

Two fields currently smuggle React markup into the game data:
`prompt?: (s) => React.ReactNode` and `ChoiceOption.render?: React.ReactNode`
(which is why `keySignature.tsx` is a `.tsx` — it builds a
`<KeySignatureGlyph>` into each of its 15 options). They become data:

```ts
// settings option rendering: a discriminated union, not markup
type OptionGlyph =
	| { kind: 'text' }                                  // default
	| { kind: 'keySignature'; fifths: number }
	| { kind: 'rhythm'; figure: string };

// prompt: a string template, interpolated by the game page
prompt?: (s: Settings) => string;   // e.g. "__ Major" / "__ Minor"
```

The settings component `@switch`es on `kind`. All other `GameDefinition`
fields (`defaults`, `settingsSchema`, `toRequest`, `getAnswer`,
`answerOptions`, `columnsClassName`, `zoom`) are plain data/functions — port
verbatim. `fetchQuestion` changes from `Promise<T>` to `Observable<T>`.

---

## §6 Phases

See `phase-0.md` … `phase-7.md`. Summary:

```
Phase 0  Scaffold + parity harness ──► ng serve boots, E2E green on React
Phase 1  Core plumbing ─────────────► login + 20 routes navigate
Phase 2  Shared UI kit ─────────────► primitives + forms render
Phase 3  CRUD features ─────────────► data pattern proven, charts decided
Phase 4  OSMD ──────────────────────► MusicXML renders
Phase 5  Game engine ───────────────► 4 identification games playable
Phase 6  Note game ─────────────────► audio decided, note game playable
Phase 7  Cutover ───────────────────► React deleted, CI green
```

Relative weight (share of total effort, not calendar time): 0 ≈ 5%, 1 ≈ 10%,
2 ≈ 15%, 3 ≈ 25%, 4 ≈ 5%, 5 ≈ 20%, 6 ≈ 13%, 7 ≈ 7%.

---

## §7 Dependency disposition

| Today                                                                    | Disposition                                               |
| ------------------------------------------------------------------------ | --------------------------------------------------------- |
| `react`, `react-dom`, `vite`, `@vitejs/plugin-react`                     | **Delete** — Angular 22 + Angular CLI                     |
| `@tanstack/react-query`                                                  | **Delete** — `rxResource`, no cache (D6)                  |
| `zustand`                                                                | **Delete** — signal stores (D7)                           |
| `axios`                                                                  | **Delete** — `HttpClient` + interceptors                  |
| `react-router-dom`                                                       | **Delete** — Angular Router + functional guards           |
| `react-hook-form`, `@hookform/resolvers`                                 | **Delete** — Signal Forms (D11)                           |
| `recharts`                                                               | **Replace** — decided in Phase 3                          |
| `lucide-react`                                                           | **Replace** — `@ng-icons/core` + `@ng-icons/lucide` (D12) |
| `use-sound`                                                              | **Replace** — decided in Phase 6                          |
| `@testing-library/react` (+ jest-dom, user-event)                        | **Replace** — `@testing-library/angular@19`               |
| `eslint` 8 + React plugins                                               | **Replace** — `@angular-eslint`, flat config              |
| `@axe-core/react`                                                        | **Replace** — `axe-core` directly                         |
| `zod`                                                                    | **Keep** — Standard Schema into Signal Forms (D11)        |
| `opensheetmusicdisplay`                                                  | **Keep** — framework-agnostic                             |
| `tailwindcss` + `tailwindcss-animate`, `postcss`, `autoprefixer`         | **Keep** — official `@angular/build` peer                 |
| `clsx`, `tailwind-merge`, `class-variance-authority`                     | **Keep** — framework-agnostic (`cn()`)                    |
| `@fontsource-variable/*`, `vitest` + coverage + jsdom, `prettier`, husky | **Keep**                                                  |

Housekeeping en route: `lint-staged` currently sits in `dependencies`; it
belongs in `devDependencies`.

---

## §8 Risks

| Risk                                                | Sev     | Mitigation                                                                                                                                           |
| --------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No per-component error boundaries in Angular**    | Med     | Scoped explicitly in Phase 2: global `ErrorHandler`, coarser granularity accepted and recorded.                                                      |
| **Ecosystem lag behind Angular 22**                 | Med     | Already hit twice (lucide-angular, ngx-toastr — both capped at 21) and routed around. R6: peer-range check before any adoption.                      |
| **Game engine mangled by line-by-line translation** | Med     | Engine lands last of the complex work, after data + OSMD patterns are proven; §5.5–§5.7 prescribe the redesign; behavioral tests pin the invariants. |
| **Agent context rot / phase drift**                 | Med     | §1: repo-resident ledger + handoffs, one phase per agent, builder/verifier split, repo-beats-plan.                                                   |
| **TypeScript 5.2 → 6.0**                            | Low     | Phase 0, before feature code; strict flags carried over.                                                                                             |
| **Test suite regression (20 files, ~3k LOC)**       | Low     | Testing Library + Vitest both survive; tests ported within each phase, swept in Phase 7.                                                             |
| **Long-lived branch drifting from `main`**          | Low–Med | Merge `main` in at each phase boundary; avoid non-trivial React feature work on `main` during the migration.                                         |
