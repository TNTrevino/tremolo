import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../../environments/environment";
import type { UserRole } from "../../../../auth/models/auth.models";
import { AuthStore } from "../../../../auth/services/auth.store";
import { TREMOLO_ICONS } from "../../../../core/icons";
import type { MultiMetricChartData } from "../../../../shared/models/chart.models";
import { DashboardPageComponent } from "./dashboard-page.component";

const BASE = environment.mainApi;
const PROFILE_URL = `${BASE}/api/users/9/general-info`;
const METRICS_URL = `${BASE}/api/charts/user/9/metrics`;
const CLASS_METRICS_URL = `${BASE}/api/charts/teacher/class-metrics`;
const ACTIVITY_URL = `${BASE}/api/note-game/activity`;

const PROFILE = {
	id: 9,
	first_name: "Baseline",
	last_name: "Student",
	email: "baseline@tremolo.test",
	role: "STUDENT" as const,
	created_at: "2026-01-15T00:00:00Z",
	total_sessions: 12,
	total_questions: 240,
	average_accuracy: 91.5,
	average_npm: 47.2,
};

const EMPTY_METRICS: MultiMetricChartData = {
	npm: [],
	accuracy: [],
	sessionCount: [],
	totalQuestions: [],
};

const METRICS: MultiMetricChartData = {
	npm: [
		{ x: "2026-08-01T00:00:00Z", y: 30 },
		{ x: "2026-08-02T00:00:00Z", y: 55 },
		{ x: "2026-08-03T00:00:00Z", y: 41 },
	],
	accuracy: [
		{ x: "2026-08-01T00:00:00Z", y: 80 },
		{ x: "2026-08-02T00:00:00Z", y: 92 },
		{ x: "2026-08-03T00:00:00Z", y: 88 },
	],
	sessionCount: [
		{ x: "2026-08-01T00:00:00Z", y: 1 },
		{ x: "2026-08-02T00:00:00Z", y: 2 },
		{ x: "2026-08-03T00:00:00Z", y: 1 },
	],
	totalQuestions: [
		{ x: "2026-08-01T00:00:00Z", y: 10 },
		{ x: "2026-08-02T00:00:00Z", y: 20 },
		{ x: "2026-08-03T00:00:00Z", y: 10 },
	],
};

/**
 * The dashboard, driven through the DOM the way the parity suite drives it.
 *
 * The first spec here is `e2e/specs/auth.spec.ts`'s
 * "signs in and lands on the dashboard" reduced to two seconds: it asserts
 * the signed-in user's full name is on the page. That E2E test was the
 * suite's one known failure from Phase 1 through Phase 3.1, because
 * `/dashboard` was a placeholder heading.
 */
describe("DashboardPageComponent", () => {
	let fixture: ComponentFixture<DashboardPageComponent>;
	let store: AuthStore;
	let backend: HttpTestingController;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		store = TestBed.inject(AuthStore);
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	function signIn(role: UserRole = "STUDENT"): void {
		store.setAuthFromLogin({
			user: {
				id: 9,
				email: "baseline@tremolo.test",
				first_name: "Baseline",
				last_name: role === "TEACHER" ? "Teacher" : "Student",
				role,
			},
			access_token: "access",
			refresh_token: "refresh",
		});
	}

	/**
	 * Renders and starts the resources, **without** awaiting stability.
	 *
	 * `rxResource` registers a `PendingTask` while it loads, so
	 * `fixture.whenStable()` does not resolve until every request has been
	 * answered -- awaiting it before the flush deadlocks the spec. Elsewhere
	 * in this codebase `whenStable()` is the right call because the pages
	 * fetch on a click, not on construction; here `detectChanges()` is.
	 */
	function create(): void {
		fixture = TestBed.createComponent(DashboardPageComponent);
		fixture.detectChanges();
	}

	function metrics(): TestRequest {
		return backend.expectOne((r) => r.url === METRICS_URL);
	}

	/** Signs in, renders, and answers all four requests a student makes. */
	async function renderStudent(
		chart: MultiMetricChartData = METRICS,
	): Promise<void> {
		signIn("STUDENT");
		create();
		backend.expectOne(PROFILE_URL).flush(PROFILE);
		metrics().flush(chart);
		backend.expectOne(ACTIVITY_URL).flush([]);
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	it("renders the signed-in user's full name -- the auth.spec.ts contract", async () => {
		await renderStudent();

		expect(el().querySelector("h1")?.textContent?.trim()).toBe(
			"Baseline Student",
		);
		expect(el().textContent).toContain("Baseline Student");
	});

	it("shows the skeleton until the first load resolves", async () => {
		signIn();
		create();

		expect(el().textContent).not.toContain("Baseline Student");
		expect(el().querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);

		backend.expectOne(PROFILE_URL).flush(PROFILE);
		metrics().flush(METRICS);
		backend.expectOne(ACTIVITY_URL).flush([]);
		await fixture.whenStable();

		expect(el().textContent).toContain("Baseline Student");
	});

	it("fetches the daily view over 30 days by default", async () => {
		signIn();
		create();
		backend.expectOne(PROFILE_URL).flush(PROFILE);

		const request = metrics();
		expect(request.request.params.get("interval")).toBe("day");
		expect(request.request.params.get("days")).toBe("30");
		request.flush(METRICS);
		backend.expectOne(ACTIVITY_URL).flush([]);
		await fixture.whenStable();
	});

	it("refetches when the interval changes, and drops the days window", async () => {
		await renderStudent();

		const select = el().querySelector("select") as HTMLSelectElement;
		select.value = "month";
		select.dispatchEvent(new Event("change"));
		// The new params put the resource back in flight, so again: render,
		// do not wait for stability.
		fixture.detectChanges();

		const request = metrics();
		expect(request.request.params.get("interval")).toBe("month");
		expect(request.request.params.has("days")).toBe(false);
		request.flush(METRICS);
		await fixture.whenStable();
	});

	it("renders the profile's statistics in the stat grid", async () => {
		await renderStudent();

		const text = el().textContent ?? "";
		expect(text).toContain("47.2"); // average NPM
		expect(text).toContain("91.5%"); // average accuracy
		expect(text).toContain("12"); // total sessions
		// 12 sessions x 5 assumed minutes = 60 minutes = "1h 0m".
		expect(text).toContain("1h 0m");
	});

	it("draws the performance chart, NPM only, with the other two off", async () => {
		await renderStudent();

		expect(el().querySelectorAll("path.tremolo-line")).toHaveLength(1);
		const legend = [...el().querySelectorAll("ul button")].map((b) =>
			b.textContent?.trim(),
		);
		expect(legend).toEqual(["Notes Per Minute", "Accuracy", "Total Questions"]);
	});

	it("says so instead of drawing a chart when there is not enough data", async () => {
		await renderStudent(EMPTY_METRICS);

		expect(el().textContent).toContain("Not enough data yet");
		expect(el().querySelectorAll("path.tremolo-line")).toHaveLength(0);
	});

	it("draws the activity heatmap from its own request", async () => {
		signIn();
		create();
		backend.expectOne(PROFILE_URL).flush(PROFILE);
		metrics().flush(METRICS);
		backend
			.expectOne(ACTIVITY_URL)
			.flush([{ date: "2026-08-20", game_count: 3 }]);
		await fixture.whenStable();

		expect(
			el().querySelector('svg[aria-label^="Activity heatmap"]'),
		).not.toBeNull();
	});

	it("keeps the rest of the dashboard when only the heatmap fails", async () => {
		signIn();
		create();
		backend.expectOne(PROFILE_URL).flush(PROFILE);
		metrics().flush(METRICS);
		backend
			.expectOne(ACTIVITY_URL)
			.flush({ error: "boom" }, { status: 500, statusText: "" });
		await fixture.whenStable();

		expect(el().textContent).toContain("Activity data unavailable");
		expect(el().textContent).toContain("Baseline Student");
	});

	it("never asks a student for class metrics", async () => {
		await renderStudent();

		// The endpoint 403s for a student; React gated it with `enabled`, and
		// here an `undefined` params keeps the resource idle.
		backend.expectNone((r) => r.url === CLASS_METRICS_URL);
		expect(el().textContent).not.toContain("Teacher Dashboard");
	});

	it("gives a teacher the class-metrics fetch and the teacher card", async () => {
		signIn("TEACHER");
		create();
		backend.expectOne(`${BASE}/api/users/9/general-info`).flush({
			...PROFILE,
			last_name: "Teacher",
			role: "TEACHER",
		});
		metrics().flush(METRICS);
		backend.expectOne((r) => r.url === CLASS_METRICS_URL).flush(EMPTY_METRICS);
		backend.expectOne(ACTIVITY_URL).flush([]);
		await fixture.whenStable();

		expect(el().textContent).toContain("Teacher Dashboard");
		expect(el().textContent).toContain("Coming soon");
		expect(
			[...el().querySelectorAll("a")].map((a) => a.textContent?.trim()),
		).toContain("My Classes");
		expect(
			[...el().querySelectorAll("button")].map((b) => b.textContent?.trim()),
		).toEqual(expect.arrayContaining(["My Data", "Class Data"]));
	});

	it("switches a teacher between their own data and the class aggregate", async () => {
		signIn("TEACHER");
		create();
		backend
			.expectOne(PROFILE_URL)
			.flush({ ...PROFILE, last_name: "Teacher", role: "TEACHER" });
		metrics().flush(METRICS);
		backend.expectOne((r) => r.url === CLASS_METRICS_URL).flush(EMPTY_METRICS);
		backend.expectOne(ACTIVITY_URL).flush([]);
		await fixture.whenStable();

		expect(el().querySelectorAll("path.tremolo-line")).toHaveLength(1);

		const classButton = [...el().querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "Class Data",
		) as HTMLButtonElement;
		classButton.click();
		await fixture.whenStable();

		// The class series came back empty, so the chart falls to its
		// not-enough-data note rather than showing the teacher's own line.
		expect(el().textContent).toContain("Not enough data yet");
	});

	it("shows the server's message when the dashboard cannot load", async () => {
		signIn();
		create();
		backend
			.expectOne(PROFILE_URL)
			.flush({ error: "Database is down" }, { status: 500, statusText: "" });
		metrics().flush(METRICS);
		backend.expectOne(ACTIVITY_URL).flush([]);
		await fixture.whenStable();

		expect(el().textContent).toContain("Error Loading Dashboard");
		expect(el().textContent).toContain("Database is down");
	});

	/**
	 * phase-3-subfeature-1-handoff.md §2.5: the Google callback sets this
	 * notice before navigating here. Without a reader it is silently dropped.
	 */
	it("shows the account-linked notice the Google callback left behind, once", async () => {
		store.setNotice(
			"info",
			"Your Google account has been linked to your existing account.",
		);
		await renderStudent();

		expect(el().textContent).toContain(
			"Your Google account has been linked to your existing account.",
		);

		const second = TestBed.createComponent(DashboardPageComponent);
		second.detectChanges();
		backend.expectOne(PROFILE_URL).flush(PROFILE);
		metrics().flush(METRICS);
		backend.expectOne(ACTIVITY_URL).flush([]);
		await second.whenStable();

		expect((second.nativeElement as HTMLElement).textContent).not.toContain(
			"has been linked",
		);
	});

	/**
	 * Unreachable in the app -- `authGuard` owns `/dashboard` -- but it pins
	 * the `enabled` port: no user means no request. React's four disabled
	 * queries left `user` undefined with no error, which fell into the same
	 * error card, so the second assertion is parity rather than a preference.
	 */
	it("fires nothing at all while the store has no user", () => {
		create();

		backend.expectNone(() => true);
		expect(el().textContent).toContain("Error Loading Dashboard");
	});
});
