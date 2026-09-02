import { computed, Directive, inject } from "@angular/core";
import { FORM_FIELD } from "@angular/forms/signals";

import { inputClasses } from "../ui/input.directive";
import { type FieldErrorSource, fieldErrorMessage } from "./field-error";

/**
 * Port of frontend-react/src/shared/components/forms/FormInput.tsx.
 *
 * In React this component existed to splice a React Hook Form
 * `registration` object into the `Input` primitive. Signal Forms'
 * `[formField]` does that binding itself, so what is left -- and what this
 * directive does -- is the other half: style the input from the bound
 * field's own state, so no call site has to thread an `error` string
 * through by hand.
 *
 * ```html
 * <input appFormInput id="email" type="email" [formField]="form.email" />
 * ```
 *
 * `FORM_FIELD` is the token the `[formField]` directive provides on the
 * same element; `{ self: true }` is what keeps this reading *its own*
 * field rather than an ancestor's. Without `[formField]` the directive is
 * still a valid styled input -- it just never turns red on its own.
 */
@Directive({
	selector: "input[appFormInput], textarea[appFormInput]",
	host: {
		"[class]": "classes()",
		"[attr.aria-invalid]": "message() ? true : null",
	},
})
export class FormInputDirective {
	private readonly formField = inject(FORM_FIELD, {
		optional: true,
		self: true,
	});

	protected readonly message = computed(() => {
		const bound = this.formField;
		const source: FieldErrorSource | null = bound ? () => bound.state() : null;
		return fieldErrorMessage(source);
	});

	protected readonly classes = computed(() => inputClasses(this.message()));
}
