# Tremolo keyboard overlay — naturals-only prototype

A 3D-printed piano-key overlay for the note stream game. Seven white-key
levers rest over the home row (`a s d f g h j` = C D E F G A B, the
Tremolo default keymap). A rounded nub under each lever presses the
letter key; the laptop key's own spring returns it. One print, no
assembly, no electronics.

`overlay.scad` is the source of truth. It is fully parametric — every
laptop measurement is a variable at the top of the file. The prototype
targets a Framework 13; other laptops are a parameter change.

## Render

```bash
openscad -o coupon.stl  -D 'mode="coupon"' overlay.scad   # 2-key test print
openscad -o overlay.stl -D 'mode="full"'   overlay.scad   # all 7 keys
```

## Measure before printing (calipers)

Values marked `VERIFY` in the script are guesses until you replace them:

| Parameter            | How to measure                                                                     | Guess     |
| -------------------- | ---------------------------------------------------------------------------------- | --------- |
| `key_pitch`          | Center of `a` to center of `j`, divided by 6 (spanning averages out the error)      | 19.05 mm  |
| `keycap_above_deck`  | Lay a straightedge on the deck across the keyboard; measure down to a keycap top    | 1.0 mm    |
| `rail_to_home_row`   | Front edge of where the rail will sit on the palm rest, to the center of `g`        | 58 mm     |

`key_travel` is 1.5 mm per Framework's published spec — no need to
measure. Also confirm the palm rest has ≥ 14 mm of flat depth for the
rail without covering the touchpad.

## Print

- PETG. PLA flexures fatigue and snap.
- 0.2 mm layers, 3 perimeters, no supports. The part prints top-face-down
  as exported; flip it over for use.
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

- The rail sits on the palm rest and the levers reach away from the
  player, clearing the flats row and the spacebar row by
  `clearance_above_keys`. The pivot is a printed flexure, not a hinge.
- Engraved note letters sit on the key tops. They are stored mirrored in
  the model because the print flip un-mirrors them.
- Sharps and flats are deliberately out of v1. The game's default
  settings use naturals only; the design record for the game is
  `docs/superpowers/specs/2026-08-30-note-stream-game-design.md`.
- Framework publishes chassis CAD at
  https://github.com/FrameworkComputer/Framework-Laptop-13 — useful for a
  later frame that registers against the deck edges instead of relying on
  grip tape.
