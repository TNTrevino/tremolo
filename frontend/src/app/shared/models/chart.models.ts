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

/**
 * The safe fallback for a chart resource that has no value yet -- e.g.
 * `chart.value() ?? EMPTY_CHART`. Shared so the dashboard and the
 * teacher's student-stats page don't each declare their own copy.
 */
export const EMPTY_CHART: MultiMetricChartData = {
	npm: [],
	accuracy: [],
	sessionCount: [],
	totalQuestions: [],
};

/** Bucket size for the chart endpoints. */
export type ChartInterval = "day" | "week" | "month" | "year" | "all";

export interface ChartQueryParams {
	interval?: ChartInterval;
	/** Only meaningful with `interval: "day"`; the dashboard asks for 30. */
	days?: number;
}

/**
 * `days` is only sent for the daily view, and it is 30 -- React's
 * `days: interval === "day" ? 30 : undefined`. Shared by every page that
 * builds a per-user or per-class chart request (the dashboard's `chart`
 * and `classMetrics` resources, the student-stats page's `chart`
 * resource) so the ternary lives in one place.
 */
export function chartQuery(interval: ChartInterval): {
	interval: ChartInterval;
	days: number | undefined;
} {
	return { interval, days: interval === "day" ? 30 : undefined };
}
