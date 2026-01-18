import type { ErrorInfo, ReactNode } from "react";
import type React from "react";
import { Component } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { getErrorMessage, logError } from "@/shared/utils/error.utils";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component catches JavaScript errors in child components,
 * logs them, and displays a fallback UI instead of crashing the app.
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	/**
	 * Update state so the next render will show the fallback UI
	 */
	static getDerivedStateFromError(error: Error): Partial<State> {
		return {
			hasError: true,
			error,
		};
	}

	/**
	 * Log error details for debugging
	 */
	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Log the error with context
		logError(error, "ErrorBoundary");

		// Log component stack trace
		console.error("Component stack trace:", errorInfo.componentStack);

		// Store error info in state
		this.setState({ errorInfo });

		// Call optional error handler
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}
	}

	/**
	 * Reset error boundary state
	 */
	handleReset = (): void => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	/**
	 * Reload the entire page
	 */
	handleReload = (): void => {
		window.location.reload();
	};

	/**
	 * Navigate to home page
	 */
	handleGoHome = (): void => {
		window.location.href = "/";
	};

	render(): ReactNode {
		const { hasError, error, errorInfo } = this.state;
		const { children, fallback } = this.props;

		if (hasError) {
			// Use custom fallback if provided
			if (fallback) {
				return fallback;
			}

			// Default error UI
			const errorMessage = error
				? getErrorMessage(error)
				: "An unexpected error occurred";
			const isDevelopment = import.meta.env.DEV;

			return (
				<div className="min-h-screen flex items-center justify-center bg-background p-4">
					<Card className="w-full max-w-2xl">
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
									<AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
								</div>
								<CardTitle className="text-2xl">Something went wrong</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-muted-foreground">
								We&apos;re sorry, but something unexpected happened. The error has
								been logged and we&apos;ll look into it.
							</p>

							{/* Error message */}
							<div className="rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-4">
								<p className="text-sm font-mono text-red-900 dark:text-red-100">
									{errorMessage}
								</p>
							</div>

							{/* Development-only stack trace */}
							{isDevelopment && error?.stack && (
								<details className="rounded-lg bg-muted p-4">
									<summary className="cursor-pointer text-sm font-semibold mb-2">
										Stack Trace (Development Only)
									</summary>
									<pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
										{error.stack}
									</pre>
								</details>
							)}

							{/* Development-only component stack */}
							{isDevelopment && errorInfo?.componentStack && (
								<details className="rounded-lg bg-muted p-4">
									<summary className="cursor-pointer text-sm font-semibold mb-2">
										Component Stack (Development Only)
									</summary>
									<pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
										{errorInfo.componentStack}
									</pre>
								</details>
							)}

							{/* Action buttons */}
							<div className="flex flex-wrap gap-3 pt-2">
								<Button
									onClick={this.handleReset}
									variant="default"
									className="gap-2"
								>
									<RefreshCw className="h-4 w-4" />
									Try Again
								</Button>
								<Button
									onClick={this.handleReload}
									variant="outline"
									className="gap-2"
								>
									<RefreshCw className="h-4 w-4" />
									Reload Page
								</Button>
								<Button
									onClick={this.handleGoHome}
									variant="outline"
									className="gap-2"
								>
									<Home className="h-4 w-4" />
									Go Home
								</Button>
							</div>

							{/* Additional help */}
							<p className="text-xs text-muted-foreground pt-4">
								If this problem persists, please try clearing your browser cache
								or contact support.
							</p>
						</CardContent>
					</Card>
				</div>
			);
		}

		return children;
	}
}

/**
 * Higher-order component to wrap any component with an error boundary
 *
 * Usage:
 * const SafeComponent = withErrorBoundary(MyComponent);
 */
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	fallback?: ReactNode,
): React.ComponentType<P> {
	return function WithErrorBoundaryComponent(props: P) {
		return (
			<ErrorBoundary fallback={fallback}>
				<Component {...props} />
			</ErrorBoundary>
		);
	};
}
