import { useState, useCallback } from "react";
import type { NoteAnswer, GameStats, BaseGameSettings } from "../types";
import { GameState, GameMode } from "../types";

export interface UseIdentificationGameReturn<
	TSettings extends BaseGameSettings,
> {
	// Game state
	gameState: GameState;
	currentAnswer: string;
	answers: NoteAnswer[];
	gameStats: GameStats | null;
	settings: TSettings;

	// Timing
	questionStartTime: number;
	gameStartTime: number;

	// Actions
	updateSettings: (settings: Partial<TSettings>) => void;
	handleAnswer: (answer: string) => void;
	endGame: (finalAnswers?: NoteAnswer[]) => void;
	resetGame: () => void;
	syncCurrentAnswer: (answer: string) => void;
}

export interface UseIdentificationGameOptions<
	TSettings extends BaseGameSettings,
> {
	defaultSettings: TSettings;
	onGameEnd?: (stats: GameStats) => void;
	onGameStart?: () => void;
	/** Called with the answer when the player gets a question right */
	onCorrectAnswer?: (answer: string) => void;
	/** Extra fields merged into GameStats (e.g. scale/octave) */
	statsExtras?: (settings: TSettings) => Partial<GameStats>;
}

/**
 * Generic engine for staff identification games.
 *
 * Owns the Ready -> Playing -> GameOver state machine, answer log,
 * scoring, and per-question timing. The question itself lives outside:
 * the board fetches questions (useQuestionQueue) and calls
 * `syncCurrentAnswer` with the correct answer for the displayed
 * question; `handleAnswer` compares the player's guess against it.
 */
export function useIdentificationGame<TSettings extends BaseGameSettings>(
	options: UseIdentificationGameOptions<TSettings>,
): UseIdentificationGameReturn<TSettings> {
	const { defaultSettings, onGameEnd, onGameStart, onCorrectAnswer } = options;

	const [settings, setSettings] = useState<TSettings>(defaultSettings);

	const [gameState, setGameState] = useState<GameState>(GameState.Ready);
	const [currentAnswer, setCurrentAnswer] = useState("");
	const [answers, setAnswers] = useState<NoteAnswer[]>([]);
	const [gameStartTime, setGameStartTime] = useState(0);
	const [questionStartTime, setQuestionStartTime] = useState(0);
	const [gameStats, setGameStats] = useState<GameStats | null>(null);

	const updateSettings = useCallback((newSettings: Partial<TSettings>) => {
		setSettings((prev) => ({ ...prev, ...newSettings }));
	}, []);

	const { statsExtras } = options;

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
					settings.gameMode === GameMode.Time
						? settings.timeLimit
						: settings.noteLimit,
				...statsExtras?.(settings),
			};

			setGameStats(stats);
			setGameState(GameState.GameOver);

			onGameEnd?.(stats);
		},
		[answers, gameStartTime, settings, onGameEnd, statsExtras],
	);

	/**
	 * Handle an answer. When the game is in Ready state, the first
	 * answer transitions to Playing.
	 */
	const handleAnswer = useCallback(
		(answer: string) => {
			if (gameState === GameState.Ready) {
				setGameState(GameState.Playing);
				setGameStartTime(Date.now());
				onGameStart?.();
			}

			const effectiveQuestionStart =
				questionStartTime === 0 ? Date.now() : questionStartTime;
			const timeToAnswer = Date.now() - effectiveQuestionStart;
			const correct = answer === currentAnswer;

			const newAnswer: NoteAnswer = {
				note: currentAnswer,
				correct,
				timeToAnswer,
			};

			const newAnswers = [...answers, newAnswer];
			setAnswers(newAnswers);

			if (correct) {
				onCorrectAnswer?.(currentAnswer);
			}

			// Check if game should end (notes mode). No new question is
			// generated here — the board fetches the next question from
			// the queue when answers.length changes.
			if (
				settings.gameMode === GameMode.Notes &&
				newAnswers.length >= settings.noteLimit
			) {
				endGame(newAnswers);
			}
		},
		[
			gameState,
			currentAnswer,
			questionStartTime,
			answers,
			settings.gameMode,
			settings.noteLimit,
			endGame,
			onCorrectAnswer,
			onGameStart,
		],
	);

	/**
	 * Sync the expected answer with the backend-generated question.
	 * Called when the board receives a question from the API so answer
	 * validation compares against the displayed question.
	 */
	const syncCurrentAnswer = useCallback((answer: string) => {
		setCurrentAnswer(answer);
		setQuestionStartTime(Date.now());
	}, []);

	const resetGame = useCallback(() => {
		setGameState(GameState.Ready);
		setGameStats(null);
		setAnswers([]);
	}, []);

	return {
		gameState,
		currentAnswer,
		answers,
		gameStats,
		settings,
		questionStartTime,
		gameStartTime,

		updateSettings,
		handleAnswer,
		endGame,
		resetGame,
		syncCurrentAnswer,
	};
}
