import { useState, useCallback } from "react";

/**
 * Manages game status flags (started/over)
 * MEDIUM frequency updates - only changes at game start/end
 */
export function useGameStatus() {
	const [gameStarted, setGameStarted] = useState(false);
	const [gameOver, setGameOver] = useState(false);

	const startGame = useCallback(() => {
		setGameStarted(true);
	}, []);

	const endGame = useCallback(() => {
		setGameOver(true);
	}, []);

	const reset = useCallback(() => {
		setGameStarted(false);
		setGameOver(false);
	}, []);

	return {
		gameStarted,
		gameOver,
		startGame,
		endGame,
		reset,
	};
}
