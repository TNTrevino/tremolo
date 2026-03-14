import { useState, useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/shared/hooks/useToast";
import {
	useSaveGameResult,
	useNoteGameSettings,
	useSaveNoteGameSettings,
} from "@/shared/hooks/queries";
import type { GameStats } from "@/shared/types";
import {
	useNoteGame,
	useGameTimer,
	GameState,
	GameMode,
} from "@/features/note-game";
import { formatTimeLength } from "@/features/note-game/utils";
import { GameBoard } from "@/features/note-game/components/GameBoard";
import { GameResults } from "@/features/note-game/components/GameResults";
import { ScoreBar } from "@/features/note-game/components/ScoreBar";
import { SettingsBar } from "@/features/note-game/components/SettingsBar";

/**
 * Note Recognition Game Page
 * Main orchestrator for the note game feature - manages state flow between
 * ready, playing, and results screens
 */
export function NoteGamePage() {
	const { isAuthenticated, user } = useAuthStore();
	const { showSuccess, showError } = useToast();
	const [pastGames, setPastGames] = useState<GameStats[]>([]);
	const saveResult = useSaveGameResult();
	const { data: savedSettings } = useNoteGameSettings();
	const saveSettings = useSaveNoteGameSettings();

	const handleGameEnd = useCallback(
		(stats: GameStats) => {
			setPastGames((prev) => [...prev.slice(-9), stats]);

			if (isAuthenticated && user) {
				const timeInSeconds =
					stats.gameMode === GameMode.Time
						? stats.limit
						: Math.round((stats.total / stats.npm) * 60);

				saveResult.mutate(
					{
						timeLength: formatTimeLength(timeInSeconds),
						totalQuestions: stats.total,
						correctQuestions: stats.correct,
						userId: user.id,
						notesPerMinute: stats.npm,
					},
					{
						onSuccess: () => {
							showSuccess("Game results saved successfully!");
						},
						onError: () => {
							showError(
								"Failed to save game results. Your score was not recorded.",
							);
						},
					},
				);
			}
		},
		[isAuthenticated, user, showSuccess, showError, saveResult],
	);

	const endGameRef = useRef<() => void>();
	const gameStartRef = useRef<() => void>();

	const { timeRemaining, startTimer, formatTime } = useGameTimer(() => {
		endGameRef.current?.();
	});

	const {
		gameState,
		currentNote,
		answers,
		gameStats,
		settings,
		updateSettings,
		handleAnswer,
		endGame,
		resetGame,
		syncCurrentNote,
	} = useNoteGame({
		onGameEnd: handleGameEnd,
		onGameStart: () => gameStartRef.current?.(),
	});

	useEffect(() => {
		endGameRef.current = endGame;
	}, [endGame]);

	useEffect(() => {
		gameStartRef.current = () => {
			if (settings.gameMode === GameMode.Time) {
				startTimer(settings.timeLimit);
			}
			if (isAuthenticated) {
				saveSettings.mutate({
					game_mode: settings.gameMode,
					time_limit: settings.timeLimit,
					note_limit: settings.noteLimit,
					scale: settings.scale,
					octave: settings.octave,
				});
			}
		};
	}, [settings, startTimer, isAuthenticated, saveSettings]);

	useEffect(() => {
		if (savedSettings) {
			updateSettings({
				gameMode: savedSettings.game_mode as GameMode,
				timeLimit: savedSettings.time_limit,
				noteLimit: savedSettings.note_limit,
				scale: savedSettings.scale,
				octave: savedSettings.octave,
			});
		}
	}, [savedSettings, updateSettings]);

	return (
		<div className="h-[calc(100vh-4rem)] flex flex-col py-4 px-4">
			<div className="container mx-auto max-w-6xl flex flex-col flex-1 min-h-0">
				{gameState === GameState.GameOver && gameStats ? (
					<GameResults
						gameStats={gameStats}
						pastGames={pastGames}
						isAuthenticated={isAuthenticated}
						onPlayAgain={resetGame}
					/>
				) : (
					<div className="flex flex-col flex-1 min-h-0 gap-4">
						<div className="flex-shrink-0">
							{gameState === GameState.Playing ? (
								<ScoreBar
									answers={answers}
									timeRemaining={timeRemaining}
									noteLimit={settings.noteLimit}
									gameMode={settings.gameMode}
									formatTime={formatTime}
								/>
							) : (
								<SettingsBar
									settings={settings}
									onSettingsChange={updateSettings}
								/>
							)}
						</div>
						<GameBoard
							currentNote={currentNote}
							answers={answers}
							onAnswer={handleAnswer}
							onNoteGenerated={syncCurrentNote}
							scale={settings.scale}
							octave={settings.octave}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
