import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { QueryState } from "@/shared/components/QueryState";
import { useStudentAssignments } from "@/shared/hooks/queries";
import { AssignmentCard } from "./AssignmentCard";

export function StudentAssignmentsList() {
	const {
		data: assignments = [],
		isLoading,
		isError,
		error,
	} = useStudentAssignments();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-2xl">My Assignments</CardTitle>
			</CardHeader>
			<CardContent>
				<QueryState
					isLoading={isLoading}
					isError={isError}
					error={error}
					errorFallback="Failed to load assignments."
					loading={
						<div className="space-y-2">
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					}
					isEmpty={assignments.length === 0}
					empty={
						<p className="py-8 text-center text-sm text-muted-foreground">
							No assignments yet. Join a class to get assignments.
						</p>
					}
				>
					<div className="divide-y divide-border">
						{assignments.map((assignment) => (
							<AssignmentCard key={assignment.id} assignment={assignment} />
						))}
					</div>
				</QueryState>
			</CardContent>
		</Card>
	);
}
