/**
 * THE PHASE-5 SEAM. Read this before changing anything in it.
 *
 * Everything declared here belongs to the **identification-game engine**,
 * which Phase 5 was building in a parallel worktree while this phase was
 * built. Phase 6 could not import Phase 5's barrel because it did not exist
 * yet, so the declarations the note game needs are mirrored here -- with the
 * React names kept **exactly** -- and every note-game file imports them from
 * this one file and nowhere else.
 *
 * **At merge time this file collapses to a re-export.** Replace the body
 * with
 *
 * ```ts
 * export {
 *   GameMode, GameState, TIME_LIMITS, NOTE_LIMITS, NATURAL_NOTES,
 *   CLEF_UNICODE, CLEF_LABELS, formatTimeLength,
 * } from "../../identification-game";
 * export type { NoteAnswer, GameStats, BaseGameSettings, GeneratedQuestion }
 *   from "../../identification-game";
 * ```
 *
 * and delete whichever names Phase 5 spells the same way. No other note-game
 * file changes: that is the whole point of routing every import through here.
 * `.migration/phase-6-handoff.md` §3 has the per-symbol map.
 *
 * Sources in `frontend-react/src/`:
 *
 * | symbol                              | React file                                        |
 * | ----------------------------------- | ------------------------------------------------- |
 * | `GameMode`, `GameState`             | `shared/types/game.types.ts`                      |
 * | `NoteAnswer`, `GameStats`           | `shared/types/game.types.ts`                      |
 * | `BaseGameSettings`, `GeneratedQuestion` | `features/identification-game/types.ts`       |
 * | `TIME_LIMITS`, `NOTE_LIMITS`        | `features/identification-game/types.ts`           |
 * | `NATURAL_NOTES`, `formatTimeLength` | `features/identification-game/utils.ts`           |
 * | `CLEF_UNICODE`, `CLEF_LABELS`       | `features/identification-game/components/ClefGlyph.tsx` |
 */

import type { StaffClef } from "../../../shared/models/music.models";

/**
 * Game mode options.
 *
 * React declares this as a TypeScript `enum`; a frozen object plus a union
 * type reads identically at every call site (`GameMode.Time`) while also
 * being a plain string union, which is what the wire wants -- `game_mode`
 * is persisted as `"time"` / `"notes"`.
 */
export const GameMode = {
	/** Game runs for a fixed duration. */
	Time: "time",
	/** Game runs until a fixed number of notes are answered. */
	Notes: "notes",
} as const;
export type GameMode = (typeof GameMode)[keyof typeof GameMode];

/** Current state of the game. */
export const GameState = {
	/** Player is configuring game options. */
	Settings: "settings",
	/** First note displayed, waiting for the player's first answer. */
	Ready: "ready",
	/** Game is in progress. */
	Playing: "playing",
	/** Game has ended, showing results. */
	GameOver: "gameover",
} as const;
export type GameState = (typeof GameState)[keyof typeof GameState];

/** Individual note answer with metadata. */
export interface NoteAnswer {
	/** The note that was displayed. */
	note: string;
	/** Whether the player answered correctly. */
	correct: boolean;
	/** Time taken to answer, in milliseconds. */
	timeToAnswer: number;
}

/** Complete statistics for a finished game. */
export interface GameStats {
	/** Notes (or answers) per minute. */
	npm: number;
	/** Accuracy percentage, 0-100. */
	accuracy: number;
	/** Number of correct answers. */
	correct: number;
	/** Total number of questions answered. */
	total: number;
	/** Game mode that was used. */
	gameMode: GameMode;
	/** Time limit (seconds) or note limit, depending on the mode. */
	limit: number;
}

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
 * Minimum shape of a question fetched from the music microservice: MusicXML
 * to render plus game-specific answer fields.
 */
export interface GeneratedQuestion {
	generatedXml: string;
}

/** Selectable time limits (seconds) shared by every game's settings. */
export const TIME_LIMITS = [15, 30, 60, 120] as const;

/** Selectable question limits shared by every game's settings. */
export const NOTE_LIMITS = [10, 25, 50, 100] as const;

/** The seven natural note letters, low to high within an octave. */
export const NATURAL_NOTES = ["C", "D", "E", "F", "G", "A", "B"] as const;

/** Format seconds as `"HH:MM:SS"` for the entries API. */
export function formatTimeLength(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	return [hours, minutes, secs]
		.map((val) => String(val).padStart(2, "0"))
		.join(":");
}

/** Display label per clef. */
export const CLEF_LABELS: Record<StaffClef, string> = {
	treble: "Treble Clef",
	bass: "Bass Clef",
	alto: "Alto Clef",
	tenor: "Tenor Clef",
	soprano: "Soprano Clef",
	mezzo_soprano: "Mezzo-soprano Clef",
	baritone: "Baritone Clef",
};

/** Unicode codepoint per clef (shared by every staff renderer). */
export const CLEF_UNICODE: Record<StaffClef, string> = {
	treble: "\u{1D11E}",
	bass: "\u{1D122}",
	alto: "\u{1D121}",
	tenor: "\u{1D121}",
	soprano: "\u{1D121}",
	mezzo_soprano: "\u{1D121}",
	baritone: "\u{1D122}",
};
