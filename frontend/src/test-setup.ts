/**
 * Global unit-test setup, run before every spec.
 *
 * `@angular/build:unit-test` initializes the TestBed itself, so unlike the
 * React app's `src/test/setup.ts` there is nothing to bootstrap here. It is
 * the single seam for global test configuration -- custom matchers and DOM
 * shims for the APIs jsdom does not implement.
 *
 * **`angular.json` sets `"isolate": true` on this target, and it is
 * load-bearing.** The builder's own default is `false` ("to align with the
 * Karma/Jasmine experience"), which gives every spec file a worker picks up
 * one shared module registry. Under that default a third-party module is
 * evaluated once per *worker*, so whichever spec happens to be scheduled
 * first decides what binding every later spec in that worker sees -- and a
 * `vi.mock()` in a spec that is not first silently does nothing. That is
 * what made `sheet-music-display.component.spec.ts` fail about one full-suite
 * run in four once four more specs began importing `SheetMusicComponent`
 * (Phase 5's F1; `.migration/phase-5-handoff.md`, fix addendum). With
 * isolation on, each spec file gets its own module registry and its own
 * mocks always apply. Do not turn it off without re-reading that addendum.
 */

/**
 * jsdom ships no `ResizeObserver`, and `SheetMusicComponent` uses one to
 * notice when a container that was hidden while OSMD drew into it gets a
 * width (see that component's `draw()`).
 *
 * The stub records its instances so a spec can fire the callback by hand:
 * jsdom reports `clientWidth` as 0 for everything, so there is no real
 * resize to observe and the observer would otherwise never be exercised.
 */
class ResizeObserverStub implements ResizeObserver {
	static instances: ResizeObserverStub[] = [];

	readonly observed: Element[] = [];
	disconnected = false;

	constructor(readonly callback: ResizeObserverCallback) {
		ResizeObserverStub.instances.push(this);
	}

	observe(target: Element): void {
		this.observed.push(target);
	}

	unobserve(): void {
		// Nothing observes selectively in this codebase.
	}

	disconnect(): void {
		this.disconnected = true;
	}

	/** Fires the callback as a real observer would. */
	fire(): void {
		this.callback([], this as unknown as ResizeObserver);
	}
}

globalThis.ResizeObserver ??= ResizeObserverStub;

/**
 * jsdom ships no `matchMedia` either, and `BreakpointService` builds three
 * media-query lists in its constructor -- so any spec whose component tree
 * reaches a game board, a score bar, the settings bar or the nav bar would
 * throw on injection rather than on anything it meant to test.
 *
 * Every query reports `false`, which is `BreakpointService`'s own initial
 * state: not mobile, not phone-landscape, desktop. That is also the viewport
 * the golden E2E specs run at, so a unit test and a Playwright run exercise
 * the same branch.
 *
 * A spec that needs another breakpoint overrides this itself **before**
 * `TestBed.inject(BreakpointService)`, or provides its own service -- the
 * real one reads its queries once, in its constructor.
 *
 * Phases 5 and 6 each hit this independently and wrote the same stub; this
 * is the single surviving copy.
 */
globalThis.matchMedia ??= ((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener: () => undefined,
	removeEventListener: () => undefined,
	addListener: () => undefined,
	removeListener: () => undefined,
	dispatchEvent: () => false,
})) as typeof globalThis.matchMedia;

export { ResizeObserverStub };
