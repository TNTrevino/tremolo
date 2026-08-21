import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";

import { AuthStore } from "../../../../auth/services/auth.store";
import {
	type TremoloChartPoint,
	type TremoloReferenceLine,
	type TremoloSeries,
	TremoloLineChartComponent,
} from "../../../../shared/components/charts/tremolo-line-chart.component";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CardDirective } from "../../../../shared/components/ui/card.directive";
import { UserService } from "../../../../shared/services/user.service";
import type { NoteGameStats } from "../../models/note-game.models";
import { GameOverCardComponent } from "@features/identification-game";

/**
 * The note game's results screen. Port of
 * frontend-react/src/features/note-game/components/GameResults.tsx.
 *
 * Everything the layout has in common with the other games comes from
 * `<app-game-over-card>`; this adds the three note-game sections through its
 * projection slots -- the save-failure notice, the recent-games notice, and
 * the last-30 chart.
 *
 * `useRecentGameEntries` becomes an `rxResource` (D6). React's `enabled: !!user`
 * is `params` returning `undefined`, and its `staleTime` has no port and needs
 * none: this component mounts once per finished game.
 */

interface RecentGamePoint extends TremoloChartPoint {
	index: number;
	npm: number;
	accuracy: number;
	date: string;
}

const NPM_SERIES: readonly TremoloSeries[] = [
	{
		key: "npm",
		name: "NPM",
		color: "hsl(var(--primary))",
		format: (v) => v.toFixed(1),
		showPB: true,
	},
	{
		key: "accuracy",
		name: "Accuracy",
		color: "hsl(var(--brass))",
		format: (v) => `${v.toFixed(1)}%`,
	},
];

@Component({
	selector: "app-note-game-results",
	imports: [
		ButtonComponent,
		CardDirective,
		GameOverCardComponent,
		RouterLink,
		TremoloLineChartComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<app-game-over-card
			[gameStats]="gameStats()"
			rateLabel="Notes Per Minute"
			unit="notes"
			(playAgain)="playAgain.emit()"
		>
			@if (isAuthenticated() && saveError()) {
				<div gameOverSections appCard className="p-6 border-destructive/50">
					<p class="text-sm text-destructive text-center">
						Your result could not be saved. Please check your connection and try
						again.
					</p>
				</div>
			}
			@if (isAuthenticated() && recent.error()) {
				<div gameOverSections appCard className="p-6">
					<p class="text-sm text-muted-foreground text-center">
						Could not load recent games.
						@if (!saveError()) {
							Your result was still saved.
						}
					</p>
				</div>
			}
			@if (showChart()) {
				<div gameOverSections appCard className="p-6">
					<div class="mb-4 flex items-baseline justify-between">
						<h3 class="text-xl font-bold">Recent Games</h3>
						<span class="text-xs text-muted-foreground">
							Last {{ chartData().length }} · click legend to toggle
						</span>
					</div>
					<app-tremolo-line-chart
						[data]="chartData()"
						[series]="series"
						xKey="index"
						[height]="300"
						[xTickFormatter]="formatXTick"
						[tooltipLabelFormatter]="formatTooltipLabel"
						[referenceLines]="referenceLines()"
						ariaLabel="Recent games"
					/>
				</div>
			}

			@if (gameStats().scale !== undefined) {
				<ng-container gameOverSummary>
					<span>•</span>
					<span>Scale: {{ gameStats().scale }}</span>
				</ng-container>
			}

			@if (!isAuthenticated()) {
				<a gameOverActions routerLink="/signup">
					<app-button size="lg" variant="outline">
						Sign Up to Save Progress
					</app-button>
				</a>
			}
		</app-game-over-card>
	`,
})
export class NoteGameResultsComponent {
	private readonly users = inject(UserService);
	private readonly auth = inject(AuthStore);

	readonly gameStats = input.required<NoteGameStats>();
	readonly saveError = input(false);

	readonly playAgain = output<void>();

	protected readonly isAuthenticated = this.auth.isAuthenticated;
	protected readonly series = NPM_SERIES;

	protected readonly recent = rxResource({
		params: () => this.auth.user()?.id,
		stream: () => this.users.getRecentGameEntries(),
	});

	/** Newest-first from the server; the chart reads oldest-left. */
	protected readonly chartData = computed<RecentGamePoint[]>(() => {
		const entries = this.recent.value() ?? [];
		return [...entries].reverse().map((entry, i) => ({
			index: i + 1,
			npm: entry.notesPerMinute,
			accuracy:
				entry.totalQuestions > 0
					? (entry.correctQuestions / entry.totalQuestions) * 100
					: 0,
			date: entry.createdDate,
		}));
	});

	protected readonly referenceLines = computed<TremoloReferenceLine[]>(() => {
		const points = this.chartData();
		if (points.length < 2) return [];
		const avg = points.reduce((sum, p) => sum + p.npm, 0) / points.length;
		return [{ value: avg, label: `avg ${avg.toFixed(1)}` }];
	});

	protected readonly showChart = computed(
		() => this.isAuthenticated() && this.chartData().length >= 2,
	);

	protected readonly formatXTick = (value: unknown): string => `${value}`;

	protected readonly formatTooltipLabel = (
		value: unknown,
		payload?: Record<string, unknown>,
	): string => {
		const index = typeof value === "number" ? value : Number(value);
		const date = payload?.["date"];
		const dateLabel =
			typeof date === "string"
				? new Date(date).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
					})
				: "";
		return dateLabel ? `Game ${index} · ${dateLabel}` : `Game ${index}`;
	};
}
