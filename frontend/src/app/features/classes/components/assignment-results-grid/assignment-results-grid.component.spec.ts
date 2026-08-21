import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../../core/icons";
import type { Assignment } from "../../models/classes.models";
import { AssignmentResultsGridComponent } from "./assignment-results-grid.component";

const RESULTS_URL = `${environment.mainApi}/api/assignments/3/results`;
const ATTEMPTS_URL = `${environment.mainApi}/api/assignments/3/attempts/42`;

const ASSIGNMENT: Assignment = {
	id: 3,
	classId: 1,
	title: "Week 1: Treble Notes",
	gameType: "note",
	config: {},
	dueAt: null,
	targetQuestions: null,
	targetAccuracy: null,
	createdAt: "2026-07-12T04:10:00Z",
};

const ROWS = [
	{
		student_id: 42,
		first_name: "Sam",
		last_name: "Student",
		attempt_count: 2,
		best_correct: 15,
		most_questions: 20,
		best_accuracy: 75,
		last_attempt_date: "2026-07-12",
	},
	{
		student_id: 43,
		first_name: "Riley",
		last_name: "Rookie",
		attempt_count: 0,
		best_correct: 0,
		most_questions: 0,
		best_accuracy: 0,
		last_attempt_date: "",
	},
];

const ATTEMPTS = [
	{
		correct_questions: 13,
		total_questions: 14,
		accuracy: 92,
		notes_per_minute: 80,
		attempted_date: "2026-07-12",
	},
];

/**
 * Port of
 * frontend-react/src/features/classes/components/AssignmentResultsGrid.test.tsx.
 *
 * Two invariants React pinned and this keeps: a zero-attempt student is not
 * a button (there is nothing to expand), and the drill-down is not fetched
 * until its row is expanded -- which here is enforced by
 * `HttpTestingController` rather than by an `enabled` flag, because the
 * drill-down component only exists while the row is open.
 */
describe("AssignmentResultsGridComponent", () => {
	let fixture: ComponentFixture<AssignmentResultsGridComponent>;
	let backend: HttpTestingController;

	// See the note in `classes-page.component.spec.ts`: render with
	// `detectChanges()` and only `await whenStable()` once the resource's
	// request has been flushed.
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);
		fixture = TestBed.createComponent(AssignmentResultsGridComponent);
		fixture.componentRef.setInput("assignment", ASSIGNMENT);
		fixture.detectChanges();
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function rowButton(name: string): HTMLButtonElement | undefined {
		return [...el().querySelectorAll("button")].find((b) =>
			b.textContent?.includes(name),
		);
	}

	async function load(body: object): Promise<void> {
		backend.expectOne(RESULTS_URL).flush(body);
		await fixture.whenStable();
	}

	it("renders a populated row and a muted zero-attempt row", async () => {
		await load(ROWS);

		expect(el().textContent).toContain("Sam Student");
		expect(el().textContent).toContain("2026-07-12");
		expect(el().textContent).toContain("Riley Rookie");
		expect(el().textContent).toContain("Not started");
	});

	it("shows nothing but the spinner while loading", async () => {
		expect(el().textContent).not.toContain("Not started");

		await load(ROWS);
	});

	it("does not render a not-started row as a clickable button", async () => {
		await load(ROWS);

		expect(rowButton("Sam Student")).toBeTruthy();
		expect(rowButton("Riley Rookie")).toBeUndefined();
	});

	/** Click the row, render the drill-down it reveals, then answer its fetch. */
	async function expandSam(): Promise<void> {
		rowButton("Sam Student")?.click();
		fixture.detectChanges();
		backend.expectOne(ATTEMPTS_URL).flush(ATTEMPTS);
		await fixture.whenStable();
	}

	it("expands a student row to show the attempt drill-down on click", async () => {
		await load(ROWS);

		// Not fetched until expanded.
		backend.expectNone(ATTEMPTS_URL);
		expect(el().textContent).not.toContain("npm");

		await expandSam();

		expect(el().textContent).toContain("80 npm");
	});

	it("collapses the row again on a second click", async () => {
		await load(ROWS);
		await expandSam();

		rowButton("Sam Student")?.click();
		await fixture.whenStable();

		expect(el().textContent).not.toContain("80 npm");
	});

	it("shows the class insight tiles computed from the results", async () => {
		await load(ROWS);

		// One of two enrolled students attempted, best accuracy 75%.
		expect(el().textContent).toContain("1 of 2");
		expect(el().textContent).toContain("75%");
	});

	it("shows the empty state when nobody is enrolled", async () => {
		await load([]);

		expect(el().textContent).toContain("No students enrolled yet.");
	});
});
