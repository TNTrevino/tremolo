import { useState, useRef, useCallback, useEffect, useMemo } from "react";

export type GameMode = "time" | "notes";

/**
 * High-performance game timer with minimal re-renders
 * - Only re-renders when the displayed second value changes
 * - Uses Date.now() for accuracy (no drift)
 * - Eliminates flash on start by calculating everything from refs
 */
export function useGameTimer(
	gameMode: GameMode,
	timeLimit: number,
	isActive: boolean,
) {
	// Minimal state - only triggers re-render when displayed time changes
	const [tick, setTick] = useState(0);
	const startTimeRef = useRef<number>(0);
	const intervalRef = useRef<number | null>(null);

	const start = useCallback(() => {
		const now = Math.floor(Date.now() / 1000);
		startTimeRef.current = now;
		// Force immediate re-render with correct values
		setTick((prev) => prev + 1);
	}, []);

	const reset = useCallback(() => {
		startTimeRef.current = 0;
		setTick(0);
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	// Timer effect - only re-renders when displayed second changes
	useEffect(() => {
		if (!isActive || startTimeRef.current === 0) {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			return;
		}

		// Clear any existing interval
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		// Calculate initial state
		let lastSecond = Math.floor(Date.now() / 1000) - startTimeRef.current;

		// Check every 100ms for second changes (more responsive than 1000ms)
		intervalRef.current = setInterval(() => {
			const currentSecond =
				Math.floor(Date.now() / 1000) - startTimeRef.current;

			// Only trigger re-render if the second actually changed
			if (currentSecond !== lastSecond) {
				lastSecond = currentSecond;
				setTick((prev) => prev + 1);
			}
		}, 100);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [isActive]);

	// All calculations derived from Date.now() and refs - always accurate
	// Note: 'tick' dependency is intentional in all useMemo hooks below
	// It triggers re-calculation only when the displayed second changes
	/* eslint-disable react-hooks/exhaustive-deps */
	const currentTime = useMemo(() => {
		return Math.floor(Date.now() / 1000);
	}, [tick]);

	const elapsedTime = useMemo(() => {
		if (startTimeRef.current === 0) return 0;
		return Math.floor(Date.now() / 1000) - startTimeRef.current;
	}, [tick]);

	const timeRemaining = useMemo(() => {
		if (gameMode !== "time" || startTimeRef.current === 0) {
			return 0;
		}
		const elapsed = Math.floor(Date.now() / 1000) - startTimeRef.current;
		return Math.max(0, timeLimit - elapsed);
	}, [gameMode, timeLimit, tick]);
	/* eslint-enable react-hooks/exhaustive-deps */

	return {
		currentTime,
		startTime: startTimeRef.current,
		elapsedTime,
		timeRemaining,
		start,
		reset,
	};
}
