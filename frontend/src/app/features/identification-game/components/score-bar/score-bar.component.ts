import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from "@angular/core";

import { BreakpointService } from "@shared/services/breakpoint.service";

import { GameMode, type NoteAnswer } from "../../models/game-state.models";

/**
 * The compact live score, which replaces the title row during play.
 *
 * Port of
 * frontend-react/src/features/identification-game/components/ScoreBar.tsx.
 * The two layouts are React's: a phone held sideways gets a narrow sidebar
 * so the staff keeps the width, everything else gets the horizontal bar.
 * React rendered one or the other from `useBreakpoint`; this reads the same
 * three media queries through `BreakpointService`.
 */
@Component({
	selector: "app-score-bar",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
		@if (breakpoints.isPhoneLandscape()) {
			<div
				class="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-border bg-card px-2 py-2"
			>
				<div class="text-center text-xs font-medium">
					{{ correct() }}/{{ total() }}
				</div>
				<div class="text-center text-sm font-bold tabular-nums text-primary">
					{{ timerDisplay() }}
				</div>
				<div class="text-center text-xs font-medium">{{ accuracy() }}%</div>
			</div>
		} @else {
			<div
				class="flex min-h-[2.5rem] items-center justify-between rounded-lg border-2 border-border bg-card px-2 py-1.5 sm:min-h-[3rem] sm:px-4 sm:py-2"
			>
				<div class="text-sm font-medium sm:text-lg">
					Score: {{ correct() }}/{{ total() }}
				</div>
				<div class="text-sm font-bold tabular-nums sm:text-lg">
					{{ timerDisplay() }}
				</div>
				<div class="text-sm font-medium sm:text-lg">
					Accuracy: {{ accuracy() }}%
				</div>
			</div>
		}
	`,
})
export class ScoreBarComponent {
	protected readonly breakpoints = inject(BreakpointService);

	readonly answers = input.required<NoteAnswer[]>();
	readonly gameMode = input.required<GameMode>();
	readonly timeRemaining = input<number | undefined>(undefined);
	readonly noteLimit = input<number | undefined>(undefined);
	/** Seconds to "M:SS". Supplied by the page's timer. */
	readonly formatTime = input<((seconds: number) => string) | undefined>(
		undefined,
	);

	protected readonly correct = computed(
		() => this.answers().filter((a) => a.correct).length,
	);
	protected readonly total = computed(() => this.answers().length);
	protected readonly accuracy = computed(() =>
		this.total() > 0 ? Math.round((this.correct() / this.total()) * 100) : 0,
	);

	protected readonly timerDisplay = computed(() => {
		const remaining = this.timeRemaining();
		const limit = this.noteLimit();

		if (this.gameMode() === GameMode.Time && remaining !== undefined) {
			return this.formatTime()?.(remaining) ?? `${remaining}s`;
		}
		if (this.gameMode() === GameMode.Notes && limit !== undefined) {
			return `${this.total()}/${limit}`;
		}
		return "";
	});
}
