import { useCallback } from "react";
import { musicService } from "@/services/api";
import type { NoteGameResponse, RangeClef } from "@/services/api/types";
import { useQuestionQueue } from "@/features/identification-game";

export interface NoteRange {
	/** Lowest allowed note, natural (e.g. "F3") */
	lowNote: string;
	/** Highest allowed note, natural (e.g. "C6") */
	highNote: string;
	clef: RangeClef;
}

/**
 * Prefetch queue for note game responses.
 *
 * Thin wrapper over the generic useQuestionQueue with the note game
 * fetcher bound to the current scale/octave (and optionally a pitch
 * range). Changing any of them changes the fetcher identity, which
 * resets the queue.
 *
 * @param scale  - Tonic of the scale (e.g. "C", "D#")
 * @param octave - Octave as string (e.g. "4"); ignored when range is set
 * @param isReady - Gate flag; no fetches until the OSMD container is mounted
 * @param range  - Optional pitch range + clef (range mode)
 */
export function useNoteQueue(
	scale: string,
	octave: string,
	isReady: boolean,
	range?: NoteRange,
): {
	pop: () => NoteGameResponse | null;
	isInitializing: boolean;
} {
	const lowNote = range?.lowNote;
	const highNote = range?.highNote;
	const clef = range?.clef;

	const fetcher = useCallback(
		() =>
			musicService.generateNoteGame({
				scale,
				octave,
				...(lowNote && highNote ? { lowNote, highNote, clef } : {}),
			}),
		[scale, octave, lowNote, highNote, clef],
	);

	return useQuestionQueue<NoteGameResponse>(fetcher, isReady);
}
