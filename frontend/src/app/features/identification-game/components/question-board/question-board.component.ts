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
import type { Observable } from "rxjs";

import { LoggerService } from "@core/services/logger.service";
import { BreakpointService } from "@shared/services/breakpoint.service";
import { CardDirective } from "@shared/components/ui/card.directive";

import type {
	GeneratedQuestion,
	NoteAnswer,
} from "../../models/game-state.models";
import { QuestionQueueService } from "../../services/question-queue.service";
import { GameStaffComponent } from "../game-staff/game-staff.component";

/**
 * The staff card plus whatever answer UI is projected below it.
 *
 * Port of
 * frontend-react/src/features/identification-game/components/QuestionBoard.tsx
 * and the `useQuestionLoader` hook it drove. It owns the prefetch queue and
 * the load loop; the game state lives above it, and the answer pad is
 * projected in so the note game can project its keyboard grid instead.
 *
 * **The load trigger is the answer count**, as in React: answer a question
 * and the board pops the next one, draws it, and reports upward which
 * answer is now correct. Everything else the effect reads is a gate, and
 * everything it must *not* re-run on -- `getAnswer`, which changes identity
 * on every settings click -- is read through `untracked`. That is this
 * port's version of React's `settingsRef`, and it is what stops a settings
 * click burning a prefetched question.
 *
 * React's `ComponentErrorBoundary` has no port: Phase 2 recorded the
 * decision to accept a global `ErrorHandler` at coarser granularity.
 */
@Component({
	selector: "app-question-board",
	imports: [CardDirective, GameStaffComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [QuestionQueueService],
	styles: `
		:host {
			display: flex;
			flex: 1 1 0%;
			min-height: 0;
			flex-direction: column;
		}
	`,
	template: `
		<div class="flex min-h-0 flex-1 flex-col gap-2 sm:gap-4">
			<div [class]="displayClass()">
				<div
					appCard
					className="h-full relative flex items-center justify-center overflow-hidden"
				>
					@if (isInitializing()) {
						<div
							class="absolute inset-0 z-10 flex items-center justify-center bg-background/80"
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
							<div class="space-y-4 text-center">
								<div class="font-medium text-destructive">
									Failed to load sheet music
								</div>
								<div class="text-sm text-muted-foreground">
									Falling back to text display
								</div>
								<div class="animate-fade-in text-5xl font-bold text-primary">
									{{ currentAnswerLabel() }}
								</div>
							</div>
						</div>
					}

					<app-game-staff [zoom]="zoom()" [class.invisible]="loadError()" />
				</div>
			</div>

			<ng-content />
		</div>
	`,
})
export class QuestionBoardComponent {
	private readonly logger = inject(LoggerService);
	private readonly breakpoints = inject(BreakpointService);
	private readonly queue =
		inject<QuestionQueueService<GeneratedQuestion>>(QuestionQueueService);

	/** The answer log. A new question loads whenever its length changes. */
	readonly answers = input.required<NoteAnswer[]>();

	/** The request payload; the queue keys on its serialization. */
	readonly request = input.required<unknown>();

	/**
	 * Fetches one question for a payload.
	 *
	 * `unknown` in, because the board is deliberately not generic: the
	 * definition's `Req` is known only to the shell, which closes over it
	 * and casts once. Nothing here inspects the payload -- it is serialized
	 * for the queue's key and handed straight back.
	 */
	readonly fetch =
		input.required<(request: unknown) => Observable<GeneratedQuestion>>();

	/** Extracts the correct answer from a fetched question. */
	readonly getAnswer =
		input.required<(question: GeneratedQuestion) => string>();

	/** Shown as text when the MusicXML will not draw. */
	readonly currentAnswerLabel = input("");

	readonly zoom = input(1.4);

	/** Fires with the correct answer once its question is on screen. */
	readonly questionLoaded = output<string>();

	private readonly staff = viewChild(GameStaffComponent);
	private readonly _loadError = signal(false);

	protected readonly loadError = this._loadError.asReadonly();
	protected readonly isInitializing = this.queue.isInitializing;

	protected readonly displayClass = computed(() =>
		this.breakpoints.isMobile()
			? "flex-1 min-h-0 max-h-[45vh]"
			: "flex-1 min-h-0",
	);

	constructor() {
		this.queue.connect({
			request: this.request,
			enabled: computed(() => this.staff()?.isReady() ?? false),
			fetch: (request: unknown) => this.fetch()(request),
		});

		effect((onCleanup) => {
			const answered = this.answers().length;
			const ready = this.staff()?.isReady() ?? false;
			if (!ready || this.queue.isInitializing()) return;

			let cancelled = false;
			onCleanup(() => {
				cancelled = true;
			});

			void untracked(() => this.loadNext(answered, () => cancelled));
		});
	}

	/**
	 * Pops, draws, and reports.
	 *
	 * A draw failure is not a dead end: the fallback shows the answer as
	 * text and the answer is still reported, so the game carries on. React
	 * did the same.
	 */
	private async loadNext(
		answered: number,
		isCancelled: () => boolean,
	): Promise<void> {
		const staff = this.staff();
		if (!staff) return;

		const question = this.queue.pop();
		if (!question) {
			this.logger.warn(
				`Question queue was empty after ${answered} answers; waiting for a refill`,
			);
			return;
		}

		await staff.loadNote(question.generatedXml);
		if (isCancelled()) return;

		const failed = staff.error() !== null;
		if (failed) {
			this.logger.error("Failed to render question in OSMD", staff.error());
		}
		this._loadError.set(failed);
		this.questionLoaded.emit(this.getAnswer()(question));
	}
}
