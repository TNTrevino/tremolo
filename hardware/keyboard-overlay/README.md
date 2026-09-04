# Tremolo keyboard overlay — piano prototype

![The overlay as the player sees it: seven white keys labelled C to B, with
C#, D#, F#, G# and A# standing proud between them](preview-use.png)

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

## How a key works

Every key is the same machine. A stiff beam, a thin bending neck at the
rail, and a rounded nub underneath that touches one keycap. The laptop
key's own spring pushes it back up. A black key is the same machine with
a shorter beam, a block standing `black_raise` proud, and a nub that
reaches the row nearer the screen.

![Two side sections through the part. Section A cuts a white key: the
rail on the deck, the 1 mm flexure, the 4 mm lever and the nub over a
home-row keycap. Section B cuts a black key: the same rail and neck, a
shorter body, the raised block with its chamfer, and a nub over a
top-row keycap](docs/lever-sections.svg)

Every `z` dimension in `overlay.scad` is in that drawing. Only the five
values marked `VERIFY` are guesses; the rest derive from them.

## Render

```bash
openscad -o coupon.stl  -D 'mode="coupon"' overlay.scad   # 2-key test print
openscad -o overlay.stl -D 'mode="full"'   overlay.scad   # all 7 keys
```

Those are the one-filament prints. For two filaments, render the same
solid split in two — see [Two-filament print](#two-filament-print):

```bash
openscad -o overlay-rest.stl   -D 'part="rest"'   overlay.scad  # rail + whites
openscad -o overlay-blacks.stl -D 'part="blacks"' overlay.scad  # the 5 blacks
```

`make build-hardware` at the repo root renders all six STLs plus the
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

## Two-filament print

Printing the black keys in a second filament used to snap them off at
the rail. The cause is geometry, not the slicer. A black key hangs on
its flexure alone, about 7.7 mm² of material, and the part prints face
down, so the two filaments meet on a **vertical** wall. The printer lays
them side by side inside one layer, and a side seam between dissimilar
filaments carries almost no load.

`part="blacks"` therefore grows a T-shaped tenon on each black key that
reaches back into the rail, behind the flexure. `part="rest"` cuts the
matching pocket out of the rail. A pull on the key now presses the head
against rail material in compression instead of peeling the seam apart.

![Plan view of the rail with the tenon inside it. The 14 mm head sits
deep in the rail behind a 2 mm back gap, the 7.7 mm stem reaches out to
the rail face, and the two shoulders block a pull on the key. The
neighbouring anchors leave a 5.05 mm rail wall](docs/tenon-plan.svg)

The tenon sits in the layers the black keys already occupy, so it costs
no extra filament swap, and it stays behind the rail face, so the
flexure keeps its full bend and the key feel does not change.

![The five black keys rendered on their own, each ending in a T-shaped
tenon that locks into the rail](preview-blacks.png)

The two halves are complementary and share absolute coordinates. In the
slicer, load `overlay-rest.stl`, then right-click it and **add
`overlay-blacks.stl` as a part of that same object** — not as a second
object. Assign a filament to each part. Do not move either one.

`overlay.stl` still holds both halves fused, for a one-filament print.

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
- `black_anchor()` is written once and used twice: `black_lever()` adds
  it, `rail()` subtracts it. That is what keeps the two halves exactly
  complementary. The check is arithmetic — the mesh volume of `rest`
  plus the mesh volume of `blacks` equals the volume of `all`, and `all`
  matches the model from before the anchors existed.
- The design record for the game is
  `docs/superpowers/specs/2026-08-30-note-stream-game-design.md`.
- Framework publishes chassis CAD at
  https://github.com/FrameworkComputer/Framework-Laptop-13 — useful for a
  later frame that registers against the deck edges instead of relying on
  grip tape.
