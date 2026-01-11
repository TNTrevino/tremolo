import { ChartOptions } from "chart.js";

// Theme colors from App.tsx
export const CHART_THEME_COLORS = {
	primary: "#1E201E", // NPM
	secondary: "#3C3D37", // Accuracy
	tertiary: "#697565", // Session Count
	light: "#ECDFCC", // Total Questions
};

// Common dataset styling
export const getDatasetStyle = (color: string) => ({
	borderColor: color,
	backgroundColor: color,
	borderWidth: 2,
	pointRadius: 3,
	pointHoverRadius: 5,
	tension: 0.4,
	fill: false,
});

// Common chart options
export const getBaseChartOptions = (): ChartOptions<"line"> => ({
	responsive: true,
	maintainAspectRatio: false,
	interaction: {
		mode: "index",
		intersect: false,
	},
	plugins: {
		legend: {
			position: "bottom",
			labels: {
				usePointStyle: true,
				padding: 15,
				font: {
					size: 12,
				},
			},
		},
		tooltip: {
			backgroundColor: "rgba(0, 0, 0, 0.8)",
			padding: 12,
			titleFont: {
				size: 14,
			},
			bodyFont: {
				size: 12,
			},
			usePointStyle: true,
		},
	},
	scales: {
		x: {
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
});
