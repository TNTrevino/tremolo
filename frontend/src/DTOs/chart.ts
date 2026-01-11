/**
 * Chart Data Transfer Objects
 * Type definitions for Chart.js performance metrics visualization
 */

/**
 * Time interval options for data aggregation
 */
export type TimeInterval = "day" | "week" | "month" | "year" | "all";

/**
 * Single data point for chart visualization
 * Matches backend ChartDataPoint DTO structure
 */
export interface ChartDataPoint {
	/** Timestamp for the data point */
	x: Date;
	/** Metric value at this timestamp */
	y: number;
}

/**
 * Multi-metric chart data response
 * Contains all 4 performance metrics with time-series data
 */
export interface MultiMetricChartData {
	/** Notes per minute over time */
	npm: ChartDataPoint[];
	/** Accuracy percentage over time */
	accuracy: ChartDataPoint[];
	/** Number of practice sessions over time */
	sessionCount: ChartDataPoint[];
	/** Total questions answered over time */
	totalQuestions: ChartDataPoint[];
}

/**
 * Request parameters for chart data API calls
 */
export interface ChartDataRequest {
	/** User ID for personal data (optional for class data) */
	userId?: string;
	/** Time interval for data aggregation */
	interval: TimeInterval;
	/** Number of days to fetch (default: 30) */
	days?: number;
}
