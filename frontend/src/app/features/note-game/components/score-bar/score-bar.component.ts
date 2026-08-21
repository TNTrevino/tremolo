import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from "@angular/core";

import { BreakpointService } from "../../../../shared/services/breakpoint.service";
import type { GameMode, NoteAnswer } from "../../models/engine.models";
import { GameMode as Mode } from "../../models/engine.models";

/**
 * PHASE-5 SEAM. Port of
 * `features/identification-game/components/ScoreBar.tsx`.
 *
 * The compact bar that replaces the settings bar during play: score, clock
 * (or question counter in notes mode) and accuracy.
 *
 * React shipped two components sharing a `useScoreData` hook; the derived
 * numbers are a `computed()` here and the two layouts are two branches of
 * one template, which is the same "only one is ever mounted" behaviour --
 * `BreakpointService` keeps `isPhoneLandscape` mutually exclusive with the
 * other flags.
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
				class="flex flex-col items-center justify-center gap-1.5 bg-card border-2 border-border rounded-lg px-2 py-2 w-full h-full"
			>
				<div class="text-xs font-medium text-center">
					{{ correctAnswers() }}/{{ totalAnswers() }}
				</div>
				<div class="text-sm font-bold text-center text-primary tabular-nums">
					{{ timerDisplay() }}
				</div>
				<div class="text-xs font-medium text-center">{{ accuracy() }}%</div>
			</div>
		} @else {
			<div
				class="flex justify-between items-center bg-card border-2 border-border rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 min-h-[2.5rem] sm:min-h-[3rem]"
			>
				<div class="text-sm sm:text-lg font-medium">
					Score: {{ correctAnswers() }}/{{ totalAnswers() }}
				</div>
				<div class="text-sm sm:text-lg font-bold tabular-nums">
					{{ timerDisplay() }}
				</div>
				<div class="text-sm sm:text-lg font-medium">
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
	readonly formatTime = input<((seconds: number) => string) | undefined>(
		undefined,
	);

	protected readonly correctAnswers = computed(
		() => this.answers().filter((a) => a.correct).length,
	);
	protected readonly totalAnswers = computed(() => this.answers().length);
	protected readonly accuracy = computed(() =>
		this.totalAnswers() > 0
			? Math.round((this.correctAnswers() / this.totalAnswers()) * 100)
			: 0,
	);

	protected readonly timerDisplay = computed(() => {
		const remaining = this.timeRemaining();
		if (this.gameMode() === Mode.Time && remaining !== undefined) {
			return this.formatTime()?.(remaining) ?? `${remaining}s`;
		}

		const limit = this.noteLimit();
		if (this.gameMode() === Mode.Notes && limit !== undefined) {
			return `${this.totalAnswers()}/${limit}`;
		}

		return "";
	});
}
