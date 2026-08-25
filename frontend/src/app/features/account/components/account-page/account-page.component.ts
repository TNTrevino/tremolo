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
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import {
	type DeleteAccountFormData,
	deleteAccountSchema,
	type EmailChangeFormData,
	emailChangeSchema,
	type PasswordChangeFormData,
	passwordChangeSchema,
} from "../../../../shared/validators/auth.schemas";
import type { UserExport } from "../../models/export.models";
import { AccountService } from "../../services/account.service";

const BLANK_PASSWORD_FORM: PasswordChangeFormData = {
	currentPassword: "",
	newPassword: "",
	confirmPassword: "",
};

const BLANK_EMAIL_FORM: EmailChangeFormData = {
	currentPassword: "",
	newEmail: "",
};

const BLANK_DELETE_FORM: DeleteAccountFormData = { emailConfirmation: "" };

/**
 * Account settings. Port of frontend-react/src/pages/AccountPage.tsx.
 *
 * Five cards and a confirmation modal. The delete-account action still
 * has no backend route and stays a toast stub, ported as-is -- see
 * phase-3-subfeature-3-handoff.md. Password and email changes (#249) and
 * the data export (#243) are all real: AccountService's PUT/POST/GET
 * calls, wired the same way every other mutation on this page-tier is (a
 * one-shot `.subscribe()`, not `rxResource`).
 *
 * Three Signal Forms live here, exactly as React ran three separate form
 * hooks: the schemas are unrelated, and the delete form has to reset
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
	private readonly account = inject(AccountService);
	private readonly store = inject(AuthStore);
	private readonly router = inject(Router);
	private readonly notifications = inject(NotificationService);

	readonly user = this.store.user;

	/**
	 * Reveals all three password-change fields at once, as React's single
	 * flag did -- and, since #249, the email-change form's current-password
	 * field too (see the template: it has no reveal button of its own, it
	 * just reads this same signal).
	 */
	readonly showPasswords = signal(false);
	readonly showDeleteModal = signal(false);

	readonly passwordPending = signal(false);
	readonly emailPending = signal(false);
	readonly exporting = signal(false);

	private readonly passwordModel = signal<PasswordChangeFormData>({
		...BLANK_PASSWORD_FORM,
	});
	readonly passwordForm = form(this.passwordModel, (path) => {
		validateStandardSchema(path, passwordChangeSchema);
	});

	private readonly emailModel = signal<EmailChangeFormData>({
		...BLANK_EMAIL_FORM,
	});
	readonly emailForm = form(this.emailModel, (path) => {
		validateStandardSchema(path, emailChangeSchema);
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

		const userId = this.user()?.id;
		if (userId === undefined || this.passwordPending()) return;

		this.passwordPending.set(true);
		this.account
			.changePassword(userId, {
				current_password: this.passwordModel().currentPassword,
				new_password: this.passwordModel().newPassword,
			})
			.subscribe({
				next: () => {
					this.passwordPending.set(false);
					this.notifications.showSuccess("Password updated.");
					// `reset(value)` clears touched/dirty *and* sets the model
					// back, the pair React Hook Form's `reset()` did in one call.
					this.passwordForm().reset({ ...BLANK_PASSWORD_FORM });
				},
				error: (err: unknown) => {
					this.passwordPending.set(false);
					this.notifications.showError(getErrorMessage(err));
					// Deliberately NOT reset: the most likely failure is a
					// wrong current password, and the visitor must not have
					// to retype every field to fix the one that was wrong.
				},
			});
	}

	submitEmailChange(event: Event): void {
		event.preventDefault();

		this.emailForm().markAsTouched();
		if (this.emailForm().invalid()) return;

		const userId = this.user()?.id;
		if (userId === undefined || this.emailPending()) return;

		this.emailPending.set(true);
		this.account
			.requestEmailChange(userId, {
				current_password: this.emailModel().currentPassword,
				new_email: this.emailModel().newEmail,
			})
			.subscribe({
				next: (res) => {
					this.emailPending.set(false);
					this.notifications.showSuccess(res.message);
					this.emailForm().reset({ ...BLANK_EMAIL_FORM });
				},
				error: (err: unknown) => {
					this.emailPending.set(false);
					this.notifications.showError(getErrorMessage(err));
					// Same reasoning as the password form: a wrong current
					// password is the likely failure, so the field is left
					// as typed rather than forcing a full retry.
				},
			});
	}

	/** Downloads the caller's own data export (#243): fetch it, then hand
	 * it to saveExport to turn into a file. */
	exportData(): void {
		const userId = this.user()?.id;
		if (userId === undefined || this.exporting()) return;

		this.exporting.set(true);
		this.account.exportData(userId).subscribe({
			next: (data) => {
				this.exporting.set(false);
				this.saveExport(data);
				this.notifications.showSuccess("Your data has been downloaded.");
			},
			error: (err: unknown) => {
				this.exporting.set(false);
				this.notifications.showError(getErrorMessage(err));
			},
		});
	}

	/** Turns a fetched export into a downloaded file: an object URL wrapping
	 * a JSON blob, clicked through a throwaway anchor and immediately
	 * revoked. The date-stamped filename is entirely client-side -- the
	 * response carries only the bytes. */
	private saveExport(data: UserExport): void {
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		try {
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = `tremolo-data-${new Date().toISOString().slice(0, 10)}.json`;
			anchor.click();
		} finally {
			URL.revokeObjectURL(url);
		}
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
