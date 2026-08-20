/**
 * Shared types for staff identification games
 * (note, key signature, scale, chord identification)
 */

import { GameMode, GameState } from "@/shared/types";
export { GameMode, GameState };
export type { NoteAnswer, GameStats } from "@/shared/types";

/**
 * Settings every identification game shares. Game-specific settings
 * (scale/octave, accidental count, chord qualities, ...) extend this.
 */
export interface BaseGameSettings {
	gameMode: GameMode;
	timeLimit: number;
	noteLimit: number;
}

/**
 * Minimum shape of a question fetched from the music microservice:
 * MusicXML to render plus game-specific answer fields.
 */
export interface GeneratedQuestion {
	generatedXml: string;
}

/** Selectable time limits (seconds) shared by every game's settings. */
export const TIME_LIMITS = [15, 30, 60, 120] as const;

/** Selectable question limits shared by every game's settings. */
export const NOTE_LIMITS = [10, 25, 50, 100] as const;
