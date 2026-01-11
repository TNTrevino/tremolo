import { useState, useCallback } from "react";
import { GameMode } from "./useGameTimer";

/**
 * Manages game configuration settings
 * COLD state - rarely updates (only when user changes settings)
 * Each setting is independent to avoid cascade re-renders
 */
export function useGameSettings() {
	const [gameMode, setGameModeState] = useState<GameMode>("time");
	const [timeLimit, setTimeLimitState] = useState(30);
	const [noteLimit, setNoteLimitState] = useState(25);
	const [scaleChoice, setScaleChoiceState] = useState("C");
	const [octaveChoice, setOctaveChoiceState] = useState("4");

	// Memoized setters to prevent unnecessary re-renders
	const setGameMode = useCallback((mode: GameMode) => {
		setGameModeState(mode);
	}, []);

	const setTimeLimit = useCallback((limit: number) => {
		setTimeLimitState(limit);
	}, []);

	const setNoteLimit = useCallback((limit: number) => {
		setNoteLimitState(limit);
	}, []);

	const setScale = useCallback((scale: string) => {
		setScaleChoiceState(scale);
	}, []);

	const setOctave = useCallback((octave: string) => {
		setOctaveChoiceState(octave);
	}, []);

	return {
		gameMode,
		timeLimit,
		noteLimit,
		scaleChoice,
		octaveChoice,
		setGameMode,
		setTimeLimit,
		setNoteLimit,
		setScale,
		setOctave,
	};
}
