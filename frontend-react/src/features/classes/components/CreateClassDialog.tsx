import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/shared/components/forms/FormField";
import { FormInput } from "@/shared/components/forms/FormInput";
import { useCreateClass } from "@/shared/hooks/queries";

interface CreateClassFormData {
	name: string;
}

export interface CreateClassDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateClassDialog({
	open,
	onOpenChange,
}: CreateClassDialogProps) {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<CreateClassFormData>({ defaultValues: { name: "" } });
	const createClass = useCreateClass();

	// Reset the form whenever the dialog closes, so reopening starts fresh.
	useEffect(() => {
		if (!open) {
			reset();
		}
	}, [open, reset]);

	function onSubmit(data: CreateClassFormData) {
		createClass.mutate(data.name, {
			onSuccess: () => {
				reset();
				onOpenChange(false);
			},
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent onOpenChange={onOpenChange}>
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle className="font-display">New class</DialogTitle>
					</DialogHeader>
					<div className="p-6">
						<FormField
							label="Class name"
							required
							htmlFor="class-name"
							error={errors.name?.message}
						>
							<FormInput
								id="class-name"
								placeholder="Symphonic Band"
								registration={register("name", {
									required: "Class name is required",
								})}
								error={errors.name?.message}
							/>
						</FormField>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={createClass.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="brass"
							loading={createClass.isPending}
						>
							Create class
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
