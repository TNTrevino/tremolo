import { Card } from "@/shared/components/ui/card";
import { useBreakpoint } from "@/shared/hooks";
import { useNoteGameDisplay } from "@/features/note-game-display";
import { ComponentErrorBoundary } from "@/shared/components/ComponentErrorBoundary";
import { GameBoardFallback } from "@/shared/components/fallbacks";
import { logger } from "@/lib/logger";
import { useThemeStore } from "@/stores/theme.store";
import { useQuestionQueue } from "../hooks/useQuestionQueue";
import { useQuestionLoader } from "../hooks/useQuestionLoader";
import type { NoteAnswer, GeneratedQuestion } from "../types";

export interface QuestionBoardProps<T extends GeneratedQuestion> {
	/** Answer log; a new question is loaded whenever its length changes */
	answers: NoteAnswer[];
	/** Fetches one question (memoize on the settings it closes over) */
	fetcher: () => Promise<T>;
	/** Extracts the correct answer from a fetched question */
	getAnswer: (question: T) => string;
	/** Called with the correct answer once its question is displayed */
	onQuestionLoaded: (answer: string) => void;
	/** Answer input UI rendered below the staff */
	answerPad: React.ReactNode;
	/** Fallback text when sheet music fails to render */
	currentAnswerLabel?: string;
	/** OSMD zoom (chords/scales need to fit more content than one note) */
	zoom?: number;
}

export interface QuestionDisplayProps {
	fallbackLabel: string;
	containerRef: React.RefObject<HTMLDivElement>;
	isInitializing: boolean;
	loadError: boolean;
	className?: string;
	/** Size of the text fallback (the note game shows one huge letter) */
	fallbackTextClassName?: string;
}

/**
 * The OSMD staff card: loading overlay while the display initializes,
 * text fallback when MusicXML fails to render. Shared by QuestionBoard
 * and the note game's GameBoard layouts.
 */
export function QuestionDisplay({
	fallbackLabel,
	containerRef,
	isInitializing,
	loadError,
	className = "",
	fallbackTextClassName = "text-5xl",
}: QuestionDisplayProps) {
	return (
		<div className={className}>
			{loadError ? (
				<Card className="h-full flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
					<div className="text-center space-y-4">
						<div className="text-destructive font-medium">
							Failed to load sheet music
						</div>
						<div className="text-sm text-muted-foreground">
							Falling back to text display
						</div>
						<div
							className={`${fallbackTextClassName} font-bold text-primary animate-fade-in`}
						>
							{fallbackLabel}
						</div>
					</div>
				</Card>
			) : (
				<Card className="h-full relative flex items-center justify-center overflow-hidden">
					{isInitializing && (
						<div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
							<div className="text-center text-muted-foreground">
								Loading sheet music...
							</div>
						</div>
					)}
					<div
						ref={containerRef}
						className="w-full h-full overflow-hidden"
						aria-label="Music staff"
					/>
				</Card>
			)}
		</div>
	);
}

function QuestionBoardInternal<T extends GeneratedQuestion>({
	answers,
	fetcher,
	getAnswer,
	onQuestionLoaded,
	answerPad,
	currentAnswerLabel = "",
	zoom = 1.4,
}: QuestionBoardProps<T>) {
	const { isMobile } = useBreakpoint();
	const theme = useThemeStore((s) => s.theme);

	const {
		containerRef,
		loadNote,
		isReady: isDisplayReady,
	} = useNoteGameDisplay({
		darkMode: theme === "dark",
		zoom,
	});

	const { pop, isInitializing } = useQuestionQueue(fetcher, isDisplayReady);

	const { loadError } = useQuestionLoader({
		answersLength: answers.length,
		isDisplayReady,
		isInitializing,
		pop,
		loadNote,
		getAnswer,
		onQuestionLoaded,
	});

	const displayClassName = isMobile
		? "flex-1 min-h-0 max-h-[45vh]"
		: "flex-1 min-h-0";

	return (
		<div className="flex flex-col flex-1 min-h-0 gap-2 sm:gap-4">
			<QuestionDisplay
				fallbackLabel={currentAnswerLabel}
				containerRef={containerRef}
				isInitializing={isInitializing}
				loadError={loadError}
				className={displayClassName}
			/>
			{answerPad}
		</div>
	);
}

/**
 * Generic game board for identification games: renders the fetched
 * question as sheet music (OSMD) with the game's answer pad below it.
 * Wrapped with an error boundary like the note game's GameBoard.
 */
export function QuestionBoard<T extends GeneratedQuestion>(
	props: QuestionBoardProps<T>,
) {
	return (
		<ComponentErrorBoundary
			fallback={
				<GameBoardFallback
					onRestart={() => window.location.reload()}
					errorMessage="Game board encountered an error"
				/>
			}
			onError={(error) => {
				logger.error("QuestionBoard error boundary caught error", error);
			}}
		>
			<QuestionBoardInternal {...props} />
		</ComponentErrorBoundary>
	);
}
