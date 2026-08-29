import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { ButtonComponent } from "@shared/components/ui/button.component";
import { CardDirective } from "@shared/components/ui/card.directive";

import { GameMode, type GameStats } from "../../models/game-state.models";

/**
 * The results screen every identification game shares.
 *
 * Port of
 * frontend-react/src/features/identification-game/components/GameOverCard.tsx.
 * React's three `ReactNode` slots become three content-projection slots, so
 * a game with more to show (Phase 6's note game has a recent-games chart and
 * a save-status line) fills them instead of forking the layout.
 *
 * Three strings here are acceptance criteria, not copy: `e2e/specs/games.spec.ts`
 * waits on the heading **"Game Over!"** and on text matching `/Accuracy/`,
 * `e2e/support/app.ts` reads the score off a node matching
 * `/^Score: \\d+\\/\\d+$/`, and the Play Again button is matched by
 * `/play again/i`.
 */
@Component({
	selector: "app-game-over-card",
	imports: [ButtonComponent, CardDirective, NgIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
		<div class="animate-fade-in space-y-6">
			<div class="space-y-2 text-center">
				<h1 class="font-display text-4xl font-bold">Game Over!</h1>
				<p class="text-lg text-muted-foreground">Here's how you did</p>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div
					appCard
					className="p-8 text-center bg-gradient-to-br from-primary/10 to-transparent"
				>
					<div
						class="font-display text-6xl font-bold tabular-nums text-primary"
					>
						{{ gameStats().npm }}
					</div>
					<div class="mt-2 text-sm text-muted-foreground">
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
					<div class="mt-2 text-sm text-muted-foreground">Accuracy</div>
				</div>
			</div>

			<ng-content select="[gameOverSections]" />

			<div appCard className="p-4">
				<div
					class="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground"
				>
					<span>Mode: {{ modeLabel() }}</span>
					<span>•</span>
					<span
						>Limit: {{ gameStats().limit }}
						{{ isTimeMode() ? "seconds" : unit() }}</span
					>
					<span>•</span>
					<span>{{ scoreLabel() }}</span>
					<ng-content select="[gameOverSummary]" />
				</div>
			</div>

			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<app-button size="lg" (click)="playAgain.emit()">
					<ng-icon
						name="lucideRotateCcw"
						class="mr-2 h-5 w-5"
						aria-hidden="true"
					/>
					Play Again
				</app-button>
				<ng-content select="[gameOverActions]" />
			</div>
		</div>
	`,
})
export class GameOverCardComponent {
	readonly gameStats = input.required<GameStats>();

	/** Label under the per-minute figure. */
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

	/**
	 * Built in TypeScript rather than interpolated in the template, and that
	 * is not a style choice.
	 *
	 * `e2e/support/app.ts`'s `correctCount()` reads this line with the
	 * **anchored** regex `/^Score: \d+\/\d+$/`, and Playwright does not trim
	 * the text before testing a regex against it. JSX drops the whitespace
	 * around a newline, so React rendered exactly `"Score: 2/10"`; Angular
	 * collapses the same template whitespace to a single space, so the moment
	 * this line wraps -- which is all it takes, and Prettier decides when --
	 * it renders `" Score: 2/10 "` and the anchors reject it. Phase 6
	 * measured that live: the locator matched **0** elements while the number
	 * was plainly on screen (`.migration/phase-6-handoff.md` §9.1).
	 *
	 * A single interpolation has no text node either side of it, so the text
	 * content is React's exactly and a reformat cannot undo it.
	 */
	protected readonly scoreLabel = computed(
		() => `Score: ${this.gameStats().correct}/${this.gameStats().total}`,
	);
}
