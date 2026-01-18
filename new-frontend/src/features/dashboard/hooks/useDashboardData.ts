/**
 * Dashboard Data Hook
 * 
 * Centralized hook for fetching all dashboard data including:
 * - User profile information
 * - Performance statistics and chart data
 * - Teacher-specific class metrics (if applicable)
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/api/user.service';
import type { GeneralUserInfo, MultiMetricChartData, ChartInterval } from '@/services/api/types';

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
  user: GeneralUserInfo | null;
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
  const authUser = useAuthStore((state) => state.user);
  const userId = authUser?.id;
  const isTeacher = authUser?.role === 'teacher';

  // Fetch user profile with general info
  const {
    data: userProfile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    error: profileError,
  } = useQuery({
    queryKey: ['user', 'profile', userId],
    queryFn: () => userService.getProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user performance stats and chart data
  const {
    data: chartData,
    isLoading: isLoadingStats,
    isError: isStatsError,
    error: statsError,
  } = useQuery({
    queryKey: ['user', 'stats', userId, params?.interval, params?.days],
    queryFn: () => userService.getStats(userId!, params),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - stats change more frequently
  });

  // Fetch teacher's class metrics (only for teachers)
  const {
    data: classMetrics,
    isLoading: isLoadingClass,
    isError: isClassError,
    error: classError,
  } = useQuery({
    queryKey: ['teacher', 'class-metrics', params],
    queryFn: () => userService.getClassMetrics(params),
    enabled: !!userId && isTeacher,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Derive stats from user profile
  const stats = useMemo<DashboardStats | null>(() => {
    if (!userProfile) return null;

    return {
      totalSessions: userProfile.total_sessions ?? 0,
      totalQuestions: userProfile.total_questions ?? 0,
      avgNPM: userProfile.average_npm ?? 0,
      avgAccuracy: userProfile.average_accuracy ?? 0,
    };
  }, [userProfile]);

  // Aggregate loading state
  const isLoading = isLoadingProfile || isLoadingStats || (isTeacher && isLoadingClass);

  // Aggregate error state
  const isError = isProfileError || isStatsError || (isTeacher && isClassError);
  const error = profileError || statsError || classError || null;

  return {
    user: userProfile ?? null,
    stats,
    chartData: chartData ?? null,
    classMetrics: classMetrics ?? null,
    isLoading,
    isError,
    error: error as Error | null,
  };
}
