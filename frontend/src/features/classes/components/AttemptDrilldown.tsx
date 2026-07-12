import { Loader2 } from "lucide-react";
import { QueryState } from "@/shared/components/QueryState";
import {
	TremoloLineChart,
	type TremoloSeries,
} from "@/shared/components/charts";
import { useAssignmentAttempts } from "@/shared/hooks/queries";
import type { Attempt } from "@/features/classes/types";

interface AttemptDrilldownProps {
	assignmentId: number;
	studentId: number;
}

interface AttemptChartPoint {
	label: string;
	accuracy: number;
}

const ACCURACY_SERIES: Array<TremoloSeries & { key: "accuracy" }> = [
	{
		key: "accuracy",
		name: "Accuracy",
		color: "hsl(var(--primary))",
		format: (v) => `${v}%`,
	},
];

function formatAttemptDate(dateStr: string): string {
	if (!dateStr) return "";
	const date = new Date(`${dateStr}T00:00:00`);
	if (Number.isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function AttemptRow({ attempt }: { attempt: Attempt }) {
	return (
		<div className="grid grid-cols-[1fr_repeat(3,auto)] gap-4 items-center px-3 py-1.5 text-sm">
			<span className="tabular-nums text-muted-foreground">
				{formatAttemptDate(attempt.attemptedDate)}
			</span>
			<span className="tabular-nums text-right">
				{attempt.correctQuestions}
				<span className="text-muted-foreground">
					{" "}
					/ {attempt.totalQuestions}
				</span>
			</span>
			<span className="tabular-nums text-right font-medium">
				{attempt.accuracy}%
			</span>
			<span className="tabular-nums text-right text-muted-foreground">
				{attempt.notesPerMinute} npm
			</span>
		</div>
	);
}

/**
 * Inline accordion detail panel for a student's attempt history on an
 * assignment. Kept off-brass by design — the grid already spends brass on
 * best accuracy, so this panel stays ink/muted.
 */
export function AttemptDrilldown({
	assignmentId,
	studentId,
}: AttemptDrilldownProps) {
	const {
		data: attempts = [],
		isLoading,
		isError,
		error,
	} = useAssignmentAttempts(assignmentId, studentId, true);

	const chartData: AttemptChartPoint[] = attempts.map((a) => ({
		label: formatAttemptDate(a.attemptedDate),
		accuracy: a.accuracy,
	}));

	return (
		<div className="rounded-lg bg-muted/30 px-2 py-3">
			<QueryState
				isLoading={isLoading}
				isError={isError}
				error={error}
				loading={
					<div className="flex items-center justify-center h-16">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				}
				isEmpty={attempts.length === 0}
				empty={
					<p className="px-3 py-2 text-sm text-muted-foreground">
						No attempts yet.
					</p>
				}
			>
				<div className="space-y-3">
					{attempts.length > 1 && (
						<TremoloLineChart
							data={chartData}
							series={ACCURACY_SERIES}
							xKey="label"
							height={140}
							showLegend={false}
							yDomain={[0, 100]}
						/>
					)}
					<div className="divide-y divide-border/50">
						{attempts.map((attempt, i) => (
							<AttemptRow key={i} attempt={attempt} />
						))}
					</div>
				</div>
			</QueryState>
		</div>
	);
}
