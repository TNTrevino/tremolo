# Phase 6 handoff — Note game

Status: **built**. `npm run build`, `npm run lint`, `npm run test:run` and
`npm run format:check` all exit 0 — **510 unit tests in 58 files**, up from
394 in 49.

**Built in a parallel worktree, in parallel with Phase 5.** The branch is
`worktree-agent-abb9039f68e79fc92`, based on `feature/angular-migration` at
`10cfbfb` (Phase 3 done, Phase 4 merged). Phase 5 — the identification-game
engine this feature is supposed to compose — was being built at the same time
in another worktree and could not be imported. **§3 is the map the merge
integrator needs**: which files are Phase-5-shaped stand-ins, what each one
should become, and how much has to change.

**§4 is the audio decision** (PLAN.md §2's last deferred item) with its R6
evidence.

---

## 1. What exists now

Everything under `frontend/src/app/features/note-game/`, plus three edits
outside it.

| Area | Files |
| ---- | ----- |
| **Data** | `models/engine.models.ts` (**the Phase-5 seam**), `models/note-game.models.ts`, `models/range.utils.{ts,spec.ts}`, `models/keymap.{ts,spec.ts}` |
| **Engine (seam)** | `services/identification-game.engine.{ts,spec.ts}`, `services/question-queue.{ts,spec.ts}`, `services/game-timer.service.{ts,spec.ts}`, `services/save-game-on-end.service.{ts,spec.ts}` |
| **Phase 6's own layer** | `services/note-game.service.ts`, `services/keyboard-input.{ts,spec.ts}`, `services/note-audio.service.{ts,spec.ts}`, `services/note-queue.ts` |
| **Screens** | `components/{note-game-page,note-game-board,note-staff,note-button-grid,score-bar,game-over-card,note-game-results,settings-bar,mobile-settings-drawer,note-range-setting,staff-range-picker,keyboard-bindings-editor,keyboard-bindings-dialog}/` |
| **Outside the feature** | `shared/services/music.service.ts` (+ spec) — `generateNoteGame`; `shared/components/ui/select.component.ts` — a `className` input; `src/test-setup.ts` — a `matchMedia` stub |

`app.routes.ts` was **not** touched: it already lazy-loads
`note-game-page.component` by path, and the Phase 1 placeholder was replaced
in place.

Commit range: `896c1a3..9027339` (this handoff's own commit follows).

| Commit | What |
| ------ | ---- |
| `896c1a3` | the data layer and the Phase-5 seam file |
| `23a88ef` | `MusicService.generateNoteGame` |
| `f79a746` | engine, queue, timer, save-on-end, audio, keyboard input |
| `04cc2dc` | the eleven components and the page |
| `08feb72` | the page spec (legacy `octave`) + the `matchMedia` stub |
| `3b5c995` | `NATURAL_NOTES` imported into the bindings editor |
| `9027339` | the results `Score:` line as one exact text node (§9.1) |

---

## 2. The shape of it

```
NoteGamePageComponent                     providers: [NoteGameService,
  ├─ NoteGameService  ────────────────────            GameTimerService,
  │    ├─ IdentificationGameEngine  (SEAM)            SaveGameOnEndService]
  │    ├─ NoteAudioService          (mine)
  │    └─ noteKeyboardInput()       (mine)
  ├─ GameTimerService               (SEAM)
  ├─ SaveGameOnEndService           (SEAM)
  ├─ rxResource: note-game settings + keyboard bindings
  └─ template
       ├─ <app-settings-bar>  or  <app-score-bar>   (the status bar)
       ├─ <app-note-game-board[-landscape]>
       │     ├─ <app-note-staff>  ──  QuestionQueue (SEAM) + <app-sheet-music>
       │     └─ <app-note-button-grid>
       └─ <app-note-game-results>  ──  <app-game-over-card> (SEAM)
```

The loop, unchanged from React:

1. `<app-note-staff>` mounts, flips its ready flag, and the queue hydrates
   two questions.
2. It pops one, renders the MusicXML, and emits `questionLoaded` with the
   answer; the page forwards that to `NoteGameService.syncCurrentNote`.
3. The player answers — a click on the pad, or a key. The engine records it
   against the note on the staff, plays a marimba note if it was right, and
   the answer count moves.
4. The count changing is what pops the next question. Under the low-water
   mark the queue refills in the background.
5. The limit (or the countdown) ends the game; `onGameEnd` posts the score
   once; the results screen replaces the board.

---

## 3. The Phase-5 seam — what the merge integrator has to do

`frontend/CLAUDE.md`: *"the note game composes the engine: `useNoteGame`
delegates to `useIdentificationGame` and layers audio and keyboard input on
top."* That composition is intact — `NoteGameService` owns no state machine of
its own; every method on it forwards to `IdentificationGameEngine`. What is
*not* intact is that the engine is Phase 6's copy rather than Phase 5's,
because Phase 5 did not exist yet.

### 3.1 The one file that carries every shared name

**`models/engine.models.ts`.** Every engine-owned symbol the note game needs
is declared there, under its exact React name, and **every note-game file
imports them from that one file**. Nothing else in the feature declares them —
`grep -rn "NATURAL_NOTES\s*=\|TIME_LIMITS\s*=\|NOTE_LIMITS\s*=\|CLEF_UNICODE\s*=\|CLEF_LABELS\s*=" src/app/features/note-game/`
returns three hits, all in that file.

**At merge, replace its body with re-exports from Phase 5's barrel.** Nothing
else changes:

```ts
export {
	GameMode, GameState, TIME_LIMITS, NOTE_LIMITS, NATURAL_NOTES,
	CLEF_UNICODE, CLEF_LABELS, formatTimeLength,
} from "../../identification-game";
export type {
	NoteAnswer, GameStats, BaseGameSettings, GeneratedQuestion,
} from "../../identification-game";
```

| symbol | React source | note |
| ------ | ------------ | ---- |
| `GameMode`, `GameState` | `shared/types/game.types.ts` | **shipped as a const object + union type, not a TS `enum`.** `GameMode.Time` reads the same at every call site, and the value is the `"time"` / `"notes"` string the wire already carries. If Phase 5 shipped enums, the two are *not* interchangeable in a type position — reconcile to one. |
| `NoteAnswer`, `GameStats` | `shared/types/game.types.ts` | structural; interchangeable either way |
| `BaseGameSettings`, `GeneratedQuestion` | `identification-game/types.ts` | structural |
| `TIME_LIMITS`, `NOTE_LIMITS` | `identification-game/types.ts` | identical values |
| `NATURAL_NOTES`, `formatTimeLength` | `identification-game/utils.ts` | identical |
| `CLEF_UNICODE`, `CLEF_LABELS` | `identification-game/components/ClefGlyph.tsx` | identical; only `CLEF_UNICODE.{treble,bass}` is used here |

### 3.2 The four services built to Phase 5's interface

Each carries a `PHASE-5 SEAM` header naming its React source.

| file | React source | what to do at merge |
| ---- | ------------ | ------------------- |
| `services/identification-game.engine.ts` | `hooks/useIdentificationGame.ts` | **Delete it and use Phase 5's.** It is a plain generic class, not an `@Injectable`, because it is generic in `TSettings` and has no dependencies. If Phase 5's is an injected service, the only file that changes is `note-game.service.ts` — swap `new IdentificationGameEngine({...})` for `inject(...)` + a configure call. **One behaviour is deliberately stronger than React's and must survive: `endGame` is idempotent** (§5.1). |
| `services/question-queue.ts` | `hooks/useQuestionQueue.ts` | **Compare, then keep one.** This is PLAN.md §5.5's shape verbatim — low water 2, batch 2, debounce 300ms, `switchMap` for cancellation, keyed on the serialized request. If Phase 5's queue takes a `Signal<TRequest \| null>` and a `(request) => Observable<T>` it is a drop-in; `services/note-queue.ts` is the only adapter and is 40 lines. If theirs keys on a fetcher identity instead, keep **this** one — the request-as-key form is what makes "only a payload-affecting setting resets the queue" checkable. |
| `services/game-timer.service.ts` | `hooks/useGameTimer.ts` + `useGameLifecycle.ts` | **Keep one; the API is likely identical.** Note that `useGameLifecycle`'s `endGameRef` has no port here — the circular dependency it existed to break is resolved by `expired` being an observable. If Phase 5 ported `endGameRef` literally, this version is the one to keep. |
| `services/save-game-on-end.service.ts` | `hooks/useSaveGameOnEnd.ts` | **Keep one.** It takes `gameType` per call rather than at construction, so one instance serves any game. React's `queryClient.invalidateQueries` after an assignment attempt has no port — there is no query cache (D6). |

Two **components** are also Phase 5's in React and are duplicated here for the
same reason. Both carry the same header:

| file | React source | note |
| ---- | ------------ | ---- |
| `components/score-bar/` | `identification-game/components/ScoreBar.tsx` | React's two components + `useScoreData` hook become one component with two template branches |
| `components/game-over-card/` | `identification-game/components/GameOverCard.tsx` | the three React slots (`children`, `summaryExtras`, `actions`) are the projection selectors `[gameOverSection]`, `[gameOverSummaryExtra]`, `[gameOverAction]` |

React's `QuestionDisplay` (exported from the identification-game barrel) is
**not** a separate component here — it is folded into `<app-note-staff>` along
with `useQuestionLoader`, `useNoteGameDisplay` and the `NoteGameDisplay`
class. If Phase 5 shipped a `QuestionDisplay` component, `note-staff`'s
template is the part to reconcile; its logic is note-game-specific and should
stay.

### 3.3 What is unambiguously Phase 6's and needs no reconciliation

`services/note-game.service.ts` (the composition), `services/keyboard-input.ts`,
`services/note-audio.service.ts`, `services/note-queue.ts`,
`models/note-game.models.ts`, `models/range.utils.ts`, `models/keymap.ts`, and
the nine note-game-specific components.

### 3.4 One file Phase 6 deliberately did **not** touch

**`features/classes/components/assignment-game-host/assignment-game-host.component.ts`.**
Phase 3.5 left it as the single handoff point, and its own header says
replacing it is a one-file change — but **both** game shells land in that one
file, so editing it here would have guaranteed a conflict with Phase 5 over
the same three lines. `NoteGamePageComponent` already takes the
`assignment: { id, config }` input React's `NoteGamePage` took, assignment
mode is implemented (settings hydrate from the frozen config, the settings
save-back is suppressed, the entry is tagged with `assignment_id`), and it is
covered by `SaveGameOnEndService`'s spec. **The merge integrator wires it**:

```html
@if (gameType() === "note") {
  <app-note-game-page [assignment]="launch()" />
} @else { … Phase 5's shell … }
```

This is also the residual behind `classes.spec.ts` test 4, which Phase 3.5's
handoff pinned to Phase 5.

---

## 4. The audio decision (PLAN.md §2) — **Web Audio, no library**

`use-sound` is a React hook and cannot come along; it is **absent from
`package.json`** (`grep -n "use-sound\|howler" frontend/package.json` →
nothing). It wraps `howler`, so `howler` was the candidate to check.

### R6 evidence, run 2026-08-20

```
$ npm view howler peerDependencies
                       (no output — none declared)
$ npm view howler version license dependencies dist.unpackedSize
version = '2.2.4'
license = 'MIT'
dist.unpackedSize = 318465      (no `dependencies` line — none)
$ npm view @types/howler version
2.2.13
$ npm view use-sound version peerDependencies dependencies
version = '5.0.0'
peerDependencies = { react: '>=16.8' }
dependencies = { howler: '^2.2.4' }
```

**`howler` passes R6 outright** — MIT, no peer dependencies at all (so, like
`d3-shape` in the Phase 3 chart decision, it cannot fail R6 on a future
Angular bump the way `lucide-angular` and `ngx-toastr` already have), no
runtime dependencies, 318 KB unpacked. It was still declined.

### Why the platform instead

Read `useNoteAudio.ts` first, as the packet says: it makes twelve
`useSound("/audio/marimba-*.mp3", { volume })` calls and exposes one function
that plays one of them. That is the entire requirement — **one correct-answer
sound, twelve preloaded static files, volume 0.5.** Every reason howler exists
is unused here: audio sprites, spatial audio, per-format fallback sources, the
HTML5 streaming fallback for long files, its own autoplay-unlock shim. The
cost side is two packages, not one — the types ship separately as
DefinitelyTyped — for roughly 60 lines of `AudioContext` code that the
browser implements natively.

The two things howler *does* give this feature come free:

- **Overlapping notes.** `Howl.play()` starts a new sound rather than
  restarting the current one, so answering quickly layers marimba notes. Each
  play here gets a fresh `AudioBufferSourceNode`, which does the same.
- **Preloading.** Howler's `preload: true` fetches on construction. Here the
  fetch and the decode are split: the twelve files are fetched eagerly (via
  `HttpClient`, `responseType: "arraybuffer"`) and decoded lazily, because
  constructing an `AudioContext` before a user gesture makes the browser log
  an autoplay warning. The first correct answer is always a click or a
  keypress, so the context is created inside a gesture.

Two consequences worth knowing:

- **jsdom has no `AudioContext`**, so playback degrades to a no-op there
  rather than throwing. That is asserted, and it is why the game is testable
  without an audio fake.
- **Four answerable notes have no sample.** `Cb`, `Fb`, `E#` and `B#` are on
  the answer pad but there are only twelve marimba files. React logged a
  warning and moved on; so does this. Not a regression — pinned in
  `note-audio.service.spec.ts` so nobody "fixes" it by accident.

The assets were already in place: `frontend/public/audio/marimba-*.mp3`, all
twelve, copied by Phase 0.

**Ledger line for `STATE.md`** (this phase did not edit that file):

```
| Audio library (replaces use-sound) | 6 | Web Audio API (no dependency) | `howler@2.2.4` passes R6 — MIT, **no peerDependencies**, no runtime deps, 318 KB — but React's actual use is one correct-answer sound from twelve preloaded mp3s at volume 0.5, and every feature howler adds over that (sprites, spatial audio, format fallbacks, HTML5 streaming, its own autoplay shim) is unused. Two packages (`@types/howler` ships separately) for ~60 lines of `AudioBufferSourceNode` code. Overlapping notes and eager preloading, the only two behaviours that mattered, both survive. `use-sound` absent from `package.json`. `phase-6-handoff.md` §4. |
```

---

## 5. Deviations

| # | What the plan/React said | What was done | Why |
| - | ------------------------ | ------------- | --- |
| 1 | Worktree rule: base on `feature/angular-migration` | The worktree came up on **bare `main` (`b2a52b7`)**; reset onto `10cfbfb` | The trap Phase 3.4 and Phase 4 both hit. Recorded a third time because it is clearly systemic, not bad luck. Note that local `feature/angular-migration` (`10cfbfb`) is one commit **ahead** of `origin/feature/angular-migration` (`5a83341`), so resetting onto the *origin* ref as the prompt suggested would have silently dropped the "Phase 3 done" commit. |
| 2 | Packet: record the audio decision in `STATE.md`'s deferred-decisions table | Recorded in §4 above; `STATE.md` untouched | The orchestrator made `STATE.md` read-only for this phase. The ledger row is written out verbatim in §4 for whoever owns the file. |
| 3 | Packet: shared constants are "imported from the identification-game barrel" | Imported from `models/engine.models.ts`, a local mirror | Phase 5 owns that barrel and was building it in parallel. §3.1 is the one-file redirect. |
| 4 | React's `GameMode` / `GameState` are TS `enum`s | Const object + matching union type | Call sites read identically (`GameMode.Time`); the value is the string the wire already carries, so `game_mode` needs no conversion. **Flagged in §3.1** as the one seam symbol that is not structurally interchangeable. |
| 5 | React's `endGame` could be called twice | `IdentificationGameEngine.endGame` returns early once the game is over; `handleAnswer` ignores answers after game over | `onGameEnd` is what posts the score, so a second call posts a second entry. React relied on nothing calling it twice, and `useGameTimer` carries a comment about a StrictMode double-invoke that **did** save duplicates once. Making it structural is what `save-once` is pinned on. `SaveGameOnEndService` adds a second, independent guard against a concurrent POST. |
| 6 | React's `utils.ts` exports `calculateNPM`; `types/index.ts` exports `ACCIDENTALS` | Neither ported | Dead code — nothing in the React app imports either. Same call Phase 4 made for `isValidNote`/`isValidRhythm`. |
| 7 | React's `KeyboardBindingsEditor` declares its own `NATURAL_NOTES` | Imports the shared one; only `SHARP_NOTES` and `FLAT_NOTES` stay local | `frontend/CLAUDE.md` names `NATURAL_NOTES` as a constant that lives once, and the packet checks it with a grep. The two accidental rows exist nowhere else, so they stay. |
| 8 | React's `GameBoard`/`GameBoardLandscape` share a `useGameBoardCore` hook | Two components sharing `<app-note-staff>` | They cannot be one component with two `@if` branches: a template may project a given `<ng-content>` slot **once**, whichever arm it sits in. The shared core is now a component rather than a hook, which is a better home for it. |
| 9 | React's `NoteGameDisplay` set `EngravingRules` in its constructor | Set on the first successful `loadAndRender`, then re-rendered | Phase 4's `<app-sheet-music>` creates the OSMD instance lazily inside `loadAndRender` (its handoff §3: "null until the first `loadAndRender`"), and engraving rules are not `IOSMDOptions`. Only the first question pays for the second render; the `viewBox` crop runs after it either way, so nothing flickers. |
| 10 | React wrapped both boards in `ComponentErrorBoundary` + `GameBoardFallback` | Not ported | Phase 2 handoff §5 replaced boundaries with error signals. The failure the boundary actually guarded — MusicXML that will not render — is handled inside `<app-note-staff>` by the text fallback, which React's boundary never saw because `useQuestionLoader` swallowed the error itself. |
| 11 | React's `useNoteAudio` used `use-sound` | Web Audio | §4. |
| 12 | React's `KeyboardBindingsEditor` used `document.addEventListener(..., { capture: true })` | A `fromEvent(document, "keydown", { capture: true })` stream under `takeUntilDestroyed` | The capture phase is load-bearing: `stopPropagation()` there is what lets Escape cancel a pending rebind without also closing the dialog. An Angular `(document:keydown)` host binding is bubble-phase and would fire *after* `<app-dialog>`'s. |
| 13 | Phase 2's `SelectComponent` takes no `className` | Added one, merged through `cn()` | React put `className` on the `<select>` element, and the note game's settings bar sizes its scale picker `w-28 h-9` — which is in the captured baselines. A `class` on `<app-select>` reaches the wrapper, a different box. Additive; no existing caller changes. |
| 14 | React's desktop bar wraps the picker in `[&>div]:w-auto` | `[&>app-select]:w-auto` | The Angular wrapper *is* the `<app-select>` host element, not a nested `<div>`. Same rule, correct selector. |
| 15 | `src/test-setup.ts` shims only `ResizeObserver` | Added a `matchMedia` stub | jsdom has none and `BreakpointService` opens three in its constructor, so any spec rendering a component that reads a breakpoint died before rendering. It reports **no match**, which is the service's own desktop default and the viewport the golden E2E project runs at. **Phase 5 will need this too** — expect a trivial conflict at the end of the file. |
| 16 | Packet: wire the note game into assignment mode | `NoteGamePageComponent` supports it; `AssignmentGameHostComponent` is untouched | §3.4 — both game shells land in that one file and editing it here guarantees a conflict with Phase 5. |
| 17 | STATE.md's `isLoading()` rule (Phase 3.5 §7.1) | No `isLoading()` anywhere in this feature | `savedBindings.reload()` is called after saving new bindings, which is exactly the case the rule is about — but no template reads that resource's loading state at all, so there was nothing to switch. Recorded so a verifier grepping for the pair does not think it was missed. |
| 18 | React's `GameOverCard` interpolated `Score: {correct}/{total}` inline | Built in a `computed()` | §9.1. The anchored regex the E2E harness reads it with matched **0** elements otherwise. Not a style preference — a defect found by driving the real app. |

---

## 6. Required tests — where each one is

| Packet requirement | File |
| ------------------ | ---- |
| Keymap translation, all three rows, both cases | `models/keymap.spec.ts` — 25 tests, `it.each` over all 21 notes; also pins that the 42-entry table maps nothing outside the three rows and is the exact inverse of the note→key table |
| Keyboard stream inactive when not playing | `services/keyboard-input.spec.ts` — "is inactive when not playing" asserts both that `onNote` is not called **and** that the key is not `preventDefault`ed (the listener is detached, not filtering), plus re-attachment |
| Scoring fixtures matching React's math | `services/identification-game.engine.spec.ts` — the `scoring fixtures` block, every expectation computed from React's `endGame` |
| Save-once | Two levels: `identification-game.engine.spec.ts` → `save-once` (idempotent `endGame`, post-game-over answers ignored, a new game after Play Again *does* save); `save-game-on-end.service.spec.ts` → `save-once` (one POST when the end arrives twice, no wedge after a failure) |
| Legacy `octave` loads without breaking, range drives playback | `components/note-game-page/note-game-page.component.spec.ts` — a saved row whose `octave` **disagrees** with its range loads, and the outgoing `/music/note-game` body carries `lowNote`/`highNote`/`clef` with the octave along only as passenger |

Beyond those: the queue's eleven tests cover the low-water refill, the
one-batch-at-a-time guard, the 300ms burst debounce, "clears before the
debounce", "a settings change that does not alter the payload does not reset
it", stale-batch rejection and partial-batch failure. The timer's eight cover
the full-second hold, single expiry, and that a stopped timer stays stopped.

### Scoring, stated once because it is easy to get backwards

- `npm = round(total / minutes)` — **total, not correct.** The rate is how
  fast the player answered; accuracy is reported separately.
- `accuracy = round(correct / total * 100)`, `0` when `total === 0`.
- The clock starts at the **first answer**, not at page load. N answers paced
  `t` apart therefore span `(N-1) × t` of play. Ten answers at the harness's
  1200 ms pace score **56** npm, not 50 — pinned as a fixture.
- `limit` is `timeLimit` in time mode, `noteLimit` in notes mode.
- Notes mode ends inside the answer that reaches the limit.

---

## 7. Things a later phase should know

1. **The answer pad's two-line label is an acceptance criterion.**
   `games.spec.ts` finds the natural C with `/^C(\s|$)/`, which matches the
   accessible name `"C a"` — note plus key hint — and deliberately does not
   match `"C#"` or `"Cb"`. Collapsing the two spans into one text node, or
   dropping the key hint, breaks the golden flow.
2. **The staff's `aria-label="Music staff"` is load-bearing twice over**:
   `e2e/support/app.ts` finds the staff by it, and `baselines.spec.ts` masks
   exactly that region under the dynamic-content carve-out.
3. **Settings persist on the first answer, not on a control click.**
   `settings.spec.ts`'s header says a port that saved per click would pass the
   spec while hammering the API. `NoteGameService.started` fires
   *synchronously* inside the first answer, which is what makes that possible
   — if the seam ever turns that into an async emission, the countdown and the
   settings save both slip a frame.
4. **`octave` is inert.** It is read from the saved row, sent on the wire, and
   written back; it decides nothing. The range does. Do not "fix" it.
5. **`RangeClef` is treble/bass only.** The seven-clef picker belongs to the
   identification games and is a different control.
6. **Where the note game differs from the identification games** (the packet
   asks for this explicitly):
   - its settings are **inline on the bar**, not behind a Settings dialog —
     which is the branch `useQuestionMode` in the E2E harness takes;
   - it has a **physical keyboard path**, and a per-user 21-key binding editor
     behind a floating button, which no other game has;
   - it has **audio**;
   - its settings are a **typed table** (`note_game_settings`), not the JSONB
     `game_settings` blob every other game uses — so there is no
     `sanitizeConfig` here, and the per-field `undefined` guards in
     `mapSavedNoteGameSettings` do that job instead;
   - its results screen adds a **recent-games chart**;
   - its range picker is a drag-and-step SVG staff rather than a chip row.
7. **`recolour()` on `<app-note-staff>` is a no-op until the first score
   loads**, because the OSMD instance does not exist before then. Toggling the
   theme on a blank board and then loading a question still comes out right —
   `configureOsmd()` reads the current theme when it runs.
8. **Anchored-regex text matching is a real trap in Angular templates.**
   §9.1 — multi-line interpolated text gains a leading and trailing space that
   JSX did not have, and Playwright does not trim before matching a regex.
   Any text an unmodified spec matches with `^…$` must be one interpolation or
   one literal.

### The ledger line for `STATE.md`

```
| 6 | Note game | built | 2026-08-20 | `896c1a3..9027339` (this ledger entry's own commit follows) | Engine composed, not forked -- the note game's own layer (keyboard, audio, queue binding, display, screens) sits on an `IdentificationGameEngine` built to Phase 5's interface, and **`models/engine.models.ts` is the single seam file that collapses to a re-export at the merge**; handoff §3 maps every symbol and every duplicated service. build/lint/test:run/format:check all exit 0 -- **510 tests in 58 files** (394/49 before). Parity on `:5173`, specs unmodified: **both note-game tests in `games.spec.ts` and `settings.spec.ts` pass**, taking those two specs from the 9 failures Phase 3 recorded to **7**, all seven on identification-game screens (**Phase 5**); `navigation`+`auth`+`friends-and-theme` **30/30**. **8/8 note-game screenshots inside threshold first try** (`/note-game` and `/` x 2 viewports x 2 themes) -- run through a throwaway two-route config because `baselines.spec.ts` aborts at the open login/signup residual before reaching route 6. **Audio decision: the Web Audio API, no dependency**; `howler@2.2.4` passes R6 (MIT, no peers, no deps, 318 KB) and was still declined -- see the deferred-decisions row and handoff §4. `use-sound` absent from `package.json`. **One defect found by driving the real app and fixed (§9.1): the results `Score:` line was unreachable by the harness's anchored regex, because Angular's template whitespace gave it a leading and trailing space JSX did not -- it is in `GameOverCardComponent`, so it was Phase 5's bug too.** 18 deviations below, including the base-on-`main` trap for the third time. `AssignmentGameHostComponent` deliberately untouched (handoff §3.4): the page takes the `assignment` input and assignment mode works, but both game shells land in that one file and Phase 5 must wire it at the merge. |
```

---

## 8. Verification run

| Gate | Result |
| ---- | ------ |
| `npm run build` | exit 0 |
| `npm run lint` | exit 0 (`--max-warnings 0`) |
| `npm run test:run` | exit 0 — **510 tests in 58 files** (394/49 before) |
| `npm run format:check` | exit 0 |
| `grep -rn "NATURAL_NOTES\s*=" src/app/features/note-game/` | one hit, in the seam file, as documented |
| `grep -n "use-sound\|howler" package.json` | nothing |

E2E and screenshot numbers are in §9.

**Env note.** The dev server ran on **`:5173`**, lock held at
`/tmp/tremolo-port-5173.lock` for the whole run and released at the end.
`:4300` was occupied by another agent's `ng serve` throughout and was left
alone; `/proc/<pid>/cwd` was checked before trusting any result from
`:5173`. `:5173` is the second origin in the Go service's `ALLOWED_ORIGINS`,
so it passes CORS — same finding as Phase 3.4.

---

## 9. Parity, measured

Everything below was run against `:5173` (Angular), with the Go service on
`:5001` and the Python service on `:8000`. **`e2e/` and
`.migration/baselines/` were not modified** —
`git log 10cfbfb..HEAD -- frontend/e2e/ frontend/.migration/baselines/ frontend-react/`
is empty, and `git status` on those paths is clean.

### E2E — `games.spec.ts` + `settings.spec.ts`, unmodified

**2 passed, 7 failed.** Both note-game tests pass:

| test | result |
| ---- | ------ |
| `games.spec.ts` › plays the **note** game to game over and saves the score | **pass** |
| `settings.spec.ts` › the **note** game remembers its scale | **pass** |
| `games.spec.ts` › plays the key signature / interval / scale / chord game … | fail ×4 — **Phase 5** |
| `games.spec.ts` › renders a staff on every game before the first answer | fail — **Phase 5**; the loop starts at `/note-game`, which renders, and dies on `/key-signature-game` (the failure snapshot is that page's `Key Signature Game` stub) |
| `settings.spec.ts` › an identification game remembers mode and limit | fail — **Phase 5** (`getByRole("button", { name: "Settings" })` never appears) |
| `settings.spec.ts` › an anonymous player keeps settings for the session but not the reload | fail — **Phase 5**, same cause |

**Attribution against the recorded baseline.** `STATE.md`'s Phase 3 row says
these two specs ran "for attribution only — **9 failures**, every one at a
game screen." They are now **7**: the two this phase owns are the two that
flipped, and no new failure appeared.

### Regression — the three parity specs Phase 6 does not own

`navigation.spec.ts` + `friends-and-theme.spec.ts` + `auth.spec.ts`,
unmodified: **30 passed, 0 failed.** (Phase 3's consolidated verifier
recorded the same 30/30.) `navigation.spec.ts` visits `/note-game` among its
21 paths, so this also covers "the page mounts clean with no console errors".

### Screenshots — 8 of 8 inside threshold, first try

The two routes this phase delivers (`/note-game`, and `/` which redirects to
it) × 2 viewports × 2 themes, at `baselines.spec.ts`'s own
`maxDiffPixelRatio: 0.01`, with the staff masked and the chrome compared:

```
note-game-desktop-light   note-game-desktop-dark
note-game-mobile-light    note-game-mobile-dark
root-redirect-desktop-light  root-redirect-desktop-dark
root-redirect-mobile-light   root-redirect-mobile-dark
                                              → 4/4 tests, 8/8 shots pass
```

**How, and why it was not `baselines.spec.ts` itself.** That spec photographs
all 20 routes inside *one* test per viewport/theme, and `toHaveScreenshot` is
a hard assertion — so the known login/signup restyle residual (Phase 3.1
deviation 9, still open) aborts the anonymous pass at route 4 and it never
reaches `/note-game` at route 6. The check therefore ran through a throwaway
config + spec that reproduce `capture()` and `settle()` verbatim — same mask,
same `maxDiffPixelRatio`, same `snapshotPathTemplate` pointing at the real
`.migration/baselines/` — for those two routes only. Both temp files were
**deleted after the run**; `git status` is clean and no baseline was written
(a missing baseline makes Playwright *fail* while writing it, and nothing
failed).

A verifier that wants to reproduce this can either re-create that two-route
spec, or run the real `baselines.spec.ts` and read past the login/signup
abort.

### 9.1 One defect found and fixed by driving the real app

**The results screen's `Score:` line was unreachable by the harness.**
`e2e/support/app.ts`'s `correctCount()` reads it with the **anchored** regex
`/^Score: \d+\/\d+$/`, and **Playwright does not trim the text before testing
a regex against it.** JSX drops the whitespace around a newline, so React
rendered exactly `"Score: 2/10"`; Angular collapses the same template
whitespace to a single space and rendered `" Score: 2/10 "`, which the anchors
reject.

Measured live rather than inferred — a probe against the running app after a
finished game reported:

```
raw textContent      " Score: 0/10 "
getByText(/^Score: \d+\/\d+$/).count()   0
getByText(/Score:/).count()              1
```

The symptom was misleading: the note game played its ten questions, ended at
the limit and drew a complete results screen (`Mode: Notes`, `Limit: 10
notes`, `Score: 2/10`, `Scale: C Major`, npm 54, accuracy 20%) — and then the
spec timed out at 90s looking at a number that was plainly on screen.

The fix builds the string in a `computed()` so the span holds a single
interpolation with no text node either side. The same probe now reports
`"Score: 4/10"` and a count of 1. **It is in `GameOverCardComponent`, so it
is the identification games' results screen too** — Phase 5 would have hit
this next.

**The general lesson, for whoever writes the remaining templates:** any text
an unmodified spec matches with an **anchored regex** must be a single
interpolation or a single literal. Angular's whitespace handling is not JSX's,
and multi-line interpolated text silently gains a leading and trailing space.
Accessible names (`getByRole(..., { name })`) are unaffected — name
computation trims — which is why every button-driven step of the same flow
worked.

---

## 10. Fix addendum — verifier F1 + three code-review findings (2026-08-21)

Written by the fix builder, after the Phase 6 verifier held the phase at
`built`. **Four items, nothing else.** Phase 6 is still `built`; the
re-verification is somebody else's.

Commits: `7d9c1ec` (F1, test only), `620188b`, `9a452c8`, `ef35154`.
Gates after all four: `build`, `lint`, `format:check` exit 0, and **three
serial `npm run test:run` runs, all exit 0 at 523 tests / 61 files**, zero
failure lines — +6 tests and +1 file over the verifier's 517/60.

### 10.1 F1 — the stale-queue pin, restored

The product fix was never missing; its guard was. The verifier's assertion
is back in `features/identification-game/services/question-queue.service.spec.ts`
— the surviving spec — retargeted at `QuestionQueueService`'s `request` +
`enabled` signature and at this spec's own `connect()` / `settle()` helpers:

```ts
it("clears the buffer the moment the request changes, before the debounce", () => {
	const request = signal<TestRequest>({ clefs: ["treble"] });
	connect({ request });
	settle();
	expect(queue.size).toBe(2);
	expect(queue.isInitializing()).toBe(false);

	request.set({ clefs: ["bass"] });
	// No timer advance: we are *inside* the 300ms debounce window, before
	// the new generation has started.
	TestBed.tick();

	expect(queue.size).toBe(0);
	// A question generated for the old payload must never be served.
	expect(queue.pop()).toBeNull();
	expect(queue.isInitializing()).toBe(true);
	// And nothing was refetched yet -- the debounce is still pending.
	expect(calls).toHaveLength(2);
});
```

**Mutation proof.** Deleting `tap(() => this.discard())` from
`question-queue.service.ts:142`:

| Mutation | Result |
| -------- | ------ |
| `tap(() => this.discard())` deleted | `question-queue.service.spec.ts` **1 failed / 9 passed** — the new test, `AssertionError: expected 2 to be +0` at the `queue.size` line |
| restored | **10/10**, and `git status --porcelain` clean |

The failure is the first assertion rather than the `pop()` one, which is the
sharper signal: the buffer is *still full* inside the window, so the stale
question is not merely servable, it is sitting there.

`7d9c1ec` touches exactly one file, and it is a spec.

### 10.2 The three code-review findings — one defect in three places

All three are the same mistake: **`resource.value()` rethrows while the
resource is in its error state**, and every one of these readers runs during
change detection. The review called it an idiom problem; it is a crash.

| Where | Symptom before | Guard |
| ----- | -------------- | ----- |
| `note-game-page.component.ts` — `noteToKeyMap` **and** the bindings effect | A 500 on `/api/note-game/keyboard-bindings` took down the **main game screen** | `this.savedBindings.error() ? null : this.savedBindings.value()`, both readers, falling back to the default keymap |
| `assignment-play-page` + `class-detail-page` | No `@else if (…error())` arm **at all**, and the row-finding computed read `.value()` raw: a failed list threw out of the template instead of saying anything | The canonical `<app-error>` arm (house pattern: `attempt-drilldown.component.ts:56-58`), plus `…error() ? [] : …value()` in each computed |
| `note-game-results.component.ts` — `chartData` (and `showChart`, which reads it) | The "Could not load recent games" copy was a **sibling** of the chart, so the rethrow happened first and the copy was unreachable | `this.recent.error() ? [] : (this.recent.value() ?? [])` |

**Every half mutation-tested, one at a time.** For the note game page the two
guards were removed separately and *each one alone* reproduces the crash —
the computed's rethrows out of `detectChanges`, the effect's out of
`runEffect`. For the two classes pages, deleting the error arm loses the panel
(`expected null to be truthy`) while deleting the computed's guard rethrows,
so both specs assert the rendered panel **and** read the computed directly.
For the results screen, restoring the unguarded read fails with the
`ResourceValueError` by name.

New spec file: `note-game-results.component.spec.ts` (the component had none),
covering the chart path and the error path.

### 10.3 Testing notes, for whoever writes the next error-path spec

- **A 404 is not an error here.** `UserService.getOrNull` maps 404 and the
  `{"settings": null}` sentinel to `null`, which is why the existing specs
  flush 404 and get the defaults. To *error* a resource you need a real
  failure — flush with `{ status: 500 }`.
- **`whenStable()` deadlocks with an in-flight `rxResource`** under
  `HttpTestingController` (Phase 3.4's deviation 3): flush first, settle
  after. On `class-detail-page` even that is not enough, because rendering the
  found-class arm starts two more requests — its spec's `settle()` is a
  macrotask turn plus an explicit `detectChanges()`, and the error-path test
  reuses it.
- **`ResourceValueError` surfaces as a test failure, not a console warning.**
  A view effect that rethrows fails the fixture, which is what makes these
  guards pinnable at all.

### 10.4 Out of scope, deliberately

The review's idiom suggestions — `model()` instead of input+output pairs,
`computed()` instead of an effect, splitting the identification-game barrel —
are **post-merge backlog**, not cutover work. No dependency changed, and
`e2e/`, `.migration/baselines/` and `frontend-react/` are untouched by all
four commits.
