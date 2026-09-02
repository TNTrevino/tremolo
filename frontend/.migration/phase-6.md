# Phase 6 — Note game

**Depends on:** 3, 4 · **Weight:** ~13% · **Parallel:** independent of Phase 5

## Objective

The note game — the largest single feature after the engine, with its own
input and audio paths.

## Preconditions

```bash
grep -A6 '^| 3 ' frontend/.migration/STATE.md   # Phases 3 AND 4 → done
cd frontend && npm run build                     # exit 0
cat frontend/.migration/phase-4-handoff.md       # SheetMusicComponent API
ls frontend/.migration/phase-5-handoff.md 2>/dev/null   # if Phase 5 landed
```

If Phase 5 finished first, **read its handoff** — its queue and engine
services may be directly reusable.

## Inputs

**Read `frontend/CLAUDE.md` — the note-game invariants below come from it.**

From `frontend-react/src/`:

- `features/note-game/` (18 files, 2,221 LOC):
  `hooks/useNoteGame.ts`, `hooks/useNoteQueue.ts`,
  `hooks/useKeyboardInput.ts` (the 21-note keymap),
  `hooks/useNoteAudio.ts`, plus components
- `features/note-game-display/` (4 files, 219 LOC) —
  `useNoteGameDisplay.ts` and display components
- Go persistence: `note_game_entries`, `note_game_settings` endpoints
  (read-only — backend unchanged)

## Critical invariants (from `frontend/CLAUDE.md`)

- **The note game composes the engine.** `useNoteGame` delegates to
  `useIdentificationGame` and layers audio + keyboard input on top. Preserve
  that composition: reuse Phase 5's game-state service rather than forking a
  parallel state machine. If Phase 5 has not landed yet, build against the
  same interface and reconcile before Phase 7.
- **The range picker supports `RangeClef` (treble/bass) only.**
- **`octave` in its settings is legacy persistence — the range is what plays.**
  Do not "fix" `octave` into meaningful behavior; keep it as inert persisted
  data so existing saved settings still load.
- Shared constants (`NATURAL_NOTES`, `CLEF_UNICODE`/`CLEF_LABELS`,
  `TIME_LIMITS`/`NOTE_LIMITS`) are **imported from the identification-game
  barrel**, never redeclared.

## Work

- **Keyboard input**: `fromEvent<KeyboardEvent>(document, 'keydown')` →
  `map`/`filter` through the keymap → `takeUntilDestroyed()`
  (PLAN.md §5.6). Active only while the game is playing. The 21-note keymap
  (3 rows: sharps `q-u`, naturals `a-j`, flats `z-m`, both cases) is plain
  data — **port verbatim**.
- **Note queue**: reuse/adapt Phase 5's queue service if its handoff says the
  API fits; otherwise a parallel implementation with the same operator shape
  (PLAN.md §5.5).
- **Audio decision (deferred, PLAN.md §2):** `howler` directly (what
  `use-sound` wraps) or Web Audio. **Version-check first (R6); record the
  choice in `STATE.md`'s deferred-decisions table.** Port `useNoteAudio`
  semantics — sound on correct answer.
- Game state/scoring per `useNoteGame`; note-game-display components; settings
  and score persistence to the Go endpoints.
- Route: `/note-game`.

## Verify

```bash
cd frontend && npm run build && npm run lint && npm run test:run
grep -rn "NATURAL_NOTES\s*=" src/app/features/note-game/   # → no redeclaration
```

Required tests:

- Keymap translation (sharps / naturals / flats rows, both cases)
- Keyboard stream inactive when not playing
- Scoring fixtures
- Save-once on game end
- Legacy `octave` setting loads without breaking, range drives playback

Manual: full game via keyboard and via click; audio fires on correct answers.

**Parity**: note-game E2E spec passes unmodified, including the keyboard-input
path; screenshots per the dynamic-content carve-out.

## Exit criteria

- [ ] Note game playable by keyboard and by click
- [ ] Scores persist and appear on the dashboard
- [ ] Audio decision recorded in `STATE.md`; `use-sound` absent from `package.json`
- [ ] Engine composition preserved (no forked state machine)
- [ ] Shared constants imported, not redeclared
- [ ] E2E spec green, unmodified
- [ ] build/lint/test exit 0

## Handoff must record

- Audio library decision + rationale
- Whether Phase 5's queue/engine was reused or forked, and why
- Any note-game behavior that differs from the identification games
