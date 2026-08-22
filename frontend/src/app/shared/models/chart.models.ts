/**
 * Chart and analytics shapes.
 *
 * Port of frontend-react/src/services/api/types/chart.types.ts, verbatim --
 * `core-api/DTOs/chart_dtos.go` already tags these keys camelCase
 * (`npm`, `accuracy`, `sessionCount`, `totalQuestions`, and `x`/`y` on each
 * point), so this is the one Go payload with nothing to translate at the
 * boundary.
 *
 * The daily-activity row is **not** here: it arrives snake_case
 * (`game_count`) and so gets the same DTO/domain/mapper treatment as
 * everything else, next to the other note-game shapes in `game.models.ts`.
 */
export interface ChartDataPoint {
	/** RFC3339 timestamp (Go marshals a `time.Time`). */
	x: string;
	y: number;
}

/**
 * `GET /api/charts/user/:id/metrics` and
 * `GET /api/charts/teacher/class-metrics`.
 *
 * Four independent series. They are *not* guaranteed to be the same length,
 * which is why the performance chart zips them by index rather than
 * assuming alignment.
 */
export interface MultiMetricChartData {
	npm: ChartDataPoint[];
	accuracy: ChartDataPoint[];
	sessionCount: ChartDataPoint[];
	totalQuestions: ChartDataPoint[];
}

/** Bucket size for the chart endpoints. */
export type ChartInterval = "day" | "week" | "month" | "year" | "all";

export interface ChartQueryParams {
	interval?: ChartInterval;
	/** Only meaningful with `interval: "day"`; the dashboard asks for 30. */
	days?: number;
}
