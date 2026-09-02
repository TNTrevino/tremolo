# Frontend Architecture

This is the definitive "how this app works" document for the Tremolo Angular frontend. It is written for a contributor who is new to the repo. For the big picture across all three services (frontend, Python music service, Go user service), see the root [`CLAUDE.md`](../CLAUDE.md); for the short invariant list an agent needs before touching code, see [`CLAUDE.md`](./CLAUDE.md) here. For visual design decisions (colors, typography, component styling), see [`DESIGN.md`](./DESIGN.md) — that content is not repeated here.

This app was migrated from React in 2026. Most files carry a `Port of frontend-react/src/...` provenance comment, and the full record — plan, phase ledger, per-phase handoffs, parity report — lives in [`.migration/`](./.migration/). Where a handoff and the code disagree, **the code wins**.

## Contents

1. [Stack and commands](#stack-and-commands)
2. [Entry points and routing](#entry-points-and-routing)
3. [Directory layout](#directory-layout)
4. [Reactivity: signals, resources and stores](#reactivity-signals-resources-and-stores)
5. [The identification-game engine](#the-identification-game-engine) — the centerpiece
6. [The note game](#the-note-game)
7. [API layer conventions](#api-layer-conventions)
8. [Sheet music rendering (OSMD)](#sheet-music-rendering-osmd)
9. [Styling](#styling)
10. [Testing](#testing)
11. [Known deliberate deferrals](#known-deliberate-deferrals)

## Stack and commands

- **Angular 22.1.3** — standalone components everywhere (no `NgModule`), **zoneless** change detection, signals for state, RxJS for streams
- **TypeScript 6** (strict, plus `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`; `strictTemplates` on the Angular side)
- **Tailwind CSS 3** (+ `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`)
- **OpenSheetMusicDisplay (OSMD)** for MusicXML rendering
- **`@ng-icons/lucide`** for icons, **zod** for form schemas, **d3-shape** for the dashboard charts
- **vitest** (via `@angular/build:unit-test`) for unit tests, **Playwright** for the parity suite

Commands (run from `frontend/`; Node 24 — `.nvmrc` pins it and Angular 22 will not run on 23):

| Command                                   | What it does                                       |
| ----------------------------------------- | -------------------------------------------------- |
| `npm run dev` / `npm start`               | `ng serve` (port 4200)                             |
| `npm run test` / `npm run test:run`       | `ng test --watch` / single run                     |
| `npm run test:coverage`                   | `ng test --coverage`                               |
| `npm run lint` / `npm run lint:fix`       | `ng lint --max-warnings 0` (CI fails on warnings)  |
| `npm run format` / `npm run format:check` | Prettier (hard tabs, per the repo Prettier config) |
| `npm run build`                           | `ng build` — type errors fail it                   |
| `npm run e2e` / `npm run e2e:baselines`   | Playwright golden flows / screenshot baselines     |

Configuration is not where a Vite-era reader expects it: there is **no `vite.config.ts` and no `vitest.config.ts`**. The build, serve, test and lint targets all live in [`angular.json`](./angular.json).

**Environment variables are gone.** `import.meta.env.VITE_*` became [`src/environments/environment.ts`](./src/environments/environment.ts), swapped for `environment.prod.ts` by `angular.json`'s `fileReplacements` on a production build. The two API hosts are `environment.coreApi` (Go, `http://localhost:5001`) and `environment.musicApi` (Python, `http://localhost:8000`); `appName` and `googleClientId` ride along. `environment.prod.ts` ships **`%VITE_…%` placeholders** on purpose — `scripts/envsub.sh` fills them in from `/etc/tremolo/.env` on the target machine before the build, and it fails on an unset variable or on a placeholder it did not substitute. A placeholder is not an absolute URL, so a local production bundle 404s against its own origin and is visibly non-functional rather than quietly talking to the live service.

Path aliases (from [`tsconfig.json`](./tsconfig.json), with no `baseUrl` — TypeScript 6 deprecates it):

```json
"@app/*":      ["./src/app/*"],
"@core/*":     ["./src/app/core/*"],
"@shared/*":   ["./src/app/shared/*"],
"@features/*": ["./src/app/features/*"]
```

## Entry points and routing

`main.ts` → `app/app.config.ts` → `app/app.routes.ts`, and that is the whole bootstrap:

```ts
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
```

[`app.config.ts`](./src/app/app.config.ts) is the single provider list. What is in it, and why:

- **`provideZonelessChangeDetection()`** — zoneless is Angular 22's default and `zone.js` is not installed, so this call is belt-and-braces. It is kept deliberately: it is the line a reader greps for to know change detection is signal-driven, and the line that would fail loudly if anything pulled `zone.js` back in.
- **`{ provide: ErrorHandler, useClass: GlobalErrorHandler }`** — the single error boundary Angular allows. React's per-component `ComponentErrorBoundary` has no port; a feature that owns a contained failure renders it from an explicit `error` signal instead (see the sheet-music card and the question board's text fallback).
- **`provideRouter(routes, withComponentInputBinding(), withRouterConfig(ROUTER_CONFIG))`** — `withComponentInputBinding()` is what lets `/classes/:id` bind straight to an `input.required<string>()` on the page. `ROUTER_CONFIG` is `{ onSameUrlNavigation: "reload" }`.
- **`provideIcons(TREMOLO_ICONS)`** — only the icons the app uses, listed in `core/icons.ts`.
- **`provideHttpClient(withFetch(), withInterceptors([authInterceptor, refreshInterceptor]))`** — order matters; see [API layer](#api-layer-conventions).

[`app.routes.ts`](./src/app/app.routes.ts) holds **all of the app's 20 routes inline** (plus the `/dev/kit` showcase, which is not part of the app). There are no per-feature `*.routes.ts` files, and every route uses `loadComponent` — the port of React's `lazy()`. `/` redirects to `/note-game`, which is long-standing behaviour the parity suite pins. `e2e/routes.ts` carries the same 20 routes with their access levels, so the navigation spec and the screenshot baselines cannot drift from each other.

Three functional guards replace React's three wrapper components, one for one: `authGuard` (×5, was `ProtectedRoute`), `guestGuard` (×2, was `GuestRoute`), `teacherGuard` (×2, was `TeacherRoute`), all in `auth/services/security/`. `teacherGuard` delegates to `authGuard` when the visitor is anonymous, so a signed-out user hits `/login` rather than `/dashboard`. Every other route is public — **all five games are playable signed out, deliberately.**

**The logout bounce takes two settings, and both are load-bearing.** React's `ProtectedRoute` re-rendered whenever the auth store changed, so logging out on a guarded page bounced you to `/login`. Angular has no such re-render: `NavigationComponent.logout` re-navigates the current URL, `onSameUrlNavigation: "reload"` is what lets that same-URL navigation run at all, and `runGuardsAndResolvers: "always"` (on every signed-in-only route) is what re-runs `canActivate`. The default, `"paramsOrQueryParamsChange"`, sees no change and never re-runs the guard. `app.routes.spec.ts` covers both halves.

## Directory layout

```
src/
├── main.ts                 # bootstrapApplication
├── styles.scss             # the only global stylesheet: fonts, tokens, preflight patches
├── test-setup.ts           # jsdom shims (ResizeObserver, matchMedia)
├── environments/           # environment.ts / environment.prod.ts
├── testing/                # shared spec fixtures (auth-fixtures.ts); spec-only
└── app/
    ├── app.config.ts  app.routes.ts  app.component.ts
    ├── core/           # the shell and app-wide plumbing
    │   ├── components/ # navigation, toast, spinner, confirm-dialog, app-error
    │   ├── interceptors/
    │   ├── services/   # logger, notification, global-error.handler, theme.store
    │   └── icons.ts
    ├── shared/         # cross-feature, no domain of its own
    │   ├── components/ # ui/ (shadcn-equivalents), forms/, charts/, music/
    │   ├── models/     # DTO + domain types and their mappers
    │   ├── services/   # user.service, music.service, breakpoint, clipboard
    │   ├── utils/  validators/
    ├── auth/           # its own top-level slice: components, models, services, guards
    ├── features/       # the real code, one folder per domain
    │   ├── identification-game/   # the shared game engine + the four definitions
    │   ├── note-game/             # note recognition; composes the engine
    │   ├── sheet-music/           # OSMD wrapper + the two static pages
    │   ├── classes/  dashboard/  friends/  account/
    ├── public/         # home-page, about-page
    └── dev/            # kit-page — the UI-kit showcase, /dev/kit, imported by nothing
```

Where a thing goes:

- **`core/`** — one instance, app-wide, no domain: the nav bar, the toast container, the logger, the global `ErrorHandler`, the HTTP interceptors, the theme store. If two features would fight over it, it belongs here.
- **`shared/`** — used by more than one feature and owns no domain logic: the UI kit, the form primitives, the chart components, `BreakpointService`, and the two data services (`UserService`, `MusicService`) with their DTO/domain models.
- **`auth/`** — a top-level slice rather than a feature, because the guards, the token storage and `AuthStore` are consumed by routing and by `core/`.
- **`features/<name>/{components,models,services}/`** — everything else. Each component lives in its own folder alongside its `.html` and `.spec.ts`. Features reach outside themselves through `@shared`/`@core`; other features reach _in_ only through a barrel where one exists.

Only `identification-game` publishes a barrel, and it publishes **two** entry points:

- **`@features/identification-game`** — components and services. One of them (`QuestionBoardComponent` → `GameStaffComponent` → `SheetMusicComponent`) imports `opensheetmusicdisplay`, a ~1 MB engraver.
- **`@features/identification-game/data`** ([`data.ts`](./src/app/features/identification-game/data.ts)) — the same feature's constants, enums, model types, game definitions and `sanitizeConfig`, reaching no engraver and no Angular component.

Take data from `/data`, components and services from the barrel. The barrel re-exports everything in `/data`, so the wrong import compiles — it just drags OSMD into that chunk, and into jsdom when the importer has a spec.

`src/testing/` is in `tsconfig.spec.json`'s file set and out of `tsconfig.app.json`'s. That is a **convention, not a compile-time barrier** — `exclude` only trims the root file set, and a file reached through an import is still compiled. Today only `.spec.ts` files import from there; keep it that way.

## Reactivity: signals, resources and stores

Three shapes cover all state in this app.

**Server state → `rxResource`.** All 19 resource call sites are in components, never in services, and every one uses `rxResource({ stream })` — services already return Observables and own their mapping, so `httpResource` would bypass the mapper layer and is used nowhere. Resources are per-component-instance state: they do **not** share or dedupe requests across components, and two components reading the same endpoint fire two requests. That is the intended no-cache policy — never add `shareReplay`, a caching service or request dedup to "fix" it.

The canonical template ladder:

```html
@if (classes.status() === "loading") {
<app-spinner />
} @else if (classes.error()) {
<app-error [error]="classes.error()" />
} @else { @for (c of classes.value(); track c.id) {
<app-class-card [class]="c" />
} }
```

Two things in that block were real shipped defects, and both are worth internalising:

- **`status() === "loading"`, not `isLoading()`.** Angular's `resource.isLoading()` is true for `loading` **and** `reloading`, where TanStack Query's `isLoading` was first-load-only. Ported literally, a page gated on it tore its own body down on every refetch — and in `class-detail-page` that destroyed `<app-roster-list>` mid-flight and cancelled the very roster refetch that had triggered it. `isLoading()` is only safe on a resource nothing ever calls `.reload()` on; the moment you add a `.reload()`, switch that template in the same commit.
- **Guard every `.value()` read behind an `error()` arm.** `resource.value()` **rethrows** while the resource is in its error state. Both templates and `computed()`s are read during change detection, so an unguarded read turns a failed fetch into a crashed page — a 500 from `/api/note-game/keyboard-bindings` took the whole game screen down with a `ResourceValueError` instead of costing the player their custom keys. The four data sites that read outside a ladder all spell it `this.x.error() ? fallback : this.x.value()`.

**Mutations → a plain one-shot `.subscribe()`** in the handler. `HttpClient` observables complete after one emission, so there is nothing to unsubscribe: login, signup, `addFriend`, `createClass`, `createAssignment`, `joinClass` and the two score/settings saves are all written this way.

**Nobody writes unsubscribe bookkeeping.** There is no `this.subscription` field and no `takeUntil(this.destroy$)` anywhere. Long-lived streams consumed in code — the keyboard listener, the countdown, the question queue — are piped through `takeUntilDestroyed()` at creation, inside an injection context. There is exactly one hand-written `ngOnDestroy` in the app, and it disposes the OSMD instance, which is what the hook is for.

**Client state → signal stores**, `@Injectable({ providedIn: "root" })` classes exposing readonly signals plus imperative methods. No `BehaviorSubject` state. There are three, and they are not all in one folder:

| Store            | File                                         | Surface                                                                                                                     |
| ---------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `AuthStore`      | `auth/services/auth.store.ts`                | `user`, `token`, `redirectUrl`, computed `isAuthenticated` / `role`; `setAuthFromLogin`, `clear`, `setNotice`, `takeNotice` |
| `ThemeStore`     | `core/services/theme.store.ts`               | `theme` (`"dark" \| "light"`, default dark); `setTheme`, `toggleTheme`                                                      |
| `FriendsUiStore` | `features/friends/services/friends.store.ts` | `isPanelOpen`, `searchQuery`; `togglePanel`, `setSearchQuery`                                                               |

The dividing line: **a store holds client, UI or session state — persisted, cross-cutting, and never reaching the API. A resource holds server state.** `FriendsUiStore` is the clean example: the friends _list_ is an `rxResource` in the panel; only the panel's open/query state is in the store. Persistence in both `AuthStore` and `ThemeStore` is an explicit localStorage read in the constructor plus an `effect()` that writes on change; `AuthStore`'s envelope is kept byte-compatible with the React app's Zustand blob under `tremolo-auth`. `ThemeStore` applies the `dark`/`light` class to `documentElement` synchronously in its constructor, not from the effect, so the theme is right before first paint — which is why `AppComponent` injects it for its constructor alone.

## The identification-game engine

`src/app/features/identification-game/` is a **shared engine** for staff-identification games: the player sees rendered sheet music, taps an answer, and races a timer or a question count. Four games run on it today — key signature, interval, scale and chord — and each one is a single declarative object.

### A game is a `GameDefinition`

The page is the shell, and nothing else:

```ts
// components/key-signature-game-page/key-signature-game-page.component.ts — the whole page
@Component({
	selector: "app-key-signature-game-page",
	imports: [IdentificationGameComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<app-identification-game [definition]="definition" />`,
})
export class KeySignatureGamePageComponent {
	protected readonly definition = keySignatureGame;
}
```

The definition ([`models/game-definition.models.ts`](./src/app/features/identification-game/models/game-definition.models.ts)) declares everything game-specific:

```ts
export interface GameDefinition<T extends GeneratedQuestion, S extends BaseGameSettings, Req = unknown> {
	/** Persistence key: score entries and saved settings both use it. */
	gameType: SettingsGameType;
	title: string;
	description: string;
	defaults: S;
	/** Game-specific settings, rendered by `<app-settings-controls>`. */
	settingsSchema: SettingDescriptor<S>[];
	toRequest: (settings: S) => Req;
	fetchQuestion: (request: Req, music: MusicService) => Observable<T>;
	/** The correct answer for a fetched question. */
	getAnswer: (question: T, settings: S) => string;
	/** Answer buttons; their values must match `getAnswer`'s output. */
	answerOptions: (settings: S) => AnswerOption[];
	/** Tailwind `grid-cols-*` class for the answer pad. */
	columnsClassName?: string;
	/** OSMD zoom for the question display. */
	zoom?: number;
	/** Line between staff and answers, e.g. `"__ Major"`. */
	prompt?: (settings: S) => string;
}
```

A definition is a **plain `.ts` constant** — no component, no decorator, no `inject()`. `defineGame(...)` is an identity helper that gives the module full inference on its object literal. Two fields are load-bearing beyond their signatures:

- **`toRequest` is the queue's reset key.** The queue keys on `JSON.stringify(toRequest(settings))`, so by construction it only resets when a setting that actually changes the payload changes — flipping game mode or a time limit keeps the prefetched questions. Any setting that affects the request **must** flow through here, or the game silently serves questions generated for the previous configuration.
- **`fetchQuestion` returns an `Observable` and takes `MusicService` as an argument.** The Observable is what lets the queue cancel a stale fetch. The argument is not a style choice: the queue calls `fetchQuestion` from inside a `switchMap`, which is not an injection context, and `inject()` there throws **NG0203**. The upside is that a definition can be exercised in a test with a stub and no `TestBed` at all.

`gameType` is `SettingsGameType` — `Exclude<GameType, "note">`, since the note game has its own page _and_ its own settings table.

A real one, trimmed ([`games/interval.game.ts`](./src/app/features/identification-game/games/interval.game.ts)):

```ts
export const intervalGame = defineGame<
	IntervalGameResponse,
	IntervalGameSettings,
	IntervalGameRequest
>({
	gameType: "interval",
	title: "Interval Identification",
	description: "Identify the displayed interval",
	defaults: {
		gameMode: GameMode.Time, timeLimit: 60, noteLimit: 25,
		clefs: ["treble"], displayMode: "harmonic",
		requireQuality: true, intervals: ALL_INTERVALS,
	},
	settingsSchema: [clefsSetting() /* + choice / multiChoice / toggle descriptors */],
	toRequest: (settings) => ({
		clefs: settings.clefs,
		displayMode: settings.displayMode,
		intervals: settings.intervals,
	}),
	fetchQuestion: (request, music) => music.generateIntervalGame(request),
	getAnswer: (question, settings) =>
		settings.requireQuality ? question.interval : String(question.number),
	answerOptions: (settings) => /* AnswerOption[] matching getAnswer's output */,
	columnsClassName: "grid-cols-4 sm:grid-cols-7",
	zoom: 2.0,
});
```

Settings interfaces extend `BaseGameSettings` (`gameMode`, `timeLimit`, `noteLimit`) — the mode/limit UI is built into the shell, so a game never declares those controls. `TIME_LIMITS` and `NOTE_LIMITS` are shared constants and are declared exactly once, in `models/game-state.models.ts`.

`games/index.ts` re-exports the four definitions and adds `GAME_DEFINITIONS: Record<SettingsGameType, AnyGameDefinition>`, a lookup the classes feature uses when it has to resolve a game type at runtime. Every consumer that knows which game it holds keeps the precise type; only the assignment host reads the table.

### The settings framework (`settings/`)

Each game describes its settings as a list of `SettingDescriptor`s ([`models/setting-descriptor.models.ts`](./src/app/features/identification-game/models/setting-descriptor.models.ts)), and the generic `<app-settings-controls>` renders them:

- **`choice`** — single select, rendered as a dropdown, using each option's text `label`.
- **`multiChoice`** — multi-select rendered as toggle chips. Deselecting the last selected option is ignored, so at least one is always active.
- **`toggle`** — boolean rendered as an On/Off chip.

Rich chips are **data, never markup**. `ChoiceOption.glyph` is a discriminated union:

```ts
export type OptionGlyph = { kind: "text" } | { kind: "keySignature"; fifths: number } | { kind: "clef"; clef: StaffClef };
```

`<app-settings-controls>` is the only thing that maps a `kind` to a component, so adding a glyph kind is one union member and one `@case`. (This is why the key-signature game is a `.ts` here where React needed a `.tsx`.) Any game with a `clefs: StaffClef[]` setting drops the shared `clefsSetting()` preset (`settings/presets.ts`) into its schema. Dropdowns ignore glyphs and always show the text label.

The same schema drives **validation of persisted settings**. `sanitizeConfig(schema, raw)` (`settings/sanitize-config.ts`) validates a saved JSON config against the current schema on load: saved configs outlive code — fields get renamed, enum values change — so only keys the schema (or the shared base settings) still knows, with still-valid values, survive. It returns a **patch** applied over the defaults, never a full replacement. It is a verbatim port, body unchanged line for line, because it is the only thing standing between a years-old JSONB blob and a fetcher that would fail on every question.

### The four services

Each is a plain `@Injectable`, and each is **provided per game page or per board** rather than in root — the state is that page's.

| Service                 | Provided by                   | What it owns                                                                         |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| `GameStateService`      | `IdentificationGameComponent` | `Ready → Playing → GameOver`, the answer log, per-question timing, final `GameStats` |
| `GameTimerService`      | `IdentificationGameComponent` | the countdown for a timed game                                                       |
| `QuestionQueueService`  | `QuestionBoardComponent`      | the prefetch buffer                                                                  |
| `GameScoreSaverService` | root                          | persisting a finished game as a score entry, with its two toasts                     |

**`GameStateService`** ([source](./src/app/features/identification-game/services/game-state.service.ts)) is configured once from the page's constructor with `{ settings, onGameStart, onGameEnd, onCorrectAnswer?, statsExtras? }`. Two facts drive the whole loop:

- **The first answer starts the game.** `answer(guess)` moves `Ready → Playing`, stamps `gameStartTime` and fires `onGameStart` — which is where the shell starts the countdown and persists the settings the player is about to play with.
- **The question lives outside the service.** The board renders a question and calls `syncCurrentAnswer(answer)` with the answer that _is_ correct; `answer(guess)` compares against that. In `Notes` mode the service ends the game itself when the answer count hits `noteLimit`; in `Time` mode `GameTimerService.expired` does it.

`endGame` is idempotent, and a guess arriving after `GameOver` is dropped — together those make "the score saves exactly once" a property of the machine rather than of the timer's internals. Its arithmetic (npm, accuracy, `limit`) is ported line for line and pinned by fixtures, because it is the number users see and the number that reaches `note_game_entries`. The service is deliberately **not generic**: it reads only `gameMode` and the two limits, and anything game-specific reaches the final stats through `statsExtras`.

**`GameTimerService`** is one signal plus `interval(1000)` under `takeUntilDestroyed`. `start(seconds)` / `stop()` / `reset()` / `format(seconds)`, and an `expired: Observable<void>` that fires once per countdown. Clearing `isRunning` before emitting is what makes expiry fire exactly once — the flag feeds the `switchMap` that owns the interval, so the interval is torn down before any subscriber reacts.

**`GameScoreSaverService`** is root-provided and shared by the shell _and_ the note game. It is a no-op for anonymous players (all five game routes are public), exposes a `saveError` signal that results screens read, and back-computes `timeInSeconds` for a questions-mode game from the rate. React's TanStack cache invalidation has no port: `rxResource` does not cache, so the dashboard and the student's assignment list refetch on their next load without being told.

### The question queue

[`QuestionQueueService`](./src/app/features/identification-game/services/question-queue.service.ts) is a prefetch buffer so the next question appears instantly after an answer — the score is questions-per-minute, so fetch latency lands directly in the player's rating. It is **not a cache**: nothing is ever served twice.

```ts
export const QUEUE_LOW_WATER = 2;
export const HYDRATE_BATCH = 2;
export const RESET_DEBOUNCE_MS = 300;

export interface QuestionQueueConfig<TRequest, TQuestion> {
	/** Normally `computed(() => toRequest(settings()))`. Keyed by JSON.stringify. */
	request: Signal<TRequest>;
	/** Gate: nothing is fetched until the display can draw. */
	enabled: Signal<boolean>;
	fetch: (request: TRequest) => Observable<TQuestion>;
}

class QuestionQueueService<TQuestion> {
	readonly isInitializing: Signal<boolean>;
	get size(): number; // tests/diagnostics
	connect<TRequest>(config: QuestionQueueConfig<TRequest, TQuestion>): void;
	pop(): TQuestion | null;
}
```

`connect()` is called once, from an injection context. Everything after is signal-driven; there is no other method.

React hand-rolled three mechanisms with refs. Here each one **is an operator**, and that redesign is the point — do not reintroduce generation counters:

- **`switchMap` on the keyed payload is the stale-response guard.** A new payload unsubscribes everything the old one had open, including a low-water refill in flight, so a late response cannot land in the new queue.
- **A cancellable `timer` is the reset debounce**, with the first emission exempt: `switchMap((v, index) => index === 0 ? of(v) : timer(RESET_DEBOUNCE_MS)…)`. A burst of settings clicks costs one reset, not one per click, but the first hydration fires immediately — otherwise the player stares at an empty staff for 300 ms on every page load.
- **`exhaustMap` is the one-hydration-at-a-time guard**, over `merge(of(initial), refill$)`.

Two details that a test pins and a refactor would quietly break. The buffer is **discarded the moment the payload changes, before the debounce** (`tap(() => this.discard())`) — deferring it to when the debounce fires leaves a 300 ms window in which `pop()` still hands out a question generated for the settings the player just changed. And `refill$` is a plain `Subject<void>`, deliberately not a signal: it is an _event_, and a signal read through `toObservable` would replay its current value into the next generation.

Partial batch failure is survivable by design: `forkJoin` with a per-call `catchError` means the successes queue, one toast fires, and the observable **never errors** — which is what guarantees `isInitializing` always clears.

### The board and the shell

`QuestionBoardComponent` provides the queue, owns the load loop, and projects whatever answer UI its parent gives it (which is how the note game reuses it in spirit while projecting a keyboard grid instead of a pad). **The load trigger is the answer count**: answer a question and an `effect` pops the next one, draws it through `<app-game-staff>`, and emits `questionLoaded` with the answer that is now correct. Everything else the effect reads is a gate, and `getAnswer` — whose identity changes on every settings click — is read through `untracked`. That is this port's version of React's `settingsRef`, and it is what stops a settings click burning a prefetched question. A draw failure is not a dead end: `loadError` flips, the board shows the answer as large text, and the answer is still reported.

`IdentificationGameComponent` is the shell, and it is generic in `<T, S, Req>` so `[definition]="keySignatureGame"` fixes all three at the binding and `settings` really is that game's settings type inside the class. It holds the settings (`linkedSignal(() => this.definition().defaults)`), the settings dialog, the score bar, the answer pad and the game-over card, and it wires `GameStateService` to `GameTimerService.expired` and `GameScoreSaverService`.

### Settings persistence

- **On game start** (the first answer), an authenticated player's settings are persisted as a JSONB `config` via `UserService.saveGameSettings` (`game_settings` table in the Go service). Only the keys present in `defaults` are written, so stray state can never leak into the saved config. `e2e/specs/settings.spec.ts` pins this timing on purpose — a port that saved on every click would pass the spec while hammering the API. A failed save only logs: a game that cannot save its settings is still perfectly playable.
- **On page load**, an `rxResource` fetches the saved config and `hydrateSettings()` applies it **exactly once** (a `hydrated` boolean guards it), run through `sanitizeConfig` first. Applying it through the normal settings signal is what makes `toRequest` — and therefore the queue's key — see it.
- **In assignment mode** (`[assignment]="{ id, config }"`), settings come from the assignment's frozen config instead, the save-back is suppressed — playing an assignment must not overwrite what the student chose for themselves — and the finished attempt is tagged with the assignment id. `AssignmentGameHostComponent` binds this for all five games.

### Recipe: adding a new identification game

Using "triad spelling" as a stand-in name:

1. **Python endpoint** — add `POST /music/triad-game` to the music service (model in `music-api/models.py`, logic in `services/music_service.py`, route via the `run_game_endpoint` helper in `routers/api.py`) returning `{ generatedXml, ...answer fields }`, plus tests.
2. **TS types + service method** — add the request/response types to `shared/models/music.models.ts` and a `generateTriadGame(request): Observable<TriadGameResponse>` method on `MusicService` (`shared/services/music.service.ts`). Any music21 note names convert **there**, at the boundary.
3. **Game definition** — create `features/identification-game/games/triad.game.ts`: a settings interface extending `BaseGameSettings`, then `defineGame({...})` with `defaults`, `settingsSchema`, `toRequest`, `fetchQuestion`, `getAnswer`, `answerOptions`. Reuse `clefsSetting()` if the game has clefs.
4. **Register it** — export the definition and its settings type from `games/index.ts`, and add it to `GAME_DEFINITIONS` if it should be assignable by a teacher.
5. **Thin page** — `features/identification-game/components/triad-game-page/triad-game-page.component.ts`, whose template is `<app-identification-game [definition]="definition" />`.
6. **Route** — a `loadComponent` entry in `src/app/app.routes.ts`. Public, like the other four.
7. **Nav link** — add to `gameLinks` in `core/components/navigation/navigation.component.ts` (it needs a `description`; the Games dropdown shows it).
8. **Game type id** — add `"triad"` to the `GameType` union in `shared/models/game.models.ts` **and** to `ValidGameTypes` in `core-api/DTOs/game_types.go`. The Go service rejects unknown types for both entries and settings.

That's it — settings UI, JSONB persistence, sanitization, scoring, prefetching and game flow all come free from the definition. If the new page component ever grows a branch, something game-specific has leaked out of the definition.

## The note game

`features/note-game/` is the original game. It keeps its own page, its own components and its own typed persistence, but its core **composes** the engine rather than forking it — after the Phase 5/6 merge that is literal, not aspirational.

- **`NoteGameService`** (`services/note-game.service.ts`) injects `GameStateService` — the same machine the four identification games run on — and adds exactly three things: the note game's settings, marimba feedback on a correct answer (`NoteAudioService`, via the engine's `onCorrectAnswer`), and physical keyboard input (`noteKeyboardInput`, with user-customizable bindings edited in the bindings dialog and persisted through `/api/note-game/keyboard-bindings`). There is no second state machine; every other method forwards. React's `onGameStart`/`onGameEnd` props became `started` / `ended` `Subject`s, and because `Subject.next` is synchronous, `started` still fires _inside_ the first answer.
- **The settings live in `NoteGameService`, not in the engine.** That is what lets `GameStateService` stay non-generic and be shared by five games; the note game's `scale` reaches the final stats through `statsExtras`.
- **`NoteGamePageComponent`** provides `[GameStateService, NoteGameService, GameTimerService]`, hydrates settings and key bindings from two `rxResource`s, and swaps between the settings bar, the score bar and the results screen.
- **`NoteStaffComponent`** provides its own `QuestionQueueService` and draws through the engine's `<app-game-staff>` — the OSMD half is not ported a second time. What stays note-game-specific is the settings-to-request mapping, the huge single-letter text fallback and the sizing the two board layouts need.
- `NoteGameResultsComponent` reuses the engine's `GameOverCardComponent`; the settings bar imports its constants from `@features/identification-game/data`. Scores save through the shared `GameScoreSaverService`.
- **`noteKeyboardInput`** attaches the `keydown` listener only while input is enabled (`switchMap` over an `enabled` signal), so `preventDefault()` is called only for keys the game actually consumes and the page's own keyboard behaviour is untouched while a dialog is open.

**Audio is the Web Audio API with no dependency.** `use-sound` is a React hook and could not come along; `howler` was evaluated and declined, because what the game asks of it is one line — play one of twelve preloaded mp3s at volume 0.5. The twelve files are _fetched_ eagerly but _decoded_ lazily, so the `AudioContext` is constructed inside the user gesture that is the first correct answer; each play gets a fresh `AudioBufferSourceNode`, so fast answers layer rather than cut off; and jsdom's missing `AudioContext` degrades to a no-op instead of throwing.

**The staff range picker.** Instead of a scale/octave dropdown, players drag two whole notes on a rendered staff to set the practice range. The math is in `models/range.utils.ts`: endpoints are natural (white-key) notes addressed by a diatonic index (`C0 = 0, D0 = 1, … B0 = 6, C1 = 7, …`), one index step being one staff position. The picker supports `RangeClef = "treble" | "bass"` only — a deliberate subset of the seven-clef `StaffClef` union the identification games use.

**Persistence** is a **typed** row (`note_game_settings`), unlike the engine's schemaless JSONB. `octave` is read and written but never acted on: it rides through so a row written before the range picker existed still loads, and the low/high range is what actually plays.

## API layer conventions

All HTTP goes through Angular's `HttpClient`. There is no axios and no client wrapper: **routing to the right backend happens by construction**, at the service, because each service interpolates its own base URL.

```ts
private readonly base = environment.coreApi;   // or environment.musicApi
```

### Interceptors (`core/interceptors/`)

Registered in `app.config.ts` in this order, and the order is deliberate — `authInterceptor` runs first and attaches the bearer token; `refreshInterceptor` sits closer to the backend, so the 401 it catches is the one the token failed on, and its retry re-attaches the refreshed token itself.

- **`auth.interceptor.ts`** — three guards and no RxJS: skip unless `isCoreApiRequest(req.url)`, skip if there is no access token, otherwise clone with `Authorization: Bearer <token>`. React had one axios instance per backend; Angular has one `HttpClient`, so the test has to be explicit. **The music service is unauthenticated and must never see the token.**
- **`refresh.interceptor.ts`** — catches a _recoverable_ 401 (an `HttpErrorResponse`, status 401, main API, and **not** a session endpoint), refreshes, and retries the original request with the new token. Concurrent 401s all `switchMap` onto one shared refresh, so N failures cause exactly one `POST /api/auth/refresh`:

  ```ts
  refresh$ ??= authService.refreshToken().pipe(
  	tap({
  		error: () => {
  			/* logout + navigate to /login */
  		},
  	}),
  	shareReplay(1),
  	finalize(() => (refresh$ = null)),
  );
  ```

  `??=` is the dedup and `shareReplay(1)` replays the token to latecomers; **`finalize` is what keeps this from being a cache** — it drops the shared observable the instant the refresh settles, so the replayed token can never be handed to a _later_ 401. This is the one sanctioned `shareReplay` in the app: request dedup, not caching. On refresh failure it logs out, clears `redirectUrl` and navigates to `/login` — replacing React's `auth:logout` window event. Note where the injections happen: `AuthService`, `AuthStore` and `Router` are injected in the interceptor **body**, not inside `catchError`, whose callback runs outside the injection context where `inject()` throws NG0203.

- **`api-url.ts`** — **not an interceptor**; it is the pair of predicates both interceptors ask. `isCoreApiRequest(url)` tests `environment.coreApi.length > 0 && url.startsWith(environment.coreApi)` — the length guard is load-bearing, because production ships `coreApi: ""` and every URL `startsWith("")`. `isSessionEndpoint(url)` matches `/api/auth/{login,register,refresh,google/callback}`; a 401 from one of those is a rejected credential, not an expired session. Getting that wrong is the React bug the E2E suite documents, where a wrong password surfaced as "Please log in again". `/api/auth/me` and `/api/auth/google/link` are deliberately _not_ in the list.

### Services

Data services return **`Observable<T>`** — never a bare value, never a Promise. Cancellation, retry and piping all depend on it.

- **`shared/services/user.service.ts`** — the Go main API: profile, dashboard charts, score entries, game settings, keyboard bindings. Its `getOrNull<T>` helper normalises "nothing saved yet" arriving two ways — a 404, or a 200 carrying `{"settings": null}` — into `null`, while re-throwing everything else so a real 500 still reaches `rxResource`'s `error()` instead of masquerading as "no settings".
- **`shared/services/music.service.ts`** — the Python music API. No auth, and a 10 s `timeout`.
- **`shared/services/breakpoint.service.ts`** — three `matchMedia` queries as signals (`isMobile`, `isDesktop`, `isPhoneLandscape`), mutually exclusive with phone-landscape winning, so a game page can swap layout variants rather than hide one with CSS. Root-provided.
- **`shared/services/clipboard.service.ts`** — deliberately _not_ root-provided, so two join-code buttons on one page do not light up together.

### DTO ↔ domain mapping

Mappers are plain exported arrow functions, co-located in the `*.models.ts` file that declares both shapes (`shared/models/game.models.ts`, `shared/models/user.models.ts`, `auth/models/user.mapper.ts`, `features/classes/models/classes.mappers.ts`). Each file declares the wire shape (`*Dto`, snake_case, exactly what `core-api/DTOs/` serialises) and the domain shape (camelCase, what the app reads).

**The service layer is the boundary: nothing above `shared/services/` ever sees a snake_case key.** React mapped inside the TanStack fetch function; with that hook layer gone the mapping moved down into the service:

```ts
getProfile(userId: number): Observable<UserProfile> {
	return this.http
		.get<GeneralUserInfoDto>(`${this.base}/api/users/${userId}/general-info`)
		.pipe(map(mapGeneralUserInfo));
}
```

Three things deliberately keep their wire spelling, and rewriting them would break saved rows:

- **`GameType`'s values.** `"key_signature"` is an identifier the Go service validates against `dtos.ValidGameTypes` and that rides in a query string — data, not a property name. The union is `"note" | "key_signature" | "scale" | "chord" | "interval"`, declared in `shared/models/game.models.ts`.
- **`KeyBindings`' keys.** It is a dictionary keyed by note name (`key_c_sharp` → `"w"`), not a record with fields, and the note game looks entries up by name. The enclosing DTO/domain pair still converts (`key_bindings` → `keyBindings`); only the inner keys are exempt.
- **`GameSettings.config`.** An opaque JSONB blob whose keys belong to the game that wrote it — camelCase for the identification games, snake_case for the note game. The Go side only checks "JSON object ≤ 4 KB"; `sanitizeConfig` on the frontend validates the contents on the way back in.

### Notation conversion

The Python service speaks music21, which spells flats with `-` (`"B-"`); the UI spells them with `b` (`"Bb"`). `shared/utils/music.mapper.ts` owns the conversion (`fromMusic21NoteName` / `toMusic21NoteName`) and **`MusicService` is the only caller** — it applies it on every request and response field that carries a note name. Feature code never sees a `-`, and no component re-converts.

## Sheet music rendering (OSMD)

`features/sheet-music/` holds one wrapper and one card, and the split is load-bearing.

**`<app-sheet-music>`** ([`components/sheet-music/sheet-music.component.ts`](./src/app/features/sheet-music/components/sheet-music/sheet-music.component.ts)) is the OSMD lifecycle wrapper. It renders **one `<div>`** and nothing else — no card, no spinner, no error panel — because its three callers draw different chrome. Its host is `display: contents`, so a `class` written on `<app-sheet-music>` styles nothing; use `containerClass`.

| Member                            | Kind   | Notes                                                                                                                                                     |
| --------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zoom`                            | input  | default `1`. Changing it sets `osmd.zoom` and re-renders **in place** — the score stays loaded, nothing refetches.                                        |
| `options`                         | input  | `IOSMDOptions \| undefined`. Passed to the OSMD constructor and **read once**, when the instance is created; later changes do not re-create it.           |
| `ariaLabel`                       | input  | default `"Sheet music display"`. Pass `"Music staff"` on a game board — `e2e/support/app.ts` finds the staff by `/^(Music staff\|Sheet music display)$/`. |
| `containerClass`                  | input  | default `""`. Classes for the container div; the host has no box of its own.                                                                              |
| `renderComplete`                  | output | `void`, after `render()` returns.                                                                                                                         |
| `renderError`                     | output | `Error`, for every failure `error` also records.                                                                                                          |
| `loadAndRender(musicXml: string)` | method | `Promise<void>` that **never rejects** — a failure sets `error`, emits `renderError` and resolves. Branch on the signal or the output, not on a `try`.    |
| `clear()`                         | method | `osmd.clear()` + resets `error`. Keeps the instance for the next load; does **not** touch `isLoading`.                                                    |
| `isLoading`                       | signal | true between the start of `loadAndRender` and its settling.                                                                                               |
| `error`                           | signal | `Error \| null`; cleared by `loadAndRender` and `clear`.                                                                                                  |
| `instance`                        | getter | `OpenSheetMusicDisplay \| null` — engraving rules, `setOptions`, reading the drawn SVG. **null until the first `loadAndRender`.**                         |

The instance is created lazily on the first `loadAndRender` and disposed in `ngOnDestroy` — the one legitimate use of that hook in the app, and there is no subscription in the file.

**The `ResizeObserver` redraw is a fix, not a port.** OSMD reads the container's `clientWidth` when it renders and writes it onto the `<svg>`; a container that is `display: none` at that instant gets `width="0"` and stays blank after it is shown again. React's card hid the container while `isLoading` was true, and whether the hide landed before OSMD's async `load()` resolved was a race — the React app produced `width="0"` on the 1st and 3rd generation and a correct 908 px staff on the 2nd. So `draw()` renders, and if the container had no width it attaches a **one-shot** `ResizeObserver` that renders once more when it gets one. The observer is torn down by `clear()` and `ngOnDestroy`.

**`<app-sheet-music-display>`** is the declarative card: error panel, spinner over a 400 px skeleton, container hidden while either shows. Inputs `musicXml` (required) and `className`; it loads whenever `musicXml` changes. The two static pages (`/sheet-music`, `/convert`) use it. Callers that drive OSMD imperatively — the game boards, which pop from a prefetch queue — use `<app-sheet-music>` directly.

**`<app-game-staff>`** (`features/identification-game/components/game-staff/`) is the game-side reuse, and it wraps `<app-sheet-music>` rather than constructing OSMD itself, so the zero-width fix, the disposal and the never-rejects contract all come for free. It adds what a _game_ needs: the `compacttight` drawing parameters with title/credits/part names/measure numbers/time signatures off, zero page and system margins, dark-mode recolouring, and a `centre()` pass that reads the drawn SVG's `getBBox()` after a frame and uses it as the `viewBox`, so one measure sits centred and large regardless of container size. Its public surface is `loadNote(musicXml)`, `clear()`, and the `isReady` / `error` signals the board gates on. Toggling the theme re-colours and re-renders the **existing** instance rather than tearing it down — a teardown would reset the question queue and lose the current question.

Generated questions arrive as **single-measure MusicXML** by design: each is one self-contained prompt (a note, a chord, an interval, one octave of a scale, or a bare key signature) produced by music21, and the display crops and centres exactly one system.

## Styling

`src/styles.scss` is the only global stylesheet and the app's only standalone style file; every component's styles are inline `styles:` strings. It self-hosts both fonts (`@fontsource-variable/inter`, `@fontsource-variable/bricolage-grotesque` — these were `import`s in React's `main.tsx`, and an Angular `.ts` entry point cannot import CSS), pulls in Tailwind's three layers, and declares the light and dark token sets as bare HSL triplets consumed as `hsl(var(--x))`. Dark mode is class-based (`darkMode: ["class"]`), driven by `ThemeStore` putting `dark`/`light` on `documentElement`. [`DESIGN.md`](./DESIGN.md) is the source of truth for what the tokens _mean_; this file is where they live.

Three Angular-specific traps are worth knowing before you write a class.

**Tailwind runs with `important: "html"`.** Angular injects each component's styles into `<head>` **after** `styles.scss`, as `[_nghost-…] { … }` — the same specificity as a class — so a third-party component that styles its own host beats the utility you wrote on it. `@ng-icons` does exactly that (`:host { width: var(--ng-icon__size, 1em) }`), which made every one of the **47** `<ng-icon class="h-N w-N">` call sites render at 1em: the nav bar measured 14–16 px against React's 16–24 px. The selector strategy emits `html .h-6 { … }` — one extra element of specificity, `(0,1,1)`, and **no `!important` anywhere**, so inline styles and genuine `!important` rules still win exactly as they did in React. Don't remove it, and don't "fix" an icon size with `!important`. A second mechanism is also live: `<ng-icon size="1.25rem">` sets `--ng-icon__size` directly, and it is the only thing sizing the two auth-page logos, which carry a `size=` and no class. Where a call site has both, keep them in step (`h-3`/0.75rem, `h-4`/1rem, `h-5`/1.25rem, `h-6`/1.5rem, `h-8`/2rem).

**A component host defaults to `display: inline`, which has no box worth laying out.** Most components here set `:host { display: block }` explicitly (or `flex`, as `QuestionBoardComponent` does). Forgetting it silently eats `space-y-*` gaps.

**A `display: contents` host swallows margins, so `space-y-*` does nothing at all.** 27 components use `display: contents` on purpose — `<app-button>` renders a real `<button>` and the host disappearing is what makes that button, not a wrapper, the flex item its parent lays out, keeping the ported markup pixel-identical. But `space-y-*` works by putting `margin-left`/`margin-top` on `> * + *`, which _is_ that host, and margins on a `display: contents` box are ignored. The nav bar's `space-x-2` silently dropped 8 px per control; `/sheet-music`'s button column stacked flush and came out 32 px short. **Use `flex flex-col gap-*` on the parent instead.** The same disappearing box means a `class` written on such a host styles nothing: kit components (`<app-button>`, the `appCard*` directives) take a **`className`** input, which runs the caller's classes and the base list through `cn()` (tailwind-merge) the way React's parts did.

## Testing

**Unit tests** run on vitest through the Angular builder. The config is the `test` architect target in [`angular.json`](./angular.json) — again, **there is no `vitest.config.ts`**:

```json
"test": {
	"builder": "@angular/build:unit-test",
	"options": {
		"buildTarget": "tremolo-frontend:build:development",
		"tsConfig": "tsconfig.spec.json",
		"runner": "vitest",
		"isolate": true,
		"setupFiles": ["src/test-setup.ts"]
	}
}
```

**`"isolate": true` is load-bearing.** The builder's own default is `false`, which gives every spec file a worker picks up one shared module registry — so a third-party module is evaluated once per _worker_, whichever spec is scheduled first decides what binding every later spec in that worker sees, and a `vi.mock()` in a spec that is not first silently does nothing. That is what made `sheet-music-display.component.spec.ts` fail about one full-suite run in four once four more specs began importing `SheetMusicComponent`. With isolation on, each spec gets its own registry and its own mocks always apply.

There are **63 spec files** (33 under `features/`, 12 under `shared/`, 9 under `auth/`, 5 under `core/`, plus the app root and the two public pages). They are written against **`TestBed`**, not Testing Library: `@testing-library/angular` is a declared devDependency but is imported by zero files in `src/`, and the `render(...)` helpers that appear in about a dozen specs are local functions each spec defines over `TestBed.createComponent` + `componentRef.setInput` + `await fixture.whenStable()`. Component specs that need inputs usually declare an inline host `@Component`. Vitest globals are ambient via `"types": ["vitest/globals"]` in `tsconfig.spec.json`, so specs do not import `describe`/`it`/`expect`.

[`src/test-setup.ts`](./src/test-setup.ts) is the single seam for global test configuration. `@angular/build:unit-test` initializes the TestBed itself, so all it holds are two jsdom shims, both `??=`-assigned so a spec can override them: a `ResizeObserverStub` (exported, records instances and exposes `fire()`, since jsdom reports `clientWidth: 0` for everything and the real observer would never be exercised) and a `matchMedia` stub whose queries all report `false` — which is `BreakpointService`'s own initial state, and the same viewport the golden E2E specs run at. `src/testing/auth-fixtures.ts` holds the two shared fixtures: `snapshots(url)` for guard specs and `signIn(store, role)`.

**E2E is a parity harness**, not a normal suite. One Playwright suite runs against two apps: it was written against the React app in Phase 0 and proved green there, and `E2E_BASE_URL` is the only thing that changes. **A spec that has to be edited to pass on Angular is a behaviour change** and gets recorded as a deviation in `.migration/STATE.md`. Both backends must be up (Go on `:5001`, Python on `:8000`); the specs seed users, classes and assignments through the Go API rather than the UI.

- `e2e/specs/` — six golden flows, `--project=golden`: `navigation` (every route resolves for the role allowed to see it), `auth`, `classes` (teacher creates, student joins, student plays), `friends-and-theme`, `games` (each of the five games played to game over with a score saved), `settings` (settings persist across reload, and a game saves on _first answer_, not on click).
- `e2e/support/` — `api.ts` (the seeding client) and `app.ts` (**the only place locators live**). The harness's one rule: select only by role, accessible name or visible text. Never a CSS class, a DOM structure or a test id — that constraint is what lets the suite run unmodified against both apps. If a control cannot be reached that way, give it an accessible name in the app.
- `e2e/routes.ts` — the 20 routes with their access level, shared by the navigation spec and the baselines so they cannot drift.
- `.migration/baselines/` — **80 PNGs**, 20 routes × 2 viewports (1280×800, 390×844) × 2 themes, captured from the **React** app. They are migration state rather than test fixtures, which is why they live under `.migration/`. `maxDiffPixelRatio` is `0.01`: fonts and the Tailwind config carried over verbatim, so a real port lands within antialiasing noise and a large diff is a finding. The staff region is masked on every route that draws one (the music is randomly generated); that it rendered at all is asserted in `specs/games.spec.ts`.

A non-cosmetic detail in `support/app.ts`: answers are paced at 1200 ms because the Go service types notes-per-minute as `int8`, so answering at machine speed produces a rate above 127, the JSON bind fails 400, and the score is silently lost.

## Known deliberate deferrals

Accepted duplication and legacy, kept intentionally — don't "fix" these in passing without checking the trade-off.

- **`NoteStaffComponent` vs `QuestionBoardComponent`.** Both own a queue and the pop → draw → report loop. They stay separate because of the note game's fixed three-row `NoteButtonGrid` with keyboard-binding hints and its dedicated phone-landscape board, which the generic board doesn't support. The OSMD half is _not_ duplicated — both draw through `<app-game-staff>`.
- **`GameOverCardComponent` vs `NoteGameResultsComponent`.** The engine's card is simple stats; the note game's results screen adds a chart and richer detail — and it composes the card rather than replacing it. Unifying them is deferred.
- **Note game `octave`.** Kept in `GameSettings` and the `note_game_settings` row purely for saved-settings compatibility. The low/high note range supersedes it and is what actually plays.
- **`GameState.Settings`.** Carried over from React and deliberately unused: the shell has always started at `Ready` with the board live behind the settings dialog.
- **No per-component error boundary.** Angular has none, and the decision was to accept a single global `ErrorHandler` at coarser granularity. A feature that owns a contained failure renders it from an explicit error signal instead — the sheet-music card's error panel and the question board's text fallback are both that pattern.
- **`src/app/dev/kit-page/`** — the UI-kit showcase behind `/dev/kit`. Unguarded, imported by nothing, and removable by deleting that folder plus its one route entry.
