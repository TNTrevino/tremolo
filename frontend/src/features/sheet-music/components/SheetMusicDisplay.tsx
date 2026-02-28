import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOSMD } from "@/features/sheet-music/hooks";
import { ComponentErrorBoundary } from "@/shared/components/ComponentErrorBoundary";
import { SheetMusicFallback } from "@/shared/components/fallbacks";

export interface SheetMusicDisplayProps {
	/**
	 * MusicXML string to render
	 */
	musicXml: string;
	/**
	 * Optional CSS class name for the container
	 */
	className?: string;
	/**
	 * Callback when rendering completes successfully
	 */
	onRenderComplete?: () => void;
	/**
	 * Callback when an error occurs
	 */
	onError?: (error: Error) => void;
}

/**
 * Sheet Music Display Component (Internal)
 *
 * A reusable component that wraps OpenSheetMusicDisplay (OSMD) rendering
 * with loading and error states. Uses the useOSMD hook for managing the
 * OSMD lifecycle and provides a consistent UI with shadcn/ui components.
 *
 * This component is wrapped with an error boundary for additional safety.
 */
const SheetMusicDisplayInternal = ({
	musicXml,
	className,
	onRenderComplete,
	onError,
}: SheetMusicDisplayProps) => {
	const { loadAndRender, isLoading, error, containerRef } = useOSMD({
		onRenderComplete,
		onError,
	});

	// Auto-load when musicXml changes
	useEffect(() => {
		if (musicXml) {
			loadAndRender(musicXml);
		}
	}, [musicXml, loadAndRender]);

	return (
		<Card className={className}>
			<CardContent className="p-6">
				{/* Error State */}
				{error && (
					<div className="bg-destructive/10 border-2 border-destructive/50 rounded-lg p-4">
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 mt-0.5">
								<svg
									className="w-5 h-5 text-destructive"
									fill="none"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
							</div>
							<div className="flex-1">
								<h3 className="font-semibold text-destructive mb-1">
									Failed to render sheet music
								</h3>
								<p className="text-sm text-destructive/80">{error.message}</p>
							</div>
						</div>
					</div>
				)}

				{/* Loading State */}
				{isLoading && !error && (
					<div className="space-y-4">
						<div className="flex items-center justify-center gap-3 text-muted-foreground">
							<svg
								className="animate-spin h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								/>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
							<span className="text-sm font-medium">
								Loading sheet music...
							</span>
						</div>
						<Skeleton className="w-full h-[400px] rounded-md" />
					</div>
				)}

				{/* Sheet Music Container */}
				<div
					ref={containerRef}
					className={`min-h-[200px] ${isLoading || error ? "hidden" : ""}`}
					aria-label="Sheet music display"
				/>
			</CardContent>
		</Card>
	);
};

/**
 * Sheet Music Display Component
 *
 * A reusable component that wraps OpenSheetMusicDisplay (OSMD) rendering
 * with loading and error states, protected by an error boundary.
 *
 * @example
 * ```tsx
 * <SheetMusicDisplay
 *   musicXml={musicXmlString}
 *   onRenderComplete={() => console.log("Rendered!")}
 *   onError={(err) => console.error(err)}
 * />
 * ```
 */
const SheetMusicDisplay = (props: SheetMusicDisplayProps) => {
	return (
		<ComponentErrorBoundary
			fallback={<SheetMusicFallback />}
			onError={(error) => {
				console.error("SheetMusicDisplay error boundary caught:", error);
				props.onError?.(error);
			}}
		>
			<SheetMusicDisplayInternal {...props} />
		</ComponentErrorBoundary>
	);
};

export default SheetMusicDisplay;
