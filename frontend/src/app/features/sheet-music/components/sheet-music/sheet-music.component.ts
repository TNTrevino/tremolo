import {
	ChangeDetectionStrategy,
	Component,
	effect,
	ElementRef,
	inject,
	input,
	OnDestroy,
	output,
	signal,
	viewChild,
} from "@angular/core";
import {
	type IOSMDOptions,
	OpenSheetMusicDisplay,
} from "opensheetmusicdisplay";

import { LoggerService } from "../../../../core/services/logger.service";

/**
 * OpenSheetMusicDisplay, wrapped for Angular.
 *
 * Port of frontend-react/src/features/sheet-music/hooks/useOSMD.ts. OSMD is
 * imperative and framework-agnostic, so this is a lifecycle wrapper and not
 * a rewrite: the load -> render -> report sequence, the swallow-and-report
 * error handling, and the "clear the instance, keep the component" semantics
 * of `clear()` are all the hook's, unchanged.
 *
 * What changes is only the shape of the state React held in `useState` and
 * `useRef`:
 *
 * - `isLoading` / `error` are signals, so a template reads them directly and
 *   zoneless change detection (D4) picks them up without a tick.
 * - `onRenderComplete` / `onError` are outputs.
 * - the container is a `viewChild`, so nothing can be rendered into before
 *   the view exists.
 * - the instance is disposed in `ngOnDestroy`. That hook is legitimate here:
 *   PLAN.md 5.6 bans `ngOnDestroy` for *unsubscribe bookkeeping*, and
 *   explicitly names disposing the OSMD instance as the case it is for.
 *   There is no subscription in this file.
 *
 * The component renders **only** the container div -- no card, no spinner,
 * no error panel. Chrome belongs to the caller, because the three callers
 * draw different chrome: `<app-sheet-music-display>` reproduces React's
 * card, and the game boards in Phases 5 and 6 draw their own overlay and
 * text fallback.
 *
 * ```html
 * <app-sheet-music #sheet [zoom]="1.4" (renderError)="onFailure($event)" />
 * ```
 * ```ts
 * readonly sheet = viewChild.required(SheetMusicComponent);
 * await this.sheet().loadAndRender(musicXml);
 * ```
 */
@Component({
	selector: "app-sheet-music",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<div
			#container
			[class]="containerClass()"
			[attr.aria-label]="ariaLabel()"
		></div>
	`,
})
export class SheetMusicComponent implements OnDestroy {
	private readonly logger = inject(LoggerService);

	private readonly containerRef =
		viewChild.required<ElementRef<HTMLDivElement>>("container");

	/**
	 * OSMD zoom factor. 1 is the library default; the identification games
	 * use 1.2-2.2 so a chord or a scale fits the staff card.
	 *
	 * Changing it re-renders in place -- OSMD keeps the loaded score, so
	 * this does not refetch anything.
	 */
	readonly zoom = input(1);

	/**
	 * Options handed to the OSMD constructor.
	 *
	 * React's `useOSMD` passed none, so the sheet-music and converter pages
	 * get OSMD's own defaults and this input stays unset there. It exists for
	 * the game boards, which need `drawingParameters: "compacttight"` and the
	 * various `draw*: false` flags. **Read once, when the instance is
	 * created**: later changes do not re-create it.
	 */
	readonly options = input<IOSMDOptions | undefined>(undefined);

	/**
	 * Accessible name on the container.
	 *
	 * The E2E harness finds the staff by this name
	 * (`e2e/support/app.ts`: `/^(Music staff|Sheet music display)$/`), so the
	 * two values it matches are acceptance criteria, not decoration.
	 */
	readonly ariaLabel = input("Sheet music display");

	/** Classes for the container div; the host has no box of its own. */
	readonly containerClass = input("");

	/** Fired after `render()` returns. React's `onRenderComplete`. */
	readonly renderComplete = output<void>();

	/** Fired for every failure `error` also records. React's `onError`. */
	readonly renderError = output<Error>();

	private readonly _isLoading = signal(false);
	private readonly _error = signal<Error | null>(null);

	/** True between the start of `loadAndRender` and its settling. */
	readonly isLoading = this._isLoading.asReadonly();

	/** The last failure, or null. Cleared by `loadAndRender` and `clear`. */
	readonly error = this._error.asReadonly();

	private osmd: OpenSheetMusicDisplay | null = null;

	/** Whether a score is loaded, so `render()` has something to draw. */
	private hasScore = false;

	/** Live only while waiting for a zero-width container to get a width. */
	private visibilityWatch: ResizeObserver | null = null;

	constructor() {
		effect(() => {
			const zoom = this.zoom();
			if (!this.osmd) return; // applied at construction instead
			this.osmd.zoom = zoom;
			if (this.hasScore) this.draw(this.osmd);
		});
	}

	/**
	 * Loads a MusicXML string and draws it.
	 *
	 * Never rejects: a failure sets `error`, emits `renderError` and
	 * resolves, exactly as the React hook's `.catch(...).finally(...)` did.
	 * Callers that need to know branch on the output or the signal.
	 */
	async loadAndRender(musicXml: string): Promise<void> {
		this._isLoading.set(true);
		this._error.set(null);

		const osmd = this.osmd ?? this.initialize();

		if (!osmd) {
			// `initialize` has already recorded why.
			this._isLoading.set(false);
			return;
		}

		try {
			await osmd.load(musicXml);
			this.hasScore = true;
			this.draw(osmd);
			this.renderComplete.emit();
		} catch (err) {
			this.logger.error("Failed to render sheet music", err);
			this.fail(err, "Failed to render sheet music");
		} finally {
			this._isLoading.set(false);
		}
	}

	/**
	 * Empties the display.
	 *
	 * Keeps the instance -- the next `loadAndRender` reuses it, which is what
	 * React's `clear()` did. `error` is reset; `isLoading` is not touched,
	 * because clearing mid-load would lie about a request still in flight.
	 */
	clear(): void {
		this.stopWatchingVisibility();
		if (this.osmd) {
			try {
				this.osmd.clear();
				this.hasScore = false;
			} catch (err) {
				this.logger.error("Failed to clear OSMD", err);
			}
		}
		this._error.set(null);
	}

	/**
	 * The OSMD instance, for the advanced use React exposed
	 * `osmdInstanceRef` for -- engraving rules, `setOptions`, reading the
	 * drawn SVG. Null until the first `loadAndRender`.
	 */
	get instance(): OpenSheetMusicDisplay | null {
		return this.osmd;
	}

	/**
	 * The element OSMD draws into -- the one `containerClass` sizes.
	 *
	 * OSMD does not put its `<svg>` directly in here; it inserts a wrapper
	 * `<div>` of its own first, and that wrapper is only as tall as the
	 * drawing. Anything that wants to fit the drawing to the box the caller
	 * styled must measure *this* element, not the SVG's parent.
	 */
	get container(): HTMLDivElement {
		return this.containerRef().nativeElement;
	}

	ngOnDestroy(): void {
		this.stopWatchingVisibility();
		if (!this.osmd) return;
		try {
			this.osmd.clear();
		} catch (err) {
			this.logger.error("Failed to clean up OSMD on destroy", err);
		}
		this.osmd = null;
		this.hasScore = false;
	}

	/**
	 * Draws, and copes with being asked to draw into a hidden container.
	 *
	 * **This is a deliberate fix, not a port.** OSMD reads the container's
	 * `clientWidth` when it renders and writes it onto the `<svg>`; a
	 * container that is `display: none` at that instant gets `width="0"` and
	 * stays blank after it is shown again. React's `SheetMusicDisplay` hides
	 * the container while `isLoading` is true, and whether the hide lands
	 * before OSMD's async `load()` resolves is a race -- driving the React
	 * app on 2026-08-20 produced `width="0"` on the 1st and 3rd generation
	 * and a correct 908px staff on the 2nd. The Angular port reproduced it
	 * exactly, which is how it was found.
	 *
	 * So: render, and if the container had no width, watch it and render
	 * once more when it gets one. The observer is one-shot and is torn down
	 * by `clear()` and by `ngOnDestroy`.
	 */
	private draw(osmd: OpenSheetMusicDisplay): void {
		osmd.render();

		if (this.containerRef().nativeElement.clientWidth > 0) {
			this.stopWatchingVisibility();
			return;
		}

		this.watchVisibility();
	}

	private watchVisibility(): void {
		if (this.visibilityWatch) return;
		// jsdom has no ResizeObserver; unit tests stub it in test-setup.ts,
		// and a stray environment without one simply keeps React's behaviour.
		if (typeof ResizeObserver === "undefined") return;

		const element = this.containerRef().nativeElement;
		this.visibilityWatch = new ResizeObserver(() => {
			if (element.clientWidth === 0) return;
			this.stopWatchingVisibility();
			if (this.hasScore) this.osmd?.render();
		});
		this.visibilityWatch.observe(element);
	}

	private stopWatchingVisibility(): void {
		this.visibilityWatch?.disconnect();
		this.visibilityWatch = null;
	}

	/** Creates the instance on first use, as React's `initializeOSMD` did. */
	private initialize(): OpenSheetMusicDisplay | null {
		const container = this.containerRef().nativeElement;

		try {
			const osmd = new OpenSheetMusicDisplay(container, this.options());
			osmd.zoom = this.zoom();
			this.osmd = osmd;
			return osmd;
		} catch (err) {
			this.logger.error("Failed to initialize OpenSheetMusicDisplay", err);
			this.fail(err, "Failed to initialize OpenSheetMusicDisplay");
			return null;
		}
	}

	private fail(err: unknown, fallbackMessage: string): void {
		const error = err instanceof Error ? err : new Error(fallbackMessage);
		this._error.set(error);
		this.renderError.emit(error);
	}
}
