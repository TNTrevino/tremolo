import type { ErrorInfo, ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

export interface ComponentErrorBoundaryProps {
	/**
	 * Child components to wrap with error boundary
	 */
	children: ReactNode;
	/**
	 * Custom fallback UI to display when an error occurs
	 */
	fallback?: ReactNode;
	/**
	 * Callback function to handle errors
	 */
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * ComponentErrorBoundary - A lightweight wrapper around ErrorBoundary
 * for component-level error handling.
 *
 * This provides an easier-to-use interface for wrapping individual components
 * with error boundaries, rather than wrapping entire app sections.
 *
 * @example
 * ```tsx
 * <ComponentErrorBoundary
 *   fallback={<MyCustomFallback />}
 *   onError={(error) => console.error("Component error:", error)}
 * >
 *   <RiskyComponent />
 * </ComponentErrorBoundary>
 * ```
 */
export function ComponentErrorBoundary({
	children,
	fallback,
	onError,
}: ComponentErrorBoundaryProps) {
	return (
		<ErrorBoundary fallback={fallback} onError={onError}>
			{children}
		</ErrorBoundary>
	);
}
