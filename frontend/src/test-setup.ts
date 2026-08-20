/**
 * Global unit-test setup, run before every spec.
 *
 * `@angular/build:unit-test` initializes the TestBed itself, so unlike the
 * React app's `src/test/setup.ts` there is nothing to bootstrap here. It is
 * the single seam for global test configuration -- custom matchers and DOM
 * shims for the APIs jsdom does not implement.
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

export { ResizeObserverStub };
