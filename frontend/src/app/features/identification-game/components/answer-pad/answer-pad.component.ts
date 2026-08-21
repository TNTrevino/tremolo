import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from "@angular/core";

import { ButtonComponent } from "@shared/components/ui/button.component";
import { CardDirective } from "@shared/components/ui/card.directive";

import type { AnswerOption } from "../../models/game-definition.models";

/**
 * The answer button grid.
 *
 * Port of
 * frontend-react/src/features/identification-game/components/AnswerPad.tsx.
 * Covers the key signature / interval / scale / chord layouts; the note
 * game keeps its own three-row keyboard grid.
 *
 * **Every button's text is its accessible name and the value it answers
 * with.** `e2e/support/app.ts` clicks by exact name, and its comment spells
 * out why that matters: an unlabelled button substring-matches anything and
 * gets clicked first, and the game then never starts.
 */
@Component({
	selector: "app-answer-pad",
	imports: [ButtonComponent, CardDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
		<div appCard className="flex-shrink-0 p-2 sm:p-4">
			<div [class]="gridClass()">
				@for (option of options(); track option.value) {
					<app-button
						[variant]="option.variant ?? 'outline'"
						className="h-11 sm:h-16 text-xs sm:text-lg font-bold px-0 sm:px-2"
						(click)="answered.emit(option.value)"
					>
						{{ option.label ?? option.value }}
					</app-button>
				}
			</div>
		</div>
	`,
})
export class AnswerPadComponent {
	readonly options = input.required<AnswerOption[]>();

	/** Tailwind `grid-cols-*`, e.g. `"grid-cols-7"`. */
	readonly columnsClassName = input("grid-cols-2");

	readonly answered = output<string>();

	protected readonly gridClass = computed(
		() => `grid ${this.columnsClassName()} gap-1.5 sm:gap-2`,
	);
}
