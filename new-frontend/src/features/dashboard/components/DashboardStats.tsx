/**
 * Dashboard Stats Component
 *
 * Displays a grid of 4 stat cards showing:
 * - Average NPM (Notes Per Minute)
 * - Average Accuracy
 * - Total Time
 * - Total Sessions
 */

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, Target, Calendar } from 'lucide-react';

interface DashboardStatsProps {
  avgNPM: number;
  avgAccuracy: number;
  timeReading: string;
  totalSessions: number;
}

export function DashboardStats({
  avgNPM,
  avgAccuracy,
  timeReading,
  totalSessions,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Average NPM */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Average NPM</p>
              <p className="text-3xl font-bold text-primary">{avgNPM}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Accuracy */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Accuracy</p>
              <p className="text-3xl font-bold text-accent">{avgAccuracy}%</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-2">
              <Target className="h-6 w-6 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Time */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Time</p>
              <p className="text-3xl font-bold">{timeReading}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <Clock className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Sessions */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Sessions</p>
              <p className="text-3xl font-bold">{totalSessions}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-2">
              <Calendar className="h-6 w-6 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
