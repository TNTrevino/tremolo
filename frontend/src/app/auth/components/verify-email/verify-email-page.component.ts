import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	OnInit,
	signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { SpinnerComponent } from "../../../core/components/spinner/spinner.component";
import { NotificationService } from "../../../core/services/notification.service";
import { CARD_DIRECTIVES } from "../../../shared/components/ui/card.directive";
import { ButtonComponent } from "../../../shared/components/ui/button.component";
import { getErrorMessage } from "../../../shared/utils/error.utils";
import { AuthService } from "../../services/auth.service";
import { AuthStore } from "../../services/auth.store";

type VerifyStatus = "pending" | "success" | "failure";

/**
 * #108: redeems an email-verification token from the emailed link
 * (`/verify-email?token=...`).
 *
 * `token` arrives as a component input via the router's
 * `withComponentInputBinding()` (app.config.ts) -- same as
 * ResetPasswordPageComponent's, and that is *why* this fetch runs from
 * `ngOnInit` rather than the constructor GoogleCallbackPageComponent uses:
 * GoogleCallbackPageComponent reads an injected `ActivatedRoute` snapshot,
 * available immediately at construction, but a router-bound `input()` is
 * not set until after the component is constructed -- reading it in the
 * constructor here would always see the default `""`.
 *
 * A missing token gets the same "invalid or expired" message a bad token
 * would get from the server, and never sends a request that could only
 * fail -- same reasoning as ResetPasswordPageComponent's `!token()` guard.
 */
@Component({
	selector: "app-verify-email-page",
	imports: [
		ButtonComponent,
		NgIcon,
		RouterLink,
		SpinnerComponent,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./verify-email-page.component.html",
})
export class VerifyEmailPageComponent implements OnInit {
	private readonly auth = inject(AuthService);
	private readonly store = inject(AuthStore);
	private readonly notifications = inject(NotificationService);

	readonly token = input("");

	readonly status = signal<VerifyStatus>("pending");
	readonly message = signal("");
	readonly resending = signal(false);

	/** Where "Continue" goes once verification succeeds. */
	readonly onwardUrl = computed(() =>
		this.store.isAuthenticated() ? "/dashboard" : "/login",
	);

	/**
	 * The resend button on the failure state only makes sense signed in:
	 * signed out, there is no authenticated account for
	 * AuthService.resendVerification to identify.
	 */
	readonly canResend = computed(() => this.store.isAuthenticated());

	ngOnInit(): void {
		const token = this.token();
		if (!token) {
			this.status.set("failure");
			this.message.set("This verification link is invalid or has expired.");
			return;
		}

		this.auth.verifyEmail(token).subscribe({
			next: (res) => {
				this.status.set("success");
				this.message.set(res.message);
			},
			error: (err: unknown) => {
				this.status.set("failure");
				this.message.set(getErrorMessage(err));
			},
		});
	}

	resend(): void {
		if (this.resending()) return;
		this.resending.set(true);

		this.auth.resendVerification().subscribe({
			next: (res) => {
				this.resending.set(false);
				this.notifications.showSuccess(res.message);
			},
			error: (err: unknown) => {
				this.resending.set(false);
				this.notifications.showError(getErrorMessage(err));
			},
		});
	}
}
