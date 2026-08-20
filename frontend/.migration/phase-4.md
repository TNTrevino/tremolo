# Phase 4 — Sheet music / OSMD

**Depends on:** 2 · **Weight:** ~5% · **Parallel:** can run alongside Phase 3

## Objective

The OSMD rendering component — a hard prerequisite for Phases 5 and 6. Small
and isolated.

## Preconditions

```bash
grep -A4 '^| 2 ' frontend/.migration/STATE.md   # Phase 2 → done
cd frontend && npm run build                     # exit 0
curl -s localhost:8000/docs >/dev/null && echo "music service up"
```

## Inputs

From `frontend-react/src/`:

- `features/sheet-music/` (4 files, 363 LOC) — especially
  `hooks/useOSMD.ts` (201 LOC) and `SheetMusicDisplay`
- `services/api/music.service.ts`, `services/api/types/music.types.ts`,
  `services/api/mappers/music.mapper.ts`
- Pages: `SheetMusicPage.tsx`, `ConverterPage.tsx`
- `frontend-react/ARCHITECTURE.md` — the rendering-layer section

## Work

- **`SheetMusicComponent`**: OSMD instance created after view init against a
  `viewChild` container. Mirror `useOSMD`'s API:
  - `loadAndRender(xml)` (async), `clear()`
  - `zoom` input
  - `isLoading` / `error` as signals
  - render-complete and render-error outputs
  - instance **disposed on destroy** (a legitimate `ngOnDestroy` — see
    PLAN.md §5.6)

  OSMD is imperative and framework-agnostic: this is a lifecycle wrapper, not
  a rewrite. Do not restructure its rendering logic.

- **`MusicService`** (Observables, D5) for the endpoints these pages use.

  > **Boundary invariant (from `frontend/CLAUDE.md`):** notation converts at
  > the API boundary **only**, in `music.mapper.ts` — music21 spells flats
  > `"-"` ("B-"), the frontend uses `"b"` ("Bb"). Feature code never sees
  > music21 spelling. Port the mapper faithfully and do **not** re-convert in
  > components.

- Sheet-music page and converter page.

## Verify

```bash
cd frontend && npm run build && npm run lint && npm run test:run
```

- Component test: invalid XML → error signal set; valid XML → render-complete
  fires (OSMD mocked in unit tests).
- Mapper test: music21 `"-"` flats → frontend `"b"` round-trip.
- Manual: real MusicXML from the Python service renders; zoom applies; clear
  empties the container.
- **Parity**: sheet-music/convert E2E specs pass unmodified; screenshot diff
  with the staff region masked, staff region asserted non-empty.

## Exit criteria

- [ ] `/sheet-music` and `/convert` functional against the live music service
- [ ] Render failure surfaces through the error path (not a blank stave)
- [ ] No music21 `"-"` spelling leaks past the mapper
- [ ] E2E specs green, unmodified
- [ ] build/lint/test exit 0

## Handoff must record

- **The exact `SheetMusicComponent` API** — Phases 5 and 6 both consume it,
  so document inputs/outputs/methods precisely
- OSMD options carried over from `useOSMD`
- Any OSMD behavior that needed a workaround under zoneless change detection
