import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { GameStats } from "@/shared/types";
import {
	useNoteGame,
	useGameTimer,
	GameSettings as GameSettingsComponent,
	GameBoard,
	GameResults,
} from "@/features/note-game";

export interface NoteGamePageProps {}

/**
 * Note Recognition Game Page
 * Main orchestrator for the note game feature - manages state flow between
 * settings, playing, and results screens
 */
export function NoteGamePage() {
	const { isAuthenticated } = useAuth();
	const [pastGames, setPastGames] = useState<GameStats[]>([]);

	// Handle game end - save stats for authenticated users
	const handleGameEnd = useCallback(
		(stats: GameStats) => {
			if (isAuthenticated) {
				setPastGames((prev) => [...prev.slice(-9), stats]);
			}
		},
		[isAuthenticated],
	);

	// Game logic hook
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
	} = useNoteGame({ onGameEnd: handleGameEnd });

	// Timer hook (for time mode)
	const { timeRemaining, startTimer, formatTime } = useGameTimer(() => {
		endGame();
	});

	// Start game and timer
	const startGame = () => {
		handleStartGame();
		if (settings.gameMode === "time") {
			startTimer(settings.timeLimit);
		}
	};

	return (
		<div className="min-h-screen py-8 px-4">
			<div className="container mx-auto max-w-6xl">
				{gameState === "settings" && (
					<GameSettingsComponent
						settings={settings}
						onSettingsChange={updateSettings}
						onStartGame={startGame}
					/>
				)}

				{gameState === "playing" && (
					<GameBoard
						currentNote={currentNote}
						answers={answers}
						timeRemaining={timeRemaining}
						noteLimit={settings.noteLimit}
						gameMode={settings.gameMode}
						onAnswer={handleAnswer}
						formatTime={formatTime}
						scale={settings.scale}
						octave={settings.octave}
					/>
				)}

				{gameState === "gameover" && gameStats && (
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
