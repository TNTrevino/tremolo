import { Directive, effect, inject } from "@angular/core";
import { FORM_FIELD } from "@angular/forms/signals";

import { SelectComponent } from "../ui/select.component";
import { type FieldErrorSource, fieldErrorMessage } from "./field-error";

/**
 * Port of frontend-react/src/shared/components/forms/FormSelect.tsx --
 * the select-shaped twin of `appFormInput`.
 *
 * `<app-select>` implements `FormValueControl`, so `[formField]` already
 * moves the value both ways. This directive adds the error styling: it
 * reads the bound field and pushes the message into the select's `error`
 * model, which is why that member is a `model()` rather than an `input()`.
 *
 * ```html
 * <app-select appFormSelect selectId="role" [formField]="form.role">
 *   <option value="STUDENT">Student</option>
 * </app-select>
 * ```
 */
@Directive({ selector: "app-select[appFormSelect]" })
export class FormSelectDirective {
	private readonly select = inject(SelectComponent, { self: true });
	private readonly formField = inject(FORM_FIELD, {
		optional: true,
		self: true,
	});

	constructor() {
		effect(() => {
			const bound = this.formField;
			const source: FieldErrorSource | null = bound
				? () => bound.state()
				: null;
			this.select.error.set(fieldErrorMessage(source));
		});
	}
}
