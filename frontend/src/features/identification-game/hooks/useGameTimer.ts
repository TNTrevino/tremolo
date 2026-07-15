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

	// The countdown lives in a ref and mirrors into state for rendering.
	// Expiry fires from the interval callback, never from a setState
	// updater — StrictMode double-invokes updaters in dev, which made a
	// side-effecting updater save duplicate game-end entries.
	const remainingRef = useRef(0);
	useEffect(() => {
		if (!isRunning) return undefined;

		const timer = setInterval(() => {
			remainingRef.current = Math.max(remainingRef.current - 1, 0);
			setTimeRemaining(remainingRef.current);
			if (remainingRef.current === 0) {
				setIsRunning(false);
				onTimerEndRef.current?.();
			}
		}, 1000);

		return () => clearInterval(timer);
	}, [isRunning]);

	const startTimer = useCallback((seconds: number) => {
		remainingRef.current = seconds;
		setTimeRemaining(seconds);
		setIsRunning(true);
	}, []);

	const stopTimer = useCallback(() => {
		setIsRunning(false);
	}, []);

	const resetTimer = useCallback(() => {
		remainingRef.current = 0;
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
