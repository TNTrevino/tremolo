/**
 * Type definitions for the Note Recognition Game feature
 * Re-exports from shared types for feature encapsulation
 */

import { GameMode, GameState } from "@/shared/types";
import type { GameStats } from "@/shared/types";
import type { RangeClef } from "@/services/api/types";
import type { BaseGameSettings } from "@/features/identification-game";
import { NATURAL_NOTES } from "@/features/identification-game";
export { GameMode, GameState };
export type { NoteAnswer, GameStats } from "@/shared/types";

/** GameStats plus the note game's extra summary fields (statsExtras). */
export interface NoteGameStats extends GameStats {
	scale?: string;
}

/**
 * Game settings configuration
 */
export interface GameSettings extends BaseGameSettings {
	scale: string;
	/** Kept for saved-settings compatibility; the note range supersedes it */
	octave: number;
	/** Lowest note in the practice range (natural note, e.g. "C4") */
	lowNote: string;
	/** Highest note in the practice range (natural note, e.g. "C6") */
	highNote: string;
	clef: RangeClef;
}

/**
 * Available musical scales
 */
export const SCALES = [
	"C Major",
	"F Major",
	"Bb Major",
	"Eb Major",
	"Ab Major",
	"Db Major",
	"Gb Major",
	"G Major",
	"D Major",
	"A Major",
	"E Major",
	"B Major",
] as const;

/**
 * Musical notes
 */
export const NOTES = NATURAL_NOTES;

/**
 * Note accidentals
 */
export const ACCIDENTALS = ["#", "", "b"] as const;
