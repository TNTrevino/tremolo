import { JoinClassCard } from "@/features/classes/components/JoinClassCard";
import { StudentAssignmentsList } from "@/features/classes/components/StudentAssignmentsList";

/**
 * Student-facing page: join a class by code and see assigned practice
 * with progress against each assignment's (advisory) target.
 */
export function AssignmentsPage() {
	return (
		<div className="min-h-screen px-4 py-8">
			<div className="container mx-auto max-w-3xl space-y-6">
				<h1 className="font-display text-3xl font-bold">Assignments</h1>
				<JoinClassCard />
				<StudentAssignmentsList />
			</div>
		</div>
	);
}
