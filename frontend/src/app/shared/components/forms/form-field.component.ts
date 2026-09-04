import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";

import { cn } from "../../utils/cn";
import { type FieldErrorSource, fieldErrorMessage } from "./field-error";
import { FormErrorComponent } from "./form-error.component";
import { FormLabelComponent } from "./form-label.component";

/**
 * Port of frontend-react/src/shared/components/forms/FormField.tsx: label,
 * control, error message, in that order.
 *
 * React took the message as a string (`errors.email?.message` from React
 * Hook Form). This version takes either:
 *
 * ```html
 * <!-- bind the field and it reads its own errors -->
 * <app-form-field label="Email Address" htmlFor="email" [field]="form.email">
 *   <input appFormInput id="email" [formField]="form.email" />
 * </app-form-field>
 *
 * <!-- or pass a message, for server-side errors -->
 * <app-form-field label="Email Address" [error]="serverError()"> … </app-form-field>
 * ```
 *
 * `error` wins when both are set, so a submit failure can override what
 * the schema is saying.
 *
 * A bound `field` shows nothing until the user has typed in it and moved
 * on, or until the submit handler calls `revealErrors(form)`. See
 * `field-error.ts` for why (#303). An `error` string is not gated: it is
 * the server talking, and the server only talks after a submit.
 */
@Component({
	selector: "app-form-field",
	imports: [FormErrorComponent, FormLabelComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<div [class]="classes()">
			@if (label(); as text) {
				<app-form-label [htmlFor]="htmlFor()" [required]="required()">{{
					text
				}}</app-form-label>
			}
			<ng-content />
			<app-form-error [message]="message()" />
		</div>
	`,
})
export class FormFieldComponent {
	readonly label = input<string | null>(null);
	readonly htmlFor = input<string | null>(null);
	readonly required = input(false);
	readonly className = input("");

	/** An explicit message; takes precedence over `field`. */
	readonly error = input<string | null | undefined>(null);

	/** A Signal Forms field to read touched-state and errors from. */
	readonly field = input<FieldErrorSource | null>(null);

	protected readonly classes = computed(() =>
		cn("space-y-1.5", this.className()),
	);

	protected readonly message = computed(
		() => this.error() ?? fieldErrorMessage(this.field()),
	);
}
