import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export interface SheetMusicFallbackProps {
	/**
	 * Optional callback to retry rendering the sheet music
	 */
	onRetry?: () => void;
	/**
	 * Optional custom error message
	 */
	errorMessage?: string;
}

/**
 * SheetMusicFallback - Fallback UI for sheet music rendering errors
 *
 * Displays a user-friendly error message when sheet music fails to render,
 * with an optional retry button.
 *
 * @example
 * ```tsx
 * <SheetMusicFallback
 *   onRetry={() => window.location.reload()}
 *   errorMessage="Custom error message"
 * />
 * ```
 */
export function SheetMusicFallback({
	onRetry,
	errorMessage = "Unable to render sheet music",
}: SheetMusicFallbackProps) {
	return (
		<Card className="min-h-[300px] flex items-center justify-center">
			<CardContent className="p-6">
				<div className="flex flex-col items-center justify-center gap-4 text-center">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
						<AlertCircle className="h-8 w-8 text-destructive" />
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold text-foreground">
							{errorMessage}
						</h3>
						<p className="text-sm text-muted-foreground">
							An error occurred while rendering the sheet music display.
						</p>
					</div>
					{onRetry && (
						<Button onClick={onRetry} variant="outline" className="mt-2">
							Try Again
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
