import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	ElementRef,
	inject,
	Injector,
	input,
	output,
	signal,
	untracked,
	viewChild,
} from "@angular/core";
import type { IOSMDOptions } from "opensheetmusicdisplay";

import { LoggerService } from "../../../../core/services/logger.service";
import { NotificationService } from "../../../../core/services/notification.service";
import { ThemeStore } from "../../../../core/services/theme.store";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import type { NoteGameRequest } from "../../../../shared/models/music.models";
import { MusicService } from "../../../../shared/services/music.service";
import { SheetMusicComponent } from "../../../sheet-music/components/sheet-music/sheet-music.component";
import type { NoteRange } from "../../models/note-game.models";
import { createNoteQueue, extractTonic } from "../../services/note-queue";
import type { QuestionQueue } from "../../services/question-queue";

/**
 * The staff card. Port of three React pieces that were only separate because
 * one of them was a class:
 *
 * - `features/note-game-display/NoteGameDisplay.ts` -- the OSMD options, the
 *   zero margins, the dark-mode recolour and the `getBBox` -> `viewBox` crop;
 * - `features/note-game-display/useNoteGameDisplay.ts` -- its lifecycle;
 * - `identification-game/components/QuestionBoard.tsx`'s `QuestionDisplay`
 *   plus `hooks/useQuestionLoader.ts` -- the card chrome and the
 *   pop -> render -> report loop.
 *
 * Phase 4's `<app-sheet-music>` already is the OSMD lifecycle wrapper, so
 * what is left here is the game-specific configuration it deliberately did
 * not guess at (phase-4-handoff §4) and the chrome around it.
 *
 * **A new question loads when `answersLength` changes.** That is React's
 * trigger, unchanged: the engine appends an answer, the count moves, the next
 * question is popped. The queue is what makes that instant.
 *
 * The container carries `aria-label="Music staff"`, which is not decoration:
 * `e2e/support/app.ts` finds the staff by that name, and `baselines.spec.ts`
 * masks the region it covers.
 */

/** React's `NoteGameDisplay` constructor options, verbatim. */
const OSMD_OPTIONS: IOSMDOptions = {
	drawingParameters: "compacttight",
	drawCredits: false,
	drawTitle: false,
	drawComposer: false,
	drawPartNames: false,
	drawMeasureNumbers: false,
	drawTimeSignatures: false,
	autoResize: false,
};

/** Padding around the cropped viewBox, in SVG units. React's default. */
const CROP_PADDING = 10;

@Component({
	selector: "app-note-staff",
	imports: [SheetMusicComponent, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<div [class]="className()">
			@if (loadError()) {
				<div
					appCard
					className="h-full flex items-center justify-center bg-gradient-to-br from-background to-muted/30"
				>
					<div class="text-center space-y-4">
						<div class="text-destructive font-medium">
							Failed to load sheet music
						</div>
						<div class="text-sm text-muted-foreground">
							Falling back to text display
						</div>
						<div
							[class]="
								fallbackTextClassName() +
								' font-bold text-primary animate-fade-in'
							"
						>
							{{ fallbackLabel() }}
						</div>
					</div>
				</div>
			} @else {
				<div
					appCard
					className="h-full relative flex items-center justify-center overflow-hidden"
				>
					@if (isInitializing()) {
						<div
							class="absolute inset-0 flex items-center justify-center bg-background/80 z-10"
						>
							<div class="text-center text-muted-foreground">
								Loading sheet music...
							</div>
						</div>
					}
					<app-sheet-music
						[zoom]="zoom()"
						[options]="osmdOptions"
						ariaLabel="Music staff"
						containerClass="w-full h-full overflow-hidden"
					/>
				</div>
			}
		</div>
	`,
})
export class NoteStaffComponent {
	private readonly music = inject(MusicService);
	private readonly notifications = inject(NotificationService);
	private readonly logger = inject(LoggerService);
	private readonly theme = inject(ThemeStore);
	private readonly injector = inject(Injector);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	private readonly sheet = viewChild(SheetMusicComponent);

	/** Answer count. A change is what pops and renders the next question. */
	readonly answersLength = input.required<number>();
	/** Scale name, e.g. `"C Major"`; only its tonic reaches the service. */
	readonly scale = input.required<string>();
	/** Legacy persisted octave, sent for compatibility. */
	readonly octave = input.required<number>();
	readonly range = input.required<NoteRange>();
	/** Shown huge when MusicXML fails to render. */
	readonly fallbackLabel = input("");
	readonly fallbackTextClassName = input("text-9xl");
	readonly className = input("");
	readonly zoom = input(2.0);

	/** The correct answer for the question now on the staff. */
	readonly questionLoaded = output<string>();

	protected readonly osmdOptions = OSMD_OPTIONS;

	private readonly displayReady = signal(false);
	protected readonly loadError = signal(false);

	/**
	 * `null` gates the queue until the container is in the DOM -- React's
	 * `isReady`, which `useNoteGameDisplay` flipped a microtask after mount.
	 */
	private readonly request = computed<NoteGameRequest | null>(() => {
		if (!this.displayReady()) return null;
		const range = this.range();
		return {
			scale: extractTonic(this.scale()),
			octave: String(this.octave()),
			lowNote: range.lowNote,
			highNote: range.highNote,
			clef: range.clef,
		};
	});

	private readonly queue: QuestionQueue<
		NoteGameRequest,
		{ generatedXml: string; noteName: string }
	>;

	protected readonly isInitializing;

	/** OSMD is configured once, on the first score it draws. */
	private configured = false;

	constructor() {
		this.queue = createNoteQueue({
			request: this.request,
			music: this.music,
			onError: (message) => this.notifications.showError(message),
			onFetchFailure: (error) =>
				this.logger.error("Note question fetch failed", error),
			injector: this.injector,
		});
		this.isInitializing = this.queue.isInitializing;

		afterNextRender(() => this.displayReady.set(true));

		effect(() => {
			// The dependencies, read for tracking. `answersLength` is the
			// trigger; the other two gate it.
			this.answersLength();
			const ready = this.displayReady();
			const initializing = this.isInitializing();
			if (!ready || initializing) return;

			untracked(() => void this.loadNext());
		});

		// Toggling the theme re-colours the score in place. Tearing the
		// display down instead would reset the queue and lose the current
		// question -- the reason React kept this in its own effect.
		effect(() => {
			const dark = this.theme.theme() === "dark";
			untracked(() => this.recolour(dark));
		});
	}

	private async loadNext(): Promise<void> {
		const sheet = this.sheet();
		if (!sheet) return;

		const question = this.queue.pop();
		if (!question) {
			this.logger.warn("Note queue: pop() returned null -- queue was empty");
			return;
		}

		// Never rejects; it reports through `error` instead.
		await sheet.loadAndRender(question.generatedXml);

		if (sheet.error()) {
			this.loadError.set(true);
		} else {
			this.loadError.set(false);
			this.configureOsmd();
			this.cropToContent();
		}

		// Reported either way: a staff that failed to draw still has a
		// correct answer, and the text fallback shows it.
		this.questionLoaded.emit(question.noteName);
	}

	/**
	 * The engraving rules React set in its constructor. They cannot go in
	 * `[options]` -- OSMD takes them off the instance, which does not exist
	 * until the first `loadAndRender` (phase-4-handoff §3). Applied once, then
	 * redrawn, so only the first question pays for the second render.
	 */
	private configureOsmd(): void {
		if (this.configured) return;
		const osmd = this.sheet()?.instance;
		if (!osmd) return;

		this.configured = true;
		osmd.setOptions({
			defaultColorMusic: this.theme.theme() === "dark" ? "#FFFFFF" : "#000000",
		});

		const rules = osmd.EngravingRules;
		rules.PageLeftMargin = 0;
		rules.PageRightMargin = 0;
		rules.PageTopMargin = 0;
		rules.PageBottomMargin = 0;
		rules.SystemLeftMargin = 0;
		rules.SystemRightMargin = 0;

		osmd.render();
	}

	private recolour(dark: boolean): void {
		const osmd = this.sheet()?.instance;
		if (!osmd || !this.configured) return;

		osmd.setOptions({ defaultColorMusic: dark ? "#FFFFFF" : "#000000" });
		osmd.render();
		this.cropToContent();
	}

	/**
	 * React's `centerContent`: crop the SVG's viewBox to the drawn music and
	 * let it scale to the container. Without it OSMD's page-sized canvas
	 * leaves one note adrift in the top-left corner.
	 *
	 * `requestAnimationFrame` because `getBBox` needs the SVG laid out.
	 */
	private cropToContent(): void {
		requestAnimationFrame(() => {
			const container = this.host.nativeElement.querySelector<HTMLElement>(
				"[aria-label='Music staff']",
			);
			const svg = container?.querySelector("svg");
			if (!container || !svg) return;

			// jsdom implements no SVG layout, so `getBBox` throws there. The
			// crop is presentation only -- skipping it must not break a test.
			let box: DOMRect;
			try {
				box = svg.getBBox();
			} catch {
				return;
			}
			const pad = CROP_PADDING;

			svg.setAttribute(
				"viewBox",
				`${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`,
			);
			svg.setAttribute("width", `${container.clientWidth}`);
			svg.setAttribute("height", `${container.clientHeight}`);
			svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
		});
	}
}
