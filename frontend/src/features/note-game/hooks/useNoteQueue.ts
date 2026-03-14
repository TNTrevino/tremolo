import { useRef, useState, useCallback, useEffect } from "react";
import { musicService } from "@/services/api";
import type { NoteGameResponse } from "@/services/api/types";

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
	const [isInitializing, setIsInitializing] = useState(true);

	const hydrate = useCallback(
		async (count: number) => {
			if (inflightRef.current) return;
			inflightRef.current = true;

			try {
				const promises = Array.from({ length: count }, () =>
					musicService.generateNoteGame({ scale, octave }),
				);
				const results = await Promise.allSettled(promises);

				for (const result of results) {
					if (result.status === "fulfilled") {
						queueRef.current.push(result.value);
					}
				}
			} finally {
				inflightRef.current = false;
			}
		},
		[scale, octave],
	);

	useEffect(() => {
		if (!isReady) return;

		let cancelled = false;

		hydrate(HYDRATE_BATCH).then(() => {
			if (!cancelled) setIsInitializing(false);
		});

		return () => {
			cancelled = true;
		};
	}, [isReady, hydrate]);

	const pop = useCallback((): NoteGameResponse | null => {
		const item = queueRef.current.shift() ?? null;

		if (queueRef.current.length < QUEUE_LOW_WATER) {
			void hydrate(HYDRATE_BATCH);
		}

		return item;
	}, [hydrate]);

	return { pop, isInitializing };
}
