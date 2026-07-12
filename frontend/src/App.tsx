import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
	QueryClient,
	QueryClientProvider,
	QueryCache,
	MutationCache,
} from "@tanstack/react-query";
import { getErrorMessage } from "@/shared/utils/error.utils";

import { Navigation } from "@/shared/components/layout/Navigation";
import { ProtectedRoute } from "@/shared/components/layout/ProtectedRoute";
import { GuestRoute } from "@/shared/components/layout/GuestRoute";
import { TeacherRoute } from "@/shared/components/layout/TeacherRoute";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { ToastProvider, useToast } from "@/shared/hooks/useToast";
import { ToastContainer } from "@/shared/components/ui/toast";
import { useAuthStore } from "@/stores/auth.store";

// Pages - Regular imports for fast-loading pages
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { FriendsPanel } from "@/features/friends/components/FriendsPanel";

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
const KeySignatureGamePage = lazy(() =>
	import("@/pages/KeySignatureGamePage").then((m) => ({
		default: m.KeySignatureGamePage,
	})),
);
const IntervalGamePage = lazy(() =>
	import("@/pages/IntervalGamePage").then((m) => ({
		default: m.IntervalGamePage,
	})),
);
const ScaleGamePage = lazy(() =>
	import("@/pages/ScaleGamePage").then((m) => ({ default: m.ScaleGamePage })),
);
const ChordGamePage = lazy(() =>
	import("@/pages/ChordGamePage").then((m) => ({ default: m.ChordGamePage })),
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
const GoogleCallbackPage = lazy(() =>
	import("@/pages/GoogleCallbackPage").then((m) => ({
		default: m.GoogleCallbackPage,
	})),
);
const ClassesPage = lazy(() =>
	import("@/pages/ClassesPage").then((m) => ({ default: m.ClassesPage })),
);
const ClassDetailPage = lazy(() =>
	import("@/pages/ClassDetailPage").then((m) => ({
		default: m.ClassDetailPage,
	})),
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

/**
 * Creates the QueryClient with global error toasting via cache-level handlers.
 * Must be rendered inside ToastProvider so it can access useToast.
 */
function QueryProviderWithToast({ children }: { children: React.ReactNode }) {
	const { showError } = useToast();

	const [queryClient] = useState(
		() =>
			new QueryClient({
				queryCache: new QueryCache({
					onError: (error, query) => {
						if (query.meta?.suppressErrorToast) return;
						showError(
							getErrorMessage(error),
							query.meta?.errorTitle ?? "Something went wrong",
						);
					},
				}),
				mutationCache: new MutationCache({
					onError: (error, _vars, _ctx, mutation) => {
						if (mutation.meta?.suppressErrorToast) return;
						showError(
							getErrorMessage(error),
							mutation.meta?.errorTitle ?? "Something went wrong",
						);
					},
				}),
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000,
						refetchOnWindowFocus: false,
						retry: 1,
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

function AppContent() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<Navigation />
			<ErrorBoundary>
				<Suspense fallback={<PageLoader />}>
					<Routes>
						{/* Public Routes */}
						<Route path="/" element={<Navigate to="/note-game" replace />} />
						<Route path="/home" element={<HomePage />} />
						<Route path="/about" element={<AboutPage />} />
						<Route
							path="/login"
							element={
								<GuestRoute>
									<LoginPage />
								</GuestRoute>
							}
						/>
						<Route
							path="/signup"
							element={
								<GuestRoute>
									<SignupPage />
								</GuestRoute>
							}
						/>
						<Route path="/note-game" element={<NoteGamePage />} />
						<Route
							path="/key-signature-game"
							element={<KeySignatureGamePage />}
						/>
						<Route path="/interval-game" element={<IntervalGamePage />} />
						<Route path="/scale-game" element={<ScaleGamePage />} />
						<Route path="/chord-game" element={<ChordGamePage />} />
						<Route path="/sheet-music" element={<SheetMusicPage />} />
						<Route path="/convert" element={<ConverterPage />} />
						<Route
							path="/auth/google/callback"
							element={<GoogleCallbackPage />}
						/>

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
						<Route
							path="/classes"
							element={
								<TeacherRoute>
									<ClassesPage />
								</TeacherRoute>
							}
						/>
						<Route
							path="/classes/:id"
							element={
								<TeacherRoute>
									<ClassDetailPage />
								</TeacherRoute>
							}
						/>
					</Routes>
				</Suspense>
			</ErrorBoundary>
			{isAuthenticated && <FriendsPanel />}
			<ToastContainerWrapper />
		</div>
	);
}

function App() {
	return (
		<ErrorBoundary>
			<ToastProvider>
				<QueryProviderWithToast>
					<BrowserRouter>
						<AppContent />
					</BrowserRouter>
				</QueryProviderWithToast>
			</ToastProvider>
		</ErrorBoundary>
	);
}

export { App };
