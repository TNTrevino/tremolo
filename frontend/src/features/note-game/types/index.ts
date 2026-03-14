/**
 * Type definitions for the Note Recognition Game feature
 * Re-exports from shared types for feature encapsulation
 */

import { GameMode, GameState } from "@/shared/types";
export { GameMode, GameState };
export type { NoteAnswer, GameStats } from "@/shared/types";

/**
 * Game settings configuration
 */
export interface GameSettings {
	gameMode: GameMode;
	timeLimit: number;
	noteLimit: number;
	scale: string;
	octave: number;
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
export const NOTES = ["C", "D", "E", "F", "G", "A", "B"] as const;

/**
 * Note accidentals
 */
export const ACCIDENTALS = ["#", "", "b"] as const;
