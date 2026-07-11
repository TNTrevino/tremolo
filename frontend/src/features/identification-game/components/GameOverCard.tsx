import { RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import type { GameStats } from "../types";
import { GameMode } from "../types";

export interface GameOverCardProps {
	gameStats: GameStats;
	onPlayAgain: () => void;
	/** Label under the per-minute stat */
	rateLabel?: string;
	/** Unit word for question-count mode ("questions", "notes") */
	unit?: string;
	/** Extra entries appended to the summary row */
	summaryExtras?: React.ReactNode;
	/** Extra actions rendered beside Play Again */
	actions?: React.ReactNode;
	/** Sections rendered between the stat cards and the summary */
	children?: React.ReactNode;
}

/**
 * Results screen shared by every identification game. Games with more
 * to show (the note game's recent-games chart and save status) pass
 * those sections through the slots instead of forking the layout.
 */
export function GameOverCard({
	gameStats,
	onPlayAgain,
	rateLabel = "Answers Per Minute",
	unit = "questions",
	summaryExtras,
	actions,
	children,
}: GameOverCardProps) {
	const isTimeMode = gameStats.gameMode === GameMode.Time;
	const modeLabel = isTimeMode
		? "Time"
		: unit.charAt(0).toUpperCase() + unit.slice(1);

	return (
		<div className="space-y-6 animate-fade-in">
			<div className="text-center space-y-2">
				<h1 className="font-display text-4xl font-bold">Game Over!</h1>
				<p className="text-muted-foreground text-lg">Here&apos;s how you did</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-transparent">
					<div className="font-display text-6xl font-bold tabular-nums text-primary">
						{gameStats.npm}
					</div>
					<div className="text-sm text-muted-foreground mt-2">{rateLabel}</div>
				</Card>
				<Card className="p-8 text-center bg-gradient-to-br from-brass/10 to-transparent">
					<div className="font-display text-6xl font-bold tabular-nums text-brass">
						{gameStats.accuracy}%
					</div>
					<div className="text-sm text-muted-foreground mt-2">Accuracy</div>
				</Card>
			</div>

			{children}

			<Card className="p-4">
				<div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
					<span>Mode: {modeLabel}</span>
					<span>•</span>
					<span>
						Limit: {gameStats.limit} {isTimeMode ? "seconds" : unit}
					</span>
					<span>•</span>
					<span>
						Score: {gameStats.correct}/{gameStats.total}
					</span>
					{summaryExtras}
				</div>
			</Card>

			<div className="flex flex-col sm:flex-row gap-4 justify-center">
				<Button size="lg" onClick={onPlayAgain}>
					<RotateCcw className="mr-2 h-5 w-5" />
					Play Again
				</Button>
				{actions}
			</div>
		</div>
	);
}
