import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CardDirective } from "../../../../shared/components/ui/card.directive";
import type { GameStats } from "../../models/engine.models";
import { GameMode } from "../../models/engine.models";

/**
 * PHASE-5 SEAM. Port of
 * `features/identification-game/components/GameOverCard.tsx`.
 *
 * The results screen every identification game shares. Games with more to
 * show pass it through the three projection slots rather than forking the
 * layout -- React's `children`, `summaryExtras` and `actions` props become
 * `[gameOverSection]`, `[gameOverSummaryExtra]` and `[gameOverAction]`:
 *
 * ```html
 * <app-game-over-card [gameStats]="stats()" (playAgain)="reset()">
 *   <div gameOverSection appCard class="p-6">…</div>
 *   <span gameOverSummaryExtra>•</span>
 *   <a gameOverAction routerLink="/signup">…</a>
 * </app-game-over-card>
 * ```
 *
 * The host is `display: contents` because React rendered no wrapper: the
 * `space-y-6` column below has to be the page container's direct child, or
 * its vertical rhythm lands on nothing.
 */
@Component({
	selector: "app-game-over-card",
	imports: [ButtonComponent, CardDirective, NgIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<div class="space-y-6 animate-fade-in">
			<div class="text-center space-y-2">
				<h1 class="font-display text-4xl font-bold">Game Over!</h1>
				<p class="text-muted-foreground text-lg">Here's how you did</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div
					appCard
					className="p-8 text-center bg-gradient-to-br from-primary/10 to-transparent"
				>
					<div
						class="font-display text-6xl font-bold tabular-nums text-primary"
					>
						{{ gameStats().npm }}
					</div>
					<div class="text-sm text-muted-foreground mt-2">
						{{ rateLabel() }}
					</div>
				</div>
				<div
					appCard
					className="p-8 text-center bg-gradient-to-br from-brass/10 to-transparent"
				>
					<div class="font-display text-6xl font-bold tabular-nums text-brass">
						{{ gameStats().accuracy }}%
					</div>
					<div class="text-sm text-muted-foreground mt-2">Accuracy</div>
				</div>
			</div>

			<ng-content select="[gameOverSection]" />

			<div appCard className="p-4">
				<div
					class="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground"
				>
					<span>Mode: {{ modeLabel() }}</span>
					<span>•</span>
					<span>
						Limit: {{ gameStats().limit }}
						{{ isTimeMode() ? "seconds" : unit() }}
					</span>
					<span>•</span>
					<span>
						Score: {{ gameStats().correct }}/{{ gameStats().total }}
					</span>
					<ng-content select="[gameOverSummaryExtra]" />
				</div>
			</div>

			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<app-button size="lg" (click)="playAgain.emit()">
					<ng-icon
						name="lucideRotateCcw"
						size="1.25rem"
						class="mr-2 h-5 w-5"
						aria-hidden="true"
					/>
					Play Again
				</app-button>
				<ng-content select="[gameOverAction]" />
			</div>
		</div>
	`,
})
export class GameOverCardComponent {
	readonly gameStats = input.required<GameStats>();
	/** Label under the per-minute stat. */
	readonly rateLabel = input("Answers Per Minute");
	/** Unit word for question-count mode ("questions", "notes"). */
	readonly unit = input("questions");

	readonly playAgain = output<void>();

	protected readonly isTimeMode = computed(
		() => this.gameStats().gameMode === GameMode.Time,
	);

	protected readonly modeLabel = computed(() =>
		this.isTimeMode()
			? "Time"
			: this.unit().charAt(0).toUpperCase() + this.unit().slice(1),
	);
}
