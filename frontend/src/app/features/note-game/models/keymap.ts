/**
 * The 21-note keyboard map.
 *
 * Verbatim port of the two tables and the inversion rule in
 * frontend-react/src/features/note-game/hooks/useKeyboardInput.ts, plus
 * `keyBindingsToNoteMap` from that feature's `utils.ts`. **This is plain
 * data**: the RxJS stream that consumes it lives in
 * `services/keyboard-input.ts`, so the translation can be tested without a
 * DOM.
 */

import type { KeyBindings } from "../../../shared/models/game.models";

/**
 * Default keyboard key to musical note mapping.
 *
 * Maps 3 keyboard rows to 21 notes across sharps, naturals and flats:
 *
 * - Top row (`q`-`u`): sharps (C# through B#)
 * - Home row (`a`-`j`): naturals (C through B)
 * - Bottom row (`z`-`m`): flats (Cb through Bb)
 *
 * Both lowercase and uppercase variants are included so input is
 * case-insensitive (a player with caps lock on still plays).
 */
export const DEFAULT_KEY_TO_NOTE_MAP: Record<string, string> = {
	// Sharps row (qwerty keyboard top row)
	q: "C#",
	Q: "C#",
	w: "D#",
	W: "D#",
	e: "E#",
	E: "E#",
	r: "F#",
	R: "F#",
	t: "G#",
	T: "G#",
	y: "A#",
	Y: "A#",
	u: "B#",
	U: "B#",
	// Naturals row (home row)
	a: "C",
	A: "C",
	s: "D",
	S: "D",
	d: "E",
	D: "E",
	f: "F",
	F: "F",
	g: "G",
	G: "G",
	h: "A",
	H: "A",
	j: "B",
	J: "B",
	// Flats row (bottom row)
	z: "Cb",
	Z: "Cb",
	x: "Db",
	X: "Db",
	c: "Eb",
	C: "Eb",
	v: "Fb",
	V: "Fb",
	b: "Gb",
	B: "Gb",
	n: "Ab",
	N: "Ab",
	m: "Bb",
	M: "Bb",
};

/**
 * Inverse of the default mapping: note name to lowercase key. Used for the
 * key hints printed under each answer button.
 */
export const DEFAULT_NOTE_TO_KEY_MAP: Record<string, string> = {
	"C#": "q",
	"D#": "w",
	"E#": "e",
	"F#": "r",
	"G#": "t",
	"A#": "y",
	"B#": "u",
	C: "a",
	D: "s",
	E: "d",
	F: "f",
	G: "g",
	A: "h",
	B: "j",
	Cb: "z",
	Db: "x",
	Eb: "c",
	Fb: "v",
	Gb: "b",
	Ab: "n",
	Bb: "m",
};

/**
 * Turns a note-to-key map (what the player configures and what the Go
 * service stores) into the key-to-note map the keydown stream looks up.
 *
 * Both cases of every key are registered, exactly as the default table has
 * both, so custom bindings are case-insensitive too. Passing `undefined`
 * yields the default table -- the "no custom bindings" case.
 */
export function buildKeyToNoteMap(
	noteToKey?: Record<string, string>,
): Record<string, string> {
	if (!noteToKey) return DEFAULT_KEY_TO_NOTE_MAP;

	const map: Record<string, string> = {};
	for (const [note, key] of Object.entries(noteToKey)) {
		map[key] = note;
		map[key.toLowerCase()] = note;
		map[key.toUpperCase()] = note;
	}
	return map;
}

/**
 * The persisted 21-field `key_bindings` row, as a note-to-key map.
 *
 * Port of `keyBindingsToNoteMap` in the React feature's `utils.ts`. The DTO
 * keys keep their wire spelling on purpose -- see the header of
 * `shared/models/game.models.ts`.
 */
export function keyBindingsToNoteMap(kb: KeyBindings): Record<string, string> {
	return {
		C: kb.key_c,
		"C#": kb.key_c_sharp,
		Cb: kb.key_c_flat,
		D: kb.key_d,
		"D#": kb.key_d_sharp,
		Db: kb.key_d_flat,
		E: kb.key_e,
		"E#": kb.key_e_sharp,
		Eb: kb.key_e_flat,
		F: kb.key_f,
		"F#": kb.key_f_sharp,
		Fb: kb.key_f_flat,
		G: kb.key_g,
		"G#": kb.key_g_sharp,
		Gb: kb.key_g_flat,
		A: kb.key_a,
		"A#": kb.key_a_sharp,
		Ab: kb.key_a_flat,
		B: kb.key_b,
		"B#": kb.key_b_sharp,
		Bb: kb.key_b_flat,
	};
}

/**
 * The inverse of `keyBindingsToNoteMap`: a note-to-key map back into the
 * 21-field row the settings endpoint accepts. A note the editor left unbound
 * is sent as `""`, which is what React did.
 */
export function noteMapToKeyBindings(
	noteToKey: Record<string, string>,
): KeyBindings {
	const at = (note: string): string => noteToKey[note] ?? "";
	return {
		key_c: at("C"),
		key_c_sharp: at("C#"),
		key_c_flat: at("Cb"),
		key_d: at("D"),
		key_d_sharp: at("D#"),
		key_d_flat: at("Db"),
		key_e: at("E"),
		key_e_sharp: at("E#"),
		key_e_flat: at("Eb"),
		key_f: at("F"),
		key_f_sharp: at("F#"),
		key_f_flat: at("Fb"),
		key_g: at("G"),
		key_g_sharp: at("G#"),
		key_g_flat: at("Gb"),
		key_a: at("A"),
		key_a_sharp: at("A#"),
		key_a_flat: at("Ab"),
		key_b: at("B"),
		key_b_sharp: at("B#"),
		key_b_flat: at("Bb"),
	};
}
