import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
	Card,
	CardContent,
	Typography,
	Select,
	MenuItem,
	Box,
	ToggleButtonGroup,
	ToggleButton,
	CircularProgress,
	Alert,
	SelectChangeEvent,
} from "@mui/material";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	TimeScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { useAuth } from "../../hooks/useAuth";
import { ChartService } from "../../services/ChartService";
import { TimeInterval, MultiMetricChartData } from "../../DTOs/chart";
import {
	CHART_THEME_COLORS,
	getDatasetStyle,
	getBaseChartOptions,
} from "./chartConfig";

// Register Chart.js components
ChartJS.register(
	CategoryScale,
	LinearScale,
	TimeScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
);

// Valid values for type safety
const VALID_INTERVALS: TimeInterval[] = ["day", "week", "month", "year", "all"];
const VALID_VIEWS: Array<"personal" | "class"> = ["personal", "class"];

// Type guard for TimeInterval
const isValidInterval = (value: string | null): value is TimeInterval => {
	return value !== null && VALID_INTERVALS.includes(value as TimeInterval);
};

// Type guard for data view
const isValidView = (value: string | null): value is "personal" | "class" => {
	return value !== null && VALID_VIEWS.includes(value as "personal" | "class");
};

export const PerformanceChart = () => {
	const { currentUser } = useAuth();
	const [searchParams, setSearchParams] = useSearchParams();

	// Read initial values from URL params with fallback to defaults
	const urlInterval = searchParams.get("interval");
	const urlView = searchParams.get("view");

	const [chartData, setChartData] = useState<MultiMetricChartData | null>(null);
	const [interval, setInterval] = useState<TimeInterval>(
		isValidInterval(urlInterval) ? urlInterval : "day",
	);
	const [dataView, setDataView] = useState<"personal" | "class">(
		isValidView(urlView) ? urlView : "personal",
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const isTeacher = currentUser?.role === "teacher";

	const fetchChartData = useCallback(async () => {
		if (!currentUser) {
			setError("User not authenticated");
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			let data: MultiMetricChartData;

			if (dataView === "class" && isTeacher) {
				data = await ChartService.getTeacherClassChartData(interval);
			} else {
				data = await ChartService.getUserChartData(
					currentUser.id.toString(),
					interval,
				);
			}

			setChartData(data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load chart data",
			);
		} finally {
			setLoading(false);
		}
	}, [currentUser, dataView, interval, isTeacher]);

	useEffect(() => {
		fetchChartData();
	}, [fetchChartData]);

	const handleIntervalChange = (event: SelectChangeEvent<TimeInterval>) => {
		const newInterval = event.target.value as TimeInterval;
		setInterval(newInterval);

		// Update URL params
		const newParams = new URLSearchParams(searchParams);
		newParams.set("interval", newInterval);
		setSearchParams(newParams);
	};

	const handleDataViewChange = (
		_event: React.MouseEvent<HTMLElement>,
		newView: "personal" | "class" | null,
	) => {
		if (newView !== null) {
			setDataView(newView);

			// Update URL params
			const newParams = new URLSearchParams(searchParams);
			newParams.set("view", newView);
			setSearchParams(newParams);
		}
	};

	// Render loading state
	if (loading) {
		return (
			<Card variant="outlined">
				<CardContent>
					<Box
						display="flex"
						justifyContent="center"
						alignItems="center"
						height={300}
					>
						<CircularProgress />
					</Box>
				</CardContent>
			</Card>
		);
	}

	// Render error state
	if (error) {
		return (
			<Card variant="outlined">
				<CardContent>
					<Alert severity="error">{error}</Alert>
				</CardContent>
			</Card>
		);
	}

	// Prepare Chart.js data
	const chartJsData = chartData
		? {
				datasets: [
					{
						label: "Notes Per Minute",
						data: chartData.npm.map((point) => ({
							x: point.x.getTime(),
							y: point.y,
						})),
						...getDatasetStyle(CHART_THEME_COLORS.primary),
					},
					{
						label: "Accuracy %",
						data: chartData.accuracy.map((point) => ({
							x: point.x.getTime(),
							y: point.y,
						})),
						...getDatasetStyle(CHART_THEME_COLORS.secondary),
					},
					{
						label: "Session Count",
						data: chartData.sessionCount.map((point) => ({
							x: point.x.getTime(),
							y: point.y,
						})),
						...getDatasetStyle(CHART_THEME_COLORS.tertiary),
					},
					{
						label: "Total Questions",
						data: chartData.totalQuestions.map((point) => ({
							x: point.x.getTime(),
							y: point.y,
						})),
						...getDatasetStyle(CHART_THEME_COLORS.light),
					},
				],
			}
		: { datasets: [] };

	// Chart.js options with responsive design
	const options: ChartOptions<"line"> = {
		...getBaseChartOptions(),
		plugins: {
			...getBaseChartOptions().plugins,
			tooltip: {
				...getBaseChartOptions().plugins?.tooltip,
				callbacks: {
					title: (tooltipItems) => {
						const xValue = tooltipItems[0].parsed.x;
						if (xValue === null) return "";
						const date = new Date(xValue);
						return date.toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
							year: "numeric",
						});
					},
				},
			},
		},
		scales: {
			x: {
				type: "time",
				time: {
					unit:
						interval === "day"
							? "hour"
							: interval === "week"
								? "day"
								: interval === "month"
									? "day"
									: interval === "year"
										? "month"
										: "day",
					displayFormats: {
						hour: "HH:mm",
						day: "MMM d",
						month: "MMM yyyy",
					},
				},
				grid: {
					display: true,
					color: "rgba(0, 0, 0, 0.05)",
				},
				ticks: {
					autoSkip: true,
					maxRotation: 45,
					minRotation: 0,
				},
			},
			y: {
				beginAtZero: true,
				grid: {
					display: true,
					color: "rgba(0, 0, 0, 0.05)",
				},
			},
		},
	};

	// Main render with Chart.js component
	return (
		<Card variant="outlined">
			<CardContent>
				{/* Header with title and interval selector */}
				<Box
					display="flex"
					justifyContent="space-between"
					alignItems="center"
					mb={2}
					flexDirection={{ xs: "column", sm: "row" }}
					gap={{ xs: 1, sm: 0 }}
				>
					<Typography variant="h6">Performance Metrics</Typography>
					<Select
						value={interval}
						onChange={handleIntervalChange}
						size="small"
						sx={{ minWidth: 120 }}
					>
						<MenuItem value="day">Daily</MenuItem>
						<MenuItem value="week">Weekly</MenuItem>
						<MenuItem value="month">Monthly</MenuItem>
						<MenuItem value="year">Yearly</MenuItem>
						<MenuItem value="all">All Time</MenuItem>
					</Select>
				</Box>

				{/* Teacher toggle (only for teachers) */}
				{isTeacher && (
					<Box mb={2}>
						<ToggleButtonGroup
							value={dataView}
							exclusive
							onChange={handleDataViewChange}
							size="small"
						>
							<ToggleButton value="personal">My Data</ToggleButton>
							<ToggleButton value="class">Class Data</ToggleButton>
						</ToggleButtonGroup>
					</Box>
				)}

				{/* Chart.js Line Chart */}
				<Box
					sx={{
						height: { xs: 250, sm: 300, md: 350 },
						position: "relative",
					}}
				>
					<Line data={chartJsData} options={options} />
				</Box>
			</CardContent>
		</Card>
	);
};
