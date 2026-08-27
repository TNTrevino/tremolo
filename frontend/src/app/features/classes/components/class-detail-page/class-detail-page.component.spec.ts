import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { provideIcons } from "@ng-icons/core";
import type { MockInstance } from "vitest";

import { environment } from "../../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { ClassDetailPageComponent } from "./class-detail-page.component";

const CLASSES_URL = `${environment.coreApi}/api/classes`;
const ROSTER_URL = `${CLASSES_URL}/1/roster`;
const ASSIGNMENTS_URL = `${CLASSES_URL}/1/assignments`;

const CLASS_ROW = {
	id: 1,
	name: "Symphonic Band",
	join_code: "7NZJN3",
	student_count: 1,
	created_at: "2026-07-12T04:00:00Z",
};

const ROSTER = [
	{
		student_id: 42,
		first_name: "Sam",
		last_name: "Student",
		joined_at: "2026-07-12T04:05:00Z",
	},
];

const ASSIGNMENTS = [
	{
		id: 3,
		class_id: 1,
		title: "Week 1: Treble Notes",
		game_type: "key_signature" as const,
		config: {},
		due_at: null,
		target_questions: 20,
		target_accuracy: 80,
		created_at: "2026-07-12T04:10:00Z",
	},
];

/**
 * The detail page's own job: find the class in the teacher's list (there is
 * no GET-by-id), then compose the header, roster and assignments -- each
 * with its own resource, which is why three requests go out and not one.
 */
describe("ClassDetailPageComponent", () => {
	let fixture: ComponentFixture<ClassDetailPageComponent>;
	let backend: HttpTestingController;
	let navigate: MockInstance;

	// See `classes-page.component.spec.ts` for why this renders with
	// `detectChanges()` rather than awaiting stability.
	function render(id: string): void {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);
		navigate = vi
			.spyOn(TestBed.inject(Router), "navigateByUrl")
			.mockResolvedValue(true);
		fixture = TestBed.createComponent(ClassDetailPageComponent);
		fixture.componentRef.setInput("id", id);
		fixture.detectChanges();
	}

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function button(name: string): HTMLButtonElement | undefined {
		return [...el().querySelectorAll("button")].find(
			(b) =>
				b.textContent?.trim() === name || b.getAttribute("aria-label") === name,
		);
	}

	/**
	 * Let a flushed resource publish its value, then re-render.
	 *
	 * `await fixture.whenStable()` is the usual move, but it waits for *every*
	 * pending task -- and rendering this page's children starts two more
	 * requests, so it would never settle. A macrotask turn plus an explicit
	 * render is the same thing without the deadlock.
	 */
	async function settle(): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();
	}

	/** Answer the class list, then the two child resources it reveals. */
	async function loadAll(): Promise<void> {
		backend.expectOne(CLASSES_URL).flush([CLASS_ROW]);
		await settle();
		backend.expectOne(ROSTER_URL).flush(ROSTER);
		backend.expectOne(ASSIGNMENTS_URL).flush(ASSIGNMENTS);
		await settle();
	}

	it("renders the class, its roster and its assignments", async () => {
		render("1");
		await loadAll();

		expect(el().textContent).toContain("Symphonic Band");
		expect(el().textContent).toContain("7NZJN3");
		expect(el().textContent).toContain("Sam Student");
		expect(el().textContent).toContain("Week 1: Treble Notes");
		// The assignment subtitle joins game, due date and targets with " · ".
		expect(el().textContent).toContain(
			"Key Signature · 20 questions, 80% accuracy",
		);

		// The roster row's name links to that student's stats page.
		const studentLink = [...el().querySelectorAll("a")].find((a) =>
			a.textContent?.includes("Sam Student"),
		);
		expect(studentLink?.getAttribute("href")).toBe("/classes/1/students/42");
	});

	it("says 'student' singular for a roll of one", async () => {
		render("1");
		await loadAll();

		expect(el().textContent).toContain("1 student");
		expect(el().textContent).not.toContain("1 students");
	});

	it("shows not-found when the id is not one of the teacher's classes", async () => {
		render("999");
		backend.expectOne(CLASSES_URL).flush([CLASS_ROW]);
		await settle();

		expect(el().textContent).toContain("Class not found");
		expect(el().textContent).toContain("Back to my classes");
	});

	it("shows not-found for a non-numeric id, without fetching children", async () => {
		render("banana");
		backend.expectOne(CLASSES_URL).flush([CLASS_ROW]);
		await settle();

		expect(el().textContent).toContain("Class not found");
		backend.expectNone(ROSTER_URL);
	});

	// A failed list is not a missing class, and `value()` rethrows once the
	// resource has errored -- so without the error arm this page throws out
	// of its own template rather than saying anything.
	it("shows the error panel, not 'not found', when the class list fails", async () => {
		render("1");
		backend
			.expectOne(CLASSES_URL)
			.flush({ message: "boom" }, { status: 500, statusText: "Server Error" });
		await settle();

		expect(el().querySelector("app-error")).toBeTruthy();
		// Read directly too: the ladder reaches the error arm first, so this
		// is what pins the computed's own guard rather than the arm's order.
		expect(fixture.componentInstance.classItem()).toBeUndefined();
		expect(el().textContent).not.toContain("Class not found");
		// No children, so no child requests: the roster and assignments are
		// only reachable through the found-class arm.
		backend.expectNone(ROSTER_URL);
		backend.expectNone(ASSIGNMENTS_URL);
	});

	it("archives the class and returns to the list", async () => {
		render("1");
		await loadAll();

		button("Archive class")?.click();
		fixture.detectChanges();
		expect(el().textContent).toContain("Archive class?");

		// The confirm dialog's own destructive button, not the header's.
		[...el().querySelectorAll("button")]
			.filter((b) => b.textContent?.trim() === "Archive class")
			.at(-1)
			?.click();
		fixture.detectChanges();

		const request = backend.expectOne(`${CLASSES_URL}/1`);
		expect(request.request.method).toBe("DELETE");
		request.flush({ message: "archived" });
		await fixture.whenStable();

		expect(navigate).toHaveBeenCalledWith("/classes");
	});

	it("removes a student, then refetches the roster and the class", async () => {
		render("1");
		await loadAll();

		button("Remove Sam Student")?.click();
		fixture.detectChanges();
		expect(el().textContent).toContain("Remove student?");

		[...el().querySelectorAll("button")]
			.find((b) => b.textContent?.trim() === "Remove")
			?.click();
		fixture.detectChanges();

		const request = backend.expectOne(`${CLASSES_URL}/1/students/42`);
		expect(request.request.method).toBe("DELETE");
		request.flush({ message: "removed" });
		await settle();

		// Roster **and** class list, because `student_count` lives on the class.
		backend.expectOne(ROSTER_URL).flush([]);
		backend.expectOne(CLASSES_URL).flush([{ ...CLASS_ROW, student_count: 0 }]);
		await settle();

		expect(el().textContent).toContain("No students yet");
	});

	it("reveals the results grid only once an assignment is selected", async () => {
		render("1");
		await loadAll();

		expect(el().querySelector("app-assignment-results-grid")).toBeNull();

		(
			el().querySelector('[role="button"]:not(app-button)') as HTMLElement
		)?.click();
		fixture.detectChanges();

		expect(el().querySelector("app-assignment-results-grid")).toBeTruthy();
		backend
			.expectOne(`${environment.coreApi}/api/assignments/3/results`)
			.flush([]);
		fixture.detectChanges();
	});
});
