import { apiClient, isOk } from "./axiosInstance";
import { MultiMetricChartData, TimeInterval } from "../DTOs/chart";

/**
 * Chart Service
 * Handles API calls for fetching performance chart data with JWT authentication
 */
export const ChartService = {
	/**
	 * Fetch personal chart metrics for the authenticated user
	 * @param userId - User ID to fetch data for
	 * @param interval - Time interval for aggregation (day/week/month/year/all)
	 * @returns Promise with multi-metric chart data
	 */
	async getUserChartData(
		userId: string,
		interval: TimeInterval = "day",
	): Promise<MultiMetricChartData> {
		try {
			// Map interval to number of days to fetch
			const daysMap: Record<TimeInterval, number> = {
				day: 1, // Today only
				week: 7, // This week
				month: 30, // This month (approximation)
				year: 365, // This year
				all: 99999, // All time
			};

			const response = await apiClient.get<MultiMetricChartData>(
				`/api/charts/user/${userId}/metrics`,
				{
					params: {
						interval,
						days: daysMap[interval],
					},
				},
			);

			if (!isOk(response)) {
				throw new Error(`Failed to fetch user chart data: ${response.status}`);
			}

			// Parse date strings to Date objects
			return this.parseChartData(response.data);
		} catch (error) {
			console.error("Error fetching user chart data:", error);
			throw error instanceof Error
				? error
				: new Error("Failed to fetch chart data");
		}
	},

	/**
	 * Fetch aggregated class metrics for teachers
	 * @param interval - Time interval for aggregation (day/week/month/year/all)
	 * @returns Promise with multi-metric chart data (aggregated across all students)
	 */
	async getTeacherClassChartData(
		interval: TimeInterval = "day",
	): Promise<MultiMetricChartData> {
		try {
			// Map interval to number of days to fetch
			const daysMap: Record<TimeInterval, number> = {
				day: 1, // Today only
				week: 7, // This week
				month: 30, // This month (approximation)
				year: 365, // This year
				all: 99999, // All time
			};

			const response = await apiClient.get<MultiMetricChartData>(
				`/api/charts/teacher/class-metrics`,
				{
					params: {
						interval,
						days: daysMap[interval],
					},
				},
			);

			if (!isOk(response)) {
				throw new Error(`Failed to fetch class chart data: ${response.status}`);
			}

			return this.parseChartData(response.data);
		} catch (error) {
			console.error("Error fetching teacher chart data:", error);
			throw error instanceof Error
				? error
				: new Error("Failed to fetch class data");
		}
	},

	/**
	 * Helper to parse date strings to Date objects
	 * Backend returns ISO 8601 date strings that need to be converted
	 * @param data - Raw chart data from API
	 * @returns Chart data with parsed Date objects
	 */
	parseChartData(data: MultiMetricChartData): MultiMetricChartData {
		return {
			npm: data.npm.map((point) => ({
				x: new Date(point.x),
				y: point.y,
			})),
			accuracy: data.accuracy.map((point) => ({
				x: new Date(point.x),
				y: point.y,
			})),
			sessionCount: data.sessionCount.map((point) => ({
				x: new Date(point.x),
				y: point.y,
			})),
			totalQuestions: data.totalQuestions.map((point) => ({
				x: new Date(point.x),
				y: point.y,
			})),
		};
	},
};
