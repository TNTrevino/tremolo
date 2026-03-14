import type { NoteAnswer } from "../types";
import { GameMode } from "../types";

export interface ScoreBarProps {
	answers: NoteAnswer[];
	timeRemaining?: number;
	noteLimit?: number;
	gameMode: GameMode;
	formatTime?: (seconds: number) => string;
}

/**
 * Compact horizontal score bar that replaces SettingsBar during active gameplay.
 * Sized to match SettingsBar so the swap is seamless.
 */
export function ScoreBar({
	answers,
	timeRemaining,
	noteLimit,
	gameMode,
	formatTime,
}: ScoreBarProps) {
	const correctAnswers = answers.filter((a) => a.correct).length;
	const accuracy =
		answers.length > 0
			? Math.round((correctAnswers / answers.length) * 100)
			: 0;

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
		<div className="flex justify-between items-center bg-card border-2 border-border rounded-lg px-4 py-2 min-h-[3rem]">
			<div className="text-lg font-medium">
				Score: {correctAnswers}/{answers.length}
			</div>
			<div className="text-lg font-bold">{getTimerDisplay()}</div>
			<div className="text-lg font-medium">Accuracy: {accuracy}%</div>
		</div>
	);
}
