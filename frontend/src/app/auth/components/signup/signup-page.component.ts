import { HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	linkedSignal,
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
import { FormSelectDirective } from "../../../shared/components/forms/form-select.directive";
import { SelectComponent } from "../../../shared/components/ui/select.component";
import {
	signupSchema,
	type SignupFormData,
} from "../../../shared/validators/auth.schemas";
import { getErrorMessage } from "../../../shared/utils/error.utils";
import type { PasswordRequirement } from "../../models/auth.models";
import { AuthService } from "../../services/auth.service";
import { AuthStore } from "../../services/auth.store";
import { GoogleSignInButtonComponent } from "../google-sign-in-button/google-sign-in-button.component";

/** The five rules `signupSchema` enforces, as a live checklist. */
const PASSWORD_RULES: readonly {
	label: string;
	test: (password: string) => boolean;
}[] = [
	{ label: "At least 8 characters", test: (p) => p.length >= 8 },
	{ label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
	{ label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
	{ label: "Contains number", test: (p) => /\d/.test(p) },
	{
		label: "Contains special character",
		test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
	},
];

export interface PasswordStrength {
	label: string;
	barClass: string;
	textClass: string;
	width: string;
}

const NO_STRENGTH: PasswordStrength = {
	label: "",
	barClass: "",
	textClass: "",
	width: "0%",
};

const WEAK: PasswordStrength = {
	label: "Weak",
	barClass: "bg-destructive",
	textClass: "text-destructive",
	width: "25%",
};

/**
 * React's `getPasswordStrength()`, keyed on how many of the five rules are
 * met -- 0 nothing, 1-2 Weak, 3 Fair, 4 Good, 5 Strong.
 *
 * React derived the label's colour at runtime
 * (`color.replace("bg-", "text-")`), which Tailwind's scanner cannot see;
 * both class names are literals here so both actually exist in the
 * stylesheet. No baseline captures this panel -- it only appears once the
 * password field has focus or content -- so this is a fix, not a diff.
 */
const STRENGTH_BY_MET_COUNT: readonly PasswordStrength[] = [
	NO_STRENGTH,
	WEAK,
	WEAK,
	{
		label: "Fair",
		barClass: "bg-orange-500",
		textClass: "text-orange-500",
		width: "50%",
	},
	{
		label: "Good",
		barClass: "bg-yellow-500",
		textClass: "text-yellow-500",
		width: "75%",
	},
	{
		label: "Strong",
		barClass: "bg-green-500",
		textClass: "text-green-500",
		width: "100%",
	},
];

/**
 * Whether a failed registration was the invite code being rejected.
 *
 * The Go service marks that one case with `field: "invite_code"`
 * (`respondRegisterError` in `core-api/controllers/auth_controller.go`).
 * No other response in this API carries a `field` key, so the check lives
 * here rather than in `shared/utils/error.utils.ts`.
 */
function isInviteCodeError(err: unknown): boolean {
	return (
		err instanceof HttpErrorResponse &&
		(err.error as { field?: string } | null)?.field === "invite_code"
	);
}

/**
 * Port of frontend-react/src/pages/SignupPage.tsx.
 *
 * The Signal Forms + zod wiring is the same four lines the login page uses
 * (see `login.component.ts`); what this page adds is the two things a
 * bigger form needs:
 *
 * - **A cross-field rule.** `signupSchema`'s `.refine()` reports "Passwords
 *   do not match" on `confirmPassword`, and `validateStandardSchema` maps
 *   each issue's path onto the matching field, so it lands on the right
 *   control with no extra wiring.
 * - **A custom control.** `<app-select appFormSelect [formField]="...">`
 *   binds because `SelectComponent` implements `FormValueControl<string>`.
 *
 * Registration deliberately does not sign the new account in -- same as
 * React. The user lands on `/login` with the notice "Account created!
 * Please log in.", which `auth.spec.ts` asserts verbatim.
 */
@Component({
	selector: "app-signup-page",
	imports: [
		ButtonComponent,
		FormField,
		FormFieldComponent,
		FormInputDirective,
		FormSelectDirective,
		GoogleSignInButtonComponent,
		NgIcon,
		RouterLink,
		SelectComponent,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./signup-page.component.html",
})
export class SignupPageComponent {
	private readonly auth = inject(AuthService);
	private readonly store = inject(AuthStore);
	private readonly router = inject(Router);

	private readonly model = signal<SignupFormData>({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
		confirmPassword: "",
		role: "STUDENT",
		inviteCode: "",
	});

	readonly signupForm = form(this.model, (path) => {
		validateStandardSchema(path, signupSchema);
	});

	readonly pending = signal(false);
	readonly errorMessage = signal<string | null>(null);
	readonly showPassword = signal(false);
	readonly showConfirmPassword = signal(false);
	readonly passwordFocused = signal(false);

	/** Only a teacher signup asks for an invite code (#250). */
	readonly isTeacher = computed(() => this.model().role === "TEACHER");

	/**
	 * A rejected invite code, shown under the field rather than in the page
	 * alert. `linkedSignal` on `role` so switching away from Teacher and
	 * back cannot resurrect the message for a code that is no longer typed.
	 */
	readonly inviteCodeError = linkedSignal<
		SignupFormData["role"],
		string | null
	>({
		source: () => this.model().role,
		computation: () => null,
	});

	protected readonly password = computed(() => this.model().password);

	readonly requirements = computed<PasswordRequirement[]>(() =>
		PASSWORD_RULES.map((rule) => ({
			label: rule.label,
			met: rule.test(this.password()),
		})),
	);

	readonly strength = computed<PasswordStrength>(() => {
		const met = this.requirements().filter(
			(requirement) => requirement.met,
		).length;
		return STRENGTH_BY_MET_COUNT[met] ?? NO_STRENGTH;
	});

	/** React showed the checklist while the field had focus or any content. */
	readonly showRequirements = computed(
		() => this.passwordFocused() || this.password().length > 0,
	);

	togglePassword(): void {
		this.showPassword.update((shown) => !shown);
	}

	toggleConfirmPassword(): void {
		this.showConfirmPassword.update((shown) => !shown);
	}

	submit(event: Event): void {
		event.preventDefault();
		if (this.pending()) return;

		this.signupForm().markAsTouched();
		if (this.signupForm().invalid()) return;

		this.pending.set(true);
		this.errorMessage.set(null);
		this.inviteCodeError.set(null);

		const data = this.model();
		this.auth
			.register({
				email: data.email,
				password: data.password,
				first_name: data.firstName,
				last_name: data.lastName,
				role: data.role,
				// Sent only by a teacher: a student never sees the field. The
				// Go service itself gates on role, not on this key's presence
				// -- InviteCode defaults to "" whether the key is sent or
				// omitted -- but leaving it out keeps a student's payload free
				// of a field they never filled in.
				...(data.role === "TEACHER"
					? { invite_code: data.inviteCode.trim() }
					: {}),
			})
			.subscribe({
				next: () => {
					this.store.setNotice("success", "Account created! Please log in.");
					void this.router.navigateByUrl("/login");
				},
				error: (err: unknown) => {
					this.pending.set(false);
					if (isInviteCodeError(err)) {
						this.inviteCodeError.set(getErrorMessage(err));
						return;
					}
					this.errorMessage.set(getErrorMessage(err));
				},
			});
	}
}
