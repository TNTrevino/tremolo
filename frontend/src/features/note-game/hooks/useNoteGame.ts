import { useCallback } from "react";
import type {
	NoteAnswer,
	GameStats,
	NoteGameStats,
	GameSettings,
} from "../types";
import { GameState, GameMode } from "../types";
import { useIdentificationGame } from "@/features/identification-game";
import { useNoteAudio } from "./useNoteAudio";
import { useKeyboardInput } from "./useKeyboardInput";
import { DEFAULT_RANGE } from "../rangeUtils";

interface UseNoteGameReturn {
	// Game state
	gameState: GameState;
	currentNote: string;
	answers: NoteAnswer[];
	gameStats: NoteGameStats | null;
	settings: GameSettings;

	// Timing
	questionStartTime: number;
	gameStartTime: number;

	// Actions
	updateSettings: (settings: Partial<GameSettings>) => void;
	handleAnswer: (answer: string) => void;
	endGame: (finalAnswers?: NoteAnswer[]) => void;
	resetGame: () => void;
	syncCurrentNote: (noteName: string) => void;
}

interface UseNoteGameOptions {
	initialSettings?: Partial<GameSettings>;
	onGameEnd?: (stats: GameStats) => void;
	onGameStart?: () => void;
	keyBindings?: Record<string, string>;
	inputDisabled?: boolean;
}

/**
 * Custom hook for managing note game logic.
 *
 * Composes the generic identification game engine with the note game's
 * extras: audio feedback on correct answers and physical keyboard input.
 */
export function useNoteGame(options?: UseNoteGameOptions): UseNoteGameReturn {
	const {
		initialSettings,
		onGameEnd,
		onGameStart,
		keyBindings,
		inputDisabled,
	} = options || {};

	// Audio playback hook
	const { playNoteSound } = useNoteAudio();

	const onCorrectAnswer = useCallback(
		(note: string) => {
			playNoteSound(note);
		},
		[playNoteSound],
	);

	// octave is legacy persistence-only; the range is what the game
	// actually uses, so stats report the scale alone.
	const statsExtras = useCallback(
		(settings: GameSettings) => ({ scale: settings.scale }),
		[],
	);

	const game = useIdentificationGame<GameSettings>({
		defaultSettings: {
			gameMode: GameMode.Time,
			timeLimit: 30,
			noteLimit: 25,
			scale: "C Major",
			octave: 4,
			clef: "treble",
			lowNote: DEFAULT_RANGE.treble.low,
			highNote: DEFAULT_RANGE.treble.high,
			...initialSettings,
		},
		onGameEnd,
		onGameStart,
		onCorrectAnswer,
		statsExtras,
	});

	// Set up keyboard input - only enabled when game is playing
	useKeyboardInput({
		onNoteInput: game.handleAnswer,
		enabled:
			!inputDisabled &&
			(game.gameState === GameState.Playing ||
				game.gameState === GameState.Ready),
		keyBindings,
	});

	return {
		// State
		gameState: game.gameState,
		currentNote: game.currentAnswer,
		answers: game.answers,
		// statsExtras above adds the note-game fields; the engine types
		// its stats generically.
		gameStats: game.gameStats as NoteGameStats | null,
		settings: game.settings,
		questionStartTime: game.questionStartTime,
		gameStartTime: game.gameStartTime,

		// Actions
		updateSettings: game.updateSettings,
		handleAnswer: game.handleAnswer,
		endGame: game.endGame,
		resetGame: game.resetGame,
		syncCurrentNote: game.syncCurrentAnswer,
	};
}
