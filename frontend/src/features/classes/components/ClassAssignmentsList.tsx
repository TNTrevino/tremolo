import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/shared/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
	useClassAssignments,
	useDeleteAssignment,
} from "@/shared/hooks/queries";
import type { Assignment } from "@/features/classes/types";
import type { GameType } from "@/services/api/types";
import { CreateAssignmentDialog } from "./CreateAssignmentDialog";

interface ClassAssignmentsListProps {
	classId: number;
	selectedId: number | null;
	onSelect: (assignment: Assignment) => void;
}

const GAME_TYPE_LABELS: Record<GameType, string> = {
	note: "Note",
	key_signature: "Key Signature",
	scale: "Scale",
	chord: "Chord",
	interval: "Interval",
};

function formatDueDate(iso: string | null): string | null {
	if (!iso) return null;
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function AssignmentRow({
	assignment,
	selected,
	onSelect,
}: {
	assignment: Assignment;
	selected: boolean;
	onSelect: () => void;
}) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const deleteAssignment = useDeleteAssignment();
	const due = formatDueDate(assignment.dueAt);

	const targets: string[] = [];
	if (assignment.targetQuestions != null) {
		targets.push(`${assignment.targetQuestions} questions`);
	}
	if (assignment.targetAccuracy != null) {
		targets.push(`${assignment.targetAccuracy}% accuracy`);
	}

	function handleDelete() {
		deleteAssignment.mutate(
			{ assignmentId: assignment.id, classId: assignment.classId },
			{ onSuccess: () => setConfirmOpen(false) },
		);
	}

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect();
				}
			}}
			className={cn(
				"flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
				selected ? "bg-primary text-primary-foreground" : "hover:bg-accent/50",
			)}
		>
			<div className="flex-1 min-w-0">
				<span className="text-sm font-medium truncate block">
					{assignment.title}
				</span>
				<p
					className={cn(
						"text-xs truncate",
						selected ? "text-primary-foreground/70" : "text-muted-foreground",
					)}
				>
					{GAME_TYPE_LABELS[assignment.gameType]}
					{due ? ` · Due ${due}` : ""}
					{targets.length > 0 ? ` · ${targets.join(", ")}` : ""}
				</p>
			</div>
			<Button
				variant="ghost"
				size="icon"
				aria-label={`Delete ${assignment.title}`}
				className={cn(
					selected
						? "text-primary-foreground hover:bg-primary-foreground/10"
						: "text-muted-foreground hover:text-destructive",
				)}
				onClick={(e) => {
					e.stopPropagation();
					setConfirmOpen(true);
				}}
			>
				<Trash2 className="h-4 w-4" />
			</Button>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent onOpenChange={setConfirmOpen} className="max-w-md">
					<DialogHeader>
						<DialogTitle className="font-display">
							Delete assignment?
						</DialogTitle>
					</DialogHeader>
					<div className="p-6">
						<p className="text-sm text-muted-foreground">
							Delete{" "}
							<span className="font-medium text-foreground">
								{assignment.title}
							</span>
							? Student attempts for it will no longer be tracked.
						</p>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setConfirmOpen(false)}
							disabled={deleteAssignment.isPending}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							loading={deleteAssignment.isPending}
							onClick={handleDelete}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export function ClassAssignmentsList({
	classId,
	selectedId,
	onSelect,
}: ClassAssignmentsListProps) {
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const {
		data: assignments = [],
		isLoading,
		isError,
		error,
	} = useClassAssignments(classId);

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between space-y-0">
				<CardTitle className="font-display text-xl">Assignments</CardTitle>
				<Button variant="brass" size="sm" onClick={() => setIsCreateOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					New assignment
				</Button>
			</CardHeader>
			<CardContent className="p-2">
				{isLoading ? (
					<div className="flex items-center justify-center h-24">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : isError ? (
					<div className="flex items-center justify-center h-24">
						<p className="text-sm text-destructive">
							{error?.message ?? "Failed to load assignments"}
						</p>
					</div>
				) : assignments.length > 0 ? (
					assignments.map((assignment) => (
						<AssignmentRow
							key={assignment.id}
							assignment={assignment}
							selected={assignment.id === selectedId}
							onSelect={() => onSelect(assignment)}
						/>
					))
				) : (
					<div className="flex flex-col items-center justify-center h-24 gap-1 text-center">
						<p className="text-sm font-medium text-muted-foreground">
							No assignments yet — create one to start tracking practice.
						</p>
					</div>
				)}
			</CardContent>

			<CreateAssignmentDialog
				classId={classId}
				open={isCreateOpen}
				onOpenChange={setIsCreateOpen}
			/>
		</Card>
	);
}
