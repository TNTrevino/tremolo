import { useEffect, useMemo, useRef, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { Select } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/shared/components/ui/dialog";
import { useAuthStore } from "@/stores/auth.store";
import { useGameSettings, useSaveGameSettings } from "@/shared/hooks/queries";
import { useGameTimer } from "../hooks/useGameTimer";
import { useIdentificationGame } from "../hooks/useIdentificationGame";
import { useSaveGameOnEnd } from "../hooks/useSaveGameOnEnd";
import { QuestionBoard } from "./QuestionBoard";
import { ScoreBar } from "./ScoreBar";
import { GameOverCard } from "./GameOverCard";
import { AnswerPad } from "./AnswerPad";
import { SettingsControls } from "../settings/SettingsControls";
import { sanitizeConfig } from "../settings/sanitizeConfig";
import type { GameDefinition } from "../games/types";
import type { BaseGameSettings, GeneratedQuestion } from "../types";
import { GameState, GameMode, TIME_LIMITS, NOTE_LIMITS } from "../types";

export interface IdentificationGamePageProps<
	T extends GeneratedQuestion,
	S extends BaseGameSettings,
	Req,
> {
	definition: GameDefinition<T, S, Req>;
}

/**
 * Page shell shared by every identification game. Everything
 * game-specific comes from the GameDefinition: settings schema and
 * persistence, question fetching, answer checking, and the answer pad.
 * Mirrors NoteGamePage's flow: settings bar + live board, game starts
 * on the first answer, ScoreBar during play, results at the end.
 */
export function IdentificationGamePage<
	T extends GeneratedQuestion,
	S extends BaseGameSettings,
	Req,
>({ definition }: IdentificationGamePageProps<T, S, Req>) {
	const {
		gameType,
		title,
		description,
		defaults,
		settingsSchema,
		toRequest,
		fetchQuestion,
		getAnswer,
		answerOptions,
		columnsClassName = "grid-cols-2",
		zoom,
		prompt,
	} = definition;

	const { isAuthenticated } = useAuthStore();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const { data: savedSettings } = useGameSettings(gameType);
	const saveSettings = useSaveGameSettings();
	const saveSettingsMutate = saveSettings.mutate;
	const { handleGameEnd } = useSaveGameOnEnd(gameType);

	const endGameRef = useRef<() => void>();
	const gameStartRef = useRef<() => void>();

	const { timeRemaining, startTimer, formatTime } = useGameTimer(() => {
		endGameRef.current?.();
	});

	const {
		gameState,
		currentAnswer,
		answers,
		gameStats,
		settings,
		updateSettings,
		handleAnswer,
		endGame,
		resetGame,
		syncCurrentAnswer,
	} = useIdentificationGame<S>({
		defaultSettings: defaults,
		onGameEnd: handleGameEnd,
		onGameStart: () => gameStartRef.current?.(),
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
				// Persist exactly the fields the game owns (defaults keys),
				// so stray state never leaks into the saved config.
				const config = Object.fromEntries(
					Object.keys(defaults).map((key) => [key, settings[key as keyof S]]),
				);
				saveSettingsMutate({ game_type: gameType, config });
			}
		};
	}, [
		settings,
		startTimer,
		isAuthenticated,
		gameType,
		defaults,
		saveSettingsMutate,
	]);

	// Apply saved settings once, validated against the schema so stale
	// or renamed fields fall back to defaults instead of breaking the
	// fetcher.
	const appliedSavedRef = useRef(false);
	useEffect(() => {
		if (savedSettings?.config && !appliedSavedRef.current) {
			appliedSavedRef.current = true;
			updateSettings(sanitizeConfig<S>(settingsSchema, savedSettings.config));
		}
	}, [savedSettings, updateSettings, settingsSchema]);

	// The queue keys on the serialized request payload, so it only
	// resets when a setting that actually changes the payload changes.
	const request = toRequest(settings);
	const fetchKey = JSON.stringify(request);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const fetcher = useMemo(() => () => fetchQuestion(request), [fetchKey]);

	// Keep getAnswer's identity stable across settings changes so the
	// board's load effect doesn't burn a prefetched question per click;
	// it reads the latest settings when a question actually loads.
	const settingsRef = useRef(settings);
	useEffect(() => {
		settingsRef.current = settings;
	}, [settings]);
	const boundGetAnswer = useMemo(
		() => (question: T) => getAnswer(question, settingsRef.current),
		[getAnswer],
	);

	const isPlaying = gameState === GameState.Playing;
	const isConfigurable = gameState === GameState.Ready;

	// Settings live in a dialog so the staff gets the page. Changes
	// apply immediately; "Done" just closes.
	const settingsDialog = (
		<Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
			<DialogContent onOpenChange={setSettingsOpen} className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
					<p className="text-sm text-muted-foreground">{description}</p>
				</DialogHeader>
				<div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
					<div className="space-y-1">
						<label htmlFor="game-mode" className="text-xs font-medium">
							Mode
						</label>
						<div className="flex gap-1.5" id="game-mode" role="group">
							<Button
								size="sm"
								variant={
									settings.gameMode === GameMode.Time ? "default" : "outline"
								}
								onClick={() =>
									updateSettings({ gameMode: GameMode.Time } as Partial<S>)
								}
							>
								Time
							</Button>
							<Button
								size="sm"
								variant={
									settings.gameMode === GameMode.Notes ? "default" : "outline"
								}
								onClick={() =>
									updateSettings({ gameMode: GameMode.Notes } as Partial<S>)
								}
							>
								Questions
							</Button>
						</div>
					</div>

					<div className="space-y-1">
						<label htmlFor="limit-selector" className="text-xs font-medium">
							{settings.gameMode === GameMode.Time ? "Time Limit" : "Questions"}
						</label>
						{settings.gameMode === GameMode.Time ? (
							<Select
								id="limit-selector"
								value={settings.timeLimit.toString()}
								onChange={(e) =>
									updateSettings({
										timeLimit: Number(e.target.value),
									} as Partial<S>)
								}
							>
								{TIME_LIMITS.map((limit) => (
									<option key={limit} value={limit}>
										{limit >= 60
											? `${limit / 60} minute${limit > 60 ? "s" : ""}`
											: `${limit} seconds`}
									</option>
								))}
							</Select>
						) : (
							<Select
								id="limit-selector"
								value={settings.noteLimit.toString()}
								onChange={(e) =>
									updateSettings({
										noteLimit: Number(e.target.value),
									} as Partial<S>)
								}
							>
								{NOTE_LIMITS.map((limit) => (
									<option key={limit} value={limit}>
										{limit} questions
									</option>
								))}
							</Select>
						)}
					</div>

					<SettingsControls<S>
						schema={settingsSchema}
						settings={settings}
						onChange={updateSettings}
					/>
				</div>
				<DialogFooter>
					<Button onClick={() => setSettingsOpen(false)}>Done</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);

	// Rebuilt only when the answer surface actually changes — not on
	// every timer tick.
	const answerPad = useMemo(
		() => (
			<div className="flex-shrink-0 space-y-2">
				{prompt?.(settings)}
				<AnswerPad
					options={answerOptions(settings)}
					onAnswer={handleAnswer}
					columnsClassName={columnsClassName}
				/>
			</div>
		),
		[prompt, settings, answerOptions, handleAnswer, columnsClassName],
	);

	const statusBar = isPlaying ? (
		<ScoreBar
			answers={answers}
			timeRemaining={timeRemaining}
			noteLimit={settings.noteLimit}
			gameMode={settings.gameMode}
			formatTime={formatTime}
		/>
	) : (
		<div className="flex items-center justify-between gap-2">
			<h1 className="text-lg sm:text-xl font-bold">{title}</h1>
			<Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
				<SettingsIcon className="mr-1.5 h-4 w-4" />
				Settings
			</Button>
		</div>
	);

	return (
		<div className="h-[calc(100vh-4rem)] flex flex-col py-2 px-2 sm:py-4 sm:px-4">
			<div className="container mx-auto max-w-6xl flex flex-col flex-1 min-h-0">
				{gameState === GameState.GameOver && gameStats ? (
					<GameOverCard gameStats={gameStats} onPlayAgain={resetGame} />
				) : (
					<div className="flex flex-col flex-1 min-h-0 gap-2 sm:gap-4">
						<div className="flex-shrink-0">{statusBar}</div>
						{isConfigurable && settingsDialog}
						<QuestionBoard<T>
							answers={answers}
							fetcher={fetcher}
							getAnswer={boundGetAnswer}
							onQuestionLoaded={syncCurrentAnswer}
							currentAnswerLabel={currentAnswer}
							zoom={zoom}
							answerPad={answerPad}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
