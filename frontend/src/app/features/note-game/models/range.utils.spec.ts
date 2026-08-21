import { describe, expect, it } from "vitest";

import {
	DEFAULT_RANGE,
	indexToNote,
	ledgerSteps,
	noteToIndex,
	RANGE_BOUNDS,
	staffSteps,
} from "./range.utils";

/** Port of frontend-react/src/features/note-game/rangeUtils.test.ts. */

describe("noteToIndex / indexToNote", () => {
	it("round-trips natural notes", () => {
		for (const note of ["C0", "C4", "E4", "B3", "F5", "G2", "C7"]) {
			expect(indexToNote(noteToIndex(note))).toBe(note);
		}
	});

	it("orders notes by pitch", () => {
		expect(noteToIndex("C4")).toBeLessThan(noteToIndex("D4"));
		expect(noteToIndex("B3")).toBeLessThan(noteToIndex("C4"));
		expect(noteToIndex("C5") - noteToIndex("C4")).toBe(7);
	});

	it("rejects accidentals and garbage", () => {
		expect(() => noteToIndex("C#4")).toThrow();
		expect(() => noteToIndex("H4")).toThrow();
		expect(() => noteToIndex("C")).toThrow();
	});
});

describe("staffSteps", () => {
	it("bottom line is step 0 (treble E4, bass G2)", () => {
		expect(staffSteps(noteToIndex("E4"), "treble")).toBe(0);
		expect(staffSteps(noteToIndex("G2"), "bass")).toBe(0);
	});

	it("top line is step 8 (treble F5, bass A3)", () => {
		expect(staffSteps(noteToIndex("F5"), "treble")).toBe(8);
		expect(staffSteps(noteToIndex("A3"), "bass")).toBe(8);
	});

	it("middle C sits below the treble staff and above the bass staff", () => {
		expect(staffSteps(noteToIndex("C4"), "treble")).toBe(-2);
		expect(staffSteps(noteToIndex("C4"), "bass")).toBe(10);
	});
});

describe("ledgerSteps", () => {
	it("no ledger lines for notes inside the staff", () => {
		expect(ledgerSteps(noteToIndex("B4"), "treble")).toEqual([]);
		expect(ledgerSteps(noteToIndex("E4"), "treble")).toEqual([]);
		expect(ledgerSteps(noteToIndex("F5"), "treble")).toEqual([]);
	});

	it("middle C on treble needs one ledger line", () => {
		expect(ledgerSteps(noteToIndex("C4"), "treble")).toEqual([-2]);
	});

	it("A5 above treble staff needs one ledger line", () => {
		expect(ledgerSteps(noteToIndex("A5"), "treble")).toEqual([10]);
	});

	it("C6 above treble staff needs two ledger lines", () => {
		expect(ledgerSteps(noteToIndex("C6"), "treble")).toEqual([10, 12]);
	});

	it("space notes just outside the staff need no line through them", () => {
		// D4 (step -1) hangs below the staff: the note itself has no ledger
		// line, matching engraving practice.
		expect(ledgerSteps(noteToIndex("D4"), "treble")).toEqual([]);
		// G5 (step 9) sits on top of the staff similarly.
		expect(ledgerSteps(noteToIndex("G5"), "treble")).toEqual([]);
	});
});

describe("bounds and defaults", () => {
	it("default ranges are inside the clef bounds", () => {
		for (const clef of ["treble", "bass"] as const) {
			const { low, high } = DEFAULT_RANGE[clef];
			const { min, max } = RANGE_BOUNDS[clef];
			expect(noteToIndex(low)).toBeGreaterThanOrEqual(min);
			expect(noteToIndex(high)).toBeLessThanOrEqual(max);
			expect(noteToIndex(low)).toBeLessThan(noteToIndex(high));
		}
	});
});
