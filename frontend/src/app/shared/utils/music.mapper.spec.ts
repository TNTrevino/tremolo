import { fromMusic21NoteName, toMusic21NoteName } from "./music.mapper";

/**
 * The boundary invariant, pinned.
 *
 * `frontend/CLAUDE.md`: "Notation converts at the API boundary only
 * (music.mapper.ts): feature code never sees music21 `-` flats." These
 * two functions are that boundary, so what they must guarantee is a round
 * trip: every name the Python service can send survives wire -> UI -> wire
 * unchanged, and every name the UI can send survives UI -> wire -> UI.
 *
 * The React app shipped no test for this file (R5 -- the packet asks for
 * "the mapper test" and the repo has none), so this is new.
 */

/** Every flat spelling music21 can put on the wire. */
const FLATS_ON_THE_WIRE = ["C-", "D-", "E-", "F-", "G-", "A-", "B-"];
/** The same seven, as the UI spells them. */
const FLATS_IN_THE_UI = ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"];
/** Names both notations agree on. */
const UNCHANGED = [
	"C",
	"D",
	"E",
	"F",
	"G",
	"A",
	"B",
	"C#",
	"D#",
	"F#",
	"G#",
	"A#",
];

describe("music.mapper", () => {
	describe("fromMusic21NoteName", () => {
		it("rewrites every music21 flat to UI notation", () => {
			expect(FLATS_ON_THE_WIRE.map(fromMusic21NoteName)).toEqual(
				FLATS_IN_THE_UI,
			);
		});

		it("leaves naturals and sharps alone", () => {
			expect(UNCHANGED.map(fromMusic21NoteName)).toEqual(UNCHANGED);
		});
	});

	describe("toMusic21NoteName", () => {
		it("rewrites every UI flat to music21 notation", () => {
			expect(FLATS_IN_THE_UI.map(toMusic21NoteName)).toEqual(FLATS_ON_THE_WIRE);
		});

		it("leaves naturals and sharps alone", () => {
			expect(UNCHANGED.map(toMusic21NoteName)).toEqual(UNCHANGED);
		});

		it("does not mistake the natural note B for a flat", () => {
			// Case matters: "B" has no lowercase "b" to rewrite.
			expect(toMusic21NoteName("B")).toBe("B");
		});
	});

	it("round-trips every flat in both directions", () => {
		for (const wire of FLATS_ON_THE_WIRE) {
			expect(toMusic21NoteName(fromMusic21NoteName(wire))).toBe(wire);
		}
		for (const ui of FLATS_IN_THE_UI) {
			expect(fromMusic21NoteName(toMusic21NoteName(ui))).toBe(ui);
		}
	});

	it("round-trips names that carry no accidental", () => {
		for (const name of UNCHANGED) {
			expect(fromMusic21NoteName(toMusic21NoteName(name))).toBe(name);
			expect(toMusic21NoteName(fromMusic21NoteName(name))).toBe(name);
		}
	});
});
