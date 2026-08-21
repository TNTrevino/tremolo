/**
 * Port of frontend-react/src/services/api/types/chart.types.ts, plus the one
 * activity type that lived in `game.types.ts`.
 *
 * These are the Go service's chart endpoints' wire shapes. They are already
 * camelCase on the wire (`sessionCount`, `totalQuestions`) with the single
 * exception of `DailyActivityCount.game_count`, so there is no mapper here:
 * a mapper that only renames one field of one type would be more machinery
 * than the rename is worth, and the boundary is documented instead.
 */

/** One point on one series. `x` is an ISO timestamp; `y` is the value. */
export interface ChartDataPoint {
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

/**
 * One row of `GET /api/note-game/activity` -- the heatmap's data.
 * `game_count` is snake_case on the wire and stays that way; see the file
 * header.
 */
export interface DailyActivityCount {
	/** "YYYY-MM-DD", local to the server. */
	date: string;
	game_count: number;
}
