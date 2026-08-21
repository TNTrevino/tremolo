import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import type { FriendResponse } from "../models/friends.models";
import { FriendsService } from "./friends.service";

const BASE = `${environment.coreApi}/api/friends`;

const AMIGA: FriendResponse = {
	id: 12,
	first_name: "Amiga",
	last_name: "Vega",
	role: "STUDENT",
	instrument: "Cello",
	avatar_url: "https://example.test/amiga.png",
	school: "Rosewood High",
};

/**
 * The service is the DTO boundary (PLAN.md 5.1), so what these tests pin is
 * the URL, the query/body shape, and that snake_case never escapes into the
 * app.
 */
describe("FriendsService", () => {
	let service: FriendsService;
	let backend: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(FriendsService);
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		backend.verify();
	});

	it("maps the friends list from snake_case to camelCase", () => {
		let friends: unknown;
		service.getFriends().subscribe((rows) => (friends = rows));

		backend.expectOne({ method: "GET", url: BASE }).flush([AMIGA]);

		expect(friends).toEqual([
			{
				id: 12,
				firstName: "Amiga",
				lastName: "Vega",
				role: "STUDENT",
				instrument: "Cello",
				avatarUrl: "https://example.test/amiga.png",
				school: "Rosewood High",
			},
		]);
	});

	it("sends the search term as the `q` query parameter", () => {
		service.searchUsers("Ami ga").subscribe();

		const request = backend.expectOne(
			(req) => req.method === "GET" && req.url === `${BASE}/search`,
		);
		expect(request.request.params.get("q")).toBe("Ami ga");
		request.flush([]);
	});

	it("maps search results too", () => {
		let results: { firstName: string }[] = [];
		service.searchUsers("Amiga").subscribe((rows) => (results = rows));

		backend
			.expectOne((req) => req.url === `${BASE}/search`)
			.flush([AMIGA, { ...AMIGA, id: 13, first_name: "Amigo" }]);

		expect(results.map((r) => r.firstName)).toEqual(["Amiga", "Amigo"]);
	});

	it("posts the friend id under the key the Go service binds", () => {
		service.addFriend(12).subscribe();

		const request = backend.expectOne({ method: "POST", url: BASE });
		expect(request.request.body).toEqual({ friend_id: 12 });
		request.flush(null);
	});

	it("surfaces a failed request as an error, not an empty list", () => {
		let failed = false;
		service.getFriends().subscribe({ error: () => (failed = true) });

		backend
			.expectOne(BASE)
			.flush({ error: "boom" }, { status: 500, statusText: "Server Error" });

		expect(failed).toBe(true);
	});
});
