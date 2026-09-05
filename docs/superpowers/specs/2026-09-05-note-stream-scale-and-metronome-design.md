# Note Stream — Scale Source, Settings and Visual Metronome

Date: 2026-09-05
Status: Approved design, pre-implementation
Supersedes parts of `2026-08-30-note-stream-game-design.md` (settings, rendering)

## Overview

Four changes to the note stream game:

1. **The pitch pool comes from music-api.** The game gains a key setting, and
   music21 stays the only place that knows what notes a key contains.
2. **The settings panel gains a key picker, a staff range picker and a typed
   tempo.** The accidentals toggle is removed.
3. **A visual metronome.** Four beat dots above the hit line show which beat
   of the bar is playing, and they replace the "Get ready…" count-in text.
4. **Two rendering corrections.** Clefs are drawn at engraving scale, and a
   judged note fades out before it reaches the clef.

The mockup that settled the design is at
<https://claude.ai/code/artifact/56442269-119a-43ae-8eaa-db1cf99c861a>.

## 1. The pitch pool

### Why a pool and not a stream of notes

`NoteSpawnerService` picks a random pitch every beat. At 120 BPM that is two
pitches per second, without end. Fetching notes one at a time, or in batches
behind a prefetch queue, would put the network on the critical path of a
stream that is already scrolling on screen. A late refill leaves a hole in
the music, which is a much harder promise than the note game's queue makes.
A late note-game fetch shows a spinner; a late stream fetch shows a gap.

The game does not need a stream of notes from the server. It needs the set of
pitches the key allows. That set is fixed for a session, so it is fetched
once, on the ready screen, while the player is still choosing settings. The
latency is spent on human thinking time. It is not hidden; it is not there.

`/music/note-game` is the wrong endpoint to reuse. It returns MusicXML plus
one answer, and the stream staff draws its own SVG, so the MusicXML is the
largest part of the payload and is discarded.

### The endpoint

```
POST /music/scale-pitches
{ "tonic": "B-", "scaleType": "major", "lowNote": "C4", "highNote": "C6" }
-> { "pitches": ["C4", "D4", "E-4", "F4", "G4", "A4", "B-4", ...] }
```

- `scaleType` is `"major"` or `"chromatic"`. `tonic` is ignored for
  chromatic.
- `MusicService.get_scale_pitches` builds `scale.MajorScale(tonic)` or
  `scale.ChromaticScale()`, then calls `getPitches(low_note, high_note)`.
  This is the same music21 call `get_note_game` already makes.
- The route is **not** a game endpoint. It returns no `generatedXml`, so it
  does not go through the `run_game_endpoint` helper. It maps errors the same
  way: music21, `ValueError` and `KeyError` become 400, everything else 500.
- A low note above the high note raises `ValueError`. An empty pitch list
  raises `ValueError`.

### The notation boundary

`MusicService.getScalePitches` in the frontend sends `toMusic21NoteName(tonic)`
and maps every returned pitch through `fromMusic21NoteName`. This is the
invariant in `CLAUDE.md`: only `shared/services/music.service.ts` crosses the
`-` / `b` boundary, and this new method is the only new place that does.

Pitches carry an octave (`"E-4"` -> `"Eb4"`). The spawner splits the octave
off for the key-press name and keeps it for the diatonic index.

### Hydration

`NoteStreamGamePageComponent` owns an `rxResource` keyed on a computed of
`{ scale, clef, lowNote, highNote }`. It follows the frontend's read rules:
branch on `status() === "loading"`, and guard `value()` behind `error()`.

The resolved list reaches `NoteStreamGameService.pitchPool`, which forwards it
to `spawner.configure(settings, pool)`. This is the same page-to-service
hand-off `keyBindings` already uses, and for the same reason: the resource
needs the page's injection context.

**A failed fetch blocks the start.** The panel shows the error and keeps Start
disabled, with a Retry button. A silent fallback to local naturals would
teach the student a key they did not pick, which is worse than no game. This
is a deliberate regression: the stream game runs with music-api down today
and will not after this change.

## 2. Settings

```ts
export interface NoteStreamSettings {
	clef: RangeClef;
	/** "C Major" … "B Major", or "Chromatic". */
	scale: string;
	/** Lowest note in the practice range, natural (e.g. "C4"). */
	lowNote: string;
	/** Highest note in the practice range, natural (e.g. "C6"). */
	highNote: string;
	tempoBpm: number;
	sessionSeconds: number;
}
```

`accidentals` is deleted, along with `ACCIDENTAL_CHANCE` and
`StreamAccidental`'s random assignment. A key already decides its
accidentals: F major forces a B♭ and D major forces F♯ and C♯. A separate
random toggle would fight the key and could produce a pitch belonging to no
key at all. `"Chromatic"` is the setting for a student who wants every
accidental.

`TEMPO_CHOICES` is deleted. Tempo becomes an integer input, 30 to 200 BPM,
clamped on blur. A preview dot beside the field ticks at the typed tempo, so
a number means something before the player presses Start.

### The key picker

Thirteen chips in a **7-column grid**, in circle-of-fifths reading order:

| Row | Chips |
| --- | --- |
| 1 | C, G, D, A, E, B, F♯ |
| 2 | G♭, D♭, A♭, E♭, B♭, F |
| 3 | Chromatic (full width) |

Row 1 adds one sharp per step. Row 2 picks the circle back up at F♯'s
enharmonic twin and sheds one flat per step, closing on F, which is next door
to C again. **Both F♯ and G♭ appear**, and selecting either adds a line to the
caption below the grid: "6 sharps: F♯ C♯ G♯ D♯ A♯ E♯. Sounds the same as G♭,
spelled the other way."

The caption otherwise names the key signature of the selected key.

The list reuses `SCALES` and `extractTonic` from
`features/note-game/models/note-game.models.ts` and adds F♯ Major and a
`"Chromatic"` entry.

### The range picker

`NoteRangeSettingComponent` from the note game is reused whole. It already
pairs the clef toggle with the staff picker, and it already resets the range
to that clef's default when the clef changes. The stream panel's own clef
buttons are removed in favour of it.

Bounds and defaults come from `note-game/models/range.utils.ts` unchanged:
treble A3–C7 defaulting to C4–C6, bass C2–E5 defaulting to E2–E4.

### Panel layout

One scrolling column. The panel is taller than a phone screen and that is
accepted.

## 3. The visual metronome

Four dots sit in their own band above the hit line, centred on it.

- Exactly one dot is filled at a time, and it walks left to right across the
  bar. This shows **where in the bar** the player is, not only that a beat
  happened.
- Beat 1 fills brass. Beats 2 to 4 fill ink. The audio metronome already
  accents beat 1 in `StreamTransportService.scheduleDueClicks`, so the brass
  dot and the loud click are one event.
- The same four dots run the count-in. `COUNT_IN_BEATS` is 4 and
  `BEATS_PER_BAR` is 4, so the count-in is one bar. Numerals are drawn under
  the dots during the count-in only, and the "Get ready…" text is removed.

**The hit line does not pulse.** It stays one steady brass line. The beat
lives in the dots and nowhere else, so the hit line keeps its single job of
marking the moment a note is judged, and it never competes with the judgment
flash.

`STAFF_HEIGHT` grows from 216 to 240 and the staff shifts down 24px, so the
dot band clears the ledger-line area above the top staff line.

The dots read the beat from the same `getCurrentBeat` the staff already
calls each frame. No new timer and no new signal.

## 4. Rendering corrections

### Clefs are drawn, not typed

`CLEF_UNICODE` is rendered as SVG `<text>` at `3.4 × LINE_SPACING` in both
`stream-staff.component.ts` and `staff-range-picker.component.ts`. The size of
U+1D11E depends on whichever system font answers for it, and it comes out at
roughly a third of engraving scale. A correct treble clef stands 6.5 staff
spaces tall against a 4-space staff: it overhangs the top line and its tail
drops below the bottom one.

Both clefs become SVG paths, taken from Vexflow's Gonville outlines (glyphs
`v83` and `v79`, already in `node_modules`) and converted to path data.

- Gonville is drawn at **365.5 font units per staff space**.
- Each glyph's origin sits on the line the clef names: the G line for treble
  (index 3 from the top), the F line for bass (index 1).
- Placement is therefore `translate(x, lineY) scale(LINE_SPACING / 365.5)`.

The paths live in a new shared module so both staves and any future one use
the same source. The anchor was never wrong; only the size was.

### A judged note clears the clef

Engraved music never puts a note head in the clef's space. Today
`PRUNE_AFTER_BEATS` is 2, which carries a judged note 280px left of the hit
line, to x = −140, straight across the clef.

A note holds full strength until the hit line at x = 140, then fades to
nothing by x = 76. The clef occupies x = 24 to 61, leaving 15px clear.
`PRUNE_AFTER_BEATS` drops to 0.5.

**The fade is a distance, not a duration.** The clef sits at a fixed x, so the
note must clear the same ground at 30 BPM and at 200. A time-based fade would
leave notes on the clef at slow tempos.

It is drawn as one `linearGradient` mask covering the staff, hung on a
wrapper group with no transform of its own. The scrolling group sits inside
that wrapper. This keeps the scroll a **single transform write per frame**,
which is the property the component was built around, instead of an opacity
write per note. The right edge gets the same fade over 40px, so notes arrive
rather than pop in.

### Stem direction

A note at or above the middle line takes a down stem on the left of the head.
`MIDDLE_LINE_STEP` is 4.

## Delivery

Seven pull requests. Two stacks, plus this document.

**This spec** — its own PR on `feat/note-game-improvements`.

**Stack A — rendering**, off `main`, independent of Stack B:

1. `feat/engraved-clefs` — clef paths module, applied to the stream staff and
   the note-game range picker; stem direction; the note fade;
   `PRUNE_AFTER_BEATS`.
2. `feat/visual-metronome` — the beat dots, `STAFF_HEIGHT`, count-in wiring,
   removal of the "Get ready…" text.

**Stack B — scale and settings**, off `main`:

1. `feat/scale-pitches-endpoint` — music-api route, model, service, tests.
2. `feat/scale-pitches-client` — `MusicService.getScalePitches` and its
   mapper tests.
3. `feat/stream-settings-model` — `NoteStreamSettings` reshape, the spawner
   driven by a pitch pool, `accidentals` removed.
4. `feat/stream-settings-ui` — key picker, range picker, BPM input, and the
   `rxResource` hydration.

Both stacks touch `note-stream.models.ts`. Stack A adds dot and fade
constants; Stack B reshapes the settings interface. Whichever merges second
rebases.

## Testing

- **music-api**: F major spells `B-`; chromatic over two octaves returns 25
  pitches; an inverted range returns 400; an unknown `scaleType` returns 422.
- **`MusicService`**: the tonic converts out, every pitch converts back.
- **`NoteSpawnerService`**: it draws only from the pool; it never repeats a
  pitch back to back; a one-entry pool does not loop forever.
- **`StreamStaffComponent`**: the clef path anchors to the G line for treble
  and the F line for bass; the dot band clears the ledger area; a note past
  the hit line is inside the faded region.
- **The page**: the pool reaches the spawner; Start is disabled while the
  resource is loading and while it is in error.
- No e2e.

## Out of scope

Persistence is unchanged. The stream game still saves nothing, stays out of
the `GameType` union, `ValidGameTypes` and `GAME_DEFINITIONS`, and its
settings still die on reload. Rhythm variety, minor keys and modes, and
BPM-proportional hit windows all stay deferred.
