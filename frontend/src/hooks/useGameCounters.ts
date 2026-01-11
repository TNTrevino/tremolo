import { useState, useCallback, useMemo } from "react";

/**
 * Manages score counters (total answers and correct answers)
 * HOT state - updates on every answer
 */
export function useGameCounters() {
	const [totalCounter, setTotalCounter] = useState(0);
	const [correctCounter, setCorrectCounter] = useState(0);

	const increment = useCallback((isCorrect: boolean) => {
		setTotalCounter((prev) => prev + 1);
		if (isCorrect) {
			setCorrectCounter((prev) => prev + 1);
		}
	}, []);

	const reset = useCallback(() => {
		setTotalCounter(0);
		setCorrectCounter(0);
	}, []);

	// Memoized accuracy calculation - only recalculates when counters change
	const accuracy = useMemo(() => {
		return totalCounter > 0
			? Math.round((correctCounter / totalCounter) * 100)
			: 0;
	}, [totalCounter, correctCounter]);

	// Memoized NPM calculation
	const calculateNotesPerMinute = useCallback(
		(elapsedSeconds: number): number => {
			return elapsedSeconds > 0
				? Math.round((totalCounter / elapsedSeconds) * 60)
				: 0;
		},
		[totalCounter],
	);

	return {
		totalCounter,
		correctCounter,
		accuracy,
		increment,
		reset,
		calculateNotesPerMinute,
	};
}
