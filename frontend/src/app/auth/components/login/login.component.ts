import { Component, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";

import { getErrorMessage } from "../../../shared/utils/error.utils";
import { AuthService } from "../../services/auth.service";
import { AuthStore } from "../../services/auth.store";

/**
 * Login. Phase 1 wires the flow end to end against the Go service; the
 * markup is deliberately bare, and Phase 2 restyles it with the ported UI
 * kit and the Signal Forms + zod schema (D11).
 *
 * What is already contractual and must survive that restyle: the heading
 * "Welcome to Tremolo", the field labels "Email Address" and "Password",
 * and the "Sign In" button -- the parity suite selects on all four.
 */
@Component({
	selector: "app-login-page",
	imports: [RouterLink],
	templateUrl: "./login.component.html",
})
export class LoginPageComponent {
	private readonly auth = inject(AuthService);
	private readonly store = inject(AuthStore);
	private readonly router = inject(Router);

	readonly email = signal("");
	readonly password = signal("");
	readonly pending = signal(false);
	readonly errorMessage = signal<string | null>(null);

	value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	/**
	 * The native submit event, not `(ngSubmit)`: that one comes from
	 * `FormsModule`'s `NgForm` directive, and this component deliberately
	 * imports no forms module -- Phase 2 brings Signal Forms (D11). Without
	 * the directive `(ngSubmit)` never fires and the browser submits the
	 * form as a GET, which puts the password in the URL.
	 */
	submit(event: Event): void {
		event.preventDefault();
		if (this.pending()) return;

		this.pending.set(true);
		this.errorMessage.set(null);

		// One-shot action, so a plain subscribe is the sanctioned shape
		// (PLAN.md 5.6): the HttpClient observable completes after one
		// emission and tears its own subscription down.
		this.auth
			.login({ email: this.email(), password: this.password() })
			.subscribe({
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
