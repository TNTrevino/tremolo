/**
 * Error Type Definitions
 *
 * Standard error types for API responses.
 */

export interface ApiError {
	error: string;
	message?: string;
	status?: number;
}

export interface ApiResponse<T> {
	data?: T;
	error?: ApiError;
}
