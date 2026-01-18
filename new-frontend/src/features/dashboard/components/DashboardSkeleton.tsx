/**
 * Dashboard Skeleton Loader
 *
 * Displays skeleton loaders that match the actual dashboard layout
 * while data is being fetched from the API.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* User Profile Card Skeleton */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              {/* Avatar Skeleton */}
              <Skeleton className="w-24 h-24 rounded-full flex-shrink-0" />

              {/* User Info Skeleton */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <Skeleton className="h-9 w-48 mx-auto md:mx-0" />
                <div className="flex flex-wrap gap-2 justify-center md:justify-start items-center">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>

              {/* Quick Stats Skeleton */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Skeleton className="h-9 w-16 mx-auto mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="text-center">
                  <Skeleton className="h-9 w-16 mx-auto mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart Skeleton */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[400px]" />
          </CardContent>
        </Card>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-16" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
