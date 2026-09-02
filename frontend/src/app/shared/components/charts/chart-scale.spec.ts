import { formatTick, labelStride, niceScale, tickStep } from "./chart-scale";

/**
 * The arithmetic recharts used to own. It is pinned here rather than by eye
 * because a bad axis is a *plausible-looking* axis: 0.30000000000000004 on a
 * tick label, or a domain that clips the top of the line, both render
 * without error.
 */
describe("chart-scale", () => {
	describe("tickStep", () => {
		it("picks steps of 1, 2, 5 or 10 times a power of ten", () => {
			expect(tickStep(0, 100, 5)).toBe(20);
			expect(tickStep(0, 10, 5)).toBe(2);
			expect(tickStep(0, 1, 5)).toBe(0.2);
			expect(tickStep(0, 1000, 5)).toBe(200);
		});
	});

	describe("niceScale", () => {
		it("rounds the domain outward to whole steps", () => {
			const scale = niceScale(3, 97);
			expect(scale.min).toBeLessThanOrEqual(3);
			expect(scale.max).toBeGreaterThanOrEqual(97);
		});

		it("lists ticks that start at min, end at max and are evenly spaced", () => {
			const { min, max, ticks } = niceScale(0, 100);
			expect(ticks[0]).toBe(min);
			expect(ticks[ticks.length - 1]).toBe(max);

			const gaps = ticks.slice(1).map((t, i) => t - (ticks[i] ?? 0));
			expect(new Set(gaps.map((g) => g.toFixed(6))).size).toBe(1);
		});

		it("leaves no float noise on a fractional step", () => {
			// 0.1 added five times is 0.5000000000000001, and that string would
			// be on the axis.
			for (const tick of niceScale(0, 1).ticks) {
				expect(String(tick).length).toBeLessThan(6);
			}
		});

		it("gives a single repeated value a window instead of a flat axis", () => {
			const scale = niceScale(42, 42);
			expect(scale.max).toBeGreaterThan(scale.min);
		});

		it("survives an empty series, where min is +Infinity", () => {
			const scale = niceScale(
				Number.POSITIVE_INFINITY,
				Number.NEGATIVE_INFINITY,
			);
			expect(scale).toEqual({ min: 0, max: 1, ticks: [0, 1] });
		});
	});

	describe("formatTick", () => {
		it("keeps whole numbers whole and trims trailing zeros", () => {
			expect(formatTick(40)).toBe("40");
			expect(formatTick(0.5)).toBe("0.5");
			expect(formatTick(0.25)).toBe("0.25");
		});
	});

	describe("labelStride", () => {
		it("draws every label when they all fit", () => {
			expect(labelStride(5, 600, 6)).toBe(1);
		});

		it("skips labels when they would collide", () => {
			expect(labelStride(60, 300, 6)).toBeGreaterThan(1);
		});

		it("never returns zero, which would loop forever", () => {
			expect(labelStride(0, 0, 0)).toBe(1);
			expect(labelStride(100, 1, 40)).toBeGreaterThanOrEqual(1);
		});
	});
});
