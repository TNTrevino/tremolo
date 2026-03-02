/**
 * Dashboard Data Hook
 *
 * Centralized hook for fetching all dashboard data including:
 * - User profile information
 * - Performance statistics and chart data
 * - Teacher-specific class metrics (if applicable)
 */

import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth.store";
import {
	useUserProfile,
	useUserStats,
	useClassMetrics,
} from "@/shared/hooks/queries/useUserQuery";
import type {
	UserProfile,
	MultiMetricChartData,
	ChartInterval,
} from "@/services/api/types";

interface DashboardDataParams {
	interval?: ChartInterval;
	days?: number;
}

interface DashboardStats {
	totalSessions: number;
	totalQuestions: number;
	avgNPM: number;
	avgAccuracy: number;
}

interface DashboardData {
	user: UserProfile | null;
	stats: DashboardStats | null;
	chartData: MultiMetricChartData | null;
	classMetrics: MultiMetricChartData | null;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
}

/**
 * Hook to fetch and aggregate all dashboard data
 *
 * @param params - Query parameters for chart data
 * @returns Dashboard data with loading and error states
 */
export function useDashboardData(params?: DashboardDataParams): DashboardData {
	const isTeacher = useAuthStore((state) => state.user?.role) === "TEACHER";

	const {
		data: userProfile,
		isLoading: isLoadingProfile,
		isError: isProfileError,
		error: profileError,
	} = useUserProfile();

	const {
		data: chartData,
		isLoading: isLoadingStats,
		isError: isStatsError,
		error: statsError,
	} = useUserStats(undefined, params);

	const {
		data: classMetricsData,
		isLoading: isLoadingClass,
		isError: isClassError,
		error: classError,
	} = useClassMetrics(params);

	const stats = useMemo<DashboardStats | null>(() => {
		if (!userProfile) return null;

		return {
			totalSessions: userProfile.totalSessions ?? 0,
			totalQuestions: userProfile.totalQuestions ?? 0,
			avgNPM: userProfile.averageNPM ?? 0,
			avgAccuracy: userProfile.averageAccuracy ?? 0,
		};
	}, [userProfile]);

	const isLoading =
		isLoadingProfile || isLoadingStats || (isTeacher && isLoadingClass);

	const isError = isProfileError || isStatsError || (isTeacher && isClassError);
	const error = profileError || statsError || classError || null;

	return {
		user: userProfile ?? null,
		stats,
		chartData: chartData ?? null,
		classMetrics: classMetricsData ?? null,
		isLoading,
		isError,
		error: error as Error | null,
	};
}
