import { useSyncExternalStore } from "react";

const QUERIES = {
	mobile: "(max-width: 767px)",
	phoneLandscape: "(orientation: landscape) and (max-height: 500px)",
	desktop: "(min-width: 768px)",
} as const;

interface Breakpoint {
	isMobile: boolean;
	isPhoneLandscape: boolean;
	isDesktop: boolean;
}

let cachedSnapshot: Breakpoint = {
	isMobile: false,
	isPhoneLandscape: false,
	isDesktop: true,
};

function computeSnapshot(): Breakpoint {
	const phoneLandscape = window.matchMedia(QUERIES.phoneLandscape).matches;
	return {
		isMobile: window.matchMedia(QUERIES.mobile).matches && !phoneLandscape,
		isPhoneLandscape: phoneLandscape,
		isDesktop: window.matchMedia(QUERIES.desktop).matches && !phoneLandscape,
	};
}

function getSnapshot(): Breakpoint {
	return cachedSnapshot;
}

function getServerSnapshot(): Breakpoint {
	return cachedSnapshot;
}

function subscribe(callback: () => void): () => void {
	const mediaQueryLists = Object.values(QUERIES).map((q) =>
		window.matchMedia(q),
	);

	// Compute initial snapshot on subscribe
	cachedSnapshot = computeSnapshot();

	const handleChange = () => {
		const next = computeSnapshot();
		if (
			next.isMobile !== cachedSnapshot.isMobile ||
			next.isPhoneLandscape !== cachedSnapshot.isPhoneLandscape ||
			next.isDesktop !== cachedSnapshot.isDesktop
		) {
			cachedSnapshot = next;
			callback();
		}
	};

	for (const mql of mediaQueryLists) {
		mql.addEventListener("change", handleChange);
	}

	return () => {
		for (const mql of mediaQueryLists) {
			mql.removeEventListener("change", handleChange);
		}
	};
}

/**
 * Tracks viewport breakpoints via matchMedia so components can conditionally
 * render layout variants instead of hiding them with CSS.
 *
 * Returns mutually exclusive flags:
 * - isMobile: portrait phone/tablet below md (< 768px), not landscape
 * - isPhoneLandscape: landscape orientation with max-height 500px
 * - isDesktop: md+ screens that are not phone-landscape
 */
export function useBreakpoint(): Breakpoint {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
