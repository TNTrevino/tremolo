import { HttpErrorResponse } from "@angular/common/http";

/**
 * Port of frontend-react/src/shared/utils/error.utils.ts, rewritten around
 * `HttpErrorResponse` instead of `AxiosError`.
 *
 * The Go service answers errors as `{ "error": "Invalid credentials" }` and
 * occasionally adds `message`, so both are checked before falling back to the
 * status-code table. The wording of that table is carried over verbatim --
 * it is user-visible copy.
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof HttpErrorResponse) {
		const body = error.error as
			{ message?: string; error?: string } | string | null;

		if (body && typeof body === "object") {
			if (body.message) return body.message;
			if (body.error) return body.error;
		}

		// status 0 is Angular's "the request never reached the server".
		if (error.status === 0) {
			return "Network error. Please check your internet connection.";
		}

		return messageForStatus(error.status) ?? error.message;
	}

	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	if (error && typeof error === "object" && "message" in error) {
		return String((error as { message: unknown }).message);
	}

	return "An unexpected error occurred. Please try again.";
}

function messageForStatus(status: number): string | null {
	switch (status) {
		case 400:
			return "Bad request. Please check your input.";
		case 401:
			return "You are not authorized. Please log in.";
		case 403:
			return "You do not have permission to perform this action.";
		case 404:
			return "The requested resource was not found.";
		case 408:
			return "Request timeout. Please try again.";
		case 429:
			return "Too many requests. Please wait a moment.";
		case 500:
			return "Internal server error. Please try again later.";
		case 502:
			return "Bad gateway. The server is temporarily unavailable.";
		case 503:
			return "Service unavailable. Please try again later.";
		default:
			return status ? `Request failed with status ${status}` : null;
	}
}
