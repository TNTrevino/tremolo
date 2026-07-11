# frontend — agent notes

React + Vite SPA. **Read `ARCHITECTURE.md` here before structural changes** —
it documents the game engine, API conventions, and rendering layer in full.

Invariants:

- Identification games are declarative `GameDefinition` modules in
  `features/identification-game/games/`. Add features by extending the
  definition (settings schema, `toRequest`, answers) — not by editing the
  shared page/engine. The question queue keys on
  `JSON.stringify(toRequest(settings))`; a setting that affects the request
  MUST flow through `toRequest` or prefetched questions go stale.
- Settings chips/dropdowns render from the `SettingDescriptor` schema;
  persisted JSONB configs are validated by `sanitizeConfig` on load. New
  settings need a descriptor + a default — nothing else.
- Notation converts at the API boundary only
  (`services/api/mappers/music.mapper.ts`): feature code never sees music21
  `"-"` flats. Don't re-convert in components.
- Shared constants live once: `TIME_LIMITS`/`NOTE_LIMITS`, `NATURAL_NOTES`,
  `CLEF_UNICODE`/`CLEF_LABELS` — import from
  `@/features/identification-game`, don't redeclare.
- The note game composes the engine: `useNoteGame` delegates to
  `useIdentificationGame` and layers audio and keyboard input on top. Its
  range picker supports `RangeClef` (treble/bass) only, and `octave` in its
  settings is legacy persistence — the range is what plays.
- Hard tabs (Prettier), `@/` → `src/`, ESLint runs with `--max-warnings 0`.

Workflow: `npm run test:run`, `npm run lint`, `npm run build` (tsc runs in
build). One pre-existing failure in `auth.store.test.ts` is known.
