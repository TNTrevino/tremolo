import type { ReactNode } from "react";
import { getErrorMessage } from "@/shared/utils/error.utils";

export interface QueryStateProps {
	isLoading: boolean;
	isError: boolean;
	error?: unknown;
	/** Shown instead of `getErrorMessage(error)` when there's no error object to read from. */
	errorFallback?: string;
	/** Caller-owned skeleton, rendered as-is while `isLoading`. */
	loading: ReactNode;
	isEmpty: boolean;
	/** Caller-owned empty state, rendered as-is when not loading/erroring and `isEmpty`. */
	empty: ReactNode;
	children: ReactNode;
}

/**
 * Collapses the isLoading/isError/isEmpty/populated ternary repeated across
 * the classes feature's list views into one place. Loading and empty
 * states stay fully caller-owned (each view's skeleton/copy differs);
 * only the error state is standardized here, on `getErrorMessage` so
 * every list shows a consistently friendly message instead of a raw
 * `error.message`.
 */
export function QueryState({
	isLoading,
	isError,
	error,
	errorFallback,
	loading,
	isEmpty,
	empty,
	children,
}: QueryStateProps) {
	if (isLoading) return <>{loading}</>;

	if (isError) {
		const message = error ? getErrorMessage(error) : errorFallback;
		return (
			<div className="flex items-center justify-center h-24">
				<p className="text-sm text-destructive">{message}</p>
			</div>
		);
	}

	if (isEmpty) return <>{empty}</>;

	return <>{children}</>;
}
