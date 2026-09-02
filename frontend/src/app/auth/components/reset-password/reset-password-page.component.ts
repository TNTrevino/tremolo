import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	signal,
} from "@angular/core";
import {
	form,
	FormField,
	validateStandardSchema,
} from "@angular/forms/signals";
import { Router, RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { CARD_DIRECTIVES } from "../../../shared/components/ui/card.directive";
import { ButtonComponent } from "../../../shared/components/ui/button.component";
import { FormFieldComponent } from "../../../shared/components/forms/form-field.component";
import { FormInputDirective } from "../../../shared/components/forms/form-input.directive";
import { TooltipDirective } from "../../../shared/components/ui/tooltip.directive";
import {
	resetPasswordSchema,
	type ResetPasswordFormData,
} from "../../../shared/validators/auth.schemas";
import { getErrorMessage } from "../../../shared/utils/error.utils";
import { showHideLabel } from "../../../shared/utils/password-toggle.utils";
import { AuthService } from "../../services/auth.service";
import { AuthStore } from "../../services/auth.store";

/**
 * #248: redeems a password reset token from the emailed link
 * (`/reset-password?token=...`).
 *
 * `token` arrives as a component input via the router's
 * `withComponentInputBinding()` (app.config.ts) rather than
 * `ActivatedRoute` -- its name has to match the query parameter exactly.
 *
 * A missing token means the visitor did not arrive from a real link (a
 * bookmark, a stripped query string, the path typed by hand): the page
 * shows the same "invalid or expired" message a bad token would get from
 * the server, and never sends a request that could only fail.
 */
@Component({
	selector: "app-reset-password-page",
	imports: [
		ButtonComponent,
		FormField,
		FormFieldComponent,
		FormInputDirective,
		NgIcon,
		RouterLink,
		TooltipDirective,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./reset-password-page.component.html",
})
export class ResetPasswordPageComponent {
	private readonly auth = inject(AuthService);
	private readonly store = inject(AuthStore);
	private readonly router = inject(Router);

	readonly token = input("");

	private readonly model = signal<ResetPasswordFormData>({
		password: "",
		confirmPassword: "",
	});

	readonly resetPasswordForm = form(this.model, (path) => {
		validateStandardSchema(path, resetPasswordSchema);
	});

	readonly pending = signal(false);
	readonly errorMessage = signal<string | null>(null);
	readonly showPassword = signal(false);
	readonly showConfirmPassword = signal(false);

	readonly passwordToggleLabel = showHideLabel(this.showPassword, "password");
	readonly confirmPasswordToggleLabel = showHideLabel(
		this.showConfirmPassword,
		"confirm password",
	);

	togglePassword(): void {
		this.showPassword.update((shown) => !shown);
	}

	toggleConfirmPassword(): void {
		this.showConfirmPassword.update((shown) => !shown);
	}

	submit(event: Event): void {
		event.preventDefault();
		if (this.pending() || !this.token()) return;

		this.resetPasswordForm().markAsTouched();
		if (this.resetPasswordForm().invalid()) return;

		this.pending.set(true);
		this.errorMessage.set(null);

		this.auth
			.resetPassword({ token: this.token(), password: this.model().password })
			.subscribe({
				next: () => {
					this.store.setNotice("success", "Password updated. Please log in.");
					void this.router.navigateByUrl("/login");
				},
				error: (err: unknown) => {
					this.pending.set(false);
					this.errorMessage.set(getErrorMessage(err));
				},
			});
	}
}
