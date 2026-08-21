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
import { Router } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { AuthService } from "../../../../auth/services/auth.service";
import { AuthStore } from "../../../../auth/services/auth.store";
import { NotificationService } from "../../../../core/services/notification.service";
import { FormFieldComponent } from "../../../../shared/components/forms/form-field.component";
import { FormInputDirective } from "../../../../shared/components/forms/form-input.directive";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import {
	type DeleteAccountFormData,
	deleteAccountSchema,
	type PasswordChangeFormData,
	passwordChangeSchema,
} from "../../../../shared/validators/auth.schemas";

const BLANK_PASSWORD_FORM: PasswordChangeFormData = {
	currentPassword: "",
	newPassword: "",
	confirmPassword: "",
};

const BLANK_DELETE_FORM: DeleteAccountFormData = { emailConfirmation: "" };

/**
 * Account settings. Port of frontend-react/src/pages/AccountPage.tsx.
 *
 * Five cards and a confirmation modal, of which **nothing talks to the
 * server**: React answered the password form, the data download and the
 * deletion with toasts, because the Go service registers no route for any
 * of them (`backend/main/controllers/user_info_controller.go` mounts one
 * GET). That is ported as-is -- the strings below are the product's current
 * promises, not placeholders someone forgot. There is therefore **no
 * `rxResource` on this page**; see phase-3-subfeature-3-handoff.md.
 *
 * Two Signal Forms live here rather than one, exactly as React ran two
 * `useForm`s: the schemas are unrelated and the delete form has to reset
 * independently when the modal is dismissed.
 */
@Component({
	selector: "app-account-page",
	imports: [
		ButtonComponent,
		FormField,
		FormFieldComponent,
		FormInputDirective,
		NgIcon,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./account-page.component.html",
})
export class AccountPageComponent {
	private readonly auth = inject(AuthService);
	private readonly store = inject(AuthStore);
	private readonly router = inject(Router);
	private readonly notifications = inject(NotificationService);

	readonly user = this.store.user;

	/** Reveals all three password fields at once, as React's single flag did. */
	readonly showPasswords = signal(false);
	readonly showDeleteModal = signal(false);

	private readonly passwordModel = signal<PasswordChangeFormData>({
		...BLANK_PASSWORD_FORM,
	});
	readonly passwordForm = form(this.passwordModel, (path) => {
		validateStandardSchema(path, passwordChangeSchema);
	});

	private readonly deleteModel = signal<DeleteAccountFormData>({
		...BLANK_DELETE_FORM,
	});
	readonly deleteForm = form(this.deleteModel, (path) => {
		validateStandardSchema(path, deleteAccountSchema);
	});

	togglePasswords(): void {
		this.showPasswords.update((shown) => !shown);
	}

	submitPasswordChange(event: Event): void {
		event.preventDefault();

		this.passwordForm().markAsTouched();
		if (this.passwordForm().invalid()) return;

		this.notifications.showInfo("Password update functionality coming soon!");
		// `reset(value)` clears touched/dirty *and* sets the model back, which
		// is the pair React Hook Form's `reset()` did in one call.
		this.passwordForm().reset({ ...BLANK_PASSWORD_FORM });
	}

	downloadData(): void {
		this.notifications.showInfo(
			"Your data download will begin shortly. (Feature coming soon)",
		);
	}

	openDeleteModal(): void {
		this.showDeleteModal.set(true);
	}

	closeDeleteModal(): void {
		this.showDeleteModal.set(false);
		this.deleteForm().reset({ ...BLANK_DELETE_FORM });
	}

	submitDelete(event: Event): void {
		event.preventDefault();

		this.deleteForm().markAsTouched();
		if (this.deleteForm().invalid()) return;

		const email = this.user()?.email;
		if (this.deleteModel().emailConfirmation !== email) {
			this.notifications.showError("Email does not match your account email");
			return;
		}

		this.notifications.showSuccess("Account deletion would occur here");
		// React ran this through `useLogout().mutate(...)` for its `onSuccess`
		// hook; `AuthService.logout()` is local-only and synchronous (the Go
		// service has no logout endpoint), so the navigation follows it
		// directly.
		this.auth.logout();
		void this.router.navigateByUrl("/");
	}
}
