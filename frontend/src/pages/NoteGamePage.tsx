import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/shared/hooks/useToast";
import { useSaveGameResult } from "@/shared/hooks/queries";
import { userService } from "@/services/api";
import type { GameStats } from "@/shared/types";
import {
	useNoteGame,
	useGameTimer,
	GameState,
	GameMode,
} from "@/features/note-game";
import GameBoard from "@/features/note-game/components/GameBoard";
import GameResults from "@/features/note-game/components/GameResults";
import GameSettings from "@/features/note-game/components/GameSettings";

export interface NoteGamePageProps {}

/**
 * Note Recognition Game Page
 * Main orchestrator for the note game feature - manages state flow between
 * settings, playing, and results screens
 */
export function NoteGamePage() {
	const { isAuthenticated, user } = useAuthStore();
	const { showSuccess, showError } = useToast();
	const [pastGames, setPastGames] = useState<GameStats[]>([]);
	const saveResult = useSaveGameResult();

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
						time_length: userService.formatTimeLength(timeInSeconds),
						total_questions: stats.total,
						correct_questions: stats.correct,
						user_id: user.id,
						notes_per_minute: stats.npm,
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

	const {
		gameState,
		currentNote,
		answers,
		gameStats,
		settings,
		updateSettings,
		startGame: handleStartGame,
		handleAnswer,
		endGame,
		resetGame,
		syncCurrentNote,
	} = useNoteGame({ onGameEnd: handleGameEnd });

	const { timeRemaining, startTimer, formatTime } = useGameTimer(() => {
		endGame();
	});

	const startGame = () => {
		handleStartGame();
		if (settings.gameMode === GameMode.Time) {
			startTimer(settings.timeLimit);
		}
	};

	return (
		<div className="min-h-screen py-8 px-4">
			<div className="container mx-auto max-w-6xl">
				{gameState === GameState.Settings && (
					<GameSettings
						settings={settings}
						onSettingsChange={updateSettings}
						onStartGame={startGame}
					/>
				)}

				{gameState === GameState.Playing && (
					<GameBoard
						currentNote={currentNote}
						answers={answers}
						timeRemaining={timeRemaining}
						noteLimit={settings.noteLimit}
						gameMode={settings.gameMode}
						onAnswer={handleAnswer}
						onNoteGenerated={syncCurrentNote}
						formatTime={formatTime}
						scale={settings.scale}
						octave={settings.octave}
					/>
				)}

				{gameState === GameState.GameOver && gameStats && (
					<GameResults
						gameStats={gameStats}
						pastGames={pastGames}
						isAuthenticated={isAuthenticated}
						onPlayAgain={resetGame}
					/>
				)}
			</div>
		</div>
	);
}
