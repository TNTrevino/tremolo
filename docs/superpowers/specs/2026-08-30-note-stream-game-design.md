# Note Stream Game — Design

Date: 2026-08-30
Status: Approved design, pre-implementation

## Overview

A new "note stream" game in the Guitar Hero style. Notes scroll from right
to left across a musical staff at a set tempo. The student presses the key
for the correct pitch at the moment the note crosses a fixed hit line. Each
hit gets a timing judgment (Perfect, Great, Good, Miss), points, and a
streak multiplier.

This is a **brand new game**, separate from the existing note game. It gets
its own feature folder, route, and nav entry. The existing note game does
not change.

## Goals

- Test pitch reading **and** timing together, under a steady tempo.
- Arcade feel: endless stream, judgment popups, streak, multiplier, and a
  blue-flame visual at max multiplier.
- Frontend only. Zero backend changes in v1.

## Non-goals (v1)

- No persistence. Scores are not saved to core-api. The `GameType` union,
  `ValidGameTypes`, dashboards, and teacher assignment stay untouched.
- No music-api involvement. The frontend generates pitches itself.
- No rhythm variety. Quarter notes only, one note per beat.
- No MIDI, no microphone. Input is the computer keyboard using the existing
  note-game key map and saved bindings (a 3D-printed key overlay maps onto
  this same layout).
- No fail state / health bar.

## Architecture

New feature folder: `frontend/src/app/features/note-stream-game/` with the
standard `components`, `models`, `services` split.

The game does **not** use `GameStateService` — that engine assumes one
static MusicXML question and one string answer (`answer(guess) → boolean`),
which cannot express timed hits. The game has its own small engine of four
services.

### Services

- **`StreamTransportService`** — the clock. Owns start time, tempo, and the
  current beat. Samples `AudioContext.currentTime` and `performance.now()`
  together at start so key-press `event.timeStamp` values map onto the
  audio clock. Schedules metronome clicks with a lookahead scheduler
  (~25 ms tick, ~120 ms lookahead) on the Web Audio API. Supports
  pause/resume by accumulating elapsed beats. One clock drives the scroll,
  the clicks, and the judgment.
- **`NoteSpawnerService`** — generates random pitches from the settings
  (clef, range, accidentals). Each note is a plain object:
  `{ id, pitch, octave, beat }`. Keeps a rolling buffer of upcoming notes a
  few beats ahead of the viewport. No backend call.
- **`StreamScoreService`** — judges presses and keeps score state as
  signals: points, streak, multiplier, per-judgment counts. Pure logic;
  fully unit-testable with injected times.
- **`NoteStreamGameService`** — composition root, in the style of
  `NoteGameService`. Owns the settings signal, attaches the existing
  `noteKeyboardInput` stream and saved key bindings from the note-game
  feature, and wires the other three services together.

### Components

- **`NoteStreamGamePageComponent`** — routed page: layout, settings, start
  button, pause overlay, results screen.
- **`StreamStaffComponent`** — the custom SVG renderer (see Rendering).
- Small HUD components: score, streak/multiplier flame, judgment popup.

### Reuse

- `noteKeyboardInput` + key map + saved bindings from
  `features/note-game/` (read-only reuse; add `event.timeStamp` capture).
- `NoteAudioService` plays the marimba sample on a correct hit.
- `GameTimerService` runs the 1 Hz session countdown only. It never judges
  timing.

## Rendering (Approach A: custom SVG staff)

OSMD is not used. OSMD lays music out in fixed-width systems and fights an
endless horizontal stream; nothing in the repo uses its cursor or
graphical-position APIs today.

Instead `StreamStaffComponent` draws:

- Five staff lines, a clef glyph, and a fixed hit line just right of the
  clef.
- One SVG `<g>` per visible note: note head, stem, ledger lines, accidental
  glyph when needed. Vertical position comes from a pitch → staff-step
  mapping per clef.
- A `requestAnimationFrame` loop sets each note group's x each frame:

  ```
  x = hitLineX + (noteBeat − currentBeat) × pixelsPerBeat
  ```

  with `pixelsPerBeat ≈ 140` and `currentBeat` read from the transport.
  Scroll speed therefore comes from tempo alone.
- Notes spawn when x enters the right edge and despawn after judgment (hit
  animation) or after the miss point (fade).

Quarter notes only keeps the drawing surface small. Canvas is a fallback
only if frame rate becomes a problem (<10 notes visible; not expected).

## Timing model and scoring heuristic

### Clock

Current beat = `elapsedSeconds × bpm / 60`. Elapsed time comes from the
audio clock; key presses use `event.timeStamp` mapped through the
performance-time↔audio-time pairing sampled at start. A four-beat count-in
with clicks runs before the first note.

### Hit windows (v1: fixed ms)

| Judgment | Window around the note's beat time |
|----------|-----------------------------------|
| Perfect  | ±60 ms                            |
| Great    | ±120 ms                           |
| Good     | ±180 ms                           |
| Miss     | no press by +180 ms               |

Fixed windows keep every tempo feeling the same. **Future:** make the
windows proportional to the beat period (BPM-scaled), per user direction.

### Press matching

A press matches the open (unjudged) note whose beat time is nearest to the
press time, within ±180 ms.

- **Correct pitch** → judgment by |delta|; note leaves the stream with a
  hit animation; marimba sample plays.
- **Wrong pitch** → that note becomes a Miss immediately and the streak
  breaks. No retry — this blocks key-mashing.
- **No note in any window** → the press breaks the streak only; no Miss is
  recorded.

### Points and streak

- Base points: Perfect 100, Great 75, Good 50, Miss 0.
- Multiplier: `1 + floor(streak / 10)`, capped at 4.
- Points awarded: `base × multiplier`.
- Streak counts consecutive judged hits of Good or better.
- At multiplier ×4 the streak flame turns blue (the "blue streak").

### Feedback

Each judgment pops a colored label above the hit line. Correct hits play
the pitch's marimba sample. Misses play nothing. The metronome accents the
downbeat every 4 beats.

## Settings (in memory only, v1)

- Clef: treble | bass (default treble).
- Tempo: 30–120 BPM (default 60).
- Accidentals: off | on (default off; on includes sharps and flats within
  the range).
- Session length: 30 | 60 | 120 seconds (default 60).
- Note range: a sensible fixed default per clef in v1 (staff plus one
  ledger line each side); a configurable range is future work.

## Session flow

1. Ready screen: settings + start button.
2. Start click unlocks/creates the `AudioContext` (user gesture).
3. Four-beat count-in with clicks.
4. Endless stream until the countdown ends (reuses `GameTimerService`).
5. Spawning stops at the end; in-flight notes resolve; results screen shows
   score, max streak, per-judgment counts, and accuracy.
6. Play again / change settings.

**Pause:** Escape pauses. `visibilitychange` to hidden auto-pauses, so rAF
throttling in background tabs cannot cause mass misses. Resume runs a fresh
four-beat count-in.

## Error handling

- `AudioContext` unavailable or blocked: the game runs silently; timing
  falls back to `performance.now()` alone. (Matches `NoteAudioService`'s
  jsdom-safe pattern.)
- Saved key bindings fail to load (anonymous user or network error): fall
  back to the default key map.
- Suspended audio context on start: resume on the start gesture, as
  `NoteAudioService.playNoteSound` already does.

## Route and navigation

- Lazy route `/note-stream-game` inlined in `src/app/app.routes.ts`.
- A nav link ("Note Stream").
- **Not** added to `GAME_DEFINITIONS`, the TS `GameType` union, or
  core-api `ValidGameTypes` — those exist for persistence and teacher
  assignment, which v1 does not have.

## Testing

- **`StreamScoreService` (unit):** window boundary values (59/60/61 ms
  etc.), nearest-note matching with two candidates, wrong-pitch miss,
  stray-press streak break, multiplier progression and cap, points math.
- **`StreamTransportService` (unit):** beat math with an injected fake
  clock; pause/resume accumulation; count-in offset.
- **`NoteSpawnerService` (unit):** notes respect clef range and the
  accidentals toggle; buffer stays filled ahead of the viewport; seeded
  RNG for deterministic tests.
- **`StreamStaffComponent` (component):** pitch → y mapping per clef,
  including ledger-line notes; hit-line x constant.
- No e2e in v1.

## Future work (explicitly deferred)

- Hit windows proportional to BPM (user-requested follow-up).
- Rhythm variety: half/eighth notes, rests (`_build_rhythm` in music-api is
  the seed if generation moves server-side).
- Persistence: new `game_type`, nullable columns on `note_game_entries` for
  points / max streak / per-window counts; dashboard charts; teacher
  assignment via `GAME_DEFINITIONS`.
- Difficulty presets (window widths, tempo ramps), health-bar fail mode.
- On-screen piano / MIDI input.
