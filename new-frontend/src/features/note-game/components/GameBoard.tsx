import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { NoteAnswer } from "../types";
import { NOTES } from "../types";

export interface GameBoardProps {
	currentNote: string;
	answers: NoteAnswer[];
	timeRemaining?: number;
	noteLimit?: number;
	gameMode: "time" | "notes";
	onAnswer: (answer: string) => void;
	formatTime?: (seconds: number) => string;
}

/**
 * Game board component for active gameplay
 * Displays score, current note, and answer buttons
 */
export function GameBoard({
	currentNote,
	answers,
	timeRemaining,
	noteLimit,
	gameMode,
	onAnswer,
	formatTime,
}: GameBoardProps) {
	const correctAnswers = answers.filter((a) => a.correct).length;
	const accuracy =
		answers.length > 0
			? Math.round((correctAnswers / answers.length) * 100)
			: 0;

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
			<Card className="p-12 min-h-[300px] flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
				<div className="text-center space-y-4">
					<div className="text-sm text-muted-foreground">
						Identify this note:
					</div>
					<div className="text-9xl font-bold text-primary animate-fade-in">
						{currentNote}
					</div>
				</div>
			</Card>

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
