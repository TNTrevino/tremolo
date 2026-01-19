import { useState, useCallback } from "react";
import { logError, getErrorMessage } from "@/shared/utils/error.utils";
import { useToast } from "./useToast";

/**
 * Options for executing an async function with error handling
 */
export interface ExecuteOptions<T> {
	/**
	 * Context for logging (e.g., "SheetMusicPage.generateMary")
	 */
	context?: string;

	/**
	 * Callback executed after successful completion
	 */
	onSuccess?: (result: T) => void;

	/**
	 * Optional error handler override
	 */
	onError?: (error: Error) => void;

	/**
	 * Whether to show an error toast (default: false)
	 */
	showToast?: boolean;
}

/**
 * Return type for the useAsyncHandler hook
 */
export interface AsyncHandlerReturn {
	/**
	 * Executes an async function with error handling
	 */
	execute: <T>(
		fn: () => Promise<T>,
		options?: ExecuteOptions<T>,
	) => Promise<T | void>;

	/**
	 * Current loading state
	 */
	isLoading: boolean;

	/**
	 * Current error state
	 */
	error: Error | null;
}

/**
 * Centralized async handler hook that wraps try/catch patterns
 * with automatic error handling, logging, and loading states
 *
 * @example
 * ```tsx
 * const { execute, isLoading, error } = useAsyncHandler();
 *
 * const handleSubmit = async () => {
 *   await execute(
 *     () => api.submitData(formData),
 *     {
 *       context: "MyComponent.handleSubmit",
 *       onSuccess: (result) => console.log("Success!", result),
 *       showToast: true
 *     }
 *   );
 * };
 * ```
 */
export function useAsyncHandler(): AsyncHandlerReturn {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const { showError } = useToast();

	const execute = useCallback(
		async <T>(
			fn: () => Promise<T>,
			options?: ExecuteOptions<T>,
		): Promise<T | void> => {
			const { context, onSuccess, onError, showToast = false } = options ?? {};

			setIsLoading(true);
			setError(null);

			try {
				const result = await fn();

				// Call success callback if provided
				if (onSuccess) {
					onSuccess(result);
				}

				return result;
			} catch (err) {
				// Log the error with context
				logError(err, context);

				// Convert to Error type
				const errorObj =
					err instanceof Error ? err : new Error(getErrorMessage(err));

				// Handle error
				if (onError) {
					// Use custom error handler
					onError(errorObj);
				} else {
					// Update error state
					setError(errorObj);
				}

				// Show toast if requested
				if (showToast) {
					showError(getErrorMessage(errorObj), "Error");
				}

				// Return void to indicate error
				return undefined;
			} finally {
				setIsLoading(false);
			}
		},
		[showError],
	);

	return {
		execute,
		isLoading,
		error,
	};
}
