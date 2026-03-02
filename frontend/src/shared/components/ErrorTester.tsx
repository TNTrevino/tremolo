import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { useToast } from "@/shared/hooks/useToast";
import {
	getErrorMessage,
	isAxiosError,
	isNetworkError,
} from "@/shared/utils/error.utils";
import { logger } from "@/lib/logger";
import axios from "axios";
import { AlertTriangle } from "lucide-react";

/**
 * ErrorTester Component
 *
 * A development utility component for testing error handling functionality.
 * This component demonstrates:
 * - Error Boundary error catching
 * - Toast notifications
 * - API error handling
 * - Error utility functions
 *
 * To use: Add this component to a page during development
 * <ErrorBoundary>
 *   <ErrorTester />
 * </ErrorBoundary>
 */
export function ErrorTester() {
	const { showSuccess, showError, showWarning, showInfo, showToast } =
		useToast();
	const [shouldThrow, setShouldThrow] = useState(false);

	// This will be caught by ErrorBoundary
	if (shouldThrow) {
		throw new Error(
			"Test error: This error is intentionally thrown to test ErrorBoundary",
		);
	}

	const testToastSuccess = () => {
		showSuccess("This is a success message!", "Success");
	};

	const testToastError = () => {
		showError("This is an error message!", "Error");
	};

	const testToastWarning = () => {
		showWarning("This is a warning message!", "Warning");
	};

	const testToastInfo = () => {
		showInfo("This is an info message!", "Info");
	};

	const testErrorBoundary = () => {
		setShouldThrow(true);
	};

	const testApiError = async () => {
		try {
			// This will fail with a 404
			await axios.get("https://jsonplaceholder.typicode.com/posts/999999999");
		} catch (error) {
			logger.error("ErrorTester: API error test", error);
			showError(getErrorMessage(error), "API Error");

			logger.info("Is Axios Error:", isAxiosError(error));
			logger.info("Is Network Error:", isNetworkError(error));
		}
	};

	const testNetworkError = async () => {
		try {
			// This will fail with a network error
			await axios.get("https://this-domain-does-not-exist-12345.com/api/test", {
				timeout: 1000,
			});
		} catch (error) {
			logger.error("ErrorTester: network error test", error);
			showError(getErrorMessage(error), "Network Error");

			logger.info("Is Axios Error:", isAxiosError(error));
			logger.info("Is Network Error:", isNetworkError(error));
		}
	};

	const testMultipleToasts = () => {
		showInfo("First toast");
		setTimeout(() => showSuccess("Second toast"), 500);
		setTimeout(() => showWarning("Third toast"), 1000);
		setTimeout(() => showError("Fourth toast"), 1500);
	};

	const testLongDurationToast = () => {
		showToast(
			"This toast will stay for 10 seconds",
			"info",
			"Long Duration",
			10000,
		);
	};

	return (
		<div className="container mx-auto p-6 max-w-4xl">
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
							<AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
						</div>
						<CardTitle className="text-2xl">Error Handling Tester</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 p-4">
						<p className="text-sm text-orange-900 dark:text-orange-100">
							This is a development tool for testing error handling. Check the
							browser console to see logged errors and error metadata.
						</p>
					</div>

					{/* Toast Tests */}
					<div className="space-y-3">
						<h3 className="font-semibold text-lg">Toast Notifications</h3>
						<div className="grid grid-cols-2 gap-2">
							<Button onClick={testToastSuccess} variant="default">
								Test Success Toast
							</Button>
							<Button onClick={testToastError} variant="destructive">
								Test Error Toast
							</Button>
							<Button onClick={testToastWarning} variant="outline">
								Test Warning Toast
							</Button>
							<Button onClick={testToastInfo} variant="outline">
								Test Info Toast
							</Button>
							<Button onClick={testMultipleToasts} variant="secondary">
								Test Multiple Toasts
							</Button>
							<Button onClick={testLongDurationToast} variant="secondary">
								Test Long Duration (10s)
							</Button>
						</div>
					</div>

					{/* Error Boundary Tests */}
					<div className="space-y-3">
						<h3 className="font-semibold text-lg">Error Boundary</h3>
						<div className="grid grid-cols-1 gap-2">
							<Button onClick={testErrorBoundary} variant="destructive">
								Test Error Boundary (Will Crash Component)
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							This will throw an error that should be caught by the
							ErrorBoundary
						</p>
					</div>

					{/* API Error Tests */}
					<div className="space-y-3">
						<h3 className="font-semibold text-lg">API Error Handling</h3>
						<div className="grid grid-cols-2 gap-2">
							<Button onClick={testApiError} variant="outline">
								Test API Error (404)
							</Button>
							<Button onClick={testNetworkError} variant="outline">
								Test Network Error
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							Check the browser console to see error logging and metadata
						</p>
					</div>

					{/* Documentation Links */}
					<div className="space-y-3 pt-4 border-t">
						<h3 className="font-semibold text-lg">Documentation</h3>
						<ul className="text-sm space-y-1 text-muted-foreground">
							<li>
								• Error utilities: <code>/src/shared/utils/error.utils.ts</code>
							</li>
							<li>
								• ErrorBoundary:{" "}
								<code>/src/shared/components/ErrorBoundary.tsx</code>
							</li>
							<li>
								• Toast hook: <code>/src/shared/hooks/useToast.tsx</code>
							</li>
							<li>
								• Examples:{" "}
								<code>/src/shared/utils/error-handling-examples.md</code>
							</li>
						</ul>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
