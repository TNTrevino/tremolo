/**
 * Chart and analytics shapes.
 *
 * Port of frontend-react/src/services/api/types/chart.types.ts, verbatim --
 * `backend/main/DTOs/chart_dtos.go` already tags these keys camelCase
 * (`npm`, `accuracy`, `sessionCount`, `totalQuestions`, and `x`/`y` on each
 * point), so this is the one Go payload with nothing to translate at the
 * boundary.
 */
export interface ChartDataPoint {
	/** RFC3339 timestamp (Go marshals a `time.Time`). */
	x: string;
	y: number;
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
