/**
 * The arithmetic recharts used to do for us.
 *
 * When `recharts` was replaced (see `.migration/phase-3-subfeature-6-handoff.md`
 * for the decision and what was rejected), three jobs came with it: pick round
 * axis ticks, map a value to a pixel, and decide how many x labels fit. They
 * live here as plain functions -- no Angular, no DOM -- so they can be pinned
 * by a unit test instead of by eye.
 *
 * The curve itself is the one job that is *not* hand-rolled: `d3-shape`'s
 * `curveMonotoneX` draws it, and that is the same implementation recharts
 * drew `type="monotone"` with.
 */

/** A rounded axis domain and the ticks that land inside it. */
export interface NiceScale {
	min: number;
	max: number;
	ticks: number[];
}

const E10 = Math.sqrt(50);
const E5 = Math.sqrt(10);
const E2 = Math.sqrt(2);

/**
 * d3's tick-step algorithm: the "nicest" step of the form 1, 2, 5 or 10
 * times a power of ten that yields roughly `count` steps across the range.
 */
export function tickStep(min: number, max: number, count: number): number {
	const rough = (max - min) / Math.max(1, count);
	const power = Math.floor(Math.log10(rough));
	const error = rough / Math.pow(10, power);
	const factor = error >= E10 ? 10 : error >= E5 ? 5 : error >= E2 ? 2 : 1;
	return factor * Math.pow(10, power);
}

/**
 * Rounds a data range outward to whole steps and lists the ticks.
 *
 * Two degenerate inputs have to behave, because both occur with real data:
 * a single distinct value (one game played, or a flat 100% accuracy) and an
 * empty series. Both get a one-unit window rather than a zero-height axis
 * that would divide by zero downstream.
 */
export function niceScale(min: number, max: number, count = 5): NiceScale {
	if (!Number.isFinite(min) || !Number.isFinite(max)) {
		return { min: 0, max: 1, ticks: [0, 1] };
	}
	if (min === max) {
		// Centre the single value in a window one step tall.
		const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.5 : 1;
		min -= pad;
		max += pad;
	}

	const step = tickStep(min, max, count);
	const lo = Math.floor(min / step) * step;
	const hi = Math.ceil(max / step) * step;

	const ticks: number[] = [];
	// Stepping by multiplication rather than by repeated addition: adding
	// 0.1 five times lands on 0.5000000000000001, and that string ends up
	// on the axis.
	const steps = Math.round((hi - lo) / step);
	for (let i = 0; i <= steps; i++) {
		ticks.push(round(lo + i * step));
	}

	return { min: round(lo), max: round(hi), ticks };
}

/** Trims the float noise `lo + i * step` leaves behind. */
function round(value: number): number {
	return Number(value.toPrecision(12));
}

/**
 * Formats an axis tick the way recharts did: whole numbers plain, fractions
 * to as many places as the step needs, never in exponential notation.
 */
export function formatTick(value: number): string {
	if (Number.isInteger(value)) return String(value);
	return String(Number(value.toFixed(2)));
}

/**
 * How many x labels to skip so that neighbours stay `minTickGap` apart.
 *
 * React passed `minTickGap={16}` and recharts then dropped whichever labels
 * would have collided. This returns the stride instead -- every `stride`-th
 * label is drawn -- which is deterministic where recharts' pass was not, and
 * so survives a screenshot diff.
 */
export function labelStride(
	count: number,
	plotWidth: number,
	longestLabel: number,
	minTickGap = 16,
): number {
	if (count <= 1 || plotWidth <= 0) return 1;
	// 12px type averages a hair over half its size per character.
	const labelWidth = Math.max(longestLabel, 1) * 6.5;
	const perLabel = labelWidth + minTickGap;
	const fits = Math.max(1, Math.floor(plotWidth / perLabel));
	return Math.max(1, Math.ceil(count / fits));
}
