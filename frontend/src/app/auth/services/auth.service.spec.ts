import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { AuthService } from "./auth.service";
import { AuthStore } from "./auth.store";
import { TokenStorage } from "./token.storage";

const AUTH = `${environment.mainApi}/api/auth`;

const LOGIN_RESPONSE = {
	user: {
		id: 42,
		email: "student@tremolo.test",
		first_name: "Stu",
		last_name: "Dent",
		role: "STUDENT" as const,
	},
	access_token: "access-1",
	refresh_token: "refresh-1",
};

describe("AuthService", () => {
	let auth: AuthService;
	let store: AuthStore;
	let tokens: TokenStorage;
	let backend: HttpTestingController;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		auth = TestBed.inject(AuthService);
		store = TestBed.inject(AuthStore);
		tokens = TestBed.inject(TokenStorage);
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => backend.verify());

	it("stores both tokens and the user on login", () => {
		auth.login({ email: "student@tremolo.test", password: "pw" }).subscribe();
		backend.expectOne(`${AUTH}/login`).flush(LOGIN_RESPONSE);

		expect(tokens.getAccessToken()).toBe("access-1");
		expect(tokens.getRefreshToken()).toBe("refresh-1");
		expect(store.isAuthenticated()).toBe(true);
		// snake_case in, camelCase out.
		expect(store.user()?.firstName).toBe("Stu");
	});

	it("does not sign the new account in on register", () => {
		auth
			.register({
				email: "new@tremolo.test",
				password: "pw",
				first_name: "New",
				last_name: "User",
				role: "STUDENT",
			})
			.subscribe();
		backend.expectOne(`${AUTH}/register`).flush({
			message: "User created successfully",
			user: LOGIN_RESPONSE.user,
		});

		expect(store.isAuthenticated()).toBe(false);
		expect(tokens.getAccessToken()).toBeNull();
	});

	it("emits the new access token on refresh and stores both", () => {
		tokens.setTokens("stale", "refresh-1");
		let emitted: string | null = null;

		auth.refreshToken().subscribe((token) => (emitted = token));
		const req = backend.expectOne(`${AUTH}/refresh`);
		expect(req.request.body).toEqual({ refresh_token: "refresh-1" });
		req.flush({ access_token: "access-2", refresh_token: "refresh-2" });

		expect(emitted).toBe("access-2");
		expect(tokens.getRefreshToken()).toBe("refresh-2");
		expect(store.token()).toBe("access-2");
	});

	it("fails the stream when there is no refresh token", () => {
		let failed: unknown = null;

		auth.refreshToken().subscribe({ error: (err: unknown) => (failed = err) });

		expect(failed).toBeInstanceOf(Error);
	});

	it("clears tokens and the store on logout", () => {
		auth.login({ email: "student@tremolo.test", password: "pw" }).subscribe();
		backend.expectOne(`${AUTH}/login`).flush(LOGIN_RESPONSE);

		auth.logout();

		expect(tokens.getAccessToken()).toBeNull();
		expect(tokens.getRefreshToken()).toBeNull();
		expect(store.user()).toBeNull();
		expect(store.isAuthenticated()).toBe(false);
	});
});
