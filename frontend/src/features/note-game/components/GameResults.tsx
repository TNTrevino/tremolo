import { useMemo } from "react";
import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
	TremoloLineChart,
	type TremoloSeries,
	type TremoloReferenceLine,
} from "@/shared/components/charts";
import { useRecentGameEntries } from "@/shared/hooks/queries";
import type { GameStats } from "../types";
import { GameMode } from "../types";

export interface GameResultsProps {
	gameStats: GameStats;
	isAuthenticated: boolean;
	onPlayAgain: () => void;
	saveError?: boolean;
}

interface RecentGamePoint {
	index: number;
	npm: number;
	accuracy: number;
	date: string;
}

const NPM_SERIES: Array<
	TremoloSeries & { key: keyof RecentGamePoint & string }
> = [
	{
		key: "npm",
		name: "NPM",
		color: "hsl(var(--primary))",
		format: (v) => v.toFixed(1),
		showPB: true,
	},
	{
		key: "accuracy",
		name: "Accuracy",
		color: "hsl(var(--brass))",
		format: (v) => `${v.toFixed(1)}%`,
	},
];

/**
 * Game results component
 * Displays performance statistics, charts, and options to play again
 */
export function GameResults({
	gameStats,
	isAuthenticated,
	onPlayAgain,
	saveError,
}: GameResultsProps) {
	const { data: recentEntries, isError: recentEntriesError } =
		useRecentGameEntries();

	// Backend returns newest-first; reverse to oldest-left, then compute derived fields.
	const chartData = useMemo<RecentGamePoint[]>(() => {
		if (!recentEntries || recentEntries.length === 0) return [];
		return [...recentEntries].reverse().map((entry, i) => ({
			index: i + 1,
			npm: entry.notes_per_minute,
			accuracy:
				entry.total_questions > 0
					? (entry.correct_questions / entry.total_questions) * 100
					: 0,
			date: entry.created_date,
		}));
	}, [recentEntries]);

	const referenceLines = useMemo<TremoloReferenceLine[]>(() => {
		if (chartData.length < 2) return [];
		const avg = chartData.reduce((sum, p) => sum + p.npm, 0) / chartData.length;
		return [{ value: avg, label: `avg ${avg.toFixed(1)}` }];
	}, [chartData]);

	const formatTooltipLabel = (
		value: unknown,
		payload?: Record<string, unknown>,
	) => {
		const idx = typeof value === "number" ? value : Number(value);
		const date = payload?.date as string | undefined;
		const dateLabel = date
			? new Date(date).toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				})
			: "";
		return dateLabel ? `Game ${idx} · ${dateLabel}` : `Game ${idx}`;
	};

	const showChart = isAuthenticated && chartData.length >= 2;

	return (
		<div className="space-y-6 animate-fade-in">
			<div className="text-center space-y-2">
				<h1 className="text-4xl font-bold">Game Over!</h1>
				<p className="text-muted-foreground text-lg">Here&apos;s how you did</p>
			</div>

			{/* Primary Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-transparent">
					<div className="text-6xl font-bold text-primary">{gameStats.npm}</div>
					<div className="text-sm text-muted-foreground mt-2">
						Notes Per Minute
					</div>
				</Card>
				<Card className="p-8 text-center bg-gradient-to-br from-brass/10 to-transparent">
					<div className="text-6xl font-bold text-brass">
						{gameStats.accuracy}%
					</div>
					<div className="text-sm text-muted-foreground mt-2">Accuracy</div>
				</Card>
			</div>

			{/* Performance Chart */}
			{isAuthenticated && saveError && (
				<Card className="p-6 border-destructive/50">
					<p className="text-sm text-destructive text-center">
						Your result could not be saved. Please check your connection and try
						again.
					</p>
				</Card>
			)}
			{isAuthenticated && recentEntriesError && (
				<Card className="p-6">
					<p className="text-sm text-muted-foreground text-center">
						Could not load recent games.
						{!saveError && " Your result was still saved."}
					</p>
				</Card>
			)}
			{showChart && (
				<Card className="p-6">
					<div className="mb-4 flex items-baseline justify-between">
						<h3 className="text-xl font-bold">Recent Games</h3>
						<span className="text-xs text-muted-foreground">
							Last {chartData.length} · click legend to toggle
						</span>
					</div>
					<TremoloLineChart
						data={chartData}
						series={NPM_SERIES}
						xKey="index"
						height={300}
						xTickFormatter={(value) => `${value}`}
						tooltipLabelFormatter={formatTooltipLabel}
						referenceLines={referenceLines}
					/>
				</Card>
			)}

			{/* Settings Summary */}
			<Card className="p-4">
				<div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
					<span>
						Mode: {gameStats.gameMode === GameMode.Time ? "Time" : "Notes"}
					</span>
					<span>•</span>
					<span>
						Limit: {gameStats.limit}{" "}
						{gameStats.gameMode === GameMode.Time ? "seconds" : "notes"}
					</span>
					{gameStats.scale !== undefined && (
						<>
							<span>•</span>
							<span>Scale: {gameStats.scale}</span>
						</>
					)}
					{gameStats.octave !== undefined && (
						<>
							<span>•</span>
							<span>Octave: {gameStats.octave}</span>
						</>
					)}
				</div>
			</Card>

			{/* Actions */}
			<div className="flex flex-col sm:flex-row gap-4 justify-center">
				<Button size="lg" onClick={onPlayAgain}>
					<RotateCcw className="mr-2 h-5 w-5" />
					Play Again
				</Button>
				{!isAuthenticated && (
					<Link to="/signup">
						<Button size="lg" variant="outline">
							Sign Up to Save Progress
						</Button>
					</Link>
				)}
			</div>
		</div>
	);
}
