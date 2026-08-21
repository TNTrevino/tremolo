# frontend — agent notes

Angular 22 SPA: standalone components, **zoneless** change detection, signals
for state, RxJS for streams. **Read `ARCHITECTURE.md` here before structural
changes** — it documents the game engine, the API layer and the rendering
layer in full. For any visual or styling work, `DESIGN.md` is the source of
truth (ink/paper/brass tokens; brass is scarce; `--accent` is a hover wash,
never emphasis). `CLASSES_FRONTEND.md` covers the teacher tier.

This app was migrated from React in 2026. Most files carry a
`Port of frontend-react/src/...` provenance comment; that tree was deleted in
the cutover and is recoverable from git history at the commit before
`chore: delete the React app`. The full record — plan, phase ledger,
deviations, parity report — is in `.migration/`, and the Playwright suite in
`e2e/` was captured against React and is the regression suite now.

## Invariants

- **Identification games are declarative data.** A game is a `GameDefinition`
  in `features/identification-game/games/` — a plain `.ts` constant, no
  component, no decorator. Add capability by extending the definition
  (settings schema, `toRequest`, answers), never by editing the shared shell
  or engine. The interface, verbatim from `models/game-definition.models.ts`:

  <!-- prettier-ignore -->
  ```ts
  export interface GameDefinition<
  	T extends GeneratedQuestion,
  	S extends BaseGameSettings,
  	Req = unknown,
  > {
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

  Two things about `fetchQuestion` are load-bearing. It returns an
  **`Observable`**, not a promise, so the queue can cancel it. And it takes
  `MusicService` as an **argument** rather than calling `inject()`: the queue
  invokes it inside a `switchMap`, which is not an injection context, and
  `inject()` there throws NG0203. The upside is that a definition can be
  exercised in a test with a stub and no `TestBed` at all.

- **The question queue keys on `JSON.stringify(toRequest(settings))`.** That
  is what makes it reset only when a setting that actually changes the payload
  changes — mode and limit tweaks keep the prefetched questions. Any setting
  that affects the request MUST flow through `toRequest`, or prefetched
  questions go stale and the game shows answers for the previous
  configuration. The queue is an RxJS pipeline, not hand-rolled bookkeeping:
  `switchMap` on the keyed payload is the stale-response guard, a cancellable
  `timer(RESET_DEBOUNCE_MS)` with the first emission exempt is the reset
  debounce, and `exhaustMap` is the in-flight guard. Don't reintroduce refs or
  generation counters.

- **Settings render from the schema.** Chips and dropdowns come from the
  `SettingDescriptor` list; persisted JSONB configs are validated by
  `sanitizeConfig` on load. A new setting needs a descriptor and a default —
  nothing else. Option glyphs are the `OptionGlyph` discriminated union
  (`{ kind: "text" | "keySignature" | "clef" }`), never markup;
  `<app-settings-controls>` is the only thing that maps a `kind` to a
  component, so a new glyph kind is one union member and one `@case`.

- **Barrel vs data entry point.** `@features/identification-game` exports
  components and services, and one of them reaches `opensheetmusicdisplay`, a
  ~1 MB engraver. `@features/identification-game/data` exports the same
  feature's constants, enums, model types and game definitions and reaches no
  engraver. **Take data from `/data`; take components and services from the
  barrel.** Importing `TIME_LIMITS` from the barrel works — it re-exports
  everything — but it drags OSMD into the bundle chunk, and into jsdom when
  the importer has a spec.

- **Shared constants live once**: `TIME_LIMITS`/`NOTE_LIMITS`,
  `NATURAL_NOTES`, `CLEF_UNICODE`/`CLEF_LABELS`. They are declared under
  `features/identification-game/` and imported from
  `@features/identification-game/data`. Don't redeclare them.

- **Notation converts at the API boundary only.** `shared/utils/music.mapper.ts`
  turns music21's `"-"` flats into the UI's `"b"`, and only
  `shared/services/music.service.ts` may call it. Feature code never sees a
  `"B-"`, and no component re-converts. Page code holds `"Bb"` and the
  service converts on the way out.

- **The note game composes the engine, it does not fork one.**
  `NoteGameService` owns the settings, the audio and the keyboard stream and
  forwards everything else to `GameStateService` — the same machine the four
  identification games run on. Its range picker supports `RangeClef`
  (treble/bass) only, and `octave` in its saved settings is legacy
  persistence: the range is what plays, the octave is inert.

## Angular rules that were learned the hard way

Each of these was a shipped defect during the migration. They are not style
preferences.

- **`status()`, not `isLoading()`.** Angular's `resource.isLoading()` is also
  true while _reloading_, unlike TanStack Query's first-load-only flag. A
  template that branches on it destroys its children mid-refetch and cancels
  their in-flight requests. Write `@if (x.status() === "loading")`.
  `isLoading()` is safe only on a resource that never reloads.

- **Guard every `resource.value()` behind an `error()` arm.** Reading
  `.value()` on a resource whose fetch failed **rethrows** the error, which
  takes the whole page down rather than showing a panel. The shape is:

  <!-- prettier-ignore -->
  ```html
  @if (thing.status() === "loading") {
  	<app-spinner />
  } @else if (thing.error()) {
  	<app-error [error]="thing.error()" />
  } @else if (thing.value(); as value) {
  	…
  }
  ```

  A `computed()` that reads `.value()` needs the same guard as a template
  does — the throw does not care where it happens.

- **Nobody writes unsubscribe code.** There is no `this.subscription` field,
  no `takeUntil(this.destroy$)`, and no unsubscribe bookkeeping in this
  codebase. Three shapes cover everything: don't subscribe at all
  (`rxResource` / `toSignal` own the subscription and tear it down with the
  component); pipe long-lived streams consumed in code — keyboard input,
  timers — through `takeUntilDestroyed()` at creation, inside an injection
  context; and use a plain `.subscribe()` in the handler for one-shot actions
  like a login submit or a score save, since `HttpClient` observables complete
  after one emission. A hand-written `ngOnDestroy` that unsubscribes, or a
  stored `Subscription` field, is a review flag. (`ngOnDestroy` for non-RxJS
  teardown — disposing the OSMD instance — is legitimate; there is exactly one
  in the app.)

- **Tailwind runs with `important: "html"`.** This lives in
  `tailwind.config.js`, which cannot hold a comment where you would look for
  it, so: Angular injects component styles _after_ `styles.css` at equal
  specificity, which means a third-party component's own stylesheet beats
  every utility class you put on its element. Without this setting all 47
  `<ng-icon>`s rendered at 1em. It is a selector strategy — one extra element
  of specificity, `(0,1,1)` — and adds **no** `!important` anywhere, so inline
  styles and real `!important` rules still win exactly as they did in React.
  Don't remove it, and don't "fix" an icon size with `!important`.

- **Component hosts need an explicit display.** Angular's default is
  `display: inline`, which silently eats every `space-y-*` gap; most
  components here set `:host { display: block }`. Where a host is
  `display: contents` (the two dialogs), it takes no margin either, so
  `space-y-*` does nothing at all — use `flex flex-col gap-*` around kit
  components.

## Conventions

- Feature-folder layout under `src/app/features/<feature>/{components,models,services}`;
  cross-cutting code in `src/app/core/` and `src/app/shared/`; aliases
  `@app/ @core/ @shared/ @features/` (no `baseUrl` — TypeScript 6 errors on
  it). Routes are all inlined in `src/app/app.routes.ts`; there are no
  `*.routes.ts` files.
- Data services return `Observable<T>`. Reads go through `rxResource` /
  `httpResource`; mutations are a one-shot `.subscribe()`.
- snake_case stops at the mapper. The exceptions are deliberate and
  documented: `GameType` values, `KeyBindings` keys and the contents of
  `GameSettings.config` keep their wire spelling, because they are data rather
  than property names and rewriting them would break saved rows.
- Hard tabs (Prettier). ESLint runs with `--max-warnings 0`.
- The unit-test config lives in `angular.json` under `@angular/build:unit-test`
  — there is **no** `vitest.config.ts`. `"isolate": true` there is load-bearing:
  the builder defaults it to `false`, which gives every spec in a worker one
  shared module registry, and a `vi.mock()` in a spec that is not first
  silently does nothing.

## Adding an identification game

1. Python: a `/music/<name>-game` endpoint (`backend/music/`).
2. Angular: a `GameDefinition` in `features/identification-game/games/`,
   exported from `games/index.ts`; a thin page component; a route in
   `app.routes.ts`; a nav link.
3. Register the id in three places: `backend/main/DTOs/game_types.go`
   (`ValidGameTypes`), the `GameType` union in
   `@shared/models/game.models`, and — if it should be assignable —
   `GAME_DEFINITIONS`.

Settings UI, JSONB persistence, saved-config sanitization, scoring and the
whole game flow come from the definition. Don't touch shared code.

## Workflow

```bash
export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
npm run test:run     # ng test, single run
npm run lint         # ng lint --max-warnings 0
npm run build        # ng build (type errors fail it)
npm run format:check
```

Node 24 is not optional: Angular 22 accepts `^22.22.3 || ^24.15.0 || >=26.0.0`
and `.nvmrc` pins 24. The suite is green — treat any failure as real.
