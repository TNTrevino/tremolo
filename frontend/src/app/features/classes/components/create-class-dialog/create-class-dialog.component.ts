import {
	ChangeDetectionStrategy,
	Component,
	inject,
	model,
	output,
	signal,
} from "@angular/core";
import {
	form,
	FormField,
	validateStandardSchema,
} from "@angular/forms/signals";
import { z } from "zod";

import { NotificationService } from "../../../../core/services/notification.service";
import { FormFieldComponent } from "../../../../shared/components/forms/form-field.component";
import { FormInputDirective } from "../../../../shared/components/forms/form-input.directive";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { DIALOG_DIRECTIVES } from "../../../../shared/components/ui/dialog.component";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import type { Class } from "../../models/classes.models";
import { ClassesService } from "../../services/classes.service";

/** React's `register("name", { required: "Class name is required" })`. */
export const createClassSchema = z.object({
	name: z.string().min(1, "Class name is required"),
});

export type CreateClassFormData = z.infer<typeof createClassSchema>;

/**
 * Port of
 * frontend-react/src/features/classes/components/CreateClassDialog.tsx.
 *
 * Two ports worth naming:
 *
 * - React reset the form in a `useEffect` keyed on `open`. Closing is an
 *   event, not a state to observe, so the reset happens in `close()`.
 * - The mutation's `meta.errorTitle` -- which reached a toast through the
 *   TanStack `MutationCache` -- becomes a direct `showError` call in the
 *   error arm. Same message, same title, no cache.
 *
 * The parity suite drives this by label and button text: "Class name" and
 * "Create class". Both are contracts.
 */
@Component({
	selector: "app-create-class-dialog",
	imports: [
		ButtonComponent,
		FormField,
		FormFieldComponent,
		FormInputDirective,
		...DIALOG_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	templateUrl: "./create-class-dialog.component.html",
})
export class CreateClassDialogComponent {
	private readonly classes = inject(ClassesService);
	private readonly notifications = inject(NotificationService);

	readonly open = model.required<boolean>();

	/** The class the server created, so the list can refetch. */
	readonly created = output<Class>();

	// Named `formModel` rather than sub-feature 1's `model` only because
	// `model()` from @angular/core is also in scope in this file.
	private readonly formModel = signal<CreateClassFormData>({ name: "" });

	readonly createForm = form(this.formModel, (path) => {
		validateStandardSchema(path, createClassSchema);
	});

	readonly pending = signal(false);

	close(): void {
		// `reset(value)` clears touched/dirty *and* writes the value back, so
		// reopening starts blank with no error showing -- the effect React got
		// from `reset()` in a `useEffect` keyed on `open`.
		this.createForm().reset({ name: "" });
		this.pending.set(false);
		this.open.set(false);
	}

	submit(event: Event): void {
		event.preventDefault();
		if (this.pending()) return;

		this.createForm().markAsTouched();
		if (this.createForm().invalid()) return;

		this.pending.set(true);

		this.classes.createClass(this.formModel().name).subscribe({
			next: (created) => {
				this.created.emit(created);
				this.close();
			},
			error: (err: unknown) => {
				this.pending.set(false);
				this.notifications.showError(
					getErrorMessage(err),
					"Failed to create class",
				);
			},
		});
	}
}
