import { useRef, useState, useCallback, useEffect } from "react";
import { musicService } from "@/services/api";
import type { NoteGameResponse } from "@/services/api/types";
import { useToast } from "@/shared/hooks/useToast";

const QUEUE_LOW_WATER = 2;
const HYDRATE_BATCH = 2;

/**
 * Prefetch queue for note game responses.
 *
 * Keeps a small buffer of pre-fetched notes so the next note can be
 * displayed instantly after the player answers. Uses a plain FIFO queue
 * backed by a ref (no re-renders on queue mutation).
 *
 * @param scale  - Tonic of the scale (e.g. "C", "D#")
 * @param octave - Octave as string (e.g. "4")
 * @param isReady - Gate flag; no fetches until the OSMD container is mounted
 */
export function useNoteQueue(
	scale: string,
	octave: string,
	isReady: boolean,
): {
	pop: () => NoteGameResponse | null;
	isInitializing: boolean;
} {
	const queueRef = useRef<NoteGameResponse[]>([]);
	const inflightRef = useRef(false);
	const generationRef = useRef(0);
	const [isInitializing, setIsInitializing] = useState(true);
	const { showError } = useToast();

	const hydrate = useCallback(
		async (count: number, generation: number) => {
			if (inflightRef.current) return;
			inflightRef.current = true;

			try {
				const promises = Array.from({ length: count }, () =>
					musicService.generateNoteGame({ scale, octave }),
				);
				const results = await Promise.allSettled(promises);

				if (generation !== generationRef.current) return;

				let anyFailed = false;
				for (const result of results) {
					if (result.status === "fulfilled") {
						queueRef.current.push(result.value);
					} else {
						anyFailed = true;
						console.error("[useNoteQueue] Note fetch failed:", result.reason);
					}
				}

				if (anyFailed) {
					showError("Failed to load note. Please try again.");
				}
			} finally {
				inflightRef.current = false;
			}
		},
		[scale, octave, showError],
	);

	useEffect(() => {
		if (!isReady) return;

		const generation = ++generationRef.current;
		queueRef.current = [];
		inflightRef.current = false;
		setIsInitializing(true);

		let cancelled = false;

		hydrate(HYDRATE_BATCH, generation)
			.then(() => {
				if (!cancelled) setIsInitializing(false);
			})
			.catch((err) => {
				if (!cancelled) {
					setIsInitializing(false);
					showError("Failed to initialize note queue. Please refresh.");
					console.error("[useNoteQueue] Initial hydration failed", err);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [isReady, hydrate, showError]);

	const pop = useCallback((): NoteGameResponse | null => {
		const item = queueRef.current.shift() ?? null;

		if (item !== null && queueRef.current.length < QUEUE_LOW_WATER) {
			void hydrate(HYDRATE_BATCH, generationRef.current);
		}

		return item;
	}, [hydrate]);

	return { pop, isInitializing };
}
