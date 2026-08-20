import { useState } from "react";
import { Loader2, UserMinus } from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { QueryState } from "@/shared/components/QueryState";
import { useClassRoster, useRemoveStudent } from "@/shared/hooks/queries";
import { formatDate } from "@/shared/utils/date.utils";
import type { RosterEntry } from "@/features/classes/types";

interface RosterListProps {
	classId: number;
}

function RosterRow({
	entry,
	classId,
}: {
	entry: RosterEntry;
	classId: number;
}) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const removeStudent = useRemoveStudent();

	function handleRemove() {
		removeStudent.mutate(
			{ classId, studentId: entry.studentId },
			{ onSuccess: () => setConfirmOpen(false) },
		);
	}

	return (
		<div className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-accent/50">
			<div className="flex-1 min-w-0">
				<span className="text-sm font-medium truncate block">
					{entry.firstName} {entry.lastName}
				</span>
				<p className="text-xs text-muted-foreground truncate">
					Joined {formatDate(entry.joinedAt)}
				</p>
			</div>
			<Button
				variant="ghost"
				size="icon"
				aria-label={`Remove ${entry.firstName} ${entry.lastName}`}
				className="text-muted-foreground hover:text-destructive"
				onClick={() => setConfirmOpen(true)}
			>
				<UserMinus className="h-4 w-4" />
			</Button>

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Remove student?"
				description={
					<>
						Remove{" "}
						<span className="font-medium text-foreground">
							{entry.firstName} {entry.lastName}
						</span>{" "}
						from this class? They can rejoin later with the class code.
					</>
				}
				confirmLabel="Remove"
				pending={removeStudent.isPending}
				onConfirm={handleRemove}
			/>
		</div>
	);
}

export function RosterList({ classId }: RosterListProps) {
	const {
		data: roster = [],
		isLoading,
		isError,
		error,
	} = useClassRoster(classId);

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between space-y-0">
				<CardTitle className="font-display text-xl">Roster</CardTitle>
				<span className="tabular-nums text-sm text-muted-foreground">
					{roster.length}
				</span>
			</CardHeader>
			<CardContent className="p-2">
				<QueryState
					isLoading={isLoading}
					isError={isError}
					error={error}
					loading={
						<div className="flex items-center justify-center h-24">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					}
					isEmpty={roster.length === 0}
					empty={
						<div className="flex flex-col items-center justify-center h-24 gap-1 text-center">
							<p className="text-sm font-medium text-muted-foreground">
								No students yet — share the join code to get started.
							</p>
						</div>
					}
				>
					{roster.map((entry) => (
						<RosterRow key={entry.studentId} entry={entry} classId={classId} />
					))}
				</QueryState>
			</CardContent>
		</Card>
	);
}
