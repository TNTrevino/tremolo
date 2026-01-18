import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navigation } from "@/shared/components/layout/Navigation";
import { ProtectedRoute } from "@/shared/components/layout/ProtectedRoute";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { ToastProvider, useToast } from "@/shared/hooks/useToast";
import { ToastContainer } from "@/shared/components/ui/toast";

// Pages - Regular imports for fast-loading pages
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";

// Pages - Lazy loaded for code splitting
const AboutPage = lazy(() =>
	import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })),
);
const SignupPage = lazy(() =>
	import("@/pages/SignupPage").then((m) => ({ default: m.SignupPage })),
);
const NoteGamePage = lazy(() =>
	import("@/pages/NoteGamePage").then((m) => ({ default: m.NoteGamePage })),
);
const SheetMusicPage = lazy(() =>
	import("@/pages/SheetMusicPage").then((m) => ({ default: m.SheetMusicPage })),
);
const ConverterPage = lazy(() =>
	import("@/pages/ConverterPage").then((m) => ({ default: m.ConverterPage })),
);
const DashboardPage = lazy(() =>
	import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const ProfilePage = lazy(() =>
	import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const AccountPage = lazy(() =>
	import("@/pages/AccountPage").then((m) => ({ default: m.AccountPage })),
);

/**
 * Loading fallback component for lazy-loaded pages
 */
const PageLoader = () => (
	<div className="flex items-center justify-center min-h-screen">
		<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
	</div>
);

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
										<Suspense fallback={<PageLoader />}>
											<Routes>
												{/* Public Routes */}
												<Route path="/" element={<HomePage />} />
												<Route path="/about" element={<AboutPage />} />
												<Route path="/login" element={<LoginPage />} />
												<Route path="/signup" element={<SignupPage />} />
												<Route path="/note-game" element={<NoteGamePage />} />
												<Route
													path="/sheet-music"
													element={<SheetMusicPage />}
												/>
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
										</Suspense>
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
