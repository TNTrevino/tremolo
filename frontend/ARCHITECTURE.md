# Frontend Architecture

This is the definitive "how this app works" document for the Tremolo React frontend. It is written for a contributor who is new to the repo. For the big picture across all three services (frontend, Python music service, Go user service), see the root [`CLAUDE.md`](../CLAUDE.md). For visual design decisions (colors, typography, component styling), see [`DESIGN.md`](./DESIGN.md) — that content is not repeated here.

## Contents

1. [Stack and commands](#stack-and-commands)
2. [Directory layout](#directory-layout)
3. [The identification-game engine](#the-identification-game-engine) — the centerpiece
4. [The note game](#the-note-game)
5. [API layer conventions](#api-layer-conventions)
6. [Sheet music rendering (OSMD)](#sheet-music-rendering-osmd)
7. [Known deliberate deferrals](#known-deliberate-deferrals)

## Stack and commands

- **Vite 5** + **React 18** + **TypeScript** (strict; `npm run build` runs `tsc` first, so type errors fail CI)
- **Tailwind CSS** (+ `tailwindcss-animate`, shadcn-style components in `src/shared/components/ui/`)
- **Zustand** for global client state (`src/stores/`)
- **TanStack Query v5** for all server state (`src/shared/hooks/queries/`)
- **react-router-dom v6** for routing (`src/App.tsx`)
- **OpenSheetMusicDisplay (OSMD)** for MusicXML rendering
- **axios** for HTTP, **zod** + **react-hook-form** for forms, **recharts** for dashboard charts, **use-sound** for audio feedback
- **vitest** + Testing Library (jsdom) for tests

Commands (run from `frontend/`):

| Command                                   | What it does                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`                             | Vite dev server on port 5173                                                       |
| `npm run test` / `npm run test:run`       | vitest watch / single run (`npx vitest run src/path/to/file.test.ts` for one file) |
| `npm run lint` / `npm run lint:fix`       | ESLint — CI fails on warnings (`--max-warnings 0`)                                 |
| `npm run format` / `npm run format:check` | Prettier (hard tabs, per the repo Prettier config)                                 |
| `npm run build`                           | `tsc && vite build`                                                                |

Environment variables: `VITE_BACKEND_MUSIC` (FastAPI music service, default `http://localhost:8000`) and `VITE_BACKEND_MAIN` (Go user service, default `http://localhost:5001`).

Path alias: `@/` → `src/`.

## Directory layout

```
src/
├── App.tsx            # Router, QueryClient, providers, lazy-loaded routes
├── pages/             # One component per route; thin orchestrators
├── features/          # Feature folders (the real code)
│   ├── identification-game/   # Shared game engine + game definitions
│   ├── note-game/             # Note recognition game (predates the engine)
│   ├── note-game-display/     # OSMD wrapper tuned for game questions
│   ├── sheet-music/           # General OSMD rendering (exercises, converter)
│   ├── auth/  dashboard/  friends/
├── services/api/      # HTTP layer: clients, service classes, mappers, DTO types
├── shared/            # Cross-feature UI, hooks (incl. queries/), types, utils
├── stores/            # Zustand stores (auth, theme, friends UI)
├── config/  lib/  test/
```

- **`pages/`** — One component per route. Pages stay thin: they wire feature hooks/components together and hold no business logic. All routes are registered in `App.tsx`; everything except `HomePage` and `LoginPage` is lazy-loaded for code splitting. `App.tsx` also builds the `QueryClient` with cache-level error handlers that surface every query/mutation failure as a toast (opt out per-call with `meta: { suppressErrorToast: true }`).

- **`features/`** — Feature-folder layout: each domain owns its `components/`, `hooks/`, `types/` (and sometimes `services/`, `validation/`). See `src/features/README.md` for the convention. Features export a curated public surface from their `index.ts`; internal pieces are imported via relative paths inside the feature.

- **`shared/`** — Anything used by more than one feature: the shadcn-style UI kit (`components/ui/`), layout (`Navigation`, `ProtectedRoute`, `GuestRoute`), error boundaries and fallbacks, the toast system, `useBreakpoint`, and — importantly — all TanStack Query hooks under `shared/hooks/queries/`.

- **`services/api/`** — The only place that talks HTTP. Two axios clients, one service class per domain, and mappers that convert wire formats to UI formats at the boundary. See [API layer conventions](#api-layer-conventions) and `src/services/api/README.md`.

- **`stores/`** — Small Zustand stores for global _client_ state only: `auth.store.ts` (user + token, persisted to localStorage as `tremolo-auth`, cleared on the `auth:logout` window event fired by the API client), `theme.store.ts` (dark/light, persisted, toggles the `dark` class on `<html>`), `friends.store.ts` (panel open/search query — pure UI state). Server data never lives in Zustand; it lives in the TanStack Query cache.

## The identification-game engine

`src/features/identification-game/` is a **shared engine** for staff-identification games: the player sees rendered sheet music, taps an answer, and races a timer or a question count. Four games run on it today — key signature, interval, scale, and chord identification — and each one is a single declarative object.

### A game is a `GameDefinition`

A game = one `GameDefinition` module in `games/`, rendered by the shared page shell:

```tsx
// pages/KeySignatureGamePage.tsx — the entire page
import {
	IdentificationGamePage,
	keySignatureGame,
} from "@/features/identification-game";

export function KeySignatureGamePage() {
	return <IdentificationGamePage definition={keySignatureGame} />;
}
```

The definition (`games/types.ts`) declares everything game-specific:

```ts
export const intervalGame = defineGame<IntervalGameResponse, IntervalGameSettings, IntervalGameRequest>({
	gameType: "interval",              // persistence key (score entries + saved settings)
	title: "Interval Identification",
	description: "Identify the displayed interval",
	defaults: { gameMode: GameMode.Time, timeLimit: 60, noteLimit: 25,
	            clefs: ["treble"], displayMode: "harmonic", requireQuality: true,
	            intervals: ALL_INTERVALS },
	settingsSchema: [ clefsSetting(), /* choice/multiChoice/toggle descriptors */ ],
	toRequest: (s) => ({ clefs: s.clefs, displayMode: s.displayMode, intervals: s.intervals }),
	fetchQuestion: (req) => musicService.generateIntervalGame(req),
	getAnswer: (q, s) => (s.requireQuality ? q.interval : String(q.number)),
	answerOptions: (s) => /* AnswerOption[] whose values match getAnswer output */,
	columnsClassName: "grid-cols-4 sm:grid-cols-7",  // answer pad grid
	zoom: 1.6,                                       // OSMD zoom for the question
	// optional: prompt(settings) — React node between staff and answers, e.g. "__ Major"
});
```

Settings types extend `BaseGameSettings` (`gameMode`, `timeLimit`, `noteLimit` — the mode/limit UI is built into the shell; `TIME_LIMITS` and `NOTE_LIMITS` are shared constants). `defineGame` is an identity helper that gives the module full type inference. Everything else — settings UI, persistence, saved-config sanitization, question prefetching, scoring, game flow, score saving — comes from the definition; you never touch shared code to add a game.

### The settings framework (`settings/`)

Each game describes its settings as a list of `SettingDescriptor`s (`settings/types.ts`), and the generic `SettingsControls` component renders them:

- **`choice`** — single select, rendered as a dropdown (`<Select>`), using each option's text `label`.
- **`multiChoice`** — multi-select rendered as toggle chips. Deselecting the last selected option is ignored, so at least one option is always active; selection order is normalized to schema order so question pools stay stable.
- **`toggle`** — boolean rendered as an On/Off chip.

`ChoiceOption` has an optional `render?: React.ReactNode` for rich chips: the key signature game renders `KeySignatureGlyph` (staggered ♯/♭ glyphs) chips, and any game with a `clefs: StaffClef[]` setting drops the shared `clefsSetting()` preset (`settings/presets.tsx`) into its schema, which renders each clef as a `ClefGlyph` (a clef on a mini five-line SVG staff). Dropdowns always fall back to the text label.

The same schema drives **validation of persisted settings**: `sanitizeConfig(schema, raw)` (`settings/sanitizeConfig.ts`) validates a saved JSON config against the current schema on load. Saved configs outlive code — fields get renamed, enum values change — so only keys the schema (or the shared base settings) still knows, with still-valid values, survive; everything else silently falls back to the game's defaults. It returns a _patch_ applied over the defaults, never a full replacement.

### The question pipeline

Three hooks plus one board component make up the runtime:

1. **`useQuestionQueue(fetcher, isReady)`** (`hooks/useQuestionQueue.ts`) — a prefetch queue so the next question appears instantly after an answer. Plain FIFO in a ref (no re-renders on queue mutation); hydrates 2 questions at a time (`HYDRATE_BATCH`) and refills whenever `pop()` drops the buffer below the low-water mark (`QUEUE_LOW_WATER = 2`). A generation counter discards in-flight results from a stale queue. The **fetcher's identity is the reset key**: in `IdentificationGamePage` the fetcher is memoized on `JSON.stringify(toRequest(settings))`, so _by construction_ the queue only resets when a setting that actually changes the request payload changes — flipping game mode or a time limit keeps the prefetched questions.

2. **`useIdentificationGame(options)`** (`hooks/useIdentificationGame.ts`) — the generic state machine: `Ready → Playing → GameOver`. The **first answer starts the game** (transitions to Playing, records `gameStartTime`, and fires `onGameStart` — which the page shell uses to start the countdown timer and persist settings). It owns the answer log, per-question timing, and final `GameStats` (NPM, accuracy, correct/total). The question itself lives _outside_ the hook: the board calls `syncCurrentAnswer(answer)` when a question is displayed, and `handleAnswer(guess)` compares against that. In Questions mode the hook ends the game itself when the answer count hits `noteLimit`; in Time mode `useGameTimer` calls `endGame` when the countdown hits zero.

3. **`QuestionBoard`** (`components/QuestionBoard.tsx`) — renders the current question's MusicXML via the OSMD wrapper (`useNoteGameDisplay`, see [rendering](#sheet-music-rendering-osmd)) with the game's `AnswerPad` below it. Whenever `answers.length` changes it pops the next question, renders it, and reports the correct answer upward via `onQuestionLoaded` → `syncCurrentAnswer`. If OSMD rendering fails it falls back to showing the answer as text, and the whole board is wrapped in a `ComponentErrorBoundary`.

4. **`useSaveGameOnEnd(gameType)`** (`hooks/useSaveGameOnEnd.ts`) — the `onGameEnd` handler. For authenticated users it saves the finished game as a score entry (`useSaveGameResult` → `POST /api/note-game/entry`) with `game_type` set to the definition's `gameType`, plus success/error toasts. No-op for anonymous players. Shared by the engine shell _and_ the note game page.

`IdentificationGamePage` also stabilizes `getAnswer` against settings churn (it reads the latest settings from a ref) so re-rendering the settings UI doesn't burn a prefetched question per click.

### Settings persistence

- **On game start** (first answer), if authenticated, the shell persists the current settings as a JSONB `config` via `PUT /api/game-settings` (`game_settings` table in the Go service). It persists **only the keys present in `defaults`**, so stray state can never leak into the saved config.
- **On page load**, `useGameSettings(gameType)` fetches the saved config; it is applied **exactly once** (guarded by a ref) and run through `sanitizeConfig` first, so stale or renamed fields fall back to defaults instead of breaking the fetcher.
- The save mutation (`useSaveGameSettings`) writes the PUT response straight into the query cache with `setQueryData` instead of invalidating — a refetch mid-game would churn the settings identity (see [API layer](#api-layer-conventions)).
- Scores go to `POST /api/note-game/entry` (all game types share the entries table, discriminated by `game_type`).

### Recipe: adding a new identification game

Using "triad spelling" as a stand-in name:

1. **Python endpoint** — add `POST /music/triad-game` to the music service (model in `backend/music/models.py`, logic in `services/music_service.py`, route via the `run_game_endpoint` helper in `routers/api.py`) returning `{ generatedXml, ...answer fields }`, plus tests.
2. **TS API types + service method** — add request/response types in `src/services/api/types/music.types.ts` and a `generateTriadGame` method on `MusicService` (`src/services/api/music.service.ts`). Convert any music21 note names with `fromMusic21NoteName`/`toMusic21NoteName` there, at the boundary.
3. **Game definition** — create `src/features/identification-game/games/triad.ts`: settings interface extending `BaseGameSettings`, `defineGame({...})` with defaults, `settingsSchema`, `toRequest`, `fetchQuestion`, `getAnswer`, `answerOptions`. Reuse `clefsSetting()` if the game has clefs.
4. **Register it** — export from `games/index.ts`.
5. **Thin page** — `src/pages/TriadGamePage.tsx` rendering `<IdentificationGamePage definition={triadGame} />`.
6. **Route** — lazy import + `<Route path="/triad-game" ...>` in `src/App.tsx`.
7. **Nav link** — add to the links array in `src/shared/components/layout/Navigation.tsx`.
8. **Game type id** — add `"triad"` to the `GameType` union in `src/services/api/types/game.types.ts` **and** to `ValidGameTypes` in `backend/main/DTOs/game_types.go` (the Go service rejects unknown types for entries and settings).

That's it — settings UI, JSONB persistence, sanitization, scoring, prefetching, and game flow all come free from the definition.

## The note game

`src/features/note-game/` is the original game — it **predates the engine** and keeps its own page (`NoteGamePage`), components, and typed persistence, but its core logic now **composes** the engine rather than duplicating it:

- **`useNoteGame`** (`hooks/useNoteGame.ts`) delegates state to `useIdentificationGame<GameSettings>` and layers on the note game's extras: audio feedback on correct answers (`useNoteAudio` via the engine's `onCorrectAnswer` callback) and physical keyboard input (`useKeyboardInput`, active during Ready/Playing, with user-customizable bindings edited in `KeyboardBindingsDialog` and persisted via `/api/note-game/keyboard-bindings`). It re-exposes the engine's API under note-game names (`currentNote`, `syncCurrentNote`).
- **`useNoteQueue`** (`hooks/useNoteQueue.ts`) is a thin wrapper over the generic `useQuestionQueue`: it binds `musicService.generateNoteGame` to the current scale/octave and optional pitch range; changing any of them changes the fetcher identity, which resets the queue.
- **`GameBoard`** (`components/GameBoard.tsx`) is the note game's equivalent of `QuestionBoard` — same OSMD display + queue pattern, but with the fixed three-row note button grid (sharps / naturals / flats) and a separate `GameBoardLandscape` variant for phone-landscape play.
- Scores are saved through the same shared `useSaveGameOnEnd("note")`.

### Staff range picker

Instead of a scale/octave dropdown, players drag two whole notes on a rendered staff to set the practice range (`components/StaffRangePicker.tsx`, used through `NoteRangeSetting`). The math lives in `rangeUtils.ts`:

- Range endpoints are **natural (white-key) notes addressed by a diatonic index**: `C0 = 0, D0 = 1, … B0 = 6, C1 = 7, …` — one index step is one staff position (line or space). `noteToIndex`/`indexToNote` convert both ways; `staffSteps` positions a note relative to the clef's bottom line (treble: E4, bass: G2); `ledgerSteps` computes which ledger lines to draw.
- The picker supports only `RangeClef = "treble" | "bass"` (a deliberate subset of the seven-clef `StaffClef` union the identification games use). Per-clef `RANGE_BOUNDS` keep ledger lines sane, and switching clef resets to that clef's `DEFAULT_RANGE` (treble C4–C6, bass E2–E4).

### Persistence

Unlike the engine's schemaless JSONB `game_settings`, the note game has a **typed** settings row (`note_game_settings`): `useNoteGameSettings` / `useSaveNoteGameSettings` speak `snake_case` fields (`game_mode`, `time_limit`, `note_limit`, `scale`, `octave`, `low_note`, `high_note`, `clef`). Settings are saved on game start and re-applied whenever the saved row loads. The `octave` field is legacy (see [deferrals](#known-deliberate-deferrals)) — the low/high note range is what the game actually uses.

## API layer conventions

All HTTP lives in `src/services/api/`. The rule of thumb from `README.md`: services are **how** to talk to the backend; TanStack Query hooks (in `src/shared/hooks/queries/`) are **when**.

### Two axios clients (`clients/`)

- **`music-client.ts`** — FastAPI music service, base URL `VITE_BACKEND_MUSIC + "/music"`. **No auth.** Response interceptor normalizes failures into the shared `ApiError` shape.
- **`main-client.ts`** — Go user service (`VITE_BACKEND_MAIN`). Request interceptor attaches `Authorization: Bearer <access_token>`; response interceptor handles 401s by calling `/api/auth/refresh` with the refresh token, queueing concurrent failed requests while one refresh is in flight, retrying the original request, and — if refresh fails or there is no refresh token — clearing tokens and dispatching a `auth:logout` window event, which `auth.store.ts` listens for to clear the session. Tokens live in localStorage (`clients/token.ts`).

### Service classes

One class per domain, injected with a client: `MusicService` (`music.service.ts`), `UserService` (`user.service.ts`), plus `auth.service.ts` and `friends.service.ts`. Singletons are exported from `services/api/index.ts` (`musicService`, `userService`, …).

### Notation conversion at the boundary

The Python service speaks music21, which spells flats with `-` ("B-"); the UI spells them with `b` ("Bb"). `mappers/music.mapper.ts` owns the conversion (`fromMusic21NoteName` / `toMusic21NoteName` — a one-character replace each way), and **`MusicService` applies it on every request and response field that carries a note name** (note game `scale`/`noteName`, key signature `tonic`/`minorTonic`, scale `tonicPool`/`tonic`, chord `rootPool`/`root`). Feature code never sees a `-`. The mapper is re-exported from `identification-game/utils.ts` for rare feature-level use, but new conversion should live in the service.

### TanStack Query hooks

`src/shared/hooks/queries/` wraps the services: `useUserQuery.ts`, `useAuthQuery.ts`, `useMusicQuery.ts`, `useFriendsQuery.ts`. Cache keys are built from key factories — `userKeys` in `useUserQuery.ts` roots everything at `["user"]` and derives `profile(userId)`, `stats(userId, params)`, `recentGames()`, `classMetrics(params)`, `activity()`, `noteGameSettings()`, `gameSettings(gameType)`, `keyboardBindings()`. Conventions worth copying:

- `enabled: !!authUser?.id` gates every authenticated query; per-query `staleTime` is tuned per resource.
- Errors toast globally via the `QueryClient` cache handlers in `App.tsx`; queries set `meta.errorTitle` for a friendly title or `meta.suppressErrorToast` when a fallback exists (e.g. game settings and keyboard bindings fail silently — the game stays playable on defaults).
- `useSaveGameResult` invalidates recent games, activity, stats, and profile on success.
- **`useSaveGameSettings` uses the setQueryData-on-save pattern**: the PUT returns the full row, and the mutation writes it directly into `userKeys.gameSettings(game_type)` instead of invalidating — an invalidate would refetch and churn the settings object identity mid-game.

## Sheet music rendering (OSMD)

Two OSMD surfaces exist for two different jobs:

- **`features/sheet-music`** (`useOSMD` hook + `SheetMusicDisplay`) — general-purpose rendering for the exercise generator (`SheetMusicPage`) and the MusicXML converter (`ConverterPage`): multi-measure scores with titles, standard OSMD layout.

- **`features/note-game-display`** — a wrapper tuned for game questions. The `NoteGameDisplay` **class** owns a single OSMD instance configured for a bare fragment (`compacttight`, no title/credits/part names/measure numbers/time signatures, zero page/system margins) and, after each `loadNote(musicXml)` render, crops the SVG `viewBox` to the content's bounding box (plus padding) and scales it to fill the container — so one measure sits centered and large regardless of container size. The **`useNoteGameDisplay` hook** ties the class to the React lifecycle (StrictMode-safe create/destroy, `isReady` gate that the question queue waits on) and handles dark mode specially: toggling the theme calls `setDarkMode`, which re-colors (`defaultColorMusic` white/black) and re-renders the _existing_ instance instead of tearing it down — a teardown would reset the question queue and lose the current question.

Generated questions arrive as **single-measure MusicXML** by design: each question is one self-contained prompt (a note, a chord, an interval, one octave of a scale, or a bare key signature) produced by music21 on the Python side, and the display crops-and-centers exactly one system. Both `QuestionBoard` (engine) and `GameBoard` (note game) render through `useNoteGameDisplay`.

## Known deliberate deferrals

Accepted duplication/legacy, kept intentionally — don't "fix" these in passing without checking the trade-off:

- **`GameBoard` vs `QuestionBoard`** — the note game's `GameBoard` (`features/note-game/components/GameBoard.tsx`) and the engine's `QuestionBoard` share the display + queue + fallback structure. `GameBoard` stays separate because of the note game's fixed three-row `NoteButtonGrid` with keyboard-binding hints and the dedicated **`GameBoardLandscape`** phone-landscape layout, which the generic board doesn't support.
- **`GameOverCard` vs `GameResults`** — the engine's `GameOverCard` is a simple stats card; the note game's `GameResults` adds charts and richer post-game detail. Unifying them is deferred.
- **Note game `octave` field** — kept in `GameSettings` and the `note_game_settings` row purely for saved-settings compatibility; the low/high note range supersedes it, and stats intentionally report the scale alone.
