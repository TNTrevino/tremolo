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
import { NgIcon } from "@ng-icons/core";

import { AppErrorComponent } from "../../core/components/app-error/app-error.component";
import { ConfirmDialogComponent } from "../../core/components/confirm-dialog/confirm-dialog.component";
import { SpinnerComponent } from "../../core/components/spinner/spinner.component";
import { NotificationService } from "../../core/services/notification.service";
import { FormFieldComponent } from "../../shared/components/forms/form-field.component";
import { FormErrorComponent } from "../../shared/components/forms/form-error.component";
import { FormInputDirective } from "../../shared/components/forms/form-input.directive";
import { FormLabelComponent } from "../../shared/components/forms/form-label.component";
import { FormSelectDirective } from "../../shared/components/forms/form-select.directive";
import { RhythmGlyphComponent } from "../../shared/components/music/rhythm-glyph.component";
import {
	ButtonComponent,
	type ButtonSize,
	type ButtonVariant,
} from "../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../shared/components/ui/card.directive";
import { DIALOG_DIRECTIVES } from "../../shared/components/ui/dialog.component";
import { InputDirective } from "../../shared/components/ui/input.directive";
import { LabelDirective } from "../../shared/components/ui/label.directive";
import { SelectComponent } from "../../shared/components/ui/select.component";
import { SkeletonDirective } from "../../shared/components/ui/skeleton.directive";
import {
	signupSchema,
	type SignupFormData,
} from "../../shared/validators/auth.schemas";
import type { ToastType } from "../../core/services/notification.service";

/**
 * `/dev/kit` -- the shared UI kit, on one page.
 *
 * Not part of the product: it exists so a human (or a verifier) can see
 * every primitive in both themes at once, and so a regression in one of
 * them is visible without hunting through features. Deleting it is one
 * route entry in `app.routes.ts` plus this folder; nothing in the app
 * imports it.
 *
 * It is unguarded on purpose -- it renders nothing user-specific and
 * nothing it shows touches the API.
 */
@Component({
	selector: "app-kit-page",
	imports: [
		AppErrorComponent,
		ButtonComponent,
		ConfirmDialogComponent,
		FormField,
		FormErrorComponent,
		FormFieldComponent,
		FormInputDirective,
		FormLabelComponent,
		FormSelectDirective,
		InputDirective,
		LabelDirective,
		NgIcon,
		RhythmGlyphComponent,
		SelectComponent,
		SkeletonDirective,
		SpinnerComponent,
		...CARD_DIRECTIVES,
		...DIALOG_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./kit-page.component.html",
})
export class KitPageComponent {
	private readonly notifications = inject(NotificationService);

	protected readonly variants: ButtonVariant[] = [
		"default",
		"brass",
		"destructive",
		"outline",
		"secondary",
		"ghost",
		"link",
	];
	protected readonly sizes: ButtonSize[] = [
		"sm",
		"default",
		"lg",
		"xl",
		"icon",
	];
	protected readonly toastTypes: ToastType[] = [
		"success",
		"error",
		"warning",
		"info",
	];

	protected readonly dialogOpen = signal(false);
	protected readonly confirmOpen = signal(false);
	protected readonly confirmPending = signal(false);
	protected readonly plainSelect = signal("treble");
	protected readonly plainInput = signal("");

	/**
	 * The Signal Forms + zod round trip (D11), on the real signup schema:
	 * blur a field or press "Validate" and the zod message appears under
	 * it; fix the value and it clears. `confirmPassword` proves the
	 * cross-field case -- that message comes from the schema's `.refine`,
	 * not from a field rule.
	 */
	private readonly signupModel = signal<SignupFormData>({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
		confirmPassword: "",
		role: "STUDENT",
	});

	protected readonly signupForm = form(this.signupModel, (path) => {
		validateStandardSchema(path, signupSchema);
	});

	protected showToast(type: ToastType): void {
		this.notifications.showToast(
			`This is a ${type} toast. It dismisses itself after five seconds.`,
			type,
			type[0]!.toUpperCase() + type.slice(1),
		);
	}

	protected validateSignup(): void {
		this.signupForm().markAsTouched();
	}

	protected resetSignup(): void {
		this.signupModel.set({
			firstName: "Ada",
			lastName: "Lovelace",
			email: "ada@tremolo.test",
			password: "Str0ng!pass",
			confirmPassword: "Str0ng!pass",
			role: "TEACHER",
		});
	}

	protected confirmDestructive(): void {
		this.confirmPending.set(true);
		setTimeout(() => {
			this.confirmPending.set(false);
			this.confirmOpen.set(false);
			this.notifications.showSuccess("Pretend thing deleted.");
		}, 600);
	}
}
