import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { useNoteGameDisplay } from "@/features/note-game-display";
import { useNoteQueue } from "../hooks";
import type { NoteAnswer } from "../types";
import { GameMode, NOTES } from "../types";
import { ComponentErrorBoundary } from "@/shared/components/ComponentErrorBoundary";
import { GameBoardFallback } from "@/shared/components/fallbacks";
import { logger } from "@/lib/logger";

export interface GameBoardProps {
	currentNote: string;
	answers: NoteAnswer[];
	timeRemaining?: number;
	noteLimit?: number;
	gameMode: GameMode;
	onAnswer: (answer: string) => void;
	onNoteGenerated: (noteName: string) => void;
	formatTime?: (seconds: number) => string;
	scale: string;
	octave: number;
	isReady?: boolean;
}

const extractTonic = (scaleStr: string): string => {
	return scaleStr.split(" ")[0] ?? "C";
};

/**
 * Game board component for active gameplay (Internal)
 * Displays score, current note (as sheet music), and answer buttons
 */
const GameBoardInternal = ({
	currentNote,
	answers,
	timeRemaining,
	noteLimit,
	gameMode,
	onAnswer,
	onNoteGenerated,
	formatTime,
	scale,
	octave,
	isReady: isGameReady,
}: GameBoardProps) => {
	const {
		containerRef,
		loadNote,
		isReady: isDisplayReady,
	} = useNoteGameDisplay({
		darkMode: true,
		zoom: 2.0,
	});

	const { pop, isInitializing } = useNoteQueue(
		extractTonic(scale),
		octave.toString(),
		isDisplayReady,
	);

	const [loadError, setLoadError] = useState(false);

	const correctAnswers = answers.filter((a) => a.correct).length;
	const accuracy =
		answers.length > 0
			? Math.round((correctAnswers / answers.length) * 100)
			: 0;

	useEffect(() => {
		if (!isDisplayReady || isInitializing) return;

		let cancelled = false;

		const loadNext = async () => {
			const note = pop();
			if (!note) {
				logger.warn("useNoteQueue: pop() returned null — queue was empty");
				return;
			}

			try {
				await loadNote(note.generatedXml);
				if (!cancelled) {
					setLoadError(false);
					onNoteGenerated(note.noteName);
				}
			} catch (err) {
				if (!cancelled) {
					logger.error("Failed to render note in OSMD", err);
					setLoadError(true);
					onNoteGenerated(note.noteName);
				}
			}
		};

		void loadNext();

		return () => {
			cancelled = true;
		};
	}, [
		answers.length,
		isDisplayReady,
		isInitializing,
		pop,
		loadNote,
		onNoteGenerated,
	]);

	const getTimerDisplay = () => {
		if (gameMode === GameMode.Time && timeRemaining !== undefined) {
			return formatTime ? formatTime(timeRemaining) : `${timeRemaining}s`;
		}
		if (gameMode === GameMode.Notes && noteLimit !== undefined) {
			return `${answers.length}/${noteLimit}`;
		}
		return "";
	};

	return (
		<div className="space-y-6">
			{/* Score Bar */}
			<div className="flex justify-between items-center bg-card border-2 border-border p-4 rounded-lg">
				<div className="text-lg font-medium">
					Score: {correctAnswers}/{answers.length}
				</div>
				<div className="text-lg font-bold">{getTimerDisplay()}</div>
				<div className="text-lg font-medium">Accuracy: {accuracy}%</div>
			</div>

			{/* Note Display */}
			<div className="space-y-2">
				<div className="text-center text-sm text-muted-foreground">
					Identify this note:
				</div>
				{loadError ? (
					<Card className="p-12 min-h-[18.75rem] flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
						<div className="text-center space-y-4">
							<div className="text-destructive font-medium">
								Failed to load sheet music
							</div>
							<div className="text-sm text-muted-foreground">
								Falling back to text display
							</div>
							<div className="text-9xl font-bold text-primary animate-fade-in">
								{currentNote}
							</div>
						</div>
					</Card>
				) : (
					<Card className="relative flex items-center justify-center overflow-hidden">
						{isInitializing && (
							<div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
								<div className="text-center text-muted-foreground">
									Loading sheet music...
								</div>
							</div>
						)}
						<div
							ref={containerRef}
							className="w-full aspect-[2/1] overflow-hidden"
						/>
					</Card>
				)}
			</div>

			{isGameReady && (
				<div className="text-center text-sm text-muted-foreground animate-pulse">
					Press a key or click a note to begin
				</div>
			)}

			{/* Answer Buttons */}
			<Card className="p-4">
				<div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
					{/* Sharps */}
					{NOTES.map((note) => (
						<Button
							key={`${note}#`}
							variant="outline"
							onClick={() => onAnswer(`${note}#`)}
							className="h-12 sm:h-16 text-base sm:text-lg font-bold"
						>
							{note}#
						</Button>
					))}
					{/* Naturals */}
					{NOTES.map((note) => (
						<Button
							key={note}
							variant="default"
							onClick={() => onAnswer(note)}
							className="h-12 sm:h-16 text-base sm:text-lg font-bold"
						>
							{note}
						</Button>
					))}
					{/* Flats */}
					{NOTES.map((note) => (
						<Button
							key={`${note}b`}
							variant="outline"
							onClick={() => onAnswer(`${note}b`)}
							className="h-12 sm:h-16 text-base sm:text-lg font-bold"
						>
							{note}b
						</Button>
					))}
				</div>
			</Card>
		</div>
	);
};

/**
 * Game board component for active gameplay
 * Wrapped with error boundary for enhanced error handling
 */
export function GameBoard(props: GameBoardProps) {
	return (
		<ComponentErrorBoundary
			fallback={
				<GameBoardFallback
					onRestart={() => window.location.reload()}
					errorMessage="Game board encountered an error"
				/>
			}
			onError={(error) => {
				logger.error("GameBoard error boundary caught error", error);
			}}
		>
			<GameBoardInternal {...props} />
		</ComponentErrorBoundary>
	);
}
