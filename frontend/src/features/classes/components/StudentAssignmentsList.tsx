import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useStudentAssignments } from "@/shared/hooks/queries";
import { getErrorMessage } from "@/shared/utils/error.utils";
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
				{isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				) : isError ? (
					<p className="py-8 text-center text-sm text-destructive">
						{getErrorMessage(error) || "Failed to load assignments."}
					</p>
				) : assignments.length > 0 ? (
					<div className="divide-y divide-border">
						{assignments.map((assignment) => (
							<AssignmentCard key={assignment.id} assignment={assignment} />
						))}
					</div>
				) : (
					<p className="py-8 text-center text-sm text-muted-foreground">
						No assignments yet. Join a class to get assignments.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
