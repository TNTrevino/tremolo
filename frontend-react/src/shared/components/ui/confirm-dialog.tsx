import type { ReactNode } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

export interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description: ReactNode;
	confirmLabel: string;
	pending: boolean;
	onConfirm: () => void;
}

/**
 * A confirm/cancel dialog for destructive actions (archive, remove,
 * delete). Cancel is outline, confirm is destructive-styled and shows
 * its own loading state while `pending`.
 */
export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	pending,
	onConfirm,
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent onOpenChange={onOpenChange} className="max-w-md">
				<DialogHeader>
					<DialogTitle className="font-display">{title}</DialogTitle>
				</DialogHeader>
				<div className="p-6">
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={pending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						loading={pending}
						onClick={onConfirm}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
