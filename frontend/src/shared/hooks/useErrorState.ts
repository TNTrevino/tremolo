import { useState, useMemo, useCallback } from "react";
import { getErrorMessage } from "../utils/error.utils";

export interface UseErrorStateReturn {
	/** The full error object for debugging */
	error: Error | null;
	/** Extracted message for display */
	errorMessage: string | null;
	/** Set error state from any error type */
	setError: (error: Error | string | unknown) => void;
	/** Clear error state */
	clearError: () => void;
}

/**
 * Custom hook for managing error state with standardized error handling.
 *
 * This hook preserves the full Error object internally for debugging while
 * exposing a clean API for error handling in components.
 *
 * @example
 * ```tsx
 * import { useErrorState } from '@/shared/hooks/useErrorState';
 *
 * function MyComponent() {
 *   const { error, errorMessage, setError, clearError } = useErrorState();
 *
 *   const fetchData = async () => {
 *     try {
 *       clearError();
 *       const data = await api.getData();
 *     } catch (err) {
 *       setError(err); // Accepts Error, string, or unknown
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
 *       <button onClick={fetchData}>Fetch Data</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useErrorState(): UseErrorStateReturn {
	const [error, setErrorState] = useState<Error | null>(null);

	const setError = useCallback((error: Error | string | unknown) => {
		if (error instanceof Error) {
			setErrorState(error);
		} else if (typeof error === "string") {
			setErrorState(new Error(error));
		} else {
			// Use getErrorMessage to extract message, then create Error object
			const message = getErrorMessage(error);
			setErrorState(new Error(message));
		}
	}, []);

	const clearError = useCallback(() => {
		setErrorState(null);
	}, []);

	const errorMessage = useMemo(() => {
		return error ? getErrorMessage(error) : null;
	}, [error]);

	return {
		error,
		errorMessage,
		setError,
		clearError,
	};
}
