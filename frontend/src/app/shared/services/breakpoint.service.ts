import {
	computed,
	DestroyRef,
	inject,
	Injectable,
	signal,
} from "@angular/core";

const QUERIES = {
	mobile: "(max-width: 767px)",
	phoneLandscape: "(orientation: landscape) and (max-height: 500px)",
	desktop: "(min-width: 768px)",
} as const;

/**
 * Port of frontend-react/src/shared/hooks/useBreakpoint.ts.
 *
 * React's `useSyncExternalStore` over `matchMedia` becomes three signals
 * over the same three media queries. The flags stay mutually exclusive:
 * phone-landscape wins, because a phone held sideways is neither the
 * mobile layout nor the desktop one -- that is what lets a game page swap
 * layout variants instead of hiding one with CSS.
 *
 * Root-provided: the queries are global, and one set of listeners is
 * cheaper than one per component.
 */
@Injectable({ providedIn: "root" })
export class BreakpointService {
	private readonly matches = signal({
		mobile: false,
		phoneLandscape: false,
		desktop: true,
	});

	readonly isPhoneLandscape = computed(() => this.matches().phoneLandscape);
	readonly isMobile = computed(
		() => this.matches().mobile && !this.matches().phoneLandscape,
	);
	readonly isDesktop = computed(
		() => this.matches().desktop && !this.matches().phoneLandscape,
	);

	constructor() {
		const lists = Object.entries(QUERIES).map(
			([key, query]) => [key, window.matchMedia(query)] as const,
		);

		const read = () => {
			this.matches.set({
				mobile: false,
				phoneLandscape: false,
				desktop: false,
				...Object.fromEntries(lists.map(([key, mql]) => [key, mql.matches])),
			});
		};

		read();

		for (const [, mql] of lists) mql.addEventListener("change", read);
		inject(DestroyRef).onDestroy(() => {
			for (const [, mql] of lists) mql.removeEventListener("change", read);
		});
	}
}
