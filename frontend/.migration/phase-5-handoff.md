# Phase 5 handoff — identification-game engine

Built 2026-08-20 in an isolated worktree off `feature/angular-migration`
at **`10cfbfb`** (Phase 3 `done`, Phase 4 `done`). Commit range
**`fd84777..ab2e6ff`**, plus the one commit that pins these hashes — the
same shape as Phase 1's `c410602`. Not pushed.

The four identification games are playable, from their own routes and from
an assignment. `classes.spec.ts` is **4 / 4** for the first time in the
migration — Phase 3's single residual is closed.

---

## 1. What exists now

```
src/app/features/identification-game/
├── index.ts                        ← the barrel; shared constants live here
├── game.utils.ts                   ← NATURAL_NOTES, formatTimeLength
├── models/
│   ├── game-state.models.ts        ← GameMode, GameState, NoteAnswer,
│   │                                 GameStats, BaseGameSettings,
│   │                                 GeneratedQuestion, TIME_LIMITS,
│   │                                 NOTE_LIMITS
│   ├── setting-descriptor.models.ts← OptionGlyph, ChoiceOption,
│   │                                 SettingDescriptor
│   └── game-definition.models.ts   ← AnswerOption, GameDefinition, defineGame
├── games/
│   ├── key-signature.game.ts  interval.game.ts  scale.game.ts  chord.game.ts
│   └── index.ts                    ← + GAME_DEFINITIONS lookup
├── services/
│   ├── question-queue.service.ts   (+ spec, 9 tests)
│   ├── game-state.service.ts       (+ spec, 18 tests)
│   ├── game-timer.service.ts       (+ spec, 7 tests)
│   └── game-score-saver.service.ts (+ spec, 8 tests)
├── settings/
│   ├── sanitize-config.ts          (+ spec, 5 tests — ported verbatim)
│   ├── settings-controls.component.ts
│   ├── game-mode-limit-controls.component.ts
│   ├── setting-chip.component.ts
│   └── presets.ts                  ← clefsSetting()
└── components/
    ├── identification-game/        ← the shell (.ts + .html)
    ├── question-board/             ← queue + load loop
    ├── game-staff/                 ← OSMD, configured for a game
    ├── answer-pad/  score-bar/  game-over-card/
    ├── clef-glyph/  key-signature-glyph/
    └── {key-signature,interval,scale,chord}-game-page/
```

Touched outside the feature:

- `shared/services/music.service.ts` — the four game endpoints.
- `features/classes/components/assignment-game-host/` — the stub, replaced.
- `features/classes/models/game-definitions.ts` — `defaultAssignmentConfig`
  now reads the definitions instead of a copied table.
- `features/classes/components/assignment-play-page/…spec.ts` — drains the
  game's prefetch before `verify()`; one assertion strengthened.
- `src/test-setup.ts` — a `matchMedia` stub beside the `ResizeObserver` one.

**`e2e/`, `.migration/baselines/` and `frontend-react/` are byte-untouched
across the whole range** (`git log 10cfbfb..HEAD --` over those paths is
empty, and so is `git status` on them).

---

## 2. The final `GameDefinition` interface, verbatim

Phase 7's docs update depends on this. From
`models/game-definition.models.ts`, comments included:

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
	/**
	 * Maps settings to the request payload.
	 *
	 * **The question queue keys on `JSON.stringify(toRequest(settings))`**,
	 * so by construction it only resets when a setting that actually changes
	 * the payload changes -- mode and limit tweaks keep the prefetched
	 * questions. Any setting that affects the request MUST flow through
	 * here, or prefetched questions go stale.
	 */
	toRequest: (settings: S) => Req;
	/**
	 * Fetches one question.
	 *
	 * The music service arrives as an argument rather than through
	 * `inject()`, because the prefetch queue calls this from inside a
	 * `switchMap` -- not an injection context, where `inject()` throws
	 * NG0203 (the same trap Phase 1 hit in `catchError`, STATE.md 1/1).
	 * Passing it also means a game definition can be exercised in a test
	 * with a stub and no TestBed at all.
	 */
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

export function defineGame<
	T extends GeneratedQuestion,
	S extends BaseGameSettings,
	Req,
>(definition: GameDefinition<T, S, Req>): GameDefinition<T, S, Req> {
	return definition;
}
```

**Three fields differ from React**, all of them D9 / D5:

| React | Here | Why |
| ----- | ---- | --- |
| `prompt?: (s) => React.ReactNode` | `prompt?: (s) => string` | PLAN.md §5.7. The shell interpolates it. |
| `ChoiceOption.render?: React.ReactNode` | `ChoiceOption.glyph?: OptionGlyph` | §5.7's discriminated union. **This is the whole reason `keySignature.tsx` was a `.tsx`.** |
| `fetchQuestion: (req) => Promise<T>` | `fetchQuestion: (req, music) => Observable<T>` | D5, plus the injection-context problem in §5 below. |

The glyph union, in full:

```ts
export type OptionGlyph =
	| { kind: "text" }                                  // the default; omit it
	| { kind: "keySignature"; fifths: number }
	| { kind: "clef"; clef: StaffClef };
```

`<app-settings-controls>` is the **only** thing that maps a `kind` to a
component. Adding a glyph kind is one union member and one `@case`.

`gameType` is `SettingsGameType` (`Exclude<GameType, "note">`), not React's
`GameSettingsRequest["game_type"]` — same set, and it is the name Phase 3
already gave it in `shared/models/game.models.ts`.

---

## 3. The queue service's API

`services/question-queue.service.ts`, `@Injectable()` — **provided per game
board** (`QuestionBoardComponent.providers`), never in root. It is D8, not a
cache: nothing is ever served twice, and D6's no-dedup rule is about
`rxResource`, not this.

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
	get size(): number;                                    // tests/diagnostics
	connect<TRequest>(config: QuestionQueueConfig<TRequest, TQuestion>): void;
	pop(): TQuestion | null;
}
```

`connect()` is called once, from an injection context. Everything after is
signal-driven; there is no other method.

**The three hand-rolled mechanisms, as operators** (this is the §5.5
redesign, not a translation):

| React | Here |
| ----- | ---- |
| `generationRef` stale-response guard | `switchMap` on the keyed payload. A new payload unsubscribes everything the old one had open — including a low-water refill in flight. |
| `setTimeout` reset debounce + `hasHydratedRef` | `switchMap((v, index) => index === 0 ? of(v) : timer(300)…)`. First emission immediate, later ones cancellable — `debounceTime` with the first exempted. |
| `inflightRef` | `exhaustMap` over `merge(of(initial), refill$)`. |

`refill$` is a plain `Subject<void>`, deliberately not a signal: it is an
*event*, and a signal read through `toObservable` would replay its current
value into the next generation. PLAN.md §5.6 rules out `BehaviorSubject`
*state*, which this is not.

Partial batch failure is React's `Promise.allSettled` contract kept exactly:
`forkJoin` with a per-call `catchError`, so the successes queue, one toast
fires, and the observable **never errors** — which is what guarantees
`isInitializing` always clears.

---

## 4. What Phase 6 can reuse

The note game "composes the engine" in React (`useNoteGame` delegates to
`useIdentificationGame`). Everything it delegated to has a port, and none of
it is identification-specific:

| Need | Use | Notes |
| ---- | --- | ----- |
| Ready→Playing→GameOver, answer log, scoring | `GameStateService` | **Non-generic on purpose.** It reads only `gameMode`/`timeLimit`/`noteLimit`; the note game's own settings reach it through `statsExtras`, which is where React put `scale`. Provide it per page. |
| Countdown | `GameTimerService` | `remaining`/`isRunning` signals, `expired` observable, `format()`. Provide per page. |
| Score entry + toasts | `GameScoreSaverService` | Root-provided. `save(stats, gameType, assignmentId?)`. Already handles `gameType: "note"`. |
| Prefetch buffer | `QuestionQueueService` | The note game has its own queue in React (`features/note-game`); it does not need a second one. Provide it wherever its board lives. |
| **OSMD configured for a game** | **`GameStaffComponent`** | `compacttight`, zero margins, dark-mode recolour, `getBBox`→`viewBox` centering. This is the port of `features/note-game-display/` (both files). **Do not port that React class again.** Inputs `zoom`, `padding`, `ariaLabel`; API `loadNote(xml)`, `clear()`, `isReady`, `error`. |
| Staff + load loop + text fallback | `QuestionBoardComponent` | Answer UI is `<ng-content />`, so the note game projects its keyboard grid where the identification games project the answer pad. |
| Results screen | `GameOverCardComponent` | Three projection slots — `[gameOverSections]`, `[gameOverSummary]`, `[gameOverActions]` — which are React's `children` / `summaryExtras` / `actions`. The recent-games chart and save status go in the first two. `rateLabel` and `unit` inputs cover "Notes Per Minute" / "notes". |
| Live score | `ScoreBarComponent` | Both React layouts, including the phone-landscape sidebar. |
| Mode + limit UI | `GameModeLimitControlsComponent` | Pass `unit="notes"`; the button and label then read "Notes", which is what `e2e/support/app.ts` clicks for `kind: "note"`. |
| Saved-config validation | `sanitizeConfig` | The note game persists to a **typed table**, not JSONB, so it may not need this. |

**Shared constants — import from `@features/identification-game`, do not
redeclare** (`frontend/CLAUDE.md`): `TIME_LIMITS`, `NOTE_LIMITS`,
`NATURAL_NOTES`, `CLEF_UNICODE`, `CLEF_LABELS`, plus `GameMode`,
`GameState`, `NoteAnswer`, `GameStats`, `BaseGameSettings`,
`GeneratedQuestion`, `formatTimeLength`.

Two concrete things Phase 6 owes:

1. **`assignment-game-host.component.ts`'s `@default` branch** still renders
   the placeholder notice. Replace it with the note game page in assignment
   mode. The four identification branches show the shape.
2. **`classes/models/game-definitions.ts`'s `NOTE_DEFAULTS`** is the last
   copied default table. Phase 5 replaced the other four with reads of the
   definitions; do the same for the note game.

Also useful: `MusicService` still lacks `/note-game`. Add it in the same
shape as the four here, converting `scale` out with `toMusic21NoteName` and
`noteName` back with `fromMusic21NoteName` — **in the service, nowhere
else** (`grep -rn "Music21NoteName" src/app` must stay at four files).

---

## 5. Deviations

| # | What the plan/React said | What was done | Why |
| - | ------------------------ | ------------- | --- |
| 1 | Worktree rule: base on `feature/angular-migration` | The worktree came up on bare `main` (`b2a52b7`); reset onto `10cfbfb` | The trap the task warned about, and the third time it has bitten (3.4 and Phase 4 before it). `origin/feature/angular-migration` is *behind* the local branch by one commit and does **not** contain `10cfbfb` — resetting onto the origin ref as literally instructed would have missed Phase 3's completion. |
| 2 | Packet: routes "via `identification-game.routes.ts`" | The four routes stay inlined in `app.routes.ts`; no such file | R5. Phase 1 declared them there and `app.routes.spec.ts` drives that table. A lazy child route file would buy nothing — each page is one component, already lazily loaded. |
| 3 | React: `fetchQuestion: (request) => Promise<T>` | `(request, music) => Observable<T>` | The Observable half is D5. The *argument* is forced: the queue calls this inside a `switchMap`, where `inject()` throws NG0203 — Phase 1's `catchError` finding (STATE.md 1/1) in a new place. A definition is a module-level constant with no injector of its own. |
| 4 | `useIdentificationGame` owned the settings state | `GameStateService` does not; the page does | The page needs settings anyway for `toRequest`, `answerOptions` and `prompt`. Keeping them there is what lets the service stay **non-generic**, which is what makes it reusable by Phase 6 without a generic-DI cast. The hook owned them only because that is how hooks compose. |
| 5 | React's `endGame` had no re-entry guard | `endGame` is idempotent | React relied on the timer's ref-mirroring — which the packet forbids porting — plus the assumption that the questions-mode branch and the timer never both fire. One line makes save-exactly-once a property of the machine. Three specs pin it. |
| 6 | `useGameLifecycle`'s `endGameRef` | Not ported | It existed only to break a circular hook dependency. Two services and an `expired` observable have no cycle. |
| 7 | Phase 4 handoff §4: the game OSMD display is "Phase 6's input" | Built here, as `GameStaffComponent` | Phase 5's `QuestionBoard` needs it first. Recorded so Phase 6 reuses it rather than porting `features/note-game-display/` a second time. |
| 8 | React's `QuestionDisplay` **removes** the staff container on a render error | It stays mounted and is hidden with `invisible` (visibility, not display) | React's version leaves `useNoteGameDisplay`'s OSMD instance pointing at a detached div, so a game never recovers from one bad MusicXML until remount. Keeping the box also avoids the zero-width trap Phase 4 fixed (its F1). Error path only; no baseline photographs it. |
| 9 | React wrapped the board in `ComponentErrorBoundary` + `GameBoardFallback` | Not ported | Phase 2 §5 recorded the decision: global `ErrorHandler`, coarser granularity accepted. |
| 10 | React's `useSaveGameOnEnd` invalidated three TanStack caches on success | No port | `rxResource` does not cache (D6), so the dashboard and the assignment list refetch on their next load. The policy working, not a dropped feature. |
| 11 | Phase 3 left `defaultAssignmentConfig()` reading a copied `DEFAULTS` table | The four identification entries now read each definition's own `defaults` | `game-definitions.ts`'s own header asked Phase 5 to do this. `game-definitions.spec.ts` needed no change — it asserts values, and the values are identical. |
| 12 | Nothing about jsdom's `matchMedia` | Stubbed in `src/test-setup.ts` | `BreakpointService` builds three media-query lists in its constructor, so **any** spec whose tree reaches a game board, the score bar or the nav bar threw on injection. Same class as the existing `ResizeObserver` stub. Every query reports `false`, which is `BreakpointService`'s own initial state. |
| 13 | `assignment-play-page.component.spec.ts` verified an empty backend | It now drains music-service requests before `verify()` | The host renders a real game, and a real game prefetches two questions. Draining them keeps `verify()` meaning "no stray *assignment* request". The two unknown-game-type tests are untouched. |
| 14 | React's `SettingsControls` read `option.render` directly | The schema is normalised into view rows first | An optional `glyph?.kind` does not narrow in a `@switch`, and `@if (fifths; as f)` would **silently drop the natural key**, whose `fifths` is `0`. The normalisation is what makes the union safe in a template. |
| 15 | PLAN.md §4 draws the feature as `{components,games,settings,services,models}` | Plus `game.utils.ts` and `index.ts` at the feature root | Mirrors React's own `utils.ts` and `index.ts`, and adds no folder. |
| 16 | React's `GameOverCard` took three `ReactNode` props | Three `<ng-content select="[…]">` slots | Same three seams; the note game fills them in Phase 6. |

---

## 6. Verification actually run

### Gates — all four exit 0

```
npm run build         exit 0   (no warnings)
npm run lint          exit 0   (--max-warnings 0)
npm run test:run      exit 0   439 tests, 54 files   (was 394 in 49)
npm run format:check  exit 0
```

**+45 tests in 5 new files.** The new files are the four service specs
(9 + 18 + 7 + 8 = 42) and `sanitize-config.spec.ts` (5); the play-page spec
gained none but changed two lines, and the arithmetic works out because
`assignment-play-page.component.spec.ts` already counted 6.

Required tests from the packet, all present and all green:

| Requirement | Where |
| ----------- | ----- |
| Queue **resets** on a payload-affecting change | `question-queue.service.spec.ts` — "resets and refetches when a payload-affecting setting changes" |
| Queue **does not reset** on mode/limit change | same file — "does not reset when a setting leaves the payload unchanged" |
| Stale in-flight response dropped after a reset | same file — "drops a response still in flight when the payload changes" |
| Low-water refill triggers | same file — "refills when a pop drops the buffer below the low-water mark" (+ the negative case on an empty buffer) |
| State machine transitions | `game-state.service.spec.ts` — five tests under "the state machine" |
| Scoring math against fixtures | same file — six tests under "scoring", exact numbers with the clock held still |
| `sanitizeConfig` suite (ported) | `sanitize-config.spec.ts` — all five React cases, unchanged |
| **Game end saves exactly once** | three places: `game-state.service.spec.ts` "ending exactly once" (3 tests), `game-timer.service.spec.ts` "fires expired exactly once at zero, and stops", `game-score-saver.service.spec.ts` "saves exactly once…" |

Also pinned: first hydration skips the debounce; a burst of payload changes
costs one reset; partial batch failure keeps the successes and toasts once;
nothing fetches until enabled.

### E2E — unmodified specs, `E2E_BASE_URL=http://localhost:4300`

`ng serve` from this checkout; `/proc/342128/cwd` confirmed to be this
worktree's `frontend/` before anything was believed (Phase 4's env note).
Go on `:5001`, Python on `:8000`. `/tmp/tremolo-port-4300.lock` held for the
run and released after.

| Spec | Result | The residual |
| ---- | ------ | ------------ |
| `games.spec.ts` | **4 / 6** | Both failures are the **note game** — "plays the note game to game over" and "renders a staff on every game", which iterates `/note-game` first and never reaches the four that work. **Phase 6's.** |
| `settings.spec.ts` | **2 / 3** | The one failure is "the note game remembers its scale". **Phase 6's.** |
| `classes.spec.ts` | **4 / 4** | — |
| `navigation.spec.ts` | **21 / 21** | — |
| `auth.spec.ts` | **5 / 5** | — |
| `friends-and-theme.spec.ts` | **4 / 4** | — |

**All four identification games play end to end and their scores reach the
database.** `games.spec.ts` asserts that against `GET /api/note-game/recent`
per `game_type`, not against the results screen, so the four passes are
proof the entry landed — which is also the packet's "play each of the four
games end-to-end against live backends", done mechanically rather than by
hand.

`classes.spec.ts` **4 / 4 is the headline**: test 4 was the single residual
Phase 3 shipped with, and STATE.md attributes it to "a missing answer pad,
not a plumbing error. Phase 5's." It now plays the assignment's frozen
key-signature game to Game Over and records the attempt.

### Screenshots — 20 / 20 within threshold

`e2e/baselines.spec.ts` cannot report these: it asserts hard per route and
all four of its passes abort at `/`, whose redirect target is the note game.
A scratch sweep reproduced it exactly — same mask (`staff(page)`), same
`settle`, same `maxDiffPixelRatio: 0.01`, same `.migration/baselines/` path,
same seeding — with a soft assertion so one run reports every shot. The
scratch directory was deleted afterwards and never committed.

| Route | desktop light | desktop dark | mobile light | mobile dark |
| ----- | ------------- | ------------ | ------------ | ----------- |
| `key-signature-game` | pass | pass | pass | pass |
| `interval-game` | pass | pass | pass | pass |
| `scale-game` | pass | pass | pass | pass |
| `chord-game` | pass | pass | pass | pass |
| `assignment-play` | pass | pass | pass | pass |

**The `assignment-play` row is the meaningful one.** Phase 3 recorded those
four shots as *failing* — "the baseline photographs React playing a
key-signature game; Angular photographs the deferred-game stub, and the page
is 32px shorter for exactly that reason. Phase 5 owns it." They now pass
against the same untouched PNGs, which is both the fix and the evidence that
the sweep really compared rather than re-recording.

`.migration/baselines/` is byte-untouched: `git status` on it is empty and
so is `git log 10cfbfb..HEAD --` over it.

### Hygiene

- `shareReplay` still appears as **code** only in `refresh.interceptor.ts`
  (D6). No caching service, no dedup layer. The prefetch queue is D8 and is
  the §5.5 operator shape, not a cache — it buffers *unseen* questions and
  never serves one twice.
- No `@NgModule`, no `zone.js`. No stored `Subscription`, no
  `.unsubscribe()`, no `takeUntil(destroy$)` — the only `takeUntil*` hits
  are `takeUntilDestroyed`. The only `ngOnDestroy` in `src/` is still
  `SheetMusicComponent`'s.
- Every `.subscribe()` added by this phase is either a one-shot `HttpClient`
  call (settings save, score save) or piped through `takeUntilDestroyed`
  (the timer's `expired`, the queue's driver stream).
- **No dependency was added** (R6 not exercised). `package.json` is
  untouched.
- No JSX-shaped data anywhere in `games/`: all four definitions are `.ts`,
  and `grep -rn "ReactNode\|\.tsx" src/app/features/identification-game`
  returns only prose in comments explaining what was removed.

### The `isLoading()` requirement

STATE.md's standing requirement: adding a `.reload()` to any of the five
listed resources obliges switching that template to
`status() === "loading"` in the same commit.

**Nothing in this phase calls `.reload()`.** The shell's one resource
(`savedSettings`) is params-driven, is read only through `value()`, and
gates no template. `assignment-play-page.component.html:1` — site 4 on that
list, and the one STATE.md called "Phase 5's first file" — still gates on
`assignments.isLoading()` and is **left exactly as Phase 3 wrote it**,
because nothing reloads `assignments`. The natural temptation it warned
about ("reload the assignment after an attempt is saved") was deliberately
not taken: `rxResource` does not cache, so returning to `/assignments`
refetches anyway, which is what `classes.spec.ts` test 4 asserts and what it
now passes on.

---

## 7. Things a reader should know

- **`GAME_DEFINITIONS`** (`games/index.ts`) is a `Record<SettingsGameType,
  AnyGameDefinition>` whose values are cast through `unknown`. It exists for
  *lookup only* — `defaultAssignmentConfig()` is its one consumer. The four
  triples of type parameters cannot be unified any other way. Everything
  that knows which game it holds keeps the precise type, including the
  assignment host, which is why that host is a four-branch `@switch` and not
  a table read: a concrete binding is what lets the compiler check each
  definition against the generic shell.
- **The shell is a generic component** and Angular's template type checker
  handles it: `[definition]="keySignatureGame"` really does fix `T`, `S` and
  `Req` at the binding. This was the main design risk and it did not bite.
- **`getAnswer` is read through `untracked()`** in the board. That is
  React's `settingsRef` in Angular clothing: `getAnswer` closes over the
  settings and so changes identity on every settings click, and a tracked
  read would re-run the load effect and burn a prefetched question per
  click.
- The **`Settings` member of `GameState`** is carried over unused, as in
  React — the shell has always started at `Ready` with the board live behind
  the dialog.
- `e2e/support/app.ts` pace: 1200ms between answers, because the Go DTO
  types `notes_per_minute` as `int8`. Nothing in the app enforces that, so a
  fast human could still lose a score to a 400. Out of scope (the Go service
  is not touched by this migration) but worth Phase 7 knowing.

---

## 8. Ledger line for `STATE.md`

> | 5 | Identification-game engine | built | 2026-08-20 | `fd84777..ab2e6ff` (this pin commit follows) | Engine redesigned as Angular/RxJS per PLAN.md §5.5–§5.7, not translated: the queue's `generationRef` is `switchMap`, its debounce a cancellable `timer` with the first emission exempt, its `inflightRef` an `exhaustMap`; constants preserved (low water 2, batch 2, 300ms). All four games playable from their routes and from an assignment; `keySignature` is a `.ts` and no JSX-shaped data is left in `games/`. build/lint/test:run/format:check all exit 0 — **439 tests in 54 files** (+45 in 5 new files). Parity, unmodified: `classes.spec.ts` **4/4** — Phase 3's single residual, closed; `navigation` 21/21, `auth` 5/5, `friends-and-theme` 4/4; `games.spec.ts` **4/6** and `settings.spec.ts` **2/3**, every residual the note game and so **Phase 6's**. Screenshots **20/20** across the four game routes and assignment-play, at two viewports and both themes, staff masked — including the four `assignment-play` shots Phase 3 recorded as failing against the deferred-game stub. 16 deviations below. `e2e/`, `.migration/baselines/` and `frontend-react/` byte-untouched. **Not to be marked `done`** — a verifier owns that. |

---

## 9. Fix addendum — verifier finding F1 (2026-08-21)

The Phase 5 verifier held the phase at `built` on one blocking finding:
`npm run test:run` failed about one run in four, always the same four tests
in Phase 4's `sheet-music-display.component.spec.ts`, whose
`vi.mock("opensheetmusicdisplay")` intermittently did not apply. This
addendum records the root cause as it was actually established, the fix, and
the proof. **Nothing outside test configuration changed** — no product code,
no `e2e/`, no baselines.

### The flake, reproduced first

Twelve serial `npm run test:run` executions on `155650f`, nothing else
running: **9 green, 3 red** (runs 6, 9 and 12), every failure the same four
tests. That is the verifier's number, reproduced exactly.

### Root cause

Two things had to be true at once, and Phase 5 supplied the second.

**1. The test runner shares one module registry per worker.**
`@angular/build:unit-test` runs vitest with **`isolate: false`** — its own
default, and the builder says why in
`node_modules/@angular/build/src/builders/unit-test/runners/vitest/plugins.js`:

```js
// Default to `false` to align with the Karma/Jasmine experience.
isolate: false,
```

Under that default, every spec file a worker picks up shares one module
graph. A module is therefore evaluated **once per worker**, and whichever
spec file reaches it first fixes the binding for every spec that follows it
in that worker. A `vi.mock()` in a spec that is not first silently does
nothing, because there is nothing left to intercept.

**2. Phase 5 gave four non-mocking specs a static import of the real OSMD.**
Deviation 11 pointed `defaultAssignmentConfig()` at each definition's own
`defaults`, which added one line to `features/classes/models/game-definitions.ts`:

```ts
import { GAME_DEFINITIONS } from "@features/identification-game";
```

That barrel re-exports `GameStaffComponent`, which imports
`SheetMusicComponent`, which imports `opensheetmusicdisplay`. At `f022dfd`
(immediately pre-merge) `game-definitions.ts` imported nothing but a type,
and the **only** spec files whose graphs reached `opensheetmusicdisplay`
were the two that mock it. After the merge there are six:

| Spec | Mocks OSMD? | How it reaches the module |
| ---- | ----------- | ------------------------- |
| `sheet-music.component.spec.ts` | yes | directly |
| `sheet-music-display.component.spec.ts` | yes | via `sheet-music.component.ts` |
| `game-definitions.spec.ts` | **no** | `game-definitions.ts` → barrel → `GameStaffComponent` |
| `assignment-play-page.component.spec.ts` | **no** | same, via the page |
| `class-detail-page.component.spec.ts` | **no** | same, via `class-assignments-list` |
| `create-assignment-dialog.component.spec.ts` | **no** | same |

So the outcome became a scheduling lottery: if one of the four non-mocking
specs was the first file in that worker to touch the chain, the worker's
single evaluation of `sheet-music.component.ts` bound the **real** library,
and the display spec's fake was never used.

### How it was proved, not inferred

A temporary probe recorded, on the shared `globalThis`, the `.name` of the
`OpenSheetMusicDisplay` binding each time `sheet-music.component.ts` was
evaluated, and the display spec printed the array. Across six full-suite
runs the array had **length 1 every time** — one evaluation per worker, as
predicted — and its contents tracked the outcome exactly:

```
run 1 RED   :: [DIAG] osmd loads: ["w"]            <- minified real OSMD
run 2 green :: [DIAG] osmd loads: ["FakeOsmd2"]
run 3 green :: [DIAG] osmd loads: ["FakeOsmd2"]
run 4 green :: [DIAG] osmd loads: ["FakeOsmd2"]
run 5 green :: [DIAG] osmd loads: ["FakeOsmd2"]
run 6 RED   :: [DIAG] osmd loads: ["w"]
```

`w` is the real library's minified class; `FakeOsmd2` is esbuild's name for
the display spec's own fake. Red runs are exactly the runs where the real
class won the race. The probe was reverted; `git status` is clean of it.

### Two candidate fixes that were tried and rejected

- **Stubbing `SheetMusicComponent`/`GameStaffComponent` in the play page's
  TestBed.** This cannot work, and it is worth writing down so nobody tries
  it again: a TestBed override replaces a component in a *template*, long
  after the spec's `import` graph has been evaluated. The module — and with
  it the real `opensheetmusicdisplay` — is loaded either way. It also would
  have addressed only one of the four non-mocking specs.
- **Hoisting one shared `FakeOsmd` and its `vi.mock` into `src/test-setup.ts`.**
  Built and measured: **still red** (`1 failed | 53 passed`), and the probe
  said why. Setup files are modules too, so under `isolate: false` the setup
  module is cached and its body runs **once per worker** (`setup run #1`,
  fifteen times, once per worker — never `#2`). Its `vi.mock` registration
  is therefore live for the worker's *first* spec file only. Reverted.

### The fix

One line, in the test target of `angular.json`:

```json
"isolate": true,
```

This is the builder's own supported option for exactly this. With isolation
on, each spec file gets its own module registry, so a spec's `vi.mock()`
always applies before that spec's imports are evaluated — the race is not
won more reliably, it no longer exists. Both sheet-music specs are left
**byte-identical**; the fix is deliberately not spread across six spec files
that would each have to keep agreeing with the others forever.

`angular.json` cannot hold a comment, so the reasoning lives at the top of
`src/test-setup.ts` — the file the option names — with a pointer back here.

Cost, stated plainly: the suite goes from ~6s to ~9s wall clock (54 files,
439 tests). Bought with that: determinism, and the same protection for every
future module-level mock rather than for this one library.

**Not taken (Phase 6's call, and product code, so out of scope here):**
`game-definitions.ts` needs `GAME_DEFINITIONS`, not `GameStaffComponent`.
Deep-importing `@features/identification-game/games` instead of the feature
barrel would stop four specs pulling a 1 MB music engraver into jsdom at
all. That is a real cleanup, but it narrows the blast radius rather than
removing the hazard, and it is not what F1 asked for.

### Proof

**Twelve consecutive `npm run test:run` executions, serially, nothing else
running** (no concurrent build — the verifier documented CPU contention as a
false-failure source):

| Run | Result | Run | Result |
| --- | ------ | --- | ------ |
| 1 | 54 files / 439 tests passed | 7 | 54 / 439 passed |
| 2 | 54 files / 439 tests passed | 8 | 54 / 439 passed |
| 3 | 54 files / 439 tests passed | 9 | 54 / 439 passed |
| 4 | 54 files / 439 tests passed | 10 | 54 / 439 passed |
| 5 | 54 files / 439 tests passed | 11 | 54 / 439 passed |
| 6 | 54 files / 439 tests passed | 12 | 54 / 439 passed |

**12 green in 12.** Three further runs were re-run capturing `npm`'s own
exit status rather than the pipeline's: `exit=0`, `exit=0`, `exit=0`.

Single files, in isolation, three times each:
`sheet-music-display.component.spec.ts` **5/5, 5/5, 5/5**;
`assignment-play-page.component.spec.ts` **6/6, 6/6, 6/6**.

Gates: `npm run build`, `npm run lint` and `npm run format:check` all exit
0. Test count is unchanged at **439 in 54 files** — this fix adds no test
and deletes none. An `--isolate` run also emits **zero** `stderr` blocks,
where a red run under the old default emitted real-OSMD XHR failures and
`NG0953` warnings.

No E2E was run: this is a unit-test determinism fix and it touches nothing
the browser sees.
