import { describe, expect, it } from "vitest";

import type { KeyBindings } from "../../../shared/models/game.models";
import {
	buildKeyToNoteMap,
	buildOverlapKeyToNoteMap,
	DEFAULT_KEY_TO_NOTE_MAP,
	DEFAULT_NOTE_TO_KEY_MAP,
	keyBindingsToNoteMap,
	noteMapToKeyBindings,
	OVERLAP_SHARP_TO_KEY_MAP,
} from "./keymap";

/**
 * The keymap is the note game's input contract, so it is pinned row by row
 * and in both cases. React had no test for it -- `KeyboardBindings.test.tsx`
 * exercises the editor, not the table.
 */

/** note -> lowercase key, in the order the three rows are laid out. */
const SHARPS: readonly (readonly [string, string])[] = [
	["C#", "q"],
	["D#", "w"],
	["E#", "e"],
	["F#", "r"],
	["G#", "t"],
	["A#", "y"],
	["B#", "u"],
];
const NATURALS: readonly (readonly [string, string])[] = [
	["C", "a"],
	["D", "s"],
	["E", "d"],
	["F", "f"],
	["G", "g"],
	["A", "h"],
	["B", "j"],
];
const FLATS: readonly (readonly [string, string])[] = [
	["Cb", "z"],
	["Db", "x"],
	["Eb", "c"],
	["Fb", "v"],
	["Gb", "b"],
	["Ab", "n"],
	["Bb", "m"],
];

const ALL = [...SHARPS, ...NATURALS, ...FLATS];

describe("DEFAULT_KEY_TO_NOTE_MAP", () => {
	it.each(SHARPS)("translates the sharps row: %s <- %s", (note, key) => {
		expect(DEFAULT_KEY_TO_NOTE_MAP[key]).toBe(note);
		expect(DEFAULT_KEY_TO_NOTE_MAP[key.toUpperCase()]).toBe(note);
	});

	it.each(NATURALS)("translates the naturals row: %s <- %s", (note, key) => {
		expect(DEFAULT_KEY_TO_NOTE_MAP[key]).toBe(note);
		expect(DEFAULT_KEY_TO_NOTE_MAP[key.toUpperCase()]).toBe(note);
	});

	it.each(FLATS)("translates the flats row: %s <- %s", (note, key) => {
		expect(DEFAULT_KEY_TO_NOTE_MAP[key]).toBe(note);
		expect(DEFAULT_KEY_TO_NOTE_MAP[key.toUpperCase()]).toBe(note);
	});

	it("covers 21 notes in 42 entries and nothing else", () => {
		expect(Object.keys(DEFAULT_KEY_TO_NOTE_MAP)).toHaveLength(42);
		expect(new Set(Object.values(DEFAULT_KEY_TO_NOTE_MAP)).size).toBe(21);
	});

	it("does not map keys outside the three rows", () => {
		for (const key of ["k", "l", "p", "i", "o", "1", " ", "Enter", "Escape"]) {
			expect(DEFAULT_KEY_TO_NOTE_MAP[key]).toBeUndefined();
		}
	});

	it("is the exact inverse of DEFAULT_NOTE_TO_KEY_MAP", () => {
		expect(DEFAULT_NOTE_TO_KEY_MAP).toEqual(Object.fromEntries(ALL));
		for (const [note, key] of ALL) {
			expect(DEFAULT_KEY_TO_NOTE_MAP[DEFAULT_NOTE_TO_KEY_MAP[note]!]).toBe(
				note,
			);
			expect(DEFAULT_NOTE_TO_KEY_MAP[note]).toBe(key);
		}
	});
});

describe("buildKeyToNoteMap", () => {
	it("returns the default table when there are no custom bindings", () => {
		expect(buildKeyToNoteMap(undefined)).toBe(DEFAULT_KEY_TO_NOTE_MAP);
	});

	it("inverts custom bindings and registers both cases", () => {
		const map = buildKeyToNoteMap({ C: "1", "C#": "k", Cb: "L" });

		expect(map["1"]).toBe("C");
		expect(map["k"]).toBe("C#");
		expect(map["K"]).toBe("C#");
		expect(map["l"]).toBe("Cb");
		expect(map["L"]).toBe("Cb");
	});

	it("maps only the notes the caller bound", () => {
		const map = buildKeyToNoteMap({ C: "a" });
		expect(map["s"]).toBeUndefined();
	});
});

const SAVED: KeyBindings = {
	key_c: "1",
	key_c_sharp: "2",
	key_c_flat: "3",
	key_d: "4",
	key_d_sharp: "5",
	key_d_flat: "6",
	key_e: "7",
	key_e_sharp: "8",
	key_e_flat: "9",
	key_f: "0",
	key_f_sharp: "-",
	key_f_flat: "=",
	key_g: "k",
	key_g_sharp: "l",
	key_g_flat: "p",
	key_a: "o",
	key_a_sharp: "i",
	key_a_flat: "[",
	key_b: "]",
	key_b_sharp: ";",
	key_b_flat: "'",
};

describe("keyBindingsToNoteMap", () => {
	it("reads the persisted row into a note-to-key map", () => {
		const map = keyBindingsToNoteMap(SAVED);

		expect(map["C"]).toBe("1");
		expect(map["C#"]).toBe("2");
		expect(map["Cb"]).toBe("3");
		expect(map["Bb"]).toBe("'");
		expect(Object.keys(map)).toHaveLength(21);
	});

	it("round-trips through noteMapToKeyBindings", () => {
		expect(noteMapToKeyBindings(keyBindingsToNoteMap(SAVED))).toEqual(SAVED);
	});

	it("sends an unbound note as an empty string, as React did", () => {
		expect(noteMapToKeyBindings({ C: "a" }).key_d).toBe("");
	});

	it("stays a 21-field row: the layout flag is not one of them", () => {
		// `overlap_accidentals` rides beside `key_bindings` on the wire, so it
		// must not leak into the row this builds.
		expect(Object.keys(noteMapToKeyBindings({ C: "a" }))).toHaveLength(21);
	});

	it("feeds buildKeyToNoteMap so saved bindings drive real input", () => {
		const map = buildKeyToNoteMap(keyBindingsToNoteMap(SAVED));
		expect(map["1"]).toBe("C");
		expect(map["'"]).toBe("Bb");
	});
});

/** The five black-key slots, as `OVERLAP_SHARP_TO_KEY_MAP` fixes them. */
const OVERLAP_SHARPS: readonly (readonly [string, string])[] = [
	["C#", "w"],
	["D#", "e"],
	["F#", "t"],
	["G#", "y"],
	["A#", "u"],
];

/** The nine notes the piano-shaped layout deliberately leaves unplayable. */
const UNPLAYABLE_IN_OVERLAP = [
	"E#",
	"B#",
	"Cb",
	"Db",
	"Eb",
	"Fb",
	"Gb",
	"Ab",
	"Bb",
];

describe("buildOverlapKeyToNoteMap", () => {
	it("keeps the default naturals when there are no custom bindings", () => {
		const map = buildOverlapKeyToNoteMap(undefined);

		for (const [note, key] of NATURALS) {
			expect(map[key]).toBe(note);
			expect(map[key.toUpperCase()]).toBe(note);
		}
	});

	it.each(OVERLAP_SHARPS)("puts %s on the fixed key %s", (note, key) => {
		const map = buildOverlapKeyToNoteMap(undefined);
		expect(map[key]).toBe(note);
		expect(map[key.toUpperCase()]).toBe(note);
	});

	it("covers twelve notes in 24 entries and nothing else", () => {
		const map = buildOverlapKeyToNoteMap(undefined);
		expect(Object.keys(map)).toHaveLength(24);
		expect(new Set(Object.values(map)).size).toBe(12);
	});

	it("gives no key to E#, B#, Cb, Fb or any flat", () => {
		// They are reachable, but only through the natural or sharp they
		// sound like -- `notesEquivalent` does that, not this table.
		const map = buildOverlapKeyToNoteMap(undefined);
		const played = new Set(Object.values(map));

		for (const note of UNPLAYABLE_IN_OVERLAP) {
			expect(played.has(note)).toBe(false);
		}
	});

	it("takes the naturals from the player's own bindings", () => {
		const map = buildOverlapKeyToNoteMap({
			...DEFAULT_NOTE_TO_KEY_MAP,
			C: "1",
		});

		expect(map["1"]).toBe("C");
		expect(map["a"]).toBeUndefined();
		// The flats row the player still has bound is ignored wholesale.
		expect(map["z"]).toBeUndefined();
		expect(map["m"]).toBeUndefined();
	});

	it("ignores the sharps the player bound, fixed slots win", () => {
		// A saved "C# on q" is dead under this layout, and a natural parked
		// on a black-key slot loses that slot rather than costing C#.
		const map = buildOverlapKeyToNoteMap({
			...DEFAULT_NOTE_TO_KEY_MAP,
			G: "w",
		});

		expect(map["q"]).toBeUndefined();
		expect(map["w"]).toBe("C#");
		expect(map["W"]).toBe("C#");
	});

	it("does not bind a natural the editor left empty", () => {
		const map = buildOverlapKeyToNoteMap({ C: "a", D: "" });

		expect(map["a"]).toBe("C");
		expect(map[""]).toBeUndefined();
		// Only C plus the five fixed sharps.
		expect(new Set(Object.values(map)).size).toBe(6);
	});

	it("reads a saved row through keyBindingsToNoteMap", () => {
		const map = buildOverlapKeyToNoteMap(keyBindingsToNoteMap(SAVED));

		expect(map["1"]).toBe("C");
		expect(map["k"]).toBe("G");
		// SAVED binds Bb to "'"; the overlap layout drops it.
		expect(map["'"]).toBeUndefined();
	});
});

describe("OVERLAP_SHARP_TO_KEY_MAP", () => {
	it("is the five black keys and no others", () => {
		expect(OVERLAP_SHARP_TO_KEY_MAP).toEqual(
			Object.fromEntries(OVERLAP_SHARPS),
		);
	});

	it("does not collide with the default naturals row", () => {
		const naturalKeys = new Set(NATURALS.map(([, key]) => key));
		for (const key of Object.values(OVERLAP_SHARP_TO_KEY_MAP)) {
			expect(naturalKeys.has(key)).toBe(false);
		}
	});
});
