import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { StudentAssignment } from "@/features/classes/types";

interface AssignmentCardProps {
	assignment: StudentAssignment;
}

/**
 * Whether the student's best accuracy has met the assignment's target.
 * Targets are advisory — this is a purely client-side computation, the
 * backend never grades against target_accuracy.
 */
export function hasMetTarget(assignment: StudentAssignment): boolean | null {
	if (assignment.targetAccuracy == null) return null;
	return assignment.bestAccuracy >= assignment.targetAccuracy;
}

function formatDueDate(dueAt: string | null): string | null {
	if (!dueAt) return null;
	return new Date(dueAt).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
	const dueDate = formatDueDate(assignment.dueAt);
	const metTarget = hasMetTarget(assignment);

	return (
		<div className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent/50">
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="truncate text-sm font-medium">
						{assignment.title}
					</span>
					{metTarget !== null && (
						<span
							className={cn(
								"rounded-full px-2 py-0.5 text-xs font-medium",
								metTarget
									? "bg-correct/15 text-correct"
									: "bg-muted text-muted-foreground",
							)}
						>
							{metTarget
								? "Target met"
								: `Target ${assignment.targetAccuracy}%`}
						</span>
					)}
				</div>
				<p className="truncate text-xs text-muted-foreground">
					{assignment.className}
					{dueDate ? ` · Due ${dueDate}` : ""}
				</p>
				<p className="text-xs tabular-nums text-muted-foreground">
					{assignment.attemptCount > 0
						? `${assignment.attemptCount} attempt${assignment.attemptCount === 1 ? "" : "s"} · best ${assignment.bestCorrect} correct · ${assignment.bestAccuracy}% accuracy`
						: "No attempts yet"}
				</p>
			</div>
			<Link to={`/assignments/${assignment.id}/play`} className="shrink-0">
				<Button variant="default" size="sm">
					Practice
				</Button>
			</Link>
		</div>
	);
}
