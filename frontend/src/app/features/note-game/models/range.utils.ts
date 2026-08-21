/**
 * Helpers for the staff-based note range picker.
 *
 * Verbatim port of frontend-react/src/features/note-game/rangeUtils.ts --
 * plain arithmetic, no framework in it.
 *
 * Range endpoints are natural (white-key) notes, addressed by a diatonic
 * index: C0 = 0, D0 = 1, ... B0 = 6, C1 = 7, and so on. One index step is one
 * staff position (line or space).
 */

import type { RangeClef } from "../../../shared/models/music.models";
import { NATURAL_NOTES as LETTERS } from "./engine.models";

/** Convert a natural note name like "F3" to its diatonic index. */
export function noteToIndex(note: string): number {
	const match = /^([A-Ga-g])([0-9])$/.exec(note);
	if (!match?.[1] || !match[2]) {
		throw new Error(`invalid natural note: ${note}`);
	}
	const letterIdx = LETTERS.indexOf(
		match[1].toUpperCase() as (typeof LETTERS)[number],
	);
	return Number(match[2]) * 7 + letterIdx;
}

/** Convert a diatonic index back to a note name like "F3". */
export function indexToNote(index: number): string {
	const octave = Math.floor(index / 7);
	const letter = LETTERS[((index % 7) + 7) % 7];
	return `${letter}${octave}`;
}

/**
 * Diatonic index of the bottom staff line per clef
 * (treble: E4, bass: G2).
 */
export const BOTTOM_LINE_INDEX: Record<RangeClef, number> = {
	treble: noteToIndex("E4"),
	bass: noteToIndex("G2"),
};

/** Selectable bounds per clef (generous but keeps ledger lines sane). */
export const RANGE_BOUNDS: Record<RangeClef, { min: number; max: number }> = {
	treble: { min: noteToIndex("A3"), max: noteToIndex("C7") },
	bass: { min: noteToIndex("C2"), max: noteToIndex("E5") },
};

/** Default range per clef (used when settings have no saved range). */
export const DEFAULT_RANGE: Record<RangeClef, { low: string; high: string }> = {
	treble: { low: "C4", high: "C6" },
	bass: { low: "E2", high: "E4" },
};

/**
 * Vertical offset of a note in staff-position steps relative to the bottom
 * staff line (positive = above the bottom line).
 */
export function staffSteps(index: number, clef: RangeClef): number {
	return index - BOTTOM_LINE_INDEX[clef];
}

/**
 * Ledger line staff-steps needed for a note (every even step below 0 or
 * above 8, i.e. lines outside the five staff lines).
 */
export function ledgerSteps(index: number, clef: RangeClef): number[] {
	const steps = staffSteps(index, clef);
	const lines: number[] = [];
	for (let s = -2; s >= steps; s -= 2) lines.push(s);
	for (let s = 10; s <= steps; s += 2) lines.push(s);
	return lines;
}
