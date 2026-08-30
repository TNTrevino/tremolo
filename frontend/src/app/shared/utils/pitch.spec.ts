import { notesEquivalent, pitchClass, PITCH_CLASSES } from "./pitch";

/**
 * The overlap layout's whole correctness rests on this table, so it is
 * pinned name by name: under `overlap_accidentals` a player has twelve keys
 * for 21 spellings, and every spelling without a key of its own is only
 * reachable because `notesEquivalent` says it sounds like one that has.
 *
 * The four enharmonic pairs that cross a letter boundary (E#/F, B#/C, Cb/B,
 * Fb/E) are the ones a semitone table derived from letter + accidental gets
 * wrong, and `B#`/`Cb` are the two that wrap the octave.
 */

/** The 21 UI note names, in the order `keymap.ts` lays its rows out. */
const ALL_NAMES = [
	"C#",
	"D#",
	"E#",
	"F#",
	"G#",
	"A#",
	"B#",
	"C",
	"D",
	"E",
	"F",
	"G",
	"A",
	"B",
	"Cb",
	"Db",
	"Eb",
	"Fb",
	"Gb",
	"Ab",
	"Bb",
];

/** Pairs that are the same sound spelled two ways. */
const ENHARMONIC_PAIRS: readonly (readonly [string, string])[] = [
	// The four that cross a letter boundary.
	["E#", "F"],
	["B#", "C"],
	["Cb", "B"],
	["Fb", "E"],
	// The five black-key slots, sharp against flat.
	["C#", "Db"],
	["D#", "Eb"],
	["F#", "Gb"],
	["G#", "Ab"],
	["A#", "Bb"],
];

describe("PITCH_CLASSES", () => {
	it("covers all 21 UI note names", () => {
		expect(Object.keys(PITCH_CLASSES)).toHaveLength(21);
		for (const name of ALL_NAMES) {
			expect(PITCH_CLASSES[name]).toBeDefined();
		}
	});

	it("uses the twelve semitones and nothing outside them", () => {
		const classes = Object.values(PITCH_CLASSES);
		expect(new Set(classes).size).toBe(12);
		for (const pitch of classes) {
			expect(pitch).toBeGreaterThanOrEqual(0);
			expect(pitch).toBeLessThanOrEqual(11);
		}
	});

	it("wraps the octave at both ends", () => {
		// The two spellings a letter-plus-accidental derivation gets wrong.
		expect(PITCH_CLASSES["B#"]).toBe(0);
		expect(PITCH_CLASSES["Cb"]).toBe(11);
	});
});

describe("pitchClass", () => {
	it("reads a known name out of the table", () => {
		expect(pitchClass("Eb")).toBe(3);
	});

	it("is undefined for a name that is not one of the 21", () => {
		expect(pitchClass("H")).toBeUndefined();
		expect(pitchClass("B-")).toBeUndefined();
		expect(pitchClass("")).toBeUndefined();
	});
});

describe("notesEquivalent", () => {
	it.each(ENHARMONIC_PAIRS)("accepts %s for %s, both ways", (a, b) => {
		expect(notesEquivalent(a, b)).toBe(true);
		expect(notesEquivalent(b, a)).toBe(true);
	});

	it("stays true for an exact spelling match", () => {
		for (const name of ALL_NAMES) {
			expect(notesEquivalent(name, name)).toBe(true);
		}
	});

	it("rejects two notes a semitone apart", () => {
		expect(notesEquivalent("C", "C#")).toBe(false);
		expect(notesEquivalent("E", "F")).toBe(false);
		expect(notesEquivalent("Bb", "B")).toBe(false);
	});

	it("rejects the two notes an octave-wrap apart from their neighbour", () => {
		expect(notesEquivalent("B#", "B")).toBe(false);
		expect(notesEquivalent("Cb", "C")).toBe(false);
	});

	it("relates every name to exactly one other spelling, or none", () => {
		for (const name of ALL_NAMES) {
			const matches = ALL_NAMES.filter(
				(other) => other !== name && notesEquivalent(name, other),
			);
			expect(matches.length).toBeLessThanOrEqual(1);
		}
	});

	it("does not equate two unknown names it cannot price", () => {
		// An exact match still holds; two different unknowns do not.
		expect(notesEquivalent("H", "H")).toBe(true);
		expect(notesEquivalent("H", "I")).toBe(false);
		expect(notesEquivalent("H", "C")).toBe(false);
	});
});
