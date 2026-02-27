import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SheetMusicDisplay } from "@/features/sheet-music/components";
import { musicService } from "@/services/api";
import type { NoteAnswer } from "../types";
import { NOTES } from "../types";
import { ComponentErrorBoundary } from "@/shared/components/ComponentErrorBoundary";
import { GameBoardFallback } from "@/shared/components/fallbacks";
import { logError } from "@/shared/utils/error.utils";

export interface GameBoardProps {
	currentNote: string;
	answers: NoteAnswer[];
	timeRemaining?: number;
	noteLimit?: number;
	gameMode: "time" | "notes";
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
function GameBoardInternal({
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
}: GameBoardProps) {
	const [generatedXml, setGeneratedXml] = useState<string>("");
	const [isLoadingMusic, setIsLoadingMusic] = useState(false);
	const [musicError, setMusicError] = useState<string | null>(null);

	const correctAnswers = answers.filter((a) => a.correct).length;
	const accuracy =
		answers.length > 0
			? Math.round((correctAnswers / answers.length) * 100)
			: 0;

	// Extract tonic from scale (e.g., "C Major" -> "C")
	const extractTonic = (scaleStr: string): string => {
		return scaleStr.split(" ")[0] ?? "C";
	};

	// Fetch a new note from the backend after each answer (or on initial mount).
	// answers.length changes after every answer, which is the real trigger for
	// needing the next note. scale/octave are included so a settings change
	// also refetches.
	useEffect(() => {
		const generateMusic = async () => {
			setIsLoadingMusic(true);
			setMusicError(null);

			try {
				const tonic = extractTonic(scale);
				const response = await musicService.generateNoteGame({
					scale: tonic,
					octave: octave.toString(),
				});
				setGeneratedXml(response.generatedXml);
				onNoteGenerated(response.noteName);
			} catch (error) {
				logError(error, "GameBoard.generateMusic");
				setMusicError("Failed to load sheet music");
			} finally {
				setIsLoadingMusic(false);
			}
		};

		generateMusic();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [answers.length, scale, octave]);

	const getTimerDisplay = () => {
		if (gameMode === "time" && timeRemaining !== undefined) {
			return formatTime ? formatTime(timeRemaining) : `${timeRemaining}s`;
		}
		if (gameMode === "notes" && noteLimit !== undefined) {
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
				{/* TODO: we should extract this out into an errors module  */}
				{musicError ? (
					<Card className="p-12 min-h-[300px] flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
						<div className="text-center space-y-4">
							<div className="text-destructive font-medium">{musicError}</div>
							<div className="text-sm text-muted-foreground">
								Falling back to text display
							</div>
							<div className="text-9xl font-bold text-primary animate-fade-in">
								{currentNote}
							</div>
						</div>
					</Card>
				) : (
					<>
						{isLoadingMusic && (
							<Card className="p-12 min-h-[300px] flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
								<div className="text-center text-muted-foreground">
									Loading sheet music...
								</div>
							</Card>
						)}
						<SheetMusicDisplay
							musicXml={generatedXml}
							className={isLoadingMusic ? "hidden" : ""}
						/>
					</>
				)}
			</div>

			{/* Answer Buttons */}
			<Card className="p-4">
				<div className="grid grid-cols-7 gap-2">
					{/* Sharps */}
					{NOTES.map((note) => (
						<Button
							key={`${note}#`}
							variant="outline"
							onClick={() => onAnswer(`${note}#`)}
							className="h-16 text-lg font-bold"
						>
							{note}♯
						</Button>
					))}
					{/* Naturals */}
					{NOTES.map((note) => (
						<Button
							key={note}
							variant="default"
							onClick={() => onAnswer(note)}
							className="h-16 text-lg font-bold"
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
							className="h-16 text-lg font-bold"
						>
							{note}♭
						</Button>
					))}
				</div>
			</Card>
		</div>
	);
}

/**
 * Game board component for active gameplay
 * Displays score, current note (as sheet music), and answer buttons
 * Wrapped with error boundary for enhanced error handling
 *
 * @example
 * ```tsx
 * <GameBoard
 *   currentNote="C"
 *   answers={[]}
 *   gameMode="time"
 *   onAnswer={(answer) => handleAnswer(answer)}
 *   scale="C Major"
 *   octave={4}
 * />
 * ```
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
				logError(error, "GameBoard.errorBoundary");
			}}
		>
			<GameBoardInternal {...props} />
		</ComponentErrorBoundary>
	);
}
