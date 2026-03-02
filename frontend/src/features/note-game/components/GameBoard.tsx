import { useEffect, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { useNoteGameDisplay } from "@/features/note-game-display";
import { useGenerateNoteGame } from "@/shared/hooks/queries";
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
}

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
}: GameBoardProps) => {
	const generateNote = useGenerateNoteGame();
	const mutateRef = useRef(generateNote.mutate);
	useEffect(() => {
		mutateRef.current = generateNote.mutate;
	});

	const { containerRef, loadNote, isReady } = useNoteGameDisplay({
		darkMode: true,
		zoom: 2.0,
	});

	const correctAnswers = answers.filter((a) => a.correct).length;
	const accuracy =
		answers.length > 0
			? Math.round((correctAnswers / answers.length) * 100)
			: 0;

	const extractTonic = (scaleStr: string): string => {
		return scaleStr.split(" ")[0] ?? "C";
	};

	// Fetch a new note after each answer (or on initial mount).
	// We gate on isReady so no API call is made until the OSMD
	// container is mounted.
	useEffect(() => {
		if (!isReady) return;

		let cancelled = false;
		const tonic = extractTonic(scale);

		mutateRef.current(
			{ scale: tonic, octave: octave.toString() },
			{
				onSuccess: async (response) => {
					if (cancelled) return;
					await loadNote(response.generatedXml);
					if (!cancelled) onNoteGenerated(response.noteName);
				},
			},
		);

		return () => {
			cancelled = true;
		};
	}, [answers.length, scale, octave, isReady, loadNote, onNoteGenerated]);

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
				{generateNote.isError ? (
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
						{generateNote.isPending && (
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
