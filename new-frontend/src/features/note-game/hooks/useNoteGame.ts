import { useState, useCallback } from "react";
import type { GameState, NoteAnswer, GameStats, GameSettings } from "../types";
import { NOTES, ACCIDENTALS } from "../types";
import { useNoteAudio } from "./useNoteAudio";
import { useKeyboardInput } from "./useKeyboardInput";

// Generate all possible notes
const ALL_NOTES = ACCIDENTALS.flatMap((acc) =>
	NOTES.map((note) => `${note}${acc}`),
);

interface UseNoteGameReturn {
	// Game state
	gameState: GameState;
	currentNote: string;
	answers: NoteAnswer[];
	gameStats: GameStats | null;
	settings: GameSettings;

	// Timing
	questionStartTime: number;
	gameStartTime: number;

	// Actions
	updateSettings: (settings: Partial<GameSettings>) => void;
	startGame: () => void;
	handleAnswer: (answer: string) => void;
	endGame: (finalAnswers?: NoteAnswer[]) => void;
	resetGame: () => void;
}

interface UseNoteGameOptions {
	initialSettings?: Partial<GameSettings>;
	onGameEnd?: (stats: GameStats) => void;
}

/**
 * Custom hook for managing note game logic
 * Handles game state, note generation, answer validation, and statistics
 */
export function useNoteGame(options?: UseNoteGameOptions): UseNoteGameReturn {
	const { initialSettings, onGameEnd } = options || {};

	// Audio playback hook
	const { playNoteSound } = useNoteAudio();

	// Game settings
	const [settings, setSettings] = useState<GameSettings>({
		gameMode: "time",
		timeLimit: 30,
		noteLimit: 25,
		scale: "C Major",
		octave: 4,
		...initialSettings,
	});

	// Game state
	const [gameState, setGameState] = useState<GameState>("settings");
	const [currentNote, setCurrentNote] = useState("C");
	const [answers, setAnswers] = useState<NoteAnswer[]>([]);
	const [gameStartTime, setGameStartTime] = useState(0);
	const [questionStartTime, setQuestionStartTime] = useState(0);
	const [gameStats, setGameStats] = useState<GameStats | null>(null);

	/**
	 * Generate a random note from all possible notes
	 */
	const generateRandomNote = useCallback(() => {
		const randomNote =
			ALL_NOTES[Math.floor(Math.random() * ALL_NOTES.length)] ?? "C";
		setCurrentNote(randomNote);
		setQuestionStartTime(Date.now());
	}, []);

	/**
	 * Update game settings (only allowed in settings state)
	 */
	const updateSettings = useCallback((newSettings: Partial<GameSettings>) => {
		setSettings((prev) => ({ ...prev, ...newSettings }));
	}, []);

	/**
	 * Start a new game
	 */
	const startGame = useCallback(() => {
		setGameState("playing");
		setAnswers([]);
		setGameStartTime(Date.now());
		setGameStats(null);
		generateRandomNote();
	}, [generateRandomNote]);

	/**
	 * End the game and calculate statistics
	 */
	const endGame = useCallback(
		(finalAnswers?: NoteAnswer[]) => {
			const gameAnswers = finalAnswers || answers;
			const correct = gameAnswers.filter((a) => a.correct).length;
			const total = gameAnswers.length;
			const accuracy = total > 0 ? (correct / total) * 100 : 0;
			const timeElapsed = (Date.now() - gameStartTime) / 1000 / 60; // in minutes
			const npm = total > 0 && timeElapsed > 0 ? total / timeElapsed : 0;

			const stats: GameStats = {
				npm: Math.round(npm),
				accuracy: Math.round(accuracy),
				correct,
				total,
				gameMode: settings.gameMode,
				limit:
					settings.gameMode === "time"
						? settings.timeLimit
						: settings.noteLimit,
				scale: settings.scale,
				octave: settings.octave,
			};

			setGameStats(stats);
			setGameState("gameover");

			// Notify parent component of game end
			onGameEnd?.(stats);
		},
		[answers, gameStartTime, settings, onGameEnd],
	);

	/**
	 * Handle a note answer
	 */
	const handleAnswer = useCallback(
		(answer: string) => {
			const timeToAnswer = Date.now() - questionStartTime;
			const correct = answer === currentNote;

			const newAnswer: NoteAnswer = {
				note: currentNote,
				correct,
				timeToAnswer,
			};

			const newAnswers = [...answers, newAnswer];
			setAnswers(newAnswers);

			// Play audio feedback on correct answer
			if (correct) {
				playNoteSound(currentNote);
			}

			// Check if game should end (notes mode)
			if (
				settings.gameMode === "notes" &&
				newAnswers.length >= settings.noteLimit
			) {
				endGame(newAnswers);
			} else {
				generateRandomNote();
			}
		},
		[
			currentNote,
			questionStartTime,
			answers,
			settings.gameMode,
			settings.noteLimit,
			generateRandomNote,
			endGame,
			playNoteSound,
		],
	);

	/**
	 * Reset game to settings screen
	 */
	const resetGame = useCallback(() => {
		setGameState("settings");
		setGameStats(null);
		setAnswers([]);
	}, []);

	// Set up keyboard input - only enabled when game is playing
	useKeyboardInput({
		onNoteInput: handleAnswer,
		enabled: gameState === "playing",
	});

	return {
		// State
		gameState,
		currentNote,
		answers,
		gameStats,
		settings,
		questionStartTime,
		gameStartTime,

		// Actions
		updateSettings,
		startGame,
		handleAnswer,
		endGame,
		resetGame,
	};
}
