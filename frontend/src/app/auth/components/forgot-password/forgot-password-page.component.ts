import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal,
} from "@angular/core";
import {
	form,
	FormField,
	validateStandardSchema,
} from "@angular/forms/signals";
import { RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { CARD_DIRECTIVES } from "../../../shared/components/ui/card.directive";
import { ButtonComponent } from "../../../shared/components/ui/button.component";
import { revealErrors } from "../../../shared/components/forms/field-error";
import { FormFieldComponent } from "../../../shared/components/forms/form-field.component";
import { FormInputDirective } from "../../../shared/components/forms/form-input.directive";
import {
	forgotPasswordSchema,
	type ForgotPasswordFormData,
} from "../../../shared/validators/auth.schemas";
import { getErrorMessage } from "../../../shared/utils/error.utils";
import { AuthService } from "../../services/auth.service";

/**
 * #248: requests a password reset link.
 *
 * The confirmation is identical whether or not the address has an account
 * -- core-api's `RequestPasswordReset` never reveals account existence --
 * so there is no "unknown email" branch to render here either. A
 * successful submit swaps the form for the API's own message, verbatim:
 * the copy lives once, on the server, and this page never repeats it.
 */
@Component({
	selector: "app-forgot-password-page",
	imports: [
		ButtonComponent,
		FormField,
		FormFieldComponent,
		FormInputDirective,
		NgIcon,
		RouterLink,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./forgot-password-page.component.html",
})
export class ForgotPasswordPageComponent {
	private readonly auth = inject(AuthService);

	private readonly model = signal<ForgotPasswordFormData>({ email: "" });

	readonly forgotPasswordForm = form(this.model, (path) => {
		validateStandardSchema(path, forgotPasswordSchema);
	});

	readonly pending = signal(false);
	readonly errorMessage = signal<string | null>(null);

	/** Set on success; its presence is what swaps the form for the confirmation. */
	readonly confirmationMessage = signal<string | null>(null);

	submit(event: Event): void {
		event.preventDefault();
		if (this.pending()) return;

		revealErrors(this.forgotPasswordForm);
		if (this.forgotPasswordForm().invalid()) return;

		this.pending.set(true);
		this.errorMessage.set(null);

		this.auth.forgotPassword(this.model()).subscribe({
			next: (res) => {
				this.pending.set(false);
				this.confirmationMessage.set(res.message);
			},
			error: (err: unknown) => {
				this.pending.set(false);
				this.errorMessage.set(getErrorMessage(err));
			},
		});
	}
}
