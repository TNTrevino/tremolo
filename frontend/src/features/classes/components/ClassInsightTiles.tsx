import { Skeleton } from "@/shared/components/ui/skeleton";
import type { AssignmentResult } from "@/features/classes/types";

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
 * Pure client-side rollup over an already-fetched AssignmentResult[] — no
 * new network call. Used to render the quiet stat strip above the results
 * grid.
 */
export function computeClassInsightStats(
	results: AssignmentResult[],
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

interface ClassInsightTilesProps {
	results: AssignmentResult[];
	isLoading: boolean;
}

function Tile({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="font-display text-2xl tabular-nums text-foreground">
				{value}
			</span>
			<span className="text-[11px] uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
		</div>
	);
}

/**
 * Quiet stat strip above the results grid — the grid already spends brass
 * on best-accuracy, so these tiles stay ink/muted.
 */
export function ClassInsightTiles({
	results,
	isLoading,
}: ClassInsightTilesProps) {
	if (isLoading) {
		return (
			<div className="flex gap-6 px-1 pb-3">
				{[0, 1, 2].map((i) => (
					<div key={i} className="flex flex-col gap-1.5">
						<Skeleton className="h-7 w-12" />
						<Skeleton className="h-3 w-16" />
					</div>
				))}
			</div>
		);
	}

	const stats = computeClassInsightStats(results);

	return (
		<div className="flex flex-wrap gap-6 px-1 pb-3">
			<Tile
				label="Class average"
				value={
					stats.averageAccuracy === null ? "—" : `${stats.averageAccuracy}%`
				}
			/>
			<Tile
				label="Attempted"
				value={`${stats.attemptedCount} of ${stats.totalCount}`}
			/>
			<Tile label="Not started" value={String(stats.notStartedCount)} />
		</div>
	);
}
