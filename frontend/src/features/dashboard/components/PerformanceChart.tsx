/**
 * Performance Chart Component
 *
 * Displays NPM, Accuracy, and Total Questions over time. NPM is shown by
 * default; Accuracy and Total Questions start hidden and can be toggled via
 * the legend. Includes an interval selector (day/week/month/year) and an
 * optional teacher view toggle.
 */

import { useMemo } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Select } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import {
	TremoloLineChart,
	type TremoloSeries,
	type TremoloReferenceLine,
} from "@/shared/components/charts";
import type { MultiMetricChartData, ChartInterval } from "@/services/api/types";

type PerformanceChartBaseProps = {
	chartData: MultiMetricChartData;
	interval: ChartInterval;
	onIntervalChange: (interval: ChartInterval) => void;
};

type PerformanceChartProps =
	| (PerformanceChartBaseProps & { isTeacher?: false })
	| (PerformanceChartBaseProps & {
			isTeacher: true;
			viewMode: "my" | "class";
			onViewModeChange: (mode: "my" | "class") => void;
	  });

interface PerformancePoint {
	time: string;
	npm: number;
	accuracy: number;
	sessions: number;
	questions: number;
}

/**
 * Transform API chart data to the shape TremoloLineChart expects.
 */
function transformChartData(data: MultiMetricChartData): PerformancePoint[] {
	const maxLength = Math.max(
		data.npm.length,
		data.accuracy.length,
		data.sessionCount.length,
		data.totalQuestions.length,
	);
	const combined: PerformancePoint[] = [];
	for (let i = 0; i < maxLength; i++) {
		combined.push({
			time:
				data.npm[i]?.x ||
				data.accuracy[i]?.x ||
				data.sessionCount[i]?.x ||
				data.totalQuestions[i]?.x ||
				"",
			npm: data.npm[i]?.y ?? 0,
			accuracy: data.accuracy[i]?.y ?? 0,
			sessions: data.sessionCount[i]?.y ?? 0,
			questions: data.totalQuestions[i]?.y ?? 0,
		});
	}
	return combined;
}

const ALL_SERIES: Array<
	TremoloSeries & { key: keyof PerformancePoint & string }
> = [
	{
		key: "npm",
		name: "Notes Per Minute",
		color: "hsl(var(--primary))",
		format: (v) => v.toFixed(1),
	},
	{
		key: "accuracy",
		name: "Accuracy",
		color: "hsl(var(--accent))",
		format: (v) => `${v.toFixed(1)}%`,
	},
	{
		key: "questions",
		name: "Total Questions",
		color: "hsl(var(--destructive))",
		format: (v) => String(Math.round(v)),
	},
];

/** Series keys that are hidden until the user clicks them in the legend */
const INITIALLY_HIDDEN: Array<keyof PerformancePoint & string> = [
	"accuracy",
	"questions",
];

function formatXAxisLabel(timestamp: unknown, interval: ChartInterval): string {
	if (typeof timestamp !== "string" || !timestamp) return "";
	const date = new Date(timestamp);
	switch (interval) {
		case "day":
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
		case "week":
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
		case "month":
			return date.toLocaleDateString("en-US", {
				month: "short",
				year: "2-digit",
			});
		case "year":
			return date.toLocaleDateString("en-US", { year: "numeric" });
		default:
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
	}
}

function formatTooltipHeader(
	timestamp: unknown,
	interval: ChartInterval,
): string {
	if (typeof timestamp !== "string" || !timestamp) return "";
	const date = new Date(timestamp);
	if (interval === "year") {
		return date.toLocaleDateString("en-US", { year: "numeric" });
	}
	if (interval === "month") {
		return date.toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	}
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function PerformanceChart(props: PerformanceChartProps) {
	const { chartData, interval, onIntervalChange } = props;
	const isTeacher = props.isTeacher === true;
	const viewMode = props.isTeacher === true ? props.viewMode : "my";
	const onViewModeChange =
		props.isTeacher === true ? props.onViewModeChange : undefined;
	const transformedData = useMemo(
		() => transformChartData(chartData),
		[chartData],
	);

	const referenceLines = useMemo<TremoloReferenceLine[]>(() => {
		if (transformedData.length < 2) return [];
		const avg =
			transformedData.reduce((sum, p) => sum + p.npm, 0) /
			transformedData.length;
		return [{ value: avg, label: `avg ${avg.toFixed(1)}` }];
	}, [transformedData]);

	return (
		<Card className="shadow-lg">
			<CardHeader>
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
					<CardTitle className="text-2xl">Performance</CardTitle>
					<div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
						{/* Teacher view mode toggle */}
						{isTeacher && onViewModeChange && (
							<div className="flex gap-2">
								<Button
									variant={viewMode === "my" ? "default" : "outline"}
									onClick={() => onViewModeChange("my")}
									size="sm"
								>
									My Data
								</Button>
								<Button
									variant={viewMode === "class" ? "default" : "outline"}
									onClick={() => onViewModeChange("class")}
									size="sm"
								>
									Class Data
								</Button>
							</div>
						)}

						{/* Interval selector */}
						<Select
							value={interval}
							onChange={(e) =>
								onIntervalChange(e.target.value as ChartInterval)
							}
						>
							<option value="day">Daily</option>
							<option value="week">Weekly</option>
							<option value="month">Monthly</option>
							<option value="year">Yearly</option>
						</Select>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{transformedData.length < 2 ? (
					<div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
						Not enough data yet — play a few games to see your trend.
					</div>
				) : (
					<TremoloLineChart
						data={transformedData}
						series={ALL_SERIES}
						xKey="time"
						height={360}
						xTickFormatter={(value) => formatXAxisLabel(value, interval)}
						tooltipLabelFormatter={(value) =>
							formatTooltipHeader(value, interval)
						}
						referenceLines={referenceLines}
						initialHiddenSeries={INITIALLY_HIDDEN}
					/>
				)}
			</CardContent>
		</Card>
	);
}
