import { Injectable } from "@angular/core";

import { environment } from "../../../environments/environment";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_STATE_KEY = "google_oauth_state";

/**
 * Port of frontend-react/src/features/auth/services/google-oauth.ts.
 *
 * Everything here is browser plumbing -- `crypto`, `sessionStorage`,
 * `window.location` -- and no method talks to a server, so D5's
 * "services return Observables" does not apply: there is nothing
 * asynchronous to cancel, retry or pipe. It is a service rather than a
 * module of free functions only so a test can replace it.
 *
 * The `sessionStorage` key (`google_oauth_state`) and the authorize-URL
 * parameters are unchanged from React: the Go service and Google's console
 * are both configured against them.
 */
@Injectable({ providedIn: "root" })
export class GoogleOAuthService {
	/**
	 * The authorize URL to send the browser to, with a fresh CSRF state
	 * stashed in `sessionStorage` for {@link verifyState} to check on the
	 * way back.
	 *
	 * Throws when the client id is not configured, exactly as React did.
	 * Angular's global `ErrorHandler` (Phase 2) turns that into an error
	 * toast over the page the user is already on.
	 */
	getAuthUrl(): string {
		const clientId = environment.googleClientId;
		if (!clientId) {
			throw new Error(
				"Google OAuth is not configured: googleClientId is missing",
			);
		}

		const state = this.generateState();
		sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);

		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: this.getRedirectUri(),
			response_type: "code",
			scope: "openid email profile",
			state,
			access_type: "online",
			prompt: "select_account",
		});

		return `${GOOGLE_AUTH_URL}?${params.toString()}`;
	}

	/**
	 * Whether the `state` Google handed back is the one we sent. Consumes
	 * the stored value either way, so a replayed callback cannot pass twice.
	 */
	verifyState(state: string): boolean {
		const stored = sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
		sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
		return stored === state;
	}

	/** Must match the redirect URI registered with Google and sent to the Go service. */
	getRedirectUri(): string {
		return `${window.location.origin}/auth/google/callback`;
	}

	private generateState(): string {
		const bytes = new Uint8Array(32);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
	}
}
