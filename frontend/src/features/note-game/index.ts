/**
 * Note Game Feature Module
 * Centralized exports for all note game functionality
 */

// Hooks
export { useNoteGame, useGameTimer } from "./hooks";

// Components
export { GameSettings, GameBoard, GameResults } from "./components";
export type {
	GameSettingsProps,
	GameBoardProps,
	GameResultsProps,
} from "./components";

// Types
export type {
	GameMode,
	GameState,
	NoteAnswer,
	GameStats,
	GameSettings as GameSettingsType,
} from "./types";
export { SCALES, NOTES, ACCIDENTALS } from "./types";
