/**
 * The vocabulary every staff-identification game shares.
 *
 * Port of frontend-react/src/shared/types/game.types.ts (the enums and the
 * two result shapes) merged with
 * frontend-react/src/features/identification-game/types.ts (the settings
 * base, the question shape and the two limit tables).
 *
 * React split them because `GameMode` predates the engine and lived in
 * `shared/`, and the engine's `types.ts` re-exported it so a game module
 * had one import. There is nothing above the two game features that needs
 * either half, so they are one file here and the feature barrel
 * (`@features/identification-game`) is the single import site -- which is
 * the invariant `frontend/CLAUDE.md` states as "shared constants live
 * once". **Phase 6's note game imports these; it must not redeclare them.**
 */

/**
 * How a game decides it is over.
 *
 * - `Time` -- a countdown runs and expiry ends the game
 * - `Notes` -- a fixed number of questions ends the game
 *
 * The string values are persisted inside the JSONB settings `config` and
 * are validated by `sanitizeConfig`, so they are wire data: do not rename.
 */
export enum GameMode {
	Time = "time",
	Notes = "notes",
}

/**
 * Where a game is in its life.
 *
 * `Settings` is React's and is deliberately carried over unused: the shell
 * has always started at `Ready` with the board live behind the settings
 * dialog, and the note game (Phase 6) reads the same enum.
 */
export enum GameState {
	Settings = "settings",
	Ready = "ready",
	Playing = "playing",
	GameOver = "gameover",
}

/** One entry in the answer log. */
export interface NoteAnswer {
	/** The answer that *was* correct for the question on screen. */
	note: string;
	/** Whether the player's guess matched it. */
	correct: boolean;
	/** Milliseconds between the question appearing and the guess. */
	timeToAnswer: number;
}

/** What a finished game reports, and what the score entry is built from. */
export interface GameStats {
	/** Questions per minute, rounded. */
	npm: number;
	/** Percentage 0-100, rounded. */
	accuracy: number;
	correct: number;
	total: number;
	gameMode: GameMode;
	/** Seconds in `Time` mode, questions in `Notes` mode. */
	limit: number;
}

/**
 * The settings every identification game has. A game's own settings
 * interface extends this; the mode and limit controls are built into the
 * shell, so a game never declares them.
 */
export interface BaseGameSettings {
	gameMode: GameMode;
	timeLimit: number;
	noteLimit: number;
}

/**
 * The minimum a question fetched from the music service must carry: the
 * MusicXML to draw. Each game's response type adds its own answer fields.
 */
export interface GeneratedQuestion {
	generatedXml: string;
}

/** Selectable time limits (seconds), shared by every game's settings. */
export const TIME_LIMITS = [15, 30, 60, 120] as const;

/** Selectable question limits, shared by every game's settings. */
export const NOTE_LIMITS = [10, 25, 50, 100] as const;
