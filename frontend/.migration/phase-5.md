# Phase 5 — Identification-game engine

**Depends on:** 3, 4 · **Weight:** ~20% · **Parallel:** independent of Phase 6

## Objective

The engine and its four games. This is the highest-value abstraction in the
codebase — **redesign it as an Angular/RxJS pattern per PLAN.md §5.5–§5.7. Do
not translate the hooks line by line.**

## Preconditions

```bash
grep -A6 '^| 3 ' frontend/.migration/STATE.md   # Phases 3 AND 4 → done
cd frontend && npm run build                     # exit 0
curl -s localhost:8000/docs >/dev/null && curl -s localhost:5001/health || true
cat frontend/.migration/phase-4-handoff.md       # SheetMusicComponent API
```

## Inputs

**Read `frontend-react/ARCHITECTURE.md` (game-engine section) and
`frontend/CLAUDE.md` before writing code.**

All of `frontend-react/src/features/identification-game/` (27 files, 2,306 LOC):

- `games/` — `types.ts` (the `GameDefinition` interface), `chord.ts`,
  `interval.ts`, `scale.ts`, `keySignature.tsx`, `index.ts`
- `settings/` — `types.ts` (`SettingDescriptor`), `presets.tsx`,
  `SettingsControls.tsx`, `sanitizeConfig.ts` **+ `sanitizeConfig.test.ts`**,
  `GameModeLimitControls.tsx`
- `hooks/` — `useIdentificationGame.ts` (state machine),
  `useQuestionQueue.ts` (prefetch), `useQuestionLoader.ts`,
  `useGameTimer.ts`, `useGameLifecycle.ts`, `useSaveGameOnEnd.ts`
- `components/` — `IdentificationGamePage.tsx`, `QuestionBoard.tsx`,
  `AnswerPad.tsx`, `ScoreBar.tsx`, `GameOverCard.tsx`,
  `KeySignatureGlyph.tsx`, `ClefGlyph.tsx`
- `types.ts`, `utils.ts`, `index.ts`

Cross-references (read-only — backends are **not** modified):

- `services/api/music.service.ts` — the four game endpoints
- Go `game_settings` (JSONB) persistence endpoints
- `backend/main/DTOs/game_types.go` — `ValidGameTypes`

## Work

- **`GameDefinition`** → pure-data interface per D9 / PLAN.md §5.7.
  `fetchQuestion` returns `Observable<T>`. Port all four definitions;
  `keySignature` loses its JSX and becomes `.ts`.

- **Shared constants live once** (invariant from `frontend/CLAUDE.md`):
  `TIME_LIMITS` / `NOTE_LIMITS`, `NATURAL_NOTES`, `CLEF_UNICODE` /
  `CLEF_LABELS` are exported from the feature barrel and imported everywhere
  else. **Do not redeclare them** — Phase 6 imports the same ones.

- **Prefetch queue service** per PLAN.md §5.5 (D8). Preserve exactly:
  low-water 2, hydrate batch 2, 300ms reset debounce, first-hydration-skips-
  debounce, partial batch failure → toast + continue.
  **Invariant (`frontend/CLAUDE.md`): the queue keys on
  `JSON.stringify(toRequest(settings))`. Any setting that affects the request
  MUST flow through `toRequest`, or prefetched questions go stale.**

- **Game state service** (provided per-page, signals): Ready → Playing →
  GameOver machine, answer log, per-question timing, `statsExtras` hook.
  **Port the npm/accuracy math from `useIdentificationGame.endGame` exactly** —
  it is the score users see.

- **Timer**: `interval(1000)` + `takeUntilDestroyed`, remaining as a signal.
  The React version's 65 lines of ref-mirroring guarded a StrictMode
  double-invoke bug that saved duplicate game-end entries. That bug class does
  not exist in Angular — **do not port the workaround, but DO keep a test
  asserting game-end saves exactly once.**

- **Settings**: `SettingsControls` renders the descriptor schema
  (choice / multiChoice / toggle + the §5.7 glyph union).
  `sanitizeConfig` **ports verbatim with its test** — persisted JSONB configs
  are validated against the schema on load. New settings need a descriptor +
  a default and nothing else.

- **Components**: game page shell, `QuestionBoard` (consumes
  `SheetMusicComponent` from Phase 4's handoff), `AnswerPad`, `ScoreBar`,
  `GameOverCard`, glyphs. Score save on game end.

- **Routes**: `/key-signature-game`, `/interval-game`, `/scale-game`,
  `/chord-game` via `identification-game.routes.ts`.

## Verify

```bash
cd frontend && npm run build && npm run lint && npm run test:run
```

Required tests:

- Queue **resets** on a payload-affecting setting change
- Queue **does not reset** on mode/limit change (non-payload settings)
- Stale in-flight response is dropped after a reset
- Low-water refill triggers
- State machine transitions (Ready → Playing → GameOver)
- Scoring math against known fixtures
- `sanitizeConfig` suite green (ported)
- **Game end saves exactly once**

Manual: play each of the four games end-to-end against live backends.

**Parity**: the four game-flow E2E specs pass unmodified; game-screen
screenshot diff per the dynamic-content carve-out (chrome diffed, staff masked
and asserted non-empty).

## Exit criteria

- [ ] All four games playable; next question appears with no visible fetch gap
- [ ] Settings persist, rehydrate, and sanitize across reloads
- [ ] Scores appear on the dashboard (Phase 3) after a finished game
- [ ] No JSX-shaped data left in `games/` — all four definitions are `.ts`
- [ ] Shared constants declared once, imported everywhere
- [ ] E2E specs green, unmodified
- [ ] build/lint/test exit 0

## Handoff must record

- **The final `GameDefinition` interface, verbatim** (docs update in Phase 7
  depends on it)
- The queue service's API
- The shared-constants barrel path
- Anything Phase 6 can reuse — it has parallel queue/loader concepts
