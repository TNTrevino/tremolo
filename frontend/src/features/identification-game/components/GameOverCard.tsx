import { RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import type { GameStats } from "../types";
import { GameMode } from "../types";

export interface GameOverCardProps {
	gameStats: GameStats;
	onPlayAgain: () => void;
}

/**
 * Lightweight results screen for the new identification games.
 * The note game keeps its richer GameResults (recent-games chart, save
 * status); this card can grow those once per-game persistence lands.
 */
export function GameOverCard({ gameStats, onPlayAgain }: GameOverCardProps) {
	return (
		<div className="space-y-6 animate-fade-in">
			<div className="text-center space-y-2">
				<h1 className="text-4xl font-bold">Game Over!</h1>
				<p className="text-muted-foreground text-lg">Here&apos;s how you did</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-transparent">
					<div className="text-6xl font-bold text-primary">{gameStats.npm}</div>
					<div className="text-sm text-muted-foreground mt-2">
						Answers Per Minute
					</div>
				</Card>
				<Card className="p-8 text-center bg-gradient-to-br from-brass/10 to-transparent">
					<div className="text-6xl font-bold text-brass">
						{gameStats.accuracy}%
					</div>
					<div className="text-sm text-muted-foreground mt-2">Accuracy</div>
				</Card>
			</div>

			<Card className="p-4">
				<div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
					<span>
						Mode: {gameStats.gameMode === GameMode.Time ? "Time" : "Questions"}
					</span>
					<span>•</span>
					<span>
						Limit: {gameStats.limit}{" "}
						{gameStats.gameMode === GameMode.Time ? "seconds" : "questions"}
					</span>
					<span>•</span>
					<span>
						Score: {gameStats.correct}/{gameStats.total}
					</span>
				</div>
			</Card>

			<div className="flex justify-center">
				<Button size="lg" onClick={onPlayAgain}>
					<RotateCcw className="mr-2 h-5 w-5" />
					Play Again
				</Button>
			</div>
		</div>
	);
}
