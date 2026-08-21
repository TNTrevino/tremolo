import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";

import { SkeletonDirective } from "../../../../shared/components/ui/skeleton.directive";
import type { AssignmentResult } from "../../models/classes.models";

export interface ClassInsightStats {
	/** Average of best accuracy across students who have attempted; null if nobody has. */
	averageAccuracy: number | null;
	/** Count of students who have made at least one attempt. */
	attemptedCount: number;
	/** Total enrolled students represented in the results grid. */
	totalCount: number;
	/** Count of students with zero attempts. */
	notStartedCount: number;
}

/**
 * Pure client-side rollup over an already-fetched `AssignmentResult[]` -- no
 * new network call. Ported verbatim from
 * frontend-react/src/features/classes/components/ClassInsightTiles.tsx, and
 * exported separately from the component for the same reason it was there:
 * the arithmetic is what the spec pins.
 */
export function computeClassInsightStats(
	results: readonly AssignmentResult[],
): ClassInsightStats {
	const attempted = results.filter((r) => r.attemptCount > 0);
	const averageAccuracy =
		attempted.length === 0
			? null
			: Math.round(
					attempted.reduce((sum, r) => sum + r.bestAccuracy, 0) /
						attempted.length,
				);

	return {
		averageAccuracy,
		attemptedCount: attempted.length,
		totalCount: results.length,
		notStartedCount: results.length - attempted.length,
	};
}

/**
 * The quiet stat strip above the results grid. DESIGN.md: the grid already
 * spends brass on best accuracy, so these tiles stay ink/muted.
 */
@Component({
	selector: "app-class-insight-tiles",
	imports: [SkeletonDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	template: `
		@if (isLoading()) {
			<div class="flex gap-6 px-1 pb-3">
				@for (i of skeletons; track i) {
					<div class="flex flex-col gap-1.5">
						<div appSkeleton class="h-7 w-12"></div>
						<div appSkeleton class="h-3 w-16"></div>
					</div>
				}
			</div>
		} @else {
			<div class="flex flex-wrap gap-6 px-1 pb-3">
				@for (tile of tiles(); track tile.label) {
					<div class="flex flex-col gap-0.5">
						<span class="font-display text-2xl tabular-nums text-foreground">{{
							tile.value
						}}</span>
						<span
							class="text-[11px] uppercase tracking-wide text-muted-foreground"
							>{{ tile.label }}</span
						>
					</div>
				}
			</div>
		}
	`,
})
export class ClassInsightTilesComponent {
	readonly results = input.required<readonly AssignmentResult[]>();
	readonly isLoading = input(false);

	protected readonly skeletons = [0, 1, 2];

	protected readonly tiles = computed(() => {
		const stats = computeClassInsightStats(this.results());
		return [
			{
				label: "Class average",
				value:
					stats.averageAccuracy === null ? "—" : `${stats.averageAccuracy}%`,
			},
			{
				label: "Attempted",
				value: `${stats.attemptedCount} of ${stats.totalCount}`,
			},
			{ label: "Not started", value: String(stats.notStartedCount) },
		];
	});
}
