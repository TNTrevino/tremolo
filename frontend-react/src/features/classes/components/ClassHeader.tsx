import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Users } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useArchiveClass } from "@/shared/hooks/queries";
import { useCopyToClipboard } from "@/shared/hooks";
import type { Class } from "@/features/classes/types";

interface ClassHeaderProps {
	classItem: Class;
}

export function ClassHeader({ classItem }: ClassHeaderProps) {
	const navigate = useNavigate();
	const { copied, copy } = useCopyToClipboard();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const archiveClass = useArchiveClass();

	function handleCopy() {
		void copy(classItem.joinCode);
	}

	function handleArchive() {
		archiveClass.mutate(classItem.id, {
			onSuccess: () => {
				setConfirmOpen(false);
				navigate("/classes");
			},
		});
	}

	return (
		<Card>
			<CardContent className="p-6 space-y-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<h1 className="font-display text-3xl font-bold truncate">
							{classItem.name}
						</h1>
						<span className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
							<Users className="h-4 w-4" />
							<span className="tabular-nums">{classItem.studentCount}</span>
							{classItem.studentCount === 1 ? "student" : "students"}
						</span>
					</div>
					<Button
						variant="outline"
						className="text-destructive hover:bg-destructive/10"
						onClick={() => setConfirmOpen(true)}
					>
						Archive class
					</Button>
				</div>

				<div className="flex items-center justify-between gap-2 rounded-md border-2 border-border bg-secondary px-4 py-3 sm:max-w-xs">
					<div>
						<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
							Join code
						</p>
						<p className="font-display text-2xl font-semibold tracking-widest">
							{classItem.joinCode}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={handleCopy}
						aria-label="Copy join code"
					>
						{copied ? (
							<Check className="h-4 w-4 text-correct" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</Button>
				</div>
			</CardContent>

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Archive class?"
				description={
					<>
						This hides{" "}
						<span className="font-medium text-foreground">
							{classItem.name}
						</span>{" "}
						from everyone — students lose access and it can&rsquo;t be undone
						from here. Existing data is kept.
					</>
				}
				confirmLabel="Archive class"
				pending={archiveClass.isPending}
				onConfirm={handleArchive}
			/>
		</Card>
	);
}
