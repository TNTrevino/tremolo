# Tremolo keyboard overlay — piano prototype

A 3D-printed piano-key overlay for the note stream game. Seven white-key
levers rest over the home row (`a s d f g h j` = C D E F G A B, the
Tremolo default keymap). With `accidentals = true` (the default), five
black keys sit in the real piano slots — after C, D, F, G and A — and
press the top-row keys `w e t y u` (C# D# F# G# A#) through the QWERTY
row stagger. E#, B# and the flats have no lever on purpose: the app's
`overlap_accidentals` mode judges enharmonic spellings as the same
answer, so one black key is one pitch. A rounded nub under each lever
presses the letter key; the laptop key's own spring returns it. One
print, no assembly, no electronics.

The black keys stand 5 mm above the whites, like a real piano. The part
still prints top-face-down: the rail top shares a plane with the black
tops, so the print rests on both while the white faces sit on supports.
A PLA-S support interface keeps the white faces clean.

`overlay.scad` is the source of truth. It is fully parametric — every
laptop measurement is a variable at the top of the file. The prototype
targets a Framework 13; other laptops are a parameter change.

## Render

```bash
openscad -o coupon.stl  -D 'mode="coupon"' overlay.scad   # 2-key test print
openscad -o overlay.stl -D 'mode="full"'   overlay.scad   # all 7 keys
```

`make build-hardware` at the repo root renders both STLs plus the two
preview PNGs in one go. The Hardware CI workflow runs the same target on
every change under `hardware/` and uploads the results as workflow
artifacts, so a printable STL is always one download away.

## Measure before printing (calipers)

Values marked `VERIFY` in the script are guesses until you replace them:

| Parameter            | How to measure                                                                     | Guess     |
| -------------------- | ---------------------------------------------------------------------------------- | --------- |
| `key_pitch`          | Center of `a` to center of `j`, divided by 6 (spanning averages out the error)      | 19.05 mm  |
| `keycap_above_deck`  | Lay a straightedge on the deck across the keyboard; measure down to a keycap top    | 1.0 mm    |
| `rail_to_top_row`    | Front edge of where the rail sits on the deck strip near the screen, to the center of `t` | 38 mm |
| `row_pitch`          | Center of `t` to center of `g`, front-to-back component only                        | 19.05 mm  |
| `top_row_stagger`    | How far `g` sits right of `t`, side-to-side component only                          | 4.76 mm   |

The overlay sits like a piano: the rail rests on the deck strip between
the keyboard and the screen (above the Fn row), and the keys reach
toward you. Check that the strip is deep enough for the rail and slim
`rail_depth` if it is not.

The coupon prints C, D and the C# black key, so a misjudged stagger
shows up on the first small print, not the full one.

## Sliced output

`coupon-p1s.3mf` (when present) is the coupon pre-sliced for a Bambu
Lab P1S, 0.4 nozzle, PETG Translucent, textured PEI plate:

```bash
bambu-studio \
  --load-settings "<machine>.json;<process-with-bed-override>.json" \
  --load-filaments "<filament>.json" \
  --arrange 1 --slice 0 --export-3mf coupon-p1s.3mf coupon.stl
```

The stock `0.20mm Standard @BBL X1C` process is the P1S-compatible one;
a tiny user preset inheriting it sets `curr_bed_type` and
`compatible_printers`, because the CLI validates both.

`key_travel` is 1.5 mm per Framework's published spec — no need to
measure. Also confirm the palm rest has ≥ 14 mm of flat depth for the
rail without covering the touchpad.

## Print

- PETG. PLA flexures fatigue and snap.
- 0.2 mm layers, 3 perimeters. Enable supports, build plate only, and
  set the PLA-S spool as the support interface filament. The supports
  fill the 5 mm under the white faces; the interface peels off clean.
- The part prints top-face-down as exported; flip it over for use.
- Print `coupon.stl` first. It answers the three questions that matter:
  does the nub land on the key center, does a press register without
  touching neighbors, and does the flexure force feel right.

## Tune

- Press too stiff → lower `flexure_thickness` toward 0.8.
- Press too floppy or the key sags onto the keycap → raise it toward 1.2,
  or raise `nub_rest_gap`.
- Nub lands off-center front-to-back → adjust `rail_to_home_row`.
- Nub drifts sideways across the row → your `key_pitch` measurement is
  off; re-measure across all six gaps.

## Design notes

- The rail sits near the screen like a piano's key bed, and the levers
  reach toward the player. The white keys narrow at the back where the
  black keys live, the plan of real piano keys. Everything hovers
  `clearance_above_keys` over the rows it passes. The pivot is a
  printed flexure, not a hinge.
- The model is authored rotated 180° from the player's view, because
  the face-down print flip must stay a pure rotation. A mirrored export
  prints a reversed part that no flip can fix. The note order, the
  black-key lean, and the labels are all authored pre-rotated; the
  `orient="use"` render shows the part exactly as the player sees it.
- The white keys end 10 mm past the nub, the v1 length. The long
  press zone of v3 added reach but no leverage, so it went away.
- The design record for the game is
  `docs/superpowers/specs/2026-08-30-note-stream-game-design.md`.
- Framework publishes chassis CAD at
  https://github.com/FrameworkComputer/Framework-Laptop-13 — useful for a
  later frame that registers against the deck edges instead of relying on
  grip tape.
