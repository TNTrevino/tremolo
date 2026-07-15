import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
	TremoloLineChart,
	type TremoloSeries,
	type TremoloReferenceLine,
} from "@/shared/components/charts";
import { useRecentGameEntries } from "@/shared/hooks/queries";
import { GameOverCard } from "@/features/identification-game";
import type { NoteGameStats } from "../types";

export interface GameResultsProps {
	gameStats: NoteGameStats;
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
		<GameOverCard
			gameStats={gameStats}
			onPlayAgain={onPlayAgain}
			rateLabel="Notes Per Minute"
			unit="notes"
			summaryExtras={
				gameStats.scale !== undefined && (
					<>
						<span>•</span>
						<span>Scale: {gameStats.scale}</span>
					</>
				)
			}
			actions={
				!isAuthenticated && (
					<Link to="/signup">
						<Button size="lg" variant="outline">
							Sign Up to Save Progress
						</Button>
					</Link>
				)
			}
		>
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
		</GameOverCard>
	);
}
