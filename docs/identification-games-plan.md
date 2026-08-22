# Plan: Key Signature / Scale / Chord Identification + Staff-Based Note Range Picker

Goal: match musictheory.net's "Staff Identification" column. All music generation
stays in the Python microservice (music21); the frontend renders the returned
MusicXML with OSMD and validates answers against server-provided answer metadata,
exactly like the existing note game.

## Guiding observation

The note game already has the right architecture for all of these games:

- FastAPI endpoint returns `{ generatedXml, ...answer }`
- `useNoteQueue` prefetches responses (FIFO + low-water refill)
- `useNoteGame` owns state machine (Ready → Playing → GameOver), scoring, stats
- `GameSettings` / `GameBoard` / `GameResults` render the loop
- Go service persists per-user settings (`note_game_settings`) and score entries

The main work is **generalizing** that machinery, then each new game is mostly a
Python service method + a game config on the frontend.

## Phase 1 — Python microservice: new generators

New Pydantic models in `models.py`, endpoints in `routers/api.py`, logic in
`services/music_service.py`. All follow the note-game pattern: JSON with
`generatedXml` + answer fields. Error mapping stays the same (music21/Value/Key
→ 400, else 500).

### 1a. `POST /music/key-signature-game`

Request: `{ "clef": "treble"|"bass", "maxAccidentals": 0-7, "keyTypes": ["sharps","flats"] }`
- music21: pick `n = random.choice(candidates)` from `-maxAccidentals..maxAccidentals`
  (filtered by keyTypes, excluding or including 0 = C), then
  `ks = key.KeySignature(n)`; empty measure with the key signature and chosen clef.
- Answer: `ks.asKey('major').tonic.name` (screenshot shows "__ Major" with
  letter-only buttons — return both `tonicLetter` ("F") and full `tonic` ("F#")
  so the UI can decide button granularity later).
- Response: `{ generatedXml, tonic, tonicLetter, sharps: n }`
- Gotcha: OSMD needs at least a measure; verify an empty measure with just a
  clef + key signature renders (may need an invisible/whole rest).

### 1b. `POST /music/scale-game`

Request: `{ "tonicPool": [...], "scaleTypes": ["major","natural_minor","harmonic_minor","melodic_minor"], "octave": 4, "clef": "treble" }`
- music21: map scaleTypes → `scale.MajorScale`, `scale.MinorScale`,
  `scale.HarmonicMinorScale`, `scale.MelodicMinorScale`; pick random tonic +
  type; `sc.getPitches(f"{tonic}{octave}", f"{tonic}{octave+1}")` → 8 whole
  notes ascending, **no key signature** (accidentals inline, as in the
  screenshot).
- Response: `{ generatedXml, tonic, scaleType }` — answer is the scale *type*
  (the screenshot's four buttons), tonic kept for future harder modes.
- Gotcha: melodic minor should render ascending form only (music21's
  `MelodicMinorScale.getPitches` ascending is correct).

### 1c. `POST /music/chord-game`

Request: `{ "rootPool": [...], "qualities": ["major","minor","augmented","diminished","dominant7","major7","minor7","half_diminished7","diminished7"], "octave": 4, "clef": "treble", "useKeySignature": bool }`
- music21: quality → interval stack (e.g. dominant7 = ["P1","M3","P5","m7"]);
  build `chord.Chord` by transposing a fresh root per interval (music21
  requires unique Note objects); whole-note chord in one measure.
- Response: `{ generatedXml, root, quality }` — answer is the quality (matches
  screenshot buttons).
- Keep roots sane (avoid triple-accidental spellings): restrict rootPool to the
  circle-of-fourths keys already in `CIRCLE_OF_FOURTHS` plus their sharp
  spellings.

### 1d. Note game range support (for the range picker)

Extend `/music/note-game` (backwards-compatible): accept optional
`{ "lowNote": "F3", "highNote": "C6", "clef": "treble" }`. When present,
generate a random diatonic note of the chosen scale **within that pitch range**
instead of one fixed octave. Return `noteOctave` from the actual chosen pitch.
- music21: `sc.getPitches(low, high)` does exactly this.
- Also return `clef` in the XML (bass clef support falls out for free — the
  competitor has treble + bass ranges).

Tests: one test file per endpoint under `music-api/tests/` mirroring
`test_note_game_endpoint.py` (validation errors, response shape, XML parses,
answer consistent with XML content).

## Phase 2 — Frontend: generalize the game engine

Extract from `features/note-game` into something reusable (either
`features/identification-game` shared core, or generics inside `shared/`):

1. **`useQuestionQueue<T>`** — `useNoteQueue` parametrized by a fetcher
   `() => Promise<T>` instead of hardcoding `musicService.generateNoteGame`.
   Everything else (generation counter, low-water refill) stays.
2. **`useIdentificationGame<TAnswer>`** — `useNoteGame` with `currentNote`
   generalized to `currentAnswer: string` and answer comparison injected.
   Timer/notes-mode/stats logic is already answer-agnostic.
3. **Answer pad components** — the existing note buttons stay for note game;
   new pads: letter row (key signatures), 4-button grid (scales), 9-button grid
   (chords). All are dumb `options: string[]` + `onAnswer` components.
4. `GameBoard`/`ScoreBar`/`GameResults` become shared, receiving the answer pad
   as a child/prop.

New pages + routes: `/key-signature-game`, `/scale-game`, `/chord-game`
(pattern: `NoteGamePage`). New service methods in
`services/api/music.service.ts` + types.

## Phase 3 — Staff-based note range picker (adopt from competitor)

Replace the note game's "Scale + Octave" selects with a range picker like
image 2: a mini staff showing low and high whole notes with up/down chevrons on
each side, plus drag support on the note heads.

- **Render with plain SVG, not OSMD.** It's two whole notes + ledger lines on
  5 staff lines; OSMD re-layout per click is heavy and hard to make draggable.
  A small `StaffRangePicker` component (staff lines, clef glyph via SMuFL
  font/unicode 𝄞𝄢, note head ellipses, ledger lines) is ~200 lines and fully
  controllable.
- Model: `lowNote`/`highNote` as diatonic staff positions (letter+octave, no
  accidentals — range endpoints are natural notes, like the competitor).
  Chevrons step one staff position; drag = pointer-y → nearest staff position.
  Clamp: low ≤ high, sensible absolute bounds per clef (e.g. treble F3–C7).
- Wire into `GameSettings` + `MobileSettingsDrawer`; queue re-hydrates when
  range changes (already happens via `useNoteQueue` deps).

## Phase 4 — Go service: settings & score persistence

- **Score entries:** add `game_type` column (default `'note'`) to
  `note_game_entries` (migration) so dashboard charts can filter per game; new
  games post entries with their type. Chart strategies gain a game-type filter
  later — not a blocker for launch.
- **Settings:** extend `note_game_settings` with `low_note`, `high_note`,
  `clef` (for the range picker), and add per-game settings tables (or one
  `game_settings` table with `game_type` + JSONB config) for the three new
  games. Recommendation: **one `game_settings(user_id, game_type, config jsonb)`
  table** — the new games' settings are small and evolving; avoids a migration
  per tweak. Keep `note_game_settings` as-is for now, migrate later.
- Update DTO validation accordingly; `sqlc generate` after query changes.

## Suggested build order

1. Phase 1a–1c endpoints + tests (pure Python, no frontend risk)
2. Phase 2 engine generalization with note game as the only consumer (refactor,
   behavior unchanged — run existing vitest suites)
3. Key signature game end-to-end (simplest answer pad) → then scale → chord
4. Phase 1d + Phase 3 range picker
5. Phase 4 persistence (games work without it; settings just don't save)

Each step is independently shippable.
