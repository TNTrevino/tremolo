import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTeacherClasses } from "@/shared/hooks/queries";
import { ClassHeader } from "@/features/classes/components/ClassHeader";
import { RosterList } from "@/features/classes/components/RosterList";
import { ClassAssignmentsList } from "@/features/classes/components/ClassAssignmentsList";
import { AssignmentResultsGrid } from "@/features/classes/components/AssignmentResultsGrid";
import type { Assignment } from "@/features/classes/types";

export function ClassDetailPage() {
	const { id } = useParams<{ id: string }>();
	const classId = Number(id);
	const { data: classes = [], isLoading } = useTeacherClasses();
	const [selected, setSelected] = useState<Assignment | null>(null);

	const classItem = classes.find((c) => c.id === classId);

	return (
		<div className="min-h-screen py-8 px-4">
			<div className="container mx-auto max-w-4xl space-y-6">
				<Link
					to="/classes"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					All classes
				</Link>

				{isLoading ? (
					<div className="flex items-center justify-center h-40">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : !classItem || Number.isNaN(classId) ? (
					<div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
						<p className="text-sm font-medium text-muted-foreground">
							Class not found, or you don&rsquo;t have access to it.
						</p>
						<Link to="/classes" className="text-sm text-primary underline">
							Back to my classes
						</Link>
					</div>
				) : (
					<>
						<ClassHeader classItem={classItem} />
						<RosterList classId={classId} />
						<ClassAssignmentsList
							classId={classId}
							selectedId={selected?.id ?? null}
							onSelect={setSelected}
						/>
						{selected && <AssignmentResultsGrid assignment={selected} />}
					</>
				)}
			</div>
		</div>
	);
}
