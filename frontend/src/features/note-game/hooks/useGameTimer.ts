import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for managing game timer in time mode
 * Handles countdown timer and auto-end game when timer expires
 */
export function useGameTimer(onTimerEnd?: () => void) {
	const [timeRemaining, setTimeRemaining] = useState(0);
	const [isRunning, setIsRunning] = useState(false);

	const onTimerEndRef = useRef(onTimerEnd);
	useEffect(() => {
		onTimerEndRef.current = onTimerEnd;
	}, [onTimerEnd]);

	// Timer countdown effect
	useEffect(() => {
		if (!isRunning) return undefined;

		const timer = setInterval(() => {
			setTimeRemaining((prev) => {
				if (prev <= 1) {
					setIsRunning(false);
					onTimerEndRef.current?.();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [isRunning]);

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
