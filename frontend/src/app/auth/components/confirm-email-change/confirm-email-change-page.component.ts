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
import { AccountService } from "../../../features/account/services/account.service";
import { CARD_DIRECTIVES } from "../../../shared/components/ui/card.directive";
import { getErrorMessage } from "../../../shared/utils/error.utils";
import { mapApiUserToUser } from "../../models/user.mapper";
import { AuthService } from "../../services/auth.service";
import { AuthStore } from "../../services/auth.store";

type ConfirmStatus = "pending" | "success" | "failure";

/**
 * #249: redeems an email-change confirmation token from the emailed link
 * (`/confirm-email-change?token=...`).
 *
 * Mirrors VerifyEmailPageComponent closely -- same `input()` +
 * `ngOnInit` shape (see that component's doc comment for why the fetch
 * runs from `ngOnInit` rather than the constructor), same three states,
 * same "missing token gets the same message a bad token would" guard.
 *
 * The one real difference is what a successful confirmation has to do to
 * the store. VerifyEmailPageComponent flips one boolean it already has in
 * hand (`emailVerified`) on the cached user. This page changes the
 * user's EMAIL, a field it does not have a fresher value for than
 * whatever the server just did -- so instead of patching the cached user
 * by hand, a signed-in visitor gets a real re-fetch through
 * AuthService.getCurrentUser(), mapped and written back with
 * AuthStore.setUser(). That is what lets the account page show the new
 * address without a fresh login.
 */
@Component({
	selector: "app-confirm-email-change-page",
	imports: [NgIcon, RouterLink, SpinnerComponent, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./confirm-email-change-page.component.html",
})
export class ConfirmEmailChangePageComponent implements OnInit {
	private readonly account = inject(AccountService);
	private readonly auth = inject(AuthService);
	private readonly store = inject(AuthStore);

	readonly token = input("");

	readonly status = signal<ConfirmStatus>("pending");
	readonly message = signal("");
	readonly newEmail = signal("");

	/** Where "Continue" goes once the confirmation succeeds -- the account
	 * page itself when signed in, so the new address is right there. */
	readonly onwardUrl = computed(() =>
		this.store.isAuthenticated() ? "/account" : "/login",
	);

	ngOnInit(): void {
		const token = this.token();
		if (!token) {
			this.status.set("failure");
			this.message.set(
				"This email confirmation link is invalid or has expired.",
			);
			return;
		}

		this.account.confirmEmailChange(token).subscribe({
			next: (res) => {
				this.status.set("success");
				this.message.set(res.message);
				this.newEmail.set(res.email);

				// Only when a session is already signed in on this device --
				// a signed-out visitor has no access token for
				// getCurrentUser's GET /api/auth/me to send, and there is no
				// "re-login" for a signed-out visitor to avoid in the first
				// place.
				if (this.store.isAuthenticated()) {
					this.auth.getCurrentUser().subscribe((apiUser) => {
						this.store.setUser(mapApiUserToUser(apiUser));
					});
				}
			},
			error: (err: unknown) => {
				this.status.set("failure");
				this.message.set(getErrorMessage(err));
			},
		});
	}
}
