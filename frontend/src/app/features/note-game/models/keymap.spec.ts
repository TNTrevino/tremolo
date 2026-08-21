import { describe, expect, it } from "vitest";

import type { KeyBindings } from "../../../shared/models/game.models";
import {
	buildKeyToNoteMap,
	DEFAULT_KEY_TO_NOTE_MAP,
	DEFAULT_NOTE_TO_KEY_MAP,
	keyBindingsToNoteMap,
	noteMapToKeyBindings,
} from "./keymap";

/**
 * The keymap is the note game's input contract, so it is pinned row by row
 * and in both cases. React had no test for it -- `KeyboardBindings.test.tsx`
 * exercises the editor, not the table.
 */

/** note -> lowercase key, in the order the three rows are laid out. */
const SHARPS: ReadonlyArray<readonly [string, string]> = [
	["C#", "q"],
	["D#", "w"],
	["E#", "e"],
	["F#", "r"],
	["G#", "t"],
	["A#", "y"],
	["B#", "u"],
];
const NATURALS: ReadonlyArray<readonly [string, string]> = [
	["C", "a"],
	["D", "s"],
	["E", "d"],
	["F", "f"],
	["G", "g"],
	["A", "h"],
	["B", "j"],
];
const FLATS: ReadonlyArray<readonly [string, string]> = [
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

	it("feeds buildKeyToNoteMap so saved bindings drive real input", () => {
		const map = buildKeyToNoteMap(keyBindingsToNoteMap(SAVED));
		expect(map["1"]).toBe("C");
		expect(map["'"]).toBe("Bb");
	});
});
