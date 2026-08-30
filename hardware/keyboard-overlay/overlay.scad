/*
 * Tremolo keyboard overlay — piano prototype (v2, with accidentals).
 *
 * Seven printed "white keys" lie over the home row (a s d f g h j =
 * C D E F G A B, the Tremolo default keymap). With `accidentals` on,
 * five "black keys" sit in the real piano slots — after C, D, F, G and
 * A — and their nubs land on the top-row keys w, e, t, y, u through the
 * QWERTY row stagger. E#, B# and the flats have no lever on purpose:
 * one black key is one pitch, and the app's overlap_accidentals mode
 * judges enharmonic spellings as the same answer.
 *
 * Every key is a lever pivoting on a thin flexure at a rail resting on
 * the palm rest. A rounded nub under the far end presses the letter
 * key; the laptop key's own spring returns the lever. One print, no
 * assembly.
 *
 * The part prints flat, top-face-down. That is also why the black keys
 * are flush with the whites rather than raised: a raised black top
 * cannot lie on the bed. Position, narrower bodies and engraved labels
 * carry the piano look in this version.
 *
 * Print in PETG (PLA flexures fatigue and snap), 0.2 mm layers,
 * 3 perimeters, no supports. Dimensions marked VERIFY are guesses until
 * measured — see README.md. Renders:
 *
 *   openscad -o coupon.stl  -D 'mode="coupon"' overlay.scad
 *   openscad -o overlay.stl -D 'mode="full"'   overlay.scad
 */

/* ---------------------------------------------------------------- mode */

mode = "coupon"; // "coupon" = C + D + C# test print, "full" = everything
accidentals = true; // false renders the v1 naturals-only shape
orient = "print"; // "use" previews the part as it sits on the laptop
key_count = (mode == "coupon") ? 2 : 7;

/* --------------------------------------------- laptop measurements */

// Center-to-center distance of adjacent letter keys (a -> s).
// Standard full-size pitch; Framework does not publish it.
key_pitch = 19.05; // VERIFY

// Center-to-center distance between the home row and the row above it.
row_pitch = 19.05; // VERIFY

// How far the top row sits LEFT of the home row (ANSI: CapsLock is a
// quarter key wider than Tab, so q sits 4.76 mm left of a).
top_row_stagger = 4.76; // VERIFY

// Key travel to actuation. Framework publishes 1.5 mm.
key_travel = 1.5;

// Air gap between the nub tip and the keycap at rest, so the overlay
// never holds a key half-pressed.
nub_rest_gap = 0.3;

// Top surface of a keycap relative to the deck surface the rail sits
// on. Positive = keycap sits proud of the deck.
keycap_above_deck = 1.0; // VERIFY

// Distance from the front edge of the palm-rest contact line to the
// center of the home row (measure to the center of the 'g' keycap).
rail_to_home_row = 58; // VERIFY

/* --------------------------------------------------- lever geometry */

key_width = key_pitch - 1.2; // 1.2 mm gap between neighboring white keys
key_thickness = 4;           // stiff enough not to bend before the flexure
lever_length = rail_to_home_row + 10; // white tip overhangs its nub slightly

// Air gap between the lever underside and the keycaps it passes over.
clearance_above_keys = 4;

// Height of the lever underside above the deck.
lever_lift = keycap_above_deck + clearance_above_keys;

/* --------------------------------------------------- black keys */

// Piano slots: a black key follows white index 0, 1, 3, 4, 5.
black_after = [0, 1, 3, 4, 5];
black_labels = ["C#", "D#", "F#", "G#", "A#"];

black_width = 11;
// The narrow shaft that runs between the white keys from the rail out
// to the body. Wider steals white-key press width; 5 mm is stiff enough.
black_shaft_width = 5;
// The exposed press zone starts this far in front of the home row.
black_reach = 4;
black_overhang = 6;
// Side clearance between a black key and the white cutouts around it.
black_side_gap = 0.8;

// The black nub lands on the top row: one row farther, staggered left.
black_nub_y = rail_to_home_row + row_pitch;
black_length = black_nub_y + black_overhang;
black_start_y = rail_to_home_row - black_reach;

// Absolute x center of the black key after white index i: centered on
// its target letter key (w e t y u), which by stagger sits right of the
// white boundary — exactly like a real piano's off-center black keys.
function black_center_x(i) =
	i * key_pitch + key_pitch / 2 + key_pitch - top_row_stagger;

/* ----------------------------------------------------------- flexure */

flexure_length = 7;      // along the lever; longer = softer press
flexure_thickness = 1.0; // vertical; the printer's weakest dimension
flexure_width_ratio = 0.7; // fraction of key width, keeps edges compliant

/* --------------------------------------------------------------- nub */

nub_diameter = 7;
// At rest the nub tip hovers nub_rest_gap above the keycap. The press
// rotates the lever until the keycap bottoms out, key_travel below.
nub_drop = clearance_above_keys - nub_rest_gap;

/* -------------------------------------------------------------- rail */

rail_depth = 14;  // front-to-back footprint on the palm rest
rail_height = lever_lift + key_thickness;
rail_margin = 6;  // extra rail beyond the outer keys
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
	cylinder(h = nub_drop - r, r = r);
	translate([0, 0, nub_drop - r]) sphere(r = r);
}

module key_label(txt, y, size) {
	// Stored exactly as read. The print transform below is a pure
	// rotation, so flipping the physical part back over restores this
	// orientation with no mirroring anywhere.
	translate([0, y, key_thickness - label_depth])
		linear_extrude(label_depth + 0.1)
			text(txt, size = size, halign = "center", valign = "center",
				font = "Liberation Sans:style=Bold");
}

/*
 * One white key. Each side takes two notches where a neighboring black
 * key runs: a full-length one for the narrow shaft, and a deeper one
 * past black_start_y for the wide body — the same plan-view shape a
 * real piano's white keys have.
 */
module white_lever(label, shaft_l, shaft_r, body_l, body_r) {
	difference() {
		cube([key_width, lever_length, key_thickness]);
		// Centered on the material that remains between the shaft cuts,
		// not on the full key, so no glyph hangs over a notch.
		if (emboss_labels)
			translate([(shaft_l + key_width - shaft_r) / 2, 0, 0])
				key_label(label, black_start_y - 8, label_size);
		if (shaft_l > 0)
			translate([-0.1, -0.1, -0.1])
				cube([shaft_l + 0.1, lever_length + 0.2, key_thickness + 0.2]);
		if (shaft_r > 0)
			translate([key_width - shaft_r, -0.1, -0.1])
				cube([shaft_r + 0.1, lever_length + 0.2, key_thickness + 0.2]);
		if (body_l > 0)
			translate([-0.1, black_start_y, -0.1])
				cube([body_l + 0.1, lever_length, key_thickness + 0.2]);
		if (body_r > 0)
			translate([key_width - body_r, black_start_y, -0.1])
				cube([body_r + 0.1, lever_length, key_thickness + 0.2]);
	}
	// The nub hangs under the lever, centered over the letter key.
	translate([key_width / 2, rail_to_home_row, 0])
		mirror([0, 0, 1]) nub();
}

/*
 * One black key, in ABSOLUTE x (it straddles a white boundary). A
 * narrow shaft runs from the rail between the whites, then widens into
 * the press body; everything sits in the same 4 mm lever plane, so the
 * part still prints flat.
 */
module black_lever(label, center_x) {
	// The bending neck at the rail.
	translate([center_x - black_shaft_width * flexure_width_ratio / 2,
			-flexure_length, key_thickness - flexure_thickness])
		cube([black_shaft_width * flexure_width_ratio,
			flexure_length + 0.1, flexure_thickness]);
	// The shaft out to the body.
	translate([center_x - black_shaft_width / 2, 0, 0])
		cube([black_shaft_width, black_start_y + 0.1, key_thickness]);
	// The body with its engraved label.
	translate([center_x - black_width / 2, black_start_y, 0]) {
		difference() {
			cube([black_width, black_length - black_start_y, key_thickness]);
			if (emboss_labels)
				translate([black_width / 2, 0, 0])
					key_label(label, 10, black_label_size);
		}
		// The nub lands on the top-row key, one row past the home row.
		translate([black_width / 2, black_nub_y - black_start_y, 0])
			mirror([0, 0, 1]) nub();
	}
}

module flexure() {
	w = key_width * flexure_width_ratio;
	translate([(key_width - w) / 2, -flexure_length, key_thickness - flexure_thickness])
		cube([w, flexure_length + 0.1, flexure_thickness]);
}

module rail() {
	// Sits on the palm rest; the levers spring from its back face.
	translate([-rail_margin, -flexure_length - rail_depth, -lever_lift])
		cube([rail_width, rail_depth, rail_height]);
}

/* Cut widths where a black key notches into white index i. */
function contains(v, x) = len([for (e = v) if (e == x) e]) > 0;
function has_black_after(i) =
	accidentals && contains(black_after, i) && i <= key_count - 2;
function white_x0(i) = i * key_pitch + (key_pitch - key_width) / 2;
// A black feature reaching to absolute x `hi` cuts this much off white
// i's left edge; one starting at `lo` cuts this much off its right.
function cut_from_left(i, hi) = max(0, min(key_width, hi - white_x0(i)));
function cut_from_right(i, lo) =
	max(0, min(key_width, white_x0(i) + key_width - lo));

function shaft_l(i) = has_black_after(i - 1)
	? cut_from_left(i,
		black_center_x(i - 1) + black_shaft_width / 2 + black_side_gap) : 0;
function shaft_r(i) = has_black_after(i)
	? cut_from_right(i,
		black_center_x(i) - black_shaft_width / 2 - black_side_gap) : 0;
function body_l(i) = has_black_after(i - 1)
	? cut_from_left(i,
		black_center_x(i - 1) + black_width / 2 + black_side_gap) : 0;
function body_r(i) = has_black_after(i)
	? cut_from_right(i,
		black_center_x(i) - black_width / 2 - black_side_gap) : 0;

module overlay() {
	rail();
	for (i = [0 : key_count - 1])
		translate([white_x0(i), 0, 0]) {
			white_lever(labels[i],
				shaft_l(i), shaft_r(i), body_l(i), body_r(i));
			flexure();
		}
	if (accidentals)
		for (b = [0 : len(black_after) - 1])
			if (black_after[b] <= key_count - 2)
				black_lever(black_labels[b], black_center_x(black_after[b]));
}

// Print orientation: upside down, via a 180° ROTATION about y — never
// a mirror. A mirrored export prints a chirally reversed part that no
// physical flip can fix: v2's black keys would land one stagger to the
// LEFT of their letter keys (the bug a mirror-z export shipped once).
// A rotation keeps chirality, so flipping the print over reproduces
// this model exactly: nubs to the keyboard, C on the left, black keys
// staggered right onto w e t y u. The key tops lie on the bed, nothing
// overhangs, and the flexures print as clean full-width layers.
if (orient == "use")
	overlay();
else
	translate([key_count * key_pitch, 0, key_thickness])
		rotate([0, 180, 0])
			overlay();
