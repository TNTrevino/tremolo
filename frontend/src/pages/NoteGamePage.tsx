import { useState, useEffect, useMemo, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useBreakpoint } from "@/shared/hooks";
import {
	useNoteGameSettings,
	useSaveNoteGameSettings,
	useKeyboardBindings,
} from "@/shared/hooks/queries";
import {
	useSaveGameOnEnd,
	useGameLifecycle,
	ScoreBar,
} from "@/features/identification-game";
import { DEFAULT_NOTE_TO_KEY_MAP } from "@/features/note-game/hooks/useKeyboardInput";
import {
	useNoteGame,
	GameState,
	GameMode,
	type GameSettingsType,
} from "@/features/note-game";
import { keyBindingsToNoteMap } from "@/features/note-game/utils";
import {
	GameBoard,
	GameBoardLandscape,
} from "@/features/note-game/components/GameBoard";
import { GameResults } from "@/features/note-game/components/GameResults";
import { SettingsBar } from "@/features/note-game/components/SettingsBar";
import type { NoteGameSettingsRequest } from "@/services/api/types";

export interface NoteGamePageProps {
	/**
	 * When set, the note game runs in "assignment mode": settings are
	 * hydrated from the assignment's frozen config (snake_case
	 * NoteGameSettingsRequest) instead of the student's saved settings,
	 * the settings save-back is suppressed, and the finished attempt is
	 * tagged with the assignment id.
	 */
	assignment?: { id: number; config: Record<string, unknown> };
}

/**
 * Note Recognition Game Page
 * Main orchestrator for the note game feature - manages state flow between
 * ready, playing, and results screens
 */
export function NoteGamePage({ assignment }: NoteGamePageProps = {}) {
	const { isAuthenticated } = useAuthStore();
	const { isPhoneLandscape } = useBreakpoint();
	const [bindingsDialogOpen, setBindingsDialogOpen] = useState(false);
	const { handleGameEnd, saveError } = useSaveGameOnEnd("note", assignment?.id);
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

	const { timeRemaining, startTimer, formatTime, endGameRef } =
		useGameLifecycle();

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
		// The engine reads callbacks through a ref, so this closure sees
		// the latest settings when the first answer starts the game.
		onGameStart: () => {
			if (settings.gameMode === GameMode.Time) {
				startTimer(settings.timeLimit);
			}
			// In assignment mode, never persist back — playing an
			// assignment must not overwrite the student's own settings.
			if (isAuthenticated && !assignment) {
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
		},
		keyBindings,
		inputDisabled: bindingsDialogOpen,
	});

	useEffect(() => {
		endGameRef.current = endGame;
	}, [endGame, endGameRef]);

	// Hydrate settings from the assignment's frozen config (assignment
	// mode) or the student's saved settings (normal play). The note
	// config is snake_case (NoteGameSettingsRequest); map it to the
	// game's camelCase settings so it flows through the normal state.
	const appliedAssignmentRef = useRef(false);
	useEffect(() => {
		if (assignment) {
			if (appliedAssignmentRef.current) return;
			appliedAssignmentRef.current = true;
			const config = assignment.config as Partial<NoteGameSettingsRequest>;
			const patch: Partial<GameSettingsType> = {};
			if (config.game_mode !== undefined)
				patch.gameMode = config.game_mode as GameMode;
			if (config.time_limit !== undefined) patch.timeLimit = config.time_limit;
			if (config.note_limit !== undefined) patch.noteLimit = config.note_limit;
			if (config.scale !== undefined) patch.scale = config.scale;
			if (config.octave !== undefined) patch.octave = config.octave;
			if (config.low_note !== undefined) patch.lowNote = config.low_note;
			if (config.high_note !== undefined) patch.highNote = config.high_note;
			if (config.clef !== undefined) patch.clef = config.clef;
			updateSettings(patch);
			return;
		}
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
	}, [assignment, savedSettings, updateSettings]);

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
