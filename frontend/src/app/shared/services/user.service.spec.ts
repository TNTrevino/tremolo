import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import type { GeneralUserInfo } from "../models/user.models";
import { UserService } from "./user.service";

const BASE = environment.mainApi;

const RAW_PROFILE: GeneralUserInfo = {
	id: 7,
	first_name: "Baseline",
	last_name: "Student",
	email: "baseline@tremolo.test",
	role: "STUDENT",
	created_at: "2026-01-15T00:00:00Z",
	total_sessions: 12,
	total_questions: 240,
	average_accuracy: 91.5,
	average_npm: 47.2,
};

/**
 * Port of frontend-react/src/services/api/user.service.test.ts for the four
 * reads the dashboard needs. What matters at this boundary is the URL, the
 * query string, and that snake_case does not escape it.
 */
describe("UserService", () => {
	let service: UserService;
	let backend: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(UserService);
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => backend.verify());

	it("maps the profile to camelCase at the boundary", () => {
		let profile: unknown;
		service.getProfile(7).subscribe((p) => (profile = p));

		const request = backend.expectOne(`${BASE}/api/users/7/general-info`);
		expect(request.request.method).toBe("GET");
		request.flush(RAW_PROFILE);

		expect(profile).toEqual({
			id: 7,
			firstName: "Baseline",
			lastName: "Student",
			email: "baseline@tremolo.test",
			role: "STUDENT",
			createdAt: "2026-01-15T00:00:00Z",
			totalSessions: 12,
			totalQuestions: 240,
			averageAccuracy: 91.5,
			averageNPM: 47.2,
		});
	});

	it("leaves a brand-new account's missing statistics undefined", () => {
		let profile: { totalSessions?: number } | undefined;
		service.getProfile(7).subscribe((p) => (profile = p));
		backend.expectOne(`${BASE}/api/users/7/general-info`).flush({
			id: 7,
			first_name: "New",
			last_name: "Student",
			email: "new@tremolo.test",
			role: "STUDENT",
			created_at: "2026-08-20T00:00:00Z",
		});

		// Not zero: the dashboard is what decides a missing statistic reads
		// as 0, and it needs to be able to tell the difference.
		expect(profile?.totalSessions).toBeUndefined();
	});

	it("sends interval and days on the user metrics request", () => {
		service.getStats(7, { interval: "day", days: 30 }).subscribe();

		const request = backend.expectOne(
			(r) => r.url === `${BASE}/api/charts/user/7/metrics`,
		);
		expect(request.request.params.get("interval")).toBe("day");
		expect(request.request.params.get("days")).toBe("30");
		request.flush({
			npm: [],
			accuracy: [],
			sessionCount: [],
			totalQuestions: [],
		});
	});

	it("omits days entirely when it is not set", () => {
		service.getStats(7, { interval: "week" }).subscribe();

		const request = backend.expectOne(
			(r) => r.url === `${BASE}/api/charts/user/7/metrics`,
		);
		// The Go handler distinguishes "no days" from days=0, so an absent
		// value must not appear at all.
		expect(request.request.params.has("days")).toBe(false);
		expect(request.request.urlWithParams).toBe(
			`${BASE}/api/charts/user/7/metrics?interval=week`,
		);
		request.flush({
			npm: [],
			accuracy: [],
			sessionCount: [],
			totalQuestions: [],
		});
	});

	it("asks the teacher endpoint for class metrics", () => {
		service.getClassMetrics({ interval: "month" }).subscribe();

		const request = backend.expectOne(
			(r) => r.url === `${BASE}/api/charts/teacher/class-metrics`,
		);
		expect(request.request.params.get("interval")).toBe("month");
		request.flush({
			npm: [],
			accuracy: [],
			sessionCount: [],
			totalQuestions: [],
		});
	});

	it("reads the activity heatmap straight through", () => {
		let rows: unknown;
		service.getActivityHeatmap().subscribe((r) => (rows = r));

		backend
			.expectOne(`${BASE}/api/note-game/activity`)
			.flush([{ date: "2026-08-20", game_count: 3 }]);

		// `game_count` stays snake_case on purpose -- see chart.models.ts.
		expect(rows).toEqual([{ date: "2026-08-20", game_count: 3 }]);
	});
});
