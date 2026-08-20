import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import type { GeneratedQuestion } from "../types";

export interface UseQuestionLoaderOptions<T extends GeneratedQuestion> {
	/** Length of the answer log; a new question loads when it changes */
	answersLength: number;
	isDisplayReady: boolean;
	isInitializing: boolean;
	/** Pops the next prefetched question off the queue */
	pop: () => T | null;
	/** Renders MusicXML into the mounted OSMD container */
	loadNote: (xml: string) => Promise<void>;
	/** Extracts the correct answer from a fetched question */
	getAnswer: (question: T) => string;
	/** Called with the correct answer once its question is displayed */
	onQuestionLoaded: (answer: string) => void;
}

/**
 * Pops the next question whenever the answer count changes, renders it
 * through OSMD, and reports the correct answer for the displayed
 * question. On render failure it flips `loadError` (the display falls
 * back to text) but still reports the answer so the game continues.
 *
 * Shared by QuestionBoard and the note game's GameBoard.
 */
export function useQuestionLoader<T extends GeneratedQuestion>({
	answersLength,
	isDisplayReady,
	isInitializing,
	pop,
	loadNote,
	getAnswer,
	onQuestionLoaded,
}: UseQuestionLoaderOptions<T>): { loadError: boolean } {
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		if (!isDisplayReady || isInitializing) return;

		let cancelled = false;

		const loadNext = async () => {
			const question = pop();
			if (!question) {
				logger.warn("useQuestionQueue: pop() returned null -- queue was empty");
				return;
			}

			try {
				await loadNote(question.generatedXml);
				if (!cancelled) {
					setLoadError(false);
					onQuestionLoaded(getAnswer(question));
				}
			} catch (err) {
				if (!cancelled) {
					logger.error("Failed to render question in OSMD", err);
					setLoadError(true);
					onQuestionLoaded(getAnswer(question));
				}
			}
		};

		void loadNext();

		return () => {
			cancelled = true;
		};
	}, [
		answersLength,
		isDisplayReady,
		isInitializing,
		pop,
		loadNote,
		getAnswer,
		onQuestionLoaded,
	]);

	return { loadError };
}
