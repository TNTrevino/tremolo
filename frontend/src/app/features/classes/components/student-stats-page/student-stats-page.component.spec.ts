import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest,
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../../core/icons";
import type { MultiMetricChartData } from "../../../../shared/models/chart.models";
import { StudentStatsPageComponent } from "./student-stats-page.component";

const PROFILE_URL = `${environment.coreApi}/api/users/42/general-info`;
const METRICS_URL = `${environment.coreApi}/api/charts/user/42/metrics`;
const ACTIVITY_URL = `${environment.coreApi}/api/note-game/activity`;

const PROFILE = {
	first_name: "Sam",
	last_name: "Student",
	role: "STUDENT" as const,
	created_date: "Joined 15 Jan 2026",
	total_entries: 12,
	total_duration: "01:00:00",
};

const EMPTY_METRICS: MultiMetricChartData = {
	npm: [],
	accuracy: [],
	sessionCount: [],
	totalQuestions: [],
};

/**
 * A teacher's read-only view of one enrolled student's stats -- the
 * profile card and the personal performance chart, reusing the same two
 * components the student's own dashboard renders. `id` (the class) is
 * navigational context for the back link only; the server-side access
 * rule is per-teacher, not per-class, so this page does not re-derive it.
 */
describe("StudentStatsPageComponent", () => {
	let fixture: ComponentFixture<StudentStatsPageComponent>;
	let backend: HttpTestingController;

	function render(id: string, studentId: string): void {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);
		fixture = TestBed.createComponent(StudentStatsPageComponent);
		fixture.componentRef.setInput("id", id);
		fixture.componentRef.setInput("studentId", studentId);
		fixture.detectChanges();
	}

	afterEach(() => {
		backend.verify();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	/**
	 * The chart request always carries `interval`/`days` query params, so
	 * matching on the bare URL string (which Angular's testing backend
	 * compares against the FULL url-with-params) never finds it -- mirrors
	 * `dashboard-page.component.spec.ts`'s own `metrics()` helper.
	 */
	function metrics(): TestRequest {
		return backend.expectOne((r) => r.url === METRICS_URL);
	}

	/** Let a flushed resource publish its value, then re-render. */
	async function settle(): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();
	}

	it("renders the student's name and profile card", async () => {
		render("1", "42");
		backend.expectOne(PROFILE_URL).flush(PROFILE);
		metrics().flush(EMPTY_METRICS);
		await settle();

		expect(el().querySelector("app-user-profile-card")).toBeTruthy();
		expect(el().textContent).toContain("Sam Student");
	});

	it("shows the error panel when the profile 403s", async () => {
		render("1", "42");
		backend
			.expectOne(PROFILE_URL)
			.flush(
				{ error: "Access denied" },
				{ status: 403, statusText: "Forbidden" },
			);
		metrics().flush(EMPTY_METRICS);
		await settle();

		expect(el().querySelector("app-error")).toBeTruthy();
		expect(el().querySelector("app-user-profile-card")).toBeNull();
	});

	it("refetches the chart when the interval changes", async () => {
		render("1", "42");
		backend.expectOne(PROFILE_URL).flush(PROFILE);
		metrics().flush(EMPTY_METRICS);
		await settle();

		const select = el().querySelector("select") as HTMLSelectElement;
		expect(select).toBeTruthy();
		select.value = "week";
		select.dispatchEvent(new Event("change"));
		fixture.detectChanges();

		const request = metrics();
		expect(request.request.params.get("interval")).toBe("week");
		expect(request.request.params.has("days")).toBe(false);
		request.flush(EMPTY_METRICS);
		await settle();
	});

	it("does not fetch for a non-numeric student id", () => {
		render("1", "banana");

		backend.expectNone(PROFILE_URL);
		backend.expectNone((r) => r.url === METRICS_URL);
		expect(el().textContent).toContain("Student not found");
	});

	it("does not request the activity heatmap", async () => {
		render("1", "42");
		backend.expectOne(PROFILE_URL).flush(PROFILE);
		metrics().flush(EMPTY_METRICS);
		await settle();

		backend.expectNone(ACTIVITY_URL);
	});
});
