import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	output,
	signal,
	untracked,
	viewChild,
} from "@angular/core";

import {
	GameStaffComponent,
	QuestionQueueService,
} from "@features/identification-game";

import { LoggerService } from "../../../../core/services/logger.service";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import type {
	NoteGameRequest,
	NoteGameResponse,
} from "../../../../shared/models/music.models";
import { MusicService } from "../../../../shared/services/music.service";
import { extractTonic, type NoteRange } from "../../models/note-game.models";

/**
 * The note game's staff card.
 *
 * Port of `identification-game/components/QuestionBoard.tsx`'s
 * `QuestionDisplay` plus `hooks/useQuestionLoader.ts` -- the card chrome and
 * the pop -> render -> report loop. The OSMD half is **not** ported again:
 * React's `features/note-game-display/` (the `NoteGameDisplay` class and its
 * hook) is Phase 5's `<app-game-staff>`, which already carries the
 * `compacttight` options, the zero margins, the dark-mode recolour and the
 * `getBBox` -> `viewBox` crop.
 *
 * What is left here is note-game-specific and stays: the settings-to-request
 * mapping, the huge single-letter text fallback, and the `className` the two
 * board layouts size it with.
 *
 * **A new question loads when `answersLength` changes.** That is React's
 * trigger, unchanged: the engine appends an answer, the count moves, the next
 * question is popped. The queue is what makes that instant.
 *
 * The staff carries `aria-label="Music staff"`, which is not decoration:
 * `e2e/support/app.ts` finds the staff by that name, and `baselines.spec.ts`
 * masks the region it covers.
 */
@Component({
	selector: "app-note-staff",
	imports: [GameStaffComponent, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [QuestionQueueService],
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<div [class]="className()">
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

				@if (loadError()) {
					<div
						class="absolute inset-0 z-10 flex items-center justify-center bg-background"
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
				}

				<app-game-staff [zoom]="zoom()" [class.invisible]="loadError()" />
			</div>
		</div>
	`,
})
export class NoteStaffComponent {
	private readonly music = inject(MusicService);
	private readonly logger = inject(LoggerService);
	private readonly queue =
		inject<QuestionQueueService<NoteGameResponse>>(QuestionQueueService);

	private readonly staff = viewChild(GameStaffComponent);

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

	private readonly _loadError = signal(false);
	protected readonly loadError = this._loadError.asReadonly();
	protected readonly isInitializing = this.queue.isInitializing;

	private readonly request = computed<NoteGameRequest>(() => {
		const range = this.range();
		return {
			scale: extractTonic(this.scale()),
			octave: String(this.octave()),
			lowNote: range.lowNote,
			highNote: range.highNote,
			clef: range.clef,
		};
	});

	constructor() {
		this.queue.connect({
			request: this.request,
			// React's `isReady`: nothing is fetched before there is a staff to
			// draw into.
			enabled: computed(() => this.staff()?.isReady() ?? false),
			fetch: (request: NoteGameRequest) => this.music.generateNoteGame(request),
		});

		effect((onCleanup) => {
			// The dependencies, read for tracking. `answersLength` is the
			// trigger; the other two gate it.
			this.answersLength();
			const ready = this.staff()?.isReady() ?? false;
			if (!ready || this.queue.isInitializing()) return;

			let cancelled = false;
			onCleanup(() => {
				cancelled = true;
			});

			untracked(() => void this.loadNext(() => cancelled));
		});
	}

	private async loadNext(isCancelled: () => boolean): Promise<void> {
		const staff = this.staff();
		if (!staff) return;

		const question = this.queue.pop();
		if (!question) {
			this.logger.warn("Note queue: pop() returned null -- queue was empty");
			return;
		}

		// Never rejects; it reports through `error` instead.
		await staff.loadNote(question.generatedXml);
		if (isCancelled()) return;

		const failed = staff.error() !== null;
		if (failed) {
			this.logger.error("Failed to render a note question", staff.error());
		}
		this._loadError.set(failed);

		// Reported either way: a staff that failed to draw still has a
		// correct answer, and the text fallback shows it.
		this.questionLoaded.emit(question.noteName);
	}
}
