import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { GoogleOAuthService } from "./google-oauth.service";

/**
 * Port of the behaviour in
 * frontend-react/src/features/auth/services/google-oauth.ts, which had no
 * test of its own. The `state` round trip is the CSRF defence the callback
 * page depends on, so it is pinned here rather than left to the E2E run --
 * the parity suite cannot drive Google's consent screen.
 */
describe("GoogleOAuthService", () => {
	let oauth: GoogleOAuthService;

	beforeEach(() => {
		sessionStorage.clear();
		TestBed.configureTestingModule({});
		oauth = TestBed.inject(GoogleOAuthService);
	});

	it("builds the authorize URL Google is configured for", () => {
		const url = new URL(oauth.getAuthUrl());

		expect(`${url.origin}${url.pathname}`).toBe(
			"https://accounts.google.com/o/oauth2/v2/auth",
		);
		expect(url.searchParams.get("client_id")).toBe(environment.googleClientId);
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("scope")).toBe("openid email profile");
		expect(url.searchParams.get("access_type")).toBe("online");
		expect(url.searchParams.get("prompt")).toBe("select_account");
		expect(url.searchParams.get("redirect_uri")).toBe(oauth.getRedirectUri());
	});

	it("points the redirect URI at the callback route", () => {
		expect(oauth.getRedirectUri()).toBe(
			`${window.location.origin}/auth/google/callback`,
		);
	});

	it("stashes the state it sent, and accepts it back exactly once", () => {
		const state = new URL(oauth.getAuthUrl()).searchParams.get("state");

		expect(state).toMatch(/^[0-9a-f]{64}$/);
		expect(oauth.verifyState(state as string)).toBe(true);
		// Consumed: a replayed callback cannot pass a second time.
		expect(oauth.verifyState(state as string)).toBe(false);
	});

	it("rejects a state it did not send, and consumes the stored one anyway", () => {
		const state = new URL(oauth.getAuthUrl()).searchParams.get("state");

		expect(oauth.verifyState("forged")).toBe(false);
		expect(oauth.verifyState(state as string)).toBe(false);
	});

	it("generates a fresh state per call", () => {
		const first = new URL(oauth.getAuthUrl()).searchParams.get("state");
		const second = new URL(oauth.getAuthUrl()).searchParams.get("state");

		expect(first).not.toBe(second);
	});

	it("refuses to build a URL when the client id is not configured", () => {
		const configured = environment.googleClientId;
		environment.googleClientId = "";
		try {
			expect(() => oauth.getAuthUrl()).toThrow(/not configured/i);
		} finally {
			environment.googleClientId = configured;
		}
	});
});
