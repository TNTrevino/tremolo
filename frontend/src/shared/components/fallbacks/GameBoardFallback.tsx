import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export interface GameBoardFallbackProps {
	/**
	 * Optional callback to restart the game
	 */
	onRestart?: () => void;
	/**
	 * Optional custom error message
	 */
	errorMessage?: string;
}

/**
 * GameBoardFallback - Fallback UI for game board errors
 *
 * Displays a user-friendly error message when the game board fails to load,
 * with an optional restart button.
 *
 * @example
 * ```tsx
 * <GameBoardFallback
 *   onRestart={() => window.location.reload()}
 *   errorMessage="Custom error message"
 * />
 * ```
 */
export function GameBoardFallback({
	onRestart,
	errorMessage = "Unable to load game",
}: GameBoardFallbackProps) {
	return (
		<Card className="min-h-[400px] flex items-center justify-center">
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
							An error occurred while loading the game board.
						</p>
					</div>
					{onRestart && (
						<Button onClick={onRestart} variant="default" className="mt-2">
							Restart Game
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
