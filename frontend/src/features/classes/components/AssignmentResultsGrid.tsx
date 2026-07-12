import { Loader2 } from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";
import { useAssignmentResults } from "@/shared/hooks/queries";
import type { Assignment, AssignmentResult } from "@/features/classes/types";

interface AssignmentResultsGridProps {
	assignment: Assignment;
}

const COLS = "grid grid-cols-[1.6fr_repeat(4,1fr)] gap-2 items-center";

function ResultRow({ row }: { row: AssignmentResult }) {
	const notStarted = row.attemptCount === 0 || row.lastAttemptDate === "";

	if (notStarted) {
		return (
			<div className={cn(COLS, "px-3 py-2 rounded-lg text-muted-foreground")}>
				<span className="text-sm font-medium truncate">
					{row.firstName} {row.lastName}
				</span>
				<span className="col-span-4 text-xs">Not started</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				COLS,
				"px-3 py-2 rounded-lg transition-colors hover:bg-accent/50",
			)}
		>
			<span className="text-sm font-medium truncate">
				{row.firstName} {row.lastName}
			</span>
			<span className="tabular-nums text-sm text-right">
				{row.attemptCount}
			</span>
			<span className="tabular-nums text-sm text-right">
				{row.bestCorrect}
				<span className="text-muted-foreground"> / {row.mostQuestions}</span>
			</span>
			<div className="flex flex-col items-end gap-1">
				<span className="tabular-nums text-sm font-semibold text-brass">
					{row.bestAccuracy}%
				</span>
				<span
					className="h-1 w-full max-w-16 rounded-full bg-brass/20 overflow-hidden"
					aria-hidden="true"
				>
					<span
						className="block h-full rounded-full bg-brass"
						style={{
							width: `${Math.min(100, Math.max(0, row.bestAccuracy))}%`,
						}}
					/>
				</span>
			</div>
			<span className="tabular-nums text-xs text-muted-foreground text-right">
				{row.lastAttemptDate}
			</span>
		</div>
	);
}

export function AssignmentResultsGrid({
	assignment,
}: AssignmentResultsGridProps) {
	const {
		data: results = [],
		isLoading,
		isError,
		error,
	} = useAssignmentResults(assignment.id);

	return (
		<Card>
			<CardHeader className="space-y-0">
				<CardTitle className="font-display text-xl">Results</CardTitle>
				<p className="text-sm text-muted-foreground truncate">
					{assignment.title}
				</p>
			</CardHeader>
			<CardContent className="p-4 pt-0">
				{isLoading ? (
					<div className="flex items-center justify-center h-24">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : isError ? (
					<div className="flex items-center justify-center h-24">
						<p className="text-sm text-destructive">
							{error?.message ?? "Failed to load results"}
						</p>
					</div>
				) : results.length > 0 ? (
					<div className="overflow-x-auto">
						<div className="min-w-[32rem] space-y-1">
							<div
								className={cn(
									COLS,
									"px-3 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground",
								)}
							>
								<span>Student</span>
								<span className="text-right">Attempts</span>
								<span className="text-right">Best / Most</span>
								<span className="text-right">Accuracy</span>
								<span className="text-right">Last attempt</span>
							</div>
							{results.map((row) => (
								<ResultRow key={row.studentId} row={row} />
							))}
						</div>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center h-24 gap-1 text-center">
						<p className="text-sm font-medium text-muted-foreground">
							No students enrolled yet.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
