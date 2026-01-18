/**
 * Performance Chart Component
 *
 * Displays a line chart showing multiple performance metrics over time:
 * - Notes Per Minute (NPM)
 * - Accuracy percentage
 * - Session count
 * - Total questions
 *
 * Includes an interval selector for different time ranges.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import type { MultiMetricChartData, ChartInterval } from "@/services/api/types";

interface PerformanceChartProps {
	chartData: MultiMetricChartData;
	interval: ChartInterval;
	onIntervalChange: (interval: ChartInterval) => void;
	isTeacher?: boolean;
	viewMode?: "my" | "class";
	onViewModeChange?: (mode: "my" | "class") => void;
}

/**
 * Transform API chart data to format expected by Recharts
 */
function transformChartData(data: MultiMetricChartData) {
	// Find the longest array to determine data point count
	const maxLength = Math.max(
		data.npm.length,
		data.accuracy.length,
		data.sessionCount.length,
		data.totalQuestions.length,
	);

	// Create combined data points
	const combined = [];
	for (let i = 0; i < maxLength; i++) {
		combined.push({
			time:
				data.npm[i]?.x ||
				data.accuracy[i]?.x ||
				data.sessionCount[i]?.x ||
				data.totalQuestions[i]?.x ||
				"",
			npm: data.npm[i]?.y || 0,
			accuracy: data.accuracy[i]?.y || 0,
			sessions: data.sessionCount[i]?.y || 0,
			questions: data.totalQuestions[i]?.y || 0,
		});
	}

	return combined;
}

/**
 * Format x-axis labels based on interval
 */
function formatXAxisLabel(timestamp: string, interval: ChartInterval): string {
	const date = new Date(timestamp);

	switch (interval) {
		case "day":
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
		case "week":
			return `Week ${Math.ceil(date.getDate() / 7)}`;
		case "month":
			return date.toLocaleDateString("en-US", { month: "short" });
		case "year":
			return date.toLocaleDateString("en-US", { year: "numeric" });
		default:
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
	}
}

export function PerformanceChart({
	chartData,
	interval,
	onIntervalChange,
	isTeacher = false,
	viewMode = "my",
	onViewModeChange,
}: PerformanceChartProps) {
	const transformedData = transformChartData(chartData);
	const intervalLabel = interval.charAt(0).toUpperCase() + interval.slice(1);

	return (
		<Card className="shadow-lg">
			<CardHeader>
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
					<CardTitle className="text-2xl">Performance Metrics</CardTitle>
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
				<ResponsiveContainer width="100%" height={400}>
					<LineChart data={transformedData}>
						<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
						<XAxis
							dataKey="time"
							label={{
								value: intervalLabel,
								position: "insideBottom",
								offset: -5,
							}}
							tickFormatter={(value) => formatXAxisLabel(value, interval)}
						/>
						<YAxis />
						<Tooltip
							contentStyle={{
								backgroundColor: "hsl(var(--card))",
								border: "2px solid hsl(var(--border))",
								borderRadius: "8px",
							}}
							labelFormatter={(value) => formatXAxisLabel(value, interval)}
						/>
						<Legend />
						<Line
							type="monotone"
							dataKey="npm"
							stroke="hsl(var(--primary))"
							strokeWidth={3}
							name="Notes Per Minute"
						/>
						<Line
							type="monotone"
							dataKey="accuracy"
							stroke="hsl(var(--accent))"
							strokeWidth={3}
							name="Accuracy %"
						/>
						<Line
							type="monotone"
							dataKey="sessions"
							stroke="hsl(var(--muted-foreground))"
							strokeWidth={2}
							name="Sessions"
						/>
						<Line
							type="monotone"
							dataKey="questions"
							stroke="hsl(var(--destructive))"
							strokeWidth={2}
							name="Total Questions"
						/>
					</LineChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
