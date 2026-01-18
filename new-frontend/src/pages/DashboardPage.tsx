import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, Target, Calendar } from 'lucide-react';

// Mock data for demonstration
const generateMockData = (interval: string) => {
  const dataPoints = interval === 'daily' ? 24 : interval === 'weekly' ? 7 : interval === 'monthly' ? 30 : 12;
  return Array.from({ length: dataPoints }, (_, i) => ({
    time: i + 1,
    npm: Math.floor(Math.random() * 30) + 30,
    accuracy: Math.floor(Math.random() * 20) + 70,
    sessions: Math.floor(Math.random() * 5) + 1,
    questions: Math.floor(Math.random() * 50) + 20,
  }));
};

export function DashboardPage() {
  const { user } = useAuth();
  const [interval, setInterval] = useState('daily');
  const [viewMode, setViewMode] = useState<'my' | 'class'>('my');

  const chartData = generateMockData(interval);

  const stats = {
    totalSessions: 142,
    timeReading: '24h 36m',
    avgNPM: 52,
    avgAccuracy: 84,
  };

  if (!user) return null;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* User Profile Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <h1 className="text-3xl font-bold">
                  {user.firstName} {user.lastName}
                </h1>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start items-center">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    Joined {new Date(user.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{stats.totalSessions}</div>
                  <div className="text-xs text-muted-foreground">total sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">{stats.timeReading}</div>
                  <div className="text-xs text-muted-foreground">time reading</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="text-2xl">Performance Metrics</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                {user.role === 'teacher' && (
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'my' ? 'default' : 'outline'}
                      onClick={() => setViewMode('my')}
                      size="sm"
                    >
                      My Data
                    </Button>
                    <Button
                      variant={viewMode === 'class' ? 'default' : 'outline'}
                      onClick={() => setViewMode('class')}
                      size="sm"
                    >
                      Class Data
                    </Button>
                  </div>
                )}
                <Select value={interval} onChange={(e) => setInterval(e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  label={{ value: interval.charAt(0).toUpperCase() + interval.slice(1), position: 'insideBottom', offset: -5 }}
                />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '2px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="npm" stroke="hsl(var(--primary))" strokeWidth={3} name="Notes Per Minute" />
                <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--accent))" strokeWidth={3} name="Accuracy %" />
                <Line type="monotone" dataKey="sessions" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Sessions" />
                <Line type="monotone" dataKey="questions" stroke="hsl(var(--destructive))" strokeWidth={2} name="Total Questions" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Average NPM</p>
                  <p className="text-3xl font-bold text-primary">{stats.avgNPM}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                  <p className="text-3xl font-bold text-accent">{stats.avgAccuracy}%</p>
                </div>
                <div className="rounded-lg bg-accent/10 p-2">
                  <Target className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Time</p>
                  <p className="text-3xl font-bold">{stats.timeReading}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-3xl font-bold">{stats.totalSessions}</p>
                </div>
                <div className="rounded-lg bg-accent/10 p-2">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teacher Dashboard Section */}
        {user.role === 'teacher' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Teacher Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Number of Students</p>
                  <p className="font-medium text-primary">Coming soon</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Student management features will be available in a future update. You'll be able to view student progress,
                assign exercises, and track class performance.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
