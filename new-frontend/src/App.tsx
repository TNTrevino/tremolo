import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Navigation } from '@/shared/components/layout/Navigation';
import { ProtectedRoute } from '@/shared/components/layout/ProtectedRoute';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { ToastProvider, useToast } from '@/shared/hooks/useToast';
import { ToastContainer } from '@/shared/components/ui/toast';

// Pages
import { HomePage } from '@/pages/HomePage';
import { AboutPage } from '@/pages/AboutPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { NoteGamePage } from '@/pages/NoteGamePage';
import { SheetMusicPage } from '@/pages/SheetMusicPage';
import { ConverterPage } from '@/pages/ConverterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AccountPage } from '@/pages/AccountPage';

/**
 * Toast container wrapper that connects to the toast context
 */
function ToastContainerWrapper() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <BrowserRouter>
              <div className="min-h-screen bg-background text-foreground">
                <Navigation />
                <ErrorBoundary>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/note-game" element={<NoteGamePage />} />
                    <Route path="/sheet-music" element={<SheetMusicPage />} />
                    <Route path="/convert" element={<ConverterPage />} />

                    {/* Protected Routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/account"
                      element={
                        <ProtectedRoute>
                          <AccountPage />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </ErrorBoundary>
                <ToastContainerWrapper />
              </div>
              </BrowserRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
