import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import {
	ActivatedRoute,
	Router,
	convertToParamMap,
	provideRouter,
} from "@angular/router";
import type { MockInstance } from "vitest";

import { environment } from "../../../../environments/environment";
import { AuthStore } from "../../services/auth.store";
import { GoogleOAuthService } from "../../services/google-oauth.service";
import { GoogleCallbackPageComponent } from "./google-callback-page.component";

const CALLBACK_URL = `${environment.mainApi}/api/auth/google/callback`;

const LOGIN_RESPONSE = {
	user: {
		id: 9,
		email: "google@tremolo.test",
		first_name: "Goo",
		last_name: "Gle",
		role: "STUDENT" as const,
	},
	access_token: "access-g",
	refresh_token: "refresh-g",
};

/**
 * Port of frontend-react/src/pages/GoogleCallbackPage.tsx, which had no
 * test. Every path through it ends in a navigation, so what is asserted is
 * where the user lands and what message they land with -- the same pair
 * react-router carried in location state.
 *
 * The four failure messages are user-visible copy; one of them
 * ("OAuth callback missing required parameters.") is what the
 * `google-callback` screenshot baseline actually shows, because the
 * baseline visits this route with no query string at all.
 */
describe("GoogleCallbackPageComponent", () => {
	let store: AuthStore;
	let backend: HttpTestingController;
	let navigate: MockInstance;

	function arrange(query: Record<string, string>): void {
		localStorage.clear();
		sessionStorage.clear();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: ActivatedRoute,
					useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
				},
			],
		});
		store = TestBed.inject(AuthStore);
		backend = TestBed.inject(HttpTestingController);
		navigate = vi
			.spyOn(TestBed.inject(Router), "navigateByUrl")
			.mockResolvedValue(true);
	}

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	/** Makes `state` the value the OAuth service would accept back. */
	function sendState(value: string): void {
		const oauth = TestBed.inject(GoogleOAuthService);
		vi.spyOn(oauth, "verifyState").mockImplementation(
			(state) => state === value,
		);
		vi.spyOn(oauth, "getRedirectUri").mockReturnValue(
			"http://localhost/auth/google/callback",
		);
	}

	async function render(): Promise<void> {
		const fixture = TestBed.createComponent(GoogleCallbackPageComponent);
		await fixture.whenStable();
	}

	function expectBouncedToLogin(message: string): void {
		expect(navigate).toHaveBeenCalledWith("/login", { replaceUrl: true });
		expect(store.takeNotice()).toEqual({ kind: "error", message });
	}

	it("tells the user a cancelled sign-in was cancelled", async () => {
		arrange({ error: "access_denied" });
		await render();

		expectBouncedToLogin("Google sign-in was cancelled.");
		backend.expectNone(CALLBACK_URL);
	});

	it("reports any other Google error generically", async () => {
		arrange({ error: "server_error" });
		await render();

		expectBouncedToLogin("Google sign-in failed. Please try again.");
	});

	it("rejects a callback with no code or state", async () => {
		arrange({});
		await render();

		expectBouncedToLogin("OAuth callback missing required parameters.");
		backend.expectNone(CALLBACK_URL);
	});

	it("rejects a state it did not send", async () => {
		arrange({ code: "auth-code", state: "forged" });
		sendState("the-real-state");
		await render();

		expectBouncedToLogin("OAuth state verification failed. Please try again.");
		backend.expectNone(CALLBACK_URL);
	});

	it("exchanges the code and lands on the dashboard", async () => {
		arrange({ code: "auth-code", state: "the-real-state" });
		sendState("the-real-state");
		await render();

		const request = backend.expectOne(CALLBACK_URL);
		expect(request.request.body).toEqual({
			code: "auth-code",
			redirect_uri: "http://localhost/auth/google/callback",
		});
		request.flush(LOGIN_RESPONSE);

		expect(store.isAuthenticated()).toBe(true);
		expect(navigate).toHaveBeenCalledWith("/dashboard", { replaceUrl: true });
		expect(store.takeNotice()).toBeNull();
	});

	it("says so when the exchange linked an existing account", async () => {
		arrange({ code: "auth-code", state: "the-real-state" });
		sendState("the-real-state");
		await render();

		backend
			.expectOne(CALLBACK_URL)
			.flush({ ...LOGIN_RESPONSE, account_linked: true });

		expect(navigate).toHaveBeenCalledWith("/dashboard", { replaceUrl: true });
		expect(store.takeNotice()).toEqual({
			kind: "info",
			message: "Your Google account has been linked to your existing account.",
		});
	});

	it("sends a failed exchange back to login with the server's message", async () => {
		arrange({ code: "auth-code", state: "the-real-state" });
		sendState("the-real-state");
		await render();

		backend
			.expectOne(CALLBACK_URL)
			.flush(
				{ error: "Google account not linked" },
				{ status: 400, statusText: "" },
			);

		expectBouncedToLogin("Google account not linked");
	});

	it("shows a spinner while the exchange is in flight", async () => {
		arrange({ code: "auth-code", state: "the-real-state" });
		sendState("the-real-state");
		const fixture = TestBed.createComponent(GoogleCallbackPageComponent);
		await fixture.whenStable();

		const el = fixture.nativeElement as HTMLElement;
		expect(el.textContent).toContain("Signing in with Google...");
		expect(el.querySelector('[role="status"]')).not.toBeNull();

		backend.expectOne(CALLBACK_URL).flush(LOGIN_RESPONSE);
	});
});
