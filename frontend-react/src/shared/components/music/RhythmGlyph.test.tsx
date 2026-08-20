import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RhythmGlyph, describeRhythm } from "./RhythmGlyph";

const parts = (rhythm: string, rhythmType: 8 | 16) => {
	const { container } = render(
		<RhythmGlyph rhythm={rhythm} rhythmType={rhythmType} />,
	);
	return {
		heads: container.querySelectorAll("ellipse").length,
		beams: container.querySelectorAll("rect").length,
		flags: container.querySelectorAll("path").length,
		rests: container.querySelectorAll("text").length,
	};
};

describe("describeRhythm", () => {
	it("names notes and rests by duration", () => {
		expect(describeRhythm("112", 16)).toBe(
			"sixteenth note, sixteenth note, eighth note",
		);
		expect(describeRhythm("01", 8)).toBe("eighth rest, eighth note");
	});
});

describe("RhythmGlyph beaming", () => {
	it("four sixteenths: full double beam, no flags or rests", () => {
		// primary beam + three full sixteenth segments
		expect(parts("1111", 16)).toEqual({
			heads: 4,
			beams: 4,
			flags: 0,
			rests: 0,
		});
	});

	it("sixteenth-eighth-sixteenth: primary beam plus two partial stubs", () => {
		expect(parts("121", 16)).toEqual({
			heads: 3,
			beams: 3,
			flags: 0,
			rests: 0,
		});
	});

	it("eighth then two sixteenths: one full sixteenth segment", () => {
		// primary + one full segment between the two sixteenths
		expect(parts("211", 16)).toEqual({
			heads: 3,
			beams: 2,
			flags: 0,
			rests: 0,
		});
	});

	it("rest then three sixteenths: rest breaks nothing that follows", () => {
		// primary + two full segments, one rest glyph
		expect(parts("0111", 16)).toEqual({
			heads: 3,
			beams: 3,
			flags: 0,
			rests: 1,
		});
	});

	it("isolated eighth gets a flag, not a beam", () => {
		expect(parts("10", 8)).toEqual({
			heads: 1,
			beams: 0,
			flags: 1,
			rests: 1,
		});
	});

	it("two eighths share a single beam", () => {
		expect(parts("11", 8)).toEqual({
			heads: 2,
			beams: 1,
			flags: 0,
			rests: 0,
		});
	});
});
