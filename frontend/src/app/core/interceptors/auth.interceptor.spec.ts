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

import { environment } from "../../../environments/environment";
import { TokenStorage } from "../../auth/services/token.storage";
import { authInterceptor } from "./auth.interceptor";

describe("authInterceptor", () => {
	let http: HttpClient;
	let backend: HttpTestingController;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([authInterceptor])),
				provideHttpClientTesting(),
			],
		});
		TestBed.inject(TokenStorage).setTokens("access-123", "refresh-123");
		http = TestBed.inject(HttpClient);
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => backend.verify());

	it("attaches the bearer token to main-service requests", () => {
		http.get(`${environment.mainApi}/api/auth/me`).subscribe();

		const req = backend.expectOne(`${environment.mainApi}/api/auth/me`);
		expect(req.request.headers.get("Authorization")).toBe("Bearer access-123");
		req.flush({});
	});

	it("does NOT attach it to music-service requests", () => {
		// The Python service is unauthenticated. Leaking the token to it
		// would be the one mistake a single HttpClient makes easy.
		http.post(`${environment.musicApi}/music/note-game`, {}).subscribe();

		const req = backend.expectOne(`${environment.musicApi}/music/note-game`);
		expect(req.request.headers.has("Authorization")).toBe(false);
		req.flush({});
	});

	it("sends no header when there is no token", () => {
		TestBed.inject(TokenStorage).clearTokens();

		http.get(`${environment.mainApi}/api/users/me`).subscribe();

		const req = backend.expectOne(`${environment.mainApi}/api/users/me`);
		expect(req.request.headers.has("Authorization")).toBe(false);
		req.flush({});
	});
});
