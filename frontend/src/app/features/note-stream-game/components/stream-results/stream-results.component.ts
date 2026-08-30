import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from "@angular/core";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CardDirective } from "../../../../shared/components/ui/card.directive";
import type {
	NoteStreamStats,
	StreamJudgment,
} from "../../models/note-stream.models";

/** Best to worst, which is also the order the row reads in. */
const JUDGMENT_ORDER: readonly StreamJudgment[] = [
	"perfect",
	"great",
	"good",
	"miss",
];

const JUDGMENT_LABELS: Record<StreamJudgment, string> = {
	perfect: "Perfect",
	great: "Great",
	good: "Good",
	miss: "Miss",
};

interface JudgmentRow {
	judgment: StreamJudgment;
	label: string;
	count: number;
	/** Ink for hits; a miss only earns the feedback red when there is one. */
	className: string;
}

/**
 * The note stream game's end screen.
 *
 * It does not reuse `<app-game-over-card>`: that card is built around
 * accuracy plus a per-minute rate, and this game's headline is a score with a
 * streak and four timing buckets under it. Sharing it would mean bending both.
 *
 * DESIGN.md's brass budget is spent once here, on the score. Everything else
 * is ink on paper, and the miss count turns red only when there is a miss to
 * report -- feedback colour arrives as feedback, never as decoration.
 */
@Component({
	selector: "app-stream-results",
	imports: [ButtonComponent, CardDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
		<div appCard className="animate-fade-in space-y-8 p-6 sm:p-8">
			<div class="space-y-1 text-center">
				<h2 class="font-display text-3xl font-bold">Stream complete</h2>
				<p class="text-muted-foreground">Here's how you read it.</p>
			</div>

			<p class="text-center">
				<span
					class="block font-display text-6xl font-bold tabular-nums text-brass sm:text-7xl"
				>
					{{ stats().score }}
				</span>
				<span class="mt-1 block text-sm text-muted-foreground">Points</span>
			</p>

			<div class="grid grid-cols-2 gap-4">
				<p class="rounded-md border-2 border-border p-4 text-center">
					<span class="block font-display text-3xl font-bold tabular-nums">
						{{ stats().maxStreak }}
					</span>
					<span
						class="mt-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
					>
						Best streak
					</span>
				</p>
				<p class="rounded-md border-2 border-border p-4 text-center">
					<span class="block font-display text-3xl font-bold tabular-nums">
						{{ accuracyLabel() }}
					</span>
					<span
						class="mt-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
					>
						Accuracy
					</span>
				</p>
			</div>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				@for (row of judgmentRows(); track row.judgment) {
					<p class="text-center">
						<span [class]="row.className">{{ row.count }}</span>
						<span class="mt-0.5 block text-xs text-muted-foreground">
							{{ row.label }}
						</span>
					</p>
				}
			</div>

			<p class="text-center text-sm text-muted-foreground">
				{{ notesLabel() }}
			</p>

			<div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
				<app-button size="lg" (click)="playAgain.emit()">Play again</app-button>
				<app-button size="lg" variant="outline" (click)="changeSettings.emit()">
					Change settings
				</app-button>
			</div>
		</div>
	`,
})
export class StreamResultsComponent {
	readonly stats = input.required<NoteStreamStats>();

	readonly playAgain = output<void>();
	readonly changeSettings = output<void>();

	protected readonly accuracyLabel = computed(
		() => `${Math.round(this.stats().accuracy)}%`,
	);

	protected readonly notesLabel = computed(() => {
		const total = this.stats().totalNotes;
		return `${total} ${total === 1 ? "note" : "notes"} came through`;
	});

	protected readonly judgmentRows = computed<JudgmentRow[]>(() => {
		const counts = this.stats().counts;
		return JUDGMENT_ORDER.map((judgment) => {
			const count = counts[judgment] ?? 0;
			return {
				judgment,
				label: JUDGMENT_LABELS[judgment],
				count,
				className:
					judgment === "miss" && count > 0
						? "block font-display text-2xl font-bold tabular-nums text-destructive"
						: "block font-display text-2xl font-bold tabular-nums",
			};
		});
	});
}
