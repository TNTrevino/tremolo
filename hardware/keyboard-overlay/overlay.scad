/*
 * Tremolo keyboard overlay — piano prototype (v4, raised black keys).
 *
 * The overlay sits like a piano: the rail (the base) rests on the deck
 * strip near the SCREEN, and the keys reach toward the player. Seven
 * white keys run long and press the home row (a s d f g h j =
 * C D E F G A B, the Tremolo default keymap). With `accidentals` on,
 * five short black keys sit close to the base in the real piano slots —
 * after C, D, F, G and A — and press the top-row keys w e t y u. The
 * white keys narrow at the back where the black keys live, exactly the
 * plan-view shape of real piano white keys. E#, B# and the flats have
 * no lever on purpose: the app's overlap_accidentals mode judges
 * enharmonic spellings as the same answer, so one black key is one
 * pitch.
 *
 * Every key is a lever pivoting on a thin flexure at the rail. A
 * rounded nub under the lever presses the letter key; the laptop key's
 * own spring returns it. One print, no assembly.
 *
 * Black keys stand black_raise above the whites, like a real piano.
 * The part still prints top-face-down: the rail top shares a plane
 * with the black tops, so the print rests on the rail and the five
 * black keys while the white faces hang on supports. Slice with
 * supports (build plate only) and a PLA-S support interface; the
 * interface peels off and leaves the visible white faces clean.
 *
 * Print in PETG (PLA flexures fatigue and snap), 0.2 mm layers,
 * 3 perimeters. Dimensions marked VERIFY are guesses until
 * measured — see README.md. Renders:
 *
 *   openscad -o coupon.stl  -D 'mode="coupon"' overlay.scad
 *   openscad -o overlay.stl -D 'mode="full"'   overlay.scad
 */

/* ---------------------------------------------------------------- mode */

mode = "full"; // "coupon" = C + D + C# test print, "full" = everything
accidentals = true; // false renders a naturals-only shape
orient = "print"; // "use" previews the part as it sits on the laptop
key_count = (mode == "coupon") ? 2 : 7;

/* --------------------------------------------- laptop measurements */

// Center-to-center distance of adjacent letter keys (a -> s).
// Standard full-size pitch; Framework does not publish it.
key_pitch = 19.05; // VERIFY

// Center-to-center distance between the top letter row and the home row.
row_pitch = 19.05; // VERIFY

// How far the home row sits RIGHT of the top row (ANSI: CapsLock is a
// quarter key wider than Tab, so a sits 4.76 mm right of q).
top_row_stagger = 4.76; // VERIFY

// From the rail's front edge (the contact line on the deck strip near
// the screen, above the Fn row) to the CENTER of the top letter row
// (measure to the center of the 't' keycap, front-to-back only).
rail_to_top_row = 38; // VERIFY

// Key travel to actuation. Framework publishes 1.5 mm.
key_travel = 1.5;

// Air gap between the nub tip and the keycap at rest, so the overlay
// never holds a key half-pressed.
nub_rest_gap = 0.3;

// Top surface of a keycap relative to the deck surface the rail sits
// on. Positive = keycap sits proud of the deck.
keycap_above_deck = 1.0; // VERIFY

/* --------------------------------------------------- lever geometry */

// The home row is one row nearer the player than the top row.
rail_to_home_row = rail_to_top_row + row_pitch;

key_width = key_pitch - 1.2; // 1.2 mm gap between neighboring white keys
key_thickness = 4; // stiff enough not to bend before the flexure

// How far the white key tip reaches toward the player past the home
// row. The v1 length: the tip overhangs the nub slightly.
white_front = 10;
lever_length = rail_to_home_row + white_front;

// Air gap between the lever underside and the keycaps it passes over.
clearance_above_keys = 4;

// Height of the lever underside above the deck.
lever_lift = keycap_above_deck + clearance_above_keys;

/* --------------------------------------------------- black keys */

// Piano slots: a black key follows white index 0, 1, 3, 4, 5.
black_after = [0, 1, 3, 4, 5];
black_labels = ["C#", "D#", "F#", "G#", "A#"];

black_width = 11;
// The black key runs from the rail past its nub, near the base only.
black_overhang = 6;
black_length = rail_to_top_row + black_overhang;
// Side clearance between a black key and the white notches around it.
black_side_gap = 0.8;
// Whites stay narrow until this y, a little past the black key tips.
black_clear_end = black_length + 2;

// The black tops stand this much above the white tops, like a piano.
black_raise = 5;
// The raised block starts this far past the neck, so the flexure keeps
// its full bend.
black_raise_setback = 2;
// 45° chamfer on the player-facing top edge of the raised block.
black_chamfer = 2.5;

/*
 * AUTHORING FRAME. The part is authored rotated 180° from the player's
 * view: the print flip must be a pure rotation (a mirror prints a
 * chirally reversed part), and with the rail authored at low y while it
 * sits at the SCREEN side in use, the flat 180° placement is what maps
 * authoring to use. Three consequences, all handled below: C — the
 * player's leftmost key — is authored at the EAST end (`note_at`), the
 * black keys lean WEST of their boundaries (they land east in use, onto
 * w e t y u), and the labels are engraved upside down (`key_label`).
 */

/** Note index (C=0 … B=6) of the authored column i, counted west to east. */
function note_at(i) = key_count - 1 - i;

// The black key BODY is centered on the boundary between its two white
// keys — the visual the player expects. The NUB is not: it must land on
// the target letter key (w e t y u), which the row stagger puts right
// of that boundary in use (west, authored). So the ball rides offset
// inside the body.
function black_body_x(n) = (key_count - 1 - n) * key_pitch;
function black_nub_x(n) =
  (key_count - 1 - n) * key_pitch + key_pitch / 2 - (key_pitch - top_row_stagger);

/* ----------------------------------------------------------- flexure */

flexure_length = 7; // along the lever; longer = softer press
flexure_thickness = 1.0; // vertical; the printer's weakest dimension
flexure_width_ratio = 0.7; // fraction of the attaching section's width

/* --------------------------------------------------------------- nub */

nub_diameter = 7;
// At rest the nub tip hovers nub_rest_gap above the keycap. The press
// rotates the lever until the keycap bottoms out, key_travel below.
nub_drop = clearance_above_keys - nub_rest_gap;

/* -------------------------------------------------------------- rail */

rail_depth = 14; // front-to-back footprint on the deck strip; slim it
// if the strip near the hinge is narrower (VERIFY)

// The highest use surface: the black tops (the white tops when the
// naturals-only shape is rendered). The face-down print rests on it.
top_z = key_thickness + (accidentals ? black_raise : 0);
// The rail top reaches top_z, so the face-down print rests on the rail
// AND the black tops — a stable, well-stuck first layer.
rail_height = lever_lift + top_z;
rail_margin = 6; // extra rail beyond the outer keys
rail_width = key_count * key_pitch + 2 * rail_margin;

/* ------------------------------------------------------------ labels */

emboss_labels = true;
labels = ["C", "D", "E", "F", "G", "A", "B"];
label_depth = 0.6;
label_size = 7;
black_label_size = 5;

/* ------------------------------------------------------------ model */

$fn = 48;

module nub() {
  // A rounded fingertip for the keycap: cylinder with a spherical end.
  r = nub_diameter / 2;
  cylinder(h=nub_drop - r, r=r);
  translate([0, 0, nub_drop - r]) sphere(r=r);
}

module key_label(txt, y, size, top = key_thickness) {
  // Engraved upside down on purpose: the authoring frame is the
  // player's view rotated 180°, so the flat placement turns every
  // glyph upright. Never a mirror anywhere — the print flip and the
  // placement are both pure rotations.
  translate([0, y, top - label_depth])
    linear_extrude(label_depth + 0.1)
      rotate([0, 0, 180])
        text(
          txt, size=size, halign="center", valign="center",
          font="Liberation Sans:style=Bold"
        );
}

/* A bending neck at the rail, centered on [x0, x0+w] of the lever. */
module neck(x0, w) {
  nw = w * flexure_width_ratio;
  translate(
    [
      x0 + (w - nw) / 2,
      -flexure_length,
      key_thickness - flexure_thickness,
    ]
  )
    cube([nw, flexure_length + 0.1, flexure_thickness]);
}

/*
 * One white key. cut_left / cut_right are the widths shaved off the
 * BACK section (y before black_clear_end) where a neighboring black key
 * lives — the narrow-tail plan of a real piano white key. The flexure
 * attaches to the narrowed tail, so it is placed on the tail's center.
 */
module white_lever(label, cut_left, cut_right, nub_notch) {
  difference() {
    cube([key_width, lever_length, key_thickness]);
    if (emboss_labels)
      translate([key_width / 2, 0, 0])
        key_label(label, lever_length - 12, label_size);
    if (cut_left > 0)
      translate([-0.1, -0.1, -0.1])
        cube(
          [
            cut_left + 0.1,
            black_clear_end + 0.1,
            key_thickness + 0.2,
          ]
        );
    if (cut_right > 0)
      translate([key_width - cut_right, -0.1, -0.1])
        cube(
          [
            cut_right + 0.1,
            black_clear_end + 0.1,
            key_thickness + 0.2,
          ]
        );
    if (nub_notch > 0)
      translate(
        [
          key_width - nub_notch,
          rail_to_top_row - nub_notch_half,
          -0.1,
        ]
      )
        cube(
          [
            nub_notch + 0.1,
            2 * nub_notch_half,
            key_thickness + 0.2,
          ]
        );
  }
  // The nub hangs under the lever, centered over the home-row key —
  // inside the full-width front section.
  translate([key_width / 2, rail_to_home_row, 0])
    mirror([0, 0, 1]) nub();
  neck(cut_left, key_width - cut_left - cut_right);
}

/*
 * One black key, in ABSOLUTE x. The body straddles its white boundary
 * dead center; the nub hangs offset inside it so the ball still lands
 * on the top-row key. The nub's first printed layer overhangs the body
 * edge by ~2.8 mm on one side — a small crescent that PETG bridges
 * fine, and it faces the keyboard in use.
 */
module black_lever(label, body_x, nub_x) {
  translate([body_x - black_width / 2, 0, 0]) {
    difference() {
      union() {
        cube([black_width, black_length, key_thickness]);
        // The raised block, chamfered on the player-facing top
        // edge. It starts past the neck, so the flexure keeps its
        // full bend. Profile drawn in (y, z), extruded across x.
        rotate([90, 0, 90])
          linear_extrude(black_width)
            polygon(
              [
                [black_raise_setback, key_thickness],
                [black_length, key_thickness],
                [
                  black_length,
                  key_thickness + black_raise - black_chamfer,
                ],
                [
                  black_length - black_chamfer,
                  key_thickness + black_raise,
                ],
                [black_raise_setback, key_thickness + black_raise],
              ]
            );
      }
      if (emboss_labels)
        translate([black_width / 2, 0, 0])
          key_label(
            label, black_length - 8, black_label_size,
            key_thickness + black_raise
          );
    }
    neck(0, black_width);
  }
  translate([nub_x, rail_to_top_row, 0])
    mirror([0, 0, 1]) nub();
}

module rail() {
  // Rests on the deck strip near the screen; the levers spring from
  // its player-facing face.
  translate([-rail_margin, -flexure_length - rail_depth, -lever_lift])
    cube([rail_width, rail_depth, rail_height]);
}

/* Cut widths where a black key notches into the authored column i. */
function contains(v, x) = len([for (e = v) if (e == x) e]) > 0;
function has_black_for_note(n) =
  accidentals && contains(black_after, n) && n + 1 <= key_count - 1;
function white_x0(i) = i * key_pitch + (key_pitch - key_width) / 2;
// The black between notes n and n+1 sits at column i's WEST boundary
// when n is this column's own note, and at its EAST boundary when n is
// the note one column east (note_at(i) - 1).
function cut_left_for(i) =
  has_black_for_note(note_at(i)) ? max(
      0, min(
        key_width,
        (black_body_x(note_at(i)) + black_width / 2 + black_side_gap) - white_x0(i)
      )
    )
  : 0;
function cut_right_for(i) =
  has_black_for_note(note_at(i) - 1) ? max(
      0, min(
        key_width,
        white_x0(i) + key_width - (
          black_body_x(note_at(i) - 1) - black_width / 2 - black_side_gap
        )
      )
    )
  : 0;
// The east neighbor's offset nub reaches past its own body, under this
// column's tail. A pressed white dips about 1 mm at the nub's y, so the
// tail gets a LOCAL notch there instead of a full-length cut that would
// gut the beam.
function nub_notch_for(i) =
  has_black_for_note(note_at(i) - 1) ? max(
      cut_right_for(i), min(
        key_width,
        white_x0(i) + key_width - (
          black_nub_x(note_at(i) - 1) - nub_diameter / 2 - black_side_gap
        )
      )
    )
  : 0;
nub_notch_half = nub_diameter / 2 + 3;

module overlay() {
  rail();
  for (i = [0:key_count - 1])
    translate([white_x0(i), 0, 0])
      white_lever(
        labels[note_at(i)], cut_left_for(i), cut_right_for(i),
        nub_notch_for(i)
      );
  if (accidentals)
    for (b = [0:len(black_after) - 1])
      if (has_black_for_note(black_after[b]))
        black_lever(
          black_labels[b], black_body_x(black_after[b]),
          black_nub_x(black_after[b])
        );
}

// Final transforms — both PURE ROTATIONS of the authoring frame, never
// a mirror (a mirrored export prints a chirally reversed part that no
// physical flip can fix; a mirror-z export shipped that bug once).
//
//   use   = the player's view: rotate 180° flat. Rail at the screen, C
//           on the left, black keys near the base, labels upright.
//   print = upside down on the bed: rotate 180° about x. The rail top
//           and the black tops lie on the bed; the white faces hang
//           black_raise above it and need supports (PLA-S interface).
//           Flip the print over and set the rail toward the screen;
//           that lands exactly on the use orientation.
if (orient == "use")
  translate([key_count * key_pitch, lever_length, 0])
    rotate([0, 0, 180])
      overlay();
else
  translate([0, lever_length, top_z])
    rotate([180, 0, 0])
      overlay();
