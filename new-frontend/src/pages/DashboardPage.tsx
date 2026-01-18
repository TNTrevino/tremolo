/**
 * Dashboard Page
 *
 * Main dashboard page that orchestrates the display of user information,
 * performance metrics, and teacher-specific features.
 *
 * This component:
 * - Fetches dashboard data via useDashboardData hook
 * - Manages chart interval and view mode state
 * - Renders loading skeleton while fetching
 * - Handles error states
 * - Delegates rendering to specialized components
 */

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboardData } from '@/features/dashboard/hooks';
import {
  DashboardStats,
  PerformanceChart,
  TeacherDashboard,
  UserProfileCard,
  DashboardSkeleton,
} from '@/features/dashboard/components';
import { Card, CardContent } from '@/components/ui/card';
import type { ChartInterval } from '@/services/api/types';

/**
 * Calculate total time reading from chart data
 * Estimates based on average session length
 */
function calculateTimeReading(totalSessions: number): string {
  // Rough estimate: average 5 minutes per session
  const totalMinutes = totalSessions * 5;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function DashboardPage() {
  const authUser = useAuthStore((state) => state.user);
  const [interval, setInterval] = useState<ChartInterval>('day');
  const [viewMode, setViewMode] = useState<'my' | 'class'>('my');

  // Fetch dashboard data with current interval
  const { user, stats, chartData, classMetrics, isLoading, isError, error } = useDashboardData({
    interval,
    days: interval === 'day' ? 30 : undefined,
  });

  // Show loading skeleton
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (isError || !user || !stats || !chartData) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-destructive">Error Loading Dashboard</h2>
                <p className="text-muted-foreground">
                  {error?.message || 'Unable to load dashboard data. Please try again later.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isTeacher = authUser?.role === 'teacher';
  const timeReading = calculateTimeReading(stats.totalSessions);

  // Use class metrics if teacher is viewing class data
  const displayChartData =
    isTeacher && viewMode === 'class' && classMetrics ? classMetrics : chartData;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* User Profile Card */}
        <UserProfileCard
          user={user}
          quickStats={{
            totalSessions: stats.totalSessions,
            timeReading,
          }}
        />

        {/* Performance Chart */}
        <PerformanceChart
          chartData={displayChartData}
          interval={interval}
          onIntervalChange={setInterval}
          isTeacher={isTeacher}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Stats Grid */}
        <DashboardStats
          avgNPM={stats.avgNPM}
          avgAccuracy={stats.avgAccuracy}
          timeReading={timeReading}
          totalSessions={stats.totalSessions}
        />

        {/* Teacher Dashboard Section */}
        {isTeacher && <TeacherDashboard user={user} />}
      </div>
    </div>
  );
}
