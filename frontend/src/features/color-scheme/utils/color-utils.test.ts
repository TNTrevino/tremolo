import { describe, it, expect } from "vitest";
import { hslStringToHex, hexToHslString } from "./color-utils";

describe("hslStringToHex", () => {
	it("converts a purple", () => {
		expect(hslStringToHex("262 83% 58%")).toBe("#7c3bed");
	});

	it("converts pure black", () => {
		expect(hslStringToHex("0 0% 0%")).toBe("#000000");
	});

	it("converts pure white", () => {
		expect(hslStringToHex("0 0% 100%")).toBe("#ffffff");
	});

	it("converts pure red", () => {
		expect(hslStringToHex("0 100% 50%")).toBe("#ff0000");
	});

	it("converts pure green", () => {
		expect(hslStringToHex("120 100% 50%")).toBe("#00ff00");
	});

	it("converts pure blue", () => {
		expect(hslStringToHex("240 100% 50%")).toBe("#0000ff");
	});

	it("converts yellow", () => {
		expect(hslStringToHex("60 100% 50%")).toBe("#ffff00");
	});

	it("handles decimal percentages", () => {
		expect(hslStringToHex("240 4.8% 95.9%")).toBe("#f4f4f5");
	});

	it("handles hue 360 as equivalent to 0", () => {
		expect(hslStringToHex("360 100% 50%")).toBe("#ff0000");
	});

	it("throws on malformed input", () => {
		expect(() => hslStringToHex("not a color")).toThrow("Invalid HSL string");
	});

	it("throws on empty string", () => {
		expect(() => hslStringToHex("")).toThrow("Invalid HSL string");
	});

	it("throws on CSS hsl() syntax", () => {
		expect(() => hslStringToHex("hsl(262, 83%, 58%)")).toThrow(
			"Invalid HSL string",
		);
	});
});

describe("hexToHslString", () => {
	it("converts black", () => {
		expect(hexToHslString("#000000")).toBe("0 0% 0%");
	});

	it("converts white", () => {
		expect(hexToHslString("#ffffff")).toBe("0 0% 100%");
	});

	it("converts pure red", () => {
		expect(hexToHslString("#ff0000")).toBe("0 100% 50%");
	});

	it("converts pure green", () => {
		expect(hexToHslString("#00ff00")).toBe("120 100% 50%");
	});

	it("converts pure blue", () => {
		expect(hexToHslString("#0000ff")).toBe("240 100% 50%");
	});

	it("converts with uppercase hex", () => {
		expect(hexToHslString("#FF0000")).toBe("0 100% 50%");
	});

	it("converts without hash prefix", () => {
		expect(hexToHslString("ff0000")).toBe("0 100% 50%");
	});

	it("produces decimal S and L when needed", () => {
		const result = hexToHslString("#f3f3f5");
		expect(result).toMatch(/^\d+ [\d.]+% [\d.]+%$/);
	});

	it("throws on invalid hex", () => {
		expect(() => hexToHslString("#GGG")).toThrow("Invalid hex color");
	});

	it("throws on short hex", () => {
		expect(() => hexToHslString("#fff")).toThrow("Invalid hex color");
	});

	it("throws on empty string", () => {
		expect(() => hexToHslString("")).toThrow("Invalid hex color");
	});
});

describe("round-trip fidelity", () => {
	const cases = [
		"0 0% 0%",
		"0 0% 100%",
		"0 100% 50%",
		"120 100% 50%",
		"240 100% 50%",
		"60 100% 50%",
	];

	for (const hsl of cases) {
		it(`hsl → hex → hsl preserves "${hsl}"`, () => {
			const hex = hslStringToHex(hsl);
			const backToHsl = hexToHslString(hex);
			expect(backToHsl).toBe(hsl);
		});
	}

	it("round-trips a complex value within rounding tolerance", () => {
		// For values with decimals, the round-trip may differ slightly due to
		// floating-point rounding, but should be visually equivalent.
		const original = "262 83% 58%";
		const hex = hslStringToHex(original);
		const roundTripped = hexToHslString(hex);

		// Parse both to compare numerically
		const parse = (s: string) => {
			const [h, sp, lp] = s.split(/\s+/);
			return {
				h: parseFloat(h!),
				s: parseFloat(sp!),
				l: parseFloat(lp!),
			};
		};
		const orig = parse(original);
		const rt = parse(roundTripped);

		expect(Math.abs(orig.h - rt.h)).toBeLessThanOrEqual(1);
		expect(Math.abs(orig.s - rt.s)).toBeLessThanOrEqual(1);
		expect(Math.abs(orig.l - rt.l)).toBeLessThanOrEqual(1);
	});
});
