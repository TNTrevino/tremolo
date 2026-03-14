/**
 * Chart and Analytics Type Definitions
 *
 * Types for data visualization and analytics dashboard.
 * Used with the Go backend (port 5001).
 */

export interface ChartDataPoint {
	x: string; // ISO timestamp
	y: number; // Value
}

export interface MultiMetricChartData {
	npm: ChartDataPoint[];
	accuracy: ChartDataPoint[];
	sessionCount: ChartDataPoint[];
	totalQuestions: ChartDataPoint[];
}

export type ChartInterval = "day" | "week" | "month" | "year" | "all";

export interface ChartQueryParams {
	interval?: ChartInterval;
	days?: number;
}
