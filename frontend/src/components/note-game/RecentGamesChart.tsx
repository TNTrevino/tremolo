import { useEffect, useState } from "react";
import { Box, CircularProgress, Alert, Typography } from "@mui/material";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { NoteGameService, NoteGameEntry } from "../../services/NoteGameService";
import {
	CHART_THEME_COLORS,
	getDatasetStyle,
	getBaseChartOptions,
} from "../charts/chartConfig";

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
);

export const RecentGamesChart = () => {
	const [entries, setEntries] = useState<NoteGameEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchEntries = async () => {
			try {
				const data = await NoteGameService.getRecentEntries();
				// Reverse to show oldest to newest (Game 1 on left, Game 30 on right)
				setEntries(data.reverse());
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load recent games",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchEntries();
	}, []);

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" p={2}>
				<CircularProgress size={30} />
			</Box>
		);
	}

	if (error) {
		return (
			<Box p={2}>
				<Alert severity="error">{error}</Alert>
			</Box>
		);
	}

	if (entries.length === 0) {
		return (
			<Box p={2}>
				<Typography variant="body2" color="text.secondary">
					No recent games found
				</Typography>
			</Box>
		);
	}

	const chartData = {
		labels: entries.map((_, index) => `${index + 1}`),
		datasets: [
			{
				label: "Notes Per Minute",
				data: entries.map((entry) => entry.notes_per_minute),
				...getDatasetStyle(CHART_THEME_COLORS.primary),
			},
			{
				label: "Accuracy %",
				data: entries.map(
					(entry) => (entry.correct_questions / entry.total_questions) * 100,
				),
				...getDatasetStyle(CHART_THEME_COLORS.secondary),
			},
		],
	};

	// Determine title based on actual entry count
	const entryCount = entries.length;
	const chartTitle =
		entryCount === 1
			? "Last Game Performance"
			: `Last ${entryCount} Games Performance`;

	const options: ChartOptions<"line"> = {
		...getBaseChartOptions(),
		plugins: {
			...getBaseChartOptions().plugins,
			title: {
				display: true,
				text: chartTitle,
				font: {
					size: 16,
				},
			},
			tooltip: {
				...getBaseChartOptions().plugins?.tooltip,
				callbacks: {
					title: (tooltipItems) => {
						return `Game ${tooltipItems[0].label}`;
					},
				},
			},
		},
		scales: {
			x: {
				title: {
					display: true,
					text: "Game Number",
				},
				grid: {
					display: true,
					color: "rgba(0, 0, 0, 0.05)",
				},
				ticks: {
					autoSkip: entryCount > 15,
					maxTicksLimit: entryCount <= 15 ? entryCount : undefined,
					maxRotation: 0,
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

	return (
		<Box sx={{ height: 300, width: "100%" }}>
			<Line data={chartData} options={options} />
		</Box>
	);
};
