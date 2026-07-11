import { useState, useEffect, useRef, useMemo } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useBreakpoint } from "@/shared/hooks";
import {
	useNoteGameSettings,
	useSaveNoteGameSettings,
	useKeyboardBindings,
} from "@/shared/hooks/queries";
import { useSaveGameOnEnd } from "@/features/identification-game";
import { DEFAULT_NOTE_TO_KEY_MAP } from "@/features/note-game/hooks/useKeyboardInput";
import {
	useNoteGame,
	useGameTimer,
	GameState,
	GameMode,
} from "@/features/note-game";
import { keyBindingsToNoteMap } from "@/features/note-game/utils";
import {
	GameBoard,
	GameBoardLandscape,
} from "@/features/note-game/components/GameBoard";
import { GameResults } from "@/features/note-game/components/GameResults";
import { ScoreBar } from "@/features/note-game/components/ScoreBar";
import { SettingsBar } from "@/features/note-game/components/SettingsBar";

/**
 * Note Recognition Game Page
 * Main orchestrator for the note game feature - manages state flow between
 * ready, playing, and results screens
 */
export function NoteGamePage() {
	const { isAuthenticated } = useAuthStore();
	const { isPhoneLandscape } = useBreakpoint();
	const [bindingsDialogOpen, setBindingsDialogOpen] = useState(false);
	const { handleGameEnd, saveError } = useSaveGameOnEnd("note");
	const { data: savedSettings } = useNoteGameSettings();
	const saveSettings = useSaveNoteGameSettings();
	const { data: savedKeyboardBindings } = useKeyboardBindings();

	const keyBindings = useMemo(
		() =>
			savedKeyboardBindings
				? keyBindingsToNoteMap(savedKeyboardBindings.key_bindings)
				: undefined,
		[savedKeyboardBindings],
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
		keyBindings,
		inputDisabled: bindingsDialogOpen,
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
					low_note: settings.lowNote,
					high_note: settings.highNote,
					clef: settings.clef,
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
				lowNote: savedSettings.low_note,
				highNote: savedSettings.high_note,
				clef: savedSettings.clef,
			});
		}
	}, [savedSettings, updateSettings]);

	const statusBar =
		gameState === GameState.Playing ? (
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
				onDialogOpenChange={setBindingsDialogOpen}
			/>
		);

	const gameBoardProps = {
		currentNote,
		answers,
		onAnswer: handleAnswer,
		onNoteGenerated: syncCurrentNote,
		scale: settings.scale,
		octave: settings.octave,
		range: {
			lowNote: settings.lowNote,
			highNote: settings.highNote,
			clef: settings.clef,
		},
		keyBindings: keyBindings ?? DEFAULT_NOTE_TO_KEY_MAP,
	};

	const landscapeLayout = (
		<GameBoardLandscape {...gameBoardProps} statusBar={statusBar} />
	);

	const portraitLayout = (
		<div className="flex flex-col flex-1 min-h-0 gap-2 sm:gap-4">
			<div className="flex-shrink-0">{statusBar}</div>
			<GameBoard {...gameBoardProps} />
		</div>
	);

	return (
		<div className="h-[calc(100vh-4rem)] flex flex-col py-2 px-2 sm:py-4 sm:px-4">
			<div className="container mx-auto max-w-6xl flex flex-col flex-1 min-h-0">
				{gameState === GameState.GameOver && gameStats ? (
					<GameResults
						gameStats={gameStats}
						isAuthenticated={isAuthenticated}
						onPlayAgain={resetGame}
						saveError={saveError}
					/>
				) : isPhoneLandscape ? (
					landscapeLayout
				) : (
					portraitLayout
				)}
			</div>
		</div>
	);
}
