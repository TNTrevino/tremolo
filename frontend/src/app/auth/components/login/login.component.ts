import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
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
	loginSchema,
	type LoginFormData,
} from "../../../shared/validators/auth.schemas";
import { getErrorMessage } from "../../../shared/utils/error.utils";
import { AuthService } from "../../services/auth.service";
import { AuthStore } from "../../services/auth.store";
import { GoogleSignInButtonComponent } from "../google-sign-in-button/google-sign-in-button.component";

/**
 * Login -- and, with signup, the worked example of the Signal Forms + zod
 * wiring (D11) that the rest of Phase 3 copies.
 *
 * The whole pattern is four lines:
 *
 * ```ts
 * private readonly model = signal<LoginFormData>({ email: "", password: "" });
 * readonly loginForm = form(this.model, (path) => {
 *   validateStandardSchema(path, loginSchema);
 * });
 * ```
 *
 * plus `[formField]="loginForm.email"` on the input. `appFormInput` reads
 * the field's own state for the red border and `<app-form-field
 * [field]="loginForm.email">` renders the message, so no call site threads
 * an `error` string by hand.
 *
 * Contracts the parity suite selects on and that must survive any restyle:
 * the heading "Welcome to Tremolo", the labels "Email Address" and
 * "Password", and the "Sign In" button (`exact: true`). So must the
 * redirect: `AuthStore.redirectUrl() ?? "/dashboard"`, then cleared.
 */
@Component({
	selector: "app-login-page",
	imports: [
		ButtonComponent,
		FormField,
		FormFieldComponent,
		FormInputDirective,
		GoogleSignInButtonComponent,
		NgIcon,
		RouterLink,
		TooltipDirective,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./login.component.html",
})
export class LoginPageComponent {
	private readonly auth = inject(AuthService);
	private readonly store = inject(AuthStore);
	private readonly router = inject(Router);

	private readonly model = signal<LoginFormData>({ email: "", password: "" });

	readonly loginForm = form(this.model, (path) => {
		validateStandardSchema(path, loginSchema);
	});

	readonly pending = signal(false);
	readonly errorMessage = signal<string | null>(null);
	readonly showPassword = signal(false);
	readonly passwordToggleLabel = computed(() =>
		this.showPassword() ? "Hide password" : "Show password",
	);

	/**
	 * The message signup or a failed Google callback left behind, read once
	 * at construction. React carried it in react-router's location state;
	 * `AuthStore.takeNotice()` is the port (see `auth.store.ts`).
	 */
	readonly notice = signal(this.store.takeNotice());

	togglePassword(): void {
		this.showPassword.update((shown) => !shown);
	}

	/**
	 * The native `submit` event, not `(ngSubmit)`: that one comes from
	 * `FormsModule`'s `NgForm` directive, which Signal Forms does not bring
	 * with it. Without `preventDefault()` the browser submits the form as a
	 * GET and the password lands in the URL.
	 */
	submit(event: Event): void {
		event.preventDefault();
		if (this.pending()) return;

		// Reveals every message at once, the way React Hook Form's default
		// `mode: "onSubmit"` did -- errors stay hidden until a field is
		// touched, and this touches them all.
		this.loginForm().markAsTouched();
		if (this.loginForm().invalid()) return;

		this.pending.set(true);
		this.errorMessage.set(null);

		// One-shot action, so a plain subscribe is the sanctioned shape
		// (PLAN.md 5.6): the HttpClient observable completes after one
		// emission and tears its own subscription down.
		this.auth.login(this.model()).subscribe({
			next: () => {
				const target = this.store.redirectUrl() ?? "/dashboard";
				this.store.redirectUrl.set(null);
				void this.router.navigateByUrl(target, { replaceUrl: true });
			},
			error: (err: unknown) => {
				this.pending.set(false);
				this.errorMessage.set(getErrorMessage(err));
			},
		});
	}
}
