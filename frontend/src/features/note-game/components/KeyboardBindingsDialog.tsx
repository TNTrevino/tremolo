import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/shared/components/ui/dialog";
import { KeyboardBindingsEditor } from "./KeyboardBindingsEditor";

export interface KeyboardBindingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	bindings: Record<string, string>;
	onSave: (bindings: Record<string, string>) => void;
}

function KeyboardBindingsDialogContent({
	bindings,
	onSave,
	onOpenChange,
}: Omit<KeyboardBindingsDialogProps, "open">) {
	const [draft, setDraft] = useState<Record<string, string>>(bindings);

	function handleSave() {
		onSave(draft);
		onOpenChange(false);
	}

	function handleCancel() {
		onOpenChange(false);
	}

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Keyboard Bindings</DialogTitle>
			</DialogHeader>
			<div className="p-6">
				<KeyboardBindingsEditor bindings={draft} onChange={setDraft} />
			</div>
			<DialogFooter>
				<Button variant="ghost" onClick={handleCancel}>
					Cancel
				</Button>
				<Button variant="default" onClick={handleSave}>
					Save
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}

export function KeyboardBindingsDialog({
	open,
	onOpenChange,
	bindings,
	onSave,
}: KeyboardBindingsDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<KeyboardBindingsDialogContent
				bindings={bindings}
				onSave={onSave}
				onOpenChange={onOpenChange}
			/>
		</Dialog>
	);
}
