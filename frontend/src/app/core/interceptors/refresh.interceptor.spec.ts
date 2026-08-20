import {
	HttpClient,
	provideHttpClient,
	withInterceptors,
} from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";

import { environment } from "../../../environments/environment";
import { AuthStore } from "../../auth/services/auth.store";
import { TokenStorage } from "../../auth/services/token.storage";
import { authInterceptor } from "./auth.interceptor";
import { refreshInterceptor, resetRefreshState } from "./refresh.interceptor";

const ME = `${environment.mainApi}/api/auth/me`;
const REFRESH = `${environment.mainApi}/api/auth/refresh`;
const LOGIN = `${environment.mainApi}/api/auth/login`;

describe("refreshInterceptor", () => {
	let http: HttpClient;
	let backend: HttpTestingController;
	let store: AuthStore;
	let tokens: TokenStorage;

	beforeEach(() => {
		localStorage.clear();
		resetRefreshState();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(
					withInterceptors([authInterceptor, refreshInterceptor]),
				),
				provideHttpClientTesting(),
			],
		});
		http = TestBed.inject(HttpClient);
		backend = TestBed.inject(HttpTestingController);
		store = TestBed.inject(AuthStore);
		tokens = TestBed.inject(TokenStorage);
		tokens.setTokens("stale-access", "refresh-123");
		store.setToken("stale-access");
	});

	afterEach(() => {
		backend.verify();
		resetRefreshState();
	});

	it("refreshes once for N concurrent 401s, then retries them all", () => {
		// The thundering herd. React handled this with an `isRefreshing`
		// flag and a queue of parked promises; here it is one shared
		// observable, and this test is what proves the sharing works.
		const results: unknown[] = [];
		for (let i = 0; i < 4; i++) {
			http.get(`${ME}?n=${i}`).subscribe((res) => results.push(res));
		}

		// `req.url` keeps the query string, so match on the prefix.
		const failed = backend.match((req) => req.url.startsWith(ME));
		expect(failed.length).toBe(4);
		failed.forEach((req) =>
			req.flush(
				{ error: "Unauthorized" },
				{ status: 401, statusText: "Unauthorized" },
			),
		);

		// Exactly one refresh, no matter how many 401s arrived.
		const refresh = backend.expectOne(REFRESH);
		refresh.flush({
			access_token: "fresh-access",
			refresh_token: "fresh-refresh",
		});

		const retried = backend.match((req) => req.url.startsWith(ME));
		expect(retried.length).toBe(4);
		retried.forEach((req) => {
			expect(req.request.headers.get("Authorization")).toBe(
				"Bearer fresh-access",
			);
			req.flush({ ok: true });
		});

		expect(results.length).toBe(4);
		expect(tokens.getAccessToken()).toBe("fresh-access");
	});

	it("does not hold the refreshed token for a later 401", () => {
		// `finalize(() => refresh$ = null)`: the shared observable must be
		// gone once it settles, or it turns into a token cache (D6).
		http.get(ME).subscribe();
		backend
			.expectOne(ME)
			.flush({}, { status: 401, statusText: "Unauthorized" });
		backend
			.expectOne(REFRESH)
			.flush({ access_token: "first", refresh_token: "r1" });
		backend.expectOne(ME).flush({});

		http.get(ME).subscribe();
		backend
			.expectOne(ME)
			.flush({}, { status: 401, statusText: "Unauthorized" });

		// A second, live refresh -- not a replay of the buffered first one.
		backend
			.expectOne(REFRESH)
			.flush({ access_token: "second", refresh_token: "r2" });
		const retried = backend.expectOne(ME);
		expect(retried.request.headers.get("Authorization")).toBe("Bearer second");
		retried.flush({});
	});

	it("clears the session and routes to /login when the refresh fails", () => {
		const router = TestBed.inject(Router);
		const navigate = vi.spyOn(router, "navigate").mockResolvedValue(true);
		let failed: unknown = null;

		http.get(ME).subscribe({ error: (err: unknown) => (failed = err) });
		backend
			.expectOne(ME)
			.flush({}, { status: 401, statusText: "Unauthorized" });
		backend
			.expectOne(REFRESH)
			.flush(
				{ error: "Invalid refresh token" },
				{ status: 401, statusText: "Unauthorized" },
			);

		expect(store.isAuthenticated()).toBe(false);
		expect(store.user()).toBeNull();
		expect(tokens.getAccessToken()).toBeNull();
		expect(navigate).toHaveBeenCalledWith(["/login"]);
		expect(failed).not.toBeNull();
	});

	it("leaves a rejected login alone", () => {
		// The React app ran the failed login through this path and told the
		// user "Please log in again" instead of showing the server's
		// "Invalid credentials". Session endpoints are excluded now.
		let failed: unknown = null;
		http
			.post(LOGIN, { email: "a@b.test", password: "wrong" })
			.subscribe({ error: (err: unknown) => (failed = err) });

		backend
			.expectOne(LOGIN)
			.flush(
				{ error: "Invalid credentials" },
				{ status: 401, statusText: "Unauthorized" },
			);

		backend.expectNone(REFRESH);
		expect(failed).not.toBeNull();
	});

	it("ignores 401s from the music service", () => {
		const musicUrl = `${environment.musicApi}/music/note-game`;
		http.post(musicUrl, {}).subscribe({ error: () => undefined });

		backend
			.expectOne(musicUrl)
			.flush({}, { status: 401, statusText: "Unauthorized" });

		backend.expectNone(REFRESH);
	});
});
