import { useRef, useState, useCallback, useEffect } from "react";
import { useToast } from "@/shared/hooks/useToast";

const QUEUE_LOW_WATER = 2;
const HYDRATE_BATCH = 2;
/**
 * Fetcher-change resets (settings clicks, range drags) are debounced so
 * a burst of changes costs one refetch instead of one per click.
 */
const RESET_DEBOUNCE_MS = 300;

/**
 * Prefetch queue for identification game questions.
 *
 * Keeps a small buffer of pre-fetched questions so the next one can be
 * displayed instantly after the player answers. Uses a plain FIFO queue
 * backed by a ref (no re-renders on queue mutation).
 *
 * Generic over the response type — pass a fetcher that hits the music
 * microservice. The fetcher's identity is a dependency: memoize it
 * (useCallback) on the settings it closes over so the queue resets when
 * those settings change.
 *
 * @param fetcher - Fetches one question from the backend
 * @param isReady - Gate flag; no fetches until the display is mounted
 */
export function useQuestionQueue<T>(
	fetcher: () => Promise<T>,
	isReady: boolean,
): {
	pop: () => T | null;
	isInitializing: boolean;
} {
	const queueRef = useRef<T[]>([]);
	const inflightRef = useRef(false);
	const generationRef = useRef(0);
	const hasHydratedRef = useRef(false);
	const [isInitializing, setIsInitializing] = useState(true);
	// showError is referentially stable: it's wrapped in useCallback inside
	// ToastProvider and only depends on showToast (which itself has zero deps).
	// Safe to include directly in dependency arrays without causing re-renders.
	const { showError } = useToast();

	const hydrate = useCallback(
		async (count: number, generation: number) => {
			if (inflightRef.current) return;
			inflightRef.current = true;

			try {
				const promises = Array.from({ length: count }, () => fetcher());
				const results = await Promise.allSettled(promises);

				if (generation !== generationRef.current) return;

				let anyFailed = false;
				for (const result of results) {
					if (result.status === "fulfilled") {
						queueRef.current.push(result.value);
					} else {
						anyFailed = true;
						console.error(
							"[useQuestionQueue] Question fetch failed:",
							result.reason,
						);
					}
				}

				if (anyFailed) {
					showError("Failed to load the next question. Please try again.");
				}
			} finally {
				inflightRef.current = false;
			}
		},
		[fetcher, showError],
	);

	useEffect(() => {
		if (!isReady) return;

		const generation = ++generationRef.current;
		queueRef.current = [];
		inflightRef.current = false;
		setIsInitializing(true);

		let cancelled = false;

		const run = () => {
			hydrate(HYDRATE_BATCH, generation)
				.then(() => {
					if (!cancelled) setIsInitializing(false);
				})
				.catch((err) => {
					if (!cancelled) {
						setIsInitializing(false);
						showError("Failed to load questions. Please refresh.");
						console.error("[useQuestionQueue] Initial hydration failed", err);
					}
				});
		};

		// First hydration fires immediately; later fetcher changes are
		// debounced (the queue is already cleared above, so no stale
		// question can be served in the meantime).
		if (!hasHydratedRef.current) {
			hasHydratedRef.current = true;
			run();
			return () => {
				cancelled = true;
			};
		}

		const timer = setTimeout(run, RESET_DEBOUNCE_MS);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [isReady, hydrate, showError]);

	const pop = useCallback((): T | null => {
		const item = queueRef.current.shift() ?? null;

		if (item !== null && queueRef.current.length < QUEUE_LOW_WATER) {
			void hydrate(HYDRATE_BATCH, generationRef.current);
		}

		return item;
	}, [hydrate]);

	return { pop, isInitializing };
}
