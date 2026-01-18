import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for managing game timer in time mode
 * Handles countdown timer and auto-end game when timer expires
 */
export function useGameTimer(onTimerEnd?: () => void) {
	const [timeRemaining, setTimeRemaining] = useState(0);
	const [isRunning, setIsRunning] = useState(false);

	// Timer countdown effect
	useEffect(() => {
		if (isRunning && timeRemaining > 0) {
			const timer = setInterval(() => {
				setTimeRemaining((prev) => {
					if (prev <= 1) {
						setIsRunning(false);
						if (onTimerEnd) {
							onTimerEnd();
						}
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
		return undefined;
	}, [isRunning, timeRemaining, onTimerEnd]);

	const startTimer = useCallback((seconds: number) => {
		setTimeRemaining(seconds);
		setIsRunning(true);
	}, []);

	const stopTimer = useCallback(() => {
		setIsRunning(false);
	}, []);

	const resetTimer = useCallback(() => {
		setTimeRemaining(0);
		setIsRunning(false);
	}, []);

	const formatTime = useCallback((seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}, []);

	return {
		timeRemaining,
		isRunning,
		startTimer,
		stopTimer,
		resetTimer,
		formatTime,
	};
}
