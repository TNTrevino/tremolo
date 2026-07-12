/**
 * Note Game Feature Module
 * Centralized exports for all note game functionality
 */

// Hooks
export { useNoteGame } from "./hooks";

// Components
export type {
	GameBoardProps,
	GameResultsProps,
	SettingsBarProps,
} from "./components";

// Types
export { GameMode, GameState, SCALES, NOTES, ACCIDENTALS } from "./types";
export type {
	NoteAnswer,
	GameStats,
	GameSettings as GameSettingsType,
} from "./types";
