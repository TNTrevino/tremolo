import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { useBreakpoint } from "@/shared/hooks";
import { useNoteGameDisplay } from "@/features/note-game-display";
import { useNoteQueue } from "../hooks";
import type { NoteAnswer } from "../types";
import { NOTES } from "../types";
import { ComponentErrorBoundary } from "@/shared/components/ComponentErrorBoundary";
import { GameBoardFallback } from "@/shared/components/fallbacks";
import { logger } from "@/lib/logger";
import { useThemeStore } from "@/stores/theme.store";
import { DEFAULT_NOTE_TO_KEY_MAP } from "../hooks/useKeyboardInput";

export interface GameBoardProps {
	currentNote: string;
	answers: NoteAnswer[];
	onAnswer: (answer: string) => void;
	onNoteGenerated: (noteName: string) => void;
	scale: string;
	octave: number;
	keyBindings?: Record<string, string>;
}

const extractTonic = (scaleStr: string): string => {
	return scaleStr.split(" ")[0] ?? "C";
};

interface NoteDisplayProps {
	currentNote: string;
	containerRef: React.RefObject<HTMLDivElement>;
	isInitializing: boolean;
	loadError: boolean;
	className?: string;
}

function NoteDisplay({
	currentNote,
	containerRef,
	isInitializing,
	loadError,
	className = "",
}: NoteDisplayProps) {
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
						<div className="text-9xl font-bold text-primary animate-fade-in">
							{currentNote}
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
					<div ref={containerRef} className="w-full h-full overflow-hidden" />
				</Card>
			)}
		</div>
	);
}

export interface NoteButtonGridProps {
	onAnswer: (answer: string) => void;
	buttonHeight: string;
	keyBindings?: Record<string, string>;
}

export function NoteButtonGrid({
	onAnswer,
	buttonHeight,
	keyBindings,
}: NoteButtonGridProps) {
	const keyMap = keyBindings ?? DEFAULT_NOTE_TO_KEY_MAP;

	return (
		<Card className="flex-shrink-0 p-2 sm:p-4">
			<div className="grid grid-cols-7 gap-1.5 sm:gap-2">
				{NOTES.map((note) => {
					const noteKey = `${note}#`;
					const boundKey = keyMap[noteKey];
					return (
						<Button
							key={noteKey}
							variant="outline"
							onClick={() => onAnswer(noteKey)}
							className={`${buttonHeight} font-bold px-0 sm:px-2 flex flex-col items-center justify-center gap-0`}
						>
							<span>{noteKey}</span>
							{boundKey && (
								<span className="text-[10px] text-muted-foreground font-normal leading-none">
									{boundKey}
								</span>
							)}
						</Button>
					);
				})}
				{NOTES.map((note) => {
					const boundKey = keyMap[note];
					return (
						<Button
							key={note}
							variant="default"
							onClick={() => onAnswer(note)}
							className={`${buttonHeight} font-bold px-0 sm:px-2 flex flex-col items-center justify-center gap-0`}
						>
							<span>{note}</span>
							{boundKey && (
								<span className="text-[10px] text-muted-foreground font-normal leading-none">
									{boundKey}
								</span>
							)}
						</Button>
					);
				})}
				{NOTES.map((note) => {
					const noteKey = `${note}b`;
					const boundKey = keyMap[noteKey];
					return (
						<Button
							key={noteKey}
							variant="outline"
							onClick={() => onAnswer(noteKey)}
							className={`${buttonHeight} font-bold px-0 sm:px-2 flex flex-col items-center justify-center gap-0`}
						>
							<span>{noteKey}</span>
							{boundKey && (
								<span className="text-[10px] text-muted-foreground font-normal leading-none">
									{boundKey}
								</span>
							)}
						</Button>
					);
				})}
			</div>
		</Card>
	);
}

function useGameBoardCore({
	answers,
	onNoteGenerated,
	scale,
	octave,
}: {
	answers: NoteAnswer[];
	onNoteGenerated: (noteName: string) => void;
	scale: string;
	octave: number;
}) {
	const theme = useThemeStore((s) => s.theme);

	const {
		containerRef,
		loadNote,
		isReady: isDisplayReady,
	} = useNoteGameDisplay({
		darkMode: theme === "dark",
		zoom: 2.0,
	});

	const { pop, isInitializing } = useNoteQueue(
		extractTonic(scale),
		octave.toString(),
		isDisplayReady,
	);

	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		if (!isDisplayReady || isInitializing) return;

		let cancelled = false;

		const loadNext = async () => {
			const note = pop();
			if (!note) {
				logger.warn("useNoteQueue: pop() returned null -- queue was empty");
				return;
			}

			try {
				await loadNote(note.generatedXml);
				if (!cancelled) {
					setLoadError(false);
					onNoteGenerated(note.noteName);
				}
			} catch (err) {
				if (!cancelled) {
					logger.error("Failed to render note in OSMD", err);
					setLoadError(true);
					onNoteGenerated(note.noteName);
				}
			}
		};

		void loadNext();

		return () => {
			cancelled = true;
		};
	}, [
		answers.length,
		isDisplayReady,
		isInitializing,
		pop,
		loadNote,
		onNoteGenerated,
	]);

	return { containerRef, isInitializing, loadError };
}

export interface GameBoardLandscapeProps extends GameBoardProps {
	statusBar: React.ReactNode;
}

/**
 * Game board for phone landscape layout (Internal).
 * Two-row layout: top row has settings/score bar + note display side by side,
 * bottom row has the button grid spanning full width for bigger tap targets.
 */
const GameBoardLandscapeInternal = ({
	currentNote,
	answers,
	onAnswer,
	onNoteGenerated,
	scale,
	octave,
	statusBar,
	keyBindings,
}: GameBoardLandscapeProps) => {
	const { containerRef, isInitializing, loadError } = useGameBoardCore({
		answers,
		onNoteGenerated,
		scale,
		octave,
	});

	return (
		<div className="flex flex-col flex-1 min-h-0 gap-1.5">
			<div className="flex gap-1.5 min-h-0 flex-1">
				<div className="w-28 flex-shrink-0">{statusBar}</div>
				<NoteDisplay
					currentNote={currentNote}
					containerRef={containerRef}
					isInitializing={isInitializing}
					loadError={loadError}
					className="flex-1 min-h-0"
				/>
			</div>
			<NoteButtonGrid
				onAnswer={onAnswer}
				buttonHeight="h-8 text-xs"
				keyBindings={keyBindings}
			/>
		</div>
	);
};

export function GameBoardLandscape(props: GameBoardLandscapeProps) {
	return (
		<ComponentErrorBoundary
			fallback={
				<GameBoardFallback
					onRestart={() => window.location.reload()}
					errorMessage="Game board encountered an error"
				/>
			}
			onError={(error) => {
				logger.error("GameBoard error boundary caught error", error);
			}}
		>
			<GameBoardLandscapeInternal {...props} />
		</ComponentErrorBoundary>
	);
}

/**
 * Game board component for active gameplay (Internal)
 * Displays current note (as sheet music) and answer buttons in a vertical stack.
 *
 * On mobile portrait the note display is constrained so buttons get more room.
 */
const GameBoardInternal = ({
	currentNote,
	answers,
	onAnswer,
	onNoteGenerated,
	scale,
	octave,
	keyBindings,
}: GameBoardProps) => {
	const { isMobile } = useBreakpoint();

	const { containerRef, isInitializing, loadError } = useGameBoardCore({
		answers,
		onNoteGenerated,
		scale,
		octave,
	});

	const noteDisplayClassName = isMobile
		? "flex-1 min-h-0 max-h-[45vh]"
		: "flex-1 min-h-0";

	const buttonHeight = "h-11 sm:h-16 text-xs sm:text-lg";

	return (
		<div className="flex flex-col flex-1 min-h-0 gap-2 sm:gap-4">
			<NoteDisplay
				currentNote={currentNote}
				containerRef={containerRef}
				isInitializing={isInitializing}
				loadError={loadError}
				className={noteDisplayClassName}
			/>
			<NoteButtonGrid
				onAnswer={onAnswer}
				buttonHeight={buttonHeight}
				keyBindings={keyBindings}
			/>
		</div>
	);
};

/**
 * Game board component for active gameplay.
 * Wrapped with error boundary for enhanced error handling.
 */
export function GameBoard(props: GameBoardProps) {
	return (
		<ComponentErrorBoundary
			fallback={
				<GameBoardFallback
					onRestart={() => window.location.reload()}
					errorMessage="Game board encountered an error"
				/>
			}
			onError={(error) => {
				logger.error("GameBoard error boundary caught error", error);
			}}
		>
			<GameBoardInternal {...props} />
		</ComponentErrorBoundary>
	);
}
