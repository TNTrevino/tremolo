import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Mail, Key, Download, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export function AccountPage() {
  const { user, logoutUser } = useAuthStore();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!user) return null;

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock password update
    alert('Password update functionality coming soon!');
  };

  const handleDownloadData = () => {
    // Mock data download
    alert('Your data download will begin shortly. (Feature coming soon)');
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmation === user.email) {
      alert('Account deletion would occur here');
      logoutUser();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground text-lg">
            Manage your security, privacy, and account preferences
          </p>
        </div>

        {/* Account Security */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>Manage your password and authentication</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button type="submit">
                <Key className="mr-2 h-4 w-4" />
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Email Management */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/10 p-2">
                <Mail className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle>Email Management</CardTitle>
                <CardDescription>Update your email address</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Email</Label>
              <div className="text-lg font-medium">{user.email}</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Email change functionality coming soon. You&apos;ll be able to update your email
              address and verify the new address before the change takes effect.
            </p>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control your data visibility</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Privacy controls will allow you to manage:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Teacher access to your performance data</li>
              <li>• Parent visibility of practice sessions</li>
              <li>• Inclusion in class leaderboards</li>
              <li>• Email notification preferences</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/10 p-2">
                <Download className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle>Data & Privacy</CardTitle>
                <CardDescription>Download or delete your data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Download Your Data</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Get a copy of all your practice data, statistics, and account information in JSON
                format.
              </p>
              <Button variant="outline" onClick={handleDownloadData}>
                <Download className="mr-2 h-4 w-4" />
                Download All My Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="shadow-lg border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Delete Account</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete your account, there is no going back. All your data will be
                permanently removed.
              </p>
              <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete My Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Confirm Account Deletion</CardTitle>
                <CardDescription>This action cannot be undone</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  All your practice data, statistics, and account information will be permanently
                  deleted. Type your email address to confirm:
                </p>
                <Input
                  type="email"
                  placeholder={user.email}
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmation('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== user.email}
                    className="flex-1"
                  >
                    Permanently Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
