import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import { SpinnerComponent } from "../../../core/components/spinner/spinner.component";
import { getErrorMessage } from "../../../shared/utils/error.utils";
import type { LoginResponse } from "../../models/auth.models";
import { AuthService } from "../../services/auth.service";
import { AuthStore } from "../../services/auth.store";
import { GoogleOAuthService } from "../../services/google-oauth.service";

/**
 * Port of frontend-react/src/pages/GoogleCallbackPage.tsx.
 *
 * Google sends the browser back here with `?code=&state=` (or `?error=`).
 * The page never renders anything but a spinner: every path ends in a
 * navigation, so there is nothing to show and therefore no `rxResource`
 * (D6) -- the token exchange is a one-shot action and takes PLAN.md 5.6's
 * plain `.subscribe()`. See the handoff for why sub-feature 1 does not
 * demonstrate the resource pattern.
 *
 * The four failure paths all land on `/login` with a message, exactly as
 * React did; `AuthStore.setNotice()` carries it in place of react-router's
 * location state.
 *
 * The work runs once, in the constructor. React needed a `useRef` guard
 * because StrictMode double-invokes effects; an Angular component is
 * constructed once, so the guard has no port.
 */
@Component({
	selector: "app-google-callback-page",
	imports: [SpinnerComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./google-callback-page.component.html",
})
export class GoogleCallbackPageComponent {
	private readonly auth = inject(AuthService);
	private readonly oauth = inject(GoogleOAuthService);
	private readonly store = inject(AuthStore);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);

	constructor() {
		this.exchange();
	}

	private exchange(): void {
		const params = this.route.snapshot.queryParamMap;
		const error = params.get("error");
		const code = params.get("code");
		const state = params.get("state");

		if (error) {
			this.failToLogin(
				error === "access_denied"
					? "Google sign-in was cancelled."
					: "Google sign-in failed. Please try again.",
			);
			return;
		}

		if (!code || !state) {
			this.failToLogin("OAuth callback missing required parameters.");
			return;
		}

		if (!this.oauth.verifyState(state)) {
			this.failToLogin("OAuth state verification failed. Please try again.");
			return;
		}

		this.auth
			.googleCallback({ code, redirect_uri: this.oauth.getRedirectUri() })
			.subscribe({
				next: (response: LoginResponse) => {
					// `AuthService.googleCallback` has already stored the tokens
					// and the user, so this is only the "where next" half.
					if (response.account_linked) {
						this.store.setNotice(
							"info",
							"Your Google account has been linked to your existing account.",
						);
					}
					void this.router.navigateByUrl("/dashboard", { replaceUrl: true });
				},
				error: (err: unknown) => this.failToLogin(getErrorMessage(err)),
			});
	}

	private failToLogin(message: string): void {
		this.store.setNotice("error", message);
		void this.router.navigateByUrl("/login", { replaceUrl: true });
	}
}
