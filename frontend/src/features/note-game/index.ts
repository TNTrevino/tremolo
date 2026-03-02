/**
 * Note Game Feature Module
 * Centralized exports for all note game functionality
 */

// Hooks
export { useNoteGame, useGameTimer } from "./hooks";

// Components
export type {
	GameSettingsProps,
	GameBoardProps,
	GameResultsProps,
} from "./components";

// Types
export { GameMode, GameState, SCALES, NOTES, ACCIDENTALS } from "./types";
export type {
	NoteAnswer,
	GameStats,
	GameSettings as GameSettingsType,
} from "./types";
