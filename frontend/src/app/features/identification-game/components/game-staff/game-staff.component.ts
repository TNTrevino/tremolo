import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	ElementRef,
	inject,
	input,
	viewChild,
} from "@angular/core";
import type {
	IOSMDOptions,
	OpenSheetMusicDisplay,
} from "opensheetmusicdisplay";

import { ThemeStore } from "@core/services/theme.store";
import { SheetMusicComponent } from "@features/sheet-music/components/sheet-music/sheet-music.component";

/**
 * OSMD configured the way a *game* needs it: no title, no credits, no
 * measure numbers, no time signature, margins at zero, the drawn music
 * recoloured for the theme, and the result scaled to fill its box.
 *
 * Port of frontend-react/src/features/note-game-display/ -- the
 * `NoteGameDisplay` class and the `useNoteGameDisplay` hook, together.
 * Phase 4 deliberately left this out (its handoff §4 says so): it drew the
 * two static pages, and the game chrome belonged to whichever of Phases 5
 * and 6 landed first. **This is that component, and Phase 6's note game
 * board should use it rather than porting the React class a second time.**
 *
 * It wraps Phase 4's `<app-sheet-music>` rather than constructing OSMD
 * itself, so the zero-width-container fix, the disposal and the
 * never-rejects contract all come for free.
 *
 * Two things have to happen *after* the instance exists, because
 * `<app-sheet-music>` creates it lazily on the first `loadAndRender`:
 * the engraving rules and the note colour. They are applied once, on the
 * first load, and then only when the theme changes.
 */

/** Handed to the OSMD constructor. React's `NoteGameDisplay` options. */
const GAME_OSMD_OPTIONS: IOSMDOptions = {
	drawingParameters: "compacttight",
	drawCredits: false,
	drawTitle: false,
	drawComposer: false,
	drawPartNames: false,
	drawMeasureNumbers: false,
	drawTimeSignatures: false,
	autoResize: false,
};

@Component({
	selector: "app-game-staff",
	imports: [SheetMusicComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
			height: 100%;
			width: 100%;
		}
	`,
	template: `
		<app-sheet-music
			[zoom]="zoom()"
			[options]="options"
			[ariaLabel]="ariaLabel()"
			containerClass="w-full h-full overflow-hidden"
		/>
	`,
})
export class GameStaffComponent {
	private readonly themeStore = inject(ThemeStore);
	private readonly host = inject(ElementRef<HTMLElement>);

	/** OSMD zoom. Each game picks its own, 1.2-2.2. */
	readonly zoom = input(2.0);

	/** Breathing room around the drawn music, in SVG units. */
	readonly padding = input(10);

	/**
	 * The E2E harness finds the staff by this name
	 * (`e2e/support/app.ts`), so "Music staff" is an acceptance criterion.
	 */
	readonly ariaLabel = input("Music staff");

	protected readonly options = GAME_OSMD_OPTIONS;

	private readonly sheet = viewChild(SheetMusicComponent);

	/** True once the container exists and can be drawn into. */
	readonly isReady = computed(() => this.sheet() !== undefined);

	/** The last render failure, or null. The board falls back to text on it. */
	readonly error = computed(() => this.sheet()?.error() ?? null);

	/** Which colour the drawn music currently carries. */
	private appliedDark: boolean | null = null;

	constructor() {
		effect(() => {
			const dark = this.themeStore.theme() === "dark";
			const osmd = this.sheet()?.instance;
			// Nothing is drawn yet; the first load applies the colour itself.
			if (!osmd || this.appliedDark === null) return;
			if (this.appliedDark === dark) return;
			this.recolour(osmd, dark);
			osmd.render();
			void this.centre();
		});
	}

	/**
	 * Draws one question.
	 *
	 * Resolves whether it drew or not -- `loadAndRender` never rejects, so
	 * callers read `error()` (or this component's) rather than catching.
	 */
	async loadNote(musicXml: string): Promise<void> {
		const sheet = this.sheet();
		if (!sheet) return;

		await sheet.loadAndRender(musicXml);

		const osmd = sheet.instance;
		if (!osmd || sheet.error()) return;

		if (this.prepare(osmd)) osmd.render();
		await this.centre();
	}

	/** Empties the staff, keeping the instance for the next question. */
	clear(): void {
		this.sheet()?.clear();
	}

	/**
	 * One-time setup that can only run once OSMD exists. Returns whether
	 * anything changed, so the caller re-renders exactly once.
	 */
	private prepare(osmd: OpenSheetMusicDisplay): boolean {
		if (this.appliedDark !== null) return false;

		const rules = osmd.EngravingRules;
		rules.PageLeftMargin = 0;
		rules.PageRightMargin = 0;
		rules.PageTopMargin = 0;
		rules.PageBottomMargin = 0;
		rules.SystemLeftMargin = 0;
		rules.SystemRightMargin = 0;

		this.recolour(osmd, this.themeStore.theme() === "dark");
		return true;
	}

	private recolour(osmd: OpenSheetMusicDisplay, dark: boolean): void {
		osmd.setOptions({ defaultColorMusic: dark ? "#FFFFFF" : "#000000" });
		this.appliedDark = dark;
	}

	/**
	 * Fits the drawn music to its box.
	 *
	 * React's `centerContent`: read the SVG's own bounding box after a
	 * frame, then use it as the viewBox so the music is centred and scaled
	 * rather than pinned to the top-left of a container OSMD sized for a
	 * page. jsdom implements neither `getBBox` nor a layout, so this is a
	 * no-op under test -- which is why nothing asserts on it there.
	 */
	private centre(): Promise<void> {
		return new Promise((resolve) => {
			requestAnimationFrame(() => {
				const svg = this.host.nativeElement.querySelector("svg");
				const container = svg?.parentElement;
				if (!svg || !container || typeof svg.getBBox !== "function") {
					resolve();
					return;
				}

				let box: DOMRect;
				try {
					box = svg.getBBox();
				} catch {
					resolve();
					return;
				}

				const pad = this.padding();
				svg.setAttribute(
					"viewBox",
					`${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`,
				);
				svg.setAttribute("width", `${container.clientWidth}`);
				svg.setAttribute("height", `${container.clientHeight}`);
				svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
				resolve();
			});
		});
	}
}
