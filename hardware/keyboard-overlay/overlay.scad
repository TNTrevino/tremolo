/*
 * Tremolo keyboard overlay — naturals-only prototype (v1).
 *
 * Seven printed "white keys" lie over the home row (a s d f g h j =
 * C D E F G A B, the Tremolo default keymap). Each key is a lever that
 * pivots on a thin flexure at a rail resting on the palm rest. A rounded
 * nub under the far end of the lever presses the letter key. The laptop
 * key's own spring returns the lever; the print has no moving parts to
 * assemble.
 *
 * Print flat as oriented here, in PETG (PLA flexures fatigue and snap).
 * 3 perimeters, 0.2 mm layers, no supports.
 *
 * Every dimension marked VERIFY is a guess until measured with calipers
 * on the actual Framework 13 — see README.md for the checklist. Renders:
 *
 *   openscad -o coupon.stl  -D 'mode="coupon"' overlay.scad
 *   openscad -o overlay.stl -D 'mode="full"'   overlay.scad
 */

/* ---------------------------------------------------------------- mode */

mode = "coupon"; // "coupon" = 2-key test print, "full" = all 7 keys
key_count = (mode == "coupon") ? 2 : 7;

/* --------------------------------------------- laptop measurements */

// Center-to-center distance of adjacent letter keys (a -> s).
// Standard full-size pitch; Framework does not publish it.
key_pitch = 19.05; // VERIFY

// Key travel to actuation. Framework publishes 1.5 mm. The flexure
// provides the motion; the lever just needs room to rotate that far.
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

key_width = key_pitch - 1.2; // 1.2 mm gap between neighboring keys
key_thickness = 4;           // stiff enough not to bend before the flexure
lever_length = rail_to_home_row + 10; // key tip overhangs the nub slightly

// Air gap between the lever underside and the keycaps it passes over
// (the z-row and the spacebar row must never be touched).
clearance_above_keys = 4;

// Height of the lever underside above the deck.
lever_lift = keycap_above_deck + clearance_above_keys;

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

/* ------------------------------------------------------------ model */

$fn = 48;

module nub() {
	// A rounded fingertip for the keycap: cylinder with a spherical end.
	r = nub_diameter / 2;
	cylinder(h = nub_drop - r, r = r);
	translate([0, 0, nub_drop - r]) sphere(r = r);
}

module lever(label) {
	difference() {
		// The key body, pivot end at y=0, tip toward +y.
		cube([key_width, lever_length, key_thickness]);
		// Engraved note letter near the tip, where the finger lands.
		// The part prints top-face-down and is flipped over for use; that
		// flip mirrors anything on this face, so the glyph is stored
		// pre-mirrored and comes out readable on the laptop.
		if (emboss_labels)
			translate([key_width / 2, lever_length - 14, key_thickness - label_depth])
				linear_extrude(label_depth + 0.1)
					mirror([0, 1, 0])
						text(label, size = label_size, halign = "center",
							valign = "center", font = "Liberation Sans:style=Bold");
	}
	// The nub hangs under the lever, centered over the letter key.
	translate([key_width / 2, rail_to_home_row, 0])
		mirror([0, 0, 1]) nub();
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

module overlay() {
	rail();
	for (i = [0 : key_count - 1]) {
		translate([i * key_pitch + (key_pitch - key_width) / 2, 0, 0]) {
			lever(labels[i]);
			flexure();
		}
	}
}

// Print orientation: upside down. The key tops lie on the bed, the
// nubs point up, and the rail rises as a solid block — nothing
// overhangs and the flexures print as clean full-width layers. Flip
// the part over after printing; in use the nubs face the keyboard.
translate([0, 0, key_thickness]) mirror([0, 0, 1]) overlay();
