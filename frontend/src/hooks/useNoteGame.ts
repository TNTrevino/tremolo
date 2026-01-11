import { useCallback, useEffect } from "react";
import { useGameStatus } from "./useGameStatus";
import { useGameTimer } from "./useGameTimer";
import { useGameCounters } from "./useGameCounters";
import { useGameSettings } from "./useGameSettings";
import { useNoteGeneration } from "./useNoteGeneration";
import { keypressToNote } from "../pages/note-game/NoteGameUtilities";
import { useAuth } from "./useAuth";
import {
	NoteGameService,
	NoteGameEntryRequest,
} from "../services/NoteGameService";

/**
 * Orchestrator hook that coordinates all game logic
 * Combines focused hooks and manages their interactions
 * This is the single entry point for the NoteGame component
 */
export function useNoteGame() {
	const { currentUser, isAuthenticated } = useAuth();

	// Use all focused hooks
	const status = useGameStatus();
	const settings = useGameSettings();
	const counters = useGameCounters();

	const timer = useGameTimer(
		settings.gameMode,
		settings.timeLimit,
		status.gameStarted && !status.gameOver,
	);

	const noteGen = useNoteGeneration(
		settings.scaleChoice,
		settings.octaveChoice,
		counters.totalCounter,
		status.gameOver,
	);

	// Save game results to backend
	const saveGame = useCallback(async () => {
		if (!isAuthenticated || !currentUser || counters.totalCounter === 0) {
			return;
		}

		const elapsedSeconds = timer.elapsedTime;
		const hours = Math.floor(elapsedSeconds / 3600);
		const minutes = Math.floor((elapsedSeconds % 3600) / 60);
		const seconds = elapsedSeconds % 60;
		const timeLength = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

		const notesPerMinute = counters.calculateNotesPerMinute(elapsedSeconds);

		const entry: NoteGameEntryRequest = {
			user_id: currentUser.id,
			time_length: timeLength,
			total_questions: counters.totalCounter,
			correct_questions: counters.correctCounter,
			notes_per_minute: notesPerMinute,
		};

		try {
			await NoteGameService.saveNoteGameEntry(entry);
			console.log("Note game entry saved successfully");
		} catch (error) {
			console.error("Failed to save note game entry:", error);
		}
	}, [isAuthenticated, currentUser, counters, timer]);

	// Check end conditions - runs on every relevant state change
	useEffect(() => {
		if (!status.gameStarted || status.gameOver) return;

		let shouldEnd = false;

		if (settings.gameMode === "time") {
			// Time mode: check if time limit reached
			if (timer.elapsedTime >= settings.timeLimit) {
				shouldEnd = true;
			}
		} else {
			// Notes mode: check if note limit reached
			if (counters.totalCounter >= settings.noteLimit) {
				shouldEnd = true;
			}
		}

		if (shouldEnd) {
			status.endGame();
			saveGame();
		}
	}, [status, settings, timer, counters, saveGame]);

	// Unified answer handler - DRY principle for keyboard and button inputs
	const handleAnswer = useCallback(
		(noteKey: string) => {
			if (status.gameOver) return;

			// Start game on first answer
			if (!status.gameStarted) {
				status.startGame();
				timer.start();
			}

			// Validate answer
			const isCorrect = noteKey === noteGen.noteInformation?.noteName;
			counters.increment(isCorrect);

			// Play sound on correct answer
			if (isCorrect && noteGen.sound) {
				const audio = new Audio(noteGen.sound);
				audio.play();
			}
		},
		[status, timer, noteGen, counters],
	);

	// Keyboard handler - converts key to note and delegates to handleAnswer
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			const noteKey = keypressToNote[event.key];
			if (noteKey) {
				handleAnswer(noteKey);
			}
		},
		[handleAnswer],
	);

	// Button click handler - delegates directly to handleAnswer
	const handleButtonClick = useCallback(
		(noteKey: string) => {
			handleAnswer(noteKey);
		},
		[handleAnswer],
	);

	// Coordinated reset - resets all hooks in proper order
	const resetGame = useCallback(() => {
		status.reset();
		timer.reset();
		counters.reset();
		noteGen.fetchNote();
	}, [status, timer, counters, noteGen]);

	// Settings change handlers - trigger coordinated reset
	const handleGameModeChange = useCallback(
		(mode: "time" | "notes") => {
			if (mode === settings.gameMode) return;
			settings.setGameMode(mode);
			resetGame();
		},
		[settings, resetGame],
	);

	const handleTimeLimitChange = useCallback(
		(limit: number) => {
			if (limit === settings.timeLimit) return;
			settings.setTimeLimit(limit);
			resetGame();
		},
		[settings, resetGame],
	);

	const handleNoteLimitChange = useCallback(
		(limit: number) => {
			if (limit === settings.noteLimit) return;
			settings.setNoteLimit(limit);
			resetGame();
		},
		[settings, resetGame],
	);

	const handleScaleChange = useCallback(
		(scale: string) => {
			settings.setScale(scale);
			resetGame();
		},
		[settings, resetGame],
	);

	const handleOctaveChange = useCallback(
		(octave: string) => {
			settings.setOctave(octave);
			resetGame();
		},
		[settings, resetGame],
	);

	// Return unified API for the component
	return {
		// Status
		gameStarted: status.gameStarted,
		gameOver: status.gameOver,

		// Timer
		currentTime: timer.currentTime,
		startTime: timer.startTime,
		timeRemaining: timer.timeRemaining,
		elapsedTime: timer.elapsedTime,

		// Counters
		totalCounter: counters.totalCounter,
		correctCounter: counters.correctCounter,
		accuracy: counters.accuracy,
		notesPerMinute: counters.calculateNotesPerMinute(timer.elapsedTime),

		// Settings
		gameMode: settings.gameMode,
		timeLimit: settings.timeLimit,
		noteLimit: settings.noteLimit,
		scaleChoice: settings.scaleChoice,
		octaveChoice: settings.octaveChoice,

		// Note data
		noteInformation: noteGen.noteInformation,
		sound: noteGen.sound,

		// Actions
		handleKeyDown,
		handleButtonClick,
		resetGame,
		handleGameModeChange,
		handleTimeLimitChange,
		handleNoteLimitChange,
		handleScaleChange,
		handleOctaveChange,
	};
}
