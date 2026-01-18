import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Target, Award, School, Music, TrendingUp } from 'lucide-react';

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-lg">
            View and manage your personal information and preferences
          </p>
        </div>

        {/* User Profile Header */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="w-32 h-32 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-4xl font-bold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="flex-1 text-center md:text-left space-y-3">
                <h2 className="text-3xl font-bold">
                  {user.firstName} {user.lastName}
                </h2>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{user.email}</p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposed Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Personal Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Edit name and avatar</li>
                <li>• Update email address</li>
                <li>• Set school affiliation</li>
                <li>• Choose primary instrument</li>
                <li>• Select grade level (students)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2">
                  <Music className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Practice Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Set default game mode</li>
                <li>• Choose preferred scales</li>
                <li>• Select difficulty level</li>
                <li>• Configure notifications</li>
                <li>• Set practice reminders</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Practice Goals</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Set weekly session targets</li>
                <li>• Track accuracy goals</li>
                <li>• Monitor speed improvements</li>
                <li>• Build practice streaks</li>
                <li>• Celebrate milestones</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2">
                  <Award className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Achievements & Badges</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• First Session badge</li>
                <li>• Perfect Score achievements</li>
                <li>• Speed Demon milestone</li>
                <li>• Consistency rewards</li>
                <li>• Scale Master completion</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Detailed Statistics</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• All-time performance stats</li>
                <li>• Performance by scale</li>
                <li>• Performance by octave</li>
                <li>• Strongest/weakest areas</li>
                <li>• Practice streak tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2">
                  <School className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Connections</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Link with teachers</li>
                <li>• Connect parent accounts</li>
                <li>• Manage student access</li>
                <li>• Share progress reports</li>
                <li>• Collaborate on goals</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Notice */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground">
              Profile customization and detailed analytics features are currently in development.
              Check back soon for updates!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
