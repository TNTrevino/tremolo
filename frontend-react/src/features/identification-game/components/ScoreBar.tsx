import { useBreakpoint } from "@/shared/hooks";
import type { NoteAnswer } from "../types";
import { GameMode } from "../types";

export interface ScoreBarProps {
	answers: NoteAnswer[];
	timeRemaining?: number;
	noteLimit?: number;
	gameMode: GameMode;
	formatTime?: (seconds: number) => string;
}

interface ScoreData {
	correctAnswers: number;
	totalAnswers: number;
	accuracy: number;
	timerDisplay: string;
}

function useScoreData({
	answers,
	timeRemaining,
	noteLimit,
	gameMode,
	formatTime,
}: ScoreBarProps): ScoreData {
	const correctAnswers = answers.filter((a) => a.correct).length;
	const accuracy =
		answers.length > 0
			? Math.round((correctAnswers / answers.length) * 100)
			: 0;

	let timerDisplay = "";
	if (gameMode === GameMode.Time && timeRemaining !== undefined) {
		timerDisplay = formatTime ? formatTime(timeRemaining) : `${timeRemaining}s`;
	} else if (gameMode === GameMode.Notes && noteLimit !== undefined) {
		timerDisplay = `${answers.length}/${noteLimit}`;
	}

	return {
		correctAnswers,
		totalAnswers: answers.length,
		accuracy,
		timerDisplay,
	};
}

function ScoreBarHorizontal(props: ScoreBarProps) {
	const { correctAnswers, totalAnswers, accuracy, timerDisplay } =
		useScoreData(props);

	return (
		<div className="flex justify-between items-center bg-card border-2 border-border rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 min-h-[2.5rem] sm:min-h-[3rem]">
			<div className="text-sm sm:text-lg font-medium">
				Score: {correctAnswers}/{totalAnswers}
			</div>
			<div className="text-sm sm:text-lg font-bold tabular-nums">
				{timerDisplay}
			</div>
			<div className="text-sm sm:text-lg font-medium">
				Accuracy: {accuracy}%
			</div>
		</div>
	);
}

function ScoreBarSidebar(props: ScoreBarProps) {
	const { correctAnswers, totalAnswers, accuracy, timerDisplay } =
		useScoreData(props);

	return (
		<div className="flex flex-col items-center justify-center gap-1.5 bg-card border-2 border-border rounded-lg px-2 py-2 w-full h-full">
			<div className="text-xs font-medium text-center">
				{correctAnswers}/{totalAnswers}
			</div>
			<div className="text-sm font-bold text-center text-primary tabular-nums">
				{timerDisplay}
			</div>
			<div className="text-xs font-medium text-center">{accuracy}%</div>
		</div>
	);
}

/**
 * Compact score bar that replaces SettingsBar during active gameplay.
 * Conditionally renders the appropriate layout variant based on viewport.
 */
export function ScoreBar(props: ScoreBarProps) {
	const { isPhoneLandscape } = useBreakpoint();

	if (isPhoneLandscape) {
		return <ScoreBarSidebar {...props} />;
	}

	return <ScoreBarHorizontal {...props} />;
}
